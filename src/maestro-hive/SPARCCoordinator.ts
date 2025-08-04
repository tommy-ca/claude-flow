/**
 * SPARC Coordinator
 * 
 * Refactored coordinator implementing SPARC methodology with phase handlers
 * Following KISS and SOLID principles with methods <25 lines and classes <300 lines
 */

import { EventEmitter } from 'events';
import type { 
  MaestroCoordinator, 
  MaestroTask, 
  MaestroWorkflow, 
  MaestroValidationResult,
  MaestroHiveConfig,
  MaestroLogger 
} from './interfaces.js';
import { 
  SPARCWorkflowOrchestrator, 
  SPARCPhase, 
  QualityGateManager 
} from './phase-handlers/index.js';

/**
 * SPARC-specific task interface
 */
export interface SPARCTask extends MaestroTask {
  phase?: SPARCPhase;
  phaseResults?: Map<SPARCPhase, any>;
  qualityGates?: Map<SPARCPhase, MaestroValidationResult>;
}

/**
 * SPARC workflow interface
 */
export interface SPARCWorkflow extends MaestroWorkflow {
  methodology: 'SPARC';
  phases: SPARCPhase[];
  currentPhase?: SPARCPhase;
  phaseResults: Map<SPARCPhase, any>;
  qualityScore: number;
}

/**
 * SPARC Coordinator Implementation
 * 
 * Single Responsibility: Coordinate SPARC workflow execution
 * Open/Closed: Extensible for new SPARC patterns
 * Liskov Substitution: Can replace MaestroCoordinator
 * Interface Segregation: Focused SPARC interface
 * Dependency Inversion: Depends on SPARC abstractions
 */
export class SPARCCoordinator extends EventEmitter implements MaestroCoordinator {
  private tasks: Map<string, SPARCTask> = new Map();
  private workflows: Map<string, SPARCWorkflow> = new Map();
  private orchestrator: SPARCWorkflowOrchestrator;
  private qualityGateManager: QualityGateManager;
  private logger: MaestroLogger;
  private config: MaestroHiveConfig;

  constructor(config: MaestroHiveConfig, logger: MaestroLogger) {
    super();
    this.config = config;
    this.logger = logger;
    this.orchestrator = new SPARCWorkflowOrchestrator(logger);
    this.qualityGateManager = this.orchestrator.getQualityGateManager();
    
    this.logger.info('SPARCCoordinator initialized', { 
      specsDriven: config.enableSpecsDriven 
    });
  }

  // ===== SPARC WORKFLOW METHODS =====

  /**
   * Execute SPARC workflow for task
   * Single Responsibility: Only SPARC execution
   */
  async executeSPARCWorkflow(taskId: string, requirements: string[]): Promise<SPARCWorkflow> {
    this.logger.info('Starting SPARC workflow execution', { taskId });

    const workflow = await this.createSPARCWorkflow(taskId, requirements);
    
    try {
      const results = await this.orchestrator.executeWorkflow(taskId, requirements);
      workflow.phaseResults = results;
      workflow.status = 'completed';
      workflow.qualityScore = this.calculateWorkflowQualityScore(results);
      
      this.workflows.set(workflow.id, workflow);
      this.emit('workflowCompleted', workflow);
      
      return workflow;
    } catch (error) {
      workflow.status = 'failed';
      this.workflows.set(workflow.id, workflow);
      this.emit('workflowFailed', { workflow, error });
      throw error;
    }
  }

  /**
   * Create SPARC workflow
   * Open/Closed: Extensible for new workflow types
   */
  private async createSPARCWorkflow(taskId: string, requirements: string[]): Promise<SPARCWorkflow> {
    const workflow: SPARCWorkflow = {
      id: `sparc_${taskId}_${Date.now()}`,
      name: `SPARC Workflow for ${taskId}`,
      description: `Execute SPARC methodology for task: ${taskId}`,
      methodology: 'SPARC',
      phases: [
        SPARCPhase.SPECIFICATION,
        SPARCPhase.PSEUDOCODE,
        SPARCPhase.ARCHITECTURE,
        SPARCPhase.REFINEMENT,
        SPARCPhase.COMPLETION
      ],
      currentPhase: SPARCPhase.SPECIFICATION,
      phaseResults: new Map(),
      qualityScore: 0,
      status: 'pending',
      tasks: [taskId],
      createdAt: new Date(),
      metadata: { 
        requirements,
        methodology: 'SPARC',
        qualityThresholds: this.qualityGateManager.getAllThresholds()
      }
    };

    return workflow;
  }

