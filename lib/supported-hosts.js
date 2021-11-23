const fs = require('fs');
const path = require('path');
const agents = fs.readdirSync(path.join(__dirname, "agents"));
const hostAgents = agents.reduce((accum, agent) => {
  const host = agent.slice(0, -3);
  accum[host] = host;
  return accum;
}, {});

// Inline commented hosts are here to document the
// hosts that are created by scanning the ./agents
// directory.
const supportedHostsMap = Object.assign({
  /* Shells */
  // chakra: 'chakra',
  ch: 'chakra',
  engine262: 'engine262',
  // graaljs: 'graaljs',
  javascriptcore: 'jsc',
  // jsc: 'jsc',
  // jsshell: 'jsshell',
  // libjs: 'libjs',
  // nashorn: 'nashorn',
  // node: 'node',
  // qjs: 'qjs',
  sm: 'jsshell',
  spidermonkey: 'jsshell',
  // d8: 'd8',
  v8: 'd8',
  // xs: 'xs',
  graaljs: 'graaljs',

  /* Browsers */
  // chrome: 'chrome',
  // edge: 'edge',
  // firefox: 'firefox',
  // remote: 'remote',
  // safari: 'safari',
}, hostAgents);

const supportedHosts = Object.keys(supportedHostsMap);

module.exports = {
  supportedHostsMap,
  supportedHosts,
};
