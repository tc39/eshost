"use strict";
const EventEmitter = require('events');
const http = require('http');
const io = require('socket.io');
const Url = require('url');
const fs = require('fs');
const Path = require('path');
const inception = require('./inception');
const enableDestroy = require('server-destroy');

const connections = new Map();
const waitingIds = new Map();
const waitingResults = new Map();
const activeClients = new Set();
const runtimeHtml = fs.readFileSync(Path.join(__dirname, '../runtimes/browser.html'), 'utf8');
const runtimeJs = fs.readFileSync(Path.join(__dirname, '../runtimes/browser.js'), 'utf8');
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

let currentError = null;
let currentStdout = '';
let lastResult = null;

function socketHandler (socket) {
  var clientId;
  socket.on('clientId', function (id) {
    clientId = Number(id);
    const waiting = waitingIds.get(clientId);

    if (waiting) {
      waitingIds.delete(clientId);
      waiting(socket);
    }

    connections.set(clientId, socket);
  });

  socket.on('execError', function (err) {
    currentError = err;
  });

  socket.on('print', function (str) {
    currentStdout += str + '\n';
  });

  socket.on('execDone', function () {
    lastResult = { stdout: currentStdout, stderr: '', error: currentError }
    currentStdout = '';
    currentError = null;

    const waiting = waitingResults.get(clientId);

    if (waiting) {
      waitingResults.delete(clientId);
      waiting(lastResult);
    }
  });
}

function sendInit(req, res) {
  res.writeHead(200, { 'Content-type': 'text/html' });
  res.end(runtimeHtml)
}

function sendRuntime(req, res) {
  res.writeHead(200, { 'Content-type': 'application/javascript' });
  res.end(inception(runtimeJs));
}

function sendStackParser(req, res) {
  res.writeHead(200, { 'Content-type': 'application/javascript' });
  res.end(
    fs.readFileSync('node_modules/error-stack-parser/node_modules/stackframe/dist/stackframe.js') +
    fs.readFileSync('node_modules/error-stack-parser/dist/error-stack-parser.js')
  );
}

exports.start = function startServer(id) {
  activeClients.add(id);

  if (activeClients.size === 1) {
    // need to start the server!
    return new Promise(res => {
      server.listen(1337, '0.0.0.0', function () {
        res();
      });
    });
  } else {
    // hopefully already started!
    return Promise.resolve();
  }
}

exports.stop = function stopServer(id) {
  activeClients.delete(id);
  if (activeClients.size === 0) {
    try {
    server.destroy();
    } catch(e) {
      console.log("Failed", e);
    }
  }
}

exports.waitForClientId = function (id) {
  return new Promise(res => {
    const existing = connections.get(id);
    if (existing) {
      res(existing)
    }

    waitingIds.set(id, res);
  });
}

exports.waitForResult = function (id) {
  return new Promise(res => {
    waitingResults.set(id, res);
  });
}
