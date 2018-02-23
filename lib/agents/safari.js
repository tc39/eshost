'use strict';

const WebdriverAgent = require('../WebdriverAgent.js');
const safari = require('selenium-webdriver/safari')

class SafariAgent extends WebdriverAgent {
  getDriver() {
    return safari.Driver;
  }

  getOptions() {
    return safari.Options;
  }

  setBinaryPath() {
    throw new Error("Safari agent does not support custom binary paths");
  }
}


module.exports = SafariAgent;
