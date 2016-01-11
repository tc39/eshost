'use strict';

const ConsoleRunner = require('./ConsoleRunner');
const ErrorParser = require('./parseError.js');
const fs = require('fs');
const errorRe = /^(.*?):(\d+): ((\w+): (.*))[\w\W]*\3((:?\s+at.*\r?\n)*)$/m

let runtimeStr = fs.readFileSync(__dirname + '/../runtimes/node.js', 'utf8').replace(/\r?\n/g, '');
const runtimeInception = runtimeStr.replace('$SOURCE', '""');
runtimeStr = runtimeStr.replace('$SOURCE', JSON.stringify(runtimeInception));

class NodeRunner extends ConsoleRunner {
  compile(code) {
    code = super.compile(code);

    code = `
      Function("return this;")().require = require;
      var vm = require("vm");
      vm.runInThisContext(${JSON.stringify(code)});
    `;

    return code;
  }
}
NodeRunner.runtime = runtimeStr;

module.exports = NodeRunner;
