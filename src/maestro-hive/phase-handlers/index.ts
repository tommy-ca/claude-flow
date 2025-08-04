/**
 * SPARC Phase Handlers Index
 * 
 * Exports all phase handlers for the SPARC methodology implementation
 * Following KISS and SOLID principles with proper separation of concerns
 */

// Phase Handlers
export { SpecificationHandler, type SpecificationResult, type SpecificationRequest } from './SpecificationHandler.js';
export { PseudocodeHandler, type PseudocodeResult, type AlgorithmDefinition, type DataStructureDefinition } from './PseudocodeHandler.js';
export { ArchitectureHandler, type ArchitectureResult, type ComponentDefinition, type InterfaceDefinition } from './ArchitectureHandler.js';
export { RefinementHandler, type RefinementResult, type ImplementationPlan, type TestingSuite } from './RefinementHandler.js';
export { CompletionHandler, type CompletionResult, type IntegrationResult, type DocumentationResult } from './CompletionHandler.js';

/**
 * SPARC Phase Enum for consistency
 */
export enum SPARCPhase {
  SPECIFICATION = 'specification',
  PSEUDOCODE = 'pseudocode',
  ARCHITECTURE = 'architecture', 
  REFINEMENT = 'refinement',
  COMPLETION = 'completion'
}

/**
 * Phase Handler Factory
 * 
 * Creates appropriate phase handlers based on SPARC methodology
 * Implements Factory pattern for handler creation
 */
export class SPARCPhaseHandlerFactory {
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  /**
   * Create phase handler based on phase type
   * Single Responsibility: Only handler creation
   */
  createHandler(phase: SPARCPhase): any {
    switch (phase) {
      case SPARCPhase.SPECIFICATION:
        return new SpecificationHandler(this.logger);
      case SPARCPhase.PSEUDOCODE:
        return new PseudocodeHandler(this.logger);
      case SPARCPhase.ARCHITECTURE:
        return new ArchitectureHandler(this.logger);
      case SPARCPhase.REFINEMENT:
        return new RefinementHandler(this.logger);
      case SPARCPhase.COMPLETION:
        return new CompletionHandler(this.logger);
      default:
        throw new Error(`Unsupported SPARC phase: ${phase}`);
    }
  }

  /**
   * Get all supported phases
   * Open/Closed: Easy to extend with new phases
   */
  getSupportedPhases(): SPARCPhase[] {
    return Object.values(SPARCPhase);
  }

  /**
   * Validate phase sequence
   * Liskov Substitution: Any phase handler can be validated
   */
  validatePhaseSequence(phases: SPARCPhase[]): boolean {
    const correctSequence = [
      SPARCPhase.SPECIFICATION,
      SPARCPhase.PSEUDOCODE,
      SPARCPhase.ARCHITECTURE,
      SPARCPhase.REFINEMENT,
      SPARCPhase.COMPLETION
    ];

    // Check if phases follow correct order
    let lastIndex = -1;
    for (const phase of phases) {
      const currentIndex = correctSequence.indexOf(phase);
      if (currentIndex <= lastIndex) {
        return false;
      }
      lastIndex = currentIndex;
    }

    return true;
  }
}

/**
 * Quality Gate Manager
 * 
 * Manages quality gates between SPARC phases
 * Interface Segregation: Focused on quality validation
 */
export class QualityGateManager {
  private qualityThresholds: Map<SPARCPhase, number> = new Map();

  constructor() {
    // Set default quality thresholds
    this.qualityThresholds.set(SPARCPhase.SPECIFICATION, 0.8);
    this.qualityThresholds.set(SPARCPhase.PSEUDOCODE, 0.75);
    this.qualityThresholds.set(SPARCPhase.ARCHITECTURE, 0.75);
    this.qualityThresholds.set(SPARCPhase.REFINEMENT, 0.8);
    this.qualityThresholds.set(SPARCPhase.COMPLETION, 0.85);
  }

