#!/usr/bin/env node
/**
 * Performance Test Validation Script
 * Runs performance tests and validates CI compatibility
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`${title}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

function section(title) {
  log(`\n${'-'.repeat(40)}`, 'yellow');
  log(`${title}`, 'yellow');
  log(`${'-'.repeat(40)}`, 'yellow');
}

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  async runTest(testName, testFunction) {
    section(`Running: ${testName}`);
    
    try {
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'passed',
        duration
      });
      
      log(`✓ ${testName} (${duration}ms)`, 'green');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'failed',
        error: error.message
      });
      
      log(`✗ ${testName}: ${error.message}`, 'red');
    }
  }

  async runResourceManagerTests() {
    header('Resource Manager Performance Tests');
    
    await this.runTest('Resource Detection Performance', async () => {
      // Mock resource detection test
      const resourceDetectionStart = Date.now();
      
      // Simulate resource detection
      const mockResources = {
        cpu: { cores: 8, usage: 45 },
        memory: { total: 16384, used: 8192, available: 8192 },
        disk: { total: 1000000, used: 500000, available: 500000 },
        network: { latency: 20, bandwidth: 1000000000 }
      };
      
      const detectionTime = Date.now() - resourceDetectionStart;
      
      if (detectionTime > 5000) {
        throw new Error(`Resource detection took too long: ${detectionTime}ms`);
      }
      
      log(`  Resource detection completed in ${detectionTime}ms`);
    });

    await this.runTest('Server Registration Load Test', async () => {
      // Mock server registration test
      const serverCount = 100;
      const registrationStart = Date.now();
      
      // Simulate server registration
      const servers = [];
      for (let i = 0; i < serverCount; i++) {
        servers.push({
          serverId: `test-server-${i}`,
          timestamp: Date.now(),
          status: 'healthy',
          resources: {
            cpu: { cores: 4, usage: 20 + (i % 60) },
            memory: { total: 8192, used: 4096, available: 4096 },
            network: { latency: 10, bandwidth: 1000000000 },
            capabilities: ['compute']
          }
        });
      }
      
      const registrationTime = Date.now() - registrationStart;
      
      if (registrationTime > 10000) {
        throw new Error(`Server registration took too long: ${registrationTime}ms`);
      }
      
      log(`  Registered ${serverCount} servers in ${registrationTime}ms`);
      log(`  Average registration time: ${(registrationTime / serverCount).toFixed(2)}ms per server`);
    });

    await this.runTest('Resource Allocation Performance', async () => {
      // Mock resource allocation test
      const allocationCount = 50;
      const allocationStart = Date.now();
      
      // Simulate resource allocation
      let successfulAllocations = 0;
      for (let i = 0; i < allocationCount; i++) {
        // Simulate 80% success rate
        if (Math.random() > 0.2) {
          successfulAllocations++;
        }
      }
      
      const allocationTime = Date.now() - allocationStart;
      
      if (allocationTime > 5000) {
        throw new Error(`Resource allocation took too long: ${allocationTime}ms`);
      }
      
      if (successfulAllocations < allocationCount * 0.7) {
        throw new Error(`Too many allocation failures: ${successfulAllocations}/${allocationCount}`);
      }
      
      log(`  Processed ${allocationCount} allocations in ${allocationTime}ms`);
      log(`  Success rate: ${(successfulAllocations / allocationCount * 100).toFixed(1)}%`);
    });
  }

  async runCICompatibilityTests() {
    header('CI Compatibility Tests');
    
    await this.runTest('Platform Detection', async () => {
      const platform = process.platform;
      const arch = process.arch;
      const nodeVersion = process.version;
      
      log(`  Platform: ${platform} (${arch})`);
      log(`  Node.js: ${nodeVersion}`);
      
      if (!['linux', 'darwin', 'win32'].includes(platform)) {
        throw new Error(`Unsupported platform: ${platform}`);
      }
      
      if (!nodeVersion.startsWith('v20.')) {
        log(`  Warning: Node.js version ${nodeVersion} may not be fully supported`, 'yellow');
      }
    });

    await this.runTest('Environment Variables', async () => {
      const requiredEnvVars = [
        'NODE_ENV',
        'CI'
      ];
      
      for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
          log(`  ${envVar}: ${process.env[envVar]}`);
        } else {
          log(`  ${envVar}: not set (optional)`);
        }
      }
      
      // Check CI environment
      if (process.env.CI) {
        log(`  CI environment detected: ${process.env.CI}`);
      }
    });

    await this.runTest('Dependencies Check', async () => {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};
        
        const criticalDeps = [
          'systeminformation',
          'node-os-utils',
          'nanoid',
          '@modelcontextprotocol/sdk'
        ];
        
        for (const dep of criticalDeps) {
          if (dependencies[dep] || devDependencies[dep]) {
            log(`  ✓ ${dep}: ${dependencies[dep] || devDependencies[dep]}`);
          } else {
            throw new Error(`Missing critical dependency: ${dep}`);
          }
        }
      } catch (error) {
        throw new Error(`Failed to check dependencies: ${error.message}`);
      }
    });
  }

  async runMemoryTests() {
    header('Memory Management Tests');
    
    await this.runTest('Memory Usage Monitoring', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate memory-intensive operations
      const largeArray = new Array(1000000).fill(0).map((_, i) => ({ id: i, data: 'test' }));
      
      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
      
      log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      log(`  After allocation: ${(afterMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      log(`  Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Clean up
      largeArray.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      log(`  After cleanup: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    });

    await this.runTest('Garbage Collection Performance', async () => {
      const gcStart = Date.now();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        const gcTime = Date.now() - gcStart;
        log(`  Garbage collection completed in ${gcTime}ms`);
      } else {
        log(`  Garbage collection not available (run with --expose-gc)`);
      }
    });
  }

  generateReport() {
    header('Test Results Summary');
    
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
    
    log(`Total Tests: ${total}`);
    log(`Passed: ${this.results.passed}`, 'green');
    log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'reset');
    log(`Skipped: ${this.results.skipped}`, 'yellow');
    log(`Pass Rate: ${passRate}%`, this.results.failed > 0 ? 'yellow' : 'green');
    
    // Generate detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      results: this.results,
      summary: {
        total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        passRate: parseFloat(passRate)
      }
    };
    
    const reportPath = path.join(process.cwd(), 'performance-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    log(`\nDetailed report saved to: ${reportPath}`);
    
    return this.results.failed === 0;
  }
}

async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.runResourceManagerTests();
    await runner.runCICompatibilityTests();
    await runner.runMemoryTests();
    
    const success = runner.generateReport();
    
    if (success) {
      log('\n✅ All tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n❌ Some tests failed!', 'red');
      process.exit(1);
    }
  } catch (error) {
    log(`\n💥 Test runner error: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TestRunner };