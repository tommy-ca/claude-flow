#!/usr/bin/env node

/**
 * Integration Test Runner for claude-flow
 * Runs all E2E tests and generates comprehensive reports
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Test modules
const FeatureDiscoveryTest = require('../discovery/feature-discovery.test');
const ConfigPersistenceTest = require('../configuration/config-persistence.test');
const TransparencyTest = require('../transparency/transparency.test');
const UserWorkflowTest = require('../workflows/user-workflow.test');

class IntegrationTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: [],
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: process.env.CI === 'true'
      }
    };
  }

  async runTest(name, TestClass) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    const originalExit = process.exit;
    let testResult = {
      name,
      status: 'unknown',
      duration: 0,
      errors: []
    };
    
    // Capture test results
    process.exit = (code) => {
      testResult.status = code === 0 ? 'passed' : 'failed';
      throw new Error(`Test exited with code ${code}`);
    };
    
    try {
      const test = new TestClass();
      await test.runAllTests();
      testResult.status = 'passed';
    } catch (error) {
      if (error.message.includes('Test exited with code 0')) {
        testResult.status = 'passed';
      } else {
        testResult.status = 'failed';
        testResult.errors.push(error.message);
      }
    } finally {
      process.exit = originalExit;
      testResult.duration = Date.now() - startTime;
      this.results.tests.push(testResult);
      
      // Update counters
      this.results.total++;
      if (testResult.status === 'passed') {
        this.results.passed++;
      } else if (testResult.status === 'failed') {
        this.results.failed++;
      } else if (testResult.status === 'skipped') {
        this.results.skipped++;
      }
    }
    
    return testResult;
  }

  async runAllTests() {
    console.log('🚀 Claude Flow Integration Test Suite');
    console.log('====================================');
    console.log(`Environment: ${this.results.environment.platform} ${this.results.environment.arch}`);
    console.log(`Node Version: ${this.results.environment.node}`);
    console.log(`CI Mode: ${this.results.environment.ci}`);
    
    const startTime = Date.now();
    
    const tests = [
      { name: 'Feature Discovery', class: FeatureDiscoveryTest },
      { name: 'Configuration Persistence', class: ConfigPersistenceTest },
      { name: 'Transparency Verification', class: TransparencyTest },
      { name: 'User Workflows', class: UserWorkflowTest }
    ];
    
    // Run performance benchmarks separately (they take longer)
    if (process.env.RUN_BENCHMARKS === 'true') {
      const PerformanceBenchmark = require('../performance/performance.bench');
      tests.push({ name: 'Performance Benchmarks', class: PerformanceBenchmark });
    }
    
    for (const test of tests) {
      try {
        await this.runTest(test.name, test.class);
      } catch (error) {
        console.error(`\n❌ Critical error in ${test.name}: ${error.message}`);
      }
    }
    
    this.results.duration = Date.now() - startTime;
    
    await this.generateReports();
    this.printSummary();
  }

  async generateReports() {
    const reportDir = path.join(process.cwd(), 'docker-test', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    // Generate JSON report
    const jsonReport = path.join(reportDir, `integration-${Date.now()}.json`);
    await fs.writeFile(jsonReport, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    const htmlReport = path.join(reportDir, `integration-${Date.now()}.html`);
    await fs.writeFile(htmlReport, this.generateHTMLReport());
    
    // Generate JUnit XML for CI systems
    const junitReport = path.join(reportDir, `junit-${Date.now()}.xml`);
    await fs.writeFile(junitReport, this.generateJUnitXML());
    
    console.log(`\n📄 Reports generated:`);
    console.log(`   - JSON: ${jsonReport}`);
    console.log(`   - HTML: ${htmlReport}`);
    console.log(`   - JUnit: ${junitReport}`);
  }

  generateHTMLReport() {
    const statusColor = (status) => {
      switch (status) {
        case 'passed': return 'green';
        case 'failed': return 'red';
        case 'skipped': return 'orange';
        default: return 'gray';
      }
    };
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>Claude Flow Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .summary { margin: 20px 0; }
        .summary-item { display: inline-block; margin: 0 20px; }
        .test-result { margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { background: #d4edda; }
        .failed { background: #f8d7da; }
        .skipped { background: #fff3cd; }
        .duration { color: #666; font-size: 0.9em; }
        .error { color: red; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Claude Flow Integration Test Report</h1>
        <p>Generated: ${this.results.timestamp}</p>
        <p>Duration: ${(this.results.duration / 1000).toFixed(2)}s</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="summary-item">Total: ${this.results.total}</div>
        <div class="summary-item" style="color: green;">Passed: ${this.results.passed}</div>
        <div class="summary-item" style="color: red;">Failed: ${this.results.failed}</div>
        <div class="summary-item" style="color: orange;">Skipped: ${this.results.skipped}</div>
    </div>
    
    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Test Suite</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Errors</th>
        </tr>
        ${this.results.tests.map(test => `
        <tr class="${test.status}">
            <td>${test.name}</td>
            <td style="color: ${statusColor(test.status)};">${test.status.toUpperCase()}</td>
            <td class="duration">${(test.duration / 1000).toFixed(2)}s</td>
            <td>${test.errors.length > 0 ? test.errors.join('<br>') : '-'}</td>
        </tr>
        `).join('')}
    </table>
    
    <h2>Environment</h2>
    <table>
        <tr><td>Node Version</td><td>${this.results.environment.node}</td></tr>
        <tr><td>Platform</td><td>${this.results.environment.platform}</td></tr>
        <tr><td>Architecture</td><td>${this.results.environment.arch}</td></tr>
        <tr><td>CI Mode</td><td>${this.results.environment.ci}</td></tr>
    </table>
</body>
</html>`;
  }

  generateJUnitXML() {
    const escapeXML = (str) => {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Claude Flow Integration Tests" 
            tests="${this.results.total}" 
            failures="${this.results.failed}"
            skipped="${this.results.skipped}"
            time="${(this.results.duration / 1000).toFixed(3)}">
    <testsuite name="Integration Tests" 
               tests="${this.results.total}" 
               failures="${this.results.failed}"
               skipped="${this.results.skipped}"
               time="${(this.results.duration / 1000).toFixed(3)}">
        ${this.results.tests.map(test => `
        <testcase name="${escapeXML(test.name)}" 
                  classname="IntegrationTests" 
                  time="${(test.duration / 1000).toFixed(3)}">
            ${test.status === 'failed' ? `
            <failure message="Test failed">
                ${escapeXML(test.errors.join('\n'))}
            </failure>` : ''}
            ${test.status === 'skipped' ? '<skipped/>' : ''}
        </testcase>`).join('')}
    </testsuite>
</testsuites>`;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passRate = this.results.total > 0 
      ? ((this.results.passed / this.results.total) * 100).toFixed(1)
      : 0;
    
    console.log(`\nTotal Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed} (${passRate}%)`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`⏱️  Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(test => {
          console.log(`  - ${test.name}`);
          test.errors.forEach(error => {
            console.log(`    ${error}`);
          });
        });
    }
    
    const exitCode = this.results.failed > 0 ? 1 : 0;
    console.log(`\n${exitCode === 0 ? '✅' : '❌'} Test suite ${exitCode === 0 ? 'PASSED' : 'FAILED'}`);
    
    process.exit(exitCode);
  }
}

// Run integration tests
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Integration test runner failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTestRunner;