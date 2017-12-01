'use strict';
const Agent = require('./Agent.js');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const cp = require('child_process');
const temp = require('temp');
const ErrorParser = require('./parseError.js');


class ConsoleAgent extends Agent {
  constructor(options) {
    super(options);
    this.printCommand = 'print';

    // Promise for the child process created by the most recent invocation of
    // `evalScript`
    this._cp = null;
  }

  createChildProcess(args = []) {
    return new Promise((resolve, reject) => {
      const child = cp.spawn(this.hostPath, [...this.args, ...args]);
      if (!child.stdout) {
        const timeout = setTimeout(() => {
          clearInterval(interval);
          reject('The child_process.spawn timed out.');
        }, 10000);

        // Wait until stdout is ready
        const interval = setInterval(() => {
          if (child.stdout) {
            clearInterval(interval);
            clearTimeout(timeout);
            console.log('timeout cleared.');
            resolve(child);
          }
        }, 300);
      } else {
        resolve(child);
      }
    });
  }

  receiveOut(cp, str) {
    return str;
  }

  receiveErr(cp, str) {
    return str;
  }

  evalScript(code) {
    const tempfile = temp.path({ suffix: '.js' });

    code = this.compile(code);
    this._cp = writeFile(tempfile, code)
      .then(() => this.createChildProcess([tempfile]));

    return this._cp.then(child => {
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', str => { stdout += this.receiveOut(child, str); });
      child.stderr.on('data', str => { stderr += this.receiveErr(child, str); });

      return new Promise(resolve => {
        child.on('close', () => {
          resolve({stdout, stderr});
        });
      });
    }).then(({stdout, stderr}) => {
      fs.unlink(tempfile, function () { /* ignore */ });

      const result = this.normalizeResult({ stderr: stderr, stdout: stdout });

      result.error = this.parseError(result.stderr);

      return result;
    });
  }

  stop() {
    if (this._cp) {
      this._cp.then(child => child.kill('SIGKILL'));
    }

    // killing is fast, don't bother waiting for it
    return Promise.resolve();
  }

  // console agents need to kill the process before exiting.
  destroy() {
    return this.stop();
  }

  compile (code, options) {
    code = super.compile(code, options);
    let runtime = this.constructor.runtime;
    if (runtime && this.options.shortName) {
      runtime = runtime.replace(/\$/g, this.options.shortName);
    }

    if (!runtime) {
      return code;
    } else {
      const prologue = code.match(/^("[^\r\n"]*"|'[^\r\n']*'|[\s\r\n;]*|\/\*[\w\W]*?\*\/|\/\/[^\n]*\n)*/);

      if (prologue) {
        return prologue[0] + runtime + code.slice(prologue[0].length);
      } else {
        return runtime + code;
      }
    }
  }

  // Normalizes raw output from a console host. Default is no normalization.
  // D8 agent has does some normalization to move stdout errors
  normalizeResult(result) { return result; }

  finalize () { return Promise.resolve(); }

  parseError(str) {
    return ErrorParser.parse(str);
  }
}

module.exports = ConsoleAgent;

function promisify(api) {
  return function () {
    let args = Array.prototype.slice.call(arguments);
    return new Promise(function(res, rej) {

      args.push(function (err, result) {
        if (err) { return rej(err); }
        return res(result);
      });

      api.apply(null, args);
    });
  };
}
