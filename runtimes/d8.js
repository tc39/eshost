var $ = {
  global: this,
  createRealm: function (globals) {
    globals = globals || {};

    var realm = Realm.create();
    Realm.eval(realm, this.source);
    var $child = Realm.shared;
    $child.realm = realm;
    $child.source = this.source;
    Realm.shared = void 0;

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
  getGlobal: function (name) {
    return this.global[name];
  },
  setGlobal: function (name, value) {
    this.global[name] = value;
  },
  source: $SOURCE
};
Realm.shared = $;
