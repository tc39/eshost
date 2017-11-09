var $ = {
  global: this,
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realmId = Realm.createAllowCrossRealmAccess();
    var realm = Realm.global(realmId);
    Realm.eval(realmId, this.source);
    realm.$.source = this.source;
    realm.$.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };
    for(var glob in options.globals) {
      realm.$.global[glob] = options.globals[glob];
    }

    return realm.$;
  },
  evalScript(code) {
    var realmId = typeof this.realm === 'number' ? this.realm : Realm.current();
    try {
      Realm.eval(realmId, code);
      return { type: 'normal', value: undefined }
    } catch (e) {
      return { type: 'throw', value: e }
    }
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA() { return {}; },
  source: $SOURCE,
  realm: Realm.current(),
};
