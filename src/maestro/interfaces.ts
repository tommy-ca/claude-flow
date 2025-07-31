#!/usr/bin/env node
/**
 * Maestro System Interfaces
 * Following Interface Segregation Principle - client-specific interfaces
 */

import { 
  ContentRequest, 
  ContentResult, 
  ValidationRequest, 
  ConsensusResult,
  DatabaseConfig,
  DatabaseResult,
  AgentSpec,
  ContentTemplate
} from './types';

// Single Responsibility: Content Generation Only
export interface IContentGenerator {
  generateContent(request: ContentRequest): Promise<ContentResult>;
  getAgentMetrics(): Promise<Record<string, any>>;
  getTemplateMetrics(): Promise<Record<string, any>>;
}

// Single Responsibility: Content Templates Only
export interface ITemplateManager {
  getTemplate(name: string): ContentTemplate | null;
  applyTemplate(template: ContentTemplate, variables: Record<string, string>): string;
  listTemplates(): ContentTemplate[];
}

// Single Responsibility: Agent Management Only
export interface IAgentManager {
  getAgent(id: string): AgentSpec | null;
  listAgents(): AgentSpec[];
  activateAgent(id: string): void;
  deactivateAgent(id: string): void;
}

// Single Responsibility: Consensus Validation Only
export interface IConsensusValidator {
  validateConsensus(request: ValidationRequest): Promise<ConsensusResult>;
  getValidatorMetrics(): Promise<Record<string, any>>;
  updateValidatorPerformance(validatorId: string, feedback: Record<string, number>): void;
}

// Single Responsibility: Database Operations Only
export interface IDatabaseOptimizer {
  initializeWithMigration(): Promise<DatabaseResult>;
  createBackup(): Promise<void>;
  validateIntegrity(): Promise<boolean>;
}

// Single Responsibility: Event Publishing Only
export interface IEventPublisher {
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

// Single Responsibility: Metrics Collection Only
export interface IMetricsCollector {
  collectMetrics(): Promise<Record<string, any>>;
  recordEvent(event: string, duration: number): void;
  getPerformanceStats(): Promise<Record<string, any>>;
}

// Single Responsibility: Configuration Management Only
export interface IConfigManager {
  getConfig(): Record<string, any>;
  updateConfig(updates: Record<string, any>): void;
  validateConfig(): boolean;
}

// Composition interfaces for complex operations
export interface IContentWorkflow extends IContentGenerator, IConsensusValidator {
  generateAndValidate(request: ContentRequest): Promise<{
    content: ContentResult;
    validation: ConsensusResult;
  }>;
}

export interface ISystemCoordinator extends IEventPublisher, IMetricsCollector, IConfigManager {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): Promise<Record<string, any>>;
}