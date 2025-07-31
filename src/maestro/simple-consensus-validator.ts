#!/usr/bin/env node
/**
 * Simplified Consensus Validator
 * Following KISS and SOLID principles
 */

import { EventEmitter } from 'events';
import { IConsensusValidator, IAgentManager } from './interfaces';
import { ValidationRequest, ConsensusResult, ValidationResult, AgentSpec } from './types';

/**
 * Simple Validator Agent - Single Responsibility
 */
class ValidatorAgent {
  constructor(
    public readonly spec: AgentSpec,
    public readonly performance = {
      accuracy: 0.85 + Math.random() * 0.1,
      responseTime: 50 + Math.random() * 100
    }
  ) {}

  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    
    // Simple validation scoring
    const scores = this.generateScores(request);
    const decision = this.makeDecision(scores.overall);
    const confidence = this.calculateConfidence(scores.overall);
    
    return {
      validatorId: this.spec.id,
      validatorName: this.spec.name,
      scores,
      decision,
      confidence,
      feedback: this.generateFeedback(scores),
      recommendations: this.generateRecommendations(scores),
      processingTime: Date.now() - startTime
    };
  }

  private generateScores(request: ValidationRequest) {
    // Simple scoring based on content length and complexity
    const contentLength = request.content.length;
    const baseScore = Math.min(0.9, 0.6 + (contentLength / 1000) * 0.3);
    
    // Add some variation based on validator specialty
    const specialtyBonus = this.spec.specialty.includes('security') ? 0.05 : 0;
    
    const qualityScore = Math.min(1.0, baseScore + specialtyBonus);
    const technicalScore = Math.min(1.0, baseScore + (this.spec.experience - 0.8) * 0.5);
    const businessScore = Math.min(1.0, baseScore + Math.random() * 0.2);
    
    return {
      quality: {
        completeness: qualityScore,
        accuracy: qualityScore * 0.95,
        clarity: qualityScore * 0.9,
        consistency: qualityScore * 0.85
      },
      technical: {
        feasibility: technicalScore,
        performance: technicalScore * 0.9,
        security: technicalScore * (this.spec.specialty.includes('security') ? 1.1 : 0.8),
        maintainability: technicalScore * 0.85
      },
      business: {
        requirements: businessScore,
        usability: businessScore * 0.9,
        value: businessScore * 0.85,
        risk: 1 - (businessScore * 0.3) // Risk is inverse
      },
      overall: (qualityScore + technicalScore + businessScore) / 3
    };
  }

  private makeDecision(overallScore: number): 'approve' | 'reject' | 'abstain' {
    if (overallScore >= 0.75) return 'approve';
    if (overallScore < 0.5) return 'reject';
    return 'abstain';
  }

  private calculateConfidence(overallScore: number): number {
    return this.spec.experience * Math.min(1.0, overallScore + 0.1);
  }

  private generateFeedback(scores: any): string[] {
    const feedback: string[] = [];
    
    if (scores.overall < 0.7) {
      feedback.push('Content needs improvement in overall quality');
    }
    
    if (scores.technical.security < 0.8) {
      feedback.push('Security considerations require attention');
    }
    
    if (scores.business.requirements < 0.7) {
      feedback.push('Business requirements alignment needs validation');
    }
    
    return feedback.length > 0 ? feedback : ['Content meets basic standards'];
  }

  private generateRecommendations(scores: any): string[] {
    const recommendations: string[] = [];
    
    if (scores.quality.completeness < 0.8) {
      recommendations.push('Add more comprehensive details and examples');
    }
    
    if (scores.technical.performance < 0.8) {
      recommendations.push('Include performance benchmarks and optimization strategies');
    }
    
    return recommendations.length > 0 ? recommendations : ['Content is acceptable'];
  }
}

/**
 * Simple Consensus Calculator - Single Responsibility
 */
class ConsensusCalculator {
  calculateConsensus(results: ValidationResult[], threshold: number): ConsensusResult {
    const startTime = Date.now();
    
    // Count decisions
    const decisions = results.map(r => r.decision);
    const approvals = decisions.filter(d => d === 'approve').length;
    const rejections = decisions.filter(d => d === 'reject').length;
    const total = results.length;
    
    // Calculate consensus score
    const consensusScore = Math.max(approvals, rejections) / total;
    
    // Aggregate quality scores (simple average)
    const qualityScore = results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length;
    
    // Determine final decision
    const decision = this.determineDecision(approvals, rejections, total, threshold, qualityScore);
    
    return {
      requestId: `consensus-${Date.now()}`,
      decision,
      consensusScore,
      qualityScore,
      participatingValidators: results.length,
      totalValidators: results.length,
      results,
      aggregatedScores: this.aggregateScores(results),
      conflictAreas: this.identifyConflicts(results),
      recommendations: this.aggregateRecommendations(results),
      processingTime: Date.now() - startTime,
      metadata: {
        votingMethod: 'simple-majority',
        consensusThreshold: threshold,
        qualityThreshold: 0.75,
        byzantineFaultTolerance: false
      }
    };
  }

  private determineDecision(
    approvals: number, 
    rejections: number, 
    total: number, 
    threshold: number,
    qualityScore: number
  ): 'approved' | 'rejected' | 'requires_revision' | 'insufficient_consensus' {
    const approvalRate = approvals / total;
    const rejectionRate = rejections / total;
    
    if (approvalRate >= threshold && qualityScore >= 0.75) {
      return 'approved';
    } else if (rejectionRate >= threshold) {
      return 'rejected';
    } else if (approvalRate >= 0.5) {
      return 'requires_revision';
    } else {
      return 'insufficient_consensus';
    }
  }

