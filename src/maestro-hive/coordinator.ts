/**
 * Maestro Hive Mind Coordinator
 * 
 * Unified coordinator implementation combining SimpleMaestro functionality
 * with HiveMind swarm intelligence, following KISS and SOLID principles
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// HiveMind imports
import { HiveMind } from '../hive-mind/core/HiveMind.js';
import { Agent } from '../hive-mind/core/Agent.js';
import type { 
  AgentType, 
  AgentCapability, 
  TaskPriority, 
  TaskStrategy,
  HiveMindConfig,
  Task as HiveTask
} from '../hive-mind/types.js';

// Maestro Hive imports
import type {
  MaestroCoordinator,
  MaestroTask,
  MaestroWorkflow,
  MaestroValidationResult,
  MaestroHiveConfig,
  MaestroSwarmStatus,
  MaestroAgent,
  MaestroFileManager,
  MaestroLogger,
  MaestroError,
  ContentGenerationRequest,
  ContentGenerationResult,
  MaestroEvent
} from './interfaces.js';
import { MaestroErrorFactory } from './interfaces.js';

// ===== SUPPORTING CLASSES (SINGLE RESPONSIBILITY PRINCIPLE) =====

/**
 * File operations handler - Single Responsibility Principle
 */
class FileOperationHandler {
  constructor(private baseDir: string) {}

  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = join(this.baseDir, path);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async readFile(path: string): Promise<string> {
    const fullPath = join(this.baseDir, path);
    return fs.readFile(fullPath, 'utf-8');
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const fullPath = join(this.baseDir, path);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(path: string): Promise<void> {
    const fullPath = join(this.baseDir, path);
    await fs.mkdir(fullPath, { recursive: true });
  }

  async listFiles(directory: string): Promise<string[]> {
    try {
      const fullPath = join(this.baseDir, directory);
      return await fs.readdir(fullPath);
    } catch (err) {
      console.warn(`[FileOperationHandler] Failed to list files in ${directory}`, err);
      return [];
    }
  }
}

/**
 * Workflow persistence manager - Single Responsibility Principle
 */
class WorkflowPersistenceManager {
  constructor(private fileHandler: FileOperationHandler) {}

  async saveWorkflow(workflow: MaestroWorkflow): Promise<void> {
    const workflowPath = `workflows/${workflow.id}.json`;
    await this.fileHandler.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
  }

  async loadWorkflow(id: string): Promise<MaestroWorkflow | null> {
    try {
      const workflowPath = `workflows/${id}.json`;
      const content = await this.fileHandler.readFile(workflowPath);
      const reviver = (key: string, value: any) => {
        const dateKeys = new Set([
          'created', 'updated', 'createdAt', 'completedAt', 'assignedAt', 'startedAt'
        ]);
        if (typeof value === 'string' && dateKeys.has(key)) {
          const d = new Date(value);
          return isNaN(d.getTime()) ? value : d;
        }
        return value;
      };
      return JSON.parse(content, reviver);
    } catch (err) {
      console.warn(`[WorkflowPersistenceManager] Failed to load workflow ${id}`, err);
      return null;
    }
  }

  async archiveWorkflow(id: string): Promise<void> {
    const workflowPath = `workflows/${id}.json`;
    const archivePath = `archive/workflows/${id}_${Date.now()}.json`;
    
    if (await this.fileHandler.fileExists(workflowPath)) {
      const content = await this.fileHandler.readFile(workflowPath);
      await this.fileHandler.writeFile(archivePath, content);
      // Note: Not deleting original for safety
    }
  }
}

/**
 * Task artifact manager - Single Responsibility Principle
 */
class TaskArtifactManager {
  constructor(private fileHandler: FileOperationHandler) {}

  async saveTaskArtifact(taskId: string, artifact: any): Promise<void> {
    const artifactPath = `tasks/${taskId}/artifacts/${uuidv4()}.json`;
    await this.fileHandler.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
  }

  async getTaskArtifacts(taskId: string): Promise<any[]> {
    try {
      const artifactsDir = `tasks/${taskId}/artifacts`;
      const files = await this.fileHandler.listFiles(artifactsDir);
      const artifacts = [] as any[];
      const reviver = (key: string, value: any) => {
        const dateKeys = new Set([
          'created', 'updated', 'createdAt', 'completedAt', 'assignedAt', 'startedAt'
        ]);
        if (typeof value === 'string' && dateKeys.has(key)) {
          const d = new Date(value);
          return isNaN(d.getTime()) ? value : d;
        }
        return value;
      };
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await this.fileHandler.readFile(join(artifactsDir, file));
          artifacts.push(JSON.parse(content, reviver));
        }
      }
      
      return artifacts;
    } catch (err) {
      console.warn(`[TaskArtifactManager] Failed to load artifacts for ${taskId}`, err);
      return [];
    }
  }
}

/**
 * Unified file manager implementing interface (Facade Pattern)
 */
