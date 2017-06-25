'use strict';
const Agent = require('./Agent.js');
const fs = require('fs');
const promisify = require('./promisify.js');
const writeFile = promisify(fs.writeFile);
const cp = require('child_process');
const temp = require('temp');
const ErrorParser = require('./parseError.js');


class ConsoleAgent extends Agent {
  constructor(options) {
    super(options);
    this.printCommand = 'print';
  }

  createChildProcess(args, opts = {}) {
    args = args || [];
    args = args.concat(this.args);
    return cp.spawn(this.hostPath, args, opts);
  }

  receiveOut(cp, str) {
    return str;
  }

  receiveErr(cp, str) {
    return str;
  }

  // executes code in a console application via this.createChildProcess.
  // args is any additional arguments to pass for this execution and are
  // joined with any args passed when constructing this agent. Extra args
  // are passed before the file name.
  exec(code, args = [], opts = {}) {
    const d = deferred();

    // generate temp file in current working directory as ChakraCore will
    // only ever resolve modules relative to CWD and this allows us to
    // pretend that they are identical.
    const tempfile = temp.path({ dir: process.cwd(), suffix: '.js' });

    writeFile(tempfile, code).then(_ => {
      this._cp = this.createChildProcess(args.concat(tempfile), opts);

      let stdout = '';
      this._cp.stdout.on('data', str => stdout += this.receiveOut(this._cp, str));
      let stderr = '';
      this._cp.stderr.on('data', str => stderr += this.receiveErr(this._cp, str));

      this._cp.on('close', () => {
        this._cp = null;
        fs.unlink(tempfile, function () { /* ignore */ });

        const result = this.normalizeResult({ stderr: stderr, stdout: stdout });

        result.error = this.parseError(result.stderr);
        d.resolve(result);
      });
    }).catch(err => {
      d.reject(err);
    });

    return d.promise;
  }

  evalScript(code) {
    code = this.compile(code);
    return this.exec(code);
  }

  stop() {
    if (this._cp) {
      this._cp.kill('SIGKILL');
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

function deferred() {
  let res, rej;
  const p = new Promise(function (resolve, reject) {
    res = resolve;
    rej = reject;
  });

  return { promise: p, resolve: res, reject: rej };
}
