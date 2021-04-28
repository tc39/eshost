module.exports = {
  collectCoverage: true, // Only collect in CI
  collectCoverageFrom: [
    './test/*.js',
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
