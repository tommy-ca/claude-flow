/**
 * Hive Mind command for Claude-Flow v2.0.0
 * Advanced swarm intelligence with collective decision-making
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import readline from 'readline';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { args, cwd, exit, writeTextFile, readTextFile, mkdirAsync } from '../node-compat.js';

// Import SQLite for persistence
import Database from 'better-sqlite3';

// Import MCP tool wrappers
import { MCPToolWrapper } from './hive-mind/mcp-wrapper.js';
import { HiveMindCore } from './hive-mind/core.js';
import { QueenCoordinator } from './hive-mind/queen.js';
import { CollectiveMemory } from './hive-mind/memory.js';
import { SwarmCommunication } from './hive-mind/communication.js';

function showHiveMindHelp() {
  console.log(`
${chalk.yellow('🧠 Claude Flow Hive Mind System')}

${chalk.bold('USAGE:')}
  claude-flow hive-mind [subcommand] [options]

${chalk.bold('SUBCOMMANDS:')}
  ${chalk.green('init')}         Initialize hive mind system
  ${chalk.green('spawn')}        Spawn hive mind swarm for a task
  ${chalk.green('status')}       Show hive mind status
  ${chalk.green('consensus')}    View consensus decisions
  ${chalk.green('memory')}       Manage collective memory
  ${chalk.green('metrics')}      View performance metrics
  ${chalk.green('wizard')}       Interactive hive mind wizard

${chalk.bold('EXAMPLES:')}
  ${chalk.gray('# Initialize hive mind')}
  claude-flow hive-mind init

  ${chalk.gray('# Spawn swarm with interactive wizard')}
  claude-flow hive-mind spawn

  ${chalk.gray('# Quick spawn with objective')}
  claude-flow hive-mind spawn "Build microservices architecture"

  ${chalk.gray('# View current status')}
  claude-flow hive-mind status

  ${chalk.gray('# Interactive wizard')}
  claude-flow hive-mind wizard

${chalk.bold('KEY FEATURES:')}
  ${chalk.cyan('🐝')} Queen-led coordination with worker specialization
  ${chalk.cyan('🧠')} Collective memory and knowledge sharing
  ${chalk.cyan('🤝')} Consensus building for critical decisions
  ${chalk.cyan('⚡')} Parallel task execution with auto-scaling
  ${chalk.cyan('🔄')} Work stealing and load balancing
  ${chalk.cyan('📊')} Real-time metrics and performance tracking
  ${chalk.cyan('🛡️')} Fault tolerance and self-healing
  ${chalk.cyan('🔒')} Secure communication between agents

${chalk.bold('OPTIONS:')}
  --queen-type <type>    Queen coordinator type (strategic, tactical, adaptive)
  --max-workers <n>      Maximum worker agents (default: 8)
  --consensus <type>     Consensus algorithm (majority, weighted, byzantine)
  --memory-size <mb>     Collective memory size in MB (default: 100)
  --auto-scale           Enable auto-scaling based on workload
  --encryption           Enable encrypted communication
  --monitor              Real-time monitoring dashboard
  --verbose              Detailed logging

${chalk.bold('For more information:')}
${chalk.blue('https://github.com/ruvnet/claude-code-flow/docs/hive-mind.md')}
`);
}

/**
 * Initialize hive mind system
 */
