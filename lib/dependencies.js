import fs from "node:fs";
import path from "node:path";

const rawSourceCache = new Map();

export function escapeModuleSpecifier(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasModuleSpecifier(source) {
  const realmImportValue = /importValue\((\s*)(('(.+)'|"(.*)"))(\s*),/g.exec(source);
  const dynamicImport = /import\((\s*)('(.+)'|"(.*)")(\s*)\)/g.exec(source);
  const moduleImport = /(import|from)(?:\s*)('(.+)'|"(.*)")/g.exec(source);
  return !!(realmImportValue ?? dynamicImport ?? moduleImport);
}

function findModuleSpecifiers(source) {
  // While it would be ideal to parse the source to an AST
  // and then visit each node to capture the ModuleSpecifier
  // strings, we can't be sure that all source code will
  // be parseable.
  let lines = source.split(/\r?\n/g);
  return lines.reduce((accum, line) => {
    let parsedDynamicOrStaticImport = /(import|import\(|from)(\s*)('(.*?)'|"(.*?)")/g.exec(line);
    let parsedRealmImportValue = /importValue\((\s*)(('(.+)'|"(.*)"))(\s*),/g.exec(line);

    let parsed = parsedDynamicOrStaticImport ?? parsedRealmImportValue;

    const specifier = parsed && (parsed[4] ?? parsed[5]);

    if (specifier && !accum.includes(specifier)) {
      accum.push(specifier.replace(/^\.\//, ""));
    }
    return accum;
  }, []);
}

export function getDependencies(file, accum = []) {
  let dirname = path.dirname(file);
  let basename = path.basename(file);
  let contents = "";

  if (rawSourceCache.has(basename)) {
    contents = rawSourceCache.get(basename);
  } else {
    try {
      contents = fs.readFileSync(file, "utf8");
      rawSourceCache.set(basename, contents);
    } catch {
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

export const rawSource = {
  get(file) {
    return rawSourceCache.get(file);
  },
  clear() {
    rawSourceCache.clear();
  },
};
