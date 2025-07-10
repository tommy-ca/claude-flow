#!/usr/bin/env node

/**
 * E2E Performance Benchmarks for claude-flow
 * Measures performance of key operations and features
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

// Benchmark configuration
const CLAUDE_FLOW_CMD = process.env.CI ? 'npx claude-flow' : 'claude-flow';
const ITERATIONS = parseInt(process.env.BENCH_ITERATIONS) || 10;
const WARMUP_RUNS = 3;

class PerformanceBenchmark {
  constructor() {
    this.results = new Map();
    this.benchmarks = [];
  }

  async runCommand(command) {
    const start = performance.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      const duration = performance.now() - start;
      
      return { 
        stdout: stdout.trim(), 
        stderr: stderr.trim(), 
        success: true,
        duration 
      };
    } catch (error) {
      const duration = performance.now() - start;
      
      return { 
        stdout: error.stdout?.trim() || '', 
        stderr: error.stderr?.trim() || error.message, 
        success: false,
        error,
        duration
      };
    }
  }

  async measureCommand(name, command, iterations = ITERATIONS) {
    console.log(`\n⏱️  Benchmarking: ${name}`);
    
    // Warmup runs
    console.log('  Warming up...');
    for (let i = 0; i < WARMUP_RUNS; i++) {
      await this.runCommand(command);
    }
    
    // Actual measurements
    const measurements = [];
    console.log(`  Running ${iterations} iterations...`);
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.runCommand(command);
      if (result.success) {
        measurements.push(result.duration);
        process.stdout.write('.');
      } else {
        process.stdout.write('x');
      }
    }
    console.log('');
    
    if (measurements.length > 0) {
      // Calculate statistics
      const stats = this.calculateStats(measurements);
      
      this.results.set(name, {
        ...stats,
        iterations: measurements.length,
        command
      });
      
      // Print results
      console.log(`  ✅ Results for ${name}:`);
      console.log(`     Mean: ${stats.mean.toFixed(2)}ms`);
      console.log(`     Median: ${stats.median.toFixed(2)}ms`);
      console.log(`     Min: ${stats.min.toFixed(2)}ms`);
      console.log(`     Max: ${stats.max.toFixed(2)}ms`);
      console.log(`     Std Dev: ${stats.stdDev.toFixed(2)}ms`);
      console.log(`     P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`     P99: ${stats.p99.toFixed(2)}ms`);
      
      return stats;
    } else {
      console.log(`  ❌ Failed to benchmark ${name}`);
      return null;
    }
  }

  calculateStats(measurements) {
    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;
    
    // Calculate median
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    // Calculate standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate percentiles
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      mean,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev,
      p95: sorted[p95Index] || sorted[sorted.length - 1],
      p99: sorted[p99Index] || sorted[sorted.length - 1],
      measurements: sorted
    };
  }

  async benchmarkCoreCommands() {
    console.log('\n🎯 Benchmarking Core Commands');
    console.log('=============================');
    
    const commands = [
      { name: 'Version Check', cmd: '--version' },
      { name: 'Help Display', cmd: '--help' },
      { name: 'Feature List', cmd: 'features list' },
      { name: 'Config Show', cmd: 'config show' },
      { name: 'Feature Status', cmd: 'features status' }
    ];
    
    for (const { name, cmd } of commands) {
      await this.measureCommand(name, `${CLAUDE_FLOW_CMD} ${cmd}`);
    }
  }

  async benchmarkFeatureOperations() {
    console.log('\n🔧 Benchmarking Feature Operations');
    console.log('==================================');
    
    // Create temporary test environment
    const testDir = path.join(os.tmpdir(), `claude-flow-bench-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    process.env.CLAUDE_FLOW_HOME = testDir;
    
    try {
      const operations = [
        { name: 'Feature Enable', cmd: 'features enable test-feature' },
        { name: 'Feature Disable', cmd: 'features disable test-feature' },
        { name: 'Config Set', cmd: 'config set bench.test "value"' },
        { name: 'Config Get', cmd: 'config get bench.test' }
      ];
      
      for (const { name, cmd } of operations) {
        await this.measureCommand(name, `${CLAUDE_FLOW_CMD} ${cmd}`);
      }
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
      delete process.env.CLAUDE_FLOW_HOME;
    }
  }

  async benchmarkStartupTime() {
    console.log('\n🚀 Benchmarking Startup Performance');
    console.log('===================================');
    
    // Test cold start vs warm start
    const coldStart = await this.measureCommand(
      'Cold Start',
      `${CLAUDE_FLOW_CMD} --version`,
      5
    );
    
    // Run multiple times to ensure cache is warm
    for (let i = 0; i < 5; i++) {
      await this.runCommand(`${CLAUDE_FLOW_CMD} --version`);
    }
    
    const warmStart = await this.measureCommand(
      'Warm Start',
      `${CLAUDE_FLOW_CMD} --version`,
      20
    );
    
    if (coldStart && warmStart) {
      const improvement = ((coldStart.mean - warmStart.mean) / coldStart.mean) * 100;
      console.log(`\n  📊 Warm start is ${improvement.toFixed(1)}% faster than cold start`);
    }
  }

  async benchmarkConcurrency() {
    console.log('\n🔄 Benchmarking Concurrent Operations');
    console.log('=====================================');
    
    const concurrencyLevels = [1, 2, 4, 8];
    
    for (const level of concurrencyLevels) {
      const start = performance.now();
      
      // Run multiple commands concurrently
      const promises = [];
      for (let i = 0; i < level; i++) {
        promises.push(this.runCommand(`${CLAUDE_FLOW_CMD} features list`));
      }
      
      await Promise.all(promises);
      const duration = performance.now() - start;
      
      console.log(`  Concurrency ${level}: ${duration.toFixed(2)}ms total`);
      console.log(`    Per operation: ${(duration / level).toFixed(2)}ms`);
    }
  }

  async benchmarkMemoryUsage() {
    console.log('\n💾 Benchmarking Memory Usage');
    console.log('============================');
    
    if (process.platform === 'linux') {
      // Simple memory usage check
      const commands = [
        { name: 'Simple Command', cmd: '--version' },
        { name: 'Feature List', cmd: 'features list' },
        { name: 'Complex Operation', cmd: 'features status --verbose' }
      ];
      
      for (const { name, cmd } of commands) {
        const memCmd = `command time -v ${CLAUDE_FLOW_CMD} ${cmd} 2>&1 | grep "Maximum resident"`;
        const result = await this.runCommand(memCmd);
        
        if (result.success) {
          const match = result.stdout.match(/(\d+)/);
          if (match) {
            const memoryKB = parseInt(match[1]);
            console.log(`  ${name}: ${(memoryKB / 1024).toFixed(2)} MB`);
          }
        }
      }
    } else {
      console.log('  ⚠️  Memory benchmarking only available on Linux');
    }
  }

  async benchmarkNPXPerformance() {
    console.log('\n📦 Benchmarking NPX Performance');
    console.log('===============================');
    
    // Compare direct vs npx execution
    const direct = await this.measureCommand(
      'Direct Execution',
      'claude-flow --version',
      5
    );
    
    const npx = await this.measureCommand(
      'NPX Execution',
      'npx claude-flow --version',
      5
    );
    
    if (direct && npx) {
      const overhead = ((npx.mean - direct.mean) / direct.mean) * 100;
      console.log(`\n  📊 NPX adds ${overhead.toFixed(1)}% overhead`);
    }
  }

  generateReport() {
    console.log('\n📊 Performance Benchmark Summary');
    console.log('================================');
    
    // Find fastest and slowest operations
    let fastest = { name: '', time: Infinity };
    let slowest = { name: '', time: 0 };
    
    for (const [name, stats] of this.results) {
      if (stats.mean < fastest.time) {
        fastest = { name, time: stats.mean };
      }
      if (stats.mean > slowest.time) {
        slowest = { name, time: stats.mean };
      }
    }
    
    console.log(`\n⚡ Fastest operation: ${fastest.name} (${fastest.time.toFixed(2)}ms)`);
    console.log(`🐌 Slowest operation: ${slowest.name} (${slowest.time.toFixed(2)}ms)`);
    
    // Performance targets
    console.log('\n🎯 Performance Targets:');
    const targets = [
      { operation: 'Version Check', target: 50, critical: 100 },
      { operation: 'Feature List', target: 100, critical: 200 },
      { operation: 'Config Get', target: 75, critical: 150 }
    ];
    
    for (const target of targets) {
      const result = this.results.get(target.operation);
      if (result) {
        const status = result.mean <= target.target ? '✅' : 
                      result.mean <= target.critical ? '⚠️' : '❌';
        
        console.log(`  ${status} ${target.operation}: ${result.mean.toFixed(2)}ms (target: ${target.target}ms)`);
      }
    }
    
    // Write detailed report
    this.writeDetailedReport();
  }

  async writeDetailedReport() {
    const reportDir = path.join(process.cwd(), 'docker-test', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        iterations: ITERATIONS
      },
      results: Object.fromEntries(this.results),
      summary: {
        totalBenchmarks: this.results.size,
        averageTime: Array.from(this.results.values())
          .reduce((sum, r) => sum + r.mean, 0) / this.results.size
      }
    };
    
    const reportPath = path.join(reportDir, `performance-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  async runAllBenchmarks() {
    console.log('🚀 Starting Performance Benchmarks');
    console.log('==================================');
    console.log(`Running ${ITERATIONS} iterations per benchmark\n`);
    
    const benchmarks = [
      () => this.benchmarkCoreCommands(),
      () => this.benchmarkFeatureOperations(),
      () => this.benchmarkStartupTime(),
      () => this.benchmarkConcurrency(),
      () => this.benchmarkMemoryUsage(),
      () => this.benchmarkNPXPerformance()
    ];
    
    for (const benchmark of benchmarks) {
      try {
        await benchmark();
      } catch (error) {
        console.error(`❌ Benchmark failed: ${error.message}`);
      }
    }
    
    this.generateReport();
  }
}

// Run benchmarks
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAllBenchmarks().catch(error => {
    console.error('Benchmark suite failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceBenchmark;