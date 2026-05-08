import JSShellAgent from "../../lib/agents/jsshell.js";

const OUTPUT = `ok
`;

/*
foo(); @
*/
const SYNTAX_ERROR = `/path/to/file.js:1:8 SyntaxError: illegal character U+0040:
/path/to/file.js:1:8 foo(); @
/path/to/file.js:1:8 .......^
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
const RUNTIME_ERROR = `/path/to/file.js:2:11 Error: boom
Stack:
  foo@/path/to/file.js:2:11
  bar@/path/to/file.js:5:5
  baz@/path/to/file.js:8:5
  @/path/to/file.js:10:1
`;

const RUNTIME_ERROR_EMPTY_MESSAGE = `/path/to/file.js:1:1 Error: 
`;

const RUNTIME_ERROR_CUSTOM = `/path/to/file.js:1:1 uncaught exception: CustomError: boom
`;

const RUNTIME_ERROR_CUSTOM_EMPTY_MESSAGE = `/path/to/file.js:1:1 uncaught exception: CustomError
`;

describe("JSShellAgent", () => {
  describe("normalizeResult", () => {
    it.each([
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
      const agent = new JSShellAgent();
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
          message: "illegal character U+0040",
          stack: [
            {
              fileName: "/path/to/file.js",
              lineNumber: 1,
              columnNumber: 8,
            },
          ],
        },
      },
      {
        error: RUNTIME_ERROR,
        expected: {
          name: "Error",
          message: "boom",
          stack: [
            {
              source: "  foo@/path/to/file.js:2:11",
              fileName: "/path/to/file.js",
              functionName: "foo",
              lineNumber: 2,
              columnNumber: 11,
            },
            {
              source: "  bar@/path/to/file.js:5:5",
              fileName: "/path/to/file.js",
              functionName: "bar",
              lineNumber: 5,
              columnNumber: 5,
            },
            {
              source: "  baz@/path/to/file.js:8:5",
              fileName: "/path/to/file.js",
              functionName: "baz",
              lineNumber: 8,
              columnNumber: 5,
            },
            {
              source: "  @/path/to/file.js:10:1",
              fileName: "/path/to/file.js",
              functionName: "",
              lineNumber: 10,
              columnNumber: 1,
            },
          ],
        },
      },
      {
        error: RUNTIME_ERROR_EMPTY_MESSAGE,
        expected: {
          name: "Error",
          message: "",
          stack: [
            {
              fileName: "/path/to/file.js",
              lineNumber: 1,
              columnNumber: 1,
            },
          ],
        },
      },
      {
        error: RUNTIME_ERROR_CUSTOM,
        expected: {
          name: "CustomError",
          message: "boom",
          stack: [
            {
              fileName: "/path/to/file.js",
              lineNumber: 1,
              columnNumber: 1,
            },
          ],
        },
      },
      {
        error: RUNTIME_ERROR_CUSTOM_EMPTY_MESSAGE,
        expected: {
          name: "CustomError",
          message: "",
          stack: [
            {
              fileName: "/path/to/file.js",
              lineNumber: 1,
              columnNumber: 1,
            },
          ],
        },
      },
    ])("case %#", ({ error, expected }) => {
      const agent = new JSShellAgent();
      const parsed = agent.parseError(error);
      expect(parsed).toEqual(expected);
    });
  });
});
