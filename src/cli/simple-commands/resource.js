/**
 * Resource management commands for Claude Flow CLI
 * Provides commands for monitoring and managing system resources
 */

const chalk = require('chalk');
const Table = require('cli-table3');
const { spawn } = require('child_process');
const { ResourceManager } = require('../../resource-manager/core/resource-manager');
const { formatBytes, formatPercentage, formatDuration } = require('../utils/formatters');
const logger = require('../logger');

class ResourceCommands {
  constructor() {
    this.resourceManager = null;
  }

  async initialize() {
    if (!this.resourceManager) {
      this.resourceManager = new ResourceManager();
      await this.resourceManager.initialize();
    }
  }

  /**
   * Display current resource status
   */
  async status(args = {}) {
    await this.initialize();

    const { json, server: serverId, verbose } = args;

    try {
      let reports;
      if (serverId) {
        reports = [await this.resourceManager.getServerStatus(serverId)];
      } else {
        reports = await this.resourceManager.getAllServerStatus();
      }

      if (json) {
        console.log(JSON.stringify(reports, null, 2));
        return;
      }

      // Display in table format
      console.log(chalk.bold.cyan('\n📊 Resource Status\n'));

      for (const report of reports) {
        this.displayServerStatus(report, verbose);
      }

      // Display summary
      this.displaySummary(reports);

    } catch (error) {
      logger.error('Failed to get resource status:', error);
      process.exit(1);
    }
  }

