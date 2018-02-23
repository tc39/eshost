/* JavaScriptCore exposes a "$" object to its runtime */
/* Using this["\x24"]; prevents overwrite by ConsoleAgent */
var jsc = this["\x24"];
var $ = {
  agent: jsc.agent,
  global: jsc.global,
  createRealm: jsc.createRealm,
  detachArrayBuffer: jsc.detachArrayBuffer,
  evalScript: jsc.evalScript,
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA() { return {}; },
  source: $SOURCE,
};
