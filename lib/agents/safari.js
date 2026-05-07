import safari from "selenium-webdriver/safari";

import { WebdriverAgent } from "../WebdriverAgent.js";

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

export default SafariAgent;
