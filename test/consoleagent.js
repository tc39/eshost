'use strict';

const ConsoleAgent = require('../lib/ConsoleAgent');
const assert = require('assert');


describe('ConsoleAgent', function () {
  describe('ConsoleAgent({ hostArguments })', function () {
    it('accepts a single item string of hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: '../',
        hostArguments: '-a',
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item string of space delimited hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: 'c:\\',
        hostArguments: '-a -b --c --dee',
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('accepts a single item array of hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: '../',
        hostArguments: ['-a'],
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item array of hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: 'c:\\',
        hostArguments: ['-a', '-b', '--c', '--dee'],
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('is forgiving of excessive spaces in hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: '/do/wa/diddy/',
        hostArguments: '-a     -b --c \t --dee',
      });
      return Promise.resolve(a).then(function (agent) {
        assert.deepEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });
  });

  describe('ConsoleAgent.prototype.compile', function () {
    it('Consumes this.constructor.runtime', function() {
      const a = new ConsoleAgent();

      return Promise.resolve(a).then(function(agent) {
        let program = 'var a = 1;';
        let async = true;
        let compiled = agent.compile(program, {async});

        assert.equal(compiled, `  const name = 'ConsoleAgent';${program}`.replace(/\r?\n/g, ''));
      });
    });
    it('Removes all linebreaks from runtime code', function() {
      const runtime = ConsoleAgent.runtime;
      const a = new ConsoleAgent();

      return Promise.resolve(a).then(function(agent) {
        ConsoleAgent.runtime = `


        `;
        let program = '';
        let async = true;
        let compiled = agent.compile(program, {async});

        assert.equal(/\r?\n/g.test(compiled), false);

        ConsoleAgent.runtime = runtime;
      });
    });

    it('Safely replaces all $ in runtime code', function() {
      const runtime = ConsoleAgent.runtime;
      const a = new ConsoleAgent({
        shortName: 'Mine'
      });

      return Promise.resolve(a).then(function(agent) {
        ConsoleAgent.runtime = `
          /* $ is special */
          var $ = { m() { $.something("1") } };
          // But not very special.
        `;
        let program = `
        Mine.m();
        `;
        let async = true;
        let compiled = agent.compile(program, {async});

        assert.equal(/\$/g.test(compiled), false);

        ConsoleAgent.runtime = runtime;
      });
    });
  });
});

