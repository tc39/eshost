import fs from "node:fs";

const agents = fs.readdirSync(new URL("./agents/", import.meta.url));
const hostAgents = agents.reduce((accum, agent) => {
  const host = agent.slice(0, -3);
  accum[host] = host;
  return accum;
}, {});

// Inline commented hosts are here to document the
// hosts that are created by scanning the ./agents
// directory.
export const supportedHostsMap = Object.assign(
  {
    /* Shells */
    // boa: 'boa',
    engine262: "engine262",
    // graaljs: 'graaljs',
    javascriptcore: "jsc",
    // jsc: 'jsc',
    // jsshell: 'jsshell',
    // kiesel: 'kiesel',
    // libjs: 'libjs',
    "serenity-js": "libjs",
    // nashorn: 'nashorn',
    // node: 'node',
    // qjs: 'qjs',
    sm: "jsshell",
    spidermonkey: "jsshell",
    // d8: 'd8',
    v8: "d8",
    // xs: 'xs',
    graaljs: "graaljs",

    /* Browsers */
    // chrome: 'chrome',
    // edge: 'edge',
    // firefox: 'firefox',
    // remote: 'remote',
    // safari: 'safari',
  },
  hostAgents,
);

export const supportedHosts = Object.keys(supportedHostsMap);
