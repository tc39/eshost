'use strict';
const Runner = require('./Runner.js');
const Server = require('./Server.js');
let runnerId = 0;

class BrowserRunner extends Runner {
  constructor (hostPath) {
    super(hostPath);
    this.id = runnerId++;
    Server.start(this.id).then(_ => {
      this.createChildProcess(['http://localhost:1337/?' + this.id]);
    });
  }

  exec (code) {
    return Server.waitForClientId(this.id).then(socket => {
      socket.emit('exec', code);
      return Server.waitForResult(this.id);
    });
  }

  dispose() {
    Server.stop(this.id);
  }
}

module.exports = BrowserRunner;
