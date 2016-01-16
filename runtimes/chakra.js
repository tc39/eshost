var $ = {
  global: this,
  createRealm(globals) {
    globals = globals || {};

    var realm = WScript.LoadScript(this.source, 'samethread');
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
      WScript.LoadScript(code);
    } catch (e) {
      if (errorCb) errorCb(e);
    }
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  source: $SOURCE
};
