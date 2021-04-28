"use strict";

const eshost = require("../");
const assert = require("assert");
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

// const capabilities = {
//   browserName: process.env.ESHOST_REMOTE_BROWSERNAME || 'firefox',
//   platform: process.env.ESHOST_REMOTE_PLATFORM || 'ANY',
//   version: process.env.ESHOST_REMOTE_VERSION || ''
// };

// const webdriverServer = 'http://localhost:4444/wd/hub';

const makeHostPath = (binName) => {
  return path.join(os.homedir(), ".esvu/bin", binName);
};

const hosts = [
  // ['ch', { hostPath: makeHostPath('chakra') }],
  // // ['hermes', { hostPath: makeHostPath('hermes') }],
  // ['d8', { hostPath: makeHostPath('v8') }],
  // ['engine262', { hostPath: makeHostPath('engine262') }],
  ['jsshell', { hostPath: makeHostPath('sm') }],
  ["jsc", { hostPath: makeHostPath("jsc") }],
  // ['node', { hostPath: 'node' }], // Not provided by esvu
  // // ['chrome', { hostPath: 'chrome' }], // Not provided by esvu
  // // ['firefox', { hostPath: 'firefox' }], // Not provided by esvu
  // // ['remote', { webdriverServer, capabilities }],
];

if (process.env.CI) {
  hosts.unshift(["ch", { hostPath: "ch" }]);
}

const hostsOnWindows = [
  ["ch", { hostPath: makeHostPath("chakra.exe") }],
  ["hermes", { hostPath: makeHostPath("hermes.exe") }],
  ["d8", { hostPath: makeHostPath("v8.exe") }],
  ["engine262", { hostPath: makeHostPath("engine262.cmd") }],
  ["jsshell", { hostPath: makeHostPath("sm.exe") }],
  ["jsc", { hostPath: makeHostPath("jsc.exe") }],
  ["node", { hostPath: "node.exe" }], // Not provided by esvu
  ["chrome", { hostPath: "chrome.exe" }], // Not provided by esvu
  ["firefox", { hostPath: "firefox.exe" }], // Not provided by esvu
  ["remote", {}],
];

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

