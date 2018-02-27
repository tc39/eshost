'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^(\w+): (.*)$/m;

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('xs'), 'utf8')
    .replace(/\r?\n/g, '')
);

class XSAgent extends ConsoleAgent {
  constructor(options) {
    super(options);
    this.args = ["-s"];
  }
  parseError(str) {
    let match = str.match(errorRe);
    if (match)
      return {
        name: match[1],
        message: match[2],
      }
    return null;
 }
  normalizeResult(result) {
    return result;
  }
}
XSAgent.runtime = runtimeStr;

module.exports = XSAgent;
