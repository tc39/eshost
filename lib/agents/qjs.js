'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');
const errorexp = /^(\w+): (.*)$/m;
const nomessageexp = /^(\w+)(?:\n\s.+at\s<(.+)>)/gm;

class QJSAgent extends ConsoleAgent {
  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== '--module') {
      this.args.unshift('--module');
    }

    if (!options.module && this.args[0] === '--module') {
      this.args.shift();
    }
    // -N run test prepared by test262-harness+eshost
    this.args.push('-N');
    return super.evalScript(code, options);
  }

  parseError(str) {
    const match = str.match(errorexp);

    if (!match) {
      return null;
    }

    return {
      name: match[1],
      message: match[2],
      stack: [],
    };
  }

  normalizeResult(result) {
    errorexp.lastIndex = 0;
    nomessageexp.lastIndex = 0;

    const ematch = errorexp.exec(result.stdout);
    const nmatch = nomessageexp.exec(result.stderr);

    let match;

    if (ematch) {
      match = ematch[0];
    }

    if (nmatch) {
      match = `${nmatch[1]}: `;
    }

    if (match) {
      result.stdout = '';
      result.stderr = match;
    }

    return result;
  }
}

QJSAgent.runtime = fs.readFileSync(runtimePath.for('qjs'), 'utf8');

module.exports = QJSAgent;