const timeout = function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

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
    let run;
    let agent;
    // this.timeout(20000);

    if (isSkipped) {
      return;
    }

    beforeAll(() => {
      // run = this;
      if (type === "remote") {
        // run.timeout(60 * 1000);
      }
    });

    beforeEach(async () => {
      agent = await eshost.createAgent(type, options);
    });

    afterEach(() => {
      if (agent) {
        agent.destroy();
      }
    });

    describe("normal script evaluation", function () {
      it("runs SyntaxErrors", async () => {
        const result = await agent.evalScript("foo x++");
        assert(result.error, "error is present");
        assert.strictEqual(result.error.name, "SyntaxError");
        assert.strictEqual(result.stdout, "", "stdout not present");
      });

      it("runs thrown SyntaxErrors", async () => {
        const result = await agent.evalScript(
          'throw new SyntaxError("Custom Message");'
        );
        assert(result.error, "error is present");
        assert.strictEqual(result.stdout, "", "stdout not present");

        assert.strictEqual(result.error.message, "Custom Message");
        assert.strictEqual(result.error.name, "SyntaxError");

        // Some engines do not provide enough information to
        // create a complete stack array for all errors
        if (result.error.stack.length) {
          assert.strictEqual(Number(result.error.stack[0].lineNumber), 1);
        }
      });

      it("runs thrown TypeErrors", async () => {
        const result = await agent.evalScript(
          'throw new TypeError("Custom Message");'
        );
        assert(result.error, "error is present");
        assert.strictEqual(result.stdout, "", "stdout not present");
        assert.strictEqual(result.error.message, "Custom Message");
        assert.strictEqual(result.error.name, "TypeError");

        // Some engines do not provide enough information to
        // create a complete stack array for all errors
        if (result.error.stack.length) {
          assert.strictEqual(Number(result.error.stack[0].lineNumber), 1);
        }
      });

      it("runs thrown RangeErrors", async () => {
        const result = await agent.evalScript(
          'throw new RangeError("Custom Message");'
        );
        assert(result.error, "error is present");
        assert.strictEqual(result.stdout, "", "stdout not present");

        assert.strictEqual(result.error.message, "Custom Message");
        assert.strictEqual(result.error.name, "RangeError");

        // Some engines do not provide enough information to
        // create a complete stack array for all errors
        if (result.error.stack.length) {
          assert.strictEqual(Number(result.error.stack[0].lineNumber), 1);
        }
      });

      it("runs thrown Errors", async () => {
        const result = await agent.evalScript(
          'throw new Error("Custom Message");'
        );
        assert.strictEqual(result.stdout, "", "stdout not present");
        assert(result.error, "error is present");
        assert.strictEqual(result.error.message, "Custom Message");
        assert.strictEqual(result.error.name, "Error");
      });

      it("runs thrown custom Errors", async () => {
        const result = await agent.evalScript(
          'function Foo1Error(msg) { this.name = "Foo1Error"; this.message = msg }; Foo1Error.prototype = Error.prototype; throw new Foo1Error("Custom Message");'
        );
        assert.strictEqual(result.stdout, "", "stdout not present");

        assert(result.error, "error is present");
        assert.strictEqual(result.error.message, "Custom Message");
        assert.strictEqual(result.error.name, "Foo1Error");
      });

      it("runs thrown custom Errors that don't have Error.prototype", async () => {
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

        assert.strictEqual(result.stdout, "", "stdout not present");
        assert(result.error, "error is present");
        assert.strictEqual(result.error.message, "FAIL!");
        assert.strictEqual(result.error.name, "Foo2Error");
      });

      it("runs thrown Errors without messages", async () => {
        const result = await agent.evalScript("throw new Error();");
        assert.strictEqual(result.stdout, "", "stdout not present");
        assert(result.error, "error is present");
        assert.strictEqual(result.error.message, undefined);
        assert.strictEqual(result.error.name, "Error");
      });

      it("runs thrown errors from eval", async () => {
        const result = await agent.evalScript(
          'eval("\'\\u000Astr\\u000Aing\\u000A\'") === "\\u000Astr\\u000Aing\\u000A"'
        );
        assert.strictEqual(result.stdout, "", "stdout not present");

        assert(result.error, "error is present");
        assert.strictEqual(result.error.name, "SyntaxError");

        // Some engines do not provide enough information to
        // create a complete stack array for all errors
        if (result.error.stack.length) {
          // message should be present (but is implementation defined)
          assert(result.error.message);
        }
      });

      it("gathers stdout", async () => {
        const result = await agent.evalScript('print("foo")');
        assert(
          result.stdout.match(/^foo\r?\n/),
          `Unexpected stdout: ${result.stdout}`
        );
      });

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

        assert.strictEqual(result.stderr, "", "stderr not present");
        assert(
          result.stdout.match(/^1\r?\n2\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
      });

      it("can eval in new realms", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var x = 2;
          var realm = $262.createRealm();
          realm.evalScript("var x = 1; print(x);");
          print(x);
        `);

        assert.strictEqual(result.stderr, "", "stderr not present");
        assert(
          result.stdout.match(/^1\r?\n2\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
      });

      it("can set globals in new realms", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var x = 1;
          realm = $262.createRealm({globals: {x: 2}});
          realm.evalScript("print(x);");
        `);
        assert(
          result.stdout.match(/^2\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
      });

      it("can eval in new scripts", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var x = 2;
          $262.evalScript("x = 3;");
          print(x);
        `);

        assert(
          result.stdout.match(/^3\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
      });

      it("returns errors from evaling in new script", async () => {
        if (["hermes", "engine262"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          var completion = $262.evalScript("x+++");
          print(completion.value.name);
        `);

        assert(
          (result.stdout || result.stderr).match(/SyntaxError/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
      });

      it("can eval lexical bindings in new scripts", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          $262.evalScript("'use strict'; let x = 3;");
          print(x);
        `);

        assert(
          result.stdout.match(/^3\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
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

        assert.strictEqual(result.stderr, "", "stderr not present");
        assert(
          result.stdout.match(/^1\r?\n2\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
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

        assert.strictEqual(result.stderr, "", "stderr not present");
        assert(
          result.stdout.match(/^1\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
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

        assert.strictEqual(result.stderr, "", "stderr not present");
        assert(
          result.stdout.match(/async result/),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
      });

      it("accepts destroy callbacks", async () => {
        if (["hermes"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          realm = $262.createRealm({ destroy() { print("destroyed") }});
          realm.destroy();
        `);
        assert.strictEqual(result.stderr, "", "stderr not present");
        assert(
          result.stdout.match(/destroyed/),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
      });

      it("runs in the proper mode", async () => {
        let result = await agent.evalScript(stripIndent`
          "use strict"
          function foo() { print(this === undefined) }
          foo();
        `);
        assert(
          result.stdout.match(/^true\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );

        result = await agent.evalScript(stripIndent`
          'use strict'
          function foo() { print(this === undefined) }
          foo();
        `);
        assert(
          result.stdout.match(/^true\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );

        result = await agent.evalScript(stripIndent`
          function foo() { print(this === Function('return this;')()) }
          foo();
        `);
        assert(
          result.stdout.match(/^true\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );

        result = await agent.evalScript(stripIndent`
          /*---
          ---*/
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `);
        assert(
          result.stdout.match(/^true\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );

        result = await agent.evalScript(stripIndent`
          /*---
          ---*/
          " some other prolog "
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `);
        assert(
          result.stdout.match(/^true\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );

        result = await agent.evalScript(stripIndent`
          // normal comment
          /*---
          ---*/
          " some other prolog "
          // another comment
          "use strict";
          function foo() { print(this === undefined) }
          foo();
        `);
        assert(
          result.stdout.match(/^true\r?\n/m),
          `Unexpected stdout: ${result.stdout}${result.stderr}`
        );
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

        assert.strictEqual(result.stderr, "");

        const values = result.stdout.split(/\r?\n/);
        assert.strictEqual(values[0], "undefined");
        assert.strictEqual(values[1], "null");
        assert.strictEqual(values[2], "string");
        assert.strictEqual(values[3], "true");
        assert.strictEqual(values[4], "false");
        assert.strictEqual(values[5], "0");
        assert.strictEqual(values[6], "1");
        assert.strictEqual(values[7], "1.2");
        assert.strictEqual(values[8], "-1");
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
        assert.strictEqual(result.stderr, "");
        assert(result.stdout.match(/^okay\r?\n/m));
      });

      it("supports realm nesting", async () => {
        if (["hermes"].includes(type)) {
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
        assert.strictEqual(result.stderr, "");
        assert(result.stdout.match(/^object\r?\nstring\r?\nnumber\r?\n/m));
      });

      it("observes correct cross-script interaction semantics", async () => {
        if (["hermes", "engine262"].includes(type)) {
          return;
        }

        const result = await agent.evalScript(stripIndent`
          print($262.evalScript('let eshost;').type);
          print($262.evalScript('let eshost;').type);
        `);

        assert.strictEqual(result.stderr, "");
        assert(result.stdout.match(/^normal\r?\nthrow/m));
      });

      // The host may need to perform a number of asynchronous operations in
      // order to evaluate a script. If the `stop` method is invoked while
      // these operations are taking place, the host should not evaluate the
      // script.
      it("avoids race conditions in `stop`", async () => {
        const evalScript = agent.evalScript("print(1);");

        agent.stop();

        const result = await evalScript;

        assert.strictEqual(result.stdout, "");
      });

      // mostly this test shouldn't hang (if it hangs, it's a bug)
      it("can kill infinite loops", async () => {
        // The GeckoDriver project cannot currently destroy browsing sessions
        // whose main thread is blocked.
        // https://github.com/mozilla/geckodriver/issues/825
        if (effectiveType === "firefox") {
          return;
        }

        const resultP = agent.evalScript(
          stripIndent`while (true) { }; print(2);`
        );
        await timeout(10);

        const stopP = agent.stop();

        const outcomes = await Promise.all([resultP, stopP]);
        const result = outcomes[0];

        assert(
          !result.stdout.match(/2/),
          `Unexpected stdout: ${result.stdout}`
        );
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

        assert.strictEqual(results[0].stderr, "");
        assert(
          results[0].stdout.match(/^U\+2028 once\r?\n/),
          `Unexpected stdout: ${results[0].stdout}`
        );

        assert.strictEqual(results[1].stderr, "");
        assert(
          results[1].stdout.match(/^U\+2029 once\r?\n/),
          `Unexpected stdout: ${results[1].stdout}`
        );

        assert.strictEqual(results[2].stderr, "");
        assert(
          results[2].stdout.match(/^both U\+2028 and U\+2029\r?\n/),
          `Unexpected stdout: ${results[2].stdout}`
        );

        assert.strictEqual(results[3].stderr, "");
        assert(
          results[3].stdout.match(/^U\+2028 twice\r?\n/),
          `Unexpected stdout: ${results[3].stdout}`
        );

        assert.strictEqual(results[4].stderr, "");
        assert(
          results[4].stdout.match(/^U\+2029 twice\r?\n/),
          `Unexpected stdout: ${results[4].stdout}`
        );
      });

      it('creates "optional" environments correctly (hostArgs)', async () => {
        // browsers are irrelevant to this test
        // jsshell is not working correctly on travis
        if (
          [
            "engine262",
            "hermes",
            "jsshell",
            "firefox",
            "chrome",
            "remote",
          ].includes(type)
        ) {
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
          hostArguments = "--shared-memory=off";
          source = 'print(typeof SharedArrayBuffer === "undefined");';
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
        assert.strictEqual(result.stdout.trim(), "true");
      });
    });

    describe("normal module evaluation", function () {
      let records;
      // For now we're only going to confirm these in
      // JSC, SpiderMonkey, V8
      //
      if (!["jsc", "jsshell", "d8"].includes(type)) {
        return;
      }

      beforeEach(async () => {
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
          // SpiderMonkey doesn't support these yet.
          if (type === "jsshell" && test.file.includes("dynamic-import")) {
            return;
          }
          if (test.scenario === "default") {
            test.file = path.join(FAKE_TEST262, test.file);
            captured.push(test);
          }
        });

        let pTests = new Promise((resolve) => {
          stream.on("end", () => resolve(captured));
        });

        records = await pTests;
        agent = await eshost.createAgent(type, options);

        // return Promise.all([
        //   pTests,
        //   pAgent,
        // ]).then(([r, a]) => {
        //   records = r;
        //   agent = a;
        // });
      });

      afterEach(() => {
        records.length = 0;
        if (agent) {
          agent.destroy();
        }
      });

      it("Can evaluate module code", async () => {
        // 60 seconds should be enough.
        // run.timeout(60000);

        return Promise.all(
          records.map(async (record) => {
            let options = record.attrs.flags;

            const result = await agent.evalScript(record, options);
            let negative = record.attrs.negative;
            let expectedStdout = record.attrs.flags.async
              ? "Test262:AsyncTestComplete"
              : "";

            if (negative) {
              assert(result.error, "error is not null");
              assert.strictEqual(result.stdout, "", "stdout is empty");
            } else {
              let stdout = result.stdout.trim();
              assert(!result.error, "error is null");
              assert(!result.stderr, "stderr is empty string");
              assert.strictEqual(
                stdout,
                expectedStdout,
                `stdout is "${expectedStdout}"`
              );
            }
          })
        );
      });
    });

    describe('"shortName" option', () => {
      if (["hermes", "engine262"].includes(type)) {
        return;
      }
      it("allows custom shortNames", async () => {
        const optionsWithShortname = { ...options, shortName: "$testing" };
        const agent = await eshost.createAgent(type, optionsWithShortname);
        const result = await agent.evalScript(
          '$testing.evalScript("print(1)")'
        );
        assert(result.error === null, "no error");
        assert.strictEqual(result.stdout.indexOf("1"), 0);
        agent.destroy();
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
      });
    });

    describe('"IsHTMLDDA"', () => {
      if (!["jsc", "jsshell", "d8"].includes(type)) {
        return;
      }
      it("has a default IsHTMLDDA", async () => {
        const agent = await eshost.createAgent(type, options);
        const result = await agent.evalScript("print(typeof $262.IsHTMLDDA);");
        assert(result.error === null, "no error");
        assert.strictEqual(result.stdout.indexOf("function"), 0);
        agent.destroy();
      });
    });
  });
});
