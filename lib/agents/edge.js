'use strict';

const WebdriverAgent = require('../WebdriverAgent.js');
const edge = require('selenium-webdriver/edge')

class EdgeAgent extends WebdriverAgent {
  getDriver() {
    return edge.Driver;
  }

  getOptions() {
    return edge.Options;
  }

  setBinaryPath() {
    throw new Error('Cannot set binary path for edge driver');
  }
}

module.exports = EdgeAgent;

