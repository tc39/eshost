'use strict';
const path = require('path');
const { supportedHostsMap } = require('./supported-hosts');
const RUNTIMES_PATH = path.join(__dirname, '../runtimes');

const browsers = [
  'BrowserAgent',
  'chrome',
  'edge',
  'firefox',
  'remote',
  'safari',
];

exports.for = hostType => {
  if (browsers.includes(hostType)) {
    return path.join(RUNTIMES_PATH, 'browser.js');
  }

  return path.join(RUNTIMES_PATH, `${supportedHostsMap[hostType]}.js`);
};
