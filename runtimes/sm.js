var $ = {
  global: this,
  createRealm(globals) {
    globals = globals || {};

    var realm = newGlobal();
    realm.eval(this.source);
    realm.$.source = this.source;

    for(var glob in globals) {
      realm.$.global[glob] = globals[glob];
    }

    return realm.$;
  },
  evalInNewRealm(code, globals, errorCb) {
    if (typeof globals === 'function') {
      errorCb = globals;
      globals = {};
    }

    var $child = this.createRealm(globals);
    $child.evalInNewScript(code, errorCb);
  },
  evalInNewScript(code, errorCb) {
    try {
      evaluate(code);
    } catch (e) {
      if (errorCb) errorCb(e);
    }
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  source: $SOURCE
};

