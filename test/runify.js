'use strict';

const eshost = require('../');
const assert = require('assert');
const {stripIndent} = require('common-tags');
const hasbin = require('hasbin');
const fs = require('fs');
const path = require('path');
const Test262Stream = require('test262-stream');

const isWindows = process.platform === 'win32' ||
  process.env.OSTYPE === 'cygwin' ||
  process.env.OSTYPE === 'msys';

const capabilities = {
  browserName: process.env.ESHOST_REMOTE_BROWSERNAME || 'firefox',
  platform: process.env.ESHOST_REMOTE_PLATFORM || 'ANY',
  version: process.env.ESHOST_REMOTE_VERSION || ''
};

const webdriverServer = 'http://localhost:4444/wd/hub';

const hosts = [
  ['ch', { hostPath: 'ch' }],
  ['hermes', { hostPath: 'hermes' }],
  ['d8', { hostPath: 'd8' }],
  ['engine262', { hostPath: 'engine262' }],
  ['jsshell', { hostPath: 'js' }],
  ['jsc', { hostPath: 'jsc' }],
  ['node', { hostPath: 'node' }],
  ['chrome', { hostPath: 'chrome' }],
  ['firefox', { hostPath: 'firefox' }],
  ['remote', { webdriverServer, capabilities }],
];

const hostsOnWindows = [
  ['ch', { hostPath: 'ch.exe' }],
  ['d8', { hostPath: 'd8.exe' }],
  ['engine262', { hostPath: 'engine262.cmd' }],
  ['jsshell', { hostPath: 'js.exe' }],
  ['jsc', { hostPath: 'jsc.exe' }],
  ['node', { hostPath: 'node.exe' }],
  ['chrome', { hostPath: 'chrome.exe' }],
  ['firefox', { hostPath: 'firefox.exe' }],
  ['remote', {}],
];

// console.log(`isWindows: ${isWindows}`);
if (isWindows) {
  hosts.forEach((record, index) => {
    const host = hostsOnWindows[index];
    if (record[1].hostPath) {
      if (record[0] === host[0]) {
        record[1].hostPath = host[1].hostPath;
      }
      const ESHOST_ENV_NAME = `ESHOST_${record[0].toUpperCase()}_PATH`;
      console.log(`ESHOST_ENV_NAME: ${ESHOST_ENV_NAME}`);
      if (process.env[ESHOST_ENV_NAME]) {
        record[1].hostPath = path.join(process.env[ESHOST_ENV_NAME], record[1].hostPath);
        console.log(record[1].hostPath);
      }
    }
  });
}


const timeout = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};


