'use strict';

const WebdriverAgent = require('../WebdriverAgent.js');
const firefox = require('selenium-webdriver/firefox')
const Capabilities = require('selenium-webdriver/lib/capabilities')

class FirefoxAgent extends WebdriverAgent {
  setCapabilities(options) {
    options.set('marionette', true);
  }

  getDriver() {
    return firefox.Driver;
  }

  getOptions() {
    return firefox.Options;
  }

  setBinaryPath(options, path) {
    options.setBinary(path);
  }
}


module.exports = FirefoxAgent;
