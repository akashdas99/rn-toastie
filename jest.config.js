/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/test/mocks/reanimated.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json', diagnostics: true }],
  },
};
