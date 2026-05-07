import edge from "selenium-webdriver/edge";

import { WebdriverAgent } from "../WebdriverAgent.js";

class EdgeAgent extends WebdriverAgent {
  getDriver() {
    return edge.Driver;
  }

  getOptions() {
    return edge.Options;
  }

  setBinaryPath() {
    throw new Error("Cannot set binary path for edge driver");
  }
}

export default EdgeAgent;
