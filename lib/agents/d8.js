import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";
import { parseStack } from "../parse-error.js";

const experimentalNotice =
  "V8 is running with experimental features enabled. Stability and security will suffer.\n";
const errorRe = /(.*?):(\d+): (([\w\d]+)(?:: (.*))?)[\w\W]*(\3((:?\s+at.*\r?\n)*)(\r?\n)+)?$/;

class D8Agent extends ConsoleAgent {
  static RUNTIME = fs.readFileSync(runtimePath.for("d8"), "utf8");

  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== "--module") {
      this.args.unshift("--module");
    }

    if (!options.module && this.args[0] === "--module") {
      this.args.shift();
    }

    if (!this.args.includes("--expose-gc")) {
      this.args.push("--expose-gc");
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    const match = str.match(errorRe);
    if (!match) {
      return null;
    }
    const stackStr = match[6] || "";

    let stack;
    if (stackStr.trim().length > 0) {
      stack = parseStack(stackStr);
    } else {
      stack = [
        {
          source: match[0],
          fileName: match[1],
          lineNumber: match[2],
        },
      ];
    }

    return {
      name: match[4],
      message: match[5],
      stack: stack,
    };
  }

  normalizeResult(result) {
    if (result.stderr.startsWith(experimentalNotice)) {
      result.stderr = result.stderr.slice(experimentalNotice.length);
    }

    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, "");
      result.stderr = match[0];
    }

    return result;
  }
}

export default D8Agent;
