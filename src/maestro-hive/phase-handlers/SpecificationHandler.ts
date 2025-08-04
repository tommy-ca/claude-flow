/**
 * Specification Phase Handler
 * 
 * Implements the Specification phase of the SPARC methodology
 * Following KISS and SOLID principles with methods <25 lines
 */

import { EventEmitter } from 'events';
import type { 
  MaestroTask, 
  MaestroValidationResult, 
  MaestroLogger 
} from '../interfaces.js';
import type { SpecsDrivenPhase } from '../specs-driven-flow.js';

export interface SpecificationResult {
  requirements: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  stakeholders: string[];
  qualityScore: number;
}

export interface SpecificationRequest {
  taskId: string;
  description: string;
  context?: string;
  existingRequirements?: string[];
}

/**
 * Handles specification phase with quality gates
 * Single Responsibility: Only specification analysis
 */
export class SpecificationHandler extends EventEmitter {
  private logger: MaestroLogger;
  private qualityThreshold: number = 0.8;

  constructor(logger: MaestroLogger) {
    super();
    this.logger = logger;
  }

  /**
   * Execute specification phase
   * Open/Closed: Extensible for new spec types
   */
  async executePhase(request: SpecificationRequest): Promise<SpecificationResult> {
    this.logger.info('Starting specification phase', { taskId: request.taskId });

    const requirements = await this.analyzeRequirements(request);
    const acceptanceCriteria = await this.defineAcceptanceCriteria(requirements);
    const constraints = await this.identifyConstraints(request);
    const stakeholders = await this.identifyStakeholders(request);
    
    const result: SpecificationResult = {
      requirements,
      acceptanceCriteria,
      constraints,
      stakeholders,
      qualityScore: await this.calculateQualityScore(requirements, acceptanceCriteria)
    };

    this.emit('phaseComplete', { phase: 'specification', result });
    return result;
  }

  /**
   * Analyze and extract requirements
   * Liskov Substitution: Can be replaced by specialized analyzers
   */
  private async analyzeRequirements(request: SpecificationRequest): Promise<string[]> {
    const requirements: string[] = [];
    
    // Extract functional requirements
    const functionalReqs = this.extractFunctionalRequirements(request.description);
    requirements.push(...functionalReqs);
    
    // Extract non-functional requirements
    const nonFunctionalReqs = this.extractNonFunctionalRequirements(request.description);
    requirements.push(...nonFunctionalReqs);
    
    // Include existing requirements
    if (request.existingRequirements) {
      requirements.push(...request.existingRequirements);
    }
    
    return this.deduplicateRequirements(requirements);
  }

  /**
   * Extract functional requirements from description
   * Interface Segregation: Focused on functional aspects only
   */
  private extractFunctionalRequirements(description: string): string[] {
    const keywords = ['must', 'should', 'shall', 'will', 'can', 'needs to'];
    const sentences = description.split(/[.!?]+/);
    
    return sentences
      .filter(sentence => keywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)))
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  /**
   * Extract non-functional requirements
   * Dependency Inversion: Can depend on abstractions
   */
  private extractNonFunctionalRequirements(description: string): string[] {
    const nfrKeywords = ['performance', 'security', 'scalability', 'availability', 'reliability'];
    const sentences = description.split(/[.!?]+/);
    
    return sentences
      .filter(sentence => nfrKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)))
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  /**
   * Define acceptance criteria based on requirements
   */
  private async defineAcceptanceCriteria(requirements: string[]): Promise<string[]> {
    return requirements.map(req => 
      `Given ${req}, when implemented, then it should meet functional specifications`);
  }

  /**
   * Identify technical and business constraints
   */
  private identifyConstraints(request: SpecificationRequest): string[] {
    const constraints: string[] = [];
    
    // Add common technical constraints
    constraints.push('Must follow SOLID principles');
    constraints.push('Methods must be <25 lines');
    constraints.push('Classes must be <300 lines');
    
    // Extract context-specific constraints
    if (request.context?.includes('database')) {
      constraints.push('Must use existing database schema');
    }
    
    if (request.context?.includes('api')) {
      constraints.push('Must follow REST API conventions');
    }
    
    return constraints;
  }

  /**
   * Identify stakeholders from context
   */
  private identifyStakeholders(request: SpecificationRequest): string[] {
    const stakeholders = ['Development Team', 'Product Owner'];
    
    if (request.context?.includes('user')) {
      stakeholders.push('End Users');
    }
    
    if (request.context?.includes('admin')) {
      stakeholders.push('System Administrators');
    }
    
    return stakeholders;
  }

  /**
   * Remove duplicate requirements
   */
  private deduplicateRequirements(requirements: string[]): string[] {
    const unique = new Set();
    return requirements.filter(req => {
      const normalized = req.toLowerCase().trim();
      if (unique.has(normalized)) return false;
      unique.add(normalized);
      return true;
    });
  }

  /**
   * Calculate quality score for specifications
   */
  private async calculateQualityScore(
    requirements: string[], 
    acceptanceCriteria: string[]
  ): Promise<number> {
    let score = 0;
    
    // Requirements coverage (40% of score)
    score += Math.min(requirements.length / 5, 1) * 0.4;
    
    // Acceptance criteria coverage (30% of score) 
    score += Math.min(acceptanceCriteria.length / requirements.length, 1) * 0.3;
    
    // Completeness check (30% of score)
    const hasQualityReqs = requirements.some(req => 
      req.toLowerCase().includes('quality') || 
      req.toLowerCase().includes('performance'));
    score += hasQualityReqs ? 0.3 : 0.15;
    
    return Math.min(score, 1);
  }

  /**
   * Validate specification meets quality gate
   */
  async validateQualityGate(result: SpecificationResult): Promise<MaestroValidationResult> {
    const passed = result.qualityScore >= this.qualityThreshold;
    
    return {
      passed,
      score: result.qualityScore,
      issues: passed ? [] : ['Specification quality below threshold'],
      suggestions: passed ? [] : [
        'Add more detailed requirements',
        'Include non-functional requirements',
        'Define clearer acceptance criteria'
      ]
    };
  }

  /**
   * Set quality threshold for specifications
   */
  setQualityThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Quality threshold must be between 0 and 1');
    }
    this.qualityThreshold = threshold;
  }
}