'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');
const ErrorParser = require('../parseError.js');

const errorRe = /^(.*?):(\d+): ((\w+): (.*))[\w\W]*\3((:?\s+at.*\r?\n)*)$/m;

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('node'), 'utf8')
    .replace(/\r?\n/g, '')
);

class NodeAgent extends ConsoleAgent {
  compile(code) {
    code = super.compile(code);

    // Because the input code may modify the global environment in ways that
    // interfere with the normal operation of `eshost`, it must be run in a
    // dedicated virtual machine.
    //
    // The "context" object for this virtual machine should be re-used if the
    // input code invokes `$.evalScript`, but Node.js does not tolerate sharing
    // context objects across virtual machines in this manner. Instead, define
    // a new method for evaluating scripts in the context created here.
    code = `
      Function("return this;")().require = require;
      var vm = require("vm");
      var eshostContext = vm.createContext({ require, console });
      vm.runInESHostContext = function(code, options) {
        return vm.runInContext(code, eshostContext, options);
      };
      vm.runInESHostContext(${JSON.stringify(code)});
    `;

    return code;
  }
}
NodeAgent.runtime = runtimeStr;

module.exports = NodeAgent;
