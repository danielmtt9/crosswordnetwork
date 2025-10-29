#!/usr/bin/env tsx

/**
 * Admin and Superadmin Jest Test Runner
 * 
 * This script runs comprehensive tests for all admin and superadmin features
 * using the existing Jest configuration.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const JEST_TEST_PATTERNS = [
  'src/lib/__tests__/superAdmin.jest.test.ts',
  'src/app/api/admin/__tests__/users.jest.test.ts',
];

function runJestTests(): void {
  console.log('🧪 Running Admin & Superadmin Jest Tests...\n');
  
  try {
    // Run Jest tests with specific patterns
    const testFiles = JEST_TEST_PATTERNS.join(' ');
    const command = `npx jest ${testFiles} --verbose --no-cache`;
    
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
  console.log('🔍 Checking Jest test files...\n');
  
  const missingFiles: string[] = [];
  
  JEST_TEST_PATTERNS.forEach(pattern => {
    if (!existsSync(pattern)) {
      missingFiles.push(pattern);
    }
  });
  
  if (missingFiles.length > 0) {
    console.warn('⚠️  Missing test files:');
    missingFiles.forEach(file => console.warn(`   - ${file}`));
    console.log('');
  } else {
    console.log('✅ All Jest test files found\n');
  }
}

function displayTestSummary(): void {
  console.log('📋 Jest Test Coverage Summary:\n');
  
  const testCategories = [
    {
      name: 'SuperAdmin Authentication',
      files: ['src/lib/__tests__/superAdmin.jest.test.ts'],
      description: 'Tests superadmin role verification and authentication'
    },
    {
      name: 'User Management API',
      files: ['src/app/api/admin/__tests__/users.jest.test.ts'],
      description: 'Tests user CRUD operations and role management'
    }
  ];
  
  testCategories.forEach(category => {
    console.log(`📁 ${category.name}`);
    console.log(`   ${category.description}`);
    console.log(`   Files: ${category.files.length}`);
    console.log('');
  });
  
  console.log(`📊 Total Jest Test Files: ${JEST_TEST_PATTERNS.length}`);
  console.log(`🎯 Test Categories: ${testCategories.length}\n`);
}

function main(): void {
  console.log('🔐 Admin & Superadmin Jest Test Suite');
  console.log('=====================================\n');
  
  displayTestSummary();
  checkTestFiles();
  runJestTests();
}

// Run the test suite
if (require.main === module) {
  main();
}

export { runJestTests, checkTestFiles, displayTestSummary };