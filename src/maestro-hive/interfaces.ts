/**
 * Maestro Hive Mind Interfaces - Enhanced & Standardized
 * 
 * Unified interfaces that bridge SimpleMaestro functionality with HiveMind architecture
 * Following specs-driven flow and KISS/SOLID principles
 * 
 * REFACTORED: Standardized interface structure, enhanced documentation,
 * improved type safety, and added validation interfaces
 * 
 * @version 2.0.0
 * @author Claude Flow Refactoring Specialist Agent
 * @since 2025-08-05
 */

import type { 
  Task as HiveTask, 
  TaskPriority, 
  TaskStrategy, 
  TaskStatus,
  AgentType,
  AgentCapability,
  HiveMindConfig,
  SwarmTopology,
  QueenMode
} from '../hive-mind/types.js';

// ===== MAESTRO CORE INTERFACES =====

/**
 * Enhanced Task interface with strict typing and validation
 * REFACTORED: Added validation, better type safety, and performance metrics
 */
export interface MaestroTask extends Omit<HiveTask, 'id' | 'swarmId'> {
  readonly id: string;
  swarmId?: string;
  type: TaskType;
  assignedTo?: string;
  created: Date;
  completed?: Date;
  workflow?: string;
  quality?: QualityScore;
  improvements?: readonly string[];
  
  // Enhanced properties for better tracking
  estimatedDuration?: number; // milliseconds
  actualDuration?: number; // milliseconds
  complexity?: TaskComplexity;
  tags?: readonly string[];
  parentTask?: string;
  subtasks?: readonly string[];
  
  // Validation and error tracking
  validationErrors?: readonly ValidationError[];
  retryCount?: number;
  lastRetryReason?: string;
}

/**
 * Task type enumeration for better type safety
 */
export type TaskType = 'spec' | 'design' | 'implementation' | 'test' | 'review';

/**
 * Task complexity levels
 */
export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'critical';

/**
 * Quality score with validation
 */
export type QualityScore = number & { readonly __brand: 'QualityScore' };

/**
 * Helper function to create quality score with validation
 */
export function createQualityScore(value: number): QualityScore {
  if (value < 0 || value > 1) {
    throw new Error('Quality score must be between 0 and 1');
  }
  return value as QualityScore;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly timestamp: Date;
}

/**
 * Enhanced Workflow interface integrated with HiveMind coordination
 */
export interface MaestroWorkflow {
  id: string;
  name: string;
  description: string;
  tasks: MaestroTask[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  created: Date;
  updated: Date;
  swarmId?: string;
  assignedAgents?: string[];
  strategy: TaskStrategy;
  priority: TaskPriority;
}

/**
 * Enhanced ValidationResult with comprehensive validation tracking
 * REFACTORED: Added detailed validation metrics and consensus tracking
 */
export interface MaestroValidationResult {
  readonly valid: boolean;
  readonly score: QualityScore;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
  readonly suggestions: readonly string[];
  readonly consensusAchieved?: boolean;
  readonly agentValidations?: ReadonlyMap<string, ValidationAgentResult>;
  readonly timestamp: Date;
  
  // Enhanced validation metrics
  readonly validationDuration: number; // milliseconds
  readonly rulesApplied: readonly string[];
  readonly passedRules: readonly string[];
  readonly failedRules: readonly string[];
  readonly validationContext?: ValidationContext;
}

/**
 * Agent validation result details
 */
export interface ValidationAgentResult {
  readonly agentId: string;
  readonly agentType: AgentType;
  readonly score: QualityScore;
  readonly confidence: number; // 0-1
  readonly validationTime: number; // milliseconds
  readonly specificFindings: readonly string[];
}

/**
 * Validation context for better traceability
 */
export interface ValidationContext {
  readonly validationType: string;
  readonly requiredStandards: readonly string[];
  readonly businessRules: readonly string[];
  readonly technicalConstraints: readonly string[];
  readonly stakeholderRequirements: readonly string[];
}

/**
 * Unified Task Coordinator interface combining SimpleMaestro and HiveMind capabilities
 */
export interface MaestroCoordinator {
  // Task management (SimpleMaestro compatible)
  createTask(description: string, type: MaestroTask['type'], priority?: TaskPriority): Promise<MaestroTask>;
  updateTask(id: string, updates: Partial<MaestroTask>): Promise<MaestroTask>;
  getTasks(filter?: Partial<MaestroTask>): Promise<MaestroTask[]>;
  deleteTask(id: string): Promise<boolean>;

