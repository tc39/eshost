var $ = {
  global: this,
  createRealm(globals) {
    globals = globals || {};

    var realm;
    run(this.file, function(newRealm) {
      realm = newRealm;
    });
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
      /* FIXME: `code` should be executed as a global script, not an eval script. */
      this.global.eval(code);
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
  source: $SOURCE,
  file: $FILE
};
