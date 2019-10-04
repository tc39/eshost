'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^(\w+): (.*)$/m;

function parseSyntaxError(syntaxErrorMessage) {
  const matches = syntaxErrorMessage.match(/:(\d+):(\d+): (.*)/);
  if (matches && matches.length) {
    return {
      message: matches[3].replace('error: ', ''),
      lineNumber: Number(matches[1]),
      columnNumber: Number(matches[2])
    };
  }
  return null;
}


class HermesAgent extends ConsoleAgent {
  constructor(options) {
    super(options);
  }

  evalScript(code, options = {}) {
    // if (options.module && this.args[0] !== '-m') {
    //   this.args[0] = '-m';
    // }

    return super.evalScript(code, options);
  }

  parseError(str) {
    let match = str.match(errorRe);
    if (match) {
      return {
        name: match[1],
        message: match[2],
        stack: [],
      };
    } else {

      // Syntax errors don't have nice error messages...
      let error = null;

      const errors = str.match(/:(\d+):(\d+): (.*)/gm);
      if (errors && errors.length) {
        error = {
          name: 'SyntaxError',
          message: '',
          stack: []
        };

        const stack = parseSyntaxError(errors[0]);

        if (stack) {
          error.stack.push(stack);
          error.message = stack.message;
        }
      }

      if (error) {
        return error;
      }
    }

    return null;
  }
}
HermesAgent.runtime = fs.readFileSync(runtimePath.for('hermes'), 'utf8');

module.exports = HermesAgent;
