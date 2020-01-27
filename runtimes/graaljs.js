var es = $262.evalScript;
var a = $262.agent;
var $262 = {
  global: globalThis,
  gc() {
    throw new Test262Error('GC not yet supported.');
  },
  createRealm: function(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = loadWithNewGlobal({ script: 'this', name: 'createRealm' });
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
  getGlobal: function(name) {
    return this.global[name];
  },
  setGlobal: function(name, value) {
    this.global[name] = value;
  },
  destroy: function() { /* noop */ },
  IsHTMLDDA: function() { return {}; },
  source: $SOURCE
};
$262.evalScript = es;
$262.agent = a;