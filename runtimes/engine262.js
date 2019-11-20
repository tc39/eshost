/* Engine262 exposes a "$" object to its runtime */
/* Using this["\x24"]; prevents overwrite by ConsoleAgent */
var engine262 = this["\x24"];
var $262 = {
  realm: null,
  global: engine262.global,
  gc() {
    throw new Test262Error('GC not yet supported.');
  },
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = engine262.createRealm();

    realm.evalScript(this.source);
    realm.getGlobal = this.getGlobal;
    realm.setGlobal = this.setGlobal;
    realm.source = this.source;
    realm.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };

    for (var glob in options.globals) {
      realm.global[glob] = options.globals[glob];
    }

    this.realm = realm;

    return realm;
  },
  evalScript(code) {
    try {
      (this.realm || engine262).evalScript(code);
      return { type: 'normal', value: undefined };
    } catch (e) {
      return { type: 'throw', value: e };
    }
  },

  detachArrayBuffer: engine262.detachArrayBuffer,
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