  /**
   * Set quality threshold for phase
   * Dependency Inversion: Depends on quality abstractions
   */
  setThreshold(phase: SPARCPhase, threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Quality threshold must be between 0 and 1');
    }
    this.qualityThresholds.set(phase, threshold);
  }

  /**
   * Get quality threshold for phase
   */
  getThreshold(phase: SPARCPhase): number {
    return this.qualityThresholds.get(phase) || 0.8;
  }

  /**
   * Validate phase result meets quality gate
   */
  async validateQualityGate(phase: SPARCPhase, result: any): Promise<boolean> {
    const threshold = this.getThreshold(phase);
    return result.qualityScore >= threshold;
  }

  /**
   * Get all quality thresholds
   */
  getAllThresholds(): Map<SPARCPhase, number> {
    return new Map(this.qualityThresholds);
  }
}

/**
 * SPARC Workflow Orchestrator
 * 
 * Orchestrates the complete SPARC workflow with quality gates
 * Single Responsibility: Only workflow orchestration
 */
export class SPARCWorkflowOrchestrator {
  private handlerFactory: SPARCPhaseHandlerFactory;
  private qualityGateManager: QualityGateManager;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
    this.handlerFactory = new SPARCPhaseHandlerFactory(logger);
    this.qualityGateManager = new QualityGateManager();
  }

  /**
   * Execute complete SPARC workflow
   * Open/Closed: Extensible for new workflow patterns
   */
  async executeWorkflow(taskId: string, requirements: string[]): Promise<any> {
    this.logger.info('Starting SPARC workflow', { taskId, phases: 5 });

    let previousResult: any = null;
    const results = new Map<SPARCPhase, any>();

    // Execute each phase in sequence with quality gates
    for (const phase of this.handlerFactory.getSupportedPhases()) {
      this.logger.info(`Executing ${phase} phase`, { taskId });

      const handler = this.handlerFactory.createHandler(phase);
      const request = this.buildPhaseRequest(phase, taskId, requirements, previousResult);
      
      const result = await handler.executePhase(request);
      
      // Validate quality gate
      const validation = await handler.validateQualityGate(result);
      if (!validation.passed) {
        throw new Error(`Quality gate failed for ${phase}: ${validation.issues.join(', ')}`);
      }

      results.set(phase, result);
      previousResult = result;
      
      this.logger.info(`Completed ${phase} phase`, { 
        taskId, 
        qualityScore: result.qualityScore,
        passed: validation.passed 
      });
    }

    this.logger.info('SPARC workflow completed successfully', { taskId });
    return results;
  }

  /**
   * Build phase-specific request
   * Interface Segregation: Each phase gets only what it needs
   */
  private buildPhaseRequest(
    phase: SPARCPhase, 
    taskId: string, 
    requirements: string[], 
    previousResult: any
  ): any {
    const baseRequest = { taskId, requirements };

    switch (phase) {
      case SPARCPhase.SPECIFICATION:
        return {
          ...baseRequest,
          description: requirements.join(' '),
          context: 'SPARC methodology implementation'
        };

      case SPARCPhase.PSEUDOCODE:
        return {
          ...baseRequest,
          specifications: previousResult
        };

      case SPARCPhase.ARCHITECTURE:
        return {
          ...baseRequest,
          pseudocodeResult: previousResult,
          constraints: ['SOLID principles', 'KISS methodology']
        };

      case SPARCPhase.REFINEMENT:
        return {
          ...baseRequest,
          architectureResult: previousResult,
          constraints: ['Methods <25 lines', 'Classes <300 lines']
        };

      case SPARCPhase.COMPLETION:
        return {
          ...baseRequest,
          refinementResult: previousResult,
          acceptanceCriteria: requirements.map(req => `${req} must be fully implemented`)
        };

      default:
        return baseRequest;
    }
  }

  /**
   * Get quality gate manager
   */
  getQualityGateManager(): QualityGateManager {
    return this.qualityGateManager;
  }

  /**
   * Get phase handler factory
   */
  getHandlerFactory(): SPARCPhaseHandlerFactory {
    return this.handlerFactory;
  }
}