  /**
   * Monitor resources in real-time
   */
  async monitor(args = {}) {
    await this.initialize();

    const { interval = 5000, metrics = 'cpu,memory,network', server: serverId } = args;
    const selectedMetrics = metrics.split(',').map(m => m.trim());

    console.log(chalk.bold.cyan('🔍 Resource Monitor\n'));
    console.log(chalk.gray(`Updating every ${interval}ms. Press Ctrl+C to stop.\n`));

    const monitorProcess = async () => {
      // Clear console
      console.clear();
      console.log(chalk.bold.cyan('🔍 Resource Monitor\n'));
      console.log(chalk.gray(`Updating every ${interval}ms. Press Ctrl+C to stop.\n`));

      try {
        let reports;
        if (serverId) {
          reports = [await this.resourceManager.getServerStatus(serverId)];
        } else {
          reports = await this.resourceManager.getAllServerStatus();
        }

        for (const report of reports) {
          this.displayMonitoringData(report, selectedMetrics);
        }

      } catch (error) {
        console.error(chalk.red('Error updating monitor:'), error.message);
      }
    };

    // Initial display
    await monitorProcess();

    // Set up interval
    const intervalId = setInterval(monitorProcess, interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.yellow('\n\nMonitoring stopped.'));
      process.exit(0);
    });
  }

  /**
   * Optimize resource allocation
   */
  async optimize(args = {}) {
    await this.initialize();

    const { strategy = 'balanced', dryRun = false, verbose } = args;

    console.log(chalk.bold.cyan('\n🚀 Resource Optimization\n'));
    console.log(chalk.gray(`Strategy: ${strategy}`));
    console.log(chalk.gray(`Mode: ${dryRun ? 'Dry Run' : 'Live'}\n`));

    try {
      // Analyze current state
      const analysis = await this.resourceManager.analyzeResourceUsage();
      this.displayAnalysis(analysis);

      // Generate optimization plan
      const plan = await this.resourceManager.generateOptimizationPlan(strategy);
      this.displayOptimizationPlan(plan);

      if (!dryRun) {
        // Confirm before applying
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          readline.question(chalk.yellow('\nApply optimization plan? (y/N): '), resolve);
        });
        readline.close();

        if (answer.toLowerCase() === 'y') {
          console.log(chalk.green('\nApplying optimization plan...'));
          const results = await this.resourceManager.applyOptimizationPlan(plan);
          this.displayOptimizationResults(results);
        } else {
          console.log(chalk.gray('\nOptimization cancelled.'));
        }
      }

    } catch (error) {
      logger.error('Optimization failed:', error);
      process.exit(1);
    }
  }

  /**
   * Display resource history
   */
  async history(args = {}) {
    await this.initialize();

    const { duration = '1h', server: serverId, metric = 'all', format = 'chart' } = args;

    console.log(chalk.bold.cyan('\n📈 Resource History\n'));

    try {
      const history = await this.resourceManager.getResourceHistory({
        duration,
        serverId,
        metrics: metric === 'all' ? undefined : [metric]
      });

      if (format === 'json') {
        console.log(JSON.stringify(history, null, 2));
        return;
      }

      if (format === 'chart') {
        this.displayHistoryChart(history);
      } else {
        this.displayHistoryTable(history);
      }

      // Display statistics
      this.displayHistoryStats(history);

    } catch (error) {
      logger.error('Failed to get resource history:', error);
      process.exit(1);
    }
  }

  /**
   * Display server status
   */
  displayServerStatus(report, verbose = false) {
    const statusColor = {
      healthy: 'green',
      degraded: 'yellow',
      overloaded: 'red',
      offline: 'gray'
    }[report.status] || 'white';

    console.log(chalk.bold(`🖥️  Server: ${report.serverId}`));
    console.log(chalk[statusColor](`   Status: ${report.status.toUpperCase()}`));
    console.log(chalk.gray(`   Last Update: ${new Date(report.timestamp).toLocaleString()}`));

    const table = new Table({
      head: ['Resource', 'Usage', 'Available', 'Total'],
      colWidths: [15, 20, 20, 20],
      style: { head: ['cyan'] }
    });

    // CPU
    table.push([
      'CPU',
      formatPercentage(report.resources.cpu.usage),
      `${report.resources.cpu.cores} cores`,
      `${report.resources.cpu.cores} cores`
    ]);

    // Memory
    table.push([
      'Memory',
      formatBytes(report.resources.memory.used),
      formatBytes(report.resources.memory.available),
      formatBytes(report.resources.memory.total)
    ]);

    // GPU (if available)
    if (report.resources.gpu && report.resources.gpu.length > 0) {
      report.resources.gpu.forEach((gpu, index) => {
        table.push([
          `GPU ${index}`,
          formatPercentage(gpu.utilization),
          formatBytes(gpu.memory.total - gpu.memory.used),
          formatBytes(gpu.memory.total)
        ]);
      });
    }

    // Network
    if (verbose) {
      table.push([
        'Network',
        `${report.resources.network.latency}ms latency`,
        `${(report.resources.network.bandwidth / 1000000).toFixed(0)} Mbps`,
        '-'
      ]);
    }

    console.log(table.toString());

    // Capabilities
    if (verbose && report.resources.capabilities.length > 0) {
      console.log(chalk.bold('   Capabilities:'));
      report.resources.capabilities.forEach(cap => {
        console.log(chalk.gray(`     • ${cap}`));
      });
    }

    console.log('');
  }

  /**
   * Display monitoring data
   */
  displayMonitoringData(report, metrics) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.bold(`\n🖥️  ${report.serverId} - ${timestamp}`));

    const values = [];

    if (metrics.includes('cpu')) {
      const cpuBar = this.createProgressBar(report.resources.cpu.usage, 100);
      values.push(`CPU: ${cpuBar} ${formatPercentage(report.resources.cpu.usage)}`);
    }

    if (metrics.includes('memory')) {
      const memUsage = (report.resources.memory.used / report.resources.memory.total) * 100;
      const memBar = this.createProgressBar(memUsage, 100);
      values.push(`MEM: ${memBar} ${formatPercentage(memUsage)}`);
    }

    if (metrics.includes('gpu') && report.resources.gpu) {
      report.resources.gpu.forEach((gpu, i) => {
        const gpuBar = this.createProgressBar(gpu.utilization, 100);
        values.push(`GPU${i}: ${gpuBar} ${formatPercentage(gpu.utilization)}`);
      });
    }

    if (metrics.includes('network')) {
      values.push(`NET: ↓${report.resources.network.latency}ms`);
    }

    values.forEach(value => console.log(`   ${value}`));
  }

  /**
   * Create a progress bar
   */
  createProgressBar(value, max, width = 20) {
    const percentage = value / max;
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    let color = 'green';
    if (percentage > 0.8) {color = 'red';}
    else if (percentage > 0.6) {color = 'yellow';}

    const bar = chalk[color]('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    return `[${bar}]`;
  }

  /**
   * Display resource summary
   */
  displaySummary(reports) {
    console.log(chalk.bold.cyan('📊 Summary\n'));

    const summary = {
      totalServers: reports.length,
      healthy: reports.filter(r => r.status === 'healthy').length,
      degraded: reports.filter(r => r.status === 'degraded').length,
      overloaded: reports.filter(r => r.status === 'overloaded').length,
      offline: reports.filter(r => r.status === 'offline').length
    };

    const table = new Table({
      head: ['Status', 'Count', 'Percentage'],
      style: { head: ['cyan'] }
    });

    table.push(
      ['Healthy', chalk.green(summary.healthy), formatPercentage(summary.healthy / summary.totalServers * 100)],
      ['Degraded', chalk.yellow(summary.degraded), formatPercentage(summary.degraded / summary.totalServers * 100)],
      ['Overloaded', chalk.red(summary.overloaded), formatPercentage(summary.overloaded / summary.totalServers * 100)],
      ['Offline', chalk.gray(summary.offline), formatPercentage(summary.offline / summary.totalServers * 100)]
    );

    console.log(table.toString());

    // Average utilization
    if (reports.length > 0) {
      const avgCPU = reports.reduce((sum, r) => sum + r.resources.cpu.usage, 0) / reports.length;
      const avgMem = reports.reduce((sum, r) => {
        return sum + (r.resources.memory.used / r.resources.memory.total * 100);
      }, 0) / reports.length;

      console.log(chalk.bold('\n📈 Average Utilization'));
      console.log(`   CPU: ${formatPercentage(avgCPU)}`);
      console.log(`   Memory: ${formatPercentage(avgMem)}`);
    }
  }

  /**
   * Display resource analysis
   */
  displayAnalysis(analysis) {
    console.log(chalk.bold('📋 Current Resource Analysis\n'));

    if (analysis.issues.length > 0) {
      console.log(chalk.yellow('⚠️  Issues Detected:'));
      analysis.issues.forEach(issue => {
        console.log(chalk.yellow(`   • ${issue.description}`));
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
      });
      console.log('');
    }

    if (analysis.opportunities.length > 0) {
      console.log(chalk.green('💡 Optimization Opportunities:'));
      analysis.opportunities.forEach(opp => {
        console.log(chalk.green(`   • ${opp.description}`));
        console.log(chalk.gray(`     Potential Savings: ${opp.savings}`));
      });
      console.log('');
    }
  }

  /**
   * Display optimization plan
   */
  displayOptimizationPlan(plan) {
    console.log(chalk.bold('📝 Optimization Plan\n'));

    const table = new Table({
      head: ['Action', 'Target', 'Impact', 'Risk'],
      style: { head: ['cyan'] }
    });

    plan.actions.forEach(action => {
      table.push([
        action.type,
        action.target,
        chalk.green(action.impact),
        action.risk === 'high' ? chalk.red(action.risk) : chalk.yellow(action.risk)
      ]);
    });

    console.log(table.toString());

    console.log(chalk.bold('\n📊 Expected Outcomes:'));
    console.log(`   • CPU Reduction: ${chalk.green(plan.expectedOutcomes.cpuReduction)}`);
    console.log(`   • Memory Savings: ${chalk.green(plan.expectedOutcomes.memorySavings)}`);
    console.log(`   • Performance Gain: ${chalk.green(plan.expectedOutcomes.performanceGain)}`);
  }

  /**
   * Display optimization results
   */
  displayOptimizationResults(results) {
    console.log(chalk.bold('\n✅ Optimization Results\n'));

    const table = new Table({
      head: ['Action', 'Status', 'Details'],
      style: { head: ['cyan'] }
    });

    results.forEach(result => {
      const status = result.success ? chalk.green('✓ Success') : chalk.red('✗ Failed');
      table.push([result.action, status, result.details || '-']);
    });

    console.log(table.toString());

    const successCount = results.filter(r => r.success).length;
    console.log(chalk.bold(`\n📈 Summary: ${successCount}/${results.length} actions completed successfully`));
  }

  /**
   * Display history chart
   */
  displayHistoryChart(history) {
    // Simplified ASCII chart
    console.log(chalk.bold('📊 Resource Usage Over Time\n'));

    const maxWidth = 60;
    const maxHeight = 10;

    // Group by metric
    const metrics = {};
    history.forEach(entry => {
      Object.keys(entry.metrics).forEach(metric => {
        if (!metrics[metric]) {metrics[metric] = [];}
        metrics[metric].push(entry.metrics[metric]);
      });
    });

    // Display each metric
    Object.entries(metrics).forEach(([metric, values]) => {
      console.log(chalk.bold(`${metric.toUpperCase()}:`));

      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min;

      // Create simple sparkline
      const sparkline = values.map(v => {
        const normalized = (v - min) / range;
        const height = Math.round(normalized * maxHeight);
        return '▁▂▃▄▅▆▇█'[Math.min(height, 7)];
      }).join('');

      console.log(`  ${sparkline}`);
      console.log(chalk.gray(`  Min: ${min.toFixed(2)} | Max: ${max.toFixed(2)} | Current: ${values[values.length - 1].toFixed(2)}\n`));
    });
  }

  /**
   * Display history statistics
   */
  displayHistoryStats(history) {
    console.log(chalk.bold('\n📊 Statistics\n'));

    const stats = this.calculateHistoryStats(history);

    Object.entries(stats).forEach(([metric, values]) => {
      console.log(chalk.bold(`${metric}:`));
      console.log(`  Average: ${values.avg.toFixed(2)}`);
      console.log(`  Min: ${values.min.toFixed(2)}`);
      console.log(`  Max: ${values.max.toFixed(2)}`);
      console.log(`  Std Dev: ${values.stdDev.toFixed(2)}\n`);
    });
  }

  /**
   * Calculate history statistics
   */
  calculateHistoryStats(history) {
    const stats = {};

    // Group by metric
    const metrics = {};
    history.forEach(entry => {
      Object.entries(entry.metrics).forEach(([metric, value]) => {
        if (!metrics[metric]) {metrics[metric] = [];}
        metrics[metric].push(value);
      });
    });

    // Calculate stats for each metric
    Object.entries(metrics).forEach(([metric, values]) => {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate standard deviation
      const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(avgSquaredDiff);

      stats[metric] = { avg, min, max, stdDev };
    });

    return stats;
  }
}

