import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const errorRe = /^(.*?):(\d+):(\d+)(?: (\w+):)? (.*)$/m;

class NashornAgent extends ConsoleAgent {
  static RUNTIME = fs.readFileSync(runtimePath.for("nashorn"), "utf8");

  async evalScript(code, options = {}) {
    if (!this.args.includes("--language=es6")) {
      this.args.unshift("--language=es6");
    }
    return super.evalScript(code, options);
  }

  parseError(str) {
    const error = {};
    const match = str.match(errorRe);

    if (!match) {
      return null;
    }

    error.name = match[4] || "SyntaxError";
    error.message = match[5];

    error.stack = [
      {
        source: match[0],
        fileName: match[1],
        lineNumber: match[2],
        columnNumber: match[3],
      },
    ];

    return error;
  }
}

export default NashornAgent;
