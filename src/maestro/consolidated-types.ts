#!/usr/bin/env node
/**
 * Consolidated Maestro Types - Single Source of Truth
 * Following SOLID principles with clear type segregation
 */

// Re-export core types from existing files to maintain compatibility
export * from './types';
export * from './maestro-types';

// Consolidated ConsensusResult - Single Definition
export interface MaestroConsensusResult {
  requestId: string;
  decision: 'approved' | 'rejected' | 'requires_revision' | 'insufficient_consensus';
  consensusScore: number;
  qualityScore: number;
  participatingValidators: number;
  totalValidators: number;
  results: ValidationResult[];
  aggregatedScores: ValidationScores;
  conflictAreas: string[];
  recommendations: string[];
  processingTime: number;
  metadata: ConsensusMetadata;
}

// Consolidated ValidationRequest - Clear Interface
export interface MaestroValidationRequest {
  id: string;
  description: string;
  content: string;
  type: 'specification' | 'design' | 'implementation' | 'documentation' | 'code';
  criteria: ValidationCriteria;
  created: Date;
  metadata?: Record<string, any>;
}

// Unified Configuration Interface
export interface MaestroUnifiedConfig {
  // Core coordination settings
  enableConsensusValidation: boolean;
  enableSwarmCoordination: boolean;
  consensusThreshold: number;
  qualityThreshold: number;
  byzantineFaultTolerance: boolean;
  
  // Directory settings
  databasePath?: string;
  specsDirectory?: string;
  steeringDirectory?: string;
  
  // Performance settings
  enablePerformanceMonitoring?: boolean;
  initializationTimeout?: number;
  cacheEnabled?: boolean;
  logLevel?: 'info' | 'debug' | 'error';
}

// Task Result with Clear Interface
export interface MaestroTaskResult {
  id: string;
  description: string;
  phase: string;
  agents: string[];
  consensus: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created: Date;
  metadata?: Record<string, any>;
}

// Spec Result Interface
export interface MaestroSpecResult {
  featureDir?: string;
  task?: MaestroTaskResult;
  designFile?: string;
  tasksFile?: string;
  implementationFile?: string;
  swarmCoordinated?: boolean;
  aiContent?: ContentResult;
  consensusResult?: MaestroConsensusResult;
  [key: string]: any;
}

// Swarm Options Interface
export interface MaestroSwarmOptions {
  swarmMode?: boolean;
  maxAgents?: number;
  topology?: 'hierarchical' | 'mesh' | 'ring' | 'star';
  consensusThreshold?: number;
  validateConsensus?: boolean;
}

// Swarm Result Interface
export interface MaestroSwarmResult {
  swarmId: string;
  agents: number;
  status: 'active' | 'inactive' | 'failed' | 'fallback';
  objective: string;
  coordinator: string;
  method: string;
  error?: string;
}

// Workflow State Interface
export interface MaestroWorkflowState {
  featureName: string;
  currentPhase: WorkflowPhase;
  status: string;
  tasks: MaestroTaskResult[];
  lastActivity: Date;
  swarmActive: boolean;
  hiveMindIntegrated?: boolean;
  coordinatorType: string;
  solidArchitecture?: boolean;
  error?: string;
}

// Simple Task Options Interface
export interface MaestroTaskOptions {
  phase?: string;
  agents?: string[];
  consensus?: boolean;
  featureName?: string;
  taskId?: string;
  operation?: string;
  priority?: 'low' | 'medium' | 'high';
  swarmMode?: boolean;
  generateContent?: boolean;
  contentType?: 'specification' | 'design' | 'implementation' | 'documentation' | 'tests';
  requirements?: string[];
  constraints?: string[];
}

// Import required types from existing files
import { 
  WorkflowPhase, 
  ValidationResult, 
  ValidationScores, 
  ConsensusMetadata, 
  ValidationCriteria,
  ContentResult
} from './maestro-types';