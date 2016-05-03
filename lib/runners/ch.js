'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleRunner = require('../ConsoleRunner');


const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('Chakra'), 'utf8')
    .replace(/\r?\n/g, '')
);

class ChakraRunner extends ConsoleRunner {
  parseError(str) {
    const error = super.parseError(str);

    if(!error) { return error };

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

ChakraRunner.runtime = runtimeStr;

module.exports = ChakraRunner;
