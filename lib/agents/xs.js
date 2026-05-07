import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const errorRe = /^(\w+):? ?(.*)$/m;

class XSAgent extends ConsoleAgent {
  static RUNTIME = fs.readFileSync(runtimePath.for("xs"), "utf8");

  async evalScript(code, options = {}) {
    this.args[0] = "-s";

    if (options.module && this.args[0] !== "-m") {
      this.args[0] = "-m";
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    let match = str.match(errorRe);
    if (match) {
      return {
        name: match[1],
        message: match[2],
        stack: [],
      };
    }
    return null;
  }
}

export default XSAgent;
