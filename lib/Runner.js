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
    const current = process.cwd();
    const basedir = Path.dirname(this.hostPath);
    const exe = Path.basename(this.hostPath);
    process.chdir(basedir);
    const proc = cp.spawn(exe, args);
    process.chdir(current);
    return proc;
  }

  compile(code) {
    return code;
  }

  dispose() { };
}

module.exports = Runner;
