'use strict';

const Agent = require('../lib/Agent');
const assert = require('assert');
const os = require('os');

describe('Agent', function () {
  describe('Agent({ hostArguments })', function () {
    it('accepts a single item string of hostArguments', function () {
      const a = new Agent({
        hostPath: '../',
        hostArguments: '-a',
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item string of space delimited hostArguments', function () {
      const a = new Agent({
        hostPath: 'c:\\',
        hostArguments: '-a -b --c --dee',
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('accepts a single item array of hostArguments', function () {
      const a = new Agent({
        hostPath: '../',
        hostArguments: ['-a'],
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a']);
      });
    });

    it('a multiple item array of hostArguments', function () {
      const a = new Agent({
        hostPath: 'c:\\',
        hostArguments: ['-a', '-b', '--c', '--dee'],
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });

    it('is forgiving of excessive spaces in hostArguments', function () {
      const a = new Agent({
        hostPath: '/do/wa/diddy/',
        hostArguments: '-a     -b --c \t --dee',
      });
      return Promise.resolve(a).then(agent => {
        assert.deepStrictEqual(agent.args, ['-a', '-b', '--c', '--dee']);
      });
    });
  });

  describe('Agent({ out })', function () {
    it('accepts an option "out" for a user provided output directory', function () {
      const out = os.tmpdir();
      const a = new Agent({
        out
      });
      return Promise.resolve(a).then(agent => {
        assert.equal(agent.out, out);
      });
    });
  });
});
