'use strict';

const runify = require('../');
const assert = require('assert');

const isWindows = process.platform === 'win32' ||
  process.env.OSTYPE === 'cygwin' ||
  process.env.OSTYPE === 'msys';

const hosts = [
  ['js', 'jsshell'],
  ['ch', 'ch'],
  ['node', 'node'],
  ['d8', 'd8'],
  ['jsc', 'jsc'],
  ['chrome', 'chrome'],
  ['firefox', 'firefox'],
];

const timeout = function(ms) {
  return new Promise(res => {
    setTimeout(res, ms);
  });
}

hosts.forEach(function (record) {
  const host = record[0];
  const hostBin = host + (isWindows ? '.exe' : '');
  const type = record[1];

  describe(`${type} (${host})`, function () {
    this.timeout(20000);
    let agent;

    before(function() {
      if (process.env['ESHOST_SKIP_' + host.toUpperCase()]) {
        this.skip();
        return;
      }

      return runify.createAgent(type, { hostPath: hostBin }).then(a => agent = a);
    });

    after(function() {
      return agent.destroy();
    });

    it('allows custom shortNames', function() {
      return runify.createAgent(type, { hostPath: host, shortName: '$testing' }).then(agent => {
        var p = agent.evalScript('$testing.evalScript("print(1)")').then(result => {
          assert(result.error === null, 'no error');
          assert.equal(result.stdout.indexOf('1'), 0);
        });

        p.catch(function() {}).then(() => agent.destroy());

        return p;
      });
    });

    it('runs SyntaxErrors', function () {
      return agent.evalScript('foo x++').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.error.name, 'SyntaxError');
        assert.equal(result.stdout, '', 'stdout not present');
      });
    });

    it('runs thrown SyntaxErrors', function () {
      return agent.evalScript('throw new SyntaxError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.stdout, '', 'stdout not present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'SyntaxError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it('runs thrown TypeErrors', function () {
      return agent.evalScript('throw new TypeError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.stdout, '', 'stdout not present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'TypeError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it('runs thrown RangeErrors', function () {
      return agent.evalScript('throw new RangeError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.stdout, '', 'stdout not present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'RangeError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it('runs thrown Errors', function () {
      return agent.evalScript('throw new Error("Custom Message");').then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'Error');
      });
    });

    it('runs thrown custom Errors', function () {
      return agent.evalScript('function Foo1Error(msg) { this.name = "Foo1Error"; this.message = msg }; Foo1Error.prototype = Error.prototype; throw new Foo1Error("Custom Message");').then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'Foo1Error');
      });
    });

    it('runs thrown custom Errors that don\'t have Error.prototype', function () {
      return agent.evalScript(`
        function Foo2Error(msg) {
          this.message = msg;
        }
        Foo2Error.prototype.name = 'Foo2Error';
        Foo2Error.prototype.toString = function () {
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

    it('runs thrown Errors without messages', function () {
      return agent.evalScript('throw new Error();').then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert.equal(result.error.message, undefined);
        assert.equal(result.error.name, 'Error');
      });
    });

    it('runs thrown errors from eval', function () {
      return agent.evalScript('eval("\'\\u000Astr\\u000Aing\\u000A\'") === "\\u000Astr\\u000Aing\\u000A"')
      .then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert(result.error.message); // message should be present (but is implementation defined)
        assert.equal(result.error.name, 'SyntaxError');
      });
    });

    it('gathers stdout', function () {
      return agent.evalScript('print("foo")').then(function(result) {
        assert(result.stdout.match(/^foo\r?\n/), 'Unexpected stdout: ' + result.stdout);
      });
    });

    it('can eval in new realms', function () {
      return agent.evalScript(`
        var x = 2;
        $child = $.createRealm();
        $child.evalScript("var x = 1; print(x);");
        print(x);
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n2\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('can create new realms', function() {
      return agent.evalScript(`
        var sub$ = $.createRealm({});
        sub$.evalScript("var x = 1");
        sub$.evalScript("print(x)");
        subsub$ = sub$.createRealm({});
        subsub$.evalScript("var x = 2");
        subsub$.evalScript("print(2)");
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n2\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('can set globals in new realms', function () {
      return agent.evalScript(`
        var x = 1;
        $child = $.createRealm({globals: {x: 2}});
        $child.evalScript("print(x);");
      `).then(function(result) {
        assert(result.stdout.match(/^2\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('can eval in new scripts', function () {
      return agent.evalScript(`
        var x = 2;
        $.evalScript("x = 3;");
        print(x);
      `).then(function(result) {
        assert(result.stdout.match(/^3\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('returns errors from evaling in new script', function () {
      return agent.evalScript(`
        var completion = $.evalScript("x+++");
        print(completion.value.name);
      `).then(function(result) {
        assert(result.stdout.match(/^SyntaxError\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('can eval lexical bindings in new scripts', function () {
      return agent.evalScript(`
        $.evalScript("'use strict'; let x = 3;");
        print(x);
      `).then(function(result) {
        assert(result.stdout.match(/^3\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('can set properties in new realms', function() {
      return agent.evalScript(`
        var sub$ = $.createRealm({});
        sub$.evalScript("var x = 1");
        sub$.evalScript("print(x)");

        sub$.setGlobal("x", 2);

        sub$.evalScript("print(x)");
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n2\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('can access properties from new realms', function() {
      return agent.evalScript(`
        var sub$ = $.createRealm({});
        sub$.evalScript("var x = 1");

        print(sub$.getGlobal("x"));
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('runs async code', function () {
      return agent.evalScript(`
        if ($.global.Promise === undefined) {
          print('async result');
          $.destroy()
        } else {
          Promise.resolve().then(function () {
            print('async result');
            $.destroy()
          });
        }
      `, { async: true }).then(result => {
        assert(result.stdout.match(/async result/), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('accepts destroy callbacks', function () {
      return agent.evalScript(`
        $child = $.createRealm({ destroy: function () { print("destroyed") }});
        $child.destroy();
      `)
      .then(result => {
        assert(result.stdout.match(/destroyed/), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    it('runs in the proper mode', function () {
      return agent.evalScript(`
        "use strict"
        function foo() { print(this === undefined) }
        foo();
      `)
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);

        return agent.evalScript(`
          'use strict'
          function foo() { print(this === undefined) }
          foo();
        `);
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);

        return agent.evalScript(`
          function foo() { print(this === Function('return this;')()) }
          foo();
        `);
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);

        return agent.evalScript(`
          /*---
          ---*/
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `);
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);

        return agent.evalScript(`
          /*---
          ---*/
          " some other prolog "
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `);
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);

        return agent.evalScript(`
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
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), 'Unexpected stdout: ' + result.stdout + result.stderr);
      });
    });

    // mostly this test shouldn't hang (if it hangs, it's a bug)
    it('can kill infinite loops', function () {
      // The GeckoDriver project cannot currently destroy browsing sessions
      // whose main thread is blocked.
      // https://github.com/mozilla/geckodriver/issues/825
      if (host === 'firefox') {
        this.skip();
        return;
      }

      var resultP = agent.evalScript(`while (true) { }; print(2);`);
      return timeout(100).then(_ => {
        var stopP = agent.stop();

        return Promise.all([resultP, stopP]);
      }).then(record => {
        const result = record[0];
        assert(!result.stdout.match(/2/), 'Unexpected stdout: ' + result.stdout);
      })
    })
  });

  describe(`${type} (${host})`, function () {
    this.timeout(20000);

    let agent;
    function transform(x) { return `print("${x}")`; }

    before(function() {
      if (process.env['ESHOST_SKIP_' + host.toUpperCase()]) {
        this.skip();
        return;
      }

      let options = { hostPath: host, transform }
      return runify.createAgent(type, options).then(a => agent = a);
    });

    after(function() {
      return agent.destroy();
    });

    it('runs transforms', function () {
      return agent.evalScript('foo').then(function(result) {
        assert(result.stdout.match(/^foo\r?\n/), 'Unexpected stdout: ' + result.stdout);
      });
    });
  });
});
