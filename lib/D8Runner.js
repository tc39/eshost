'use strict';

const ConsoleRunner = require('./ConsoleRunner');
const ErrorParser = require('./parseError.js');
const errorRe = /^(.*?):(\d+): ((\w+): (.*))[\w\W]*\3((:?\s+at.*\r?\n)*)$/m
const fs = require('fs');

let runtimeStr = fs.readFileSync(__dirname + '/../runtimes/d8.js', 'utf8').replace(/\r?\n/g, '');
const runtimeInception = runtimeStr.replace('$SOURCE', '""');
runtimeStr = runtimeStr.replace('$SOURCE', JSON.stringify(runtimeInception));

class D8Runner extends ConsoleRunner {
  parseError(str) {
    const match = str.match(errorRe);
    if(!match) {
      return null;
    }
    const stackStr = match[6];

    let stack;
    if (stackStr.trim().length > 0) {
      stack = ErrorParser.parseStack(stackStr);
    } else {
      stack = [{
        source: match[0],
        fileName: match[1],
        lineNumber: match[2]
      }]
    }

    return {
      name: match[4],
      message: match[5],
      stack: stack
    }
  }
}

D8Runner.runtime = runtimeStr;

module.exports = D8Runner;
