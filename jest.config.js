module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/backend'],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/backend/__tests__/setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/__tests__/**',
    '!backend/scripts/**',
    '!backend/server.js',
    '!backend/start-production.js',
  ],
};
