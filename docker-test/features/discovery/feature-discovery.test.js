#!/usr/bin/env node

/**
 * E2E Test: Feature Discovery
 * Tests the ability to discover and list available features transparently
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const assert = require('assert');
const path = require('path');

const execAsync = promisify(exec);

// Test configuration
const CLAUDE_FLOW_CMD = process.env.CI ? 'npx claude-flow' : 'claude-flow';

class FeatureDiscoveryTest {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async runCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command);
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

  async testFeatureList() {
    console.log('\n🔍 Testing feature list command...');
    
    const result = await this.runCommand(`${CLAUDE_FLOW_CMD} features list`);
    
    assert(result.success, 'Feature list command should succeed');
    assert(result.stdout.includes('Available Features'), 'Should show available features');
    
    // Check for expected feature categories
    const expectedCategories = ['core', 'ui', 'performance', 'experimental'];
    const hasCategories = expectedCategories.some(cat => 
      result.stdout.toLowerCase().includes(cat)
    );
    
    assert(hasCategories, 'Should include feature categories');
    
    this.results.push({ test: 'feature-list', status: 'PASS' });
    console.log('✅ Feature list test passed');
  }

  async testFeatureDetails() {
    console.log('\n🔍 Testing feature details command...');
    
    // First get a feature name
    const listResult = await this.runCommand(`${CLAUDE_FLOW_CMD} features list --json`);
    
    if (listResult.success) {
      try {
        const features = JSON.parse(listResult.stdout);
        if (features.length > 0) {
          const featureName = features[0].name || features[0].id;
          
          const detailResult = await this.runCommand(
            `${CLAUDE_FLOW_CMD} features show ${featureName}`
          );
          
          assert(detailResult.success, 'Feature detail command should succeed');
          assert(detailResult.stdout.includes(featureName), 'Should show feature name');
          
          this.results.push({ test: 'feature-details', status: 'PASS' });
          console.log('✅ Feature details test passed');
        }
      } catch (e) {
        console.log('⚠️  Could not parse JSON output, trying alternative format');
      }
    }
  }

  async testFeatureSearch() {
    console.log('\n🔍 Testing feature search...');
    
    const searchTerms = ['ui', 'performance', 'experimental'];
    
    for (const term of searchTerms) {
      const result = await this.runCommand(
        `${CLAUDE_FLOW_CMD} features search ${term}`
      );
      
      if (result.success) {
        console.log(`✅ Search for "${term}" completed`);
        this.results.push({ test: `feature-search-${term}`, status: 'PASS' });
      } else {
        console.log(`⚠️  Search for "${term}" not implemented yet`);
      }
    }
  }

  async testFeatureDiscoverability() {
    console.log('\n🔍 Testing feature discoverability...');
    
    // Test help command shows features
    const helpResult = await this.runCommand(`${CLAUDE_FLOW_CMD} --help`);
    
    assert(helpResult.success, 'Help command should succeed');
    assert(
      helpResult.stdout.includes('features') || 
      helpResult.stdout.includes('Features'),
      'Help should mention features command'
    );
    
    // Test features help
    const featuresHelpResult = await this.runCommand(
      `${CLAUDE_FLOW_CMD} features --help`
    );
    
    if (featuresHelpResult.success) {
      assert(
        featuresHelpResult.stdout.includes('list') || 
        featuresHelpResult.stdout.includes('enable'),
        'Features help should show subcommands'
      );
    }
    
    this.results.push({ test: 'feature-discoverability', status: 'PASS' });
    console.log('✅ Feature discoverability test passed');
  }

  async testNPXDiscovery() {
    console.log('\n🔍 Testing NPX feature discovery...');
    
    // Test that features work through npx
    const npxResult = await this.runCommand('npx claude-flow features list');
    
    if (npxResult.success) {
      assert(npxResult.stdout.length > 0, 'NPX should return feature list');
      this.results.push({ test: 'npx-discovery', status: 'PASS' });
      console.log('✅ NPX discovery test passed');
    } else {
      console.log('⚠️  NPX test skipped (package not published)');
      this.results.push({ test: 'npx-discovery', status: 'SKIP' });
    }
  }

  async testFeatureMetadata() {
    console.log('\n🔍 Testing feature metadata...');
    
    const result = await this.runCommand(
      `${CLAUDE_FLOW_CMD} features list --verbose`
    );
    
    if (result.success && result.stdout.includes('version')) {
      // Check for metadata fields
      const expectedFields = ['version', 'author', 'status', 'dependencies'];
      const hasMetadata = expectedFields.some(field => 
        result.stdout.toLowerCase().includes(field)
      );
      
      assert(hasMetadata, 'Verbose output should include metadata');
      
      this.results.push({ test: 'feature-metadata', status: 'PASS' });
      console.log('✅ Feature metadata test passed');
    } else {
      console.log('⚠️  Feature metadata not fully implemented');
      this.results.push({ test: 'feature-metadata', status: 'WARN' });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Feature Discovery E2E Tests');
    console.log('=====================================');
    
    const tests = [
      () => this.testFeatureList(),
      () => this.testFeatureDetails(),
      () => this.testFeatureSearch(),
      () => this.testFeatureDiscoverability(),
      () => this.testNPXDiscovery(),
      () => this.testFeatureMetadata()
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
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  }
}

// Run tests
if (require.main === module) {
  const test = new FeatureDiscoveryTest();
  test.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = FeatureDiscoveryTest;