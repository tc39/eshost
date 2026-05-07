import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const ERROR_REGEXP = /^Uncaught Error: (?<name>.+?)(?:: (?<message>.+?))?(?: \(.+:\d+:\d+\))?$/m;
const SYNTAX_ERROR_REGEXP =
  /^Error:\r?\n\s*0:\s*(?<name>[^:\r\n]+): (?<message>[^\r\n]*?)(?: at line (?<lineNumber>\d+), column (?<columnNumber>\d+).*)?$/m;
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
    const syntaxErrorMatch = SYNTAX_ERROR_REGEXP.exec(str);
    if (syntaxErrorMatch) {
      const { name, message, lineNumber, columnNumber } = syntaxErrorMatch.groups;
      const stack = [];
      if (lineNumber && columnNumber) {
        stack.push({
          lineNumber: Number(lineNumber),
          columnNumber: Number(columnNumber),
        });
      }

      return {
        name,
        message,
        stack,
      };
    }

    const errorMatch = ERROR_REGEXP.exec(str);
    if (errorMatch) {
      const { name, message = "" } = errorMatch.groups;
      const stack = [];
      const lines = str.slice(errorMatch.index + errorMatch[0].length).split(/\r?\n/g);
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

    return null;
  }

  normalizeResult(result) {
    const stdout = result.stdout;
    const match = SYNTAX_ERROR_REGEXP.exec(stdout) || ERROR_REGEXP.exec(stdout);
    if (match) {
      const { index } = match;
      result.stdout = stdout.slice(0, index);
      result.stderr = stdout.slice(index);
    }

    return result;
  }
}

export default BoaAgent;
