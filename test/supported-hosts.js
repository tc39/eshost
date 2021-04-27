'use strict';

const fs = require('fs');
const assert = require('assert');
const eshost = require('../');
const {
  supportedHostsMap: hostMap,
  supportedHosts: hostList,
} = require('../lib/supported-hosts');
const runtimePath = require('../lib/runtime-path');

const supportedHostsMap = {
  BrowserAgent: 'BrowserAgent',
  ch: 'chakra',
  chakra: 'chakra',
  chrome: 'chrome',
  d8: 'd8',
  edge: 'edge',
  engine262: 'engine262',
  firefox: 'firefox',
  graaljs: 'graaljs',
  hermes: 'hermes',
  javascriptcore: 'jsc',
  jsc: 'jsc',
  jsshell: 'jsshell',
  nashorn: 'nashorn',
  node: 'node',
  qjs: 'qjs',
  remote: 'remote',
  safari: 'safari',
  sm: 'jsshell',
  spidermonkey: 'jsshell',
  v8: 'd8',
  xs: 'xs'
};

describe('Supported Hosts', () => {
  describe('Everything is accounted for', () => {
    it('Exports a Map and Array', async () => {
      let runs = 0;
      Object.entries(supportedHostsMap).forEach(([key, agent]) => {
        assert(hostMap[key] === agent);
        assert(hostList.includes(key));
        assert(eshost.supportedHosts.includes(key));
        runs++;
      });

      assert(runs === Object.keys(supportedHostsMap).length);
      assert(runs === Object.keys(hostMap).length);
      assert(runs === hostList.length);
    });
  });

  describe('Runtime Path Normalization', () => {
    it('Will map a host type to its corresponding runtime path.', async () => {
      let runs = 0;
      hostList.forEach(hostType => {
        assert(runtimePath.for(hostType));
        assert(fs.accessSync(runtimePath.for(hostType), fs.constants.R_OK) === undefined);
        runs++;
      });
      assert(runs === hostList.length);
    });
  });

  describe('VU Normalization', () => {
    it('Accepts VU style host type names', async () => {

      const supportedHosts = Object.keys(supportedHostsMap);

      supportedHosts.forEach(supportedHost => {
        assert(eshost.supportedHosts.includes(supportedHost));
        assert.strictEqual(eshost.normalizeHostForVU(supportedHost), supportedHostsMap[supportedHost]);
      });
    });
  });
});