async function initHiveMind(flags) {
  const spinner = ora('Initializing Hive Mind system...').start();
  
  try {
    // Create hive mind directory structure
    const hiveMindDir = path.join(cwd(), '.hive-mind');
    if (!existsSync(hiveMindDir)) {
      mkdirSync(hiveMindDir, { recursive: true });
    }
    
    // Initialize SQLite database
    const dbPath = path.join(hiveMindDir, 'hive.db');
    const db = new Database(dbPath);
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS swarms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        objective TEXT,
        status TEXT DEFAULT 'active',
        queen_type TEXT DEFAULT 'strategic',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        role TEXT,
        status TEXT DEFAULT 'idle',
        capabilities TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        agent_id TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );
      
      CREATE TABLE IF NOT EXISTS collective_memory (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        key TEXT NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'knowledge',
        confidence REAL DEFAULT 1.0,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );
      
      CREATE TABLE IF NOT EXISTS consensus_decisions (
        id TEXT PRIMARY KEY,
        swarm_id TEXT,
        topic TEXT NOT NULL,
        decision TEXT,
        votes TEXT,
        algorithm TEXT DEFAULT 'majority',
        confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (swarm_id) REFERENCES swarms(id)
      );
    `);
    
    db.close();
    
    // Create configuration file
    const config = {
      version: '2.0.0',
      initialized: new Date().toISOString(),
      defaults: {
        queenType: 'strategic',
        maxWorkers: 8,
        consensusAlgorithm: 'majority',
        memorySize: 100,
        autoScale: true,
        encryption: false
      },
      mcpTools: {
        enabled: true,
        parallel: true,
        timeout: 60000
      }
    };
    
    await writeFile(
      path.join(hiveMindDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );
    
    spinner.succeed('Hive Mind system initialized successfully!');
    
    console.log('\n' + chalk.green('✓') + ' Created .hive-mind directory');
    console.log(chalk.green('✓') + ' Initialized SQLite database');
    console.log(chalk.green('✓') + ' Created configuration file');
    console.log('\n' + chalk.yellow('Next steps:'));
    console.log('  1. Run ' + chalk.cyan('claude-flow hive-mind spawn') + ' to create your first swarm');
    console.log('  2. Use ' + chalk.cyan('claude-flow hive-mind wizard') + ' for interactive setup');
    
  } catch (error) {
    spinner.fail('Failed to initialize Hive Mind system');
    console.error(chalk.red('Error:'), error.message);
    exit(1);
  }
}

/**
 * Interactive wizard for hive mind operations
 */
async function hiveMindWizard() {
  console.log(chalk.yellow('\n🧙 Hive Mind Interactive Wizard\n'));
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🐝 Create new swarm', value: 'spawn' },
        { name: '📊 View swarm status', value: 'status' },
        { name: '🧠 Manage collective memory', value: 'memory' },
        { name: '🤝 View consensus decisions', value: 'consensus' },
        { name: '📈 Performance metrics', value: 'metrics' },
        { name: '🔧 Configure hive mind', value: 'config' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ]);
  
  switch (action) {
    case 'spawn':
      await spawnSwarmWizard();
      break;
    case 'status':
      await showStatus({});
      break;
    case 'memory':
      await manageMemoryWizard();
      break;
    case 'consensus':
      await showConsensus({});
      break;
    case 'metrics':
      await showMetrics({});
      break;
    case 'config':
      await configureWizard();
      break;
    case 'exit':
      console.log(chalk.gray('Exiting wizard...'));
      break;
  }
}

/**
 * Spawn swarm wizard
 */
async function spawnSwarmWizard() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'objective',
      message: 'What is the swarm objective?',
      validate: input => input.trim().length > 0 || 'Please enter an objective'
    },
    {
      type: 'input',
      name: 'name',
      message: 'Swarm name (optional):',
      default: answers => `swarm-${Date.now()}`
    },
    {
      type: 'list',
      name: 'queenType',
      message: 'Select queen coordinator type:',
      choices: [
        { name: 'Strategic - High-level planning and coordination', value: 'strategic' },
        { name: 'Tactical - Detailed task management', value: 'tactical' },
        { name: 'Adaptive - Learns and adapts strategies', value: 'adaptive' }
      ],
      default: 'strategic'
    },
    {
      type: 'number',
      name: 'maxWorkers',
      message: 'Maximum number of worker agents:',
      default: 8,
      validate: input => input > 0 && input <= 20 || 'Please enter a number between 1 and 20'
    },
    {
      type: 'checkbox',
      name: 'workerTypes',
      message: 'Select worker agent types:',
      choices: [
        { name: 'Researcher', value: 'researcher', checked: true },
        { name: 'Coder', value: 'coder', checked: true },
        { name: 'Analyst', value: 'analyst', checked: true },
        { name: 'Tester', value: 'tester', checked: true },
        { name: 'Architect', value: 'architect' },
        { name: 'Reviewer', value: 'reviewer' },
        { name: 'Optimizer', value: 'optimizer' },
        { name: 'Documenter', value: 'documenter' }
      ]
    },
    {
      type: 'list',
      name: 'consensusAlgorithm',
      message: 'Consensus algorithm for decisions:',
      choices: [
        { name: 'Majority - Simple majority voting', value: 'majority' },
        { name: 'Weighted - Expertise-weighted voting', value: 'weighted' },
        { name: 'Byzantine - Fault-tolerant consensus', value: 'byzantine' }
      ],
      default: 'majority'
    },
    {
      type: 'confirm',
      name: 'autoScale',
      message: 'Enable auto-scaling?',
      default: true
    },
    {
      type: 'confirm',
      name: 'monitor',
      message: 'Launch monitoring dashboard?',
      default: true
    }
  ]);
  
  // Spawn the swarm with collected parameters
  await spawnSwarm([answers.objective], {
    name: answers.name,
    queenType: answers.queenType,
    maxWorkers: answers.maxWorkers,
    workerTypes: answers.workerTypes.join(','),
    consensus: answers.consensusAlgorithm,
    autoScale: answers.autoScale,
    monitor: answers.monitor
  });
}

/**
 * Spawn a hive mind swarm
 */
async function spawnSwarm(args, flags) {
  const objective = args.join(' ').trim();
  
  if (!objective && !flags.wizard) {
    console.error(chalk.red('Error: Please provide an objective or use --wizard flag'));
    console.log('Example: claude-flow hive-mind spawn "Build REST API"');
    return;
  }
  
  const spinner = ora('Spawning Hive Mind swarm...').start();
  
  try {
    // Initialize hive mind core
    const hiveMind = new HiveMindCore({
      objective,
      name: flags.name || `hive-${Date.now()}`,
      queenType: flags.queenType || 'strategic',
      maxWorkers: flags.maxWorkers || 8,
      consensusAlgorithm: flags.consensus || 'majority',
      autoScale: flags.autoScale !== false,
      encryption: flags.encryption || false
    });
    
    // Initialize database connection
    const dbPath = path.join(cwd(), '.hive-mind', 'hive.db');
    const db = new Database(dbPath);
    
    // Create swarm record
    const swarmId = `swarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO swarms (id, name, objective, queen_type)
      VALUES (?, ?, ?, ?)
    `).run(swarmId, hiveMind.config.name, objective, hiveMind.config.queenType);
    
    spinner.text = 'Initializing Queen coordinator...';
    
    // Initialize Queen
    const queen = new QueenCoordinator({
      swarmId,
      type: hiveMind.config.queenType,
      objective
    });
    
    // Spawn Queen agent
    const queenAgent = {
      id: `queen-${swarmId}`,
      swarmId,
      name: 'Queen Coordinator',
      type: 'coordinator',
      role: 'queen',
      status: 'active',
      capabilities: JSON.stringify(['coordination', 'planning', 'decision-making'])
    };
    
    db.prepare(`
      INSERT INTO agents (id, swarm_id, name, type, role, status, capabilities)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(...Object.values(queenAgent));
    
    spinner.text = 'Spawning worker agents...';
    
    // Determine worker types
    const workerTypes = flags.workerTypes 
      ? flags.workerTypes.split(',') 
      : ['researcher', 'coder', 'analyst', 'tester'];
    
    // Spawn worker agents
    const workers = [];
    for (let i = 0; i < Math.min(workerTypes.length, hiveMind.config.maxWorkers); i++) {
      const workerType = workerTypes[i % workerTypes.length];
      const workerId = `worker-${swarmId}-${i}`;
      
      const worker = {
        id: workerId,
        swarmId,
        name: `${workerType.charAt(0).toUpperCase() + workerType.slice(1)} Worker ${i + 1}`,
        type: workerType,
        role: 'worker',
        status: 'idle',
        capabilities: JSON.stringify(getAgentCapabilities(workerType))
      };
      
      workers.push(worker);
      
      db.prepare(`
        INSERT INTO agents (id, swarm_id, name, type, role, status, capabilities)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(...Object.values(worker));
    }
    
    spinner.text = 'Initializing collective memory...';
    
    // Initialize collective memory
    const memory = new CollectiveMemory({
      swarmId,
      maxSize: flags.memorySize || 100
    });
    
    // Store initial context
    memory.store('objective', objective, 'context');
    memory.store('queen_type', hiveMind.config.queenType, 'config');
    memory.store('worker_count', workers.length, 'metrics');
    
    spinner.text = 'Establishing communication channels...';
    
    // Initialize communication system
    const communication = new SwarmCommunication({
      swarmId,
      encryption: hiveMind.config.encryption
    });
    
    db.close();
    
    spinner.succeed('Hive Mind swarm spawned successfully!');
    
    // Display swarm summary
    console.log('\n' + chalk.bold('🐝 Swarm Summary:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan('Swarm ID:'), swarmId);
    console.log(chalk.cyan('Name:'), hiveMind.config.name);
    console.log(chalk.cyan('Objective:'), objective);
    console.log(chalk.cyan('Queen Type:'), hiveMind.config.queenType);
    console.log(chalk.cyan('Workers:'), workers.length);
    console.log(chalk.cyan('Worker Types:'), workerTypes.join(', '));
    console.log(chalk.cyan('Consensus:'), hiveMind.config.consensusAlgorithm);
    console.log(chalk.cyan('Auto-scaling:'), hiveMind.config.autoScale ? 'Enabled' : 'Disabled');
    console.log(chalk.gray('─'.repeat(50)));
    
    // Launch monitoring if requested
    if (flags.monitor) {
      console.log('\n' + chalk.yellow('Launching monitoring dashboard...'));
      // TODO: Implement monitoring dashboard
    }
    
    console.log('\n' + chalk.green('✓') + ' Swarm is ready for coordination');
    console.log(chalk.gray('Use "claude-flow hive-mind status" to view swarm activity'));
    
  } catch (error) {
    spinner.fail('Failed to spawn Hive Mind swarm');
    console.error(chalk.red('Error:'), error.message);
    exit(1);
  }
}

/**
 * Get agent capabilities based on type
 */
function getAgentCapabilities(type) {
  const capabilities = {
    researcher: ['web-search', 'data-gathering', 'analysis', 'synthesis'],
    coder: ['code-generation', 'implementation', 'refactoring', 'debugging'],
    analyst: ['data-analysis', 'pattern-recognition', 'reporting', 'visualization'],
    tester: ['test-generation', 'quality-assurance', 'bug-detection', 'validation'],
    architect: ['system-design', 'architecture', 'planning', 'documentation'],
    reviewer: ['code-review', 'quality-check', 'feedback', 'improvement'],
    optimizer: ['performance-tuning', 'optimization', 'profiling', 'enhancement'],
    documenter: ['documentation', 'explanation', 'tutorial-creation', 'knowledge-base']
  };
  
  return capabilities[type] || ['general'];
}

/**
 * Show hive mind status
 */
async function showStatus(flags) {
  try {
    const dbPath = path.join(cwd(), '.hive-mind', 'hive.db');
    
    if (!existsSync(dbPath)) {
      console.error(chalk.red('Error: Hive Mind not initialized'));
      console.log('Run "claude-flow hive-mind init" first');
      return;
    }
    
    const db = new Database(dbPath);
    
    // Get active swarms
    const swarms = db.prepare(`
      SELECT * FROM swarms 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    `).all();
    
    if (swarms.length === 0) {
      console.log(chalk.gray('No active swarms found'));
      db.close();
      return;
    }
    
    console.log(chalk.bold('\n🐝 Active Hive Mind Swarms\n'));
    
    for (const swarm of swarms) {
      console.log(chalk.yellow('═'.repeat(60)));
      console.log(chalk.cyan('Swarm:'), swarm.name);
      console.log(chalk.cyan('ID:'), swarm.id);
      console.log(chalk.cyan('Objective:'), swarm.objective);
      console.log(chalk.cyan('Queen Type:'), swarm.queen_type);
      console.log(chalk.cyan('Status:'), chalk.green(swarm.status));
      console.log(chalk.cyan('Created:'), new Date(swarm.created_at).toLocaleString());
      
      // Get agents
      const agents = db.prepare(`
        SELECT * FROM agents 
        WHERE swarm_id = ?
      `).all(swarm.id);
      
      console.log('\n' + chalk.bold('Agents:'));
      
      // Group by role
      const queen = agents.find(a => a.role === 'queen');
      const workers = agents.filter(a => a.role === 'worker');
      
      if (queen) {
        console.log('  ' + chalk.magenta('👑 Queen:'), queen.name, chalk.gray(`(${queen.status})`));
      }
      
      console.log('  ' + chalk.blue('🐝 Workers:'));
      workers.forEach(worker => {
        const statusColor = worker.status === 'active' ? 'green' : 
                          worker.status === 'busy' ? 'yellow' : 'gray';
        console.log(`    - ${worker.name} (${worker.type}) ${chalk[statusColor](worker.status)}`);
      });
      
      // Get task statistics
      const taskStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM tasks
        WHERE swarm_id = ?
      `).get(swarm.id);
      
      console.log('\n' + chalk.bold('Tasks:'));
      console.log(`  Total: ${taskStats.total}`);
      console.log(`  Completed: ${chalk.green(taskStats.completed)}`);
      console.log(`  In Progress: ${chalk.yellow(taskStats.in_progress)}`);
      console.log(`  Pending: ${chalk.gray(taskStats.pending)}`);
      
      // Get memory stats
      const memoryCount = db.prepare(`
        SELECT COUNT(*) as count FROM collective_memory
        WHERE swarm_id = ?
      `).get(swarm.id);
      
      console.log('\n' + chalk.bold('Collective Memory:'));
      console.log(`  Entries: ${memoryCount.count}`);
      
      // Get consensus stats
      const consensusCount = db.prepare(`
        SELECT COUNT(*) as count FROM consensus_decisions
        WHERE swarm_id = ?
      `).get(swarm.id);
      
      console.log('\n' + chalk.bold('Consensus Decisions:'));
      console.log(`  Total: ${consensusCount.count}`);
    }
    
    console.log(chalk.yellow('═'.repeat(60)) + '\n');
    
    db.close();
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    exit(1);
  }
}

