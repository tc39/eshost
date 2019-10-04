'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^(.*?):(\d+):(\d+)(?: (\w+):)? (.*)$/m;

class NashornAgent extends ConsoleAgent {
  createChildProcess(args) {
    args = args || [];
    args.unshift('--language=es6');
    return super.createChildProcess(args);
  }

  parseError(str) {
    const error = {};
    const match = str.match(errorRe);

    if (!match) {
      return null;
    }

    error.name = match[4] || 'SyntaxError';
    error.message = match[5];

    error.stack = [{
      source: match[0],
      fileName: match[1],
      lineNumber: match[2],
      columnNumber: match[3]
    }];

    return error;
  }
}
NashornAgent.runtime = fs.readFileSync(runtimePath.for('nashorn'), 'utf8');

module.exports = NashornAgent;
