'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleRunner = require('../ConsoleRunner');

const errorRe = /^(.*?):(\d+):(\d+) (\w+): (.*)$/m;

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('sm'), 'utf8')
    .replace(/\r?\n/g, '')
);

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
