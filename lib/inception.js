'use strict';

module.exports = function(runtime) {
  return runtime.replace('$SOURCE', JSON.stringify(runtime.replace('$SOURCE', '""')));
};