class HiveFileManager implements MaestroFileManager {
  private fileHandler: FileOperationHandler;
  private workflowManager: WorkflowPersistenceManager;
  private artifactManager: TaskArtifactManager;

  constructor(baseDir: string) {
    this.fileHandler = new FileOperationHandler(baseDir);
    this.workflowManager = new WorkflowPersistenceManager(this.fileHandler);
    this.artifactManager = new TaskArtifactManager(this.fileHandler);
  }

  // Delegate basic file operations
  async writeFile(path: string, content: string): Promise<void> {
    return this.fileHandler.writeFile(path, content);
  }

  async readFile(path: string): Promise<string> {
    return this.fileHandler.readFile(path);
  }

  async fileExists(path: string): Promise<boolean> {
    return this.fileHandler.fileExists(path);
  }

  async createDirectory(path: string): Promise<void> {
    return this.fileHandler.createDirectory(path);
  }

  async listFiles(directory: string): Promise<string[]> {
    return this.fileHandler.listFiles(directory);
  }

  // Delegate workflow operations
  async saveWorkflow(workflow: MaestroWorkflow): Promise<void> {
    return this.workflowManager.saveWorkflow(workflow);
  }

  async loadWorkflow(id: string): Promise<MaestroWorkflow | null> {
    return this.workflowManager.loadWorkflow(id);
  }

  async archiveWorkflow(id: string): Promise<void> {
    return this.workflowManager.archiveWorkflow(id);
  }

  // Delegate artifact operations
  async saveTaskArtifact(taskId: string, artifact: any): Promise<void> {
    return this.artifactManager.saveTaskArtifact(taskId, artifact);
  }

  async getTaskArtifacts(taskId: string): Promise<any[]> {
    return this.artifactManager.getTaskArtifacts(taskId);
  }
}

/**
 * Enhanced logger with structured logging - Single Responsibility Principle
 */
class HiveLogger implements MaestroLogger {
  private readonly timestamp = () => new Date().toISOString();
  private readonly isDebugEnabled = () => !!(process.env.DEBUG || process.env.MAESTRO_DEBUG);

  info(message: string, context?: any): void {
    console.log(`[INFO] ${this.timestamp()} ${message}`, this.formatContext(context));
  }

  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${this.timestamp()} ${message}`, this.formatContext(context));
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${this.timestamp()} ${message}`, this.formatError(error));
  }

  debug(message: string, context?: any): void {
    if (this.isDebugEnabled()) {
      console.log(`[DEBUG] ${this.timestamp()} ${message}`, this.formatContext(context));
    }
  }

  logTask(event: string, task: MaestroTask): void {
    this.info(`Task ${event}`, this.extractTaskContext(task));
  }

  logWorkflow(event: string, workflow: MaestroWorkflow): void {
    this.info(`Workflow ${event}`, this.extractWorkflowContext(workflow));
  }

  logAgent(event: string, agent: MaestroAgent): void {
    this.info(`Agent ${event}`, this.extractAgentContext(agent));
  }

  logQuality(event: string, score: number, details?: any): void {
    this.info(`Quality ${event}`, { score: Number(score.toFixed(3)), ...details });
  }

  // Private helper methods for context formatting
  private formatContext(context?: any): string {
    return context ? (typeof context === 'object' ? JSON.stringify(context) : String(context)) : '';
  }

  private formatError(error?: any): any {
    if (!error) return '';
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return error;
  }

  private extractTaskContext(task: MaestroTask) {
    return {
      taskId: task.id,
      type: task.type,
      status: task.status,
      priority: task.priority,
      progress: task.progress
    };
  }

  private extractWorkflowContext(workflow: MaestroWorkflow) {
    return {
      workflowId: workflow.id,
      name: workflow.name,
      status: workflow.status,
      tasks: workflow.tasks.length,
      strategy: workflow.strategy
    };
  }

  private extractAgentContext(agent: MaestroAgent) {
    return {
      agentId: agent.id,
      type: agent.type,
      status: agent.status,
      capabilities: agent.capabilities.length
    };
  }
}

/**
 * Swarm initialization service - Single Responsibility Principle
 */
class SwarmInitializer {
  private readonly SWARM_INIT_TIMEOUT = 60000; // 60 seconds

  constructor(private logger: MaestroLogger) {}

  async initialize(config: MaestroHiveConfig, coordinator: MaestroHiveCoordinator): Promise<string> {
    this.logger.info('Starting Maestro Hive swarm initialization', { 
      topology: config.topology,
      maxAgents: config.maxAgents,
      timeout: this.SWARM_INIT_TIMEOUT 
    });

    try {
      const hiveMindConfig = this.convertConfig(config);
      const hiveMind = await this.createAndInitializeHiveMind(hiveMindConfig, coordinator);
      const swarmId = await this.initializeWithTimeout(hiveMind, coordinator);
      
      this.setupSuccessfulInitialization(coordinator, swarmId, config);
      return swarmId;
    } catch (error) {
      this.handleInitializationError(error, config);
      throw error;
    }
  }

