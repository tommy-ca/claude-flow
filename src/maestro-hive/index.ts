/**
 * Maestro Hive Mind - Main Export Module
 * 
 * Unified entry point for Maestro functionality built on HiveMind architecture
 * Implements specs-driven flow with KISS and SOLID principles
 */

// Core exports
export { MaestroHiveCoordinator, createMaestroHiveCoordinator } from './coordinator.js';

// Configuration exports  
export {
  MaestroHiveConfigBuilder,
  MaestroConfigValidator,
  MAESTRO_CONFIG_PRESETS,
  DEFAULT_MAESTRO_HIVE_CONFIG,
  loadMaestroHiveConfig,
  createPresetConfig
} from './config.js';

// Interface exports
export type {
  // Core interfaces
  MaestroCoordinator,
  MaestroTask,
  MaestroWorkflow,
  MaestroValidationResult,
  MaestroHiveConfig,
  MaestroSwarmStatus,
  MaestroAgent,
  
  // Specialized interfaces
  SpecsDrivenWorkflow,
  ContentGenerationRequest,
  ContentGenerationResult,
  MaestroFileManager,
  MaestroLogger,
  MaestroError,
  MaestroEvent,
  MaestroMetrics,
  ConfigValidator,
  QualityAssessor
} from './interfaces.js';

// Re-export relevant HiveMind types for convenience
export type {
  AgentType,
  AgentCapability,
  TaskPriority,
  TaskStrategy,
  SwarmTopology,
  QueenMode
} from '../hive-mind/types.js';

// HiveMind core exports for advanced usage
export { HiveMind } from '../hive-mind/core/HiveMind.js';
export { Agent } from '../hive-mind/core/Agent.js';
export { Queen } from '../hive-mind/core/Queen.js';

/**
 * Quick start function for common Maestro Hive setup
 */
export async function createMaestroHive(preset: keyof typeof MAESTRO_CONFIG_PRESETS = 'specsDriven') {
  const config = createPresetConfig(preset);
  const coordinator = createMaestroHiveCoordinator(config);
  
  // Initialize swarm
  const swarmId = await coordinator.initializeSwarm();
  
  return {
    coordinator,
    swarmId,
    config,
    
    // Convenience methods
    createTask: coordinator.createTask.bind(coordinator),
    createWorkflow: coordinator.createWorkflow.bind(coordinator),
    generateContent: coordinator.generateContent.bind(coordinator),
    validate: coordinator.validate.bind(coordinator),
    getStatus: coordinator.getStatus.bind(coordinator),
    getSwarmStatus: coordinator.getSwarmStatus.bind(coordinator),
    shutdown: coordinator.shutdown.bind(coordinator)
  };
}

/**
 * Create a specs-driven workflow coordinator with optimal settings
 */