hosts.forEach(function(record) {
  const type = record[0];
  const options = record[1];
  const effectiveType = type === 'remote' ?
    options.capabilities.browserName : type;

  const isSkipped = process.env[`ESHOST_SKIP_${type.toUpperCase()}`] || false;
  console.log(`ESHOST_SKIP_${type.toUpperCase()}: ${isSkipped ? 'YES' : 'NO'}`);

  if (!isSkipped &&
    (options.hostPath && (!hasbin.sync(options.hostPath) && !fs.existsSync(options.hostPath)))) {
    console.error(`Unable to run tests - host not found: ${options.hostPath}`);
  }

  describe(`${type} (${options.hostPath || type})`, function() {
    let run;
    this.timeout(20000);

    before(function() {
      run = this;
      if (isSkipped) {
        run.skip();
        return;
      }

      if (type === 'remote') {
        run.timeout(60 * 1000);
      }
    });

    describe('normal script evaluation', function() {
      let run;
      let agent;

      before(function() {
        run = this;
        return eshost.createAgent(type, options)
          .then(a => agent = a);
      });

      after(function() {
        return agent && agent.destroy();
      });

      it('runs SyntaxErrors', () => {
        return agent.evalScript('foo x++').then(result => {
          assert(result.error, 'error is present');
          assert.equal(result.error.name, 'SyntaxError');
          assert.equal(result.stdout, '', 'stdout not present');
        });
      });

      it('runs thrown SyntaxErrors', () => {
        return agent.evalScript('throw new SyntaxError("Custom Message");').then(result => {
          assert(result.error, 'error is present');
          assert.equal(result.stdout, '', 'stdout not present');

          assert.equal(result.error.message, 'Custom Message');
          assert.equal(result.error.name, 'SyntaxError');

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            assert.equal(result.error.stack[0].lineNumber, 1);
          }
        });
      });

      it('runs thrown TypeErrors', () => {
        return agent.evalScript('throw new TypeError("Custom Message");').then(result => {
          assert(result.error, 'error is present');
          assert.equal(result.stdout, '', 'stdout not present');

          assert.equal(result.error.message, 'Custom Message');
          assert.equal(result.error.name, 'TypeError');

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            assert.equal(result.error.stack[0].lineNumber, 1);
          }
        });
      });

      it('runs thrown RangeErrors', () => {
        return agent.evalScript('throw new RangeError("Custom Message");').then(result => {
          assert(result.error, 'error is present');
          assert.equal(result.stdout, '', 'stdout not present');

          assert.equal(result.error.message, 'Custom Message');
          assert.equal(result.error.name, 'RangeError');

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            assert.equal(result.error.stack[0].lineNumber, 1);
          }
        });
      });

      it('runs thrown Errors', () => {
        return agent.evalScript('throw new Error("Custom Message");').then(result => {
          assert.equal(result.stdout, '', 'stdout not present');
          assert(result.error, 'error is present');
          assert.equal(result.error.message, 'Custom Message');
          assert.equal(result.error.name, 'Error');
        });
      });

      it('runs thrown custom Errors', () => {
        return agent.evalScript('function Foo1Error(msg) { this.name = "Foo1Error"; this.message = msg }; Foo1Error.prototype = Error.prototype; throw new Foo1Error("Custom Message");').then(result => {

          assert.equal(result.stdout, '', 'stdout not present');
          assert(result.error, 'error is present');
          assert.equal(result.error.message, 'Custom Message');
          assert.equal(result.error.name, 'Foo1Error');
        });
      });

      it('runs thrown custom Errors that don\'t have Error.prototype', () => {


        return agent.evalScript(stripIndent`
          function Foo2Error(msg) {
            this.message = msg;
          }
          Foo2Error.prototype.name = 'Foo2Error';
          Foo2Error.prototype.toString = function() {
            return 'Foo2Error: ' + this.message;
          }

          throw new Foo2Error('FAIL!');
        `).then(result => {
          assert.equal(result.stdout, '', 'stdout not present');
          assert(result.error, 'error is present');
          assert.equal(result.error.message, 'FAIL!');
          assert.equal(result.error.name, 'Foo2Error');
        });
      })

      it('runs thrown Errors without messages', () => {
        return agent.evalScript('throw new Error();').then(result => {
          assert.equal(result.stdout, '', 'stdout not present');
          assert(result.error, 'error is present');
          assert.equal(result.error.message, undefined);
          assert.equal(result.error.name, 'Error');
        });
      });

      it('runs thrown errors from eval', () => {
        return agent.evalScript('eval("\'\\u000Astr\\u000Aing\\u000A\'") === "\\u000Astr\\u000Aing\\u000A"')
        .then(result => {
          assert.equal(result.stdout, '', 'stdout not present');
          assert(result.error, 'error is present');
          assert.equal(result.error.name, 'SyntaxError');

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            // message should be present (but is implementation defined)
            assert(result.error.message);
          }
        });
      });

      it('gathers stdout', () => {
        return agent.evalScript('print("foo")').then(result => {
          assert(result.stdout.match(/^foo\r?\n/), `Unexpected stdout: ${result.stdout}`);
        });
      });

      it('can eval in new realms', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          var x = 2;
          var $child = $.createRealm();
          $child.evalScript("var x = 1; print(x);");
          print(x);
        `).then(result => {
          assert.equal(result.stderr, '', 'stderr not present');
          assert(result.stdout.match(/^1\r?\n2\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('can create new realms', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          var sub$ = $.createRealm({});
          sub$.evalScript("var x = 1");
          sub$.evalScript("print(x)");
          subsub$ = sub$.createRealm({});
          subsub$.evalScript("var x = 2");
          subsub$.evalScript("print(2)");
        `).then(result => {
          assert.equal(result.stderr, '', 'stderr not present');
          assert(result.stdout.match(/^1\r?\n2\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('can set globals in new realms', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          var x = 1;
          $child = $.createRealm({globals: {x: 2}});
          $child.evalScript("print(x);");
        `).then(result => {
          assert(result.stdout.match(/^2\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('can eval in new scripts', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          var x = 2;
          $.evalScript("x = 3;");
          print(x);
        `).then(result => {
          assert(result.stdout.match(/^3\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('returns errors from evaling in new script', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          var completion = $.evalScript("x+++");
          print(completion.value.name);
        `).then(result => {
          assert(result.stdout.match(/^SyntaxError\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('can eval lexical bindings in new scripts', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          $.evalScript("'use strict'; let x = 3;");
          print(x);
        `).then(result => {
          assert(result.stdout.match(/^3\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('can set properties in new realms', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          var sub$ = $.createRealm({});
          sub$.evalScript("var x = 1");
          sub$.evalScript("print(x)");

          sub$.setGlobal("x", 2);

          sub$.evalScript("print(x)");
        `).then(result => {
          assert.equal(result.stderr, '', 'stderr not present');
          assert(result.stdout.match(/^1\r?\n2\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('can access properties from new realms', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          var sub$ = $.createRealm({});
          sub$.evalScript("var x = 1");

          print(sub$.getGlobal("x"));
        `).then(result => {
          assert.equal(result.stderr, '', 'stderr not present');
          assert(result.stdout.match(/^1\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('runs async code', () => {
        return agent.evalScript(stripIndent`
          if ($.global.Promise === undefined) {
            print('async result');
            $.destroy()
          } else {
            Promise.resolve().then(function() {
              print('async result');
              $.destroy()
            });
          }
        `, { async: true }).then(result => {

          assert.equal(result.stderr, '', 'stderr not present');
          assert(result.stdout.match(/async result/), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('accepts destroy callbacks', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          $child = $.createRealm({ destroy: function() { print("destroyed") }});
          $child.destroy();
        `)
        .then(result => {
          assert.equal(result.stderr, '', 'stderr not present');
          assert(result.stdout.match(/destroyed/), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it('runs in the proper mode', () => {
        return agent.evalScript(stripIndent`
          "use strict"
          function foo() { print(this === undefined) }
          foo();
        `)
        .then(result => {
          assert(result.stdout.match(/^true\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);

          return agent.evalScript(stripIndent`
            'use strict'
            function foo() { print(this === undefined) }
            foo();
          `);
        })
        .then(result => {
          assert(result.stdout.match(/^true\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);

          return agent.evalScript(stripIndent`
            function foo() { print(this === Function('return this;')()) }
            foo();
          `);
        })
        .then(result => {
          assert(result.stdout.match(/^true\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);

          return agent.evalScript(stripIndent`
            /*---
            ---*/
            "use strict";
            function foo() { print(this === undefined) }
            foo();
          `);
        })
        .then(result => {
          assert(result.stdout.match(/^true\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);

          return agent.evalScript(stripIndent`
            /*---
            ---*/
            " some other prolog "
            "use strict";
            function foo() { print(this === undefined) }
            foo();
          `);
        })
        .then(result => {
          assert(result.stdout.match(/^true\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);

          return agent.evalScript(stripIndent`
            // normal comment
            /*---
            ---*/
            " some other prolog "
            // another comment
            "use strict";
            function foo() { print(this === undefined) }
            foo();
          `);
        })
        .then(result => {

          assert(result.stdout.match(/^true\r?\n/m), `Unexpected stdout: ${result.stdout}${result.stderr}`);
        });
      });

      it("prints values correctly", function() {
        return agent.evalScript(stripIndent`
          print(undefined);
          print(null);
          print('string');
          print(true);
          print(false);
          print(0);
          print(1);
          print(1.2);
          print(-1);
        `).then((result) => {
          var values;

          assert.equal(result.stderr, '');

          values = result.stdout.split(/\r?\n/);
          assert.equal(values[0], 'undefined')
          assert.equal(values[1], 'null')
          assert.equal(values[2], 'string')
          assert.equal(values[3], 'true')
          assert.equal(values[4], 'false')
          assert.equal(values[5], '0')
          assert.equal(values[6], '1')
          assert.equal(values[7], '1.2')
          assert.equal(values[8], '-1')
        });
      });

      it('tolerates broken execution environments', () => {
        return agent.evalScript(stripIndent`
          Object.defineProperty(Object.prototype, "length", {
            get: function() {
                return 1;
            },
            configurable: true
          });

          print('okay');
        `).then((result) => {
          assert.equal(result.stderr, '');
          assert(result.stdout.match(/^okay\r?\n/m));
        });
      });

      it('supports realm nesting', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          x = 0;
          $.createRealm().evalScript(\`
            x = '';
            $.createRealm().evalScript(\\\`
              x = {};
              print(typeof x);
            \\\`);
            print(typeof x);
          \`);
          print(typeof x);
        `).then((result) => {
          assert.equal(result.stderr, '');
          assert(result.stdout.match(/^object\r?\nstring\r?\nnumber\r?\n/m));
        });
      });

      it('observes correct cross-script interaction semantics', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return agent.evalScript(stripIndent`
          print($.evalScript('let eshost;').type);
          print($.evalScript('let eshost;').type);
        `).then((result) => {
          assert.equal(result.stderr, '');
          assert(result.stdout.match(/^normal\r?\nthrow/m));
        });
      });

      // The host may need to perform a number of asynchronous operations in
      // order to evaluate a script. If the `stop` method is invoked while
      // these operations are taking place, the host should not evaluate the
      // script.
      it('avoids race conditions in `stop`', () => {
        const evalScript = agent.evalScript('print(1);');

        agent.stop();

        return evalScript.then(result => {
          assert.equal(result.stdout, '');
        });
      });

      // mostly this test shouldn't hang (if it hangs, it's a bug)
      it('can kill infinite loops', () => {
        // The GeckoDriver project cannot currently destroy browsing sessions
        // whose main thread is blocked.
        // https://github.com/mozilla/geckodriver/issues/825
        if (effectiveType === 'firefox') {
          run.skip();
          return;
        }

        const resultP = agent.evalScript(stripIndent`while (true) { }; print(2);`);
        return timeout(100).then(() => {
          const stopP = agent.stop();

          return Promise.all([resultP, stopP]);
        }).then(record => {
          const result = record[0];
          assert(!result.stdout.match(/2/), `Unexpected stdout: ${result.stdout}`);
        });
      });

      it('tolerates LINE SEPARATOR and PARAGRAPH SEPARATOR', () => {
        if (!['node'].includes(type)) {
          run.skip();
          return;
        }

        const operations = [
          '\u2028print("U+2028 once");',
          '\u2029print("U+2029 once");',
          '\u2028\u2029print("both U+2028 and U+2029");',
          '\u2028\u2028print("U+2028 twice");',
          '\u2029\u2029print("U+2029 twice");'
        ].map(src => agent.evalScript(src));

        return Promise.all(operations)
          .then(results => {
            assert.equal(results[0].stderr, '');
            assert(
              results[0].stdout.match(/^U\+2028 once\r?\n/),
              `Unexpected stdout: ${results[0].stdout}`
            );

            assert.equal(results[1].stderr, '');
            assert(
              results[1].stdout.match(/^U\+2029 once\r?\n/),
              `Unexpected stdout: ${results[1].stdout}`
            );

            assert.equal(results[2].stderr, '');
            assert(
              results[2].stdout.match(/^both U\+2028 and U\+2029\r?\n/),
              `Unexpected stdout: ${results[2].stdout}`
            );

            assert.equal(results[3].stderr, '');
            assert(
              results[3].stdout.match(/^U\+2028 twice\r?\n/),
              `Unexpected stdout: ${results[3].stdout}`
            );

            assert.equal(results[4].stderr, '');
            assert(
              results[4].stdout.match(/^U\+2029 twice\r?\n/),
              `Unexpected stdout: ${results[4].stdout}`
            );
          }).catch(error => {
            console.log(`ERROR: ${error.message}`);
          });
      });

      it('creates "optional" environments correctly (hostArgs)', () => {
        // browsers are irrelevant to this test
        // jsshell is not working correctly on travis
        if (['engine262', 'hermes', 'jsshell', 'firefox', 'chrome', 'remote'].includes(type)) {
          run.skip();
          return;
        }

        let source = '';
        let hostArguments = '';

        // Setup special cases
        if (type === 'ch') {
          // Hello! If you come here wondering why this fails
          // on your local machine, it's because you're using a
          // version of Chakra that was not compiled with support
          // for development flags. That's ok! The CI machine
          // will check this for you, so don't sweat it.
          hostArguments = '-Intl-';
          source = 'print(typeof Intl === "undefined");';
        }

        if (type === 'd8') {
          hostArguments = '--expose_gc';
          source = 'print(typeof gc === "function");';
        }

        if (type === 'jsc') {
          hostArguments = '--useWebAssembly=false';
          source = 'print(typeof WebAssembly === "undefined");';
        }

        if (type === 'jsshell') {
          hostArguments = '--shared-memory=off';
          source = 'print(typeof SharedArrayBuffer === "undefined");';
        }

        if (type === 'node') {
          hostArguments = '--expose_gc';
          source = 'print(typeof gc === "function");';
        }

        return eshost.createAgent(type, Object.assign({ hostArguments }, options))
          .then(a => {
            agent = a;

            return agent.evalScript(source)
              .then(result => {
                assert.equal(result.stdout.trim(), 'true');
              });
          });
      });
    });

    describe('normal module evaluation', function() {
      let run;
      let agent;
      let records;

      before(function() {
        run = this;
        // For now we're only going to confirm these in
        // SpiderMonkey and V8
        //
        // JSC has an implementation, but it has too
        // many bugs to be useful for testing eshost
        //
        if (!['jsshell', 'd8'].includes(type)) {
          run.skip();
          return;
        }

        const FAKE_TEST262 = path.join(process.cwd(), 'test/fixtures/fake-test262');

        let captured = [];
        let stream = new Test262Stream(FAKE_TEST262, {
          acceptVersion: '3.0.0',
          includesDir: path.join(FAKE_TEST262, 'harness'),
          paths: ['test/language/module-code']
        });

        stream.on('data', test => {
          // SpiderMonkey doesn't support these yet.
          if (type === 'jsshell' && test.file.includes('dynamic-import')) {
            return;
          }
          if (test.scenario === 'default') {
            test.file = path.join(FAKE_TEST262, test.file);
            captured.push(test);
          }
        });

        let pTests = new Promise(resolve => {
          stream.on('end', () => resolve(captured));
        });

        let pAgent = eshost.createAgent(type, options);

        return Promise.all([
          pTests,
          pAgent,
        ]).then(([r, a]) => {
          records = r;
          agent = a;
        });
      });

      after(function() {
        records.length = 0;
        return agent && agent.destroy();
      });

      it('Can evaluate module code', () => {
        // 60 seconds should be enough.
        run.timeout(60000);

        return Promise.all(
          records.map(record => {
            let options = record.attrs.flags;

            return new Promise(resolve => {
              agent.evalScript(record, options).then(result => {
                let negative = record.attrs.negative;
                let expectedStdout = record.attrs.flags.async ?
                  'Test262:AsyncTestComplete' : '';

                if (negative) {
                  assert(result.error, 'error is not null');
                  assert.equal(result.stdout, '', 'stdout is empty');
                } else {
                  let stdout = result.stdout.trim();
                  assert(!result.error, 'error is null');
                  assert(!result.stderr, 'stderr is empty string');
                  assert.equal(stdout, expectedStdout, `stdout is "${expectedStdout}"`);
                }
                resolve();
              }).catch(error => {
                console.log(`ERROR: ${path.basename(record.file)}`);
                console.log(error.message);
              })
            });
          })
        );
      });
    });

    describe('"shortName" option', () => {
      it('allows custom shortNames', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        const withShortName = Object.assign({ shortName: '$testing' }, options);
        return eshost.createAgent(type, withShortName).then(agent => {
          var p = agent.evalScript('$testing.evalScript("print(1)")').then(result => {
            assert(result.error === null, 'no error');
            assert.equal(result.stdout.indexOf('1'), 0);
          });

          p.catch(function() {}).then(() => agent.destroy());

          return p;
        });
      });
    });

    describe('"transform" option', () => {
      let agent;
      function transform(x) { return `print("${x}")`; }

      before(function() {
        let withTransform = Object.assign({ transform }, options);
        return eshost.createAgent(type, withTransform).then(a => agent = a);
      });

      after(function() {
        return agent && agent.destroy();
      });

      it('runs transforms', () => {
        return agent.evalScript('foo').then(result => {
          assert(result.stdout.match(/^foo\r?\n/), `Unexpected stdout: ${result.stdout}`);
        });
      });
    });

    describe('"IsHTMLDDA"', () => {
      it('has a default IsHTMLDDA', () => {
        if (['hermes'].includes(type)) {
          run.skip();
          return;
        }

        return eshost.createAgent(type, options).then(agent => {
          let p = agent.evalScript('print(typeof $.IsHTMLDDA);').then(result => {
            assert(result.error === null, 'no error');
            assert.equal(result.stdout.indexOf('function'), 0);
            agent.destroy();
          });

          p.catch(function() {}).then(() => agent.destroy());

          return p;
        });
      });
    });
  });
});
