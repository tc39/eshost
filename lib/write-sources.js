'use strict';

const fs = require('fs');
const writeFile = promisify(fs.writeFile);

module.exports = function(sources) {
  /*
    first: path to output file
    second: contents
   */
  return Promise.all(
    // TODO: Can we use built-in fs-promise?
    sources.map(args => writeFile(...args))
  );
};

function promisify(api) {
  return function(...args) {
    return new Promise(function(resolve, reject) {
      args.push(function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
      api(...args);
    });
  };
}

