'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');
const ErrorParser = require('../parse-error');

class NodeAgent extends ConsoleAgent {
  compile(code) {
    code = super.compile(code);

    // `JSON.stringify` replaces BACKSPACE, CHARACTER TABULATION, LINE FEED
    // (LF), FORM FEED (FF), CARRIAGE RETURN (CR), QUOTATION MARK, and REVERSE
    // SOLIDUS [1]. This does not include two valid ECMAScript line
    // terminators: LINE SEPARATOR, and PARAGRAPH SEPARATOR [2]. Those two code
    // points must be explicitly escaped from the output of `JSON.stringify` so
    // that the source can be safely included in a dynamically-evaluated
    // string.
    //
    // [1] https://tc39.github.io/ecma262/#table-json-single-character-escapes
    // [2] https://tc39.github.io/ecma262/#table-33
    const escaped = JSON.stringify(code)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    // Because the input code may modify the global environment in ways that
    // interfere with the normal operation of `eshost`, it must be run in a
    // dedicated virtual machine.
    //
    // The "context" object for this virtual machine should be re-used if the
    // input code invokes `$.evalScript`, but Node.js does not tolerate sharing
    // context objects across virtual machines in this manner. Instead, define
    // a new method for evaluating scripts in the context created here.
    //
    // The "print" function is defined here, instead of runtimes/node.js because
    // not all code will be run with the entire host runtime.
    code = `
      Function("return this;")().require = require;
      var vm = require("vm");
      var eshostContext = vm.createContext({
        setTimeout,
        require,
        console,
        print(...args) {
          console.log(...args);
        }
      });
      vm.runInESHostContext = function(code, options) {
        return vm.runInContext(code, eshostContext, options);
      };
      vm.runInESHostContext(${escaped});
    `;

    return code;
  }

  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== '--experimental-modules') {
      this.args.unshift('--experimental-modules');
    }

    if (!options.module && this.args[0] === '--experimental-modules') {
      this.args.shift();
    }

    if (!this.args.includes('--expose-gc')) {
      this.args.push('--expose-gc');
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    let parsed = ErrorParser.parse(str);

    if (parsed) {
      return parsed;
    }

    const errorexp = /^[\w\d]+(:.*)?(?:(\r?\n\s+at.*)+|\r?\n$)/m;
    const nodeerrorexp = /^([\w\d]+)(?:\s+)(?:\{\s+message:\s+'(.*)'\s+\})/gm;
    const customerrorexp = /^(?:[\w\d]+)(?:\s+)(?:\{(?:\s+name:\s+'(.*)',\s+message:\s+'(.*)'\s+)\})/gm;

    let match = str.match(errorexp);

    if (!match) {
      match = nodeerrorexp.exec(str);
      if (match && match.length === 3) {
        return {
          name: match[1],
          message: match[2],
          stack: []
        };
      } else {
        match = customerrorexp.exec(str);
        if (match && match.length === 3) {
          return {
            name: match[1],
            message: match[2],
            stack: []
          };
        }
      }
    }
    return null;
  }
}
NodeAgent.runtime = fs.readFileSync(runtimePath.for('node'), 'utf8');

module.exports = NodeAgent;
