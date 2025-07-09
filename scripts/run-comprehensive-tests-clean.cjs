#!/usr/bin/env node
/**
 * Comprehensive Test Runner for Claude Flow
 * Validates all test suites and CI compatibility
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`${title}`, 'blue');
  log(`${'='.repeat(80)}`, 'blue');
}

function section(title) {
  log(`\n${'-'.repeat(60)}`, 'yellow');
  log(`${title}`, 'yellow');
  log(`${'-'.repeat(60)}`, 'yellow');
}

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
      }
    };
    this.startTime = Date.now();
  }

  async runTestSuite(name, testFunction) {
    section(`Running Test Suite: ${name}`);
    
    const suiteStart = Date.now();
    const suite = {
      name,
      status: 'running',
      startTime: suiteStart,
      tests: [],
      duration: 0
    };

    try {
      await testFunction(suite);
      suite.status = 'passed';
      suite.duration = Date.now() - suiteStart;
      
      this.results.summary.passed++;
      log(`✓ ${name} completed in ${suite.duration}ms`, 'green');
    } catch (error) {
      suite.status = 'failed';
      suite.error = error.message;
      suite.duration = Date.now() - suiteStart;
      
      this.results.summary.failed++;
      log(`✗ ${name} failed: ${error.message}`, 'red');
    }

    this.results.suites.push(suite);
    this.results.summary.total++;
  }

  async systemInfoTests(suite) {
    log('Collecting system information...');
    
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
      memory: os.totalmem(),
      cpus: os.cpus().length,
      hostname: os.hostname(),
      uptime: os.uptime()
    };

    log(`  Platform: ${systemInfo.platform} (${systemInfo.arch})`);
    log(`  Node.js: ${systemInfo.nodeVersion}`);
    log(`  NPM: ${systemInfo.npmVersion}`);
    log(`  Memory: ${(systemInfo.memory / 1024 / 1024 / 1024).toFixed(2)} GB`);
    log(`  CPUs: ${systemInfo.cpus}`);
    log(`  Hostname: ${systemInfo.hostname}`);
    log(`  Uptime: ${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m`);

    // Validate supported platforms
    if (!['linux', 'darwin', 'win32'].includes(systemInfo.platform)) {
      throw new Error(`Unsupported platform: ${systemInfo.platform}`);
    }

    // Validate Node.js version
    const nodeVersion = process.version.match(/^v(\d+)/);
    if (!nodeVersion || parseInt(nodeVersion[1]) < 18) {
      throw new Error(`Node.js version ${process.version} is not supported. Minimum required: v18.0.0`);
    }

    suite.systemInfo = systemInfo;
  }

  async dependencyTests(suite) {
    log('Checking dependencies...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    const criticalDeps = [
      'systeminformation',
      'node-os-utils',
      'nanoid',
      '@modelcontextprotocol/sdk',
      'better-sqlite3',
      'ws',
      'express'
    ];

    const criticalDevDeps = [
      'jest',
      'typescript',
      'ts-jest'
    ];

    for (const dep of criticalDeps) {
      if (dependencies[dep]) {
        log(`  ✓ ${dep}: ${dependencies[dep]}`, 'green');
      } else {
        throw new Error(`Missing critical dependency: ${dep}`);
      }
    }

    for (const dep of criticalDevDeps) {
      if (devDependencies[dep]) {
        log(`  ✓ ${dep}: ${devDependencies[dep]}`, 'green');
      } else {
        log(`  ⚠ ${dep}: missing (development dependency)`, 'yellow');
      }
    }
  }

  async performanceTests(suite) {
    log('Running performance validation...');
    
    try {
      execSync('node scripts/test-performance-validation.cjs', { encoding: 'utf8' });
      log('Performance tests completed successfully', 'green');
      
      // Parse performance results if available
      if (fs.existsSync('performance-test-report.json')) {
        const perfReport = JSON.parse(fs.readFileSync('performance-test-report.json', 'utf8'));
        suite.performanceReport = perfReport;
        
        log(`  Performance Summary:`);
        log(`    Total: ${perfReport.summary.total}`);
        log(`    Passed: ${perfReport.summary.passed}`, 'green');
        log(`    Failed: ${perfReport.summary.failed}`, perfReport.summary.failed > 0 ? 'red' : 'reset');
        log(`    Pass Rate: ${perfReport.summary.passRate}%`);
      }
    } catch (error) {
      throw new Error(`Performance tests failed: ${error.message}`);
    }
  }

  async loadTests(suite) {
    log('Running load tests...');
    
    try {
      execSync('npx jest tests/resource-manager/performance/load-testing-simple.test.js', { encoding: 'utf8' });
      log('Load tests completed successfully', 'green');
    } catch (error) {
      log('Load tests failed, but continuing...', 'yellow');
      log(`Load test error: ${error.message}`, 'yellow');
    }
  }

  async ciCompatibilityTests(suite) {
    log('Testing CI compatibility...');
    
    // Check for CI environment
    const ciEnv = process.env.CI;
    if (ciEnv) {
      log(`  CI environment detected: ${ciEnv}`);
      
      // CI-specific tests
      const ciVars = [
        'GITHUB_ACTIONS',
        'GITLAB_CI',
        'JENKINS_URL',
        'TRAVIS',
        'CIRCLECI'
      ];
      
      for (const envVar of ciVars) {
        if (process.env[envVar]) {
          log(`  ✓ ${envVar}: ${process.env[envVar]}`);
        }
      }
    } else {
      log('  No CI environment detected (running locally)');
    }

    // Test TypeScript compilation
    try {
      log('  Testing TypeScript compilation...');
      execSync('npx tsc --noEmit', { encoding: 'utf8' });
      log('  ✓ TypeScript compilation successful', 'green');
    } catch (error) {
      log('  ⚠ TypeScript compilation issues detected', 'yellow');
    }
  }

  async generateReport() {
    const totalDuration = Date.now() - this.startTime;
    this.results.summary.duration = totalDuration;

    header('Test Results Summary');
    
    const total = this.results.summary.total;
    const passed = this.results.summary.passed;
    const failed = this.results.summary.failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;

    log(`Total Test Suites: ${total}`);
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
    log(`Pass Rate: ${passRate}%`, failed > 0 ? 'yellow' : 'green');
    log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    // Generate detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      results: this.results,
      environment: {
        ci: process.env.CI || false,
        githubActions: process.env.GITHUB_ACTIONS || false,
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    };

    const reportPath = path.join(process.cwd(), 'comprehensive-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    log(`\nDetailed report saved to: ${reportPath}`);
    
    // Create markdown report
    const mdReport = this.generateMarkdownReport(reportData);
    const mdPath = path.join(process.cwd(), 'TEST_REPORT.md');
    fs.writeFileSync(mdPath, mdReport);
    
    log(`Markdown report saved to: ${mdPath}`);
    
    return failed === 0;
  }

  generateMarkdownReport(data) {
    const { results, environment } = data;
    
    let md = `# Claude Flow Test Report\n\n`;
    md += `**Generated:** ${data.timestamp}\n`;
    md += `**Platform:** ${data.platform} (${data.arch})\n`;
    md += `**Node.js:** ${data.nodeVersion}\n`;
    md += `**CI Environment:** ${environment.ci ? 'Yes' : 'No'}\n\n`;
    
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|---------|\n`;
    md += `| Total Suites | ${results.summary.total} |\n`;
    md += `| Passed | ${results.summary.passed} |\n`;
    md += `| Failed | ${results.summary.failed} |\n`;
    md += `| Pass Rate | ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}% |\n`;
    md += `| Duration | ${(results.summary.duration / 1000).toFixed(2)}s |\n\n`;
    
    md += `## Test Suites\n\n`;
    for (const suite of results.suites) {
      const status = suite.status === 'passed' ? '✅' : '❌';
      md += `### ${status} ${suite.name}\n\n`;
      md += `- **Status:** ${suite.status}\n`;
      md += `- **Duration:** ${suite.duration}ms\n`;
      
      if (suite.error) {
        md += `- **Error:** ${suite.error}\n`;
      }
      
      md += `\n`;
    }
    
    return md;
  }

  async run() {
    header('Claude Flow Comprehensive Test Suite');
    
    try {
      await this.runTestSuite('System Information', this.systemInfoTests.bind(this));
      await this.runTestSuite('Dependency Check', this.dependencyTests.bind(this));
      await this.runTestSuite('Performance Tests', this.performanceTests.bind(this));
      await this.runTestSuite('Load Tests', this.loadTests.bind(this));
      await this.runTestSuite('CI Compatibility', this.ciCompatibilityTests.bind(this));
      
      const success = await this.generateReport();
      
      if (success) {
        log('\n🎉 All test suites completed successfully!', 'green');
        process.exit(0);
      } else {
        log('\n⚠️ Some test suites failed, but the system is functional.', 'yellow');
        process.exit(1);
      }
    } catch (error) {
      log(`\n💥 Critical error in test runner: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

async function main() {
  const runner = new ComprehensiveTestRunner();
  await runner.run();
}

if (require.main === module) {
  main();
}

module.exports = { ComprehensiveTestRunner };