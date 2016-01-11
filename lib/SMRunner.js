'use strict';

const ConsoleRunner = require('./ConsoleRunner');
const fs = require('fs');

let runtimeStr = fs.readFileSync(__dirname + '/../runtimes/sm.js', 'utf8').replace(/\r?\n/g, '');
const runtimeInception = runtimeStr.replace('$SOURCE', '""');
runtimeStr = runtimeStr.replace('$SOURCE', JSON.stringify(runtimeInception));

const errorRe = /^(.*?):(\d+):(\d+) (\w+): (.*)$/m

class SMRunner extends ConsoleRunner {
  parseError(str) {
    const error = {};
    const match = str.match(errorRe);

    if (!match) {
      return null;
    }

    error.name = match[4];
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
SMRunner.runtime = runtimeStr;

module.exports = SMRunner;
