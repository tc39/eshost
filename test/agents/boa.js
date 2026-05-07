import BoaAgent from "../../lib/agents/boa.js";

const OUTPUT = `ok
`;
const ERROR = `Uncaught Error: Error: boom (/path/to/file.js:10:4)
    at foo (/path/to/file.js:2:11)
    at bar (/path/to/file.js:5:8)
    at baz (/path/to/file.js:8:8)
    at <main> (/path/to/file.js:10:4)
`;

describe("BoaAgent", () => {
  describe("normalizeResult", () => {
    it("works", () => {
      const agent = new BoaAgent();
      const result = {
        stdout: `${OUTPUT}${ERROR}`,
        stderr: "",
        error: null,
      };

      const normalized = agent.normalizeResult(result);

      expect(normalized).toEqual({
        stdout: OUTPUT,
        stderr: ERROR,
        error: null,
      });
    });
  });

  describe("parseError", () => {
    it("works", () => {
      const agent = new BoaAgent();
      const parsed = agent.parseError(ERROR);

      expect(parsed).toEqual({
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
      });
    });
  });
});
