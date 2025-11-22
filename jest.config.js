export default {
  testEnvironment: "jsdom",
  transform: {},
  verbose: true,
  moduleFileExtensions: ["js", "mjs"],
  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.spec.js"
  ],
  moduleNameMapper: {
    "^\\.\\./lib/firebase\\.js$": "<rootDir>/tests/fixtures/firebaseProxy.js"
  },
  setupFilesAfterEnv: ["<rootDir>/codex_output/tests/setup-require.js"],

  // ✅ Coverage configuration: limit to TDD-managed paths
  collectCoverage: true,
  collectCoverageFrom: [
    "scripts/admin/**/*.js",    // actively TDD’d modules
    "src/**/*.js",              // new code under src/
    "!scripts/legacy/**",       // exclude legacy/old code
    "!scripts/vendor/**",
    "!**/node_modules/**",
    "!**/tests/**",
    "!**/*.config.js"           // skip configs
  ],
  coverageDirectory: "codex_output/coverage",
  coverageReporters: ["text", "lcov", "json", "clover"]
};
