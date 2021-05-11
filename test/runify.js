"use strict";

const eshost = require("../");
const { stripIndent } = require("common-tags");
const hasbin = require("hasbin");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Test262Stream = require("test262-stream");

const isWindows =
  process.platform === "win32" ||
  process.env.OSTYPE === "cygwin" ||
  process.env.OSTYPE === "msys";

const capabilities = {
  browserName: process.env.ESHOST_REMOTE_BROWSERNAME || "firefox",
  platform: process.env.ESHOST_REMOTE_PLATFORM || "ANY",
  version: process.env.ESHOST_REMOTE_VERSION || "",
};

const webdriverServer = "http://localhost:4444/wd/hub";

const makeHostPath = (binName) => {
  return path.join(os.homedir(), ".esvu/bin", binName);
};

const hosts = [
  ["ch", { hostPath: makeHostPath("chakra") }],
  ["d8", { hostPath: makeHostPath("v8") }],
  ["engine262", { hostPath: makeHostPath("engine262") }],
  ["graaljs", { hostPath: makeHostPath("graaljs") }],
  ["hermes", { hostPath: makeHostPath("hermes") }],
  ["jsshell", { hostPath: makeHostPath("sm") }],
  ["jsc", { hostPath: makeHostPath("jsc") }],
  ["node", { hostPath: "node" }], // Not provided by esvu
  ["qjs", { hostPath: makeHostPath("quickjs-run-test262") }],
  ["xs", { hostPath: makeHostPath("xs") }],
];

const hostsOnWindows = [
  ["ch", { hostPath: makeHostPath("chakra.exe") }],
  ["d8", { hostPath: makeHostPath("v8.exe") }],
  ["engine262", { hostPath: makeHostPath("engine262.cmd") }],
  ["jsshell", { hostPath: makeHostPath("sm.exe") }],
  ["node", { hostPath: "node.exe" }], // Not provided by esvu
];

if (process.env.CI) {
  // This is for testing the specially built version of Chakra in CI
  hosts[0] = ["ch", { hostPath: "ch" }];
  hosts.push(
    ["chrome", { hostPath: "chrome" }], // Not provided by esvu
    ["firefox", { hostPath: "firefox" }], // Not provided by esvu
    ["remote", { webdriverServer, capabilities }]
  );

  hostsOnWindows[0] = ["ch", { hostPath: "ch.exe" }];
  // hostsOnWindows.push(
  //   ["chrome", { hostPath: "chrome.exe" }], // Not provided by esvu
  //   ["firefox", { hostPath: "firefox.exe" }], // Not provided by esvu
  //   ["remote", {}]
  // );
}

// console.log(`isWindows: ${isWindows}`);
if (isWindows) {
  hosts.forEach((record, index) => {
    const host = hostsOnWindows[index];
    if (record[1].hostPath) {
      if (record[0] === host[0]) {
        record[1].hostPath = host[1].hostPath;
      }
      const ESHOST_ENV_NAME = `ESHOST_${record[0].toUpperCase()}_PATH`;
      console.log(`ESHOST_ENV_NAME: ${ESHOST_ENV_NAME}`);
      if (process.env[ESHOST_ENV_NAME]) {
        record[1].hostPath = path.join(
          process.env[ESHOST_ENV_NAME],
          record[1].hostPath
        );
        console.log(record[1].hostPath);
      }
    }
  });
}

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

