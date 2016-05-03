'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleRunner = require('../ConsoleRunner');
const ErrorParser = require('../parseError.js');

const errorRe = /^(.*?):(\d+): ((\w+): (.*))[\w\W]*\3((:?\s+at.*\r?\n)*)$/m;

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('node'), 'utf8')
    .replace(/\r?\n/g, '')
);

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
