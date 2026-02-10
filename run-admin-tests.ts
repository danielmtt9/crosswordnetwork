#!/usr/bin/env tsx

/**
 * Admin and Superadmin Test Runner
 * 
 * This script runs comprehensive tests for all admin and superadmin features
 * including authentication, authorization, user management, system health,
 * audit logging, security monitoring, and session management.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const TEST_PATTERNS = [
  'src/lib/__tests__/superAdmin.test.ts',
  'src/app/api/admin/__tests__/users.test.ts',
  'src/app/api/admin/__tests__/health.test.ts',
  'src/app/api/admin/__tests__/audit.test.ts',
  'src/app/api/admin/__tests__/stats.test.ts',
  'src/app/api/admin/__tests__/bulk-operations.test.ts',
  'src/app/api/admin/__tests__/feature-flags.test.ts',
  'src/app/api/admin/__tests__/security.test.ts',
  'src/app/api/admin/__tests__/sessions.test.ts',
  'src/components/__tests__/admin/AdminDashboard.test.tsx',
  'src/__tests__/admin-integration.test.ts',
];

const TEST_COMMANDS = {
  'vitest': 'npx vitest run',
  'jest': 'npx jest',
  'tsx': 'npx tsx --test',
};

function findTestRunner(): string {
  // Check for package.json to determine test runner
  if (existsSync('package.json')) {
    const packageJson = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    if (scripts.test?.includes('vitest')) return 'vitest';
    if (scripts.test?.includes('jest')) return 'jest';
    if (scripts.test?.includes('tsx')) return 'tsx';
  }
  
  // Default to vitest
  return 'vitest';
}

function runTests(): void {
  console.log('🧪 Running Admin & Superadmin Tests...\n');
  
  const testRunner = findTestRunner();
  console.log(`📦 Using test runner: ${testRunner}\n`);
  
  try {
    // Run all admin tests
    const testFiles = TEST_PATTERNS.join(' ');
    const command = `${TEST_COMMANDS[testRunner as keyof typeof TEST_COMMANDS]} ${testFiles}`;
    
    console.log(`🚀 Executing: ${command}\n`);
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n✅ All admin tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:');
    console.error(error);
    process.exit(1);
  }
}

function checkTestFiles(): void {
  console.log('🔍 Checking test files...\n');
  
  const missingFiles: string[] = [];
  
  TEST_PATTERNS.forEach(pattern => {
    if (!existsSync(pattern)) {
      missingFiles.push(pattern);
    }
  });
  
  if (missingFiles.length > 0) {
    console.warn('⚠️  Missing test files:');
    missingFiles.forEach(file => console.warn(`   - ${file}`));
    console.log('');
  } else {
    console.log('✅ All test files found\n');
  }
}

function displayTestSummary(): void {
  console.log('📋 Test Coverage Summary:\n');
  
  const testCategories = [
    {
      name: 'SuperAdmin Authentication',
      files: ['src/lib/__tests__/superAdmin.test.ts'],
      description: 'Tests superadmin role verification and authentication'
    },
    {
      name: 'User Management',
      files: [
        'src/app/api/admin/__tests__/users.test.ts',
        'src/app/api/admin/__tests__/bulk-operations.test.ts'
      ],
      description: 'Tests user CRUD operations, role management, and bulk actions'
    },
    {
      name: 'System Health',
      files: ['src/app/api/admin/__tests__/health.test.ts'],
      description: 'Tests system health monitoring and service status checks'
    },
    {
      name: 'Audit & Security',
      files: [
        'src/app/api/admin/__tests__/audit.test.ts',
        'src/app/api/admin/__tests__/security.test.ts'
      ],
      description: 'Tests audit logging and security monitoring features'
    },
    {
      name: 'Analytics & Stats',
      files: ['src/app/api/admin/__tests__/stats.test.ts'],
      description: 'Tests admin dashboard statistics and analytics'
    },
    {
      name: 'Feature Management',
      files: [
        'src/app/api/admin/__tests__/feature-flags.test.ts',
        'src/app/api/admin/__tests__/sessions.test.ts'
      ],
      description: 'Tests feature flags and multiplayer session management'
    },
    {
      name: 'UI Components',
      files: ['src/components/__tests__/admin/AdminDashboard.test.tsx'],
      description: 'Tests admin dashboard UI components and interactions'
    },
    {
      name: 'Integration Tests',
      files: ['src/__tests__/admin-integration.test.ts'],
      description: 'Tests end-to-end admin workflows and system integration'
    }
  ];
  
  testCategories.forEach(category => {
    console.log(`📁 ${category.name}`);
    console.log(`   ${category.description}`);
    console.log(`   Files: ${category.files.length}`);
    console.log('');
  });
  
  console.log(`📊 Total Test Files: ${TEST_PATTERNS.length}`);
  console.log(`🎯 Test Categories: ${testCategories.length}\n`);
}

function main(): void {
  console.log('🔐 Admin & Superadmin Test Suite');
  console.log('================================\n');
  
  displayTestSummary();
  checkTestFiles();
  runTests();
}

// Run the test suite
if (require.main === module) {
  main();
}

export { runTests, checkTestFiles, displayTestSummary };