  // Workflow management (SimpleMaestro compatible)
  createWorkflow(name: string, description: string): Promise<MaestroWorkflow>;
  addTaskToWorkflow(workflowId: string, task: MaestroTask): Promise<MaestroWorkflow>;
  executeWorkflow(id: string): Promise<MaestroWorkflow>;
  getWorkflow(id: string): Promise<MaestroWorkflow | null>;

  // Content generation with HiveMind agents
  generateContent(prompt: string, type: string, agentType?: AgentType): Promise<string>;
  
  // Validation with HiveMind consensus
  validate(content: string, type: string, requireConsensus?: boolean): Promise<MaestroValidationResult>;
  
  // HiveMind integration
  initializeSwarm(config: MaestroHiveConfig): Promise<string>;
  getSwarmStatus(): Promise<MaestroSwarmStatus>;
  spawnAgent(type: AgentType, capabilities?: AgentCapability[]): Promise<any>;
  
  // Status and cleanup
  getStatus(): Promise<{ active: boolean; tasks: number; workflows: number; agents: number }>;
  shutdown(): Promise<void>;
}

/**
 * Maestro-specific HiveMind configuration
 */
export interface MaestroHiveConfig extends Partial<HiveMindConfig> {
  name: string;
  topology: SwarmTopology;
  maxAgents: number;
  queenMode: QueenMode;
  
  // Maestro-specific settings
  enableSpecsDriven: boolean;
  workflowDirectory: string;
  qualityThreshold: number;
  autoValidation: boolean;
  consensusRequired: boolean;
  
  // Agent configuration
  defaultAgentTypes: AgentType[];
  agentCapabilities: Record<AgentType, AgentCapability[]>;
}

/**
 * Enhanced swarm status with Maestro workflow information
 */
export interface MaestroSwarmStatus {
  swarmId: string;
  name: string;
  topology: SwarmTopology;
  health: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  
  // Agent information
  totalAgents: number;
  activeAgents: number;
  agentsByType: Record<AgentType, number>;
  
  // Task and workflow information
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  activeWorkflows: number;
  completedWorkflows: number;
  
  // Performance metrics
  averageTaskTime: number;
  averageWorkflowTime: number;
  successRate: number;
  qualityScore: number;
  
  // Specs-driven metrics
  specsDrivenTasks: number;
  consensusAchieved: number;
  validationsPassed: number;
  
  warnings: string[];
}

/**
 * Agent definition compatible with both SimpleMaestro and HiveMind
 */
export interface MaestroAgent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: AgentCapability[];
  status: 'idle' | 'busy' | 'active' | 'error' | 'offline';
  currentTask?: string;
  currentWorkflow?: string;
  performance: {
    tasksCompleted: number;
    averageQuality: number;
    successRate: number;
    averageTime: number;
  };
  specialization?: string[];
  swarmId?: string;
}

/**
 * Specs-driven workflow definition
 */
export interface SpecsDrivenWorkflow extends MaestroWorkflow {
  specificationPhase: {
    requirements: string[];
    acceptanceCriteria: string[];
    stakeholders: string[];
  };
  designPhase: {
    architecture: string;
    components: string[];
    interfaces: string[];
  };
  implementationPhase: {
    technologies: string[];
    patterns: string[];
    testStrategy: string;
  };
  validationPhase: {
    qualityGates: string[];
    reviewCriteria: string[];
    acceptanceTests: string[];
  };
}

/**
 * Content generation request with agent preferences
 */
export interface ContentGenerationRequest {
  prompt: string;
  type: string;
  preferredAgent?: AgentType;
  requiredCapabilities?: AgentCapability[];
  qualityThreshold?: number;
  maxAgents?: number;
  requireConsensus?: boolean;
  context?: Record<string, any>;
}

/**
 * Content generation result with agent attribution
 */
export interface ContentGenerationResult {
  content: string;
  type: string;
  quality: number;
  generatedBy: string; // Agent ID
  generatedAt: Date;
  processingTime: number;
  tokensUsed: number;
  improvements: string[];
  validation?: MaestroValidationResult;
}

/**
 * File management interface compatible with both systems
 */
export interface MaestroFileManager {
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  createDirectory(path: string): Promise<void>;
  listFiles(directory: string): Promise<string[]>;
  
  // Workflow-specific file operations
  saveWorkflow(workflow: MaestroWorkflow): Promise<void>;
  loadWorkflow(id: string): Promise<MaestroWorkflow | null>;
  archiveWorkflow(id: string): Promise<void>;
  
