'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /(?:.*?): (\w+)(?:: (.*))?(?:\r?\nat[^\n]*)?(\r?\n.*@(\[native code\]|(?:.*:\d+:\d+)))*\r?\n/;

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

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('jsc'), 'utf8')
    .replace(/\r?\n/g, '')
);

function parseStack(stackStr) {
  stackStr = stackStr || '';
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
  parseError(str) {
    const match = str.match(errorRe);

    if (!match) {
      return null;
    }

    return {
      name: match[1],
      message: match[2],
      stack: parseStack(match[3])
    };
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, '');
      result.stderr = match[0];
    }

    return result;
  }
}
JSCAgent.runtime = runtimeStr;

module.exports = JSCAgent;
