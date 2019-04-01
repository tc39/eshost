'use strict';

const fs = require('fs');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');

class Engine262 extends ConsoleAgent {
  evalScript(code, options = {}) {
    if (options.module && this.args[0] !== '--module') {
      this.args.unshift('--module');
    }

    if (!options.module && this.args[0] === '--module') {
      this.args.shift();
    }

    return super.evalScript(code, options);
  }
}

Engine262.runtime = fs.readFileSync(runtimePath.for('engine262'), 'utf8');

module.exports = Engine262;
