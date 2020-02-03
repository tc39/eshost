'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');
const ErrorParser = require('../parse-error.js');

const errorRe = /(.*?): (.+?) (.+)(\n(\s*)at (.+))*/;

class GraalJSAgent extends ConsoleAgent {
  constructor(options) {
    super(options);

    this.args.unshift('--js.intl-402=true');
    this.args.unshift('--js.ecmascript-version=2020');
    this.args.unshift('--js.test262-mode=true');   // enables $262 object
    this.args.unshift('--experimental-options');
  }

  parseError(str) {
    const match = str.match(errorRe);
    if(!match) {
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
        lineNumber: match[2]
      }];
    }

    return {
      name: match[1],
      message: match[3],
      stack: stack,
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

GraalJSAgent.runtime = fs.readFileSync(runtimePath.for('graaljs'), 'utf8');

module.exports = GraalJSAgent;
