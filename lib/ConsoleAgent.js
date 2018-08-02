'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const temp = require('temp');
const recast = require('recast');

const Agent = require('./Agent.js');
const ErrorParser = require('./parseError.js');
const inception = require('./inception');
const {getDependencies, rawSource} = require('./dependencies.js');
const writeSources = require('./write-sources.js');

const cpSym = Symbol('cp');

class ConsoleAgent extends Agent {
  constructor(options) {
    super(options);
    this.printCommand = 'print';
    this.cpOptions = {};
    // Promise for the child process created by the most
    // recent invocation of `evalScript`
    this[cpSym] = null;
  }

  createChildProcess(args = [], options = {}) {
    try {
      return cp.spawn(this.hostPath, this.args.concat(args), options);
    } catch (error) {
      return this.createChildProcess(args, options);
    }
  }

  evalScript(code, options = {}) {
    let tempfile = temp.path({ suffix: '.js' });
    let temppath = path.dirname(tempfile);

    let hasDependencies = false;
    let sourcecode;

    const sources = [];
    const dependencies = [];

    if (this.out) {
      tempfile = tempfile.replace(temppath, this.out);
      temppath = this.out;
    }

    // When evalScript is called with a test262-stream test record:
    if (typeof code === 'object' && code.contents) {
      let {attrs, contents, file} = code;

      rawSource.clear();

      // When testing code that which has the "module" flag,
      // the raw source of the entry point module is needed
      // to create a preamble for all of the dependencies.
      if (options.module || attrs.flags.module) {
        let rawsource = fs.readFileSync(file, 'utf8');

        sourcecode = rawsource.split(/\/\*---[\r\n]+[\S\s]*[\r\n]+---\*\//)[1];

        let { phase = '', type = '' } = attrs.negative || {};
        let isEarlySyntaxError = (phase === 'early' || phase === 'parse') && type === 'SyntaxError';

        let sourcebase = path.basename(file);
        // When testing code that which has the "module" flag,
        // we must copy the test file with its actual name because the
        // source may attempt to import itself by that name.
        tempfile = path.join(temppath, sourcebase);
        // If the main test file isn't a negative: SyntaxError,
        // then we can proceed with checking for importable files
        if (!isEarlySyntaxError && attrs.flags.module) {
          dependencies.push(...getDependencies(file, [sourcebase]));

          hasDependencies = dependencies.length > 0;
        }
      }

      // The test record in "code" is no longer needed and
      // all further operations expect the "code" argument to be
      // a string, make that true for back-compat.
      code = contents;
    }

    code = this.compile(code);

    // Add the entry point source to the list of source to create.
    //
    //  "tempfile" will be either:
    //
    //    - A generated temporary file name, if evalScript received
    //      raw source code.
    //    - The file name of the test being executed, but within
    //      the os's temporary file directory
    sources.push([ tempfile, code ]);

    // If any dependencies were discovered, there will be
    if (hasDependencies) {
      // We need to "borrow" the compiled preamble code from the main
      // test file. This will include the harness and agent runtime sources.
      let preamble = code.slice(0, code.indexOf(sourcecode));

      // Prepare dependencies for use:
      //
      // 1. Load the source and extract the part that is actual JS code
      // 2. Prepend the preamble to the JS code
      // 3. Add the prepped source to list of sources that will be written
      //
      dependencies.forEach(file => {
        let rawsource = rawSource.get(path.basename(file));
        let jspart = rawsource.split(/\/\*---[\r\n]+[\S\s]*[\r\n]+---\*\//)[1];

        sources.push([
          path.join(temppath, file),
          `${preamble}\n${jspart ? jspart : rawsource}`
        ]);
      });
    }

    this[cpSym] = writeSources(sources)
      .then(() => this.createChildProcess([tempfile]));

    return this[cpSym].then(child => {
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', str => { stdout += str; });
      child.stderr.on('data', str => { stderr += str; });

      return new Promise(resolve => {
        child.on('close', () => {
          resolve({stdout, stderr});
        });
      });
    }).then(({stdout, stderr}) => {
      // Remove _all_ sources
      sources.forEach(({0: file}) => fs.unlink(file, () => { /* ignore */ }));

      const result = this.normalizeResult({ stderr, stdout });

      result.error = this.parseError(result.stderr);

      return result;
    });
  }

  stop() {
    if (this[cpSym]) {
      this[cpSym].then(child => child.kill('SIGKILL'));
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
            if (node.value.type === 'Identifier' &&
                node.value.name === '$') {
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
  const name = 'ConsoleAgent';
`;

module.exports = ConsoleAgent;

