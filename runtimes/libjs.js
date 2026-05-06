function print(...args) {
  console.log(...args);
}
var $262 = {
  global: globalThis,
  gc() {
    return gc();
  },
  createRealm(options) {
    throw new InternalError("createRealm() not yet supported.");
  },
  evalScript(code) {
    throw new InternalError("evalScript() not yet supported.");
  },
  destroy() {
    /* noop */
  },
  /* No IsHTMLDDA */
  source: $SOURCE,
  get agent() {
    throw new InternalError("agent.* not yet supported.");
  },
};
