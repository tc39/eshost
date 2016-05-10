'use strict';
const Agent = require('../Agent.js');
const Server = require('../Server.js');
let agentId = 0;

class BrowserAgent extends Agent {
  constructor (hostPath) {
    super(hostPath);
    this.id = agentId++;
  }

  initialize() {
    return Server.start(this.id).then(_ => {
      this._url = 'http://localhost:1337/?' + this.id;

      return this;
    });
  }

  evalScript (code, options) {
    code = this.compile(code, options);
    return Server.waitForClientId(this.id).then(socket => {
      socket.emit('exec', code);
      return Server.waitForResult(this.id)
    });
  }

  destroy() {
    return super.destroy().then(() => Server.stop(this.id));
  }
}

module.exports = BrowserAgent;
