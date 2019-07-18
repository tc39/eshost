'use strict';
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const recast = require('recast');
const uniqueTempDir = require('unique-temp-dir');

const Agent = require('./Agent');
const ErrorParser = require('./parseError');
const inception = require('./inception');
const writeSources = require('./write-sources');
const {
  getDependencies,
  // escapeModuleSpecifier,
  hasModuleSpecifier,
  rawSource
} = require('./dependencies');

const cpSym = Symbol.for('cp');
const tpSym = Symbol.for('tp');

function generateTempFileName() {
  const now = Date.now();
  return `f-${now}-${process.pid}-${(Math.random() * 0x100000000 + 1).toString(36)}.js`;
}

class ConsoleAgent extends Agent {
  constructor(options) {
    super(options);
    this.printCommand = 'print';
    this.cpOptions = {};
    // Promise for the child process created by the most
    // recent invocation of `evalScript`
    this[cpSym] = null;
    this[tpSym] = uniqueTempDir();
  }

  createChildProcess(args = [], options = {}) {
    try {
      return cp.spawn(
        this.hostPath,
        this.args.concat(args),
        Object.assign({}, this.cpOptions, options)
      );
    } catch (error) {
      return this.createChildProcess(args, options);
    }
  }

  evalScript(code, options = {}) {
    let tempfile = path.join(this[tpSym], generateTempFileName());
    let temppath = this[tpSym];

    let isExpectingRawSource = false;
    let hasDependencies = false;

    const sources = [];
    const dependencies = [];

    if (this.out) {
      tempfile = tempfile.replace(temppath, this.out);
      temppath = this.out;
    }

    // When evalScript is called with a test262-stream test record:
    if (typeof code === 'object' && code.contents) {
      let {attrs, contents, file} = code;

      isExpectingRawSource = !!attrs.flags.raw;

      let { phase = '', type = '' } = attrs.negative || {};
      let isEarlySyntaxError = (phase === 'early' || phase === 'parse') && type === 'SyntaxError';
      let sourcebase = path.basename(file);

      // If the main test file isn't a negative: SyntaxError,
      // then we can proceed with checking for importable files
      if (!isEarlySyntaxError) {
        dependencies.push(...getDependencies(file, [sourcebase]));
        hasDependencies = dependencies.length > 0;
      }

      if (dependencies.length === 1 && dependencies[0] === sourcebase) {
        dependencies.length = 0;
        hasDependencies = false;
      }

      if (options.module || attrs.flags.module ||
          hasModuleSpecifier(contents)) {
        // When testing module or dynamic import code that imports itself,
        // we must copy the test file with its actual name.
        tempfile = path.join(temppath, sourcebase);
      }

      // The test record in "code" is no longer needed and
      // all further operations expect the "code" argument to be
      // a string, make that true for back-compat.
      code = contents;
    }

    // If test record explicitly indicates that this test should be
    // treated as raw source only, then it does not need to be
    // further "compiled".
    if (!isExpectingRawSource) {
      code = this.compile(code);
    }

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
      // Prepare dependencies for use:
      //
      // 1. Make an absolute path for the dependency file.
      // 2. Get the dependency's source from the rawSource cache
      // 3. Push the dependency and source into the sources to be written.
      //
      dependencies.forEach(file => {
        let absname = path.join(temppath, file);
        let depsource = rawSource.get(path.basename(file));

        // Sometimes a test file might want to import itself,
        // which is a valid exercise of the import semantics.
        // Here we avoid adding the test file more than once.
        if (absname !== tempfile) {
          sources.push([
            absname,
            depsource
          ]);
        }
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
        child.on('close', (code, signal) => {
          if (signal && signal !== "SIGKILL") {
            stderr += `\nError: Received unexpected signal: ${signal}`;
          }
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

    runtime = inception(runtime.replace(/\r?\n/g, '').replace(/\s+/gm, ' '));

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