/**
 * Show consensus decisions
 */
async function showConsensus(flags) {
  try {
    const dbPath = path.join(cwd(), '.hive-mind', 'hive.db');
    const db = new Database(dbPath);
    
    const decisions = db.prepare(`
      SELECT cd.*, s.name as swarm_name
      FROM consensus_decisions cd
      JOIN swarms s ON cd.swarm_id = s.id
      ORDER BY cd.created_at DESC
      LIMIT 20
    `).all();
    
    if (decisions.length === 0) {
      console.log(chalk.gray('No consensus decisions found'));
      db.close();
      return;
    }
    
    console.log(chalk.bold('\n🤝 Recent Consensus Decisions\n'));
    
    decisions.forEach(decision => {
      console.log(chalk.yellow('─'.repeat(50)));
      console.log(chalk.cyan('Swarm:'), decision.swarm_name);
      console.log(chalk.cyan('Topic:'), decision.topic);
      console.log(chalk.cyan('Decision:'), decision.decision);
      console.log(chalk.cyan('Algorithm:'), decision.algorithm);
      console.log(chalk.cyan('Confidence:'), `${(decision.confidence * 100).toFixed(1)}%`);
      console.log(chalk.cyan('Time:'), new Date(decision.created_at).toLocaleString());
      
      if (decision.votes) {
        const votes = JSON.parse(decision.votes);
        console.log(chalk.cyan('Votes:'));
        Object.entries(votes).forEach(([agent, vote]) => {
          console.log(`  - ${agent}: ${vote}`);
        });
      }
    });
    
    console.log(chalk.yellow('─'.repeat(50)) + '\n');
    
    db.close();
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    exit(1);
  }
}

