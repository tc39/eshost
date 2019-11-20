'use strict';

const fs = require('fs');
const path = require('path');

const promisify = require('./promisify');
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);

module.exports = async function(sources) {
  let {0: [file]} = sources;
  let dir = path.dirname(file);

  await safeMkdir(dir);
  /*
    first: path to output file
    second: contents
   */
  return await Promise.all(
    sources.map(args => writeFile(...args))
  );
};

async function safeMkdir(dir) {
  try {
    await stat(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        await mkdir(dir);
      } catch ({}) {
        // suppressed?
      }
    }
  }
}
