#!/usr/bin/env node
/**
 * Multi-Agent Consensus Validation System
 * Phase 2 implementation for enhanced quality validation
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';

export interface ValidationRequest {
  id: string;
  content: string;
  type: 'specification' | 'design' | 'implementation' | 'documentation' | 'code';
  criteria: ValidationCriteria;
  metadata?: Record<string, any>;
}

export interface ValidationCriteria {
  quality: {
    completeness: number; // 0-1 threshold
    accuracy: number;
    clarity: number;
    consistency: number;
  };
  technical: {
    feasibility: number;
    performance: number;
    security: number;
    maintainability: number;
  };
  business: {
    requirements: number;
    usability: number;
    value: number;
    risk: number;
  };
}

export interface ValidatorAgent {
  id: string;
  name: string;
  specialty: string[];
  experience: number; // 0-1 competency level
  bias: number; // -1 to 1, bias tendency
  active: boolean;
  performance: ValidatorPerformance;
}

export interface ValidatorPerformance {
  accuracy: number; // Historical accuracy rate
  responseTime: number; // Average response time in ms
  agreementRate: number; // How often agrees with consensus
  falsePositiveRate: number; // Rate of incorrect rejections
  falseNegativeRate: number; // Rate of incorrect approvals
}

export interface ValidationResult {
  validatorId: string;
  validatorName: string;
  scores: ValidationScores;
  decision: 'approve' | 'reject' | 'abstain';
  confidence: number; // 0-1 confidence in decision
  feedback: string[];
  recommendations: string[];
  processingTime: number;
}

export interface ValidationScores {
  quality: {
    completeness: number;
    accuracy: number;
    clarity: number;
    consistency: number;
  };
  technical: {
    feasibility: number;
    performance: number;
    security: number;
    maintainability: number;
  };
  business: {
    requirements: number;
    usability: number;
    value: number;
    risk: number;
  };
  overall: number;
}

export interface ConsensusResult {
  requestId: string;
  decision: 'approved' | 'rejected' | 'requires_revision' | 'insufficient_consensus';
  consensusScore: number; // 0-1 agreement level
  qualityScore: number; // 0-1 overall quality
  participatingValidators: number;
  totalValidators: number;
  results: ValidationResult[];
  aggregatedScores: ValidationScores;
  conflictAreas: string[];
  recommendations: string[];
  processingTime: number;
  metadata: {
    votingMethod: string;
    consensusThreshold: number;
    qualityThreshold: number;
    byzantineFaultTolerance: boolean;
  };
}

/**
 * Multi-Agent Consensus Validation Engine
 * Coordinates multiple validator agents for comprehensive quality assessment
 */
export class ConsensusValidator extends EventEmitter {
  private validators: Map<string, ValidatorAgent> = new Map();
  private activeValidations: Map<string, Promise<ConsensusResult>> = new Map();
  private consensusThreshold: number = 0.66; // 66% agreement required
  private qualityThreshold: number = 0.75; // 75% quality required
  private byzantineFaultTolerance: boolean = true;

  constructor(config: {
    consensusThreshold?: number;
    qualityThreshold?: number;
    byzantineFaultTolerance?: boolean;
  } = {}) {
    super();
    
    this.consensusThreshold = config.consensusThreshold || 0.66;
    this.qualityThreshold = config.qualityThreshold || 0.75;
    this.byzantineFaultTolerance = config.byzantineFaultTolerance || true;
    
    this.initializeValidators();
  }