export async function createSpecsDrivenMaestro(options: {
  name?: string;
  maxAgents?: number;
  qualityThreshold?: number;
  workingDirectory?: string;
} = {}) {
  const config = new MaestroHiveConfigBuilder()
    .topology('specs-driven')
    .maxAgents(options.maxAgents || 8)
    .quality(options.qualityThreshold || 0.8, true)
    .consensus(0.75, true)
    .specsDriven(true)
    .workingDirectory(options.workingDirectory || '.maestro-hive')
    .enableFeatures([
      'specs-driven-workflow',
      'requirements-validation',
      'design-consensus',
      'quality-gates',
      'steering-documentation',
      'neural-learning'
    ])
    .build();

  if (options.name) {
    config.name = options.name;
  }

  const coordinator = createMaestroHiveCoordinator(config);
  const swarmId = await coordinator.initializeSwarm();

  return {
    coordinator,
    swarmId,
    config,
    
    // Specs-driven workflow methods
    async createSpecification(description: string, priority: TaskPriority = 'high') {
      return coordinator.createTask(description, 'spec', priority);
    },
    
    async createDesign(description: string, priority: TaskPriority = 'high') {
      return coordinator.createTask(description, 'design', priority);
    },
    
    async createImplementation(description: string, priority: TaskPriority = 'medium') {
      return coordinator.createTask(description, 'implementation', priority);
    },
    
    async createTest(description: string, priority: TaskPriority = 'medium') {
      return coordinator.createTask(description, 'test', priority);
    },
    
    async createReview(description: string, priority: TaskPriority = 'high') {
      return coordinator.createTask(description, 'review', priority);
    },
    
    async createSpecsDrivenWorkflow(name: string, description: string) {
      const workflow = await coordinator.createWorkflow(name, description);
      
      // Add standard specs-driven tasks
      const spec = await coordinator.createTask(`${name} - Specification`, 'spec', 'high');
      const design = await coordinator.createTask(`${name} - Design`, 'design', 'high');
      const implementation = await coordinator.createTask(`${name} - Implementation`, 'implementation', 'medium');
      const test = await coordinator.createTask(`${name} - Testing`, 'test', 'medium');
      const review = await coordinator.createTask(`${name} - Review`, 'review', 'high');
      
      // Add dependencies
      design.dependencies = [spec.id];
      implementation.dependencies = [design.id];
      test.dependencies = [implementation.id];
      review.dependencies = [test.id];
      
      // Add tasks to workflow
      await coordinator.addTaskToWorkflow(workflow.id, spec);
      await coordinator.addTaskToWorkflow(workflow.id, design);
      await coordinator.addTaskToWorkflow(workflow.id, implementation);
      await coordinator.addTaskToWorkflow(workflow.id, test);
      await coordinator.addTaskToWorkflow(workflow.id, review);
      
      return workflow;
    },
    
    // Other convenience methods
    getStatus: coordinator.getStatus.bind(coordinator),
    getSwarmStatus: coordinator.getSwarmStatus.bind(coordinator),
    shutdown: coordinator.shutdown.bind(coordinator)
  };
}

/**
 * Version information
 */
export const MAESTRO_HIVE_VERSION = '1.0.0';

/**
 * Feature flags for experimental functionality
 */
export const FEATURE_FLAGS = {
  NEURAL_LEARNING: true,
  ADVANCED_CONSENSUS: true,
  PERFORMANCE_OPTIMIZATION: true,
  EXPERIMENTAL_AGENTS: false,
  DEBUG_LOGGING: process.env.NODE_ENV === 'development'
} as const;

/**
 * Default agent type mappings for different use cases
 */
export const AGENT_TYPE_MAPPINGS = {
  // Specs-driven workflow agents
  SPECS_DRIVEN: [
    'requirements_analyst',
    'design_architect', 
    'task_planner',
    'implementation_coder',
    'quality_reviewer',
    'steering_documenter'
  ],
  
  // General development agents
  DEVELOPMENT: [
    'coordinator',
    'researcher',
    'coder',
    'tester',
    'reviewer'
  ],
  
  // Research and analysis agents
  RESEARCH: [
    'researcher',
    'analyst',
    'specialist',
    'documenter'
  ],
  
  // Architecture and design agents
  ARCHITECTURE: [
    'architect',
    'designer',
    'coordinator',
    'reviewer'
  ]
} as const;

/**
 * Quality thresholds for different quality levels
 */
export const QUALITY_THRESHOLDS = {
  MINIMUM: 0.5,
  ACCEPTABLE: 0.6,
  GOOD: 0.7,
  HIGH: 0.8,
  EXCELLENT: 0.9
} as const;

/**
 * Default timeouts for different operations (in milliseconds)
 */
export const DEFAULT_TIMEOUTS = {
  TASK_EXECUTION: 30000,    // 30 seconds
  CONSENSUS_VOTING: 60000,  // 1 minute
  AGENT_RESPONSE: 10000,    // 10 seconds
  WORKFLOW_EXECUTION: 300000, // 5 minutes
  SWARM_INITIALIZATION: 60000 // 1 minute
} as const;