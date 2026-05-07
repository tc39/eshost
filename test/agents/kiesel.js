import KieselAgent from "../../lib/agents/kiesel.js";

const OUTPUT = `ok
`;

/*
foo(); @
*/
const SYNTAX_ERROR = `foo(); @
       ^
Uncaught exception: SyntaxError: Invalid character '@' (/path/to/file.js:1:8)
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
const RUNTIME_ERROR = `Uncaught exception: Error: boom
  at fn foo
  at fn bar
  at fn baz
`;

describe("KieselAgent", () => {
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
      const agent = new KieselAgent();
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
          message: "Invalid character '@'",
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
              source: "  at fn foo",
              functionName: "foo",
            },
            {
              source: "  at fn bar",
              functionName: "bar",
            },
            {
              source: "  at fn baz",
              functionName: "baz",
            },
          ],
        },
      },
    ])("case %#", ({ error, expected }) => {
      const agent = new KieselAgent();
      const parsed = agent.parseError(error);
      expect(parsed).toEqual(expected);
    });
  });
});
