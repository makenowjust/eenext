module.exports = {
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      skipBabel: true,
    },
  },
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)test.ts'],
  testEnvironment: 'node',
};
