import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const errorexp = /^(\w*Error)(?:: (.*))?$/m;

class QuantaAgent extends ConsoleAgent {
  static RUNTIME = fs.readFileSync(runtimePath.for("quanta"), "utf8");

  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== "--module") {
      this.args.unshift("--module");
    }

    if (!options.module && this.args[0] === "--module") {
      this.args.shift();
    }

    if (!this.args.includes("--test262")) {
      this.args.push("--test262");
    }

    return super.evalScript(code, options);
  }

  // quanta prints an uncaught exception to stdout, not stderr
  normalizeResult(result) {
    errorexp.lastIndex = 0;
    const match = errorexp.exec(result.stdout);

    if (match) {
      result.stdout = "";
      result.stderr = match[0];
    }

    return result;
  }

  parseError(str) {
    const match = str.match(errorexp);

    if (!match) {
      return null;
    }

    return {
      name: match[1],
      message: match[2] || "",
      stack: [],
    };
  }
}

export default QuantaAgent;
