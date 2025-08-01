#!/usr/bin/env node
/**
 * Simple Quality Gates System
 * Replaces complex consensus validation with practical quality checks
 */

export interface QualityRequest {
  id: string;
  content: string;
  type: 'specification' | 'design' | 'implementation' | 'documentation' | 'code';
}

export interface QualityResult {
  requestId: string;
  passed: boolean;
  score: number; // 0-1 scale
  checks: QualityCheck[];
  feedback: string[];
  processingTime: number;
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  weight: number;
  feedback?: string;
}

/**
 * Simple Quality Gates Validator
 * Fast, practical quality validation with clear pass/fail criteria
 */
export class QualityGates {
  private readonly passThreshold: number = 0.75;

  constructor(passThreshold: number = 0.75) {
    this.passThreshold = passThreshold;
  }

  /**
   * Validate content against quality gates
   */
  async validate(request: QualityRequest): Promise<QualityResult> {
    const startTime = Date.now();
    
    // Run quality checks
    const checks = this.runQualityChecks(request);
    
    // Calculate weighted score
    const score = this.calculateScore(checks);
    
    // Determine pass/fail
    const passed = score >= this.passThreshold;
    
    // Generate feedback
    const feedback = this.generateFeedback(checks, passed);
    
    return {
      requestId: request.id,
      passed,
      score,
      checks,
      feedback,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Run all quality checks based on content type
   */
  private runQualityChecks(request: QualityRequest): QualityCheck[] {
    const checks: QualityCheck[] = [];
    
    // Universal checks (apply to all content types)
    checks.push(this.checkLength(request.content));
    checks.push(this.checkStructure(request.content));
    checks.push(this.checkCompleteness(request.content));
    
    // Type-specific checks
    switch (request.type) {
      case 'code':
        checks.push(this.checkCodeQuality(request.content));
        break;
      case 'specification':
        checks.push(this.checkSpecificationClarity(request.content));
        break;
      case 'documentation':
        checks.push(this.checkDocumentationClarity(request.content));
        break;
      default:
        checks.push(this.checkGeneralClarity(request.content));
    }
    
    return checks;
  }

  /**
   * Check if content has adequate length
   */
  private checkLength(content: string): QualityCheck {
    const minLength = 50;
    const maxLength = 10000;
    const length = content.trim().length;
    
    const passed = length >= minLength && length <= maxLength;
    const score = passed ? 1.0 : Math.min(length / minLength, 1.0);
    
    return {
      name: 'Content Length',
      passed,
      score,
      weight: 0.1,
      feedback: passed ? undefined : 
        length < minLength ? `Content too short (${length} chars, minimum ${minLength})` :
        `Content too long (${length} chars, maximum ${maxLength})`
    };
  }

  /**
   * Check basic structure (paragraphs, sections)
   */
  private checkStructure(content: string): QualityCheck {
    const lines = content.split('\n').filter(line => line.trim());
    const hasMultipleLines = lines.length > 1;
    const hasHeaders = /^#+\s/.test(content) || /^[A-Z][^.]*:/.test(content);
    const hasParagraphs = content.includes('\n\n');
    
    const structureScore = (
      (hasMultipleLines ? 0.4 : 0) +
      (hasHeaders ? 0.3 : 0) +
      (hasParagraphs ? 0.3 : 0)
    );
    
    const passed = structureScore >= 0.5;
    
    return {
      name: 'Content Structure',
      passed,
      score: structureScore,
      weight: 0.2,
      feedback: passed ? undefined : 'Content needs better structure with clear sections'
    };
  }

  /**
   * Check completeness based on key indicators
   */
  private checkCompleteness(content: string): QualityCheck {
    const indicators = [
      /\b(requirements?|specs?|specifications?)\b/i,
      /\b(implementation|code|solution)\b/i,
      /\b(example|sample|demo)\b/i,
      /\b(test|testing|validation)\b/i
    ];
    
    const matchedIndicators = indicators.filter(regex => regex.test(content)).length;
    const completenessScore = Math.min(matchedIndicators / 2, 1.0);
    const passed = completenessScore >= 0.5;
    
    return {
      name: 'Content Completeness',
      passed,
      score: completenessScore,
      weight: 0.3,
      feedback: passed ? undefined : 'Content appears incomplete - consider adding more details'
    };
  }

  /**
   * Check code quality indicators
   */
  private checkCodeQuality(content: string): QualityCheck {
    const hasComments = /\/\/|\/\*|\*\/|#/.test(content);
    const hasVariables = /\b(const|let|var|def|function|class)\b/.test(content);
    const hasLogic = /\b(if|else|for|while|switch|try|catch)\b/.test(content);
    
    const qualityScore = (
      (hasComments ? 0.3 : 0) +
      (hasVariables ? 0.4 : 0) +
      (hasLogic ? 0.3 : 0)
    );
    
    const passed = qualityScore >= 0.6;
    
    return {
      name: 'Code Quality',
      passed,
      score: qualityScore,
      weight: 0.4,
      feedback: passed ? undefined : 'Code needs better structure with comments and proper logic'
    };
  }

  /**
   * Check specification clarity
   */
  private checkSpecificationClarity(content: string): QualityCheck {
    const hasClearObjectives = /\b(goal|objective|purpose|requirement|should|must|will)\b/i.test(content);
    const hasAcceptanceCriteria = /\b(criteria|acceptance|validation|test|endpoint|api|function|method)\b/i.test(content);
    const hasConstraints = /\b(constraint|limitation|assumption|security|performance|implement)\b/i.test(content);
    const hasStructure = /^#+\s|^##|^-\s|\*\s|^\d+\./m.test(content);
    
    const clarityScore = (
      (hasClearObjectives ? 0.3 : 0) +
      (hasAcceptanceCriteria ? 0.3 : 0) +
      (hasConstraints ? 0.2 : 0) +
      (hasStructure ? 0.2 : 0)
    );
    
    const passed = clarityScore >= 0.5;
    
    return {
      name: 'Specification Clarity',
      passed,
      score: Math.min(1.0, clarityScore),
      weight: 0.4,
      feedback: passed ? undefined : 'Specification needs clearer objectives and acceptance criteria'
    };
  }

  /**
   * Check documentation clarity
   */
  private checkDocumentationClarity(content: string): QualityCheck {
    const hasTitle = /^#\s|^[A-Z][^.]*\n/.test(content);
    const hasInstructions = /\b(step|instruction|how to|guide)\b/i.test(content);
    const hasExamples = /\b(example|sample|demo|illustration)\b/i.test(content);
    
    const clarityScore = (
      (hasTitle ? 0.3 : 0) +
      (hasInstructions ? 0.4 : 0) +
      (hasExamples ? 0.3 : 0)
    );
    
    const passed = clarityScore >= 0.6;
    
    return {
      name: 'Documentation Clarity',
      passed,
      score: clarityScore,
      weight: 0.4,
      feedback: passed ? undefined : 'Documentation needs clearer instructions and examples'
    };
  }

  /**
   * General clarity check for other content types
   */
  private checkGeneralClarity(content: string): QualityCheck {
    const hasKeyPoints = content.split('.').length > 2;
    const hasActionableItems = /\b(should|must|will|need to|action|task)\b/i.test(content);
    const readabilityScore = Math.min(content.split(/\s+/).length / 100, 1.0);
    
    const clarityScore = (
      (hasKeyPoints ? 0.4 : 0) +
      (hasActionableItems ? 0.3 : 0) +
      (readabilityScore * 0.3)
    );
    
    const passed = clarityScore >= 0.5;
    
    return {
      name: 'General Clarity',
      passed,
      score: clarityScore,
      weight: 0.4,
      feedback: passed ? undefined : 'Content needs clearer structure and actionable points'
    };
  }

  /**
   * Calculate weighted overall score
   */
  private calculateScore(checks: QualityCheck[]): number {
    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const weightedScore = checks.reduce((sum, check) => sum + (check.score * check.weight), 0);
    
    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Generate actionable feedback
   */
  private generateFeedback(checks: QualityCheck[], passed: boolean): string[] {
    const feedback: string[] = [];
    
    // Add check-specific feedback
    checks.forEach(check => {
      if (!check.passed && check.feedback) {
        feedback.push(check.feedback);
      }
    });
    
    // Add overall feedback
    if (!passed) {
      feedback.push('Overall quality below threshold - please address the above issues');
    } else {
      feedback.push('Content meets quality standards');
    }
    
    return feedback;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): { passThreshold: number } {
    return { passThreshold: this.passThreshold };
  }
}

/**
 * Factory function for creating quality gates
 */
export function createQualityGates(passThreshold?: number): QualityGates {
  return new QualityGates(passThreshold);
}