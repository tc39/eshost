var $ = {
  global: this,
  createRealm: function (globals) {
    globals = globals || {};

    var realm = Realm.create();
    Realm.eval(realm, this.source);
    var $child = Realm.shared;
    $child.realm = realm;

    for(var glob in globals) {
      $child.setGlobal(glob, globals[glob]);
    }

    return $child;
  },
  evalInNewRealm: function (code, globals, errorCb) {
    if (typeof globals === 'function') {
      errorCb = globals;
      globals = {};
    }

    var $child = this.createRealm(globals);
    $child.evalInNewScript(code, errorCb);
  },
  evalInNewScript: function (code, errorCb) {
    try {
      Realm.eval(this.realm ? this.realm : Realm.current(), code);
    } catch (e) {
      if (errorCb) errorCb(e);
    }
  },
  source: $SOURCE,
  setGlobal: function (name, value) {
    this.global[name] = value;
  }
};
Realm.shared = $;
