'use strict';

const cp = require('child_process');
const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');
const ErrorParser = require('../parse-error.js');

const isWindows = process.platform === 'win32' ||
  process.env.OSTYPE === 'cygwin' ||
  process.env.OSTYPE === 'msys';

const builtinerrorexp = /^(\w+):? ?(.*)$/m;
const errorexp = /(?:\{(?:\s+name:\s+'(.*)',\s+message:\s+'(.*)'\s+)\})/gm;
const nodeerrorexp = /^([\w\d]+)(?:\s+)(?:\{\s+message:\s+'(.*)'\s+\})/gm;

class Engine262 extends ConsoleAgent {
  async evalScript(code, options = {}) {
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
      const child = this[Symbol.for('cp')];
      cp.exec(`taskkill -F -T -PID ${child.pid}`);
    }
    return super.stop();
  }

  parseError(str) {
    errorexp.lastIndex = -1;
    let match = errorexp.exec(str);

    // This is utterly atrocious.
    if (!match) {
      match = /(?:\{(?:\s+name:\s+'(.*)'\s+)\})/gm.exec(str);
    }

    if (!match) {
      return null;
    }

    const stackStr = match[4] || '';

    let stack;
    if (stackStr.trim().length > 0) {
      stack = ErrorParser.parseStack(stackStr);
    } else {
      stack = [{
        source: match[0],
        fileName: match[1],
        lineNumber: 1
      }];
    }

    return {
      name: match[1],
      message: match[2],
      stack,
    };
  }

  normalizeResult(result) {
    errorexp.lastIndex = -1;
    let ematch = errorexp.exec(result.stderr);

    if (ematch) {
      result.stderr = ematch[0];
      result.stdout = '';
    } else {
      let bmatch = builtinerrorexp.exec(result.stderr);
      let nmatch = nodeerrorexp.exec(result.stderr);
      let match = nmatch || bmatch;

      if (match) {
        result.stderr = match[2]
          ? `{ name: '${match[1]}', message: '${match[2]}' }`
          : `{ name: '${match[1]}' }`;

        result.stdout = '';
      }
    }

    return result;
  }
}

Engine262.runtime = fs.readFileSync(runtimePath.for('engine262'), 'utf8');

module.exports = Engine262;
