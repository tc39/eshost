'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleRunner = require('../ConsoleRunner');
const ErrorParser = require('../parseError.js');

const errorRe = /(.*?):(\d+): ((\w+): (.*))[\w\W]*\3((:?\s+at.*\r?\n)*)(\r?\n)+$/;

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('d8'), 'utf8')
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

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, '');
      result.stderr = match[0];
    }

    return result;
  }
}

D8Runner.runtime = runtimeStr;

module.exports = D8Runner;
