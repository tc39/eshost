'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^Uncaught exception:(?: \[(.+?)])?(?: (.+))?((?:\n -> .+|\n \d+? more calls)*)?\n?/gm;

class LibJSAgent extends ConsoleAgent {
  constructor(options) {
    super(options);

    this.args.unshift('--disable-ansi-colors', '--no-syntax-highlight', '--disable-source-location-hints');
  }

  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== '--as-module') {
      this.args.unshift('--as-module');
    }

    if (!options.module && this.args[0] === '--as-module') {
      this.args.shift();
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    const match = errorRe.exec(str);

    if (!match)
      return null;

    const name = match[1] ? match[1].trim() : "";
    const message = match[2] ? match[2].trim() : "";
    const stack = [];
    if (match[3]) {
      const stackTrace = match[3].trim().split('\n');
      stackTrace.forEach(entry => {
        const trimmedEntry = entry.trim();
        if (trimmedEntry.endsWith(" more calls")) { // collapsed 5+ repeated entries
          const calls = parseInt(trimmedEntry.substring(0, trimmedEntry.indexOf(" more calls")));
          for (let i = 0; i < calls; ++i)
            stack.push(stack[stack.length - 1]);
        } else {
          stack.push({
            functionName: trimmedEntry.substring(trimmedEntry.indexOf(" -> ") + 4),
            lineNumber: 1
          });
        }
      });
    }

    return {
      name,
      message,
      stack
    };
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, '');
      result.stderr = match[0];
    }

    return result;
  }
}

LibJSAgent.runtime = fs.readFileSync(runtimePath.for('libjs'), 'utf8');

module.exports = LibJSAgent;
