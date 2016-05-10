'use strict';

const fs = require('fs');
const temp = require('temp');
const runtimePath = require('../runtimePath');
const inception = require('../inception');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^(?:.*?): (\w+)(?:: (.*))$/m;

// JSC stack frame format:
// StackFrames: StackFrame+
// StackFrame: FunctionFrame | NativeFrame | EvalMarker
// FunctionFrame: (FunctionName`@`)?SourceInfo
// NativeFrame: (FunctionName`@`)?`[native code]`
// FunctionName: .*
// SourceInfo: File`:`Line`:`Column
// File: .*
// Line: \d+
// Column: \d+
// EvalMarker: `eval code`
const frameRe = /(?:(.*)@)?(\[native code\]|(?:(.*):(\d+):(\d+)))/;

const scriptStartMarker = '<<< SCRIPT START >>>';
const scriptEndMarker = '<<< SCRIPT END >>>';

const tempScriptFile = temp.path({ suffix: '.js' });
process.addListener('exit', function() {
  try { fs.unlinkSync(tempScriptFile); } catch (e) { /* ignore */ }
});

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('jsc'), 'utf8')
    .replace('$FILE', JSON.stringify(runtimePath.for('jsc-create'))
    .replace('$SCRIPT_FILE', JSON.stringify(tempScriptFile))
    .replace('$SCRIPT_START_MARKER', JSON.stringify(scriptStartMarker))
    .replace('$SCRIPT_END_MARKER', JSON.stringify(scriptEndMarker))
    .replace(/\r?\n/g, '')
);

function parseStack(stackStr) {
  const stack = [];

  const lines = stackStr.split(/\r?\n/g);
  lines.forEach(entry => {
    const match = entry.match(frameRe);
    if (match === null) {
      return;
    }

    stack.push({
      source: entry,
      functionName: (match[1] || '').trim(),
      fileName: match[3] || match[2],
      lineNumber: Number(match[4]),
      columnNumber: Number(match[5])
    });
  });

  // Add dummy frame if no stack frames are present in stack string.
  if (stack.length === 0) {
    stack.push({
      source: '',
      functionName: '',
      fileName: '',
      lineNumber: 1,
      columnNumber: 1
    });
  }

  return stack;
}

class JSCAgent extends ConsoleAgent {
  receiveOut(cp, str) {
    str = String(str);

    let script, out;
    if (!this.scriptBuffer) {
      // Search for script start marker.
      let start = str.indexOf(scriptStartMarker);
      if (start === -1) {
        out = str;
      } else {
        out = str.substring(0, start);

        let scriptStart = start + scriptStartMarker.length;
        let scriptEnd = str.indexOf(scriptEndMarker);
        if (scriptEnd === -1) {
          // Incomplete load script, buffer content in 'scriptBuffer'.
          this.scriptBuffer = str.substring(scriptStart);
        } else {
          script = str.substring(scriptStart, scriptEnd);
        }
      }
    } else {
      out = '';

      // Search script end marker.
      let scriptEnd = str.indexOf(scriptEndMarker);
      if (scriptEnd === -1) {
        this.scriptBuffer += str;
      } else {
        script = this.scriptBuffer + str.substring(0, scriptEnd);
        this.scriptBuffer = null;
      }
    }

    if (script) {
      fs.writeFile(tempScriptFile, script, err => {
        if (err) throw err;

        // Unblock script execution.
        cp.stdin.write('\n');
      });
    }

    return out;
  }

  parseError(str) {
    const match = str.match(errorRe);

    if (!match) {
      return null;
    }

    return {
      name: match[1],
      message: match[2],
      stack: parseStack(str.slice(match[0].length))
    };
  }
}
JSCAgent.runtime = runtimeStr;

module.exports = JSCAgent;