  // Task artifact management
  saveTaskArtifact(taskId: string, artifact: any): Promise<void>;
  getTaskArtifacts(taskId: string): Promise<any[]>;
}

/**
 * Quality assessment interface
 */
export interface QualityAssessor {
  assessTask(task: MaestroTask): Promise<number>;
  assessWorkflow(workflow: MaestroWorkflow): Promise<number>;
  assessContent(content: string, type: string): Promise<MaestroValidationResult>;
  
  getQualityMetrics(): Promise<{
    averageTaskQuality: number;
    averageWorkflowQuality: number;
    qualityTrend: number;
    improvementSuggestions: string[];
  }>;
}

/**
 * Event types for the Maestro Hive system
 */
export type MaestroEvent = 
  | { type: 'task_created'; data: MaestroTask }
  | { type: 'task_updated'; data: MaestroTask }
  | { type: 'task_completed'; data: MaestroTask }
  | { type: 'workflow_created'; data: MaestroWorkflow }
  | { type: 'workflow_executed'; data: MaestroWorkflow }
  | { type: 'agent_spawned'; data: MaestroAgent }
  | { type: 'content_generated'; data: ContentGenerationResult }
  | { type: 'validation_completed'; data: MaestroValidationResult }
  | { type: 'consensus_achieved'; data: { taskId: string; decision: any } }
  | { type: 'swarm_status_changed'; data: MaestroSwarmStatus };

/**
 * Logger interface for the system
 */
export interface MaestroLogger {
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error?: any): void;
  debug(message: string, context?: any): void;
  
  // Maestro-specific logging
  logTask(event: string, task: MaestroTask): void;
  logWorkflow(event: string, workflow: MaestroWorkflow): void;
  logAgent(event: string, agent: MaestroAgent): void;
  logQuality(event: string, score: number, details?: any): void;
}

/**
 * Enhanced error system with categorization and recovery suggestions
 * REFACTORED: Added error categorization, severity levels, and recovery guidance
 */
export interface MaestroError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly taskId?: string;
  readonly workflowId?: string;
  readonly agentId?: string;
  readonly swarmId?: string;
  readonly context?: Readonly<Record<string, any>>;
  readonly timestamp: Date;
  
  // Enhanced error information
  readonly recoverable: boolean;
  readonly recoverySuggestions: readonly string[];
  readonly relatedErrors: readonly string[]; // Related error IDs
  readonly userFriendlyMessage: string;
  readonly technicalDetails?: Readonly<Record<string, any>>;
}

/**
 * Error categories for better error handling
 */
export type ErrorCategory = 
  | 'validation'
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'resource'
  | 'business_logic'
  | 'system'
  | 'configuration'
  | 'data'
  | 'external_service';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error factory for creating standardized errors
 */
export class MaestroErrorFactory {
  static create(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    options: Partial<MaestroError> = {}
  ): MaestroError {
    const error = new Error(message) as MaestroError;
    Object.assign(error, {
      code,
      category,
      severity,
      timestamp: new Date(),
      recoverable: severity !== 'critical',
      recoverySuggestions: [],
      relatedErrors: [],
      userFriendlyMessage: message,
      ...options
    });
    return error;
  }
}

/**
 * Metrics collection interface
 */
export interface MaestroMetrics {
  // Task metrics
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  averageTaskQuality: number;
  
  // Workflow metrics
  totalWorkflows: number;
  completedWorkflows: number;
  averageWorkflowTime: number;
  averageWorkflowQuality: number;
  
  // Agent metrics
  totalAgents: number;
  activeAgents: number;
  agentUtilization: number;
  averageAgentPerformance: number;
  
  // System metrics
  uptime: number;
  throughput: number;
  errorRate: number;
  consensusRate: number;
  validationRate: number;
  
  // Quality metrics
  overallQuality: number;
  qualityTrend: number;
  improvementRate: number;
}

/**
 * Configuration validation interface
 */
export interface ConfigValidator {
  validateMaestroConfig(config: Partial<MaestroHiveConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
  
  validateWorkflowConfig(workflow: Partial<MaestroWorkflow>): {
    valid: boolean;
    errors: string[];
    suggestions: string[];
  };
  
  validateAgentConfig(agent: Partial<MaestroAgent>): {
    valid: boolean;
    errors: string[];
    suggestions: string[];
  };
}