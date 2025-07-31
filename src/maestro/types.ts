#!/usr/bin/env node
/**
 * Maestro System Type Definitions
 * Centralized type definitions following Interface Segregation Principle
 */

// Core Task and Result Types
export interface BaseTask {
  id: string;
  description: string;
  created: Date;
  metadata?: Record<string, any>;
}

export interface TaskResult extends BaseTask {
  phase: string;
  agents: string[];
  consensus: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// Content Generation Types
export interface ContentRequest extends BaseTask {
  type: 'specification' | 'design' | 'implementation' | 'documentation' | 'tests';
  context: string;
  requirements: string[];
  constraints: string[];
  targetAudience: 'developer' | 'architect' | 'stakeholder' | 'user';
  quality: 'draft' | 'review' | 'production';
}

export interface ContentResult {
  id: string;
  content: string;
  generatedAt: Date;
  quality: number;
  tokens: number;
  processingTime: number;
  agents: string[];
  confidence: number;
  improvements: string[];
}

// Validation Types
export interface ValidationCriteria {
  quality: QualityMetrics;
  technical: TechnicalMetrics;
  business: BusinessMetrics;
}

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  clarity: number;
  consistency: number;
}

export interface TechnicalMetrics {
  feasibility: number;
  performance: number;
  security: number;
  maintainability: number;
}

export interface BusinessMetrics {
  requirements: number;
  usability: number;
  value: number;
  risk: number;
}

export interface ValidationRequest extends BaseTask {
  content: string;
  type: 'specification' | 'design' | 'implementation' | 'documentation' | 'code';
  criteria: ValidationCriteria;
}

export interface ValidationResult {
  validatorId: string;
  validatorName: string;
  scores: ValidationScores;
  decision: 'approve' | 'reject' | 'abstain';
  confidence: number;
  feedback: string[];
  recommendations: string[];
  processingTime: number;
}

export interface ValidationScores {
  quality: QualityMetrics;
  technical: TechnicalMetrics;
  business: BusinessMetrics;
  overall: number;
}

export interface ConsensusResult {
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

export interface ConsensusMetadata {
  votingMethod: string;
  consensusThreshold: number;
  qualityThreshold: number;
  byzantineFaultTolerance: boolean;
}

// Database Types
export interface DatabaseConfig {
  databasePath: string;
  backupEnabled: boolean;
  validateData: boolean;
  forceRecreate: boolean;
}

export interface DatabaseResult {
  success: boolean;
  conflictsResolved: number;
  indexesRecreated: number;
  dataValidated: boolean;
  migrationTime: number;
  errors: string[];
}

// Agent Types
export interface AgentSpec {
  id: string;
  name: string;
  specialty: string[];
  experience: number;
  bias?: number;
  active: boolean;
}

export interface AgentPerformance {
  accuracy: number;
  responseTime: number;
  agreementRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

// Template Types
export interface ContentTemplate {
  name: string;
  type: string;
  template: string;
  variables: string[];
  quality: 'high' | 'medium' | 'low';
  examples: string[];
}

// Configuration Types
export interface MaestroConfig {
  enableConsensusValidation: boolean;
  enableSwarmCoordination: boolean;
  consensusThreshold: number;
  qualityThreshold: number;
  byzantineFaultTolerance: boolean;
  databasePath?: string;
  specsDirectory?: string;
  steeringDirectory?: string;
}