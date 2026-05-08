import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const ERROR_REGEXP =
  /^(?<fileName>.+?):(?<lineNumber>\d+):(?<columnNumber>\d+) (?<name>(?!uncaught ).+?): (?<message>[^\r\n]*?)(?::)?$/m;
const CUSTOM_ERROR_REGEXP =
  /^(?<fileName>.+?):(?<lineNumber>\d+):(?<columnNumber>\d+) uncaught exception: (?<name>.*?)(?:: (?<message>[^\r\n]*))?$/m;
const STACK_FRAME_REGEXP =
  /^\s*(?<functionName>.*?)@(?<fileName>.+?):(?<lineNumber>\d+):(?<columnNumber>\d+)$/;

class SpiderMonkeyAgent extends ConsoleAgent {
  static RUNTIME = fs.readFileSync(runtimePath.for("spidermonkey"), "utf8");

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
    const errorMatch = ERROR_REGEXP.exec(str) ?? CUSTOM_ERROR_REGEXP.exec(str);
    if (!errorMatch) {
      return null;
    }

    const { fileName, lineNumber, columnNumber, name, message = "" } = errorMatch.groups;
    const stack = [];
    const [header, ...lines] = str
      .slice(errorMatch.index + errorMatch[0].length)
      .trimStart()
      .split(/\r?\n/g);

    if (header === "Stack:") {
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
    }

    if (stack.length === 0) {
      stack.push({
        fileName,
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

  normalizeResult(result) {
    const stdout = result.stdout;
    const match = ERROR_REGEXP.exec(stdout) ?? CUSTOM_ERROR_REGEXP.exec(stdout);
    if (match) {
      const { index } = match;
      result.stdout = stdout.slice(0, index);
      result.stderr = stdout.slice(index);
    }

    return result;
  }
}

export default SpiderMonkeyAgent;
