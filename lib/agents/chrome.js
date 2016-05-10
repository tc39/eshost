'use strict';

const WebdriverAgent = require('../WebdriverAgent.js');
const chrome = require('selenium-webdriver/chrome')

class ChromeAgent extends WebdriverAgent {
  getDriver() {
    return chrome.Driver;
  }

  getOptions() {
    return chrome.Options;
  }

  setBinaryPath(options, path) {
    options.setChromeBinaryPath(path);
  }
}

module.exports = ChromeAgent;
