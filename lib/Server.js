'use strict';
const http = require('http');
const io = require('socket.io');
const Url = require('url');
const fs = require('fs');
const Path = require('path');
const inception = require('./inception');
const enableDestroy = require('server-destroy');

const activeClients = new Set();
const runtimeHtml = fs.readFileSync(Path.join(__dirname, '../runtimes/browser.html'), 'utf8');
const runtimeJs = fs.readFileSync(Path.join(__dirname, '../runtimes/browser.js'), 'utf8');
const stackParserPath = Path.join(Path.dirname(require.resolve('error-stack-parser')), 'dist/error-stack-parser.js');
const stackframePath = Path.join(Path.dirname(require.resolve('stackframe')), 'dist/stackframe.js')
const stackJs = fs.readFileSync(stackframePath, 'utf8') + fs.readFileSync(stackParserPath, 'utf8');

const server = http.createServer(httpHandler);
enableDestroy(server);
const sio = io(server);
sio.on('connection', socketHandler);

function httpHandler (req, res) {
  const url = Url.parse(req.url);

  switch (url.pathname) {
  case '/': sendInit(req, res); break;
  case '/runtime.js': sendRuntime(req, res); break;
  case '/error-stack-parser.js': sendStackParser(req, res); break;
  default:
    res.writeHead(404);
    res.end();
  }
}

class SocketHandler {
  constructor(id) {
    this._socket = null;
    this._clientId = Number(id);
    this._currentError = null;
    this._currentStdout = '';
    this._onGotSocket = null;
    this._onResult = null;
    SocketHandler.byId.set(this._clientId, this);
  }

  gotSocket(socket) {
    this._socket = socket;
    socket.on('execError', err => {
      this.gotError(err);
    })

    socket.on('print', ({value}) => this.gotStdout(value));
    socket.on('execDone', () => this.gotExecDone());
    if (this._onGotSocket) this._onGotSocket(this);
  }

  gotError(err) {
    this._currentError = err;
  }

  gotStdout(str) {
    this._currentStdout += str + '\n';
  }

  gotExecDone() {
    if (this._onResult) {
      const result = { stdout: this._currentStdout, stderr: '', error: this._currentError };
      this._onResult(result);
    }

    this._currentStdout = '';
    this._currentError = null;
  }
}
SocketHandler.byId = new Map();

function socketHandler (socket) {
  socket.on('clientId', id => {
    id = Number(id);
    const handler = SocketHandler.byId.get(id);
    if (!handler) return;

    handler.gotSocket(socket);
  });
}

function sendInit(req, res) {
  res.writeHead(200, { 'Content-type': 'text/html' });
  res.end(runtimeHtml);
}

function sendRuntime(req, res) {
  res.writeHead(200, { 'Content-type': 'application/javascript' });
  res.end(inception(runtimeJs));
}

function sendStackParser(req, res) {
  res.writeHead(200, { 'Content-type': 'application/javascript' });
  res.end(stackJs);
}

exports.start = function startServer(id) {
  id = Number(id);

  activeClients.add(id);

  return new Promise(res => {
    if (activeClients.size === 1) {
      // need to start the server!
      server.listen(1337, '0.0.0.0', function () {
        res();
      });
    } else {
      // hopefully already started!
      return res();
    }
  }).then(() => {
    let currentHandler = SocketHandler.byId.get(id);
    if (!currentHandler) {
      currentHandler = new SocketHandler(id);
    }
    return currentHandler;
  })
};

exports.stop = function stopServer(id) {
  activeClients.delete(id);
  if (activeClients.size === 0) {
    server.destroy();
  }
};

exports.clientIdStopped = function (id) {
  let handler = SocketHandler.byId.get(id);
  if (!handler) return;

  handler.gotExecDone();
}

exports.waitForClientId = function (id) {
  let handler = SocketHandler.byId.get(id);
  if (handler._socket) return Promise.resolve(handler);

  return new Promise(res => {
    handler._onGotSocket = res;
  });
};

exports.waitForResult = function (id) {
  let handler = SocketHandler.byId.get(id);
  return new Promise(res => {
    handler._onResult = res;
  });
};
