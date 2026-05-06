function print(str) {
  Kiesel.print(str);
}

var $262 = {
  global: globalThis,
  gc() {
    return Kiesel.gc.collect();
  },
  createRealm(options) {
    var realm = Kiesel.createRealm();
    realm.eval(this.source);
    realm.$262.source = this.source;
    return realm.$262;
  },
  detachArrayBuffer(buffer) {
    return Kiesel.detachArrayBuffer(buffer);
  },
  evalScript(code) {
    try {
      Kiesel.evalScript(code);
      return { type: "normal", value: undefined };
    } catch (e) {
      return { type: "throw", value: e };
    }
  },
  destroy() {
    /* noop */
  },
  IsHTMLDDA: Kiesel.createIsHTMLDDA(),
  source: $SOURCE,
  agent: {},
};
