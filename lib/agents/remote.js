'use strict';

const WebDriverAgent = require('../WebdriverAgent');
const { WebDriver, Capabilities } = require('selenium-webdriver');
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
      throw new UnspeciedOptionError('webdriverServer');
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

    this.noKeepAlive = !!options.noKeepAlive;
  }

  evalScript(...args) {
    const firstOp = this.noKeepAlive ?
      Promise.resolve() : this._driver.getCurrentUrl();

    return firstOp
      .then(() => super.evalScript(...args));
  }

  _createDriver() {
    const url = this.hostPath;
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
