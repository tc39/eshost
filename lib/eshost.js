import { getDependencies, hasModuleSpecifier, rawSource } from "./dependencies.js";
import { writeSources } from "./write-sources.js";
import { supportedHosts, supportedHostsMap } from "./supported-hosts.js";

export { supportedHosts };

export const normalizeHostForVU = (hostType) => supportedHostsMap[hostType] || hostType;

export async function createAgent(type, options) {
  const hostType = normalizeHostForVU(type);

  try {
    const { default: Agent } = await import(new URL(`./agents/${hostType}.js`, import.meta.url));

    const agent = new Agent(options);
    return agent.initialize();
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && error.message.includes(`/agents/${hostType}.js`)) {
      throw new Error(
        `Agent for '${hostType}' not supported. Supported host type names are '${supportedHosts.join(", ")}'`,
        { cause: error },
      );
    } else {
      throw error;
    }
  }
}

export const source = {
  getDependencies,
  hasModuleSpecifier,
  writeSources,
  getSource(fileName) {
    return rawSource.get(fileName);
  },
};
