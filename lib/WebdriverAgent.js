'use strict';

const BrowserAgent = require('./agents/BrowserAgent.js');
const Server = require('./Server.js');

class WebdriverAgent extends BrowserAgent {
  setBinaryPath() {
    throw new Error('Cannot call abstract method setBinaryPath');
  }

  setCapabilities() { /* default no-op */ }

  initialize() {
    return super.initialize()
    .then(() => {
      this._driver = this._createDriver()
      return this._driver.get(this._url);
    })
    .then(() => Server.waitForClientId(this.id))
    .then(() => this)
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

    this.setCapabilities(options);

    return Driver.createSession(options);
  }

  stop() {
    const newDriver = this._createDriver();
    const quitP = this._driver.quit();
    this._driver = newDriver;
    const getP = newDriver.get(this._url);
    Server.clientIdStopped(this.id);
    this._restartP = super.stop()
      .then(() => Promise.all([quitP, getP]));
    return this._restartP.then(() => {
      this._restartP = null;
      return true;
    });
  }

  async destroy() {
    let baseP = Promise.resolve();
    if (this._restartP) {
      // selenium doesn't like to exit properly if you try to kill while it's doing something
      // so, let's wait.
      baseP = this._restartP;
    }
    await baseP;
    await this._driver.quit();
    await this._driver.quit();
    return super.destroy();
  }
}


module.exports = WebdriverAgent;