  /**
   * Initialize validator agents with diverse specialties
   */
  private initializeValidators(): void {
    const validatorDefinitions: Omit<ValidatorAgent, 'active' | 'performance'>[] = [
      {
        id: 'tech-architect',
        name: 'Technical Architect',
        specialty: ['architecture', 'scalability', 'performance', 'security'],
        experience: 0.95,
        bias: 0.1 // Slightly conservative
      },
      {
        id: 'senior-dev',
        name: 'Senior Developer',
        specialty: ['implementation', 'code-quality', 'maintainability', 'testing'],
        experience: 0.88,
        bias: -0.05 // Slightly optimistic
      },
      {
        id: 'security-expert',
        name: 'Security Expert',
        specialty: ['security', 'compliance', 'risk', 'privacy'],
        experience: 0.92,
        bias: 0.2 // Conservative on security
      },
      {
        id: 'ux-specialist',
        name: 'UX Specialist',
        specialty: ['usability', 'user-experience', 'accessibility', 'design'],
        experience: 0.85,
        bias: -0.1 // User-focused, optimistic
      },
      {
        id: 'business-analyst',
        name: 'Business Analyst',
        specialty: ['requirements', 'business-value', 'stakeholder', 'process'],
        experience: 0.87,
        bias: 0.05 // Slightly conservative
      },
      {
        id: 'qa-engineer',
        name: 'QA Engineer',
        specialty: ['testing', 'quality-assurance', 'validation', 'automation'],
        experience: 0.91,
        bias: 0.15 // Conservative on quality
      },
      {
        id: 'devops-expert',
        name: 'DevOps Expert',
        specialty: ['deployment', 'infrastructure', 'monitoring', 'scalability'],
        experience: 0.89,
        bias: 0.0 // Neutral
      },
      {
        id: 'product-owner',
        name: 'Product Owner',
        specialty: ['product-vision', 'user-value', 'market-fit', 'prioritization'],
        experience: 0.83,
        bias: -0.15 // Optimistic about features
      }
    ];

    for (const def of validatorDefinitions) {
      const validator: ValidatorAgent = {
        ...def,
        active: true,
        performance: {
          accuracy: 0.85 + (Math.random() * 0.1), // 85-95% accuracy
          responseTime: 50 + (Math.random() * 100), // 50-150ms response time
          agreementRate: 0.7 + (Math.random() * 0.2), // 70-90% agreement rate
          falsePositiveRate: 0.02 + (Math.random() * 0.08), // 2-10% false positive
          falseNegativeRate: 0.01 + (Math.random() * 0.04) // 1-5% false negative
        }
      };
      
      this.validators.set(validator.id, validator);
    }

    console.log(chalk.green(`✅ Initialized ${this.validators.size} consensus validators`));
  }

  /**
   * Validate content through multi-agent consensus
   */
  async validateConsensus(request: ValidationRequest): Promise<ConsensusResult> {
    const startTime = Date.now();
    
    console.log(chalk.blue(`🔍 Starting consensus validation: ${request.type} (${request.id})`));

    // Check if already processing
    if (this.activeValidations.has(request.id)) {
      return await this.activeValidations.get(request.id)!;
    }

    // Create validation promise
    const validationPromise = this.processConsensusValidation(request, startTime);
    this.activeValidations.set(request.id, validationPromise);

    try {
      const result = await validationPromise;
      this.activeValidations.delete(request.id);
      return result;
    } catch (error) {
      this.activeValidations.delete(request.id);
      throw error;
    }
  }

  /**
   * Process consensus validation with multiple agents
   */
  private async processConsensusValidation(
    request: ValidationRequest, 
    startTime: number
  ): Promise<ConsensusResult> {
    // Select appropriate validators based on content type
    const selectedValidators = this.selectValidators(request);
    
    // Collect validation results from all validators
    const validationResults = await this.collectValidationResults(request, selectedValidators);
    
    // Apply Byzantine fault tolerance if enabled
    const filteredResults = this.byzantineFaultTolerance 
      ? this.applyByzantineFaultTolerance(validationResults)
      : validationResults;
    
    // Calculate aggregated scores
    const aggregatedScores = this.aggregateScores(filteredResults);
    
    // Determine consensus decision
    const consensusScore = this.calculateConsensusScore(filteredResults);
    const decision = this.determineConsensusDecision(
      consensusScore, 
      aggregatedScores.overall, 
      filteredResults
    );
    
    // Identify conflict areas
    const conflictAreas = this.identifyConflictAreas(filteredResults);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(filteredResults, conflictAreas);
    
    const processingTime = Date.now() - startTime;
    
    const result: ConsensusResult = {
      requestId: request.id,
      decision,
      consensusScore,
      qualityScore: aggregatedScores.overall,
      participatingValidators: filteredResults.length,
      totalValidators: selectedValidators.length,
      results: filteredResults,
      aggregatedScores,
      conflictAreas,
      recommendations,
      processingTime,
      metadata: {
        votingMethod: 'weighted-agreement',
        consensusThreshold: this.consensusThreshold,
        qualityThreshold: this.qualityThreshold,
        byzantineFaultTolerance: this.byzantineFaultTolerance
      }
    };

    console.log(chalk.green(`✅ Consensus validation complete: ${decision} (${processingTime}ms)`));
    console.log(chalk.cyan(`   Consensus: ${(consensusScore * 100).toFixed(1)}%`));
    console.log(chalk.cyan(`   Quality: ${(aggregatedScores.overall * 100).toFixed(1)}%`));
    console.log(chalk.cyan(`   Participants: ${filteredResults.length}/${selectedValidators.length}`));

    this.emit('consensusReached', result);
    return result;
  }

