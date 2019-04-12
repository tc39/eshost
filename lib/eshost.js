'use strict';

const supportedHosts = Object.freeze({
  // Shells
  chakra: 'ch',
  ch: 'ch',
  engine262: 'engine262',
  javascriptcore: 'jsc',
  jsc: 'jsc',
  jsshell: 'jsshell',
  nashorn: 'nashorn',
  node: 'node',
  sm: 'jsshell',
  spidermonkey: 'jsshell',
  d8: 'd8',
  v8: 'd8',
  xs: 'xs',

  // Browsers
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  remote: 'remote',
  safari: 'safari',
});
const normalizeTypeForJSVU = hostType => supportedHosts[hostType] || hostType;

exports.createAgent = function(type, options) {
  const hostType = normalizeTypeForJSVU(type);
  const reqPath = `./agents/${hostType}.js`;

  try {
    const Agent = new require(reqPath);
    const a = new Agent(options);
    return a.initialize();
  } catch (e) {
    if (e.message.indexOf(`Cannot find module '${reqPath}'`) > -1) {
      const supported = Object.keys(supportedHosts);
      throw new Error(`Agent for '${hostType}' not supported. Supported host type names are '${supported.join(', ')}'`);
    } else {
      throw e;
    }
  }
};

exports.supportedHosts = supportedHosts;
