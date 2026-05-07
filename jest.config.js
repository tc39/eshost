const jestConfig = {
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/lib/**/*.js"],
  coverageDirectory: "./coverage",
  // coverageThreshold: {
  //   global: {
  //     branches: 25,
  //     functions: 25,
  //     lines: 30,
  //     statements: 30,
  //   },
  // },
  rootDir: "./",
  testMatch: ["<rootDir>/test/*.js", "<rootDir>/test/agents/*.js"],
  testPathIgnorePatterns: [],
  transform: {},
  verbose: true,
};

if (!process.env.CI) {
  jestConfig.collectCoverageFrom.push(
    "!<rootDir>/lib/BrowserAgent.js",
    "!<rootDir>/lib/Server.js",
    "!<rootDir>/lib/WebdriverAgent.js",
    "!<rootDir>/lib/agents/chrome.js",
    "!<rootDir>/lib/agents/edge.js",
    "!<rootDir>/lib/agents/firefox.js",
    "!<rootDir>/lib/agents/remote.js",
    "!<rootDir>/lib/agents/safari.js",
  );
}

export default jestConfig;
export { jestConfig };
