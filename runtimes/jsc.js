var $ = {
  global: this,
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm;
    run(this.file, function(newRealm) {
      realm = newRealm;
    });
    realm.eval(this.source);
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
  evalScript(code, errorCb) {
    try {
      print(this.scriptStartMarker);
      print(code);
      print(this.scriptEndMarker);

      /* Blocks until the script is written to the file system. */
      readline();

      load(this.scriptFile);
      return { type: 'normal', value: undefined };
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
  file: $FILE,
  scriptFile: $SCRIPT_FILE,
  scriptStartMarker: $SCRIPT_START_MARKER,
  scriptEndMarker: $SCRIPT_END_MARKER,
};
