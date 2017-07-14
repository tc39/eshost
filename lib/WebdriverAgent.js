'use strict';

const BrowserAgent = require('./agents/BrowserAgent.js');
const Server = require('./Server.js');
const Key = require('selenium-webdriver').Key;

class WebdriverAgent extends BrowserAgent {
  setBinaryPath(path) {
    throw new Error('Cannot call abstract method setBinaryPath');
  }

  setCapabilities(options) { /* default no-op */ }

  initialize() {
    return super.initialize()
    .then(_ => {
      this._driver = this._createDriver()
      return this._driver.get(this._url);
    })
    .then(_ => Server.waitForClientId(this.id))
    .then(_ => this)
    .catch(err => {
      this.destroy();
      throw err;
    });
  }

  _createDriver() {
    const Options = this.getOptions();
    const Driver = this.getDriver();

    const options = new Options();

    if (this.hostPath) {
      this.setBinaryPath(options, this.hostPath);
    }

    const caps = options.toCapabilities();

    this.setCapabilities(caps);

    return Driver.createSession(caps);
  }

  stop() {
    const newDriver = this._createDriver();
    const quitP = this._driver.quit();
    this._driver = newDriver;
    const getP = newDriver.get(this._url);
    Server.clientIdStopped(this.id);
    this._restartP = Promise.all([quitP, getP]);
    return this._restartP.then(_ => {
      this._restartP = null;
      return undefined;
    });
  }

  destroy() {
    let baseP = Promise.resolve();
    if (this._restartP) {
      // selenium doesn't like to exit properly if you try to kill while it's doing something
      // so, let's wait.
      baseP = this._restartP;
    }

    return baseP.then(_ => this._driver.quit()).then(_ => super.destroy());
  }
}


module.exports = WebdriverAgent;
