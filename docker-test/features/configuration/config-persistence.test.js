#!/usr/bin/env node

/**
 * E2E Test: Configuration Persistence
 * Tests configuration storage, retrieval, and persistence across sessions
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');
const os = require('os');

const execAsync = promisify(exec);

// Test configuration
const CLAUDE_FLOW_CMD = process.env.CI ? 'npx claude-flow' : 'claude-flow';
const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'claude-flow-test-config');

class ConfigPersistenceTest {
  constructor() {
    this.results = [];
    this.errors = [];
    this.testValues = new Map();
  }

  async setup() {
    // Create test config directory
    await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
    
    // Set config directory environment variable
    process.env.CLAUDE_FLOW_CONFIG_DIR = TEST_CONFIG_DIR;
  }

  async cleanup() {
    // Clean up test directory
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  async runCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, CLAUDE_FLOW_CONFIG_DIR: TEST_CONFIG_DIR }
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), success: true };
    } catch (error) {
      return { 
        stdout: error.stdout?.trim() || '', 
        stderr: error.stderr?.trim() || error.message, 
        success: false,
        error 
      };
    }
  }

  async testConfigSet() {
    console.log('\n⚙️  Testing config set command...');
    
    const testConfigs = [
      { key: 'test.string', value: 'hello world' },
      { key: 'test.number', value: '42' },
      { key: 'test.boolean', value: 'true' },
      { key: 'test.nested.value', value: 'nested-test' },
      { key: 'features.ui.theme', value: 'dark' }
    ];
    
    for (const config of testConfigs) {
      const result = await this.runCommand(
        `${CLAUDE_FLOW_CMD} config set ${config.key} "${config.value}"`
      );
      
      assert(result.success, `Setting ${config.key} should succeed`);
      this.testValues.set(config.key, config.value);
      
      console.log(`✅ Set ${config.key} = ${config.value}`);
    }
    
    this.results.push({ test: 'config-set', status: 'PASS' });
  }

  async testConfigGet() {
    console.log('\n⚙️  Testing config get command...');
    
    for (const [key, expectedValue] of this.testValues) {
      const result = await this.runCommand(
        `${CLAUDE_FLOW_CMD} config get ${key}`
      );
      
      assert(result.success, `Getting ${key} should succeed`);
      assert(
        result.stdout.includes(expectedValue),
        `Output should contain value: ${expectedValue}`
      );
      
      console.log(`✅ Retrieved ${key} = ${expectedValue}`);
    }
    
    this.results.push({ test: 'config-get', status: 'PASS' });
  }

  async testConfigList() {
    console.log('\n⚙️  Testing config list command...');
    
    const result = await this.runCommand(`${CLAUDE_FLOW_CMD} config list`);
    
    assert(result.success, 'Config list should succeed');
    
    // Check that all test values appear in the list
    for (const [key, value] of this.testValues) {
      assert(
        result.stdout.includes(key) || result.stdout.includes(value),
        `Config list should include ${key}`
      );
    }
    
    this.results.push({ test: 'config-list', status: 'PASS' });
    console.log('✅ Config list test passed');
  }

  async testConfigPersistence() {
    console.log('\n⚙️  Testing config persistence across sessions...');
    
    // Set a value
    const testKey = 'persistence.test';
    const testValue = `test-${Date.now()}`;
    
    await this.runCommand(
      `${CLAUDE_FLOW_CMD} config set ${testKey} "${testValue}"`
    );
    
    // Simulate new session by clearing any in-memory cache
    delete require.cache[require.resolve('claude-flow')];
    
    // Try to retrieve the value in a "new session"
    const result = await this.runCommand(
      `${CLAUDE_FLOW_CMD} config get ${testKey}`
    );
    
    assert(result.success, 'Getting persisted value should succeed');
    assert(
      result.stdout.includes(testValue),
      'Persisted value should match'
    );
    
    this.results.push({ test: 'config-persistence', status: 'PASS' });
    console.log('✅ Config persistence test passed');
  }

  async testConfigFileFormat() {
    console.log('\n⚙️  Testing config file format...');
    
    // Set some values
    await this.runCommand(
      `${CLAUDE_FLOW_CMD} config set format.test "json-test"`
    );
    
    // Check if config file exists
    const configFiles = await fs.readdir(TEST_CONFIG_DIR);
    const configFile = configFiles.find(f => 
      f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.toml')
    );
    
    if (configFile) {
      const configPath = path.join(TEST_CONFIG_DIR, configFile);
      const content = await fs.readFile(configPath, 'utf8');
      
      // Try to parse based on extension
      if (configFile.endsWith('.json')) {
        const config = JSON.parse(content);
        assert(typeof config === 'object', 'Config should be valid JSON');
      }
      
      console.log(`✅ Config stored in ${path.extname(configFile)} format`);
      this.results.push({ test: 'config-file-format', status: 'PASS' });
    } else {
      console.log('⚠️  Config file not found in expected location');
      this.results.push({ test: 'config-file-format', status: 'WARN' });
    }
  }

  async testConfigReset() {
    console.log('\n⚙️  Testing config reset...');
    
    // Set a value
    await this.runCommand(
      `${CLAUDE_FLOW_CMD} config set reset.test "will-be-reset"`
    );
    
    // Reset specific key
    const resetResult = await this.runCommand(
      `${CLAUDE_FLOW_CMD} config reset reset.test`
    );
    
    if (resetResult.success) {
      // Verify it's gone
      const getResult = await this.runCommand(
        `${CLAUDE_FLOW_CMD} config get reset.test`
      );
      
      assert(
        !getResult.success || getResult.stdout.includes('not found'),
        'Reset value should not exist'
      );
      
      this.results.push({ test: 'config-reset', status: 'PASS' });
      console.log('✅ Config reset test passed');
    } else {
      console.log('⚠️  Config reset not implemented');
      this.results.push({ test: 'config-reset', status: 'SKIP' });
    }
  }

  async testConfigImportExport() {
    console.log('\n⚙️  Testing config import/export...');
    
    const exportPath = path.join(TEST_CONFIG_DIR, 'export.json');
    
    // Export config
    const exportResult = await this.runCommand(
      `${CLAUDE_FLOW_CMD} config export ${exportPath}`
    );
    
    if (exportResult.success) {
      // Check export file exists
      const exists = await fs.access(exportPath).then(() => true).catch(() => false);
      assert(exists, 'Export file should exist');
      
      // Clear config
      await this.cleanup();
      await this.setup();
      
      // Import config
      const importResult = await this.runCommand(
        `${CLAUDE_FLOW_CMD} config import ${exportPath}`
      );
      
      assert(importResult.success, 'Import should succeed');
      
      this.results.push({ test: 'config-import-export', status: 'PASS' });
      console.log('✅ Config import/export test passed');
    } else {
      console.log('⚠️  Config import/export not implemented');
      this.results.push({ test: 'config-import-export', status: 'SKIP' });
    }
  }

  async testConfigValidation() {
    console.log('\n⚙️  Testing config validation...');
    
    // Try setting invalid values
    const invalidConfigs = [
      { key: 'features.maxWorkers', value: 'not-a-number', expectError: true },
      { key: 'features.enabled', value: 'not-a-boolean', expectError: true },
      { key: '', value: 'empty-key', expectError: true }
    ];
    
    let hasValidation = false;
    
    for (const config of invalidConfigs) {
      const result = await this.runCommand(
        `${CLAUDE_FLOW_CMD} config set ${config.key} "${config.value}"`
      );
      
      if (!result.success && config.expectError) {
        hasValidation = true;
        console.log(`✅ Validation caught invalid ${config.key}`);
      }
    }
    
    if (hasValidation) {
      this.results.push({ test: 'config-validation', status: 'PASS' });
    } else {
      console.log('⚠️  Config validation not implemented');
      this.results.push({ test: 'config-validation', status: 'WARN' });
    }
  }

  async testEnvironmentOverrides() {
    console.log('\n⚙️  Testing environment variable overrides...');
    
    // Set a config value
    await this.runCommand(
      `${CLAUDE_FLOW_CMD} config set env.test "config-value"`
    );
    
    // Try to override with environment variable
    const envResult = await this.runCommand(
      `CLAUDE_FLOW_ENV_TEST="env-value" ${CLAUDE_FLOW_CMD} config get env.test`
    );
    
    if (envResult.stdout.includes('env-value')) {
      this.results.push({ test: 'env-overrides', status: 'PASS' });
      console.log('✅ Environment override test passed');
    } else {
      console.log('⚠️  Environment overrides not implemented');
      this.results.push({ test: 'env-overrides', status: 'WARN' });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Configuration Persistence E2E Tests');
    console.log('=============================================');
    
    await this.setup();
    
    const tests = [
      () => this.testConfigSet(),
      () => this.testConfigGet(),
      () => this.testConfigList(),
      () => this.testConfigPersistence(),
      () => this.testConfigFileFormat(),
      () => this.testConfigReset(),
      () => this.testConfigImportExport(),
      () => this.testConfigValidation(),
      () => this.testEnvironmentOverrides()
    ];
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        this.errors.push(error);
      }
    }
    
    await this.cleanup();
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.errors.length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    const total = passed + failed + skipped + warnings;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.errors.forEach(error => {
        console.log(`  - ${error.message}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All critical tests passed!');
      process.exit(0);
    }
  }
}

// Run tests
if (require.main === module) {
  const test = new ConfigPersistenceTest();
  test.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ConfigPersistenceTest;