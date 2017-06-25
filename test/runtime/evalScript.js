'use strict';

const eshost = require('../../');
const assert = require('assert');
const testEachHost = require('../testEachHost.js');

testEachHost('$.evalScript', function (host, type) {
  this.timeout(20000);
  let agent;

  before(function() {
    return eshost.createAgent(type, { hostPath: host }).then(a => agent = a);
  });

  after(function() {
    return agent.destroy();
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
});