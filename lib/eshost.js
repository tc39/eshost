'use strict';

const fs = require('fs');
const path = require('path');
const Agent = require('./Agent');
const files = fs.readdirSync(path.join(__dirname, 'agents'));
const hosts = files.map(name => name.replace('.js', ''));

exports.createAgent = function(type, options) {
  if (type === 'custom') {
    const createAgent = require(options.hostPath);
    const A = createAgent(Agent);
    const a = new A(options);
    return a.initialize();
  } else {
    const reqPath = `./agents/${type}.js`;

    try {
      const A = new require(reqPath);
      const a = new A(options);
      return a.initialize();
    } catch (e) {
      if (e.message.indexOf(`Cannot find module '${reqPath}'`) > -1) {
        throw new Error(`Agent ${type} not supported. Supported hosts are '${hosts.join(', ')}'`);
      } else {
        throw e;
      }
    }
  }
};

exports.supportedHosts = hosts;
