/**
 * Steering Workflow Interfaces
 * 
 * Interfaces for the modular steering workflow system following SOLID principles
 * Supports specs-driven development and SPARC methodology integration
 */

import { EventEmitter } from 'events';
import type { 
  MaestroCoordinator, 
  MaestroTask,
  MaestroWorkflow,
  MaestroValidationResult,
  MaestroLogger 
} from '../interfaces.js';
import type { TaskPriority } from '../../hive-mind/types.js';

// ===== STEERING DOCUMENT TYPES =====

/**
 * Steering document types in the Kiro methodology
 */
export enum SteeringDocumentType {
  PRODUCT = 'product',
  STRUCTURE = 'structure', 
  TECH = 'tech'
}

/**
 * Steering document metadata
 */
export interface SteeringDocument {
  type: SteeringDocumentType;
  title: string;
  version: string;
  lastUpdated: Date;
  status: 'draft' | 'active' | 'archived';
  globalContext: Record<string, any>;
  alignmentScore?: number;
  dependencies: SteeringDocumentType[];
  content?: string;
}

/**
 * Steering workflow operation types
 */
export enum SteeringOperation {
  CREATE = 'create',
  UPDATE = 'update',
  VALIDATE = 'validate',
  SYNC = 'sync',
  CROSS_VALIDATE = 'cross_validate',
  GENERATE_SPEC = 'generate_spec'
}

/**
 * Cross-document validation result
 */
export interface CrossDocumentValidation {
  overallAlignment: number;
  documentScores: Record<SteeringDocumentType, {
    productContext: number;
    structureContext: number;
    technologyContext: number;
    average: number;
  }>;
  issues: string[];
  recommendations: string[];
  lastValidated: Date;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  timestamp: Date;
}

/**
 * Workflow progress tracking
 */
export interface WorkflowProgress {
  workflowId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
  lastUpdated: Date;
}

/**
 * Recovery result from failure handling
 */
export interface RecoveryResult {
  success: boolean;
  strategy: string;
  actions: string[];
  restoredState?: any;
  timestamp: Date;
}

// ===== REQUEST/RESPONSE INTERFACES =====

/**
 * Steering workflow request
 */
export interface SteeringWorkflowRequest {
  operation: SteeringOperation;
  documentType?: SteeringDocumentType;
  content?: string;
  globalContext?: Record<string, any>;
  requireConsensus?: boolean;
  priority?: TaskPriority;
  metadata?: Record<string, any>;
}

/**
 * Steering operation result
 */
export interface SteeringOperationResult {
  success: boolean;
  operation: SteeringOperation;
  documentType?: SteeringDocumentType;
  content?: string;
  metadata?: SteeringDocument;
  validation?: MaestroValidationResult;
  crossValidation?: CrossDocumentValidation;
  taskId?: string;
  workflowId?: string;
  duration: number;
  timestamp: Date;
  errors?: string[];
  warnings?: string[];
}

/**
 * Create document request
 */
export interface CreateDocumentRequest extends SteeringWorkflowRequest {
  operation: SteeringOperation.CREATE;
  documentType: SteeringDocumentType;
}

/**
 * Update document request
 */
export interface UpdateDocumentRequest extends SteeringWorkflowRequest {
  operation: SteeringOperation.UPDATE;
  documentType: SteeringDocumentType;
  content: string;
}

/**
 * Validation request
 */
export interface ValidationRequest extends SteeringWorkflowRequest {
  operation: SteeringOperation.VALIDATE;
  documentType?: SteeringDocumentType;
}

// ===== COMPONENT INTERFACES =====

/**
 * Document management interface
 */
export interface ISteeringDocumentManager {
  createDocument(type: SteeringDocumentType, content: string, context: Record<string, any>): Promise<SteeringDocument>;
  updateDocument(type: SteeringDocumentType, content: string, context?: Record<string, any>): Promise<SteeringDocument>;
  getDocument(type: SteeringDocumentType): Promise<SteeringDocument | null>;
  getAllDocuments(): Promise<SteeringDocument[]>;
  deleteDocument(type: SteeringDocumentType): Promise<boolean>;
  saveDocument(document: SteeringDocument): Promise<void>;
  loadDocument(type: SteeringDocumentType): Promise<SteeringDocument | null>;
}

/**
 * Validation interface
 */
export interface ISteeringValidator {
  validateDocument(document: SteeringDocument): Promise<ValidationResult>;
  validateDocumentContent(type: SteeringDocumentType, content: string): Promise<ValidationResult>;
  crossValidateDocuments(documents: SteeringDocument[]): Promise<CrossDocumentValidation>;
  validateSpecificRules(type: SteeringDocumentType, content: string): Promise<ValidationResult>;
}

/**
 * Content generation interface
 */
export interface ISteeringContentGenerator {
  generateContent(type: SteeringDocumentType, baseContent: string, context: Record<string, any>): Promise<string>;
  enhanceContent(type: SteeringDocumentType, content: string, context: Record<string, any>): Promise<string>;
  createPrompt(type: SteeringDocumentType, baseContent: string, context: Record<string, any>): string;
  extractRequirements(documents: SteeringDocument[]): Promise<string[]>;
}

/**
 * Main orchestration interface
 */
export interface ISteeringWorkflowCoordination extends EventEmitter {
  executeSteeringWorkflow(request: SteeringWorkflowRequest): Promise<SteeringOperationResult>;
  orchestrateDocumentOperation(operation: SteeringOperation, request: any): Promise<SteeringOperationResult>;
  coordinateValidationProcess(documents: SteeringDocument[]): Promise<ValidationResult>;
  manageWorkflowProgress(workflowId: string): Promise<WorkflowProgress>;
  handleWorkflowFailure(workflowId: string, error: Error): Promise<RecoveryResult>;
}

// ===== EVENT TYPES =====

/**
 * Steering workflow events
 */
export type SteeringWorkflowEvent = 
  | { type: 'workflow_started'; data: { workflowId: string; operation: SteeringOperation } }
  | { type: 'workflow_completed'; data: SteeringOperationResult }
  | { type: 'workflow_failed'; data: { workflowId: string; error: Error; request: SteeringWorkflowRequest } }
  | { type: 'document_created'; data: SteeringDocument }
  | { type: 'document_updated'; data: SteeringDocument }
  | { type: 'document_validated'; data: { document: SteeringDocument; validation: ValidationResult } }
  | { type: 'cross_validation_completed'; data: CrossDocumentValidation }
  | { type: 'progress_updated'; data: WorkflowProgress }
  | { type: 'recovery_attempted'; data: RecoveryResult };

// ===== UTILITY TYPES =====

/**
 * Document operation context
 */
export interface DocumentOperationContext {
  operation: SteeringOperation;
  documentType?: SteeringDocumentType;
  workflowId: string;
  taskId: string;
  startTime: Date;
  metadata: Record<string, any>;
}

/**
 * Orchestration configuration
 */
export interface OrchestrationConfig {
  enableParallelValidation: boolean;
  requireConsensus: boolean;
  qualityThreshold: number;
  maxRetryAttempts: number;
  timeoutMs: number;
  enableCrossValidation: boolean;
  autoRecovery: boolean;
}