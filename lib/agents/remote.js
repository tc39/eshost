'use strict';

const WebDriverAgent = require('../WebdriverAgent');
const { WebDriver } = require('selenium-webdriver');
const swhttp = require('selenium-webdriver/http');

class UnspecifiedOptionError extends Error {
  constructor(...args) {
    const name = args[0];

    super(...args);

    this.message = `RemoteAgent: '${name}' is required but was not specified.`;
  }
}

class RemoteAgent extends WebDriverAgent {
  constructor(options = {}) {
    super(options);

    if (typeof options.webdriverServer !== 'string') {
      throw new UnspecifiedOptionError('webdriverServer');
    }
    this.webdriverServer = options.webdriverServer;

    if (!options.capabilities) {
      throw new UnspecifiedOptionError('capabilities');
    }
    if (typeof options.capabilities.browserName !== 'string') {
      throw new UnspecifiedOptionError('capabilities.browserName');
    }
    if (typeof options.capabilities.platform !== 'string') {
      throw new UnspecifiedOptionError('capabilities.platform');
    }
    if (typeof options.capabilities.version !== 'string') {
      throw new UnspecifiedOptionError('capabilities.version');
    }
    this.capabilities = Object.assign({}, options.capabilities);

    if (typeof options.hostPath === 'string') {
      throw new UnspecifiedOptionError('hostPath');
    }
  }

  _createDriver() {
    const client = Promise.resolve(new swhttp.HttpClient(this.webdriverServer));
    const executor = new swhttp.Executor(client);
    const expandedCaps = {
      desired: this.capabilities,
      required: this.capabilities
    };

    return WebDriver.createSession(executor, expandedCaps);
  }
}

module.exports = RemoteAgent;
