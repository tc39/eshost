'use strict';

const eshost = require('../');
const Agent = require('../lib/Agent');
const assert = require('assert');
const testEachHost = require('./testEachHost');

const timeout = function(ms) {
  return new Promise(res => {
    setTimeout(res, ms);
  });
}

describe('Agent', function () {
  describe('Agent({ hostArguments })', function () {
    it('accepts a single item string of hostArguments', function () {
      const a = new Agent({
        hostPath: '../',
        hostArguments: '-a',
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item string of space delimited hostArguments', function () {
      const a = new Agent({
        hostPath: 'c:\\',
        hostArguments: '-a -b --c --dee',
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('accepts a single item array of hostArguments', function () {
      const a = new Agent({
        hostPath: '../',
        hostArguments: ['-a'],
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item array of hostArguments', function () {
      const a = new Agent({
        hostPath: 'c:\\',
        hostArguments: ['-a', '-b', '--c', '--dee'],
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('is forgiving of excessive spaces in hostArguments', function () {
      const a = new Agent({
        hostPath: '/do/wa/diddy/',
        hostArguments: '-a     -b --c \t --dee',
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });
  });

  testEachHost('', function (host, type) {
    let agent;

    before(function() {
      return eshost.createAgent(type, { hostPath: host }).then(a => agent = a);
    });

    after(function() {
      return agent.destroy();
    });

    it('allows custom shortNames', function() {
      return eshost.createAgent(type, { hostPath: host, shortName: '$testing' }).then(agent => {
        return agent.evalScript('$testing.evalScript("print(1)")').then(result => {
          assert(result.error === null, 'no error');
          assert.equal(result.stdout.indexOf('1'), 0);
        });
      });
    });

    // mostly this test shouldn't hang (if it hangs, it's a bug)
    it('can kill infinite loops', function () {
      var resultP = agent.evalScript(`while (true) { }; print(2);`);
      return timeout(100).then(_ => {
        var stopP = agent.stop();

        return Promise.all([resultP, stopP]);
      }).then(record => {
        const result = record[0];
        assert(!result.stdout.match(/2/), 'Unexpected stdout: ' + result.stdout);
      })
    });
  });
});
