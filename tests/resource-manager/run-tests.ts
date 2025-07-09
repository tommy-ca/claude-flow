#!/usr/bin/env ts-node

/**
 * Test runner for Resource Manager test suite
 * Runs all tests with proper configuration and reporting
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface TestRunOptions {
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  pattern?: string;
  timeout?: number;
  parallel?: boolean;
  reporter?: string;
}

class ResourceManagerTestRunner {
  private readonly testDir: string;
  private readonly rootDir: string;
  private results: TestResult[] = [];

  constructor() {
    this.testDir = __dirname;
    this.rootDir = join(this.testDir, '../../..');
  }

  async runAllTests(options: TestRunOptions = {}): Promise<void> {
    console.log('🚀 Starting Resource Manager Test Suite');
    console.log('=' .repeat(60));

    const startTime = Date.now();

    try {
      // Pre-flight checks
      await this.preflightChecks();

      // Run test suites
      await this.runUnitTests(options);
      await this.runIntegrationTests(options);
      await this.runPerformanceTests(options);
      await this.runE2ETests(options);

      // Generate reports
      await this.generateReports(options);

      const duration = Date.now() - startTime;
      console.log('\\n✅ All tests completed successfully!');
      console.log(`⏱️  Total duration: ${duration}ms`);

    } catch (error) {
      console.error('❌ Test run failed:', error);
      process.exit(1);
    }
  }

  private async preflightChecks(): Promise<void> {
    console.log('🔍 Running pre-flight checks...');

    // Check test configuration
    const configPath = join(this.testDir, 'test-config.ts');
    if (!existsSync(configPath)) {
      throw new Error('Test configuration file not found');
    }

    // Check test fixtures
    const fixturesPath = join(this.testDir, 'fixtures/test-fixtures.ts');
    if (!existsSync(fixturesPath)) {
      throw new Error('Test fixtures file not found');
    }

    // Check package.json for test dependencies
    const packagePath = join(this.rootDir, 'package.json');
    if (!existsSync(packagePath)) {
      throw new Error('package.json not found');
    }

    console.log('✅ Pre-flight checks passed');
  }

  private async runUnitTests(options: TestRunOptions): Promise<void> {
    console.log('\\n🧪 Running Unit Tests...');
    
    const unitTestPattern = options.pattern || 'unit/**/*.test.ts';
    const result = await this.runTestSuite('unit', unitTestPattern, {
      ...options,
      timeout: options.timeout || 10000
    });

    this.results.push(result);
    this.printTestResult(result);
  }

  private async runIntegrationTests(options: TestRunOptions): Promise<void> {
    console.log('\\n🔗 Running Integration Tests...');
    
    const integrationTestPattern = options.pattern || 'integration/**/*.test.ts';
    const result = await this.runTestSuite('integration', integrationTestPattern, {
      ...options,
      timeout: options.timeout || 30000
    });

    this.results.push(result);
    this.printTestResult(result);
  }

  private async runPerformanceTests(options: TestRunOptions): Promise<void> {
    console.log('\\n⚡ Running Performance Tests...');
    
    const performanceTestPattern = options.pattern || 'performance/**/*.test.ts';
    const result = await this.runTestSuite('performance', performanceTestPattern, {
      ...options,
      timeout: options.timeout || 60000
    });

    this.results.push(result);
    this.printTestResult(result);
  }

  private async runE2ETests(options: TestRunOptions): Promise<void> {
    console.log('\\n🎯 Running End-to-End Tests...');
    
    const e2eTestPattern = options.pattern || 'e2e/**/*.test.ts';
    const result = await this.runTestSuite('e2e', e2eTestPattern, {
      ...options,
      timeout: options.timeout || 120000
    });

    this.results.push(result);
    this.printTestResult(result);
  }

  private async runTestSuite(
    suiteName: string,
    pattern: string,
    options: TestRunOptions
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const vitestArgs = [
        'run',
        `--config=${join(this.rootDir, 'vitest.config.ts')}`,
        `--root=${this.rootDir}`,
        `tests/resource-manager/${pattern}`,
        options.verbose ? '--verbose' : '--reporter=basic',
        options.coverage ? '--coverage' : '',
        options.parallel ? '--parallel' : '',
        `--timeout=${options.timeout || 30000}`,
        '--no-watch'
      ].filter(Boolean);

      const command = `npx vitest ${vitestArgs.join(' ')}`;
      
      console.log(`Running: ${command}`);
      
      const output = execSync(command, {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;

      // Parse test results from output
      const result = this.parseTestOutput(suiteName, output, duration);
      
      return result;

    } catch (error: any) {
      // Handle test failures
      const duration = Date.now() - startTime;
      const output = error.stdout || error.message;
      
      console.error(`❌ ${suiteName} tests failed:`, output);
      
      return {
        suite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration
      };
    }
  }

  private parseTestOutput(suiteName: string, output: string, duration: number): TestResult {
    // Simple parser for vitest output
    const lines = output.split('\\n');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let coverage;

    for (const line of lines) {
      if (line.includes('✓')) {
        passed++;
      } else if (line.includes('✗') || line.includes('FAIL')) {
        failed++;
      } else if (line.includes('⊙') || line.includes('SKIP')) {
        skipped++;
      }
      
      // Parse coverage information
      if (line.includes('Statements:')) {
        const match = line.match(/Statements:\\s+(\\d+(?:\\.\\d+)?)%/);
        if (match && !coverage) {
          coverage = {
            statements: parseFloat(match[1]),
            branches: 0,
            functions: 0,
            lines: 0
          };
        }
      }
    }

    return {
      suite: suiteName,
      passed,
      failed,
      skipped,
      duration,
      coverage
    };
  }

  private printTestResult(result: TestResult): void {
    const status = result.failed > 0 ? '❌' : '✅';
    const summary = `${status} ${result.suite}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped (${result.duration}ms)`;
    
    console.log(summary);
    
    if (result.coverage) {
      console.log(`   Coverage: ${result.coverage.statements}% statements`);
    }
  }

  private async generateReports(options: TestRunOptions): Promise<void> {
    console.log('\\n📊 Generating test reports...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites: this.results.length,
        totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
        totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
      },
      suites: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    // Write JSON report
    const reportPath = join(this.testDir, 'test-results.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Write HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = join(this.testDir, 'test-results.html');
    writeFileSync(htmlPath, htmlReport);

    console.log(`📄 Reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  private generateHtmlReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Resource Manager Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { color: #22c55e; }
        .failed { color: #ef4444; }
        .skipped { color: #f59e0b; }
        .progress { width: 100%; background: #f0f0f0; border-radius: 3px; }
        .progress-bar { height: 20px; background: #22c55e; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Resource Manager Test Results</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> ${report.summary.totalPassed + report.summary.totalFailed + report.summary.totalSkipped}</p>
        <p><strong>Passed:</strong> <span class="passed">${report.summary.totalPassed}</span></p>
        <p><strong>Failed:</strong> <span class="failed">${report.summary.totalFailed}</span></p>
        <p><strong>Skipped:</strong> <span class="skipped">${report.summary.totalSkipped}</span></p>
        <p><strong>Duration:</strong> ${report.summary.totalDuration}ms</p>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
    </div>

    <h2>Test Suites</h2>
    ${report.suites.map((suite: TestResult) => `
        <div class="suite">
            <h3>${suite.suite}</h3>
            <p>Passed: <span class="passed">${suite.passed}</span></p>
            <p>Failed: <span class="failed">${suite.failed}</span></p>
            <p>Skipped: <span class="skipped">${suite.skipped}</span></p>
            <p>Duration: ${suite.duration}ms</p>
            ${suite.coverage ? `<p>Coverage: ${suite.coverage.statements}%</p>` : ''}
        </div>
    `).join('')}

    <h2>Environment</h2>
    <ul>
        <li>Node.js: ${report.environment.node}</li>
        <li>Platform: ${report.environment.platform}</li>
        <li>Architecture: ${report.environment.arch}</li>
    </ul>
</body>
</html>`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: TestRunOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--watch':
        options.watch = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--pattern':
        options.pattern = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--reporter':
        options.reporter = args[++i];
        break;
      case '--help':
        console.log(`
Resource Manager Test Runner

Usage: npm run test:resource-manager [options]

Options:
  --watch       Watch mode for development
  --coverage    Generate coverage reports
  --verbose     Verbose output
  --parallel    Run tests in parallel
  --pattern     Test pattern to run
  --timeout     Test timeout in milliseconds
  --reporter    Test reporter (basic, verbose, json)
  --help        Show this help message

Examples:
  npm run test:resource-manager
  npm run test:resource-manager -- --coverage --verbose
  npm run test:resource-manager -- --pattern "unit/resource-detector.test.ts"
        `);
        process.exit(0);
        break;
    }
  }

  const runner = new ResourceManagerTestRunner();
  await runner.runAllTests(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default ResourceManagerTestRunner;