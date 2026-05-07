import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const ERROR_REGEXP = /^Uncaught Error: (?<name>.+?)(?:: (?<message>.+?))?(?: \(.+:\d+:\d+\))?$/m;
const STACK_FRAME_REGEXP =
  /^ {4}at (?<functionName>.+) \((?<fileName>.+):(?<lineNumber>\d+):(?<columnNumber>\d+)\)$/;

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

  parseError(str) {
    const errorMatch = str.match(ERROR_REGEXP);
    if (!errorMatch) {
      return null;
    }

    const { name, message = "" } = errorMatch.groups;
    const stack = [];

    const lines = str.slice(errorMatch[0].length).split(/\r?\n/g);
    for (const line of lines) {
      const stackFrameMatch = line.match(STACK_FRAME_REGEXP);
      if (stackFrameMatch) {
        const { functionName, fileName, lineNumber, columnNumber } = stackFrameMatch.groups;
        stack.push({
          source: line,
          functionName,
          fileName,
          lineNumber: Number(lineNumber),
          columnNumber: Number(columnNumber),
        });
      }
    }

    return {
      name,
      message,
      stack,
    };
  }

  normalizeResult(result) {
    const errorMatch = ERROR_REGEXP.exec(result.stdout);
    if (errorMatch) {
      const { index } = errorMatch;
      const stdout = result.stdout;
      result.stdout = stdout.slice(0, index);
      result.stderr = stdout.slice(index);
    }
    return result;
  }
}

export default BoaAgent;
