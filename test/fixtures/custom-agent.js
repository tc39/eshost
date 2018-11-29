'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

module.exports = (SuperAgent) => {

  class CustomAgent extends SuperAgent {
    compile(code) {
      code = super.compile(code);

      const escaped = JSON.stringify(code)
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

      return `
        Function("return this;")().require = require;
        var vm = require("vm");
        var eshostContext = vm.createContext({ setTimeout, require, console });
        vm.runInESHostContext = function(code, options) {
          return vm.runInContext(code, eshostContext, options);
        };
        vm.runInESHostContext(${escaped});
      `;
    }
  }

  CustomAgent.runtime = `
var vm = require('vm');
var $ = {
  global: Function('return this')(),
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    context = {
      console: console,
      require: require
    };

    for(var glob in options.globals) {
       context[glob] = options.globals[glob];
    }

    var context = vm.createContext(context);
    vm.runInContext(this.source, context);
    context.$.source = this.source;
    context.$.context = context;
    context.$.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };
    return context.$;
  },
  evalScript(code) {
    try {
      if (this.context) {
        vm.runInContext(code, this.context, {displayErrors: false});
      } else {
        vm.runInESHostContext(code, {displayErrors: false});
      }

      return { type: 'normal', value: undefined };
    } catch (e) {
      return { type: 'throw', value: e };
    }
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA() { return {}; },
  source: $SOURCE
};

function print() { console.log.apply(console, arguments); }
  `;



  return CustomAgent;
};
