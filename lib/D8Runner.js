'use strict';

const fs = require('fs');
const inception = require('./inception');
const ConsoleRunner = require('./ConsoleRunner');
const ErrorParser = require('./parseError.js');

const errorRe = /^(.*?):(\d+): ((\w+): (.*))[\w\W]*\3((:?\s+at.*\r?\n)*)$/m;

const runtimeStr = inception(
  fs.readFileSync(__dirname + '/../runtimes/d8.js', 'utf8')
    .replace(/\r?\n/g, '')
);

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
