'use strict';

const assert = require('assert');
const {ChildProcess} = require('child_process');
const Emitter = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ConsoleAgent = require('../lib/ConsoleAgent');
const sinon = require('sinon');

describe('ConsoleAgent', function () {
  describe('ConsoleAgent({ hostArguments })', function () {
    it('accepts a single item string of hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: '../',
        hostArguments: '-a',
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item string of space delimited hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: 'c:\\',
        hostArguments: '-a -b --c --dee',
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('accepts a single item array of hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: '../',
        hostArguments: ['-a'],
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item array of hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: 'c:\\',
        hostArguments: ['-a', '-b', '--c', '--dee'],
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('is forgiving of excessive spaces in hostArguments', function () {
      const a = new ConsoleAgent({
        hostPath: '/do/wa/diddy/',
        hostArguments: '-a     -b --c \t --dee',
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });
  });

  describe('ConsoleAgent({ out })', function () {

    let sandbox;
    let ccp;
    let child;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      child = new ChildProcess();

      child.stdout = new Emitter();
      child.stderr = new Emitter();

      ccp = sandbox.stub(ConsoleAgent.prototype, 'createChildProcess').returns(
        Promise.resolve(child)
      );
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('accepts an option "out" for a user provided output directory', function () {
      const out = os.tmpdir();
      const a = new ConsoleAgent({
        out
      });
      return Promise.resolve(a).then(agent => {
        assert.equal(agent.out, out);
      });
    });

    it('makes temp files in the "out" directory', function () {
      const out = os.tmpdir();
      const a = new ConsoleAgent({
        out
      });
      return Promise.resolve(a).then(agent => {
        return Promise.all([
          // Initiate a script evaluation
          agent.evalScript('', {}),

          // Since we control the child process,
          // we need to wait a moment and then send
          // a close event to end the script evaluation
          new Promise(resolve => {
            setTimeout(() => {
              child.emit('close');
              resolve();
            }, 100);
          })
        ]).then(() => {
          assert.equal(path.dirname(ccp.lastCall.args[0][0]), out);
        });
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

        assert.equal(compiled, ` const name = 'ConsoleAgent';${program}\n`.replace(/\r?\n/g, ''));
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

    it('Safely replaces all $262 in runtime code', function() {
      const runtime = ConsoleAgent.runtime;
      const a = new ConsoleAgent({
        shortName: 'Mine'
      });

      return Promise.resolve(a).then(function(agent) {
        ConsoleAgent.runtime = `
          /* $262 is special */
          var $262 = { m() { $262.something("1") } };
          // But not very special.
        `;
        let program = `
        Mine.m();
        `;
        let async = true;
        let compiled = agent.compile(program, {async});

        assert.equal(/\$262/g.test(compiled), false);

        ConsoleAgent.runtime = runtime;
      });
    });
  });


  describe('ConsoleAgent.prototype.evalScript', function () {

    let sandbox;
    let compile;
    let child;

    const defaultTestRecord = {
      file: 'test/fixtures/fake-test262/test/language/comments/hashbang/escaped-hashbang.js',
      contents: '\u0023\u0021\n\nthrow "Test262: This statement should not be evaluated.";\n',
      attrs: {
        description: 'Hashbang comments should not be allowed to have encoded characters\n',
         info: 'HashbangComment::\n  #! SingleLineCommentChars[opt]\n',
         flags: { raw: true },
         negative: { phase: 'parse', type: 'SyntaxError' },
         features: [ 'hashbang' ],
         includes: [] },
      copyright: '',
      relative: 'language/comments/hashbang/escaped-hashbang.js',
    };

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      child = new ChildProcess();

      child.stdout = new Emitter();
      child.stderr = new Emitter();

      compile = sandbox.stub(ConsoleAgent.prototype, 'compile').returns(
        Promise.resolve(child)
      );
      sandbox.stub(ConsoleAgent.prototype, 'createChildProcess').returns(
        Promise.resolve(child)
      );
      sandbox.stub(fs, 'writeFile').returns(
        Promise.resolve(child)
      );
      sandbox.stub(fs, 'stat').returns(true);
    });

    afterEach(function() {
      sandbox.restore();
    });


    it('Does not call agent.compile() when attrs.flags.raw === true', function() {
      const a = new ConsoleAgent();
      return Promise.resolve(a).then(agent => {
        return Promise.all([
          // Initiate a script evaluation
          agent.evalScript(defaultTestRecord, {}),

          // Since we control the child process,
          // we need to wait a moment and then send
          // a close event to end the script evaluation
          new Promise(resolve => {
            setTimeout(() => {
              child.emit('close');
              resolve();
            }, 100);
          })
        ]).then(() => {
          assert.equal(compile.callCount, 0);
        });
      });
    });

    it('Does call agent.compile() when attrs.flags.raw !== true', function() {
      const a = new ConsoleAgent();
      return Promise.resolve(a).then(agent => {

        let record = Object.assign(defaultTestRecord, {
          attrs: {
            flags: {
              raw: false,
            },
          },
        });

        return Promise.all([
          // Initiate a script evaluation
          agent.evalScript(record, {}),

          // Since we control the child process,
          // we need to wait a moment and then send
          // a close event to end the script evaluation
          new Promise(resolve => {
            setTimeout(() => {
              child.emit('close');
              resolve();
            }, 100);
          })
        ]).then(() => {
          assert.equal(compile.callCount, 1);
        });
      });
    });
  });
});

