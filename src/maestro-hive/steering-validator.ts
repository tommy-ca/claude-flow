/**
 * Steering Document Validator
 * 
 * Specialized validation engine for steering documents with Claude Flow coordination.
 * Implements Single Responsibility Principle - focuses exclusively on validation operations.
 * 
 * Features:
 * - Document structure validation
 * - Content quality assessment  
 * - Cross-document consistency validation
 * - Steering policy compliance checks
 * - Consensus mechanism integration
 */

import type {
  MaestroCoordinator,
  MaestroValidationResult,
  MaestroLogger
} from './interfaces.js';

/**
 * Steering document types for validation
 */
export enum SteeringDocumentType {
  PRODUCT = 'product',
  STRUCTURE = 'structure', 
  TECH = 'tech'
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'suggestion';
  validator: (content: string) => ValidationError[];
}

/**
 * Validation error result
 */
export interface ValidationError {
  ruleId: string;
  message: string;
  severity: 'error' | 'warning' | 'suggestion';
  line?: number;
  column?: number;
  suggestion?: string;
}

/**
 * Cross-document validation result
 */
export interface CrossValidationResult {
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
 * Consensus validation result
 */
export interface ConsensusResult {
  consensusReached: boolean;
  confidence: number;
  participantScores: number[];
  finalScore: number;
  consensusDetails: {
    agreements: string[];
    disagreements: string[];
    resolvedConflicts: string[];
  };
  timestamp: Date;
}

/**
 * Compliance validation result
 */
export interface ComplianceResult {
  compliant: boolean;
  score: number;
  missingRequirements: string[];
  fulfilledRequirements: string[];
  suggestions: string[];
  complianceDetails: {
    required: number;
    fulfilled: number;
    percentage: number;
  };
}

/**
 * Steering document metadata for validation
 */
export interface SteeringDocument {
  type: SteeringDocumentType;
  content: string;
  title: string;
  version: string;
  lastUpdated: Date;
  status: 'draft' | 'active' | 'archived';
}

/**
 * Validation configuration interface
 */
export interface ISteeringValidation {
  validateDocument(content: string, type: SteeringDocumentType): Promise<MaestroValidationResult>;
  validateCrossDocumentAlignment(documents: SteeringDocument[]): Promise<CrossValidationResult>;
  calculateQualityScore(content: string, type: SteeringDocumentType): Promise<number>;
  performConsensusValidation(content: string, type: SteeringDocumentType): Promise<ConsensusResult>;
  validateSteeringCompliance(content: string, requirements: string[]): Promise<ComplianceResult>;
}

/**
 * Steering Document Validator Implementation
 * 
 * Single Responsibility: Document validation operations only
 * High Cohesion: All validation logic centralized
 * Configurable: Extensible validation rules
 */
export class SteeringValidator implements ISteeringValidation {
  private coordinator: MaestroCoordinator;
  private logger: MaestroLogger;
  private validationRules: Map<SteeringDocumentType, ValidationRule[]>;

  constructor(coordinator: MaestroCoordinator, logger: MaestroLogger) {
    this.coordinator = coordinator;
    this.logger = logger;
    this.validationRules = new Map();
    this.initializeValidationRules();
    
    this.logger.info('SteeringValidator initialized', {
      rulesLoaded: this.getTotalRulesCount()
    });
  }

  /**
   * Validate individual steering document
   */
  async validateDocument(content: string, type: SteeringDocumentType): Promise<MaestroValidationResult> {
    this.logger.info('Validating steering document', { type, contentLength: content.length });

    // Get validation rules for document type
    const rules = this.validationRules.get(type) || [];
    const allErrors: ValidationError[] = [];

    // Apply all validation rules
    for (const rule of rules) {
      try {
        const errors = this.applyValidationRule(content, rule);
        allErrors.push(...errors);
      } catch (error) {
        this.logger.warn(`Validation rule ${rule.id} failed`, { error: error.message });
      }
    }

    // Calculate validation score
    const score = this.calculateContentScore(content, type);
    
    // Categorize errors
    const errors = allErrors.filter(e => e.severity === 'error').map(e => e.message);
    const warnings = allErrors.filter(e => e.severity === 'warning').map(e => e.message);
    const suggestions = allErrors.filter(e => e.severity === 'suggestion').map(e => e.message);

    const result: MaestroValidationResult = {
      valid: errors.length === 0,
      score,
      errors,
      warnings,
      suggestions,
      timestamp: new Date()
    };

    this.logger.info('Document validation completed', {
      type,
      valid: result.valid,
      score,
      errorCount: errors.length,
      warningCount: warnings.length
    });

    return result;
  }

