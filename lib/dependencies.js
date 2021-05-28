'use strict';

const fs = require('fs');
const path = require('path');
const rawSourceCache = new Map();
const dependencySuffixes = /\.js|\.mjs|\.json/;
const dependencySuffixesRight = new RegExp(`(${dependencySuffixes.source})$`);

function escapeModuleSpecifier(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasModuleSpecifier(source) {
  const dynamicImport = /import\((\s*)('(.+)'|"(.*)")(\s*)\)/g.exec(source);
  const moduleImport = /(import|from)(?:\s*)('(\.\/.*)'|"(\.\/.*)")/g.exec(source);
  if ((dynamicImport && dynamicImport.length) ||
      (moduleImport && moduleImport.length)) {
    return true;
  }
  return false;
}

function findModuleSpecifiers(source) {
  // While it would be ideal to parse the source to an AST
  // and then visit each node to capture the ModuleSpecifier
  // strings, we can't be sure that all source code will
  // be parseable.
  let lines = source.split(/\r?\n/g);
  return lines.reduce((accum, line) => {
    if (dependencySuffixes.test(line)) {
      let parsed = /(import|import\(|from)(\s*)('(.*?)'|"(.*?)")/g.exec(line);
      if (parsed && parsed.length) {
        for (let entry of parsed) {
          if (entry && dependencySuffixesRight.test(entry) && !accum.includes(entry)) {
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
  let contents = '';

  if (rawSourceCache.has(basename)) {
    contents = rawSourceCache.get(basename);
  } else {
    try {
      contents = fs.readFileSync(file, 'utf8');
      rawSourceCache.set(basename, contents);
    } catch (error) {
      accum.splice(accum.indexOf(basename), 1);
    }
  }

  if (contents.length) {
    let specifiers = findModuleSpecifiers(contents);

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
  }

  return [...new Set(accum)];
}

module.exports = {
  escapeModuleSpecifier,
  getDependencies,
  hasModuleSpecifier,
  rawSource: {
    get(file) {
      return rawSourceCache.get(file);
    },
    clear() {
      rawSourceCache.clear();
    },
  },
};
