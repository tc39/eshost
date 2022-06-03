function print(...args) {
  console.log(...args);
}
var $262 = {
  global: globalThis,
  gc() {
    return gc();
  },
  createRealm(options) {
    throw new InternalError('createRealm() not yet supported.');
  },
  evalScript(code) {
    throw new InternalError('evalScript() not yet supported.');
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
  get agent() {
    throw new InternalError('agent.* not yet supported.');
  }
};
