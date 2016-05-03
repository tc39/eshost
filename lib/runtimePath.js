'use strict';
const path = require('path');
const root = path.join(__dirname, '../runtimes');
exports.for = function (f) {
  return path.join(root, f + '.js');
}