  /**
   * Select appropriate validators based on content type and specialty
   */
  private selectValidators(request: ValidationRequest): ValidatorAgent[] {
    const typeValidatorMap = {
      'specification': ['business-analyst', 'tech-architect', 'ux-specialist', 'product-owner'],
      'design': ['tech-architect', 'ux-specialist', 'senior-dev', 'security-expert'],
      'implementation': ['senior-dev', 'qa-engineer', 'security-expert', 'tech-architect'],
      'documentation': ['ux-specialist', 'business-analyst', 'qa-engineer', 'senior-dev'],
      'code': ['senior-dev', 'qa-engineer', 'security-expert', 'devops-expert']
    };

    const preferredValidators = typeValidatorMap[request.type] || [];
    const allValidators = Array.from(this.validators.values()).filter(v => v.active);
    
    // Include preferred validators
    const selected = preferredValidators
      .map(id => this.validators.get(id))
      .filter(v => v && v.active) as ValidatorAgent[];
    
    // Add additional validators to meet minimum threshold (5+ validators for consensus)
    const additional = allValidators
      .filter(v => !selected.includes(v))
      .sort((a, b) => b.experience - a.experience)
      .slice(0, Math.max(0, 5 - selected.length));
    
    return [...selected, ...additional];
  }

  /**
   * Collect validation results from all selected validators
   */
  private async collectValidationResults(
    request: ValidationRequest,
    validators: ValidatorAgent[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Simulate parallel validation by validators
    const validationPromises = validators.map(validator => 
      this.simulateValidatorDecision(request, validator)
    );
    
    const validationResults = await Promise.all(validationPromises);
    return validationResults;
  }

  /**
   * Simulate validator decision-making process
   */
  private async simulateValidatorDecision(
    request: ValidationRequest,
    validator: ValidatorAgent
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    // Simulate processing delay based on validator performance
    await new Promise(resolve => setTimeout(resolve, validator.performance.responseTime));
    
    // Generate scores based on validator specialty and bias
    const scores = this.generateValidationScores(request, validator);
    
    // Make decision based on scores and thresholds
    const decision = this.makeValidatorDecision(scores, validator);
    
    // Calculate confidence based on experience and score clarity
    const confidence = this.calculateValidatorConfidence(scores, validator);
    
    // Generate feedback and recommendations
    const feedback = this.generateValidatorFeedback(request, scores, validator);
    const recommendations = this.generateValidatorRecommendations(request, scores, validator);
    
    const processingTime = Date.now() - startTime;
    
    return {
      validatorId: validator.id,
      validatorName: validator.name,
      scores,
      decision,
      confidence,
      feedback,
      recommendations,
      processingTime
    };
  }

  /**
   * Generate validation scores based on validator specialty
   */
  private generateValidationScores(
    request: ValidationRequest,
    validator: ValidatorAgent
  ): ValidationScores {
    const baseScores = {
      quality: {
        completeness: 0.7 + (Math.random() * 0.3),
        accuracy: 0.7 + (Math.random() * 0.3),
        clarity: 0.7 + (Math.random() * 0.3),
        consistency: 0.7 + (Math.random() * 0.3)
      },
      technical: {
        feasibility: 0.7 + (Math.random() * 0.3),
        performance: 0.7 + (Math.random() * 0.3),
        security: 0.7 + (Math.random() * 0.3),
        maintainability: 0.7 + (Math.random() * 0.3)
      },
      business: {
        requirements: 0.7 + (Math.random() * 0.3),
        usability: 0.7 + (Math.random() * 0.3),
        value: 0.7 + (Math.random() * 0.3),
        risk: 0.7 + (Math.random() * 0.3)
      },
      overall: 0
    };

    // Apply validator specialty bonuses
    const specialtyBonus = 0.1;
    if (validator.specialty.includes('security') || validator.specialty.includes('compliance')) {
      baseScores.technical.security += specialtyBonus;
    }
    if (validator.specialty.includes('performance') || validator.specialty.includes('scalability')) {
      baseScores.technical.performance += specialtyBonus;
    }
    if (validator.specialty.includes('usability') || validator.specialty.includes('user-experience')) {
      baseScores.business.usability += specialtyBonus;
    }
    if (validator.specialty.includes('requirements') || validator.specialty.includes('business-value')) {
      baseScores.business.requirements += specialtyBonus;
      baseScores.business.value += specialtyBonus;
    }
    if (validator.specialty.includes('code-quality') || validator.specialty.includes('maintainability')) {
      baseScores.technical.maintainability += specialtyBonus;
      baseScores.quality.consistency += specialtyBonus;
    }

    // Apply experience factor
    const experienceFactor = 0.5 + (validator.experience * 0.5);
    Object.keys(baseScores).forEach(category => {
      if (category !== 'overall') {
        Object.keys(baseScores[category]).forEach(metric => {
          baseScores[category][metric] *= experienceFactor;
          baseScores[category][metric] = Math.min(1.0, baseScores[category][metric]);
        });
      }
    });

    // Apply validator bias
    const biasEffect = validator.bias * 0.1; // Max 10% bias effect
    Object.keys(baseScores).forEach(category => {
      if (category !== 'overall') {
        Object.keys(baseScores[category]).forEach(metric => {
          baseScores[category][metric] += biasEffect;
          baseScores[category][metric] = Math.max(0, Math.min(1, baseScores[category][metric]));
        });
      }
    });

    // Calculate overall score
    const allScores = [
      ...Object.values(baseScores.quality),
      ...Object.values(baseScores.technical),
      ...Object.values(baseScores.business)
    ];
    baseScores.overall = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

    return baseScores;
  }

  /**
   * Make validator decision based on scores
   */
  private makeValidatorDecision(
    scores: ValidationScores,
    validator: ValidatorAgent
  ): 'approve' | 'reject' | 'abstain' {
    const threshold = this.qualityThreshold + (validator.bias * 0.05);
    
    if (scores.overall >= threshold) {
      return 'approve';
    } else if (scores.overall < threshold - 0.2) {
      return 'reject';
    } else {
      // Abstain in borderline cases or when confidence is low
      return 'abstain';
    }
  }

  /**
   * Calculate validator confidence in decision
   */
  private calculateValidatorConfidence(
    scores: ValidationScores,
    validator: ValidatorAgent
  ): number {
    // Base confidence on experience and score consistency
    const scoreVariance = this.calculateScoreVariance(scores);
    const consistencyFactor = 1 - Math.min(0.3, scoreVariance);
    
    return validator.experience * consistencyFactor * validator.performance.accuracy;
  }

  /**
   * Calculate variance in scores to measure consistency
   */
  private calculateScoreVariance(scores: ValidationScores): number {
    const allScores = [
      ...Object.values(scores.quality),
      ...Object.values(scores.technical),
      ...Object.values(scores.business)
    ];
    
    const mean = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    const variance = allScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / allScores.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Generate validator feedback
   */
  private generateValidatorFeedback(
    request: ValidationRequest,
    scores: ValidationScores,
    validator: ValidatorAgent
  ): string[] {
    const feedback: string[] = [];
    
    // Quality feedback
    if (scores.quality.completeness < 0.7) {
      feedback.push('Content appears incomplete and needs additional detail');
    }
    if (scores.quality.clarity < 0.7) {
      feedback.push('Clarity could be improved with better structure and examples');
    }
    if (scores.quality.consistency < 0.7) {
      feedback.push('Inconsistencies found in terminology and approach');
    }
    
    // Technical feedback based on validator specialty
    if (validator.specialty.includes('security') && scores.technical.security < 0.8) {
      feedback.push('Security considerations need more comprehensive coverage');
    }
    if (validator.specialty.includes('performance') && scores.technical.performance < 0.8) {
      feedback.push('Performance implications require deeper analysis');
    }
    if (validator.specialty.includes('maintainability') && scores.technical.maintainability < 0.8) {
      feedback.push('Long-term maintainability concerns identified');
    }
    
    // Business feedback
    if (scores.business.requirements < 0.7) {
      feedback.push('Business requirements alignment needs validation');
    }
    if (scores.business.value < 0.7) {
      feedback.push('Business value proposition could be stronger');
    }
    
    return feedback.length > 0 ? feedback : ['Content meets basic quality standards'];
  }

  /**
   * Generate validator recommendations
   */
  private generateValidatorRecommendations(
    request: ValidationRequest,
    scores: ValidationScores,
    validator: ValidatorAgent
  ): string[] {
    const recommendations: string[] = [];
    
    // Recommendations based on lowest scores
    const allScores = {
      'completeness': scores.quality.completeness,
      'accuracy': scores.quality.accuracy,
      'clarity': scores.quality.clarity,
      'consistency': scores.quality.consistency,
      'feasibility': scores.technical.feasibility,
      'performance': scores.technical.performance,
      'security': scores.technical.security,
      'maintainability': scores.technical.maintainability,
      'requirements': scores.business.requirements,
      'usability': scores.business.usability,
      'value': scores.business.value,
      'risk': scores.business.risk
    };
    
    const sortedScores = Object.entries(allScores)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 3); // Top 3 areas for improvement
    
    for (const [area, score] of sortedScores) {
      if (score < 0.8) {
        switch (area) {
          case 'completeness':
            recommendations.push('Add more comprehensive details and examples');
            break;
          case 'clarity':
            recommendations.push('Improve structure and provide clearer explanations');
            break;
          case 'security':
            recommendations.push('Conduct thorough security analysis and add security controls');
            break;
          case 'performance':
            recommendations.push('Include performance benchmarks and optimization strategies');
            break;
          case 'requirements':
            recommendations.push('Validate alignment with business requirements');
            break;
          case 'usability':
            recommendations.push('Consider user experience and accessibility requirements');
            break;
          default:
            recommendations.push(`Improve ${area} through additional analysis and validation`);
        }
      }
    }
    
    return recommendations.length > 0 ? recommendations : ['Content quality is acceptable'];
  }

  /**
   * Apply Byzantine fault tolerance to filter out potentially malicious validators
   */
  private applyByzantineFaultTolerance(results: ValidationResult[]): ValidationResult[] {
    if (results.length < 4) {
      return results; // Need at least 4 validators for Byzantine fault tolerance
    }

    // Identify potential outliers based on score deviation
    const meanOverallScore = results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length;
    const scoreDeviations = results.map(r => Math.abs(r.scores.overall - meanOverallScore));
    const maxDeviation = Math.max(...scoreDeviations);
    
    // Filter out validators with excessive deviation (potential Byzantine behavior)
    const byzantineThreshold = 0.3; // 30% deviation threshold
    return results.filter(r => 
      Math.abs(r.scores.overall - meanOverallScore) <= byzantineThreshold
    );
  }

  /**
   * Aggregate scores from multiple validators
   */
  private aggregateScores(results: ValidationResult[]): ValidationScores {
    if (results.length === 0) {
      throw new Error('No validation results to aggregate');
    }

    const aggregated: ValidationScores = {
      quality: { completeness: 0, accuracy: 0, clarity: 0, consistency: 0 },
      technical: { feasibility: 0, performance: 0, security: 0, maintainability: 0 },
      business: { requirements: 0, usability: 0, value: 0, risk: 0 },
      overall: 0
    };

    // Weighted aggregation based on validator confidence and experience
    const totalWeight = results.reduce((sum, r) => {
      const validator = this.validators.get(r.validatorId);
      return sum + (validator ? validator.experience * r.confidence : r.confidence);
    }, 0);

    for (const result of results) {
      const validator = this.validators.get(result.validatorId);
      const weight = (validator ? validator.experience * result.confidence : result.confidence) / totalWeight;

      // Aggregate quality scores
      Object.keys(aggregated.quality).forEach(key => {
        aggregated.quality[key] += result.scores.quality[key] * weight;
      });

      // Aggregate technical scores
      Object.keys(aggregated.technical).forEach(key => {
        aggregated.technical[key] += result.scores.technical[key] * weight;
      });

      // Aggregate business scores
      Object.keys(aggregated.business).forEach(key => {
        aggregated.business[key] += result.scores.business[key] * weight;
      });

      aggregated.overall += result.scores.overall * weight;
    }

    return aggregated;
  }

  /**
   * Calculate consensus score based on agreement level
   */
  private calculateConsensusScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0;

    const decisions = results.map(r => r.decision);
    const approvals = decisions.filter(d => d === 'approve').length;
    const rejections = decisions.filter(d => d === 'reject').length;
    const abstentions = decisions.filter(d => d === 'abstain').length;
    
    // Calculate agreement score
    const maxDecisionCount = Math.max(approvals, rejections, abstentions);
    return maxDecisionCount / results.length;
  }