/**
 * Show performance metrics
 */
async function showMetrics(flags) {
  try {
    const dbPath = path.join(cwd(), '.hive-mind', 'hive.db');
    const db = new Database(dbPath);
    
    // Get overall metrics
    const overallStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM swarms) as total_swarms,
        (SELECT COUNT(*) FROM agents) as total_agents,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks
    `).get();
    
    console.log(chalk.bold('\n📊 Hive Mind Performance Metrics\n'));
    
    // Get task status breakdown
    const taskBreakdown = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      GROUP BY status
      ORDER BY count DESC
    `).all();

    console.log(chalk.cyan('Overall Statistics:'));
    console.log(`  Total Swarms: ${overallStats.total_swarms}`);
    console.log(`  Total Agents: ${overallStats.total_agents}`);
    console.log(`  Total Tasks: ${overallStats.total_tasks}`);
    console.log(`  Completed Tasks: ${overallStats.completed_tasks}`);
    console.log(`  Success Rate: ${overallStats.total_tasks > 0 
      ? ((overallStats.completed_tasks / overallStats.total_tasks) * 100).toFixed(1) + '%'
      : 'N/A'}`);
    
    if (taskBreakdown.length > 0) {
      console.log('\n' + chalk.cyan('Task Status Breakdown:'));
      taskBreakdown.forEach(status => {
        const percentage = overallStats.total_tasks > 0 
          ? ((status.count / overallStats.total_tasks) * 100).toFixed(1)
          : '0';
        const statusColor = 
          status.status === 'completed' ? 'green' :
          status.status === 'in_progress' ? 'yellow' :
          status.status === 'failed' ? 'red' : 'gray';
        console.log(`  ${chalk[statusColor](status.status.charAt(0).toUpperCase() + status.status.slice(1))}: ${status.count} (${percentage}%)`);
      });
    }
    
    // Get agent performance
    const agentPerf = db.prepare(`
      SELECT 
        a.name,
        a.type,
        COUNT(t.id) as tasks_assigned,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed,
        AVG(CASE WHEN t.completed_at IS NOT NULL 
          THEN (julianday(t.completed_at) - julianday(t.created_at)) * 24 * 60 
          ELSE NULL END) as avg_completion_minutes
      FROM agents a
      LEFT JOIN tasks t ON a.id = t.agent_id
      GROUP BY a.id
      HAVING tasks_assigned > 0
      ORDER BY tasks_completed DESC
      LIMIT 10
    `).all();
    
    if (agentPerf.length > 0) {
      console.log('\n' + chalk.cyan('Top Performing Agents:'));
      agentPerf.forEach((agent, index) => {
        const successRate = agent.tasks_assigned > 0
          ? ((agent.tasks_completed / agent.tasks_assigned) * 100).toFixed(1)
          : '0';
        console.log(`  ${index + 1}. ${agent.name} (${agent.type})`);
        console.log(`     Tasks: ${agent.tasks_completed}/${agent.tasks_assigned} (${successRate}%)`);
        if (agent.avg_completion_minutes) {
          console.log(`     Avg Time: ${agent.avg_completion_minutes.toFixed(1)} minutes`);
        }
      });
    }
    
    // Get swarm performance
    const swarmPerf = db.prepare(`
      SELECT 
        s.name,
        s.objective,
        (SELECT COUNT(*) FROM agents a WHERE a.swarm_id = s.id) as agent_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.swarm_id = s.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.swarm_id = s.id AND t.status = 'completed') as completed_count,
        (SELECT COUNT(*) FROM collective_memory cm WHERE cm.swarm_id = s.id) as memory_entries,
        (SELECT COUNT(*) FROM consensus_decisions cd WHERE cd.swarm_id = s.id) as consensus_count
      FROM swarms s
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 5
    `).all();
    
    if (swarmPerf.length > 0) {
      console.log('\n' + chalk.cyan('Active Swarm Performance:'));
      swarmPerf.forEach(swarm => {
        const successRate = swarm.task_count > 0
          ? ((swarm.completed_count / swarm.task_count) * 100).toFixed(1)
          : '0';
        console.log(`\n  ${chalk.yellow(swarm.name)}`);
        console.log(`  Objective: ${swarm.objective.substring(0, 50)}...`);
        console.log(`  Agents: ${swarm.agent_count}, Tasks: ${swarm.completed_count}/${swarm.task_count} (${successRate}%)`);
        console.log(`  Memory: ${swarm.memory_entries} entries, Consensus: ${swarm.consensus_count} decisions`);
      });
    }
    
    // Get performance insights
    const avgTaskTime = db.prepare(`
      SELECT 
        AVG(CASE WHEN completed_at IS NOT NULL 
          THEN (julianday(completed_at) - julianday(created_at)) * 24 * 60 
          ELSE NULL END) as avg_minutes
      FROM tasks
      WHERE status = 'completed'
    `).get();
    
    const agentTypePerf = db.prepare(`
      SELECT 
        a.type,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        AVG(CASE WHEN t.completed_at IS NOT NULL 
          THEN (julianday(t.completed_at) - julianday(t.created_at)) * 24 * 60 
          ELSE NULL END) as avg_completion_minutes
      FROM agents a
      LEFT JOIN tasks t ON a.id = t.agent_id
      GROUP BY a.type
      HAVING total_tasks > 0
      ORDER BY completed_tasks DESC
    `).all();
    
    if (avgTaskTime.avg_minutes) {
      console.log('\n' + chalk.cyan('Performance Insights:'));
      console.log(`  Average Task Completion Time: ${avgTaskTime.avg_minutes.toFixed(1)} minutes`);
      
      if (agentTypePerf.length > 0) {
        console.log('\n' + chalk.cyan('Agent Type Performance:'));
        agentTypePerf.forEach(type => {
          const successRate = type.total_tasks > 0 
            ? ((type.completed_tasks / type.total_tasks) * 100).toFixed(1)
            : '0';
          console.log(`  ${type.type.charAt(0).toUpperCase() + type.type.slice(1)}: ${type.completed_tasks}/${type.total_tasks} (${successRate}%)`);
          if (type.avg_completion_minutes) {
            console.log(`    Average time: ${type.avg_completion_minutes.toFixed(1)} minutes`);
          }
        });
      }
    }
    
    console.log('\n');
    db.close();
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    exit(1);
  }
}

