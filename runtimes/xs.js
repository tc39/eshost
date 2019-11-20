var $262 = {
  global,
  gc() {
    throw new Test262Error('GC not yet supported.');
  },
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = global.createRealm();
    realm.eval(this.source);
    realm.$262.source = this.source;
    realm.$262.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };
    for(var glob in options.globals) {
      realm.$262.global[glob] = options.globals[glob];
    }

    return realm.$262;
  },
  evalScript(code) {
    try {
      global.evalScript(code);
      return { type: 'normal', value: undefined };
    } catch (e) {
      return { type: 'throw', value: e };
    }
  },
  getGlobal(name) {
    return global[name];
  },
  setGlobal(name, value) {
    global[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA() { return {}; },
  source: $SOURCE,
  agent: (function() {
    function thrower() {
      throw new Test262Error('Agent not yet supported.');
    };
    return {
      start: thrower,
      broadcast: thrower,
      getReport: thrower,
      sleep: thrower,
      monotonicNow: thrower,
    };
  })(),
};
