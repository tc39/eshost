"use strict";

const fs = require("fs");
const runtimePath = require("../runtime-path");
const ConsoleAgent = require("../ConsoleAgent");

const errorRe = /^Uncaught exception: (.+?)(?:: (.+))?$/m;

class KieselAgent extends ConsoleAgent {
  static RUNTIME = fs.readFileSync(runtimePath.for("kiesel"), "utf8");

  constructor(options) {
    super(options);

    this.args.unshift("--print-promise-rejection-warnings=no");
  }

  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== "--module") {
      this.args.unshift("--module");
    }

    if (!options.module && this.args[0] === "--module") {
      this.args.shift();
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    const match = str.match(errorRe);

    if (!match) {
      return null;
    }

    const name = match[1] ? match[1].trim() : "";
    const message = match[2] ? match[2].trim() : "";

    return {
      name,
      message,
      stack: [],
    };
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, "");
      result.stderr = match[0];
    }

    return result;
  }
}

module.exports = KieselAgent;
