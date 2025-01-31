'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe1 = /^(\w+): (.*)$/m;
const errorRe2 = /^(?:(\w+): (.*))|(?:(\w+))$/m;

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

  async evalScript(code, options = {}) {
    // By default eshost must target an environment that can
    // evaluate non-strict mode code
    if (!options.module) {
      this.args.unshift('-non-strict');
    }

    this.args.unshift('-Xintl', '-enable-eval');

    // There is currently no flag for supporting modules in Hermes
    // if (options.module && this.args[0] !== '-m') {
    //   this.args.unshift('-m');
    // }

    // if (!options.module && this.args[0] === '-m') {
    //   this.args.shift();
    // }

    return super.evalScript(code, options);
  }

  parseError(rawstr) {
    const str = rawstr.replace(/^Uncaught /, '');

    let match = str.match(errorRe1);

    if (match) {
      return {
        name: match[1],
        message: match[2],
        stack: [],
      };
    } else {

      // Syntax errors don't have nice error messages...
      let error = null;
      let errors = str.match(/:(\d+):(\d+): (.*)/gm);

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

      // Last chance...
      errors = str.match(errorRe2);

      if (errors && errors[0]) {
        return {
          name: errors[0],
          message: errors[1],
          stack: [],
        };
      }
    }

    return null;
  }
}
HermesAgent.runtime = fs.readFileSync(runtimePath.for('hermes'), 'utf8');

module.exports = HermesAgent;
