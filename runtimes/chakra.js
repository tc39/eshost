var $ = {
  global: this,
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = WScript.LoadScript(this.source, 'samethread');
    realm.$.source = this.source;
    realm.$.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };

    for(var glob in options.globals) {
      realm.$.global[glob] = options.globals[glob];
    }

    return realm.$;
  },
  evalScript(code) {
    try {
      WScript.LoadScript(code);
      return { type: 'normal', value: undefined };
    } catch (e) {
      return { type: 'throw', value: e };
    }
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA() { return {}; },
  source: $SOURCE,
  agent: (function() {
    const isAgentSupportable = typeof WScript.Broadcast === 'function';

    function thrower() {
      throw new Test262Error('Agent not yet supported.');
    }

    if (isAgentSupportable) {
      const {
        Broadcast: broadcast,
        GetReport: getReport,
        Sleep: sleep,
        Leaving: leaving,
      } = WScript;
      // This is temporary until a real monotonicNow
      // can be introduced into WScript
      const monotonicNow = Date.now;
      const agentPreable = `
        const {
          ReceiveBroadcast: receiveBroadcast,
          Report: report,
          Sleep: sleep,
          Leaving: leaving,
        } = WScript;
        // This is temporary until a real monotonicNow
        // can be introduced into WScript
        const monotonicNow = Date.now;
        $262 = {
          agent: {
            receiveBroadcast,
            report,
            sleep,
            leaving,
            monotonicNow,
          },
        };
      `.trim();
      return {
        start(src) {
          WScript.LoadScript(`${agentPreable}\n${src}`, 'crossthread');
        },
        broadcast,
        getReport,
        sleep,
        leaving,
        monotonicNow,
      };
    } else {
      return {
        start: thrower,
        broadcast: thrower,
        getReport: thrower,
        sleep: thrower,
        monotonicNow: thrower,
      };
    }
  })(),
};
