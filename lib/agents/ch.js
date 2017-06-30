'use strict';

const fs = require('fs');
const inception = require('../inception');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');
const Path = require('path');

const runtimeStr = inception(
  fs.readFileSync(runtimePath.for('chakra'), 'utf8')
    .replace(/\r?\n/g, '')
);

class ChakraAgent extends ConsoleAgent {
  parseError(str) {
    const error = super.parseError(str);

    if(!error) { return error };

    if (error.name === 'JavascriptError') {
      error.name = 'Error';
    }

    if (error.name === 'CustomError') {
      const match = error.message.match(/\w+: /);
      if (match) {
        error.name = match[0].slice(0, -2);
        error.message = error.message.slice(match[0].length);
      }
    }

    return error;
  }
  
  // Chakra uses WScript.LoadModule to load a module, so every module is
  // kicked off with a script.
  evalModule(code) {
    // cram on to one line to preserve error line numbers
    let stub = `WScript.LoadModule(\`${code.replace(/`|\$\{/g, "\\$&")}\`);`
    stub = this.compile(stub);
    return this.exec(stub);
  }
}

ChakraAgent.runtime = runtimeStr;

module.exports = ChakraAgent;
