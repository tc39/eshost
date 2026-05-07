import { supportedHostsMap } from "./supported-hosts.js";

const browsers = ["chrome", "edge", "firefox", "remote", "safari"];

function forHost(hostType) {
  const fileName = browsers.includes(hostType) ? "browser.js" : `${supportedHostsMap[hostType]}.js`;
  return new URL(`../runtimes/${fileName}`, import.meta.url);
}

export { forHost as for };