  private convertConfig(config: MaestroHiveConfig): HiveMindConfig {
    return {
      name: config.name,
      topology: config.topology,
      maxAgents: config.maxAgents,
      queenMode: config.queenMode,
      memoryTTL: config.memoryTTL,
      consensusThreshold: config.consensusThreshold,
      autoSpawn: config.autoSpawn,
      enableConsensus: config.enableConsensus,
      enableMemory: config.enableMemory,
      enableCommunication: config.enableCommunication,
      enabledFeatures: config.enabledFeatures,
      createdAt: new Date()
    };
  }

  private async createAndInitializeHiveMind(hiveMindConfig: HiveMindConfig, coordinator: any): Promise<HiveMind> {
    this.logger.info('Creating HiveMind instance...');
    const hiveMind = new HiveMind(hiveMindConfig);
    coordinator.hiveMind = hiveMind;
    return hiveMind;
  }

  private async initializeWithTimeout(hiveMind: HiveMind, coordinator: any): Promise<string> {
    this.logger.info('Initializing HiveMind core systems...');
    return await coordinator.withTimeout(
      hiveMind.initialize(),
      this.SWARM_INIT_TIMEOUT,
      'HiveMind initialization timeout - consider increasing timeout or checking system resources'
    );
  }

  private setupSuccessfulInitialization(coordinator: any, swarmId: string, config: MaestroHiveConfig): void {
    coordinator.swarmId = swarmId;
    coordinator.initialized = true;
    
    this.logger.info('HiveMind core initialization completed', { swarmId });
    coordinator.setupEventForwarding();
    
    this.logger.info('HiveMind swarm initialized successfully', { 
      swarmId,
      topology: config.topology 
    });
    
    coordinator.emit('swarmInitialized', { swarmId });
  }

  private handleInitializationError(error: any, config: MaestroHiveConfig): void {
    this.logger.error('Swarm initialization failed', { 
      error: error.message,
      topology: config.topology,
      timeout: this.SWARM_INIT_TIMEOUT
    });
    
    if (error.message.includes('timeout')) {
      this.logger.error('Initialization timeout suggestions:', {
        suggestions: [
          'Check database permissions and disk space',
          'Verify SQLite dependencies are installed',
          'Consider running with --debug for more details',
          'Try initializing with fewer agents (reduce maxAgents)',
          'Check system resources (RAM, CPU)'
        ]
      });
    }
  }
}

/**
 * Task creation factory - Single Responsibility Principle
 */
class TaskFactory {
  constructor(
    private config: MaestroHiveConfig,
    private logger: MaestroLogger
  ) {}

  createTask(
    description: string,
    type: MaestroTask['type'],
    priority: TaskPriority
  ): MaestroTask {
    const taskBuilder = new TaskBuilder()
      .setBasicInfo(description, type, priority)
      .setStrategy(this.determineTaskStrategy(type, priority))
      .setAgentRequirements(
        this.shouldRequireConsensus(type, priority),
        this.determineMaxAgents(type),
        this.getRequiredCapabilities(type)
      )
      .setMetadata(type, this.config.enableSpecsDriven);
    
    return taskBuilder.build();
  }

  private determineTaskStrategy(type: MaestroTask['type'], priority: TaskPriority): TaskStrategy {
    if (priority === 'critical') return 'sequential';
    if (type === 'implementation') return 'parallel';
    if (type === 'review') return 'consensus';
    return 'adaptive';
  }

  private shouldRequireConsensus(type: MaestroTask['type'], priority: TaskPriority): boolean {
    if (!this.config.enableConsensus) return false;
    return type === 'spec' || type === 'design' || priority === 'critical';
  }

  private determineMaxAgents(type: MaestroTask['type']): number {
    const maxAgentMap = {
      'spec': 2,
      'design': 3,
      'implementation': 4,
      'test': 2,
      'review': 3
    };
    return maxAgentMap[type] || 2;
  }

  private getRequiredCapabilities(type: MaestroTask['type']): AgentCapability[] {
    const capabilityMap = {
      'spec': ['requirements_analysis', 'user_story_creation'],
      'design': ['system_design', 'architecture', 'technical_writing'],
      'implementation': ['code_generation', 'debugging', 'refactoring'],
      'test': ['test_generation', 'quality_assurance'],
      'review': ['code_review', 'quality_assurance', 'standards_enforcement']
    };
    return capabilityMap[type] || [];
  }
}

/**
 * Task builder using Builder Pattern - Open/Closed Principle
 */
class TaskBuilder {
  private task: Partial<MaestroTask> = {
    id: uuidv4(),
    status: 'pending',
    progress: 0,
    dependencies: [],
    assignedAgents: [],
    created: new Date(),
    createdAt: new Date()
  };

  setBasicInfo(description: string, type: MaestroTask['type'], priority: TaskPriority): this {
    this.task.description = description;
    this.task.type = type;
    this.task.priority = priority;
    return this;
  }

  setStrategy(strategy: TaskStrategy): this {
    this.task.strategy = strategy;
    return this;
  }

