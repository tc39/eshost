'use strict';

const Path = require('path');
const cp = require('child_process');

class Runner {
  constructor (hostPath, args) {
    this.hostPath = hostPath;
    this.args = args || [];
  }

  createChildProcess(args) {
    args = args || [];
    args = args.concat(this.args);
    return cp.spawn(this.hostPath, args);
  }

  compile(code) {
    return code;
  }

  dispose() { };
}

module.exports = Runner;
