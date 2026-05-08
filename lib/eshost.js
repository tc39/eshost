import { getDependencies, hasModuleSpecifier, rawSource } from "./dependencies.js";
import { writeSources } from "./write-sources.js";

export const SUPPORTED_HOSTS = new Set([
  /* Console hosts */
  "boa",
  "engine262",
  "graaljs",
  "hermes",
  "javascriptcore",
  "kiesel",
  "libjs",
  "nashorn",
  "node",
  "quickjs",
  "spidermonkey",
  "v8",
  "xs",

  /* Browser hosts */
  "chrome",
  "edge",
  "firefox",
  "remote",
  "safari",
]);

export async function createAgent(type, options) {
  if (!SUPPORTED_HOSTS.has(type)) {
    throw new Error(
      `Agent for '${type}' not supported. Supported host type names are ${Array.from(
        SUPPORTED_HOSTS,
      )
        .map((x) => `'${x}'`)
        .join(", ")}`,
    );
  }

  const { default: Agent } = await import(new URL(`./agents/${type}.js`, import.meta.url));

  const agent = new Agent(options);
  return agent.initialize();
}

export const source = {
  getDependencies,
  hasModuleSpecifier,
  writeSources,
  getSource(fileName) {
    return rawSource.get(fileName);
  },
};
