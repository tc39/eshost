'use strict';

const WebDriverAgent = require('../WebdriverAgent');
const { WebDriver, Capabilities } = require('selenium-webdriver');
const _http = require('selenium-webdriver/http');

class RemoteAgent extends WebDriverAgent {
  constructor(options) {
    super(options);

    if (!options || typeof options.webdriverServer !== 'string') {
      throw new Error('RemoteAgent: \'webdriverServer\' is required but was ' +
        'not specified.');
    }
    this.webdriverServer = options.webdriverServer;

    if (!options.capabilities) {
      throw new Error('RemoteAgent: \'capabilities\' is required but was ' +
        'not specified.');
    }
    if (typeof options.capabilities.browserName !== 'string') {
      throw new Error('RemoteAgent: \'capabilities.browserName\' is ' +
        'required but was not specified.');
    }
    if (typeof options.capabilities.platform !== 'string') {
      throw new Error('RemoteAgent: \'capabilities.platform\' is ' +
        'required but was not specified.');
    }
    if (typeof options.capabilities.version !== 'string') {
      throw new Error('RemoteAgent: \'capabilities.version\' is ' +
        'required but was not specified.');
    }
    this.capabilities = Object.assign({}, options.capabilities);

    if (typeof options.hostPath === 'string') {
      throw new Error('RemoteAgent: \'hostPath\' specified.');
    }
  }

  _createDriver() {
    const url = this.hostPath;
    const client = Promise.resolve(new _http.HttpClient(this.webdriverServer));
    const executor = new _http.Executor(client);
    const expandedCaps = {
      desired: this.capabilities,
      required: this.capabilities
    };

    return WebDriver.createSession(executor, expandedCaps);
  }
}

module.exports = RemoteAgent;
