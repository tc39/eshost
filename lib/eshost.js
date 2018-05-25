'use strict';

const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(path.join(__dirname, 'agents'));
const hosts = files.map(name => name.replace('.js', ''));

exports.createAgent = function(type, options) {
  const reqPath = `./agents/${type}.js`;

  try {
    const Agent = new require(reqPath);
    const a = new Agent(options);
    return a.initialize();
  } catch (e) {
    if (e.message.indexOf(`Cannot find module '${reqPath}'`) > -1) {
      throw new Error(`Agent ${type} not supported. Supported hosts are '${hosts.join(', ')}'`);
    } else {
      throw e;
    }
  }

};

exports.supportedHosts = hosts;