  /**
   * Validate alignment across multiple steering documents
   */
  async validateCrossDocumentAlignment(documents: SteeringDocument[]): Promise<CrossValidationResult> {
    this.logger.info('Performing cross-document validation', { documentCount: documents.length });

    const documentMap = new Map<SteeringDocumentType, string>();
    documents.forEach(doc => documentMap.set(doc.type, doc.content));

    // Calculate alignment scores for each document
    const documentScores: Record<SteeringDocumentType, any> = {} as any;
    
    for (const docType of Object.values(SteeringDocumentType)) {
      const content = documentMap.get(docType);
      if (!content) continue;
      documentScores[docType] = {
        productContext: this.calculateContextAlignment(content, 'product'),
        structureContext: this.calculateContextAlignment(content, 'structure'),
        technologyContext: this.calculateContextAlignment(content, 'technology'),
        average: 0
      };
      
      const scores = [
        documentScores[docType].productContext,
        documentScores[docType].structureContext,
        documentScores[docType].technologyContext
      ];
      documentScores[docType].average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    // Calculate overall alignment
    const allScores = Object.values(documentScores).map(scores => scores.average);
    const overallAlignment = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

    // Generate issues and recommendations
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (overallAlignment < 0.95) {
      issues.push('Cross-document alignment below recommended threshold (95%)');
    }

    for (const [docType, scores] of Object.entries(documentScores)) {
      if (scores.average < 0.9) {
        recommendations.push(`Improve ${docType} document alignment - current score: ${(scores.average * 100).toFixed(1)}%`);
      }
    }

    // Check for missing dependencies
    this.validateDocumentDependencies(documents, issues, recommendations);

    const result: CrossValidationResult = {
      overallAlignment,
      documentScores,
      issues,
      recommendations,
      lastValidated: new Date()
    };

    this.logger.info('Cross-document validation completed', {
      overallAlignment: (overallAlignment * 100).toFixed(1) + '%',
      issueCount: issues.length,
      recommendationCount: recommendations.length
    });

    return result;
  }

  /**
   * Calculate quality score for steering document
   */
  async calculateQualityScore(content: string, type: SteeringDocumentType): Promise<number> {
    return this.calculateContentScore(content, type);
  }

  /**
   * Perform consensus validation using coordinator
   */
  async performConsensusValidation(content: string, type: SteeringDocumentType): Promise<ConsensusResult> {
    this.logger.info('Performing consensus validation', { type, contentLength: content.length });

    try {
      // Use coordinator for consensus-based validation
      const validation = await this.coordinator.validate(
        content,
        'steering-document',
        true // require consensus
      );

      // Simulate consensus details (in real implementation, coordinator would provide this)
      const consensusDetails = {
        agreements: ['Document structure is well-defined', 'Content aligns with methodology'],
        disagreements: validation.errors.length > 0 ? ['Some quality issues identified'] : [],
        resolvedConflicts: validation.warnings.map(w => `Resolved: ${w}`)
      };

      const result: ConsensusResult = {
        consensusReached: validation.valid && validation.score > 0.8,
        confidence: validation.score,
        participantScores: [validation.score], // In real implementation, multiple participant scores
        finalScore: validation.score,
        consensusDetails,
        timestamp: new Date()
      };

      this.logger.info('Consensus validation completed', {
        consensusReached: result.consensusReached,
        confidence: result.confidence,
        finalScore: result.finalScore
      });

      return result;
    } catch (error) {
      this.logger.error('Consensus validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate compliance with steering requirements
   */
  async validateSteeringCompliance(content: string, requirements: string[]): Promise<ComplianceResult> {
    this.logger.info('Validating steering compliance', { 
      contentLength: content.length, 
      requirementCount: requirements.length 
    });

    const missingRequirements: string[] = [];
    const fulfilledRequirements: string[] = [];
    const suggestions: string[] = [];

    // Check each requirement
    for (const requirement of requirements) {
      const fulfilled = this.checkRequirementFulfillment(content, requirement);
      
      if (fulfilled) {
        fulfilledRequirements.push(requirement);
      } else {
        missingRequirements.push(requirement);
        suggestions.push(`Add content addressing: ${requirement}`);
      }
    }

    const compliancePercentage = fulfilledRequirements.length / requirements.length;
    const score = Math.max(0, compliancePercentage - (missingRequirements.length * 0.1));

    const result: ComplianceResult = {
      compliant: missingRequirements.length === 0,
      score,
      missingRequirements,
      fulfilledRequirements,
      suggestions,
      complianceDetails: {
        required: requirements.length,
        fulfilled: fulfilledRequirements.length,
        percentage: compliancePercentage * 100
      }
    };

    this.logger.info('Steering compliance validation completed', {
      compliant: result.compliant,
      score: (result.score * 100).toFixed(1) + '%',
      fulfilled: fulfilledRequirements.length,
      missing: missingRequirements.length
    });

    return result;
  }

  // ===== PRIVATE VALIDATION METHODS =====

  /**
   * Initialize validation rules for each document type
   */
  private initializeValidationRules(): void {
    // Product document validation rules
    this.validationRules.set(SteeringDocumentType.PRODUCT, [
      {
        id: 'product-vision-required',
        name: 'Vision Statement Required',
        description: 'Product document must include a vision statement',
        severity: 'error',
        validator: (content) => content.includes('Vision Statement') ? [] : 
          [{ ruleId: 'product-vision-required', message: 'Product document must include Vision Statement', severity: 'error' }]
      },
      {
        id: 'product-mission-required',
        name: 'Mission Statement Required',
        description: 'Product document must include a mission statement',
        severity: 'error',
        validator: (content) => content.includes('Mission Statement') ? [] : 
          [{ ruleId: 'product-mission-required', message: 'Product document must include Mission Statement', severity: 'error' }]
      },
      {
        id: 'claude-flow-integration',
        name: 'Claude Flow Integration',
        description: 'Consider integrating Claude Flow coordination',
        severity: 'warning',
        validator: (content) => content.includes('Claude Flow') ? [] : 
          [{ ruleId: 'claude-flow-integration', message: 'Consider integrating Claude Flow coordination', severity: 'warning' }]
      }
    ]);

    // Structure document validation rules
    this.validationRules.set(SteeringDocumentType.STRUCTURE, [
      {
        id: 'clean-architecture-required',
        name: 'Clean Architecture Required',
        description: 'Structure document must define Clean Architecture',
        severity: 'error',
        validator: (content) => content.includes('Clean Architecture') ? [] : 
          [{ ruleId: 'clean-architecture-required', message: 'Structure document must define Clean Architecture', severity: 'error' }]
      },
      {
        id: 'solid-principles-required',
        name: 'SOLID Principles Required',
        description: 'Structure document must implement SOLID principles',
        severity: 'error',
        validator: (content) => content.includes('SOLID') ? [] : 
          [{ ruleId: 'solid-principles-required', message: 'Structure document must implement SOLID principles', severity: 'error' }]
      },
      {
        id: 'domain-layer-suggested',
        name: 'Domain Layer Structure',
        description: 'Consider defining Domain Layer structure',
        severity: 'warning',
        validator: (content) => content.includes('Domain Layer') ? [] : 
          [{ ruleId: 'domain-layer-suggested', message: 'Consider defining Domain Layer structure', severity: 'warning' }]
      }
    ]);

    // Tech document validation rules
    this.validationRules.set(SteeringDocumentType.TECH, [
      {
        id: 'technology-stack-specified',
        name: 'Technology Stack Specified',
        description: 'Tech document should specify technology stack',
        severity: 'warning',
        validator: (content) => (content.includes('Node.js') || content.includes('TypeScript')) ? [] : 
          [{ ruleId: 'technology-stack-specified', message: 'Consider specifying technology stack', severity: 'warning' }]
      },
      {
        id: 'performance-standards-defined',
        name: 'Performance Standards Defined',
        description: 'Tech document should define performance standards',
        severity: 'warning',
        validator: (content) => content.includes('Performance Standards') ? [] : 
          [{ ruleId: 'performance-standards-defined', message: 'Consider defining performance standards', severity: 'warning' }]
      }
    ]);

    this.logger.info('Validation rules initialized', {
      totalRules: this.getTotalRulesCount(),
      productRules: this.validationRules.get(SteeringDocumentType.PRODUCT)?.length || 0,
      structureRules: this.validationRules.get(SteeringDocumentType.STRUCTURE)?.length || 0,
      techRules: this.validationRules.get(SteeringDocumentType.TECH)?.length || 0
    });
  }

  /**
   * Apply validation rule to content
   */
  private applyValidationRule(content: string, rule: ValidationRule): ValidationError[] {
    try {
      return rule.validator(content);
    } catch (error) {
      this.logger.warn(`Validation rule ${rule.id} failed`, { error: error.message });
      return [{
        ruleId: rule.id,
        message: `Validation rule failed: ${error.message}`,
        severity: 'error'
      }];
    }
  }

  /**
   * Calculate content quality score
   */
  private calculateContentScore(content: string, type: SteeringDocumentType): number {
    let score = 0.7; // Base score

    // Length analysis
    if (content.length >= 1000) score += 0.1;
    if (content.length >= 2000) score += 0.05;

    // Structure analysis
    if (content.includes('##')) score += 0.05;
    if (content.includes('###')) score += 0.05;
    if (content.includes('-') || content.includes('*')) score += 0.05;

    // Type-specific keyword analysis
    const keywords = this.getTypeSpecificKeywords(type);
    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        score += 0.02;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate context alignment score
   */
  private calculateContextAlignment(content: string, contextType: string): number {
    let score = 0.7; // Base score

    // Context-specific keyword analysis
    const keywords = this.getContextKeywords(contextType);
    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        score += 0.05;
      }
    }

    // Structure analysis
    if (content.includes('##')) score += 0.05;
    if (content.includes('###')) score += 0.05;
    if (content.includes('-')) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Get context-specific keywords for alignment calculation
   */
  private getContextKeywords(contextType: string): string[] {
    const keywordMap = {
      product: ['vision', 'mission', 'strategy', 'objectives', 'stakeholder', 'user', 'business'],
      structure: ['architecture', 'clean', 'solid', 'domain', 'layer', 'component', 'interface'],
      technology: ['typescript', 'node.js', 'performance', 'security', 'testing', 'quality']
    };

    return keywordMap[contextType as keyof typeof keywordMap] || [];
  }

  /**
   * Get type-specific keywords for quality scoring
   */
  private getTypeSpecificKeywords(type: SteeringDocumentType): string[] {
    const keywordMap = {
      [SteeringDocumentType.PRODUCT]: ['vision', 'mission', 'strategy', 'objectives', 'stakeholder'],
      [SteeringDocumentType.STRUCTURE]: ['architecture', 'clean', 'solid', 'domain', 'layer'],
      [SteeringDocumentType.TECH]: ['typescript', 'node.js', 'performance', 'security', 'testing']
    };

    return keywordMap[type] || [];
  }

  /**
   * Validate document dependencies
   */
  private validateDocumentDependencies(
    documents: SteeringDocument[], 
    issues: string[], 
    recommendations: string[]
  ): void {
    const documentTypes = new Set(documents.map(d => d.type));

    // Structure depends on Product
    if (documentTypes.has(SteeringDocumentType.STRUCTURE) && !documentTypes.has(SteeringDocumentType.PRODUCT)) {
      issues.push('Structure document requires Product document to be present');
    }

    // Tech depends on both Product and Structure
    if (documentTypes.has(SteeringDocumentType.TECH)) {
      if (!documentTypes.has(SteeringDocumentType.PRODUCT)) {
        issues.push('Tech document requires Product document to be present');
      }
      if (!documentTypes.has(SteeringDocumentType.STRUCTURE)) {
        issues.push('Tech document requires Structure document to be present');
      }
    }
  }

  /**
   * Check if requirement is fulfilled in content
   */
  private checkRequirementFulfillment(content: string, requirement: string): boolean {
    // Enhanced keyword-based fulfillment check
    const contentLower = content.toLowerCase();
    const requirementLower = requirement.toLowerCase();
    
    // Direct phrase matching first
    if (contentLower.includes(requirementLower)) {
      return true;
    }
    
    // Key terms extraction and matching
    const keyTerms = this.extractKeyTerms(requirementLower);
    let matches = 0;

    for (const term of keyTerms) {
      if (contentLower.includes(term)) {
        matches++;
      }
    }

    // Requirement is fulfilled if at least 40% of key terms are present
    return keyTerms.length > 0 && (matches / keyTerms.length >= 0.4);
  }

  /**
   * Extract key terms from a requirement string
   */
  private extractKeyTerms(requirement: string): string[] {
    // Common words to ignore
    const stopWords = new Set(['must', 'be', 'present', 'required', 'needed', 'should', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return requirement
      .split(/[\s\-_]+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^\w]/g, ''));
  }

  /**
   * Get total number of loaded validation rules
   */
  private getTotalRulesCount(): number {
    let total = 0;
    const allRules = Array.from(this.validationRules.values());
    for (const rules of allRules) {
      total += rules.length;
    }
    return total;
  }
}

/**
 * Factory function for creating SteeringValidator
 */
export function createSteeringValidator(
  coordinator: MaestroCoordinator,
  logger: MaestroLogger
): SteeringValidator {
  return new SteeringValidator(coordinator, logger);
}