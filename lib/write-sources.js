'use strict';

let fs;

try {
  fs = require('fs/promises');
} catch(error) {
  fs = require('fs').promises;
}

const path = require('path');

module.exports = async function(sources) {
  let {0: [file]} = sources;
  let dir = path.dirname(file);

  await safeMkdir(dir);
  /*
    first: path to output file
    second: contents
   */
  return Promise.all(
    sources.map(args => fs.writeFile(...args))
  );
};

async function safeMkdir(dir) {
  try {
    await fs.stat(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        await fs.mkdir(dir);
      } catch ({}) {
        // suppressed?
      }
    }
  }
}
