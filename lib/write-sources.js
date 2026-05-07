import fs from "node:fs/promises";
import path from "node:path";

export async function writeSources(sources) {
  let {
    0: [file],
  } = sources;
  let dir = path.dirname(file);

  await safeMkdir(dir);
  /*
    first: path to output file
    second: contents
   */
  return Promise.all(sources.map((args) => fs.writeFile(...args)));
}

async function safeMkdir(dir) {
  try {
    await fs.stat(dir);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        await fs.mkdir(dir);
      } catch {
        // suppressed?
      }
    }
  }
}
