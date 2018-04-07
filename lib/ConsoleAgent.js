'use strict';
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const cp = require('child_process');
const temp = require('temp');
const recast = require('recast');

const Agent = require('./Agent.js');
const ErrorParser = require('./parseError.js');
const inception = require('./inception');


class ConsoleAgent extends Agent {
  constructor(options) {
    super(options);
    this.printCommand = 'print';
    this.cpOptions = {};
    // Promise for the child process created by the most recent invocation of
    // `evalScript`
    this._cp = null;
  }

  createChildProcess(args = [], options = {}) {
    return cp.spawn(this.hostPath, this.args.concat(args), options);
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

  compile(code, options) {
    code = super.compile(code, options);
    let runtime = this.constructor.runtime;
    let { options: hostOptions } = this;

    if (runtime) {
      let ast = recast.parse(runtime);

      recast.visit(ast, {
        visitNode(node) {
          // Remove comments from runtime source
          if (node.value.comments) {
            node.value.comments.length = 0;
          }

          if (hostOptions.shortName) {
            // Replace $ in runtime source
            if (node.value.type === "Identifier" &&
                node.value.name === "$") {
              node.value.name = hostOptions.shortName;
            }
          }

          this.traverse(node);
        }
      });

      runtime = recast.print(ast).code;
    }

    runtime = inception(runtime.replace(/\r?\n/g, ''));

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

ConsoleAgent.runtime = `
  /* This is not the agent you're looking for */
`;

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