hosts.forEach(function (record) {
  const type = record[0];
  const options = record[1];
  const effectiveType =
    type === "remote" ? options.capabilities.browserName : type;

  const isSkipped = process.env[`ESHOST_SKIP_${type.toUpperCase()}`] || false;
  console.log(`ESHOST_SKIP_${type.toUpperCase()}: ${isSkipped ? "YES" : "NO"}`);

  if (
    !isSkipped &&
    options.hostPath &&
    !hasbin.sync(options.hostPath) &&
    !fs.existsSync(options.hostPath)
  ) {
    console.error(`Unable to run tests - host not found: ${options.hostPath}`);
  }

  describe(`${type} (${options.hostPath || type})`, function () {
    let agent;

    if (isSkipped) {
      return;
    }

    beforeEach(async () => {
      agent = await eshost.createAgent(type, options);
    });

    afterEach(async () => {
      if (agent) {
        await agent.stop();
        await agent.destroy();
      }
    });

    describe("Normal script evaluation", function () {
      describe("Code evaluation modes", () => {
        // As of 2021-05-04, hermes and xs fail these tests.
        if (["hermes", "xs"].includes(type)) {
          return;
        }

        it('strict mode evaluation, via "use strict" directive', async () => {
          let code = stripIndent`
            "use strict"
            function foo() { print(this === undefined) }
            foo();
          `;
          let result = await agent.evalScript(code);
          expect(result.stdout.match(/^true\r?\n/m)).toBeTruthy();
        });

        it("strict mode evaluation, via 'use strict' directive", async () => {
          let code = stripIndent`
            'use strict'
            function foo() { print(this === undefined) }
            foo();
          `;
          let result = await agent.evalScript(code);
          expect(result.stdout.match(/^true\r?\n/m)).toBeTruthy();
        });

        it("strict mode evaluation, via 'use strict' directive, prologue multi-line comments", async () => {
          let code = stripIndent`
            /*---
            ---*/
            "use strict";
            function foo() { print(this === undefined) }
            foo();
          `;
          let result = await agent.evalScript(code);
          expect(result.stdout.match(/^true\r?\n/m)).toBeTruthy();
        });

        it("strict mode evaluation, via 'use strict' directive, prologue multi-line comments + other", async () => {
          let code = stripIndent`
            /*---
            ---*/
            " some other prolog "
            "use strict";
            function foo() { print(this === undefined) }
            foo();
          `;
          let result = await agent.evalScript(code);
          expect(result.stdout.match(/^true\r?\n/m)).toBeTruthy();
        });

        it("strict mode evaluation, via 'use strict' directive, prologue multi-line comments + other + interleaved single line comments", async () => {
          let code = stripIndent`
            // normal comment
            /*---
            ---*/
            " some other prolog "
            // another comment
            "use strict";
            function foo() { print(this === undefined) }
            foo();
          `;
          let result = await agent.evalScript(code);
          expect(result.stdout.match(/^true\r?\n/m)).toBeTruthy();
        });

        it("non-strict mode evaluation", async () => {
          let code = stripIndent`
            function foo() { print(this === Function('return this;')()) }
            foo();
          `;
          let result = await agent.evalScript(code);
          expect(result.stdout.match(/^true\r?\n/m)).toBeTruthy();
        });
      });

      describe("Errors", () => {
        it("handles real SyntaxErrors", async () => {
          const result = await agent.evalScript("foo x++");
          expect(result.error).toBeTruthy();
          expect(result.error.name).toBe("SyntaxError");
          expect(result.stdout).toBe("");
        });

        it("handles thrown SyntaxErrors", async () => {
          const result = await agent.evalScript(
            'throw new SyntaxError("Custom Message");'
          );
          expect(result.error).toBeTruthy();
          expect(result.stdout).toBe("");

          expect(result.error.message).toBe("Custom Message");
          expect(result.error.name).toBe("SyntaxError");

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            expect(Number(result.error.stack[0].lineNumber)).toBe(1);
          }
        });

        it("handles thrown TypeErrors", async () => {
          const result = await agent.evalScript(
            'throw new TypeError("Custom Message");'
          );
          expect(result.error).toBeTruthy();
          expect(result.stdout).toBe("");
          expect(result.error.message).toBe("Custom Message");
          expect(result.error.name).toBe("TypeError");

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            expect(Number(result.error.stack[0].lineNumber)).toBe(1);
          }
        });

        it("handles thrown RangeErrors", async () => {
          const result = await agent.evalScript(
            'throw new RangeError("Custom Message");'
          );
          expect(result.error).toBeTruthy();
          expect(result.stdout).toBe("");

          expect(result.error.message).toBe("Custom Message");
          expect(result.error.name).toBe("RangeError");

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            expect(Number(result.error.stack[0].lineNumber)).toBe(1);
          }
        });

        it("handles thrown Errors", async () => {
          const result = await agent.evalScript(
            'throw new Error("Custom Message");'
          );
          expect(result.stdout).toBe("");
          expect(result.error).toBeTruthy();
          expect(result.error.message).toBe("Custom Message");
          expect(result.error.name).toBe("Error");
        });

        it("handles thrown custom Errors", async () => {
          const result = await agent.evalScript(
            'function Foo1Error(msg) { this.name = "Foo1Error"; this.message = msg }; Foo1Error.prototype = Error.prototype; throw new Foo1Error("Custom Message");'
          );
          expect(result.stdout).toBe("");

          expect(result.error).toBeTruthy();
          expect(result.error.message).toBe("Custom Message");

          // graaljs gets this wrong, there's nothing eshost can do about it
          if (type !== "graaljs") {
            expect(result.error.name).toBe("Foo1Error");
          }
        });

        it("handles thrown custom Errors that don't have Error.prototype", async () => {
          const result = await agent.evalScript(stripIndent`
            function Foo2Error(msg) {
              this.message = msg;
            }
            Foo2Error.prototype.name = 'Foo2Error';
            Foo2Error.prototype.toString = function() {
              return 'Foo2Error: ' + this.message;
            }

            throw new Foo2Error('FAIL!');
          `);

          expect(result.stdout).toBe("");
          expect(result.error).toBeTruthy();
          expect(result.error.message).toBe("FAIL!");
          expect(result.error.name).toBe("Foo2Error");
        });

        it("handles thrown Errors without messages", async () => {
          const result = await agent.evalScript("throw new Error();");
          expect(result.stdout).toBe("");
          expect(result.error).toBeTruthy();
          expect(result.error.message).toBeFalsy();
          expect(result.error.name).toBe("Error");
        });

        it("handles thrown errors from eval", async () => {
          const result = await agent.evalScript(
            'eval("\'\\u000Astr\\u000Aing\\u000A\'") === "\\u000Astr\\u000Aing\\u000A"'
          );
          expect(result.stdout).toBe("");

          expect(result.error).toBeTruthy();
          expect(result.error.name).toBe("SyntaxError");

          // Some engines do not provide enough information to
          // create a complete stack array for all errors
          if (result.error.stack.length) {
            // message should be present (but is implementation defined)
            expect(result.error.message).toBeTruthy();
          }
        });
      });

      it("gathers stdout", async () => {
        const result = await agent.evalScript('print("foo")');
        expect(result.stdout.match(/^foo\r?\n/)).toBeTruthy();
      });

      it("prints values correctly", async () => {
        const result = await agent.evalScript(stripIndent`
          print(undefined);
          print(null);
          print('string');
          print(true);
          print(false);
          print(0);
          print(1);
          print(1.2);
          print(-1);
        `);

        expect(result.stderr).toBe("");

        const values = result.stdout.split(/\r?\n/);
        expect(values[0]).toBe("undefined");
        expect(values[1]).toBe("null");
        expect(values[2]).toBe("string");
        expect(values[3]).toBe("true");
        expect(values[4]).toBe("false");
        expect(values[5]).toBe("0");
        expect(values[6]).toBe("1");
        expect(values[7]).toBe("1.2");
        expect(values[8]).toBe("-1");
      });

      it("tolerates broken execution environments", async () => {
        const result = await agent.evalScript(stripIndent`
          Object.defineProperty(Object.prototype, "length", {
            get() {
              return 1;
            },
            configurable: true
          });

          print('okay');
        `);
        expect(result.stderr).toBe("");
        expect(result.stdout.match(/^okay\r?\n/m)).toBeTruthy();
      });

      describe("Time sensitive execution", () => {
        beforeEach(() => {
          // jest.setTimeout(6_000);
        });

        afterEach(() => {
          // jest.setTimeout(5_000);
        });

        // The host may need to perform a number of asynchronous operations in
        // order to evaluate a script. If the `stop` method is invoked while
        // these operations are taking place, the host should not evaluate the
        // script.
        it("avoids race conditions in `stop`", async () => {
          const evaluationResult = agent.evalScript("print(1);");

          agent.stop();

          const result = await evaluationResult;

          expect(result).toMatchInlineSnapshot(`
            Object {
              "error": null,
              "stderr": "",
              "stdout": "",
            }
          `);
        });

        // mostly this test shouldn't hang (if it hangs, it's a bug)
        it("can kill infinite loops", async () => {
          // The GeckoDriver project cannot currently destroy browsing sessions
          // whose main thread is blocked.
          // https://github.com/mozilla/geckodriver/issues/825

          if (effectiveType === "firefox") {
            return;
          }

          const evaluationResult = agent.evalScript(
            "while (true) { }; print(2);"
          );

          await timeout(100);

          const outcome = await Promise.all([evaluationResult, agent.stop()]);

          expect(outcome).toMatchInlineSnapshot(`
            Array [
              Object {
                "error": null,
                "stderr": "",
                "stdout": "",
              },
              true,
            ]
          `);
        });
      });

      it("tolerates LINE SEPARATOR and PARAGRAPH SEPARATOR", async () => {
        if (!["node"].includes(type)) {
          return;
        }

        const operations = [
          '\u2028print("U+2028 once");',
          '\u2029print("U+2029 once");',
          '\u2028\u2029print("both U+2028 and U+2029");',
          '\u2028\u2028print("U+2028 twice");',
          '\u2029\u2029print("U+2029 twice");',
        ].map((src) => agent.evalScript(src));

        const results = await Promise.all(operations);

        expect(results).toMatchInlineSnapshot(`
          Array [
            Object {
              "error": null,
              "stderr": "",
              "stdout": "U+2028 once
          ",
            },
            Object {
              "error": null,
              "stderr": "",
              "stdout": "U+2029 once
          ",
            },
            Object {
              "error": null,
              "stderr": "",
              "stdout": "both U+2028 and U+2029
          ",
            },
            Object {
              "error": null,
              "stderr": "",
              "stdout": "U+2028 twice
          ",
            },
            Object {
              "error": null,
              "stderr": "",
              "stdout": "U+2029 twice
          ",
            },
          ]
        `);
      });

      it('creates "optional" environments correctly (hostArgs)', async () => {
        // browsers are irrelevant to this test
        // jsshell is not working correctly on travis
        if (
          [
            "engine262",
            "firefox",
            "graaljs",
            "hermes",
            "chrome",
            "qjs",
            "remote",
            "xs",
          ].includes(type)
        ) {
          return;
        }

        if (type === "ch" && !process.env.CI) {
          return;
        }

        let source = "";
        let hostArguments = "";

        // Setup special cases
        if (type === "ch") {
          // Hello! If you come here wondering why this fails
          // on your local machine, it's because you're using a
          // version of Chakra that was not compiled with support
          // for development flags. That's ok! The CI machine
          // will check this for you, so don't sweat it.
          hostArguments = "-Intl-";
          source = 'print(typeof Intl === "undefined");';
        }

        if (type === "d8") {
          hostArguments = "--expose_gc";
          source = 'print(typeof gc === "function");';
        }

        if (type === "jsc") {
          hostArguments = "--useDollarVM=true";
          source = 'print(typeof $vm === "object");';
        }

        if (type === "jsshell") {
          hostArguments = "--disable-weak-refs";
          source = 'print(typeof WeakRef === "undefined");';
        }

        if (type === "node") {
          hostArguments = "--expose_gc";
          source = 'print(typeof gc === "function");';
        }

        const agent = await eshost.createAgent(type, {
          hostArguments,
          ...options,
        });
        const result = await agent.evalScript(source);
        expect(result.stdout.trim()).toBe("true");

        await agent.stop();
        await agent.destroy();
      });
    });

    describe("Realm evaluation", function () {
      it("can create new realms", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var realm = $262.createRealm({});
          realm.evalScript("var x = 1");
          realm.evalScript("print(x)");
          subRealm = realm.createRealm({});
          subRealm.evalScript("var x = 2");
          subRealm.evalScript("print(2)");
        `);

        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "1
          2
          ",
          }
        `);
      });

      it("can eval in new realms", async () => {
        if (["hermes", "xs"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var x = 2;
          var realm = $262.createRealm();
          realm.evalScript("var x = 1; print(x);");
          print(x);
        `);

        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "1
          2
          ",
          }
        `);
      });

      it("can set globals in new realms", async () => {
        if (["hermes", "xs"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var x = 1;
          realm = $262.createRealm({globals: {x: 2}});
          realm.evalScript("print(x);");
        `);

        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "2
          ",
          }
        `);
      });

      it("can eval in new scripts", async () => {
        if (["hermes", "xs"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var x = 2;
          $262.evalScript("x = 3;");
          print(x);
        `);
        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "3
          ",
          }
        `);
      });

      it("returns errors from evaling in new script", async () => {
        if (["hermes", "engine262"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var completion = $262.evalScript("x+++");
          print(completion.value.name);
        `);

        expect(
          (result.stdout || result.stderr).match(/SyntaxError/m)
        ).toBeTruthy();
      });

      it("can eval lexical bindings in new scripts", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          $262.evalScript("'use strict'; let x = 3;");
          print(x);
        `);

        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "3
          ",
          }
        `);
      });

      it("can set properties in new realms", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var realm = $262.createRealm({});
          realm.evalScript("var x = 1");
          realm.evalScript("print(x)");
          realm.setGlobal("x", 2);
          realm.evalScript("print(x)");
        `);
        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "1
          2
          ",
          }
        `);
      });

      it("can access properties from new realms", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var realm = $262.createRealm({});
          realm.evalScript("var x = 1");
          print(realm.getGlobal("x"));
        `);
        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "1
          ",
          }
        `);
      });

      it("runs async code", async () => {
        const result = await agent.evalScript(
          stripIndent`
          if ($262.global.Promise === undefined) {
            print('async result');
            $262.destroy();
          } else {
            Promise.resolve().then(function() {
              print('async result');
              $262.destroy();
            });
          }
        `,
          { async: true }
        );

        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "async result
          ",
          }
        `);
      });

      it("accepts destroy callbacks", async () => {
        if (["hermes", "xs"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          realm = $262.createRealm({ destroy() { print("destroyed") }});
          realm.destroy();
        `);
        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "destroyed
          ",
          }
        `);
      });

      it("supports realm nesting", async () => {
        if (["hermes", "xs"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          x = 0;
          $262.createRealm().evalScript(\`
            x = '';
            $262.createRealm().evalScript(\\\`
              x = {};
              print(typeof x);
            \\\`);
            print(typeof x);
          \`);
          print(typeof x);
        `);
        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "object
          string
          number
          ",
          }
        `);
      });

      it("observes correct cross-script interaction semantics", async () => {
        if (["engine262", "graaljs", "hermes", "xs"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          print($262.evalScript('let eshost;').type);
          print($262.evalScript('let eshost;').type);
        `);
        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": null,
            "stderr": "",
            "stdout": "normal
          throw
          ",
          }
        `);
      });
    });

    describe("Normal module evaluation", function () {
      let records;
      // For now we're only going to confirm these in
      // JSC, SpiderMonkey, V8
      //
      if (!["jsc", "jsshell", "d8"].includes(type)) {
        return;
      }

      beforeEach(async () => {
        jest.setTimeout(60_000);

        const FAKE_TEST262 = path.join(
          process.cwd(),
          "test/fixtures/fake-test262"
        );

        let captured = [];
        let stream = new Test262Stream(FAKE_TEST262, {
          acceptVersion: "3.0.0",
          includesDir: path.join(FAKE_TEST262, "harness"),
          paths: ["test/language/module-code"],
        });

        stream.on("data", (test) => {
          if (test.scenario === "default") {
            test.file = path.join(FAKE_TEST262, test.file);
            captured.push(test);
          }
        });

        records = await new Promise((resolve) => {
          stream.on("end", () => resolve(captured));
        });
        agent = await eshost.createAgent(type, options);
      });

      afterEach(async () => {
        jest.setTimeout(5_000);
        records.length = 0;
        if (agent) {
          await agent.stop();
          await agent.destroy();
        }
      });

      it("Can evaluate module code", async () => {
        return Promise.all(
          records.map(async (record) => {
            let options = record.attrs.flags;

            const result = await agent.evalScript(record, options);
            let negative = record.attrs.negative;
            let expectedStdout = record.attrs.flags.async
              ? "Test262:AsyncTestComplete"
              : "";

            if (negative) {
              expect(result.error).not.toBe(null);
              expect(result.stdout).toBeFalsy();
            } else {
              let stdout = result.stdout.trim();
              expect(result.error).toBe(null);
              expect(stdout).toBe(expectedStdout);

              if (result.stderr) {
                console.log(`
                  This test:

                    ${JSON.stringify(record, null, 2)}

                  Produced an unexpected error:

                    ${result.stderr}


                  If the error is regarding a missing dependency, then
                  it's possible that it can safely be ignored.
                `);
              }
            }
          })
        );
      }, 60_000);
    });

    describe('"shortName" option', () => {
      if (["hermes", "engine262"].includes(type)) {
        return;
      }
      it("allows custom shortNames", async () => {
        const optionsWithShortname = { ...options, shortName: "$testing" };
        const agent = await eshost.createAgent(type, optionsWithShortname);
        const result = await agent.evalScript("print(typeof $testing)");
        expect(result.error).toBe(null);
        expect(result.stdout.trim()).toMatchInlineSnapshot(`"object"`);
        await agent.stop();
        await agent.destroy();
      });
    });

    describe('"transform" option', () => {
      it("runs transforms", async () => {
        const agent = await eshost.createAgent(type, {
          ...options,
          transform(x) {
            return `print(${x})`;
          },
        });

        const result = await agent.evalScript("1 + 1");
        expect(result.stdout).toMatchInlineSnapshot(`
          "2
          "
        `);

        await agent.stop();
        await agent.destroy();
      });
    });

    describe('"IsHTMLDDA"', () => {
      if (!["jsc", "jsshell", "d8"].includes(type)) {
        return;
      }
      it("has a default IsHTMLDDA", async () => {
        const agent = await eshost.createAgent(type, options);
        const result = await agent.evalScript("print(typeof $262.IsHTMLDDA);");
        expect(result.error === null).toBeTruthy();
        expect(result.stdout.indexOf("function")).toBe(0);

        await agent.stop();
        await agent.destroy();
      });
    });
  });
});
