const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Launch-scope Jest config: single-player + admin + persistence + hints.
// The full legacy matrix is preserved in `jest.full.config.js`.
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Use ts-jest for TypeScript, babel-jest for JavaScript
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
    '^.+\.(js|jsx|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@auth|next-auth|@auth/prisma-adapter)/)',
  ],
  projects: [
    {
      displayName: 'Unit Tests - API Routes',
      // Only API routes that power launch scope (puzzles, hints, admin puzzle upload).
      testMatch: [
        '<rootDir>/src/app/api/puzzles/**/*.test.ts',
        '<rootDir>/src/app/api/hints/**/*.test.ts',
        '<rootDir>/src/app/api/contact/**/*.test.ts',
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          }
        }],
        '^.+\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)',
      ],
    },
    {
      displayName: 'Unit Tests - Components',
      // Only UI/hooks/libs used in single-player puzzle flow and persistence/hints.
      testMatch: [
        '<rootDir>/src/components/puzzle/**/*.test.tsx',
        '<rootDir>/src/components/layouts/**/*.test.tsx',
        '<rootDir>/src/hooks/useAutoSave.test.ts',
        '<rootDir>/src/hooks/useDeviceType.test.ts',
        '<rootDir>/src/hooks/useIframeMessage.test.ts',
        '<rootDir>/src/lib/iframeMessaging.test.ts',
        '<rootDir>/src/lib/layoutDetection.test.ts',
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          }
        }],
        '^.+\.(js|jsx|mjs)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@auth|next-auth|@auth/prisma-adapter|@auth/core)/)',
      ],
    },
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
