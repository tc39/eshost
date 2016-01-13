'use strict';

const fs = require('fs');
const inception = require('./inception');
const ConsoleRunner = require('./ConsoleRunner');

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

const runtimeStr = inception(
  fs.readFileSync(__dirname + '/../runtimes/jsc.js', 'utf8')
    .replace('$FILE', JSON.stringify(__dirname + '/../runtimes/jsc-create.js'))
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

class JSCRunner extends ConsoleRunner {
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
JSCRunner.runtime = runtimeStr;

module.exports = JSCRunner;
