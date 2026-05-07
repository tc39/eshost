import KieselAgent from "../../lib/agents/kiesel.js";

const OUTPUT = `ok
`;
const ERROR = `Uncaught exception: Error: boom
  at fn foo
  at fn bar
  at fn baz
`;

describe("KieselAgent", () => {
  describe("normalizeResult", () => {
    it("works", () => {
      const agent = new KieselAgent();
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
      const agent = new KieselAgent();
      const parsed = agent.parseError(ERROR);

      expect(parsed).toEqual({
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
      });
    });
  });
});
