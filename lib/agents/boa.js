import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const errorRe = /^Uncaught Error:.*$/m;

class BoaAgent extends ConsoleAgent {
  static RUNTIME = fs.readFileSync(runtimePath.for("boa"), "utf8");

  constructor(options) {
    super(options);

    this.args.unshift("--debug-object");
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

  parseError() {
    // TODO: Implement this, boa's error output is a bit complicated to parse.
    return null;
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, "");
      result.stderr = match[0];
    }

    if (result.stdout === "undefined\n") {
      result.stdout = "";
    }

    return result;
  }
}

export default BoaAgent;
