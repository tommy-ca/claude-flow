#!/usr/bin/env node
/**
 * Simple Maestro Coordinator
 * Following KISS and SOLID principles with clear separation of concerns
 */

import { EventEmitter } from 'events';
import { ISystemCoordinator, IContentWorkflow } from './interfaces';
import { ContentRequest, ContentResult, ValidationRequest, ConsensusResult, MaestroConfig } from './types';
import { SimpleContentGenerator, createSimpleContentGenerator } from './simple-content-generator';
import { SimpleConsensusValidator, createSimpleConsensusValidator } from './simple-consensus-validator';
import { SimpleDatabaseOptimizer, createSimpleDatabaseOptimizer } from './simple-database-optimizer';

/**
 * Simple Metrics Collector - Single Responsibility
 */
class MetricsCollector {
  private events: Array<{ event: string; duration: number; timestamp: number }> = [];

  recordEvent(event: string, duration: number): void {
    this.events.push({
      event,
      duration,
      timestamp: Date.now()
    });
  }

  async getPerformanceStats(): Promise<Record<string, any>> {
    return {
      totalEvents: this.events.length,
      averageDuration: this.events.length > 0 
        ? this.events.reduce((sum, e) => sum + e.duration, 0) / this.events.length 
        : 0,
      recentEvents: this.events.slice(-10)
    };
  }
}

/**
 * Simple Config Manager - Single Responsibility
 */
class ConfigManager {
  constructor(private config: MaestroConfig) {}

  getConfig(): MaestroConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MaestroConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  validateConfig(): boolean {
    return !!(
      this.config.consensusThreshold >= 0 && 
      this.config.consensusThreshold <= 1 &&
      this.config.qualityThreshold >= 0 && 
      this.config.qualityThreshold <= 1
    );
  }
}

/**
 * Simple Content Workflow - Composition Pattern
 */
class ContentWorkflow implements IContentWorkflow {
  constructor(
    private contentGenerator: SimpleContentGenerator,
    private consensusValidator: SimpleConsensusValidator
  ) {}

  async generateContent(request: ContentRequest): Promise<ContentResult> {
    return this.contentGenerator.generateContent(request);
  }

  async validateConsensus(request: ValidationRequest): Promise<ConsensusResult> {
    return this.consensusValidator.validateConsensus(request);
  }

  async getAgentMetrics(): Promise<Record<string, any>> {
    return this.contentGenerator.getAgentMetrics();
  }

  async getTemplateMetrics(): Promise<Record<string, any>> {
    return this.contentGenerator.getTemplateMetrics();
  }

  async getValidatorMetrics(): Promise<Record<string, any>> {
    return this.consensusValidator.getValidatorMetrics();
  }

  updateValidatorPerformance(validatorId: string, feedback: Record<string, number>): void {
    this.consensusValidator.updateValidatorPerformance(validatorId, feedback);
  }

  async generateAndValidate(request: ContentRequest): Promise<{
    content: ContentResult;
    validation: ConsensusResult;
  }> {
    // Generate content
    const content = await this.generateContent(request);
    
    // Create validation request from content
    const validationRequest: ValidationRequest = {
      id: `validation-${content.id}`,
      description: `Validate generated content: ${request.description}`,
      content: content.content,
      type: request.type,
      criteria: {
        quality: { completeness: 0.8, accuracy: 0.85, clarity: 0.8, consistency: 0.85 },
        technical: { feasibility: 0.8, performance: 0.75, security: 0.85, maintainability: 0.8 },
        business: { requirements: 0.85, usability: 0.75, value: 0.8, risk: 0.7 }
      },
      created: new Date(),
      metadata: { originalRequest: request.id }
    };
    
    // Validate content
    const validation = await this.validateConsensus(validationRequest);
    
    return { content, validation };
  }
}

/**
 * Simple Maestro Coordinator - Main Orchestrator
 */
export class SimpleMaestroCoordinator extends EventEmitter implements ISystemCoordinator {
  private configManager: ConfigManager;
  private metricsCollector: MetricsCollector;
  private databaseOptimizer: SimpleDatabaseOptimizer | null = null;
  private contentWorkflow: ContentWorkflow | null = null;
  private initialized = false;

