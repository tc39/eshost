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

  it('accepts destroy callbacks', function () {
    return agent.evalScript(`
      $child = $.createRealm({ destroy: function () { print("destroyed") }});
      $child.destroy();
    `)
    .then(result => {
      assert(result.stdout.match(/destroyed/), 'Unexpected stdout: ' + result.stdout + result.stderr);
    });
  });

});