/**
 * Manage collective memory wizard
 */
async function manageMemoryWizard() {
  // TODO: Implement memory management wizard
  console.log(chalk.yellow('Memory management wizard coming soon...'));
}

/**
 * Configure hive mind wizard
 */
async function configureWizard() {
  // TODO: Implement configuration wizard
  console.log(chalk.yellow('Configuration wizard coming soon...'));
}

/**
 * Main hive mind command handler
 */
export async function hiveMindCommand(args, flags) {
  const subcommand = args[0];
  const subArgs = args.slice(1);
  
  // If no subcommand, show help
  if (!subcommand) {
    showHiveMindHelp();
    return;
  }
  
  switch (subcommand) {
    case 'init':
      await initHiveMind(flags);
      break;
      
    case 'spawn':
      if (flags.wizard || subArgs.length === 0) {
        await spawnSwarmWizard();
      } else {
        await spawnSwarm(subArgs, flags);
      }
      break;
      
    case 'status':
      await showStatus(flags);
      break;
      
    case 'consensus':
      await showConsensus(flags);
      break;
      
    case 'memory':
      await manageMemoryWizard();
      break;
      
    case 'metrics':
      await showMetrics(flags);
      break;
      
    case 'wizard':
      await hiveMindWizard();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHiveMindHelp();
      break;
      
    default:
      console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
      console.log('Run "claude-flow hive-mind help" for usage information');
      exit(1);
  }
}

// Export for testing
export { showHiveMindHelp, initHiveMind, spawnSwarm, showStatus };