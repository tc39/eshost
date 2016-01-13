var $ = {
  global: this,
  createRealm: function(globals) {
    globals = globals || {};

    var realm = loadWithNewGlobal({script: 'this', name: 'createRealm'});
    realm.eval(this.source);
    realm.$.source = this.source;

    for(var glob in globals) {
      realm.$.global[glob] = globals[glob];
    }

    return realm.$;
  },
  evalInNewRealm: function(code, globals, errorCb) {
    if (typeof globals === 'function') {
      errorCb = globals;
      globals = {};
    }

    var $child = this.createRealm(globals);
    $child.evalInNewScript(code, errorCb);
  },
  evalInNewScript: function(code, errorCb) {
    try {
      load({script: code, name: 'evalInNewScript'});
    } catch (e) {
      if (errorCb) errorCb(e);
    }
  },
  setGlobal: function(name, value) {
    this.global[name] = value;
  },
  source: $SOURCE
};
