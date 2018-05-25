'use strict';

const fs = require('fs');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');

class ChakraAgent extends ConsoleAgent {
  constructor(options) {
    super(options);
    this.args.push('-Test262');
  }
  parseError(str) {
    const error = super.parseError(str);

    if (!error) { return error }

    if (error.name === 'JavascriptError') {
      error.name = 'Error';
    }

    if (error.name === 'CustomError') {
      const match = error.message.match(/\w+: /);
      if (match) {
        error.name = match[0].slice(0, -2);
        error.message = error.message.slice(match[0].length);
      }
    }

    return error;
  }
}

ChakraAgent.runtime = fs.readFileSync(runtimePath.for('chakra'), 'utf8');

module.exports = ChakraAgent;
