'use strict';

const fs = require('fs');
const path = require('path');

function findImportSpecifiers(source) {
  // While it would be ideal to parse the source to an AST
  // and then visit each node to capture the ModuleSpecifier
  // strings, we can't be sure that all source code will
  // be parseable.
  let lines = source.split(/\r?\n/g);
  return lines.reduce((accum, line) => {
    if (line.includes('.js')) {
      let parsed = /(import|import\(|from)(\s*)'(.*)'|"(.*)";/g.exec(line);
      if (parsed && parsed.length) {
        for (let entry of parsed) {
          if (entry && entry.endsWith('.js') && !accum.includes(entry)) {
            accum.push(entry.replace('./', ''));
          }
        }
      }
    }
    return accum;
  }, []);
}

function getDependencies(file, accum = []) {
  let dirname = path.dirname(file);
  let basename = path.basename(file);
  let specifiers = findImportSpecifiers(fs.readFileSync(file, 'utf8'));

  if (!specifiers.length) {
    return [basename];
  }

  for (let specifier of specifiers) {
    if (!accum.includes(specifier)) {
      accum.push(specifier);
      if (basename !== specifier) {
        accum.push(...getDependencies(path.join(dirname, specifier), accum));
      }
    }
  }

  return [...new Set(accum)];
}


module.exports = getDependencies;
