'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^Uncaught exception:(?: \[(.+?)])?(?: (.+))?((?:\n -> .+|\n \d+? more calls)*)?\n?/m;

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
    const match = str.match(errorRe);

    if (!match)
      return null;

    const name = match[1] ? match[1].trim() : "";
    let message = match[2] ? match[2].trim() : "";

    try {
      const parsedMessage = JSON.parse(message);
      if (typeof parsedMessage["message"] === 'string')
        message = parsedMessage["message"];
    } catch (e) {
      // ignored
    }

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
      result.stderr = match[0];
      result.stdout = result.stdout.replace(errorRe, '').trim();

      const expectedHintMarker = '^\n' + match[2];
      if (result.stdout.endsWith(expectedHintMarker)) // syntax error source location hint marker
        result.stdout = result.stdout.split('\n').slice(0, -3).join('\n');
    }

    return result;
  }
}

LibJSAgent.runtime = fs.readFileSync(runtimePath.for('libjs'), 'utf8');

module.exports = LibJSAgent;