  constructor(config: MaestroConfig) {
    super();
    this.configManager = new ConfigManager(config);
    this.metricsCollector = new MetricsCollector();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const startTime = Date.now();
    
    try {
      // Step 1: Initialize database if configured
      if (this.configManager.getConfig().databasePath) {
        this.databaseOptimizer = createSimpleDatabaseOptimizer({
          databasePath: this.configManager.getConfig().databasePath!,
          backupEnabled: true,
          validateData: true,
          forceRecreate: false
        });
        
        await this.databaseOptimizer.initializeWithMigration();
      }

      // Step 2: Initialize content workflow
      const contentGenerator = createSimpleContentGenerator();
      const consensusValidator = createSimpleConsensusValidator(
        this.configManager.getConfig().consensusThreshold
      );
      
      this.contentWorkflow = new ContentWorkflow(contentGenerator, consensusValidator);

      // Step 3: Set up event forwarding
      contentGenerator.on('contentGenerated', (result) => {
        this.emit('contentGenerated', result);
      });
      
      consensusValidator.on('consensusReached', (result) => {
        this.emit('consensusReached', result);
      });

      this.initialized = true;
      this.metricsCollector.recordEvent('initialization', Date.now() - startTime);
      this.emit('initialized', { duration: Date.now() - startTime });

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      this.initialized = false;
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async getStatus(): Promise<Record<string, any>> {
    return {
      initialized: this.initialized,
      databaseOptimized: !!this.databaseOptimizer,
      contentWorkflowActive: !!this.contentWorkflow,
      config: this.configManager.getConfig(),
      uptime: process.uptime()
    };
  }

  // Content workflow methods
  async generateContent(request: ContentRequest): Promise<ContentResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    
    try {
      const result = await this.contentWorkflow!.generateContent(request);
      this.metricsCollector.recordEvent('contentGeneration', Date.now() - startTime);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async validateConsensus(request: ValidationRequest): Promise<ConsensusResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    
    try {
      const result = await this.contentWorkflow!.validateConsensus(request);
      this.metricsCollector.recordEvent('consensusValidation', Date.now() - startTime);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async generateAndValidate(request: ContentRequest): Promise<{
    content: ContentResult;
    validation: ConsensusResult;
  }> {
    this.ensureInitialized();
    const startTime = Date.now();
    
    try {
      const result = await this.contentWorkflow!.generateAndValidate(request);
      this.metricsCollector.recordEvent('generateAndValidate', Date.now() - startTime);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Interface implementations
  emit(event: string, data: any): boolean {
    return super.emit(event, data);
  }

  on(event: string, handler: (data: any) => void): this {
    return super.on(event, handler);
  }

  off(event: string, handler: (data: any) => void): this {
    return super.off(event, handler);
  }

  async collectMetrics(): Promise<Record<string, any>> {
    const status = await this.getStatus();
    const performanceStats = await this.metricsCollector.getPerformanceStats();
    
    let contentMetrics = {};
    let validatorMetrics = {};
    
    if (this.contentWorkflow) {
      try {
        contentMetrics = {
          agents: await this.contentWorkflow.getAgentMetrics(),
          templates: await this.contentWorkflow.getTemplateMetrics()
        };
        validatorMetrics = await this.contentWorkflow.getValidatorMetrics();
      } catch (error) {
        // Metrics collection shouldn't fail the main operation
        this.emit('metricsError', error);
      }
    }

    return {
      system: status,
      performance: performanceStats,
      content: contentMetrics,
      consensus: validatorMetrics
    };
  }

  recordEvent(event: string, duration: number): void {
    this.metricsCollector.recordEvent(event, duration);
  }

  async getPerformanceStats(): Promise<Record<string, any>> {
    return this.metricsCollector.getPerformanceStats();
  }

  getConfig(): Record<string, any> {
    return this.configManager.getConfig();
  }

  updateConfig(updates: Record<string, any>): void {
    this.configManager.updateConfig(updates);
    this.emit('configUpdated', updates);
  }

  validateConfig(): boolean {
    return this.configManager.validateConfig();
  }

  // Helper methods
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SimpleMaestroCoordinator not initialized. Call initialize() first.');
    }
  }
}

/**
 * Factory function following Dependency Inversion Principle
 */
export function createSimpleMaestroCoordinator(config: MaestroConfig): SimpleMaestroCoordinator {
  return new SimpleMaestroCoordinator(config);
}