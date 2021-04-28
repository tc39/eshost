'use strict';

const {
  getDependencies,
  hasModuleSpecifier,
  rawSource
} = require('./dependencies');
const writeSources = require('./write-sources');
const {supportedHosts, supportedHostsMap} = require('./supported-hosts');
const normalizeHostForVU = hostType => supportedHostsMap[hostType] || hostType;

exports.createAgent = function(type, options) {
  const hostType = normalizeHostForVU(type);
  const reqPath = `./agents/${hostType}.js`;

  try {
    const Agent = require(reqPath);
    const a = new Agent(options);
    return a.initialize();
  } catch (error) {
    if (error.message.indexOf(`Cannot find module '${reqPath}'`) > -1) {
      throw new Error(`Agent for '${hostType}' not supported. Supported host type names are '${supportedHosts.join(', ')}'`);
    } else {
      throw error;
    }
  }
};

exports.supportedHosts = supportedHosts;
exports.normalizeHostForVU = normalizeHostForVU;

exports.source = {
  getDependencies,
  hasModuleSpecifier,
  writeSources,
  getSource(fileName) {
    return rawSource.get(fileName);
  }
};