  private aggregateScores(results: ValidationResult[]) {
    // Simple average aggregation
    const aggregate = {
      quality: { completeness: 0, accuracy: 0, clarity: 0, consistency: 0 },
      technical: { feasibility: 0, performance: 0, security: 0, maintainability: 0 },
      business: { requirements: 0, usability: 0, value: 0, risk: 0 },
      overall: 0
    };

    results.forEach(result => {
      Object.keys(aggregate.quality).forEach(key => {
        aggregate.quality[key] += result.scores.quality[key];
      });
      Object.keys(aggregate.technical).forEach(key => {
        aggregate.technical[key] += result.scores.technical[key];
      });  
      Object.keys(aggregate.business).forEach(key => {
        aggregate.business[key] += result.scores.business[key];
      });
      aggregate.overall += result.scores.overall;
    });

    const count = results.length;
    Object.keys(aggregate.quality).forEach(key => {
      aggregate.quality[key] /= count;
    });
    Object.keys(aggregate.technical).forEach(key => {
      aggregate.technical[key] /= count;
    });
    Object.keys(aggregate.business).forEach(key => {
      aggregate.business[key] /= count;
    });
    aggregate.overall /= count;

    return aggregate;
  }

  private identifyConflicts(results: ValidationResult[]): string[] {
    const decisions = results.map(r => r.decision);
    const uniqueDecisions = [...new Set(decisions)];
    
    if (uniqueDecisions.length > 1) {
      return [`Decision disagreement: ${uniqueDecisions.join(', ')}`];
    }
    
    return [];
  }

  private aggregateRecommendations(results: ValidationResult[]): string[] {
    const allRecommendations = results.flatMap(r => r.recommendations);
    const counts = new Map<string, number>();
    
    allRecommendations.forEach(rec => {
      counts.set(rec, (counts.get(rec) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([rec, count]) => `${rec} (${count} validators)`);
  }
}

/**
 * Simple Consensus Validator - Composition Pattern
 */
export class SimpleConsensusValidator extends EventEmitter implements IConsensusValidator {
  private validators: ValidatorAgent[] = [];
  private calculator: ConsensusCalculator;
  private consensusThreshold: number;

  constructor(consensusThreshold = 0.66) {
    super();
    this.consensusThreshold = consensusThreshold;
    this.calculator = new ConsensusCalculator();
    this.initializeValidators();
  }

  async validateConsensus(request: ValidationRequest): Promise<ConsensusResult> {
    // Select validators for this request
    const selectedValidators = this.selectValidators(request.type);
    
    // Get validation results from all validators
    const validationPromises = selectedValidators.map(validator => 
      validator.validate(request)
    );
    
    const results = await Promise.all(validationPromises);
    
    // Calculate consensus
    const consensusResult = this.calculator.calculateConsensus(results, this.consensusThreshold);
    
    this.emit('consensusReached', consensusResult);
    return consensusResult;
  }

  async getValidatorMetrics(): Promise<Record<string, any>> {
    return {
      totalValidators: this.validators.length,
      activeValidators: this.validators.filter(v => v.spec.active).length,
      averageExperience: this.validators.reduce((sum, v) => sum + v.spec.experience, 0) / this.validators.length,
      averageAccuracy: this.validators.reduce((sum, v) => sum + v.performance.accuracy, 0) / this.validators.length,
      configuration: {
        consensusThreshold: this.consensusThreshold,
        qualityThreshold: 0.75
      }
    };
  }

  updateValidatorPerformance(validatorId: string, feedback: Record<string, number>): void {
    const validator = this.validators.find(v => v.spec.id === validatorId);
    if (validator && feedback.accuracy) {
      // Simple performance update
      validator.performance.accuracy = (validator.performance.accuracy * 0.9) + (feedback.accuracy * 0.1);
    }
  }

  private initializeValidators(): void {
    const validatorSpecs: AgentSpec[] = [
      {
        id: 'tech-architect',
        name: 'Technical Architect',
        specialty: ['architecture', 'scalability', 'performance'],
        experience: 0.95,
        active: true
      },
      {
        id: 'security-expert',
        name: 'Security Expert',
        specialty: ['security', 'compliance', 'risk'],
        experience: 0.92,
        active: true
      },
      {
        id: 'qa-engineer',
        name: 'QA Engineer',
        specialty: ['testing', 'quality-assurance', 'validation'],
        experience: 0.91,
        active: true
      },
      {
        id: 'business-analyst',
        name: 'Business Analyst',
        specialty: ['requirements', 'business-value', 'stakeholder'],
        experience: 0.87,
        active: true
      }
    ];

    this.validators = validatorSpecs.map(spec => new ValidatorAgent(spec));
  }

  private selectValidators(contentType: string): ValidatorAgent[] {
    // Simple selection - use all active validators
    return this.validators.filter(v => v.spec.active);
  }
}

/**
 * Factory function following Dependency Inversion Principle
 */
export function createSimpleConsensusValidator(consensusThreshold?: number): SimpleConsensusValidator {
  return new SimpleConsensusValidator(consensusThreshold);
}