const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  // Use ts-jest for TypeScript transformation
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@auth|next-auth|@auth/prisma-adapter)/)',
  ],
  projects: [
    {
      displayName: 'API Routes',
      testMatch: ['<rootDir>/src/app/api/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      preset: 'ts-jest',
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
        '^.+\\.mjs$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)',
      ],
    },
    {
      displayName: 'Components',
      testMatch: ['<rootDir>/src/components/**/*.test.tsx', '<rootDir>/src/hooks/**/*.test.ts', '<rootDir>/src/lib/**/*.test.ts'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      preset: 'ts-jest',
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
        '^.+\\.mjs$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)',
      ],
    },
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