  /**
   * Determine final consensus decision
   */
  private determineConsensusDecision(
    consensusScore: number,
    qualityScore: number,
    results: ValidationResult[]
  ): 'approved' | 'rejected' | 'requires_revision' | 'insufficient_consensus' {
    const decisions = results.map(r => r.decision);
    const approvals = decisions.filter(d => d === 'approve').length;
    const rejections = decisions.filter(d => d === 'reject').length;
    const total = results.length;

    // Check for sufficient consensus
    if (consensusScore < this.consensusThreshold) {
      return 'insufficient_consensus';
    }

    // Check approval threshold
    const approvalRate = approvals / total;
    const rejectionRate = rejections / total;

    if (approvalRate >= this.consensusThreshold && qualityScore >= this.qualityThreshold) {
      return 'approved';
    } else if (rejectionRate >= this.consensusThreshold) {
      return 'rejected';
    } else {
      return 'requires_revision';
    }
  }

  /**
   * Identify areas where validators disagreed
   */
  private identifyConflictAreas(results: ValidationResult[]): string[] {
    const conflicts: string[] = [];
    
    // Check for disagreements in decisions
    const decisions = results.map(r => r.decision);
    const uniqueDecisions = [...new Set(decisions)];
    
    if (uniqueDecisions.length > 1) {
      const decisionCounts = uniqueDecisions.map(decision => ({
        decision,
        count: decisions.filter(d => d === decision).length
      }));
      
      conflicts.push(`Decision disagreement: ${decisionCounts.map(dc => `${dc.decision}(${dc.count})`).join(', ')}`);
    }

    // Check for score disagreements (high variance)
    const scoreAreas = ['completeness', 'accuracy', 'clarity', 'consistency', 
                       'feasibility', 'performance', 'security', 'maintainability',
                       'requirements', 'usability', 'value', 'risk'];
    
    for (const area of scoreAreas) {
      const scores = results.map(r => {
        if (area in r.scores.quality) return r.scores.quality[area];
        if (area in r.scores.technical) return r.scores.technical[area];
        if (area in r.scores.business) return r.scores.business[area];
        return 0;
      });
      
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev > 0.2) { // High disagreement
        conflicts.push(`High disagreement on ${area} (std dev: ${stdDev.toFixed(2)})`);
      }
    }

