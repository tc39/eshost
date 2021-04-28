const jestConfig = {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/lib/**/*.js',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 30,
      statements: 30,
    },
  },
  rootDir: './',
  testMatch: ['<rootDir>/test/*.js'],
  testPathIgnorePatterns: [],
  verbose: true,
};

if (!process.env.CI) {
  jestConfig.collectCoverageFrom.push(
    '!<rootDir>/lib/Server.js',
    '!<rootDir>/lib/WebdriverAgent.js',
    '!<rootDir>/lib/agents/BrowserAgent.js',
    '!<rootDir>/lib/agents/chrome.js',
    '!<rootDir>/lib/agents/edge.js',
    '!<rootDir>/lib/agents/firefox.js',
    '!<rootDir>/lib/agents/remote.js',
    '!<rootDir>/lib/agents/safari.js'
  );

}

module.exports = jestConfig;