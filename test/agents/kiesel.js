import KieselAgent from "../../lib/agents/kiesel.js";

describe("KieselAgent", () => {
  describe("normalizeResult", () => {
    it("works", () => {
      const agent = new KieselAgent();
      const result = {
        stdout: `ok
Uncaught exception: Error: boom
  at fn foo
  at fn bar
  at fn baz
`,
        stderr: "",
        error: null,
      };

      const normalized = agent.normalizeResult(result);

      expect(normalized).toEqual({
        stdout: `ok
`,
        stderr: `Uncaught exception: Error: boom
  at fn foo
  at fn bar
  at fn baz
`,
        error: null,
      });
    });
  });

  describe("parseError", () => {
    it("works", () => {
      const agent = new KieselAgent();
      const parsed = agent.parseError(`Uncaught exception: Error: boom
  at fn foo
  at fn bar
  at fn baz
`);

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