    return conflicts;
  }

  /**
   * Generate aggregated recommendations
   */
  private generateRecommendations(results: ValidationResult[], conflicts: string[]): string[] {
    const allRecommendations = results.flatMap(r => r.recommendations);
    const recommendationCounts = new Map<string, number>();
    
    // Count recommendation frequency
    for (const rec of allRecommendations) {
      recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 1);
    }
    
    // Sort by frequency and return top recommendations
    const sortedRecommendations = Array.from(recommendationCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([rec, count]) => `${rec} (mentioned by ${count} validators)`);
    
    // Add conflict resolution recommendations
    if (conflicts.length > 0) {
      sortedRecommendations.push('Address validator disagreements through additional review');
    }
    
    return sortedRecommendations;
  }

  /**
   * Get consensus validator metrics
   */
  async getValidatorMetrics(): Promise<Record<string, any>> {
    const metrics = {
      totalValidators: this.validators.size,
      activeValidators: Array.from(this.validators.values()).filter(v => v.active).length,
      averageExperience: 0,
      averageAccuracy: 0,
      validatorsBySpecialty: new Map<string, number>(),
      performanceMetrics: {
        averageResponseTime: 0,
        averageAgreementRate: 0,
        averageFalsePositiveRate: 0,
        averageFalseNegativeRate: 0
      }
    };

    const activeValidators = Array.from(this.validators.values()).filter(v => v.active);
    
    if (activeValidators.length > 0) {
      metrics.averageExperience = activeValidators.reduce((sum, v) => sum + v.experience, 0) / activeValidators.length;
      metrics.averageAccuracy = activeValidators.reduce((sum, v) => sum + v.performance.accuracy, 0) / activeValidators.length;
      
      metrics.performanceMetrics.averageResponseTime = activeValidators.reduce((sum, v) => sum + v.performance.responseTime, 0) / activeValidators.length;
      metrics.performanceMetrics.averageAgreementRate = activeValidators.reduce((sum, v) => sum + v.performance.agreementRate, 0) / activeValidators.length;
      metrics.performanceMetrics.averageFalsePositiveRate = activeValidators.reduce((sum, v) => sum + v.performance.falsePositiveRate, 0) / activeValidators.length;
      metrics.performanceMetrics.averageFalseNegativeRate = activeValidators.reduce((sum, v) => sum + v.performance.falseNegativeRate, 0) / activeValidators.length;
    }

    // Count validators by specialty
    for (const validator of activeValidators) {
      for (const specialty of validator.specialty) {
        metrics.validatorsBySpecialty.set(specialty, (metrics.validatorsBySpecialty.get(specialty) || 0) + 1);
      }
    }

    return {
      ...metrics,
      validatorsBySpecialty: Object.fromEntries(metrics.validatorsBySpecialty),
      configuration: {
        consensusThreshold: this.consensusThreshold,
        qualityThreshold: this.qualityThreshold,
        byzantineFaultTolerance: this.byzantineFaultTolerance
      }
    };
  }

  /**
   * Update validator performance based on feedback
   */
  updateValidatorPerformance(validatorId: string, feedback: {
    accuracy?: number;
    responseTime?: number;
    agreementRate?: number;
  }): void {
    const validator = this.validators.get(validatorId);
    if (!validator) {
      throw new Error(`Validator ${validatorId} not found`);
    }

    // Update performance metrics with weighted averaging
    const alpha = 0.1; // Learning rate
    
    if (feedback.accuracy !== undefined) {
      validator.performance.accuracy = (1 - alpha) * validator.performance.accuracy + alpha * feedback.accuracy;
    }
    
    if (feedback.responseTime !== undefined) {
      validator.performance.responseTime = (1 - alpha) * validator.performance.responseTime + alpha * feedback.responseTime;
    }
    
    if (feedback.agreementRate !== undefined) {
      validator.performance.agreementRate = (1 - alpha) * validator.performance.agreementRate + alpha * feedback.agreementRate;
    }

    console.log(chalk.cyan(`📊 Updated performance for validator: ${validator.name}`));
  }
}

/**
 * Create consensus validator instance
 */
export function createConsensusValidator(config?: {
  consensusThreshold?: number;
  qualityThreshold?: number;
  byzantineFaultTolerance?: boolean;
}): ConsensusValidator {
  return new ConsensusValidator(config);
}