const errorRe = /^[\w\d]+(:.*)?(?:(\r?\n\s+at.*)+|\r?\n$)/m;
const errorPropsRe = /^([\w\d]+)(: (.*))?\r?\n/;
const frameRe = /^\s+at(.*)\(?(.*):(\d+):(\d+(?:-\d+)?)\)?/;

export function parseError(str) {
  let match = str.match(errorRe);

  if (!match) return null;

  const errorStr = match[0];
  match = errorStr.match(errorPropsRe);
  if (!match) return null;

  return {
    name: match[1],
    message: match[3],
    stack: parseStack(errorStr.slice(match[0].length)),
  };
}

export function parseStack(stackStr) {
  const stack = [];

  const lines = stackStr.split(/\r?\n/g);
  lines.forEach((entry) => {
    const match = entry.match(frameRe);
    if (match === null) {
      return;
    }

    stack.push({
      source: entry,
      functionName: match[1].trim(),
      fileName: match[2],
      lineNumber: Number(match[3]),
      columnNumber: Number(match[4]),
    });
  });

  return stack;
}
