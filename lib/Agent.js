'use strict';

const Path = require('path');
const cp = require('child_process');

class Agent {
  constructor (options) {
    options = options || {};
    this.options = options;
    this.hostPath = options.hostPath;
    this.args = options.hostArguments || [];
    this.transpiler = options.transpiler || (x => x);

    if (typeof this.args === 'string') {
      this.args = this.args.includes(' ') ?
        this.args.split(' ').filter(v => v.trim()) :
        [this.args];
    }

    this.shortName = options.shortName || '$';
  }

  compile(code, options) {
    options = options || {};

    code = this.transpiler(code);

    if (options.async) {
      return code;
    } else {
      return code + '\n;' + this.shortName + '.destroy();';
    }
  }

  // defaults that do nothing
  initialize() { return Promise.resolve(this); }
  destroy() { return Promise.resolve(); }
  stop() { return Promise.resolve(); }
}

module.exports = Agent;
