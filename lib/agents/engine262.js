'use strict';

const cp = require('child_process');
const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const isWindows = process.platform === 'win32' ||
  process.env.OSTYPE === 'cygwin' ||
  process.env.OSTYPE === 'msys';

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

  stop() {
    if (isWindows && this[Symbol.for('cp')]) {
      // This is necessary for killing a node.js .cmd process on windows
      this[Symbol.for('cp')].then(child => cp.exec(`taskkill -F -T -PID ${child.pid}`));
    } else {
      super.stop();
    }

    return Promise.resolve();
  }
}

Engine262.runtime = fs.readFileSync(runtimePath.for('engine262'), 'utf8');

module.exports = Engine262;
