'use strict';

const fs = require('fs');
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
  'serenity-js': 'libjs',
  libjs: 'libjs',
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
        expect(hostMap[key] === agent).toBeTruthy();
        expect(hostList.includes(key)).toBeTruthy();
        expect(eshost.supportedHosts.includes(key)).toBeTruthy();
        runs++;
      });

      expect(runs === Object.keys(supportedHostsMap).length).toBeTruthy();
      expect(runs === Object.keys(hostMap).length).toBeTruthy();
      expect(runs === hostList.length).toBeTruthy();
    });
  });

  describe('Runtime Path Normalization', () => {
    it('Will map a host type to its corresponding runtime path.', async () => {
      let runs = 0;
      hostList.forEach(hostType => {
        expect(runtimePath.for(hostType)).toBeTruthy();
        expect(fs.accessSync(runtimePath.for(hostType), fs.constants.R_OK) === undefined).toBeTruthy();
        runs++;
      });
      expect(runs === hostList.length).toBeTruthy();
    });
  });

  describe('VU Normalization', () => {
    it('Accepts VU style host type names', async () => {

      const supportedHosts = Object.keys(supportedHostsMap);

      supportedHosts.forEach(supportedHost => {
        expect(eshost.supportedHosts.includes(supportedHost)).toBeTruthy();
        expect(eshost.normalizeHostForVU(supportedHost)).toBe(supportedHostsMap[supportedHost]);
      });
    });
  });
});