  /**
   * Calculate overall workflow quality score
   * Interface Segregation: Focused on quality calculation
   */
  private calculateWorkflowQualityScore(results: Map<SPARCPhase, any>): number {
    if (results.size === 0) return 0;

    let totalScore = 0;
    for (const [phase, result] of results) {
      totalScore += result.qualityScore || 0;
    }

    return totalScore / results.size;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<SPARCWorkflow | null> {
    return this.workflows.get(id) || null;
  }

  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<SPARCWorkflow[]> {
    return Array.from(this.workflows.values());
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    return this.workflows.delete(id);
  }

  // ===== PHASE MANAGEMENT =====

  /**
   * Execute specific SPARC phase
   * Liskov Substitution: Any phase handler can be used
   */
  async executePhase(
    taskId: string, 
    phase: SPARCPhase, 
    request: any
  ): Promise<any> {
    this.logger.info(`Executing ${phase} phase`, { taskId });

    const handler = this.orchestrator.getHandlerFactory().createHandler(phase);
    const result = await handler.executePhase(request);
    
    // Validate quality gate
    const validation = await handler.validateQualityGate(result);
    if (!validation.passed) {
      throw new Error(`Quality gate failed for ${phase}: ${validation.issues.join(', ')}`);
    }

    this.logger.info(`Completed ${phase} phase`, { 
      taskId, 
      qualityScore: result.qualityScore,
      passed: validation.passed 
    });

    return result;
  }

  /**
   * Set quality threshold for phase
   * Dependency Inversion: Depends on quality abstractions
   */
  setPhaseQualityThreshold(phase: SPARCPhase, threshold: number): void {
    this.qualityGateManager.setThreshold(phase, threshold);
  }

  /**
   * Get quality threshold for phase
   */
  getPhaseQualityThreshold(phase: SPARCPhase): number {
    return this.qualityGateManager.getThreshold(phase);
  }

  // ===== TASK MANAGEMENT =====

  /**
   * Create SPARC task
   */
  async createTask(
    description: string, 
    type: string = 'development', 
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<SPARCTask> {
    const task: SPARCTask = {
      id: `sparc_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      type,
      priority,
      status: 'pending',
      phase: SPARCPhase.SPECIFICATION,
      phaseResults: new Map(),
      qualityGates: new Map(),
      createdAt: new Date(),
      metadata: {
        methodology: 'SPARC',
        specsDriven: true
      }
    };

    this.tasks.set(task.id, task);
    this.emit('taskCreated', task);
    
    return task;
  }

  /**
   * Update task
   */
  async updateTask(id: string, updates: Partial<SPARCTask>): Promise<SPARCTask> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    
    this.emit('taskUpdated', updatedTask);
    return updatedTask;
  }

  /**
   * Get tasks
   */
  async getTasks(filter?: Partial<SPARCTask>): Promise<SPARCTask[]> {
    let tasks = Array.from(this.tasks.values());
    
    if (filter) {
      tasks = tasks.filter(task => {
        return Object.entries(filter).every(([key, value]) => 
          task[key as keyof SPARCTask] === value
        );
      });
    }
    
    return tasks;
  }

  /**
   * Delete task
   */
  async deleteTask(id: string): Promise<boolean> {
    const deleted = this.tasks.delete(id);
    if (deleted) {
      this.emit('taskDeleted', id);
    }
    return deleted;
  }

  // ===== VALIDATION =====

  /**
   * Validate SPARC compliance
   */
  async validateSPARCCompliance(workflowId: string): Promise<MaestroValidationResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return {
        passed: false,
        score: 0,
        issues: ['Workflow not found'],
        suggestions: ['Create workflow first']
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check if all phases completed
    if (workflow.phaseResults.size !== 5) {
      issues.push('Not all SPARC phases completed');
      suggestions.push('Execute all five SPARC phases');
    }

    // Check quality score
    if (workflow.qualityScore < 0.8) {
      issues.push('Overall quality score below threshold');
      suggestions.push('Improve quality in individual phases');
    }

    // Check methodology compliance
    if (workflow.methodology !== 'SPARC') {
      issues.push('Workflow does not follow SPARC methodology');
      suggestions.push('Use SPARC methodology');
    }

    return {
      passed: issues.length === 0,
      score: workflow.qualityScore,
      issues,
      suggestions
    };
  }

  // ===== SWARM INTEGRATION STUBS =====
  // These methods maintain compatibility with MaestroCoordinator interface
  // while focusing on SPARC-specific functionality

  async initializeSwarm(config?: MaestroHiveConfig): Promise<string> {
    // SPARC coordinator uses lightweight initialization
    return `sparc_swarm_${Date.now()}`;
  }

  async spawnAgent(type: string, capabilities?: string[]): Promise<any> {
    // SPARC agents are phase-specific handlers
    const phase = type as SPARCPhase;
    if (Object.values(SPARCPhase).includes(phase)) {
      return this.orchestrator.getHandlerFactory().createHandler(phase);
    }
    throw new Error(`Unsupported SPARC agent type: ${type}`);
  }

  async getSwarmStatus(): Promise<any> {
    return {
      type: 'SPARC',
      phases: Object.values(SPARCPhase),
      activeWorkflows: this.workflows.size,
      activeTasks: this.tasks.size,
      qualityThresholds: this.qualityGateManager.getAllThresholds()
    };
  }

  async executeTask(task: any): Promise<any> {
    // SPARC task execution delegates to workflow orchestrator
    if (task.requirements) {
      return this.executeSPARCWorkflow(task.id, task.requirements);
    }
    throw new Error('SPARC tasks require requirements array');
  }

  async createWorkflow(name: string, description: string): Promise<MaestroWorkflow> {
    // Create basic workflow structure - SPARC specifics added during execution
    const workflow: SPARCWorkflow = {
      id: `workflow_${Date.now()}`,
      name,
      description,
      methodology: 'SPARC',
      phases: Object.values(SPARCPhase),
      phaseResults: new Map(),
      qualityScore: 0,
      status: 'pending',
      tasks: [],
      createdAt: new Date(),
      metadata: { methodology: 'SPARC' }
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<MaestroWorkflow>): Promise<MaestroWorkflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    const updatedWorkflow = { ...workflow, ...updates };
    this.workflows.set(id, updatedWorkflow);
    
    return updatedWorkflow;
  }

  async validateWorkflow(id: string): Promise<MaestroValidationResult> {
    return this.validateSPARCCompliance(id);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down SPARC coordinator');
    this.tasks.clear();
    this.workflows.clear();
    this.removeAllListeners();
  }
}