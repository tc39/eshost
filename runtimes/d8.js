var $ = {
  global: this,
  createRealm: function (options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = Realm.create();
    Realm.eval(realm, this.source);
    var $child = Realm.shared;
    $child.realm = realm;
    $child.source = this.source;
    Realm.shared = void 0;
    $child.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };
    for(var glob in options.globals) {
      $child.setGlobal(glob, options.globals[glob]);
    }

    return $child;
  },
  evalScript: function (code) {
    try {
      Realm.eval(this.realm ? this.realm : Realm.current(), code);
      return { type: 'normal', value: undefined }
    } catch (e) {
      return { type: 'throw', value: e }
    }
  },
  getGlobal: function (name) {
    return this.global[name];
  },
  setGlobal: function (name, value) {
    this.global[name] = value;
  },
  destroy: function() { /* noop */ },
  source: $SOURCE
};
Realm.shared = $;
