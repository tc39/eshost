'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /Uncaught: (.*): (.*)/;

class BoaAgent extends ConsoleAgent {
  constructor(options) {
    super(options);

    this.args.unshift('--debug-object');
  }

  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== '--module') {
      this.args.unshift('--module');
    }

    if (!options.module && this.args[0] === '--module') {
      this.args.shift();
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    const match = str.match(errorRe);
    if(!match) {
      return null;
    }

    return {
      name: match[1],
      message: match[2],
      stack: '',
    };
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, '');
      result.stderr = match[0];
    }

    if (result.stdout === 'undefined\n') result.stdout = '';

    return result;
  }
}

BoaAgent.runtime = fs.readFileSync(runtimePath.for('boa'), 'utf8');

module.exports = BoaAgent;
