#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing claude-flow npm/npx installation...\n');

const testDir = './test-npm-install';
const results = {
  setup: false,
  init: false,
  memory: false,
  persistence: false,
  cleanup: false
};

try {
  // 1. Setup test directory
  console.log('📁 Creating test directory...');
  execSync(`rm -rf ${testDir} && mkdir -p ${testDir}`);
  process.chdir(testDir);
  results.setup = true;
  console.log('✅ Test directory created\n');

  // 2. Test init command
  console.log('🚀 Testing npx claude-flow@latest init...');
  execSync('npx claude-flow@latest init', { stdio: 'inherit' });
  
  // Verify files were created
  const expectedFiles = ['CLAUDE.md', '.claude/settings.json'];
  const filesExist = expectedFiles.every(file => existsSync(file));
  results.init = filesExist;
  console.log(filesExist ? '✅ Init command successful\n' : '❌ Init command failed\n');

  // 3. Test memory operations
  console.log('💾 Testing memory operations...');
  
  // Store a value
  execSync('npx claude-flow@latest memory store npm-test "Testing from npm installation"');
  console.log('  ✅ Memory store successful');
  
  // Query the value
  const queryResult = execSync('npx claude-flow@latest memory query npm-test', { encoding: 'utf8' });
  results.memory = queryResult.includes('Testing from npm installation');
  console.log(results.memory ? '  ✅ Memory query successful\n' : '  ❌ Memory query failed\n');

  // 4. Test persistence
  console.log('🔄 Testing persistence...');
  
  // Check if memory file exists
  const memoryFiles = [
    'memory/claude-flow-data.json',
    'memory/memory-store.json',
    '.swarm/memory.db'
  ];
  
  const persistenceFile = memoryFiles.find(file => existsSync(file));
  if (persistenceFile) {
    console.log(`  ✅ Persistence file found: ${persistenceFile}`);
    
    // Verify content
    const content = readFileSync(persistenceFile, 'utf8');
    results.persistence = content.includes('npm-test');
    console.log(results.persistence ? '  ✅ Persistence verified\n' : '  ❌ Persistence verification failed\n');
  } else {
    console.log('  ❌ No persistence file found\n');
  }

  // 5. Cleanup
  console.log('🧹 Cleaning up...');
  process.chdir('..');
  execSync(`rm -rf ${testDir}`);
  results.cleanup = true;
  console.log('✅ Cleanup complete\n');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.chdir('..');
}

// Summary
console.log('📊 Test Summary:');
console.log('================');
Object.entries(results).forEach(([test, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
});

const allPassed = Object.values(results).every(v => v);
console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
process.exit(allPassed ? 0 : 1);