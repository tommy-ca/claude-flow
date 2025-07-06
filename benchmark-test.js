#!/usr/bin/env node

/**
 * Hive Mind Performance Benchmark Script
 * Comprehensive testing of all coordination features
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const BENCHMARK_RESULTS = {
  timestamp: new Date().toISOString(),
  system: {
    memory: null,
    cpu: null
  },
  tests: {}
};

function logPerformance(testName, startTime, endTime, additionalData = {}) {
  const duration = endTime - startTime;
  BENCHMARK_RESULTS.tests[testName] = {
    duration_ms: duration,
    ...additionalData
  };
  console.log(`✓ ${testName}: ${duration}ms`, additionalData);
}

function getSystemInfo() {
  try {
    const memInfo = execSync('free -m', { encoding: 'utf8' });
    const cpuInfo = execSync('nproc', { encoding: 'utf8' });
    BENCHMARK_RESULTS.system = {
      memory: memInfo,
      cpu_cores: parseInt(cpuInfo.trim())
    };
  } catch (error) {
    console.log('Could not gather system info:', error.message);
  }
}

async function benchmarkCLICommands() {
  console.log('\n🚀 Benchmarking CLI Commands...\n');
  
  const commands = [
    { name: 'hive_help', cmd: 'npx claude-flow@2.0.0 hive help' },
    { name: 'hive_mind_help', cmd: 'npx claude-flow@2.0.0 hive-mind help' },
    { name: 'hive_mind_status', cmd: 'npx claude-flow@2.0.0 hive-mind status' },
    { name: 'hive_mind_metrics', cmd: 'npx claude-flow@2.0.0 hive-mind metrics' }
  ];
  
  for (const command of commands) {
    try {
      const start = Date.now();
      const output = execSync(command.cmd, { 
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      const end = Date.now();
      
      logPerformance(command.name, start, end, {
        output_lines: output.split('\n').length,
        output_size: output.length
      });
    } catch (error) {
      console.log(`❌ ${command.name}: Failed - ${error.message}`);
      BENCHMARK_RESULTS.tests[command.name] = { error: error.message };
    }
  }
}

async function benchmarkDatabaseOperations() {
  console.log('\n💾 Benchmarking Database Operations...\n');
  
  const dbPath = '.hive-mind/hive.db';
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database not found, skipping database benchmarks');
    return;
  }
  
  const queries = [
    { name: 'count_swarms', query: 'SELECT COUNT(*) FROM swarms;' },
    { name: 'count_agents', query: 'SELECT COUNT(*) FROM agents;' },
    { name: 'count_tasks', query: 'SELECT COUNT(*) FROM tasks;' },
    { name: 'join_swarms_agents', query: 'SELECT s.name, COUNT(a.id) FROM swarms s LEFT JOIN agents a ON s.id = a.swarm_id GROUP BY s.id;' }
  ];
  
  for (const query of queries) {
    try {
      const start = Date.now();
      const output = execSync(`sqlite3 "${dbPath}" "${query.query}"`, {
        encoding: 'utf8',
        timeout: 10000
      });
      const end = Date.now();
      
      logPerformance(`db_${query.name}`, start, end, {
        result_lines: output.trim().split('\n').length
      });
    } catch (error) {
      console.log(`❌ db_${query.name}: Failed - ${error.message}`);
    }
  }
}

async function benchmarkTopologyInitialization() {
  console.log('\n🏗️ Benchmarking Topology Initialization...\n');
  
  const topologies = ['hierarchical', 'mesh', 'ring', 'star'];
  const agentCounts = [5, 8, 12];
  
  for (const topology of topologies) {
    for (const agentCount of agentCounts) {
      const testName = `init_${topology}_${agentCount}agents`;
      try {
        const start = Date.now();
        
        // Test topology initialization (dry run)
        const output = execSync(`npx claude-flow@2.0.0 hive "Benchmark test ${topology}" --topology ${topology} --max-agents ${agentCount} --timeout 1`, {
          encoding: 'utf8',
          timeout: 15000,
          stdio: 'pipe'
        });
        
        const end = Date.now();
        
        logPerformance(testName, start, end, {
          topology,
          agent_count: agentCount,
          output_size: output.length
        });
      } catch (error) {
        console.log(`❌ ${testName}: ${error.message}`);
        BENCHMARK_RESULTS.tests[testName] = { 
          error: error.message,
          topology,
          agent_count: agentCount
        };
      }
    }
  }
}

async function benchmarkMemoryOperations() {
  console.log('\n🧠 Benchmarking Memory Operations...\n');
  
  // Measure database file growth
  const dbPath = '.hive-mind/hive.db';
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    BENCHMARK_RESULTS.tests.database_size = {
      size_bytes: stats.size,
      size_mb: (stats.size / 1024 / 1024).toFixed(2)
    };
    console.log(`✓ Database size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }
  
  // Test memory directory size
  const hiveMindDir = '.hive-mind';
  if (fs.existsSync(hiveMindDir)) {
    try {
      const output = execSync(`du -sh "${hiveMindDir}"`, { encoding: 'utf8' });
      const size = output.trim().split('\t')[0];
      BENCHMARK_RESULTS.tests.hive_mind_directory_size = { size };
      console.log(`✓ Hive Mind directory size: ${size}`);
    } catch (error) {
      console.log('Could not measure directory size');
    }
  }
}

async function benchmarkCoordinationLatency() {
  console.log('\n⚡ Benchmarking Coordination Latency...\n');
  
  // Test consensus mechanisms
  const consensusTypes = ['quorum', 'unanimous', 'weighted', 'leader'];
  
  for (const consensus of consensusTypes) {
    const testName = `consensus_${consensus}`;
    try {
      const start = Date.now();
      
      // Simulate consensus test (this will run basic coordination check)
      const output = execSync(`npx claude-flow@2.0.0 hive "Test ${consensus} consensus" --consensus ${consensus} --max-agents 6 --timeout 1`, {
        encoding: 'utf8',
        timeout: 10000,
        stdio: 'pipe'
      });
      
      const end = Date.now();
      
      logPerformance(testName, start, end, {
        consensus_type: consensus,
        coordination_tested: true
      });
    } catch (error) {
      console.log(`❌ ${testName}: ${error.message}`);
    }
  }
}

async function generateReport() {
  console.log('\n📊 Generating Performance Report...\n');
  
  // Calculate summary statistics
  const testResults = Object.values(BENCHMARK_RESULTS.tests);
  const successfulTests = testResults.filter(t => !t.error);
  const avgDuration = successfulTests.length > 0 
    ? successfulTests.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / successfulTests.length
    : 0;
  
  const summary = {
    total_tests: testResults.length,
    successful_tests: successfulTests.length,
    failed_tests: testResults.filter(t => t.error).length,
    average_duration_ms: Math.round(avgDuration),
    min_duration_ms: Math.min(...successfulTests.map(t => t.duration_ms || Infinity)),
    max_duration_ms: Math.max(...successfulTests.map(t => t.duration_ms || 0))
  };
  
  BENCHMARK_RESULTS.summary = summary;
  
  // Save results
  const reportPath = 'hive-mind-benchmark-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(BENCHMARK_RESULTS, null, 2));
  
  console.log('📋 Performance Summary:');
  console.log(`  Total Tests: ${summary.total_tests}`);
  console.log(`  Successful: ${summary.successful_tests}`);
  console.log(`  Failed: ${summary.failed_tests}`);
  console.log(`  Average Duration: ${summary.average_duration_ms}ms`);
  console.log(`  Min Duration: ${summary.min_duration_ms}ms`);
  console.log(`  Max Duration: ${summary.max_duration_ms}ms`);
  console.log(`\n💾 Full results saved to: ${reportPath}`);
}

async function main() {
  console.log('🧪 Hive Mind Performance Benchmark Suite');
  console.log('==========================================\n');
  
  getSystemInfo();
  
  await benchmarkCLICommands();
  await benchmarkDatabaseOperations();
  await benchmarkTopologyInitialization();
  await benchmarkMemoryOperations();
  await benchmarkCoordinationLatency();
  await generateReport();
  
  console.log('\n✅ Benchmark complete!');
}

main().catch(console.error);

export { main, BENCHMARK_RESULTS };