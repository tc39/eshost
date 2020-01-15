'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

class GraalJSAgent extends ConsoleAgent {
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
GraalJSAgent.runtime = fs.readFileSync(runtimePath.for('graaljs'), 'utf8');

module.exports = GraalJSAgent;