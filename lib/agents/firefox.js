import firefox from "selenium-webdriver/firefox";

import { WebdriverAgent } from "../WebdriverAgent.js";

class FirefoxAgent extends WebdriverAgent {
  setCapabilities(options) {
    options.set("marionette", true);
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

export default FirefoxAgent;
