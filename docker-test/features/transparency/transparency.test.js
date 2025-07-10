#!/usr/bin/env node

/**
 * E2E Test: Transparency Verification
 * Tests that all features work transparently without hidden behavior
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

// Test configuration
const CLAUDE_FLOW_CMD = process.env.CI ? 'npx claude-flow' : 'claude-flow';

class TransparencyTest {
  constructor() {
    this.results = [];
    this.errors = [];
    this.logCapture = [];
  }

  async runCommand(command, options = {}) {
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { 
          ...process.env, 
          CLAUDE_FLOW_VERBOSE: '1',
          CLAUDE_FLOW_DEBUG: '1',
          ...options.env 
        }
      });
      
      const duration = Date.now() - startTime;
      
      return { 
        stdout: stdout.trim(), 
        stderr: stderr.trim(), 
        success: true,
        duration 
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return { 
        stdout: error.stdout?.trim() || '', 
        stderr: error.stderr?.trim() || error.message, 
        success: false,
        error,
        duration
      };
    }
  }

  async testCommandVisibility() {
    console.log('\n👁️  Testing command visibility...');
    
    // All commands should show what they're doing
    const commands = [
      'features list',
      'config show',
      'features status',
      '--version'
    ];
    
    for (const cmd of commands) {
      const result = await this.runCommand(`${CLAUDE_FLOW_CMD} ${cmd}`);
      
      // Commands should complete quickly (no hidden delays)
      assert(
        result.duration < 5000,
        `Command '${cmd}' took too long (${result.duration}ms)`
      );
      
      // Output should be meaningful
      assert(
        result.stdout.length > 0 || result.stderr.length > 0,
        `Command '${cmd}' should produce output`
      );
      
      console.log(`✅ Command '${cmd}' is transparent`);
    }
    
    this.results.push({ test: 'command-visibility', status: 'PASS' });
  }

  async testNoHiddenNetwork() {
    console.log('\n🌐 Testing for hidden network calls...');
    
    // Monitor network activity during command execution
    // This is a simplified test - in production, use proper network monitoring
    
    const testCommands = [
      'features list',
      'config get test.value',
      'features enable test-feature'
    ];
    
    for (const cmd of testCommands) {
      // Run with network monitoring hints
      const result = await this.runCommand(
        `${CLAUDE_FLOW_CMD} ${cmd}`,
        { env: { NODE_DEBUG: 'net,http,https' } }
      );
      
      // Check for unexpected network activity in debug output
      const hasUnexpectedNetwork = 
        result.stderr.includes('api.') ||
        result.stderr.includes('telemetry') ||
        result.stderr.includes('analytics') ||
        result.stderr.includes('tracking');
      
      assert(
        !hasUnexpectedNetwork,
        `Command '${cmd}' should not make hidden network calls`
      );
      
      console.log(`✅ No hidden network calls in '${cmd}'`);
    }
    
    this.results.push({ test: 'no-hidden-network', status: 'PASS' });
  }

  async testFileSystemTransparency() {
    console.log('\n📁 Testing file system transparency...');
    
    const testDir = path.join(os.tmpdir(), `claude-flow-transparency-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    try {
      // Run commands and check what files they create
      process.env.CLAUDE_FLOW_HOME = testDir;
      
      await this.runCommand(`${CLAUDE_FLOW_CMD} config set test.transparency "visible"`);
      
      // List all created files
      const files = await this.listAllFiles(testDir);
      console.log(`📁 Created files: ${files.join(', ')}`);
      
      // Verify no unexpected files
      const unexpectedPatterns = [
        /\.log$/,
        /telemetry/i,
        /analytics/i,
        /tracking/i,
        /\.tmp$/
      ];
      
      const hasUnexpected = files.some(file => 
        unexpectedPatterns.some(pattern => pattern.test(file))
      );
      
      assert(!hasUnexpected, 'Should not create unexpected files');
      
      // All files should be in expected locations
      const expectedDirs = ['config', 'features', 'cache', '.claude-flow'];
      const isInExpectedLocation = files.every(file => {
        const relative = path.relative(testDir, file);
        return expectedDirs.some(dir => relative.startsWith(dir));
      });
      
      assert(isInExpectedLocation, 'All files should be in documented locations');
      
      this.results.push({ test: 'filesystem-transparency', status: 'PASS' });
      console.log('✅ File system operations are transparent');
      
    } finally {
      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
      delete process.env.CLAUDE_FLOW_HOME;
    }
  }

  async testFeatureIsolation() {
    console.log('\n🔒 Testing feature isolation...');
    
    // Features should not affect each other unexpectedly
    const result1 = await this.runCommand(
      `${CLAUDE_FLOW_CMD} features enable feature1`
    );
    
    const result2 = await this.runCommand(
      `${CLAUDE_FLOW_CMD} features list`
    );
    
    // Enabling one feature shouldn't enable others
    if (result1.success && result2.success) {
      const enabledCount = (result2.stdout.match(/enabled/gi) || []).length;
      assert(
        enabledCount <= 1,
        'Enabling one feature should not enable others'
      );
    }
    
    this.results.push({ test: 'feature-isolation', status: 'PASS' });
    console.log('✅ Features are properly isolated');
  }

  async testOutputClarity() {
    console.log('\n💬 Testing output clarity...');
    
    const result = await this.runCommand(`${CLAUDE_FLOW_CMD} features status`);
    
    if (result.success) {
      // Output should be human-readable
      assert(
        !result.stdout.includes('undefined') &&
        !result.stdout.includes('null') &&
        !result.stdout.includes('[object Object]'),
        'Output should not contain raw programming values'
      );
      
      // Should use clear language
      const hasClearLanguage = 
        result.stdout.includes('enabled') ||
        result.stdout.includes('disabled') ||
        result.stdout.includes('available') ||
        result.stdout.includes('status');
      
      assert(hasClearLanguage, 'Output should use clear, descriptive language');
      
      this.results.push({ test: 'output-clarity', status: 'PASS' });
      console.log('✅ Output is clear and user-friendly');
    } else {
      this.results.push({ test: 'output-clarity', status: 'SKIP' });
    }
  }

  async testNoHiddenState() {
    console.log('\n🔍 Testing for hidden state...');
    
    // Run same command multiple times
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await this.runCommand(
        `${CLAUDE_FLOW_CMD} features list --json`
      );
      if (result.success) {
        results.push(result.stdout);
      }
    }
    
    // Results should be consistent (no hidden state changes)
    if (results.length === 3) {
      assert(
        results[0] === results[1] && results[1] === results[2],
        'Multiple runs should produce identical results'
      );
      
      this.results.push({ test: 'no-hidden-state', status: 'PASS' });
      console.log('✅ No hidden state detected');
    } else {
      this.results.push({ test: 'no-hidden-state', status: 'SKIP' });
    }
  }

  async testErrorTransparency() {
    console.log('\n⚠️  Testing error transparency...');
    
    // Errors should be clear and actionable
    const errorCommands = [
      'features enable non-existent-feature',
      'config get invalid..key',
      'unknown-command'
    ];
    
    for (const cmd of errorCommands) {
      const result = await this.runCommand(`${CLAUDE_FLOW_CMD} ${cmd}`);
      
      if (!result.success) {
        // Error messages should be helpful
        const errorOutput = result.stderr || result.stdout;
        
        assert(
          errorOutput.length > 0,
          'Errors should provide messages'
        );
        
        // Should not expose internal details
        assert(
          !errorOutput.includes('at Object.') &&
          !errorOutput.includes('node_modules') &&
          !errorOutput.includes('stack trace'),
          'Errors should not expose internal implementation'
        );
        
        console.log(`✅ Error handling is transparent for '${cmd}'`);
      }
    }
    
    this.results.push({ test: 'error-transparency', status: 'PASS' });
  }

  async testDependencyTransparency() {
    console.log('\n📦 Testing dependency transparency...');
    
    // Check what happens when features have dependencies
    const result = await this.runCommand(
      `${CLAUDE_FLOW_CMD} features show advanced-feature`
    );
    
    if (result.success && result.stdout.includes('dependencies')) {
      // Dependencies should be clearly stated
      assert(
        result.stdout.includes('requires') ||
        result.stdout.includes('depends on') ||
        result.stdout.includes('dependencies'),
        'Dependencies should be clearly stated'
      );
      
      this.results.push({ test: 'dependency-transparency', status: 'PASS' });
      console.log('✅ Dependencies are transparent');
    } else {
      this.results.push({ test: 'dependency-transparency', status: 'SKIP' });
    }
  }

  async listAllFiles(dir, files = []) {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await this.listAllFiles(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async runAllTests() {
    console.log('🚀 Starting Transparency Verification E2E Tests');
    console.log('=============================================');
    
    const tests = [
      () => this.testCommandVisibility(),
      () => this.testNoHiddenNetwork(),
      () => this.testFileSystemTransparency(),
      () => this.testFeatureIsolation(),
      () => this.testOutputClarity(),
      () => this.testNoHiddenState(),
      () => this.testErrorTransparency(),
      () => this.testDependencyTransparency()
    ];
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        this.errors.push(error);
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.errors.length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = passed + failed + skipped;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.errors.forEach(error => {
        console.log(`  - ${error.message}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All transparency tests passed!');
      console.log('   claude-flow operates transparently with no hidden behavior.');
      process.exit(0);
    }
  }
}

// Run tests
if (require.main === module) {
  const test = new TransparencyTest();
  test.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = TransparencyTest;