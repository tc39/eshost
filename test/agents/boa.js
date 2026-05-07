import BoaAgent from "../../lib/agents/boa.js";

const OUTPUT = `ok
`;

/*
foo(); @
*/
// TODO: Update when https://github.com/boa-dev/boa/issues/5357 is fixed
const SYNTAX_ERROR = `Error:
  0: SyntaxError: unexpected '@' at line 1, column 8 at line 1, col 8
`;

/*
function foo() {
*/
const SYNTAX_ERROR_ALT = `Error:
   0: SyntaxError: abrupt end
`;

/*
function foo() {
    throw new Error("boom");
}
function bar() {
    foo();
}
function baz() {
    bar();
}
baz();
*/
const RUNTIME_ERROR = `Uncaught Error: Error: boom (/path/to/file.js:10:4)
    at foo (/path/to/file.js:2:11)
    at bar (/path/to/file.js:5:8)
    at baz (/path/to/file.js:8:8)
    at <main> (/path/to/file.js:10:4)
`;

describe("BoaAgent", () => {
  describe("normalizeResult", () => {
    it.each([
      {
        result: {
          stdout: `${OUTPUT}${SYNTAX_ERROR_ALT}`,
          stderr: "",
          error: null,
        },
        expected: {
          stdout: OUTPUT,
          stderr: SYNTAX_ERROR_ALT,
          error: null,
        },
      },
      {
        result: {
          stdout: `${OUTPUT}${SYNTAX_ERROR}`,
          stderr: "",
          error: null,
        },
        expected: {
          stdout: OUTPUT,
          stderr: SYNTAX_ERROR,
          error: null,
        },
      },
      {
        result: {
          stdout: `${OUTPUT}${RUNTIME_ERROR}`,
          stderr: "",
          error: null,
        },
        expected: {
          stdout: OUTPUT,
          stderr: RUNTIME_ERROR,
          error: null,
        },
      },
    ])("case %#", ({ result, expected }) => {
      const agent = new BoaAgent();
      const normalized = agent.normalizeResult(result);
      expect(normalized).toEqual(expected);
    });
  });

  describe("parseError", () => {
    it.each([
      {
        error: SYNTAX_ERROR,
        expected: {
          name: "SyntaxError",
          message: "unexpected '@'",
          stack: [
            {
              lineNumber: 1,
              columnNumber: 8,
            },
          ],
        },
      },
      {
        error: SYNTAX_ERROR_ALT,
        expected: {
          name: "SyntaxError",
          message: "abrupt end",
          stack: [],
        },
      },
      {
        error: RUNTIME_ERROR,
        expected: {
          name: "Error",
          message: "boom",
          stack: [
            {
              source: "    at foo (/path/to/file.js:2:11)",
              functionName: "foo",
              fileName: "/path/to/file.js",
              lineNumber: 2,
              columnNumber: 11,
            },
            {
              source: "    at bar (/path/to/file.js:5:8)",
              functionName: "bar",
              fileName: "/path/to/file.js",
              lineNumber: 5,
              columnNumber: 8,
            },
            {
              source: "    at baz (/path/to/file.js:8:8)",
              functionName: "baz",
              fileName: "/path/to/file.js",
              lineNumber: 8,
              columnNumber: 8,
            },
            {
              source: "    at <main> (/path/to/file.js:10:4)",
              functionName: "<main>",
              fileName: "/path/to/file.js",
              lineNumber: 10,
              columnNumber: 4,
            },
          ],
        },
      },
    ])("case %#", ({ error, expected }) => {
      const agent = new BoaAgent();
      const parsed = agent.parseError(error);
      expect(parsed).toEqual(expected);
    });
  });
});
