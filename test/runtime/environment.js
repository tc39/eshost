'use strict';

const eshost = require('../../');
const assert = require('assert');
const testEachHost = require('../testEachHost.js');
const fs = require('fs');
const promisify = require('../../lib/promisify.js');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
testEachHost('script environment', function (host, type) {
  this.timeout(20000);
  let agent;

  before(function() {
    return eshost.createAgent(type, { hostPath: host }).then(a => agent = a);
  });

  after(function() {
    return agent.destroy();
  });

  ['evalScript', 'evalModule'].forEach(method => {
    it(method + ' runs SyntaxErrors', function () {
      return agent[method]('foo x++').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.error.name, 'SyntaxError');
        assert.equal(result.stdout, '', 'stdout not present');
      });
    });

    it(method + ' runs thrown SyntaxErrors', function () {
      return agent[method]('throw new SyntaxError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.stdout, '', 'stdout not present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'SyntaxError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it(method + ' runs thrown TypeErrors', function () {
      return agent[method]('throw new TypeError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.stdout, '', 'stdout not present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'TypeError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it(method + ' runs thrown RangeErrors', function () {
      return agent[method]('throw new RangeError("Custom Message");').then(function (result) {
        assert(result.error, 'error is present');
        assert.equal(result.stdout, '', 'stdout not present');

        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'RangeError');
        assert.equal(result.error.stack[0].lineNumber, 1);
      });
    });

    it(method + ' runs thrown Errors', function () {
      return agent[method]('throw new Error("Custom Message");').then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'Error');
      });
    });

    it(method + ' runs thrown custom Errors', function () {
      return agent[method]('function Foo1Error(msg) { this.name = "Foo1Error"; this.message = msg }; Foo1Error.prototype = Error.prototype; throw new Foo1Error("Custom Message");').then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert.equal(result.error.message, 'Custom Message');
        assert.equal(result.error.name, 'Foo1Error');
      });
    });

    it(method + ' runs thrown custom Errors that don\'t have Error.prototype', function () {
      return agent[method](`
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

    it(method + ' runs thrown Errors without messages', function () {
      return agent[method]('throw new Error();').then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert.equal(result.error.message, undefined);
        assert.equal(result.error.name, 'Error');
      });
    });

    it(method + ' runs thrown errors from eval', function () {
      return agent[method]('eval("\'\\u000Astr\\u000Aing\\u000A\'") === "\\u000Astr\\u000Aing\\u000A"')
      .then(function (result) {
        assert.equal(result.stdout, '', 'stdout not present');
        assert(result.error, 'error is present');
        assert(result.error.message); // message should be present (but is implementation defined)
        assert.equal(result.error.name, 'SyntaxError');
      });
    });

    it(method + ' runs async code', function () {
      return agent[method](`
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

    it(method + ' gathers stdout', function () {
      return agent[method]('print("foo")').then(function(result) {
        assert(result.stdout.match(/^foo\r?\n/), 'Unexpected stdout: ' + result.stdout);
      });
    });
  });
  describe('evalModule', function () {
    it('is a module and can import things in the current working directory', function() {
      return writeFile("./foo.js", "export default function foo() { return 'hello' }")
      .then(_ => {
        return agent.evalModule(`
          import foo from "./foo.js";
          print(foo());
        `);
      })
      .then(result => {
        assert(result.stdout.match(/hello/), 'Unexpected stdout: ' + result.stdout);
        return unlink('./foo.js');
      });
    });
  });

  it('evalScript runs in the proper mode', function () {
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

});