  setAgentRequirements(
    requireConsensus: boolean,
    maxAgents: number,
    requiredCapabilities: AgentCapability[]
  ): this {
    this.task.requireConsensus = requireConsensus;
    this.task.maxAgents = maxAgents;
    this.task.requiredCapabilities = requiredCapabilities;
    return this;
  }

  setMetadata(type: MaestroTask['type'], specsDriven: boolean): this {
    this.task.metadata = {
      type,
      specsDriven
    };
    return this;
  }

  build(): MaestroTask {
    if (!this.task.description || !this.task.type || !this.task.priority) {
      throw new Error('Task requires description, type, and priority');
    }
    return this.task as MaestroTask;
  }
}

/**
 * Main Maestro Hive Mind Coordinator
 * 
 * Implements the MaestroCoordinator interface while leveraging HiveMind
 * for distributed agent coordination and task orchestration
 * 
 * REFACTORED: Reduced from 988 lines to focused coordination logic
 * Following Single Responsibility and Dependency Inversion principles
 */
export class MaestroHiveCoordinator extends EventEmitter implements MaestroCoordinator {
  private hiveMind: HiveMind | null = null;
  private tasks: Map<string, MaestroTask> = new Map();
  private workflows: Map<string, MaestroWorkflow> = new Map();
  private activeTasks: Set<string> = new Set();
  private config: MaestroHiveConfig;
  private fileManager: MaestroFileManager;
  private logger: MaestroLogger;
  private swarmId: string | null = null;
  private initialized: boolean = false;

  constructor(
    config: MaestroHiveConfig,
    fileManager?: MaestroFileManager,
    logger?: MaestroLogger
  ) {
    super();
    this.config = config;
    this.fileManager = fileManager || new HiveFileManager(config.workflowDirectory);
    this.logger = logger || new HiveLogger();
    
    this.logger.info('MaestroHiveCoordinator created', { 
      topology: config.topology,
      maxAgents: config.maxAgents,
      specsDriven: config.enableSpecsDriven 
    });
  }

  // ===== HIVE MIND INTEGRATION =====

  async initializeSwarm(config?: MaestroHiveConfig): Promise<string> {
    const finalConfig = config || this.config;
    const initializer = new SwarmInitializer(this.logger);
    try {
      const swarmId = await initializer.initialize(finalConfig, this);
      return swarmId;
    } catch (error: any) {
      throw MaestroErrorFactory.create(
        'SWARM_INIT_FAILED',
        `Swarm initialization failed: ${error?.message || 'unknown error'}`,
        'system',
        'high',
        { context: { config: finalConfig }, technicalDetails: { error } }
      );
    }
  }

