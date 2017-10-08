'use strict';
const Agent = require('../Agent.js');
const Server = require('../Server.js');
let agentId = 0;

class BrowserAgent extends Agent {
  constructor (options) {
    super(options);

    this.webHost = options.webHost || 'localhost';
    this.webPort = options.webPort || 1337;
    this.id = agentId++;
  }

  initialize() {
    return Server.start(this.id).then(_ => {
      this._url = `http://${this.webHost}:${this.webPort}/` +
        `?clientId=${this.id}&shortName=${this.shortName}`;
      return this;
    });

    // A method for cancelling the current `evalScript` operation (if any)
    this._cancelEval = null;
  }

  evalScript (code, options) {
    code = this.compile(code, options);
    let cancelled = false;
    const whenCancelled = new Promise(resolve => {
      this._cancelEval = () => {
        cancelled = true;
        resolve({ stdout: '', stderr: '', error: null });
      };
    });

    const whenEvaluated = Server.waitForClientId(this.id).then(handler => {
      if (cancelled) {
        return;
      }

      handler._socket.emit('exec', code);
      return Server.waitForResult(this.id).then(result => {
        if (cancelled) {
          return;
        }

        // normalize empty string to undefined
        if (result.error) {
          result.error.message = result.error.message || undefined;
        }

        return result;
      })
    });

    return Promise.race([whenEvaluated, whenCancelled]);
  }

  stop() {
    if (this._cancelEval) {
      this._cancelEval();
    }

    return Promise.resolve();
  }

  destroy() {
    return super.destroy().then(() => Server.stop(this.id));
  }
}

module.exports = BrowserAgent;
