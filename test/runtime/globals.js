'use strict';

const eshost = require('../../');
const assert = require('assert');
const testEachHost = require('../testEachHost.js');

testEachHost('$.(get|set)Global', function (host, type) {
  this.timeout(20000);
  let agent;

  before(function() {
    return eshost.createAgent(type, { hostPath: host }).then(a => agent = a);
  });

  after(function() {
    return agent.destroy();
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
});