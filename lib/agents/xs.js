'use strict';

const fs = require('fs');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^(\w+): (.*)$/m;

class XSAgent extends ConsoleAgent {
  constructor(options) {
    super(options);
    this.args = ["-s"];
  }
  parseError(str) {
    let match = str.match(errorRe);
    if (match) {
      return {
        name: match[1],
        message: match[2],
      };
    }
    return null;
  }
  normalizeResult(result) {
    return result;
  }
}
XSAgent.runtime = fs.readFileSync(runtimePath.for('xs'), 'utf8');

module.exports = XSAgent;
