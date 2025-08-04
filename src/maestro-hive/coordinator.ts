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
import { HiveMind } from '../hive-mind/core/HiveMind';
import { Agent } from '../hive-mind/core/Agent';
import type { 
  AgentType, 
  AgentCapability, 
  TaskPriority, 
  TaskStrategy,
  HiveMindConfig,
  Task as HiveTask
} from '../hive-mind/types';

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
} from './interfaces';

/**
 * Simple file manager implementation
 */
class HiveFileManager implements MaestroFileManager {
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
    } catch {
      return [];
    }
  }

  async saveWorkflow(workflow: MaestroWorkflow): Promise<void> {
    const workflowPath = `workflows/${workflow.id}.json`;
    await this.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
  }

  async loadWorkflow(id: string): Promise<MaestroWorkflow | null> {
    try {
      const workflowPath = `workflows/${id}.json`;
      const content = await this.readFile(workflowPath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async archiveWorkflow(id: string): Promise<void> {
    const workflowPath = `workflows/${id}.json`;
    const archivePath = `archive/workflows/${id}_${Date.now()}.json`;
    
    if (await this.fileExists(workflowPath)) {
      const content = await this.readFile(workflowPath);
      await this.writeFile(archivePath, content);
      // Note: Not deleting original for safety
    }
  }

  async saveTaskArtifact(taskId: string, artifact: any): Promise<void> {
    const artifactPath = `tasks/${taskId}/artifacts/${uuidv4()}.json`;
    await this.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
  }

  async getTaskArtifacts(taskId: string): Promise<any[]> {
    try {
      const artifactsDir = `tasks/${taskId}/artifacts`;
      const files = await this.listFiles(artifactsDir);
      const artifacts = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await this.readFile(join(artifactsDir, file));
          artifacts.push(JSON.parse(content));
        }
      }
      
      return artifacts;
    } catch {
      return [];
    }
  }
}

/**
 * Simple logger implementation
 */
class HiveLogger implements MaestroLogger {
  info(message: string, context?: any): void {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, context || '');
  }

  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, context || '');
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error || '');
  }

  debug(message: string, context?: any): void {
    if (process.env.DEBUG || process.env.MAESTRO_DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, context || '');
    }
  }

  logTask(event: string, task: MaestroTask): void {
    this.info(`Task ${event}`, { 
      taskId: task.id, 
      type: task.type, 
      status: task.status,
      priority: task.priority 
    });
  }

  logWorkflow(event: string, workflow: MaestroWorkflow): void {
    this.info(`Workflow ${event}`, { 
      workflowId: workflow.id, 
      name: workflow.name, 
      status: workflow.status,
      tasks: workflow.tasks.length 
    });
  }

  logAgent(event: string, agent: MaestroAgent): void {
    this.info(`Agent ${event}`, { 
      agentId: agent.id, 
      type: agent.type, 
      status: agent.status 
    });
  }

  logQuality(event: string, score: number, details?: any): void {
    this.info(`Quality ${event}`, { score, ...details });
  }
}

/**
 * Main Maestro Hive Mind Coordinator
 * 
 * Implements the MaestroCoordinator interface while leveraging HiveMind
 * for distributed agent coordination and task orchestration
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
    const swarmInitTimeout = 60000; // 60 seconds total timeout for swarm initialization
    const finalConfig = config || this.config;
    
    this.logger.info('Starting Maestro Hive swarm initialization', { 
      topology: finalConfig.topology,
      maxAgents: finalConfig.maxAgents,
      timeout: swarmInitTimeout 
    });

    try {
      // Convert MaestroHiveConfig to HiveMindConfig
      const hiveMindConfig: HiveMindConfig = {
        name: finalConfig.name,
        topology: finalConfig.topology,
        maxAgents: finalConfig.maxAgents,
        queenMode: finalConfig.queenMode,
        memoryTTL: finalConfig.memoryTTL,
        consensusThreshold: finalConfig.consensusThreshold,
        autoSpawn: finalConfig.autoSpawn,
        enableConsensus: finalConfig.enableConsensus,
        enableMemory: finalConfig.enableMemory,
        enableCommunication: finalConfig.enableCommunication,
        enabledFeatures: finalConfig.enabledFeatures,
        createdAt: new Date()
      };

      // Create HiveMind instance
      this.logger.info('Creating HiveMind instance...');
      this.hiveMind = new HiveMind(hiveMindConfig);

      // Initialize with timeout
      this.logger.info('Initializing HiveMind core systems...');
      this.swarmId = await this.withTimeout(
        this.hiveMind.initialize(),
        swarmInitTimeout,
        'HiveMind initialization timeout - consider increasing timeout or checking system resources'
      );

      this.initialized = true;
      this.logger.info('HiveMind core initialization completed', { swarmId: this.swarmId });

      // Setup event forwarding (non-blocking)
      this.setupEventForwarding();

      this.logger.info('HiveMind swarm initialized successfully', { 
        swarmId: this.swarmId,
        topology: finalConfig.topology 
      });

      this.emit('swarmInitialized', { swarmId: this.swarmId });
      return this.swarmId;
    } catch (error) {
      this.logger.error('Swarm initialization failed', { 
        error: error.message,
        topology: finalConfig.topology,
        timeout: swarmInitTimeout
      });
      
      // Enhanced error details
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
      
      throw this.createError('SWARM_INIT_FAILED', `Swarm initialization failed: ${error.message}`, {
        originalError: error,
        config: finalConfig,
        timeout: swarmInitTimeout
      });
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
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
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
    const task: MaestroTask = {
      id: uuidv4(),
      description,
      type,
      status: 'pending',
      priority,
      strategy: this.determineTaskStrategy(type, priority),
      progress: 0,
      dependencies: [],
      assignedAgents: [],
      requireConsensus: this.shouldRequireConsensus(type, priority),
      maxAgents: this.determineMaxAgents(type),
      requiredCapabilities: this.getRequiredCapabilities(type),
      created: new Date(),
      createdAt: new Date(),
      metadata: {
        type,
        specsDriven: this.config.enableSpecsDriven
      }
    };

    this.tasks.set(task.id, task);
    
    // Save task if file management enabled
    if (this.config.enabledFeatures?.includes('persistence')) {
      await this.fileManager.saveTaskArtifact(task.id, task);
    }

    // Submit to HiveMind if initialized
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

    this.logger.logTask('created', task);
    this.emit('taskCreated', task);
    
    return task;
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
      updatedTask.completed = new Date();
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
      createdAt: maestroTask.created,
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
          
          await this.updateTask(task.id, { status: 'completed', completed: new Date() });
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
        await this.updateTask(task.id, { status: 'completed', completed: new Date() });
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
    // Simplified consensus validation
    // In a real implementation, this would involve multiple agents
    return {
      achieved: Math.random() > 0.3, // 70% consensus rate
      agentScores: {
        'agent-1': Math.random(),
        'agent-2': Math.random(),
        'agent-3': Math.random()
      }
    };
  }

  private getPriorityWeight(priority: TaskPriority): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[priority];
  }

  private calculateAverageTaskTime(): number {
    const completedTasks = Array.from(this.tasks.values()).filter(t => t.completed);
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const duration = task.completed!.getTime() - task.created.getTime();
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
    const error = new Error(message) as MaestroError;
    error.code = code;
    error.context = context;
    error.timestamp = new Date();
    return error;
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