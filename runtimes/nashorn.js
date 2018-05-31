var $ = {
  global: Function('return this')(),
  createRealm: function(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = loadWithNewGlobal({ script: 'this', name: 'createRealm' });
    realm.eval(this.source);
    realm.$.source = this.source;
    realm.$.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };

    for(var glob in options.globals) {
      realm.$.global[glob] = options.globals[glob];
    }

    return realm.$;
  },
  evalScript: function(code) {
    try {
      load({ script: code, name: 'evalScript' });
      return { type: 'normal', value: undefined }
    } catch (e) {
      return { type: 'throw', value: e }
    }
  },
  getGlobal: function(name) {
    return this.global[name];
  },
  setGlobal: function(name, value) {
    this.global[name] = value;
  },
  destroy: function() { /* noop */ },
  IsHTMLDDA: function() { return {}; },
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