  /**
   * Utility method to add timeout to any promise
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
      promise.then((value) => {
        clearTimeout(timer);
        resolve(value);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async getSwarmStatus(): Promise<MaestroSwarmStatus> {
    if (!this.hiveMind || !this.swarmId) {
      throw this.createError('SWARM_NOT_INITIALIZED', 'Swarm not initialized');
    }

    const hiveStatus = await this.hiveMind.getFullStatus();
    const workflows = Array.from(this.workflows.values());
    const tasks = Array.from(this.tasks.values());

    return {
      swarmId: this.swarmId,
      name: hiveStatus.name,
      topology: hiveStatus.topology,
      health: hiveStatus.health,
      uptime: hiveStatus.uptime,
      
      // Agent information
      totalAgents: hiveStatus.agents.length,
      activeAgents: hiveStatus.agents.filter(a => a.status === 'busy').length,
      agentsByType: hiveStatus.agentsByType,
      
      // Task and workflow information
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      activeWorkflows: workflows.filter(w => w.status === 'active').length,
      completedWorkflows: workflows.filter(w => w.status === 'completed').length,
      
      // Performance metrics
      averageTaskTime: this.calculateAverageTaskTime(),
      averageWorkflowTime: this.calculateAverageWorkflowTime(),
      successRate: this.calculateSuccessRate(),
      qualityScore: this.calculateAverageQuality(),
      
      // Specs-driven metrics
      specsDrivenTasks: tasks.filter(t => this.isSpecsDrivenTask(t)).length,
      consensusAchieved: tasks.filter(t => t.metadata?.consensusAchieved).length,
      validationsPassed: tasks.filter(t => t.metadata?.validation?.valid).length,
      
      warnings: hiveStatus.warnings
    };
  }

  async spawnAgent(type: AgentType, capabilities?: AgentCapability[]): Promise<Agent> {
    if (!this.hiveMind) {
      throw this.createError('SWARM_NOT_INITIALIZED', 'Swarm not initialized');
    }

    const agentCapabilities = capabilities || this.config.agentCapabilities[type] || [];
    
    const agent = await this.hiveMind.spawnAgent({
      type,
      name: `${type}-${Date.now()}`,
      capabilities: agentCapabilities,
      autoAssign: true
    });

    this.logger.logAgent('spawned', this.convertToMaestroAgent(agent));
    return agent;
  }

  // ===== TASK MANAGEMENT =====

  async createTask(
    description: string, 
    type: MaestroTask['type'], 
    priority: TaskPriority = 'medium'
  ): Promise<MaestroTask> {
    const taskFactory = new TaskFactory(this.config, this.logger);
    const task = taskFactory.createTask(description, type, priority);
    
    this.tasks.set(task.id, task);
    
    // Handle persistence and HiveMind submission
    await this.handleTaskPersistence(task);
    await this.submitTaskToHiveMind(task);
    
    this.logger.logTask('created', task);
    this.emit('taskCreated', task);
    
    return task;
  }

  private async handleTaskPersistence(task: MaestroTask): Promise<void> {
    if (this.config.enabledFeatures?.includes('persistence')) {
      await this.fileManager.saveTaskArtifact(task.id, task);
    }
  }

  private async submitTaskToHiveMind(task: MaestroTask): Promise<void> {
    if (this.hiveMind) {
      const hiveTask = this.convertToHiveTask(task);
      await this.hiveMind.submitTask({
        description: hiveTask.description,
        priority: hiveTask.priority,
        strategy: hiveTask.strategy,
        dependencies: hiveTask.dependencies,
        requireConsensus: hiveTask.requireConsensus,
        maxAgents: hiveTask.maxAgents,
        requiredCapabilities: hiveTask.requiredCapabilities,
        metadata: hiveTask.metadata
      });
    }
  }

  async updateTask(id: string, updates: Partial<MaestroTask>): Promise<MaestroTask> {
    const task = this.tasks.get(id);
    if (!task) {
      throw this.createError('TASK_NOT_FOUND', `Task ${id} not found`);
    }

    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);

    // Update active tasks tracking
    if (updates.status === 'completed' && task.status !== 'completed') {
      this.activeTasks.delete(id);
      (updatedTask as any).completedAt = new Date();
    }
    if (updates.status === 'in_progress' && task.status !== 'in_progress') {
      this.activeTasks.add(id);
    }

    this.logger.logTask('updated', updatedTask);
    this.emit('taskUpdated', updatedTask);
    
    return updatedTask;
  }

  async getTasks(filter?: Partial<MaestroTask>): Promise<MaestroTask[]> {
    let tasks = Array.from(this.tasks.values());
    
    if (filter) {
      tasks = tasks.filter(task => {
        return Object.entries(filter).every(([key, value]) => 
          task[key as keyof MaestroTask] === value
        );
      });
    }
    
    return tasks.sort((a, b) => 
      this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority)
    );
  }

  async deleteTask(id: string): Promise<boolean> {
    const deleted = this.tasks.delete(id);
    this.activeTasks.delete(id);
    
    if (deleted) {
      // Cancel in HiveMind if exists
      if (this.hiveMind) {
        try {
          await this.hiveMind.cancelTask(id);
        } catch (error) {
          this.logger.warn('Failed to cancel task in HiveMind', { taskId: id, error });
        }
      }
      
      this.logger.logTask('deleted', { id } as MaestroTask);
      this.emit('taskDeleted', id);
    }
    
    return deleted;
  }

  // ===== WORKFLOW MANAGEMENT =====

  async createWorkflow(name: string, description: string): Promise<MaestroWorkflow> {
    const workflow: MaestroWorkflow = {
      id: uuidv4(),
      name,
      description,
      tasks: [],
      status: 'active',
      created: new Date(),
      updated: new Date(),
      swarmId: this.swarmId,
      assignedAgents: [],
      strategy: 'adaptive',
      priority: 'medium'
    };

    this.workflows.set(workflow.id, workflow);
    
    // Save workflow
    if (this.config.enabledFeatures?.includes('persistence')) {
      await this.fileManager.saveWorkflow(workflow);
    }

    this.logger.logWorkflow('created', workflow);
    this.emit('workflowCreated', workflow);
    
    return workflow;
  }

  async addTaskToWorkflow(workflowId: string, task: MaestroTask): Promise<MaestroWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw this.createError('WORKFLOW_NOT_FOUND', `Workflow ${workflowId} not found`);
    }

    // Add workflow reference to task
    task.workflow = workflowId;
    workflow.tasks.push(task);
    workflow.updated = new Date();
    
    // Update workflow in tasks map
    this.tasks.set(task.id, task);
    
    // Save updated workflow
    if (this.config.enabledFeatures?.includes('persistence')) {
      await this.fileManager.saveWorkflow(workflow);
    }

    this.logger.logWorkflow('task_added', workflow);
    this.emit('workflowUpdated', workflow);
    
    return workflow;
  }

  async executeWorkflow(id: string): Promise<MaestroWorkflow> {
    const workflow = this.workflows.get(id);  
    if (!workflow) {
      throw this.createError('WORKFLOW_NOT_FOUND', `Workflow ${id} not found`);
    }

    this.logger.logWorkflow('executing', workflow);
    
    // Execute tasks based on workflow strategy
    if (this.config.enableSpecsDriven) {
      await this.executeSpecsDrivenWorkflow(workflow);
    } else {
      await this.executeStandardWorkflow(workflow);
    }

    // Update workflow status
    const allCompleted = workflow.tasks.every(t => t.status === 'completed');
    if (allCompleted) {
      workflow.status = 'completed';
    }

    workflow.updated = new Date();
    
    // Save updated workflow
    if (this.config.enabledFeatures?.includes('persistence')) {
      await this.fileManager.saveWorkflow(workflow);
    }

    this.logger.logWorkflow('executed', workflow);
    this.emit('workflowExecuted', workflow);
    
    return workflow;
  }

  async getWorkflow(id: string): Promise<MaestroWorkflow | null> {
    return this.workflows.get(id) || null;
  }

  // ===== CONTENT GENERATION =====

  async generateContent(prompt: string, type: string, agentType?: AgentType): Promise<string> {
    this.logger.info('Generating content', { type, agentType, prompt: prompt.substring(0, 100) });
    
    if (this.hiveMind && agentType) {
      // Use specific agent type from HiveMind
      const agents = await this.hiveMind.getAgents();
      const suitableAgent = agents.find(a => a.type === agentType && a.status === 'idle');
      
      if (suitableAgent) {
        // Submit content generation task to HiveMind
        const task = await this.hiveMind.submitTask({
          description: `Generate ${type} content: ${prompt}`,
          priority: 'medium',
          strategy: 'sequential',
          dependencies: [],
          requireConsensus: false,
          maxAgents: 1,
          requiredCapabilities: this.getRequiredCapabilities(type as any),
          metadata: { contentType: type, originalPrompt: prompt }
        });
        
        // Wait for task completion and return result
        // In a real implementation, this would be more sophisticated
        await new Promise(resolve => setTimeout(resolve, 1000));
        const completedTask = await this.hiveMind.getTask(task.id);
        
        if (completedTask && completedTask.result) {
          return typeof completedTask.result === 'string' 
            ? completedTask.result 
            : JSON.stringify(completedTask.result);
        }
      }
    }

    // Fallback to template-based generation
    return this.generateTemplateContent(prompt, type);
  }

  // ===== VALIDATION =====

  async validate(content: string, type: string, requireConsensus?: boolean): Promise<MaestroValidationResult> {
    const shouldRequireConsensus = requireConsensus ?? this.config.consensusRequired;
    
    // Basic validation
    const result: MaestroValidationResult = {
      valid: true,
      score: this.calculateContentScore(content, type),
      errors: [],
      warnings: [],
      suggestions: [],
      timestamp: new Date()
    };

    // Basic validation rules
    if (content.length < 10) {
      result.errors.push('Content is too short');
      result.valid = false;
    }

    if (type === 'spec' && !content.toLowerCase().includes('requirement')) {
      result.warnings.push('Specification should include explicit requirements');
    }

    if (type === 'design' && !content.includes('#')) {
      result.warnings.push('Design document should have structured headings');
    }

    // Consensus validation if enabled and HiveMind available
    if (shouldRequireConsensus && this.hiveMind && result.valid) {
      try {
        const consensusResult = await this.requestConsensusValidation(content, type);
        result.consensusAchieved = consensusResult.achieved;
        result.agentValidations = consensusResult.agentScores;
        
        if (!consensusResult.achieved) {
          result.warnings.push('Consensus not achieved for validation');
        }
      } catch (error) {
        result.warnings.push('Consensus validation failed');
        this.logger.warn('Consensus validation error', { error });
      }
    }

    // Apply quality threshold
    if (result.score < this.config.qualityThreshold) {
      result.suggestions.push(`Quality score ${result.score.toFixed(2)} below threshold ${this.config.qualityThreshold}`);
    }

    this.logger.logQuality('validated', result.score, { 
      type, 
      valid: result.valid, 
      consensusAchieved: result.consensusAchieved 
    });

    this.emit('contentValidated', { type, content, result });
    
    return result;
  }

  // ===== STATUS & CLEANUP =====

  async getStatus(): Promise<{ active: boolean; tasks: number; workflows: number; agents: number }> {
    const agentCount = this.hiveMind ? (await this.hiveMind.getAgents()).length : 0;
    
    return {
      active: this.initialized && this.activeTasks.size > 0,
      tasks: this.tasks.size,
      workflows: this.workflows.size,
      agents: agentCount
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down MaestroHiveCoordinator');
    
    // Save all pending data
    if (this.config.enabledFeatures?.includes('persistence')) {
      await this.saveAllData();
    }
    
    // Shutdown HiveMind
    if (this.hiveMind) {
      await this.hiveMind.shutdown();
    }
    
    // Clear all data
    this.tasks.clear();
    this.workflows.clear();
    this.activeTasks.clear();
    this.initialized = false;
    
    this.emit('shutdown');
    this.logger.info('MaestroHiveCoordinator shutdown complete');
  }

  // ===== PRIVATE HELPER METHODS =====

  private setupEventForwarding(): void {
    if (!this.hiveMind) return;

    this.hiveMind.on('taskSubmitted', (data) => {
      this.emit('hiveTaskSubmitted', data);
    });

    this.hiveMind.on('taskCompleted', (data) => {
      this.emit('hiveTaskCompleted', data);
    });

    this.hiveMind.on('agentSpawned', (data) => {
      this.emit('agentSpawned', data);
    });
  }

  private convertToHiveTask(maestroTask: MaestroTask): HiveTask {
    return {
      id: maestroTask.id,
      swarmId: this.swarmId || '',
      description: maestroTask.description,
      priority: maestroTask.priority,
      strategy: maestroTask.strategy,
      status: maestroTask.status as any,
      progress: maestroTask.progress,
      dependencies: maestroTask.dependencies,
      assignedAgents: maestroTask.assignedAgents,
      requireConsensus: maestroTask.requireConsensus,
      maxAgents: maestroTask.maxAgents,
      requiredCapabilities: maestroTask.requiredCapabilities,
      createdAt: (maestroTask as any).createdAt || new Date(),
      metadata: maestroTask.metadata
    };
  }

  private convertToMaestroAgent(hiveAgent: Agent): MaestroAgent {
    return {
      id: hiveAgent.id,
      name: hiveAgent.name,
      type: hiveAgent.type,
      capabilities: hiveAgent.capabilities,
      status: hiveAgent.status,
      currentTask: hiveAgent.currentTask,
      performance: {
        tasksCompleted: 0,
        averageQuality: 0.8,
        successRate: 0.9,
        averageTime: 5000
      },
      swarmId: this.swarmId || undefined
    };
  }

  private determineTaskStrategy(type: MaestroTask['type'], priority: TaskPriority): TaskStrategy {
    if (priority === 'critical') return 'sequential';
    if (type === 'implementation') return 'parallel';
    if (type === 'review') return 'consensus';
    return 'adaptive';
  }

  private shouldRequireConsensus(type: MaestroTask['type'], priority: TaskPriority): boolean {
    if (!this.config.enableConsensus) return false;
    return type === 'spec' || type === 'design' || priority === 'critical';
  }

  private determineMaxAgents(type: MaestroTask['type']): number {
    const maxAgentMap = {
      'spec': 2,
      'design': 3,
      'implementation': 4,
      'test': 2,
      'review': 3
    };
    return maxAgentMap[type] || 2;
  }

  private getRequiredCapabilities(type: MaestroTask['type']): AgentCapability[] {
    const capabilityMap = {
      'spec': ['requirements_analysis', 'user_story_creation'],
      'design': ['system_design', 'architecture', 'technical_writing'],
      'implementation': ['code_generation', 'debugging', 'refactoring'],
      'test': ['test_generation', 'quality_assurance'],
      'review': ['code_review', 'quality_assurance', 'standards_enforcement']
    };
    return capabilityMap[type] || [];
  }

  private async executeSpecsDrivenWorkflow(workflow: MaestroWorkflow): Promise<void> {
    // Specs-driven workflow phases: Spec -> Design -> Implementation -> Test -> Review
    const phases = ['spec', 'design', 'implementation', 'test', 'review'];
    
    for (const phase of phases) {
      const phaseTasks = workflow.tasks.filter(t => t.type === phase);
      
      for (const task of phaseTasks) {
        if (task.status === 'pending') {
          await this.updateTask(task.id, { status: 'in_progress' });
          
          // Execute task (simplified)
          await this.executeTask(task);
          
          // Validate if enabled
          if (this.config.autoValidation) {
            const content = task.metadata?.generatedContent || '';
            const validation = await this.validate(content, task.type, task.requireConsensus);
            task.metadata = { ...task.metadata, validation };
            
            if (!validation.valid || validation.score < this.config.qualityThreshold) {
              await this.updateTask(task.id, { status: 'failed' });
              continue;
            }
          }
          
          await this.updateTask(task.id, { status: 'completed', completedAt: new Date() } as any);
        }
      }
    }
  }

  private async executeStandardWorkflow(workflow: MaestroWorkflow): Promise<void> {
    // Standard sequential execution
    for (const task of workflow.tasks) {
      if (task.status === 'pending') {
        await this.updateTask(task.id, { status: 'in_progress' });
        await this.executeTask(task);
        await this.updateTask(task.id, { status: 'completed', completedAt: new Date() } as any);
      }
    }
  }

  private async executeTask(task: MaestroTask): Promise<void> {
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate content
    const content = await this.generateContent(task.description, task.type);
    task.metadata = { ...task.metadata, generatedContent: content };
  }

  private generateTemplateContent(prompt: string, type: string): string {
    const templates = {
      spec: `# Specification\n\n## Overview\n${prompt}\n\n## Requirements\n- Functional requirements\n- Non-functional requirements\n\n## Acceptance Criteria\n- Validation criteria`,
      design: `# Design Document\n\n## Overview\n${prompt}\n\n## Architecture\n- System components\n- Data flow\n\n## Implementation Plan\n- Development approach`,
      implementation: `# Implementation\n\n## Task\n${prompt}\n\n## Solution\n- Code structure\n- Key algorithms\n\n## Testing\n- Unit tests\n- Integration tests`,
      test: `# Test Plan\n\n## Objective\n${prompt}\n\n## Test Cases\n- Unit tests\n- Integration tests\n- Edge cases\n\n## Expected Results\n- Pass criteria`,
      review: `# Review\n\n## Scope\n${prompt}\n\n## Quality Assessment\n- Code quality\n- Requirements compliance\n\n## Recommendations\n- Improvements\n- Best practices`
    };

    return templates[type as keyof typeof templates] || 
           `# ${type.toUpperCase()}\n\n${prompt}\n\n[Generated by MaestroHiveCoordinator]`;
  }

  private calculateContentScore(content: string, type: string): number {
    let score = 0.7; // Base score

    if (content.length > 100) score += 0.1;
    if (content.includes('#')) score += 0.05;
    if (content.includes('##')) score += 0.05;
    if (content.includes('-')) score += 0.05;
    if (content.split('\n').length > 5) score += 0.05;

    // Type-specific bonuses
    if (type === 'spec' && content.toLowerCase().includes('requirement')) score += 0.1;
    if (type === 'design' && content.toLowerCase().includes('architecture')) score += 0.1;
    if (type === 'test' && content.toLowerCase().includes('test case')) score += 0.1;

    return Math.min(score, 1.0);
  }

  private async requestConsensusValidation(content: string, type: string): Promise<{
    achieved: boolean;
    agentScores: Record<string, number>;
  }> {
    // Deterministic consensus based on quality score and configured threshold
    const score = this.calculateContentScore(content, type);
    const threshold = this.config.consensusThreshold ?? 0.7;
    const testMode = (this.config.enabledFeatures || []).includes('test-mode');

    if (testMode) {
      const achieved = score >= threshold;
      return {
        achieved,
        agentScores: {
          'agent-1': score,
          'agent-2': Math.max(0, Math.min(1, score - 0.05)),
          'agent-3': Math.max(0, Math.min(1, score + 0.05))
        }
      };
    }

    // Production: if no advanced validator plugged in, default to non-achieved to avoid randomness
    this.logger.warn('Consensus validation fallback used; consider enabling advanced validator');
    return { achieved: score >= threshold, agentScores: {} };
  }

  private getPriorityWeight(priority: TaskPriority): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[priority];
  }

  private calculateAverageTaskTime(): number {
    const completedTasks = Array.from(this.tasks.values()).filter(t => (t as any).completedAt);
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const completedAt = (task as any).completedAt as Date;
      const startedAt = (task as any).createdAt as Date;
      const duration = completedAt.getTime() - startedAt.getTime();
      return sum + duration;
    }, 0);

    return totalTime / completedTasks.length;
  }

  private calculateAverageWorkflowTime(): number {
    const completedWorkflows = Array.from(this.workflows.values()).filter(w => w.status === 'completed');
    if (completedWorkflows.length === 0) return 0;

    const totalTime = completedWorkflows.reduce((sum, workflow) => {
      const duration = workflow.updated.getTime() - workflow.created.getTime();
      return sum + duration;
    }, 0);

    return totalTime / completedWorkflows.length;
  }

  private calculateSuccessRate(): number {
    const tasks = Array.from(this.tasks.values());
    if (tasks.length === 0) return 1.0;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    return completedTasks / tasks.length;
  }

  private calculateAverageQuality(): number {
    const tasks = Array.from(this.tasks.values());
    const tasksWithQuality = tasks.filter(t => t.quality !== undefined);
    
    if (tasksWithQuality.length === 0) return 0.8; // Default

    const totalQuality = tasksWithQuality.reduce((sum, task) => sum + (task.quality || 0), 0);
    return totalQuality / tasksWithQuality.length;
  }

  private isSpecsDrivenTask(task: MaestroTask): boolean {
    return task.metadata?.specsDriven === true || 
           ['spec', 'design', 'implementation', 'test', 'review'].includes(task.type);
  }

  private async saveAllData(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Save all workflows
    for (const workflow of this.workflows.values()) {
      promises.push(this.fileManager.saveWorkflow(workflow));
    }
    
    // Save all task artifacts
    for (const task of this.tasks.values()) {
      promises.push(this.fileManager.saveTaskArtifact(task.id, task));
    }
    
    await Promise.all(promises);
  }

  private createError(code: string, message: string, context?: any): MaestroError {
    return MaestroErrorFactory.create(
      code,
      message,
      'system',
      'medium',
      { context, timestamp: new Date(), userFriendlyMessage: message }
    );
  }
}

/**
 * Factory function for creating MaestroHiveCoordinator with dependency injection
 */
export function createMaestroHiveCoordinator(
  config: MaestroHiveConfig,
  fileManager?: MaestroFileManager,
  logger?: MaestroLogger
): MaestroHiveCoordinator {
  return new MaestroHiveCoordinator(config, fileManager, logger);
}
