'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^(\w+): (.*)$/m;

class XSAgent extends ConsoleAgent {
  constructor(options) {
    super(options);
  }

  evalScript(code, options = {}) {
    this.args[0] = '-s';

    if (options.module && this.args[0] !== '-m') {
      this.args[0] = '-m';
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    let match = str.match(errorRe);
    if (match) {
      return {
        name: match[1],
        message: match[2],
        stack: [],
      };
    }
    return null;
  }
}
XSAgent.runtime = fs.readFileSync(runtimePath.for('xs'), 'utf8');

module.exports = XSAgent;
