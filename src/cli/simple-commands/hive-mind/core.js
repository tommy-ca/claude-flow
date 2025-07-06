/**
 * Hive Mind Core System
 * Central orchestration and coordination logic
 */

import EventEmitter from 'events';
import { MCPToolWrapper } from './mcp-wrapper.js';

/**
 * HiveMindCore - Main orchestration class
 */
export class HiveMindCore extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      objective: '',
      name: `hive-${Date.now()}`,
      queenType: 'strategic',
      maxWorkers: 8,
      consensusAlgorithm: 'majority',
      autoScale: true,
      encryption: false,
      memorySize: 100, // MB
      taskTimeout: 60, // minutes
      ...config
    };
    
    this.state = {
      status: 'initializing',
      swarmId: null,
      queen: null,
      workers: new Map(),
      tasks: new Map(),
      memory: new Map(),
      decisions: new Map(),
      metrics: {
        tasksCreated: 0,
        tasksCompleted: 0,
        decisionsReached: 0,
        memoryUsage: 0
      }
    };
    
    this.mcpWrapper = new MCPToolWrapper({
      parallel: true,
      timeout: this.config.taskTimeout * 60 * 1000
    });
    
    this._initializeEventHandlers();
  }
  
  /**
   * Initialize event handlers
   */
  _initializeEventHandlers() {
    this.on('task:created', (task) => {
      this.state.metrics.tasksCreated++;
      this._checkAutoScale();
    });
    
    this.on('task:completed', (task) => {
      this.state.metrics.tasksCompleted++;
      this._updatePerformanceMetrics();
    });
    
    this.on('decision:reached', (decision) => {
      this.state.metrics.decisionsReached++;
    });
    
    this.on('worker:idle', (workerId) => {
      this._assignNextTask(workerId);
    });
    
    this.on('error', (error) => {
      console.error('Hive Mind Error:', error);
      this._handleError(error);
    });
  }
  
  /**
   * Initialize the hive mind swarm
   */
  async initialize() {
    try {
      this.state.status = 'initializing';
      
      // Initialize swarm with MCP tools
      const [swarmInit, memoryInit, neuralInit] = await this.mcpWrapper.initializeSwarm({
        topology: this._determineTopology(),
        maxAgents: this.config.maxWorkers + 1, // +1 for queen
        swarmId: this.config.name
      });
      
      this.state.swarmId = swarmInit.swarmId;
      
      // Store initial configuration in memory
      await this.mcpWrapper.storeMemory(
        this.state.swarmId,
        'config',
        this.config,
        'system'
      );
      
      this.state.status = 'ready';
      this.emit('initialized', { swarmId: this.state.swarmId });
      
      return this.state.swarmId;
      
    } catch (error) {
      this.state.status = 'error';
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Determine optimal topology based on objective
   */
  _determineTopology() {
    const objective = this.config.objective.toLowerCase();
    
    // Heuristic topology selection
    if (objective.includes('research') || objective.includes('analysis')) {
      return 'mesh'; // Peer-to-peer for collaborative research
    } else if (objective.includes('build') || objective.includes('develop')) {
      return 'hierarchical'; // Clear command structure for development
    } else if (objective.includes('monitor') || objective.includes('maintain')) {
      return 'ring'; // Circular for continuous monitoring
    } else if (objective.includes('coordinate') || objective.includes('orchestrate')) {
      return 'star'; // Centralized for coordination
    }
    
    return 'hierarchical'; // Default
  }
  
  /**
   * Spawn the queen coordinator
   */
  async spawnQueen(queenData) {
    const [spawnResult] = await this.mcpWrapper.spawnAgents(['coordinator'], this.state.swarmId);
    
    this.state.queen = {
      id: queenData.id,
      agentId: spawnResult.agentId,
      type: this.config.queenType,
      status: 'active',
      decisions: 0,
      tasks: 0
    };
    
    // Store queen info in memory
    await this.mcpWrapper.storeMemory(
      this.state.swarmId,
      'queen',
      this.state.queen,
      'system'
    );
    
    this.emit('queen:spawned', this.state.queen);
    return this.state.queen;
  }
  
  /**
   * Spawn worker agents
   */
  async spawnWorkers(workerTypes) {
    const spawnResults = await this.mcpWrapper.spawnAgents(workerTypes, this.state.swarmId);
    
    spawnResults.forEach((result, index) => {
      const worker = {
        id: `worker-${index}`,
        agentId: result.agentId,
        type: workerTypes[index],
        status: 'idle',
        tasksCompleted: 0,
        currentTask: null
      };
      
      this.state.workers.set(worker.id, worker);
    });
    
    // Store worker info in memory
    await this.mcpWrapper.storeMemory(
      this.state.swarmId,
      'workers',
      Array.from(this.state.workers.values()),
      'system'
    );
    
    this.emit('workers:spawned', this.state.workers.size);
    return Array.from(this.state.workers.values());
  }
  
  /**
   * Create and distribute task
   */
  async createTask(description, priority = 5) {
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      swarmId: this.state.swarmId,
      description,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      assignedTo: null,
      result: null
    };
    
    this.state.tasks.set(task.id, task);
    
    // Orchestrate task with MCP
    const [orchestrateResult] = await this.mcpWrapper.orchestrateTask(
      description,
      'adaptive'
    );
    
    task.orchestrationId = orchestrateResult.taskId;
    
    this.emit('task:created', task);
    
    // Find best worker for task
    const worker = this._findBestWorker(task);
    if (worker) {
      await this._assignTask(worker.id, task.id);
    }
    
    return task;
  }
  
  /**
   * Find best worker for task
   */
  _findBestWorker(task) {
    const availableWorkers = Array.from(this.state.workers.values())
      .filter(w => w.status === 'idle');
    
    if (availableWorkers.length === 0) {
      return null;
    }
    
    // Simple heuristic: match task keywords to worker types
    const taskLower = task.description.toLowerCase();
    
    // Priority matching
    const priorityMap = {
      researcher: ['research', 'investigate', 'analyze', 'study'],
      coder: ['code', 'implement', 'build', 'develop', 'fix', 'create'],
      analyst: ['analyze', 'data', 'metrics', 'performance', 'report'],
      tester: ['test', 'validate', 'check', 'verify', 'quality'],
      architect: ['design', 'architecture', 'structure', 'plan'],
      reviewer: ['review', 'feedback', 'improve', 'refactor'],
      optimizer: ['optimize', 'performance', 'speed', 'efficiency'],
      documenter: ['document', 'explain', 'write', 'describe']
    };
    
    // Find worker with best type match
    let bestWorker = null;
    let bestScore = 0;
    
    for (const worker of availableWorkers) {
      const keywords = priorityMap[worker.type] || [];
      const score = keywords.filter(k => taskLower.includes(k)).length;
      
      if (score > bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }
    
    return bestWorker || availableWorkers[0]; // Default to first available
  }
  
  /**
   * Assign task to worker
   */
  async _assignTask(workerId, taskId) {
    const worker = this.state.workers.get(workerId);
    const task = this.state.tasks.get(taskId);
    
    if (!worker || !task) return;
    
    worker.status = 'busy';
    worker.currentTask = taskId;
    task.status = 'in_progress';
    task.assignedTo = workerId;
    
    // Store assignment in memory
    await this.mcpWrapper.storeMemory(
      this.state.swarmId,
      `assignment-${taskId}`,
      { workerId, taskId, timestamp: Date.now() },
      'task'
    );
    
    this.emit('task:assigned', { workerId, taskId });
    
    // Simulate task execution
    this._executeTask(workerId, taskId);
  }
  
  /**
   * Execute task (simulated)
   */
  async _executeTask(workerId, taskId) {
    const worker = this.state.workers.get(workerId);
    const task = this.state.tasks.get(taskId);
    
    // Simulate task execution with random duration
    const duration = Math.random() * 30000 + 10000; // 10-40 seconds
    
    setTimeout(async () => {
      // Mark task as completed
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = `Task completed by ${worker.type} worker`;
      
      // Update worker
      worker.status = 'idle';
      worker.currentTask = null;
      worker.tasksCompleted++;
      
      // Store result in memory
      await this.mcpWrapper.storeMemory(
        this.state.swarmId,
        `result-${taskId}`,
        task,
        'result'
      );
      
      this.emit('task:completed', task);
      this.emit('worker:idle', workerId);
      
    }, duration);
  }
  
  /**
   * Assign next task to idle worker
   */
  _assignNextTask(workerId) {
    const pendingTasks = Array.from(this.state.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority);
    
    if (pendingTasks.length > 0) {
      this._assignTask(workerId, pendingTasks[0].id);
    }
  }
  
  /**
   * Build consensus for decision
   */
  async buildConsensus(topic, options) {
    const decision = {
      id: `decision-${Date.now()}`,
      swarmId: this.state.swarmId,
      topic,
      options,
      votes: new Map(),
      algorithm: this.config.consensusAlgorithm,
      status: 'voting',
      createdAt: new Date().toISOString()
    };
    
    this.state.decisions.set(decision.id, decision);
    
    // Simulate voting process
    const workers = Array.from(this.state.workers.values());
    const votes = {};
    
    // Each worker votes
    workers.forEach(worker => {
      const vote = options[Math.floor(Math.random() * options.length)];
      votes[worker.id] = vote;
      decision.votes.set(worker.id, vote);
    });
    
    // Queen gets weighted vote
    const queenVote = options[Math.floor(Math.random() * options.length)];
    votes['queen'] = queenVote;
    decision.votes.set('queen', queenVote);
    
    // Calculate consensus
    const result = this._calculateConsensus(decision);
    decision.result = result.decision;
    decision.confidence = result.confidence;
    decision.status = 'completed';
    
    // Store decision in memory
    await this.mcpWrapper.storeMemory(
      this.state.swarmId,
      `decision-${decision.id}`,
      decision,
      'consensus'
    );
    
    this.emit('decision:reached', decision);
    return decision;
  }
  
  /**
   * Calculate consensus based on algorithm
   */
  _calculateConsensus(decision) {
    const votes = Array.from(decision.votes.values());
    const voteCount = {};
    
    // Count votes
    votes.forEach(vote => {
      voteCount[vote] = (voteCount[vote] || 0) + 1;
    });
    
    switch (decision.algorithm) {
      case 'majority':
        // Simple majority
        const sorted = Object.entries(voteCount).sort((a, b) => b[1] - a[1]);
        const winner = sorted[0];
        return {
          decision: winner[0],
          confidence: winner[1] / votes.length
        };
        
      case 'weighted':
        // Weight queen vote more heavily
        const queenVote = decision.votes.get('queen');
        voteCount[queenVote] = (voteCount[queenVote] || 0) + 2; // Queen counts as 3 votes
        
        const weightedSorted = Object.entries(voteCount).sort((a, b) => b[1] - a[1]);
        const weightedWinner = weightedSorted[0];
        return {
          decision: weightedWinner[0],
          confidence: weightedWinner[1] / (votes.length + 2)
        };
        
      case 'byzantine':
        // Requires 2/3 majority
        const byzantineSorted = Object.entries(voteCount).sort((a, b) => b[1] - a[1]);
        const byzantineWinner = byzantineSorted[0];
        const byzantineConfidence = byzantineWinner[1] / votes.length;
        
        if (byzantineConfidence >= 0.67) {
          return {
            decision: byzantineWinner[0],
            confidence: byzantineConfidence
          };
        } else {
          return {
            decision: 'no_consensus',
            confidence: 0
          };
        }
        
      default:
        return {
          decision: 'unknown',
          confidence: 0
        };
    }
  }
  
  /**
   * Check if auto-scaling is needed
   */
  async _checkAutoScale() {
    if (!this.config.autoScale) return;
    
    const pendingTasks = Array.from(this.state.tasks.values())
      .filter(t => t.status === 'pending').length;
    
    const idleWorkers = Array.from(this.state.workers.values())
      .filter(w => w.status === 'idle').length;
    
    // Scale up if too many pending tasks
    if (pendingTasks > idleWorkers * 2 && this.state.workers.size < this.config.maxWorkers) {
      const newWorkerType = this._determineWorkerType();
      await this.spawnWorkers([newWorkerType]);
      console.log(`Auto-scaled: Added ${newWorkerType} worker`);
    }
    
    // Scale down if too many idle workers
    if (idleWorkers > pendingTasks + 2 && this.state.workers.size > 2) {
      // TODO: Implement worker removal
    }
  }
  
  /**
   * Determine worker type for auto-scaling
   */
  _determineWorkerType() {
    // Analyze pending tasks to determine needed worker type
    const pendingTasks = Array.from(this.state.tasks.values())
      .filter(t => t.status === 'pending');
    
    // Simple heuristic based on task descriptions
    const typeScores = {};
    
    pendingTasks.forEach(task => {
      const taskLower = task.description.toLowerCase();
      
      if (taskLower.includes('code') || taskLower.includes('implement')) {
        typeScores.coder = (typeScores.coder || 0) + 1;
      }
      if (taskLower.includes('test') || taskLower.includes('validate')) {
        typeScores.tester = (typeScores.tester || 0) + 1;
      }
      if (taskLower.includes('analyze') || taskLower.includes('data')) {
        typeScores.analyst = (typeScores.analyst || 0) + 1;
      }
      if (taskLower.includes('research') || taskLower.includes('investigate')) {
        typeScores.researcher = (typeScores.researcher || 0) + 1;
      }
    });
    
    // Return type with highest score
    const sorted = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'coder'; // Default to coder
  }
  
  /**
   * Update performance metrics
   */
  async _updatePerformanceMetrics() {
    // Calculate performance metrics
    const completionRate = this.state.metrics.tasksCompleted / this.state.metrics.tasksCreated;
    const avgTasksPerWorker = this.state.metrics.tasksCompleted / this.state.workers.size;
    
    // Store metrics in memory
    await this.mcpWrapper.storeMemory(
      this.state.swarmId,
      'metrics',
      {
        ...this.state.metrics,
        completionRate,
        avgTasksPerWorker,
        timestamp: Date.now()
      },
      'metrics'
    );
    
    // Analyze performance if needed
    if (this.state.metrics.tasksCompleted % 10 === 0) {
      await this.mcpWrapper.analyzePerformance(this.state.swarmId);
    }
  }
  
  /**
   * Handle errors
   */
  _handleError(error) {
    // Log error to memory
    this.mcpWrapper.storeMemory(
      this.state.swarmId,
      `error-${Date.now()}`,
      {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      },
      'error'
    ).catch(console.error);
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      swarmId: this.state.swarmId,
      status: this.state.status,
      queen: this.state.queen,
      workers: Array.from(this.state.workers.values()),
      tasks: {
        total: this.state.tasks.size,
        pending: Array.from(this.state.tasks.values()).filter(t => t.status === 'pending').length,
        inProgress: Array.from(this.state.tasks.values()).filter(t => t.status === 'in_progress').length,
        completed: Array.from(this.state.tasks.values()).filter(t => t.status === 'completed').length
      },
      metrics: this.state.metrics,
      decisions: this.state.decisions.size
    };
  }
  
  /**
   * Shutdown hive mind
   */
  async shutdown() {
    this.state.status = 'shutting_down';
    
    // Save final state
    await this.mcpWrapper.storeMemory(
      this.state.swarmId,
      'final_state',
      this.getStatus(),
      'system'
    );
    
    // Destroy swarm
    await this.mcpWrapper.destroySwarm(this.state.swarmId);
    
    this.state.status = 'shutdown';
    this.emit('shutdown');
  }
}