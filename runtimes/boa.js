function print() {
  console.log.apply({}, arguments);
}

var $262 = {
  global: globalThis,
  gc() {
    return $boa.gc.collect();
  },
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = $boa.realm.create();
    realm.$boa = $boa;
    realm.console = console;

    var keys = Object.keys(options.globals);
    for (var i = 0; i < keys.length; i++) {
      realm[keys[i]] = options.globals[keys[i]];
    }

    realm.eval(this.source);
    realm.$262.source = this.source;
    realm.$262.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };

    return realm.$262;
  },
  evalScript(code) {
    try {
      (0, eval)(code);
      return { type: "normal", value: undefined };
    } catch (e) {
      return { type: "throw", value: e };
    }
  },
  destroy() {
    /* noop */
  },
  /* No IsHTMLDDA */
  source: $SOURCE,
  get agent() {
    throw new Error("agent.* not yet supported.");
  },
};
