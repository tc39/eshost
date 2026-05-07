import fs from "node:fs";

import * as runtimePath from "../runtime-path.js";
import { ConsoleAgent } from "../ConsoleAgent.js";

const ERROR_REGEXP = /^Uncaught exception: (?<name>.+?)(?:: (?<message>.+))?$/m;
const SYNTAX_ERROR_REGEXP =
  /^(?<sourceLine>[^\r\n]+)\r?\n(?<hintLine> *\^)\r?\nUncaught exception: (?<name>SyntaxError): (?<message>.+?) \((?<fileName>.+):(?<lineNumber>\d+):(?<columnNumber>\d+)\)$/m;
const STACK_FRAME_REGEXP = /^ {2}at fn (?<functionName>.+)$/;

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
    const syntaxErrorMatch = SYNTAX_ERROR_REGEXP.exec(str);
    if (syntaxErrorMatch) {
      const { name, message, fileName, lineNumber, columnNumber } = syntaxErrorMatch.groups;
      const stack = [
        {
          fileName,
          lineNumber: Number(lineNumber),
          columnNumber: Number(columnNumber),
        },
      ];
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
          const { functionName } = stackFrameMatch.groups;
          stack.push({
            source: line,
            functionName,
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
    const match = SYNTAX_ERROR_REGEXP.exec(stdout) ?? ERROR_REGEXP.exec(stdout);
    if (match) {
      const { index } = match;
      result.stdout = stdout.slice(0, index);
      result.stderr = stdout.slice(index);
    }
    return result;
  }
}

export default KieselAgent;