// Command handlers
const resourceCommands = new ResourceCommands();

module.exports = {
  name: 'resource',
  description: 'Manage and monitor system resources',

  commands: {
    status: {
      description: 'Display current resource status',
      options: [
        { name: '--json', description: 'Output in JSON format' },
        { name: '--server <id>', description: 'Show status for specific server' },
        { name: '--verbose', description: 'Show detailed information' }
      ],
      handler: (args) => resourceCommands.status(args)
    },

    monitor: {
      description: 'Monitor resources in real-time',
      options: [
        { name: '--interval <ms>', description: 'Update interval in milliseconds (default: 5000)' },
        { name: '--metrics <list>', description: 'Comma-separated metrics to display (default: cpu,memory,network)' },
        { name: '--server <id>', description: 'Monitor specific server' }
      ],
      handler: (args) => resourceCommands.monitor(args)
    },

    optimize: {
      description: 'Optimize resource allocation',
      options: [
        { name: '--strategy <type>', description: 'Optimization strategy: balanced, performance, efficiency (default: balanced)' },
        { name: '--dry-run', description: 'Show optimization plan without applying' },
        { name: '--verbose', description: 'Show detailed optimization steps' }
      ],
      handler: (args) => resourceCommands.optimize(args)
    },

    history: {
      description: 'Display resource usage history',
      options: [
        { name: '--duration <time>', description: 'History duration: 1h, 24h, 7d (default: 1h)' },
        { name: '--server <id>', description: 'Show history for specific server' },
        { name: '--metric <type>', description: 'Specific metric to display (default: all)' },
        { name: '--format <type>', description: 'Output format: chart, table, json (default: chart)' }
      ],
      handler: (args) => resourceCommands.history(args)
    }
  }
};