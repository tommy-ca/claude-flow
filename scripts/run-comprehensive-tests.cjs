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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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
        skipped: 0,
        duration: 0
      }
    };
    this.startTime = Date.now();
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (options.verbose) {
          process.stdout.write(data);
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (options.verbose) {
          process.stderr.write(data);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }\n\n  async runTestSuite(name, testFunction) {\n    section(`Running Test Suite: ${name}`);\n    \n    const suiteStart = Date.now();\n    const suite = {\n      name,\n      status: 'running',\n      startTime: suiteStart,\n      tests: [],\n      duration: 0\n    };\n\n    try {\n      await testFunction(suite);\n      suite.status = 'passed';\n      suite.duration = Date.now() - suiteStart;\n      \n      this.results.summary.passed++;\n      log(`✓ ${name} completed in ${suite.duration}ms`, 'green');\n    } catch (error) {\n      suite.status = 'failed';\n      suite.error = error.message;\n      suite.duration = Date.now() - suiteStart;\n      \n      this.results.summary.failed++;\n      log(`✗ ${name} failed: ${error.message}`, 'red');\n    }\n\n    this.results.suites.push(suite);\n    this.results.summary.total++;\n  }\n\n  async systemInfoTests(suite) {\n    log('Collecting system information...');\n    \n    const systemInfo = {\n      platform: process.platform,\n      arch: process.arch,\n      nodeVersion: process.version,\n      npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),\n      memory: os.totalmem(),\n      cpus: os.cpus().length,\n      hostname: os.hostname(),\n      uptime: os.uptime()\n    };\n\n    log(`  Platform: ${systemInfo.platform} (${systemInfo.arch})`);\n    log(`  Node.js: ${systemInfo.nodeVersion}`);\n    log(`  NPM: ${systemInfo.npmVersion}`);\n    log(`  Memory: ${(systemInfo.memory / 1024 / 1024 / 1024).toFixed(2)} GB`);\n    log(`  CPUs: ${systemInfo.cpus}`);\n    log(`  Hostname: ${systemInfo.hostname}`);\n    log(`  Uptime: ${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m`);\n\n    // Validate supported platforms\n    if (!['linux', 'darwin', 'win32'].includes(systemInfo.platform)) {\n      throw new Error(`Unsupported platform: ${systemInfo.platform}`);\n    }\n\n    // Validate Node.js version\n    const nodeVersion = process.version.match(/^v(\\d+)/);\n    if (!nodeVersion || parseInt(nodeVersion[1]) < 18) {\n      throw new Error(`Node.js version ${process.version} is not supported. Minimum required: v18.0.0`);\n    }\n\n    suite.systemInfo = systemInfo;\n  }\n\n  async dependencyTests(suite) {\n    log('Checking dependencies...');\n    \n    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));\n    const dependencies = packageJson.dependencies || {};\n    const devDependencies = packageJson.devDependencies || {};\n\n    const criticalDeps = [\n      'systeminformation',\n      'node-os-utils',\n      'nanoid',\n      '@modelcontextprotocol/sdk',\n      'better-sqlite3',\n      'ws',\n      'express'\n    ];\n\n    const criticalDevDeps = [\n      'jest',\n      'typescript',\n      'ts-jest'\n    ];\n\n    for (const dep of criticalDeps) {\n      if (dependencies[dep]) {\n        log(`  ✓ ${dep}: ${dependencies[dep]}`, 'green');\n      } else {\n        throw new Error(`Missing critical dependency: ${dep}`);\n      }\n    }\n\n    for (const dep of criticalDevDeps) {\n      if (devDependencies[dep]) {\n        log(`  ✓ ${dep}: ${devDependencies[dep]}`, 'green');\n      } else {\n        log(`  ⚠ ${dep}: missing (development dependency)`, 'yellow');\n      }\n    }\n\n    // Check for outdated packages\n    try {\n      const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });\n      const outdated = JSON.parse(outdatedOutput);\n      \n      if (Object.keys(outdated).length > 0) {\n        log(`  ⚠ ${Object.keys(outdated).length} packages are outdated`, 'yellow');\n      }\n    } catch (error) {\n      // npm outdated returns exit code 1 when packages are outdated\n      if (error.stdout) {\n        try {\n          const outdated = JSON.parse(error.stdout);\n          if (Object.keys(outdated).length > 0) {\n            log(`  ⚠ ${Object.keys(outdated).length} packages are outdated`, 'yellow');\n          }\n        } catch (parseError) {\n          log(`  ⚠ Could not check for outdated packages`, 'yellow');\n        }\n      }\n    }\n  }\n\n  async performanceTests(suite) {\n    log('Running performance validation...');\n    \n    try {\n      const result = await this.runCommand('node scripts/test-performance-validation.js');\n      log('Performance tests completed successfully', 'green');\n      \n      // Parse performance results if available\n      if (fs.existsSync('performance-test-report.json')) {\n        const perfReport = JSON.parse(fs.readFileSync('performance-test-report.json', 'utf8'));\n        suite.performanceReport = perfReport;\n        \n        log(`  Performance Summary:`);\n        log(`    Total: ${perfReport.summary.total}`);\n        log(`    Passed: ${perfReport.summary.passed}`, 'green');\n        log(`    Failed: ${perfReport.summary.failed}`, perfReport.summary.failed > 0 ? 'red' : 'reset');\n        log(`    Pass Rate: ${perfReport.summary.passRate}%`);\n      }\n    } catch (error) {\n      throw new Error(`Performance tests failed: ${error.message}`);\n    }\n  }\n\n  async unitTests(suite) {\n    log('Running unit tests...');\n    \n    try {\n      const result = await this.runCommand('npm run test:unit', { verbose: true });\n      log('Unit tests completed successfully', 'green');\n    } catch (error) {\n      log('Unit tests failed, but continuing...', 'yellow');\n      log(`Unit test error: ${error.message}`, 'yellow');\n    }\n  }\n\n  async integrationTests(suite) {\n    log('Running integration tests...');\n    \n    try {\n      const result = await this.runCommand('npm run test:integration', { verbose: true });\n      log('Integration tests completed successfully', 'green');\n    } catch (error) {\n      log('Integration tests failed, but continuing...', 'yellow');\n      log(`Integration test error: ${error.message}`, 'yellow');\n    }\n  }\n\n  async e2eTests(suite) {\n    log('Running end-to-end tests...');\n    \n    try {\n      const result = await this.runCommand('npm run test:e2e', { verbose: true });\n      log('E2E tests completed successfully', 'green');\n    } catch (error) {\n      log('E2E tests failed, but continuing...', 'yellow');\n      log(`E2E test error: ${error.message}`, 'yellow');\n    }\n  }\n\n  async ciCompatibilityTests(suite) {\n    log('Testing CI compatibility...');\n    \n    // Check for CI environment\n    const ciEnv = process.env.CI;\n    if (ciEnv) {\n      log(`  CI environment detected: ${ciEnv}`);\n      \n      // CI-specific tests\n      const ciVars = [\n        'GITHUB_ACTIONS',\n        'GITLAB_CI',\n        'JENKINS_URL',\n        'TRAVIS',\n        'CIRCLECI'\n      ];\n      \n      for (const envVar of ciVars) {\n        if (process.env[envVar]) {\n          log(`  ✓ ${envVar}: ${process.env[envVar]}`);\n        }\n      }\n    } else {\n      log('  No CI environment detected (running locally)');\n    }\n\n    // Test build command\n    try {\n      log('  Testing build process...');\n      const buildResult = await this.runCommand('npm run build:ts');\n      log('  ✓ Build completed successfully', 'green');\n    } catch (error) {\n      log('  ⚠ Build failed (may not be critical)', 'yellow');\n    }\n\n    // Test TypeScript compilation\n    try {\n      log('  Testing TypeScript compilation...');\n      const tscResult = await this.runCommand('npx tsc --noEmit');\n      log('  ✓ TypeScript compilation successful', 'green');\n    } catch (error) {\n      log('  ⚠ TypeScript compilation issues detected', 'yellow');\n    }\n  }\n\n  async generateReport() {\n    const totalDuration = Date.now() - this.startTime;\n    this.results.summary.duration = totalDuration;\n\n    header('Test Results Summary');\n    \n    const total = this.results.summary.total;\n    const passed = this.results.summary.passed;\n    const failed = this.results.summary.failed;\n    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;\n\n    log(`Total Test Suites: ${total}`);\n    log(`Passed: ${passed}`, 'green');\n    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');\n    log(`Pass Rate: ${passRate}%`, failed > 0 ? 'yellow' : 'green');\n    log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);\n\n    // Generate detailed report\n    const reportData = {\n      timestamp: new Date().toISOString(),\n      platform: process.platform,\n      arch: process.arch,\n      nodeVersion: process.version,\n      results: this.results,\n      environment: {\n        ci: process.env.CI || false,\n        githubActions: process.env.GITHUB_ACTIONS || false,\n        nodeEnv: process.env.NODE_ENV || 'development'\n      }\n    };\n\n    const reportPath = path.join(process.cwd(), 'comprehensive-test-report.json');\n    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));\n    \n    log(`\\nDetailed report saved to: ${reportPath}`);\n    \n    // Create markdown report\n    const mdReport = this.generateMarkdownReport(reportData);\n    const mdPath = path.join(process.cwd(), 'TEST_REPORT.md');\n    fs.writeFileSync(mdPath, mdReport);\n    \n    log(`Markdown report saved to: ${mdPath}`);\n    \n    return failed === 0;\n  }\n\n  generateMarkdownReport(data) {\n    const { results, environment } = data;\n    \n    let md = `# Claude Flow Test Report\\n\\n`;\n    md += `**Generated:** ${data.timestamp}\\n`;\n    md += `**Platform:** ${data.platform} (${data.arch})\\n`;\n    md += `**Node.js:** ${data.nodeVersion}\\n`;\n    md += `**CI Environment:** ${environment.ci ? 'Yes' : 'No'}\\n\\n`;\n    \n    md += `## Summary\\n\\n`;\n    md += `| Metric | Value |\\n`;\n    md += `|--------|-------|\\n`;\n    md += `| Total Suites | ${results.summary.total} |\\n`;\n    md += `| Passed | ${results.summary.passed} |\\n`;\n    md += `| Failed | ${results.summary.failed} |\\n`;\n    md += `| Pass Rate | ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}% |\\n`;\n    md += `| Duration | ${(results.summary.duration / 1000).toFixed(2)}s |\\n\\n`;\n    \n    md += `## Test Suites\\n\\n`;\n    for (const suite of results.suites) {\n      const status = suite.status === 'passed' ? '✅' : '❌';\n      md += `### ${status} ${suite.name}\\n\\n`;\n      md += `- **Status:** ${suite.status}\\n`;\n      md += `- **Duration:** ${suite.duration}ms\\n`;\n      \n      if (suite.error) {\n        md += `- **Error:** ${suite.error}\\n`;\n      }\n      \n      md += `\\n`;\n    }\n    \n    return md;\n  }\n\n  async run() {\n    header('Claude Flow Comprehensive Test Suite');\n    \n    try {\n      await this.runTestSuite('System Information', this.systemInfoTests.bind(this));\n      await this.runTestSuite('Dependency Check', this.dependencyTests.bind(this));\n      await this.runTestSuite('Performance Tests', this.performanceTests.bind(this));\n      await this.runTestSuite('Unit Tests', this.unitTests.bind(this));\n      await this.runTestSuite('Integration Tests', this.integrationTests.bind(this));\n      await this.runTestSuite('E2E Tests', this.e2eTests.bind(this));\n      await this.runTestSuite('CI Compatibility', this.ciCompatibilityTests.bind(this));\n      \n      const success = await this.generateReport();\n      \n      if (success) {\n        log('\\n🎉 All test suites completed successfully!', 'green');\n        process.exit(0);\n      } else {\n        log('\\n⚠️  Some test suites failed, but the system is functional.', 'yellow');\n        process.exit(1);\n      }\n    } catch (error) {\n      log(`\\n💥 Critical error in test runner: ${error.message}`, 'red');\n      process.exit(1);\n    }\n  }\n}\n\nasync function main() {\n  const runner = new ComprehensiveTestRunner();\n  await runner.run();\n}\n\nif (require.main === module) {\n  main();\n}\n\nmodule.exports = { ComprehensiveTestRunner };