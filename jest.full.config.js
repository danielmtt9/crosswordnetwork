const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Full/legacy test matrix (includes suites that are currently out-of-scope for launch).
// Kept so we can re-enable these gradually without losing the config.
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
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!tests/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Use ts-jest for TypeScript, babel-jest for JavaScript
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter)/)'],
  projects: [
    {
      displayName: 'Unit Tests - API Routes',
      testMatch: ['<rootDir>/src/app/api/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)'],
    },
    {
      displayName: 'Unit Tests - Components',
      testMatch: [
        '<rootDir>/src/components/**/*.test.tsx',
        '<rootDir>/src/hooks/**/*.test.ts',
        '<rootDir>/src/lib/**/*.test.ts',
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)'],
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/setup/integration.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)'],
      testTimeout: 30000,
    },
    {
      displayName: 'End-to-End Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/setup/e2e.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)'],
      testTimeout: 60000,
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/setup/performance.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)'],
      testTimeout: 120000,
    },
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/setup/security.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)'],
      testTimeout: 30000,
    },
    {
      displayName: 'MCP Tests',
      testMatch: ['<rootDir>/tests/mcp/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/setup/mcp.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: ['node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)'],
      testTimeout: 45000,
    },
  ],
}

module.exports = createJestConfig(customJestConfig)

