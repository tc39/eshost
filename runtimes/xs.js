var $262 = globalThis.$262;

if (!$262) {
  $262 = {
    global: globalThis,
    createRealm() {
      throw new Test262Error("createRealm() not yet supported.");
    },
    evalScript(code) {
      try {
        global.evalScript(code);
        return { type: "normal", value: undefined };
      } catch (e) {
        return { type: "throw", value: e };
      }
    },
    gc() {
      throw new Test262Error("gc() not yet supported.");
    },
    agent: (function () {
      function thrower() {
        throw new Test262Error("agent.* not yet supported.");
      }
      return {
        start: thrower,
        broadcast: thrower,
        getReport: thrower,
        sleep: thrower,
        monotonicNow: thrower,
      };
    })(),
  };
}
/* No IsHTMLDDA */
$262.destroy = function () {};
$262.source = $SOURCE;
