'use strict';

const BrowserAgent = require('./agents/BrowserAgent.js');
const Server = require('./Server.js');

class WebdriverAgent extends BrowserAgent {
  setBinaryPath(path) {
    throw new Error('Cannot call abstract method setBinaryPath');
  }

  setCapabilities(options) { /* default no-op */ }

  initialize() {
    return super.initialize()
    .then(() => {
      const Options = this.getOptions();
      const Driver = this.getDriver();

      const options = new Options();

      if (this.hostPath) {
        this.setBinaryPath(options, this.hostPath);
      }

      const caps = options.toCapabilities();

      this.setCapabilities(caps);

      this._driver = new Driver(caps);

      return this._driver.get(this._url);
    })
    .then(_ => {
      return Server.waitForClientId(this.id);
    })
    .then(_ => {
      return this;
    })
    .catch(err => {
      this.destroy();
      throw err;
    });
  }

  destroy() {
    return super.destroy().then(() => this._driver.quit());
  }
}


module.exports = WebdriverAgent;
