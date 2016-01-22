'use strict';
const Runner = require('./Runner.js');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const cp = require('child_process');
const temp = require('temp');
const ErrorParser = require('./parseError.js');

class ConsoleRunner extends Runner {
  constructor(hostPath, args) {
    super(hostPath, args);
    this.printCommand = 'print';
  }

  receiveOut(cp, str) {
    return str;
  }

  receiveErr(cp, str) {
    return str;
  }

  exec(code) {
    const d = deferred();
    const tempfile = temp.path({ suffix: '.js' });

    code = this.compile(code);

    writeFile(tempfile, code)
    .then(_ => {
      var cp = this.createChildProcess([tempfile]);
      let stdout = '';
      let stderr = '';

      cp.stdout.on('data', str => { stdout += this.receiveOut(cp, str) });
      cp.stderr.on('data', str => { stderr += this.receiveErr(cp, str) });
      cp.on('close', function () {
        fs.unlink(tempfile);

        const result = { stderr: stderr, stdout: stdout };
        if (stderr) {
          result.error = this.parseError(stderr);
        } else {
          result.error = this.parseError(stdout) || null;
        }

        d.resolve(result);
      }.bind(this));
    }).catch(err => {
      d.reject(err);
    });


    return d.promise;
  }

  compile (code) {
    const runtime = this.constructor.runtime;
    if (!runtime) {
      return code;
    } else {
      const prologue = code.match(/^("[^\r\n"]*"|'[^\r\n']'|[\s\r\n;]*|\/\*[\w\W]*?\*\/|\/\/[^\n]*\n)*/);

      if (prologue) {
        return prologue[0] + runtime + code.slice(prologue[0].length);
      } else {
        return runtime + code;
      }
    }
  }

  finalize () { return Promise.resolve() }

  parseError(str) {
    return ErrorParser.parse(str);
  }
}

module.exports = ConsoleRunner;

function deferred() {
  let res, rej;
  const p = new Promise(function (resolve, reject) {
    res = resolve;
    rej = reject;
  });

  return { promise: p, resolve: res, reject: rej }
}

function promisify(api) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(res, rej) {

      args.push(function (err, result) {
        if (err) { return rej(err) }
        return res(result);
      });

      api.apply(null, args);
    });
  }
}
