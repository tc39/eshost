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
      print(this.scriptStartMarker);
      print(code);
      print(this.scriptEndMarker);

      /* Blocks until the script is written to the file system. */
      readline();

      load(this.scriptFile);
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
  file: $FILE,
  scriptFile: $SCRIPT_FILE,
  scriptStartMarker: $SCRIPT_START_MARKER,
  scriptEndMarker: $SCRIPT_END_MARKER,
};
