import chrome from "selenium-webdriver/chrome";

import { WebdriverAgent } from "../WebdriverAgent.js";

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

export default ChromeAgent;
