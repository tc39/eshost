'use strict';

const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(path.join(__dirname, 'runners'));
const hosts = files.map(name => name.replace('.js', ''));

exports.getRunner = function (path, type, args) {
  var reqPath = './runners/' + type + '.js';

  try {
    var Runner = new require(reqPath);
    return new Runner(path, args);
  } catch (e) {
    if (e.message.indexOf('Cannot find module \'' + reqPath + '\'') > -1) {
      throw new Error("Runner " + type + " not supported. Supported hosts are " + hosts.join(", "));
    } else {
      throw e;
    }
  }

}

exports.supportedHosts = hosts;
