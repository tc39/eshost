var $ = {
  global: globalThis,
  gc() {
    return gc();
  },
  createRealm(options) {
    throw new Test262Error('$262.createRealm not yet supported.');
  },
  evalScript(code) {
    throw new Test262Error('$262.evalScript not yet supported.');
  },
  getGlobal(name) {
    return globalThis[name];
  },
  setGlobal(name, value) {
    globalThis[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA() { return {}; },
  source: $SOURCE,
  get agent() {
    throw new Test262Error('Agent not yet supported.');
  }
};

