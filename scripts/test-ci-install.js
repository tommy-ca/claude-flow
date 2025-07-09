#!/usr/bin/env node

/**
 * Test script to verify CI installation works correctly
 * Run with: CI=true node scripts/test-ci-install.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing CI Installation Process\n');

// Set CI environment
process.env.CI = 'true';
process.env.NODE_ENV = 'test';

// Test phases
const tests = [
  {
    name: 'Clean Install',
    fn: testCleanInstall
  },
  {
    name: 'Dependency Verification',
    fn: testDependencies
  },
  {
    name: 'Optional Dependencies',
    fn: testOptionalDeps
  },
  {
    name: 'Database Wrapper',
    fn: testDatabaseWrapper
  },
  {
    name: 'Postinstall Script',
    fn: testPostinstall
  }
];

let passed = 0;
let failed = 0;

// Run tests
async function runTests() {
  for (const test of tests) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log('─'.repeat(40));
      await test.fn();
      console.log(`✅ ${test.name} passed`);
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name} failed: ${error.message}`);
      failed++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Test functions
function testCleanInstall() {
  console.log('Removing node_modules...');
  execSync('rm -rf node_modules', { stdio: 'ignore' });
  
  console.log('Running npm ci...');
  execSync('npm ci', {
    env: { ...process.env, CI: 'true' },
    stdio: 'inherit'
  });
  
  // Verify node_modules exists
  if (!fs.existsSync('node_modules')) {
    throw new Error('node_modules not created');
  }
}

function testDependencies() {
  const required = [
    '@modelcontextprotocol/sdk',
    'commander',
    'chalk',
    'express',
    'ws'
  ];
  
  for (const dep of required) {
    try {
      require.resolve(dep);
      console.log(`  ✓ ${dep}`);
    } catch (e) {
      throw new Error(`Missing required dependency: ${dep}`);
    }
  }
}

function testOptionalDeps() {
  const optional = ['better-sqlite3', 'blessed'];
  
  for (const dep of optional) {
    try {
      require.resolve(dep);
      console.log(`  ✓ ${dep} (installed)`);
    } catch (e) {
      console.log(`  ℹ ${dep} (not installed - expected in CI)`);
    }
  }
}

function testDatabaseWrapper() {
  // Test that database wrapper loads without error
  try {
    const { createDatabase, dbAvailable } = require('../src/utils/database-wrapper.js');
    console.log(`  Database available: ${dbAvailable}`);
    
    if (!dbAvailable) {
      console.log('  Testing in-memory fallback...');
      const db = createDatabase(':memory:');
      
      // Test basic operations
      db.prepare('CREATE TABLE test (id INTEGER PRIMARY KEY)').run();
      db.prepare('INSERT INTO test (id) VALUES (?)').run(1);
      const result = db.prepare('SELECT * FROM test WHERE id = ?').get(1);
      
      if (!result) {
        throw new Error('In-memory database query failed');
      }
      
      db.close();
      console.log('  ✓ In-memory fallback works');
    }
  } catch (error) {
    throw new Error(`Database wrapper failed: ${error.message}`);
  }
}

function testPostinstall() {
  console.log('Running postinstall script...');
  
  try {
    execSync('node scripts/postinstall.js', {
      env: { ...process.env, CI: 'true' },
      stdio: 'inherit'
    });
  } catch (error) {
    throw new Error(`Postinstall failed: ${error.message}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});