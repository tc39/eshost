"use strict";

const { ChildProcess } = require("child_process");
const Emitter = require("events");
const os = require("os");
const path = require("path");

let fs;

try {
  fs = require("fs/promises");
} catch (error) {
  fs = require("fs").promises;
}

const ConsoleAgent = require("../lib/ConsoleAgent");
const sinon = require("sinon");

describe("ConsoleAgent", () => {
  describe("ConsoleAgent({ hostArguments })", () => {
    it("accepts a single item string of hostArguments", async () => {
      const agent = new ConsoleAgent({
        hostPath: "../",
        hostArguments: "-a",
      });

      expect(agent).toMatchInlineSnapshot(`
        ConsoleAgent {
          "args": Array [
            "-a",
          ],
          "cpOptions": Object {},
          "hostPath": "../",
          "isStopped": false,
          "options": Object {
            "hostArguments": "-a",
            "hostPath": "../",
          },
          "out": "",
          "printCommand": "print",
          "shortName": "$262",
          "transform": [Function],
        }
      `);
    });

    it("a multiple item string of space delimited hostArguments", async () => {
      const agent = new ConsoleAgent({
        hostPath: "c:\\",
        hostArguments: "-a -b --c --dee",
      });
      expect(agent).toMatchInlineSnapshot(`
        ConsoleAgent {
          "args": Array [
            "-a",
            "-b",
            "--c",
            "--dee",
          ],
          "cpOptions": Object {},
          "hostPath": "c:\\\\",
          "isStopped": false,
          "options": Object {
            "hostArguments": "-a -b --c --dee",
            "hostPath": "c:\\\\",
          },
          "out": "",
          "printCommand": "print",
          "shortName": "$262",
          "transform": [Function],
        }
      `);
    });

    it("accepts a single item array of hostArguments", async () => {
      const agent = new ConsoleAgent({
        hostPath: "../",
        hostArguments: ["-a"],
      });
      expect(agent).toMatchInlineSnapshot(`
        ConsoleAgent {
          "args": Array [
            "-a",
          ],
          "cpOptions": Object {},
          "hostPath": "../",
          "isStopped": false,
          "options": Object {
            "hostArguments": Array [
              "-a",
            ],
            "hostPath": "../",
          },
          "out": "",
          "printCommand": "print",
          "shortName": "$262",
          "transform": [Function],
        }
      `);
    });

    it("a multiple item array of hostArguments", async () => {
      const agent = new ConsoleAgent({
        hostPath: "c:\\",
        hostArguments: ["-a", "-b", "--c", "--dee"],
      });
      expect(agent).toMatchInlineSnapshot(`
        ConsoleAgent {
          "args": Array [
            "-a",
            "-b",
            "--c",
            "--dee",
          ],
          "cpOptions": Object {},
          "hostPath": "c:\\\\",
          "isStopped": false,
          "options": Object {
            "hostArguments": Array [
              "-a",
              "-b",
              "--c",
              "--dee",
            ],
            "hostPath": "c:\\\\",
          },
          "out": "",
          "printCommand": "print",
          "shortName": "$262",
          "transform": [Function],
        }
      `);
    });

    it("is forgiving of excessive spaces in hostArguments", async () => {
      const agent = new ConsoleAgent({
        hostPath: "/do/wa/diddy/",
        hostArguments: "-a     -b --c \t --dee",
      });
      expect(agent).toMatchInlineSnapshot(`
        ConsoleAgent {
          "args": Array [
            "-a",
            "-b",
            "--c",
            "--dee",
          ],
          "cpOptions": Object {},
          "hostPath": "/do/wa/diddy/",
          "isStopped": false,
          "options": Object {
            "hostArguments": "-a     -b --c 	 --dee",
            "hostPath": "/do/wa/diddy/",
          },
          "out": "",
          "printCommand": "print",
          "shortName": "$262",
          "transform": [Function],
        }
      `);
    });
  });

  describe("ConsoleAgent({ out })", () => {
    let sandbox;
    let ccp;
    let child;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();
      child = new ChildProcess();

      child.stdout = new Emitter();
      child.stderr = new Emitter();

      ccp = sandbox
        .stub(ConsoleAgent.prototype, "createChildProcess")
        .returns(Promise.resolve(child));
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('accepts an option "out" for a user provided output directory', async () => {
      const out = os.tmpdir();
      const agent = new ConsoleAgent({
        out,
      });
      expect(agent.out).toBe(out);
    });

    it('makes temp files in the "out" directory', async () => {
      const out = os.tmpdir();
      const agent = new ConsoleAgent({
        out,
      });
      await new Promise((resolve) => {
        agent.evalScript("", {});
        setTimeout(() => {
          child.emit("close");
          resolve();
        }, 100);
      });
      expect(path.dirname(ccp.lastCall.args[0][0])).toBe(out);
    });
  });

  describe("ConsoleAgent.prototype.compile", () => {
    it("Consumes this.constructor.runtime", async () => {
      const agent = new ConsoleAgent();

      let program = "var a = 1;";
      let async = true;
      let compiled = agent.compile(program, { async });

      expect(compiled).toMatchInlineSnapshot(
        `" const name = 'ConsoleAgent';var a = 1;"`
      );
    });
    it("Removes all linebreaks from runtime code", async () => {
      const runtime = ConsoleAgent.runtime;
      const a = new ConsoleAgent();

      return Promise.resolve(a).then(function (agent) {
        ConsoleAgent.runtime = `


        `;
        let program = "";
        let async = true;
        let compiled = agent.compile(program, { async });

        expect(compiled).toMatchInlineSnapshot(`" "`);

        ConsoleAgent.runtime = runtime;
      });
    });

    it("Safely replaces all $262 in runtime code", async () => {
      const runtime = ConsoleAgent.runtime;
      const agent = new ConsoleAgent({
        shortName: "Mine",
      });

      ConsoleAgent.runtime = `
        /* $262 is special */
        var $262 = { m() { $262.something("1") } };
        // But not very special.
      `;
      let program = `
      Mine.m();
      `;
      let async = true;
      let compiled = agent.compile(program, { async });

      expect(compiled).toMatchInlineSnapshot(`
        "
               var Mine = { m() { Mine.something(\\"1\\") } }; Mine.m();
              "
      `);

      ConsoleAgent.runtime = runtime;
    });
  });

  describe("ConsoleAgent.prototype.evalScript", () => {
    let sandbox;
    let compile;
    let child;

    const defaultTestRecord = {
      file:
        "test/fixtures/fake-test262/test/language/comments/hashbang/escaped-hashbang.js",
      contents:
        '\u0023\u0021\n\nthrow "Test262: This statement should not be evaluated.";\n',
      attrs: {
        description:
          "Hashbang comments should not be allowed to have encoded characters\n",
        info: "HashbangComment::\n  #! SingleLineCommentChars[opt]\n",
        flags: { raw: true },
        negative: { phase: "parse", type: "SyntaxError" },
        features: ["hashbang"],
        includes: [],
      },
      copyright: "",
      relative: "language/comments/hashbang/escaped-hashbang.js",
    };

    beforeEach(async () => {
      sandbox = sinon.createSandbox();
      child = new ChildProcess();

      child.stdout = new Emitter();
      child.stderr = new Emitter();

      compile = sandbox
        .stub(ConsoleAgent.prototype, "compile")
        .callsFake((code) => code);
      sandbox
        .stub(ConsoleAgent.prototype, "createChildProcess")
        .returns(Promise.resolve(child));

      sandbox.stub(fs, "writeFile").returns(Promise.resolve(child));
      sandbox.stub(fs, "stat").returns(true);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("Does not call agent.compile() when attrs.flags.raw === true", async () => {
      const agent = new ConsoleAgent();

      agent.evalScript(defaultTestRecord, {});

      child.emit("close");

      expect(compile.callCount).toBe(0);
    });

    it("Does call agent.compile() when attrs.flags.raw !== true", async () => {
      const agent = new ConsoleAgent();

      let record = {
        ...defaultTestRecord,
        attrs: {
          flags: {
            raw: false,
          },
        },
      };

      agent.evalScript(record, {});

      child.emit("close");

      expect(compile.callCount).toBe(1);
    });
  });
});
