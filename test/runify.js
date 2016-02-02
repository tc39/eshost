'use strict';

const runify = require('../');
const assert = require('assert');

const hosts = [
  ['./hosts/js.exe', 'jsshell'],
  ['./hosts/ch.exe', 'ch'],
  ['c:/program files/nodejs/node.exe', 'node'],
  ['../v8/build/Release/d8.exe', 'd8'],
  ['C:/Users/brterlso/AppData/Local/Google/Chrome SxS/Application/chrome.exe', 'browser'],
  //['./hosts/MicrosoftEdgeLauncher.exe', 'browser']
]

hosts.forEach(function (record) {
  const host = record[0];
  const type = record[1];

  describe(`${type} (${host})`, function () {
    this.timeout(5000);
    var runner;

    before(function() {
      runner = runify.getRunner(host, type);
    });

    it('runs SyntaxErrors', function () {
      return runner.exec('foo x++').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.error.name, 'SyntaxError');

        if (type !== 'node' && type !== 'browser') {
          // node doesn't report any useful stack information for syntax errors at global scope
          // chrome seems to get confused with dynamically injected scripts
          assert.equal(result.error.stack[0].lineNumber, 1);
        }
      });
    });

    it('runs thrown SyntaxErrors', function () {
      return runner.exec('throw new SyntaxError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'SyntaxError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it('runs thrown TypeErrors', function () {
      return runner.exec('throw new TypeError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'TypeError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it('runs thrown RangeErrors', function () {
      return runner.exec('throw new RangeError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'RangeError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it('runs thrown Errors', function () {
      return runner.exec('throw new Error("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'Error');
      });
    });

    it('gathers stdout', function () {
      return runner.exec('print("foo")').then(function(result) {
        assert(result.stdout.match(/^foo\r?\n/), "Unexpected stdout: " + result.stdout);
      })
    });

    it('can eval in new realms', function () {
      return runner.exec(`
        var x = 2;
        $.evalInNewRealm("var x = 1; print(x);");
        print(x);
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n2\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      })
    });

    it('returns errors from evaling in new realms', function () {
      return runner.exec(`
        $.evalInNewRealm("x+++", function (error) { print(error.name) });
      `).then(function(result) {
        assert(result.stdout.match(/^SyntaxError\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      })
    });

    it('can create new realms', function() {
      return runner.exec(`
        var sub$ = $.createRealm({});
        sub$.evalInNewScript("var x = 1");
        sub$.evalInNewScript("print(x)");

        subsub$ = sub$.createRealm({});
        subsub$.evalInNewScript("var x = 2");
        subsub$.evalInNewScript("print(2)");
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n2\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      });
    });

    it('can eval in new realms in new realms', function () {
      return runner.exec(`
        $.evalInNewRealm("$.evalInNewRealm(\\"var x = 1; print(x)\\")");
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      });
    });

    it('can eval in new realms in new realms that throw', function () {
      var innerRealm = `$.evalInNewRealm("x+++++++;", function (err) { reportError(err); })`;
      var outerRealm = `$.evalInNewRealm("${innerRealm.replace(/"/g, '\\"')}", { reportError: function (err) { print(err.name) } })`;
      return runner.exec(outerRealm).then(function(result) {
        assert(result.stdout.match(/SyntaxError\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      });
    });

    it('can set globals in new realms', function () {
      return runner.exec(`
        var x = 1;
        $.evalInNewRealm("print(x);", {x: 2});
      `).then(function(result) {
        assert(result.stdout.match(/^2\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      })
    });

    it('can eval in new scripts', function () {
      return runner.exec(`
        var x = 2;
        $.evalInNewScript("x = 3;");
        print(x);
      `).then(function(result) {
        assert(result.stdout.match(/^3\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      })
    });

    it('returns errors from evaling in new script', function () {
      return runner.exec(`
        $.evalInNewScript("x+++", function (error) { print(error.name) });
      `).then(function(result) {
        assert(result.stdout.match(/^SyntaxError\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      })
    });

    it('can eval lexical bindings in new scripts', function () {
      if (type === 'jsc') {
        // Skip test for JavaScriptCore, see fixme in runtimes/jsc.js.
        this.skip();
      }
      return runner.exec(`
        $.evalInNewScript("'use strict'; let x = 3;");
        print(x);
      `).then(function(result) {
        assert(result.stdout.match(/^3\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      })
    });

    it('can set properties in new realms', function() {
      return runner.exec(`
        var sub$ = $.createRealm({});
        sub$.evalInNewScript("var x = 1");
        sub$.evalInNewScript("print(x)");

        sub$.setGlobal("x", 2);

        sub$.evalInNewScript("print(x)");
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n2\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      });
    });

    it('can access properties from new realms', function() {
      return runner.exec(`
        var sub$ = $.createRealm({});
        sub$.evalInNewScript("var x = 1");

        print(sub$.getGlobal("x"));
      `).then(function(result) {
        assert(result.stdout.match(/^1\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      });
    });

    it('runs in the proper mode', function () {
      return runner.exec(`
        "use strict"
        function foo() { print(this === undefined) }
        foo();
      `)
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);

        return runner.exec(`
          'use strict'
          function foo() { print(this === undefined) }
          foo();
        `)
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);

        return runner.exec(`
          function foo() { print(this === Function('return this;')()) }
          foo();
        `)
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);

        return runner.exec(`
          /*---
          ---*/
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `)
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);

        return runner.exec(`
          /*---
          ---*/
          " some other prolog "
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `)
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);

        return runner.exec(`
          // normal comment
          /*---
          ---*/
          " some other prolog "
          // another comment
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `)
      })
      .then(function(result) {
        assert(result.stdout.match(/^true\r?\n/m), "Unexpected stdout: " + result.stdout + result.stderr);
      });
    });
  });
});
