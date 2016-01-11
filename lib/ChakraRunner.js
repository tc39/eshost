'use strict';

const fs = require('fs');
const ConsoleRunner = require('./ConsoleRunner');


let runtimeStr = fs.readFileSync(__dirname + '/../runtimes/chakra.js', 'utf8').replace(/\r?\n/g, '');
const runtimeInception = runtimeStr.replace('$SOURCE', '""');
runtimeStr = runtimeStr.replace('$SOURCE', JSON.stringify(runtimeInception));

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
