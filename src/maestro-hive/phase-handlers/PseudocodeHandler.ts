/**
 * Pseudocode Phase Handler
 * 
 * Implements the Pseudocode phase of the SPARC methodology
 * Following KISS and SOLID principles with methods <25 lines
 */

import { EventEmitter } from 'events';
import type { 
  MaestroValidationResult, 
  MaestroLogger 
} from '../interfaces.js';
import type { SpecificationResult } from './SpecificationHandler.js';

export interface PseudocodeResult {
  algorithms: AlgorithmDefinition[];
  dataStructures: DataStructureDefinition[];
  flowDiagram: FlowStep[];
  complexityAnalysis: ComplexityAnalysis;
  qualityScore: number;
}

export interface AlgorithmDefinition {
  name: string;
  purpose: string;
  steps: string[];
  inputs: string[];
  outputs: string[];
  complexity: string;
}

export interface DataStructureDefinition {
  name: string;
  type: string;
  properties: string[];
  operations: string[];
  constraints: string[];
}

export interface FlowStep {
  id: string;
  description: string;
  type: 'start' | 'process' | 'decision' | 'end';
  next?: string[];
}

export interface ComplexityAnalysis {
  timeComplexity: string;
  spaceComplexity: string;
  bottlenecks: string[];
  optimizations: string[];
}

export interface PseudocodeRequest {
  taskId: string;
  specifications: SpecificationResult;
  requirements: string[];
}

/**
 * Handles pseudocode phase with algorithm design
 * Single Responsibility: Only algorithm and logic design
 */
export class PseudocodeHandler extends EventEmitter {
  private logger: MaestroLogger;
  private qualityThreshold: number = 0.75;

  constructor(logger: MaestroLogger) {
    super();
    this.logger = logger;
  }

  /**
   * Execute pseudocode phase
   * Open/Closed: Extensible for new algorithm types
   */
  async executePhase(request: PseudocodeRequest): Promise<PseudocodeResult> {
    this.logger.info('Starting pseudocode phase', { taskId: request.taskId });

    const algorithms = await this.designAlgorithms(request);
    const dataStructures = await this.defineDataStructures(request);
    const flowDiagram = await this.createFlowDiagram(algorithms);
    const complexityAnalysis = await this.analyzeComplexity(algorithms, dataStructures);
    
    const result: PseudocodeResult = {
      algorithms,
      dataStructures,
      flowDiagram,
      complexityAnalysis,
      qualityScore: await this.calculateQualityScore(algorithms, dataStructures, complexityAnalysis)
    };

    this.emit('phaseComplete', { phase: 'pseudocode', result });
    return result;
  }

  /**
   * Design algorithms based on requirements
   * Liskov Substitution: Can be replaced by specialized designers
   */
  private async designAlgorithms(request: PseudocodeRequest): Promise<AlgorithmDefinition[]> {
    const algorithms: AlgorithmDefinition[] = [];
    
    for (const requirement of request.requirements) {
      const algorithm = this.createAlgorithmFromRequirement(requirement);
      if (algorithm) {
        algorithms.push(algorithm);
      }
    }
    
    return algorithms;
  }

  /**
   * Create algorithm definition from requirement
   * Interface Segregation: Focused on single algorithm creation
   */
  private createAlgorithmFromRequirement(requirement: string): AlgorithmDefinition | null {
    const reqLower = requirement.toLowerCase();
    
    if (reqLower.includes('search')) {
      return this.createSearchAlgorithm(requirement);
    }
    
    if (reqLower.includes('sort')) {
      return this.createSortAlgorithm(requirement);
    }
    
    if (reqLower.includes('validate')) {
      return this.createValidationAlgorithm(requirement);
    }
    
    if (reqLower.includes('process')) {
      return this.createProcessingAlgorithm(requirement);
    }
    
    return this.createGenericAlgorithm(requirement);
  }

  /**
   * Create search algorithm definition
   */
  private createSearchAlgorithm(requirement: string): AlgorithmDefinition {
    return {
      name: 'SearchAlgorithm',
      purpose: requirement,
      steps: [
        'Initialize search parameters',
        'Validate input criteria',
        'Execute search logic',
        'Filter and rank results',
        'Return matched results'
      ],
      inputs: ['searchCriteria', 'dataSet'],
      outputs: ['searchResults', 'metadata'],
      complexity: 'O(n log n)'
    };
  }

  /**
   * Create sort algorithm definition
   */
  private createSortAlgorithm(requirement: string): AlgorithmDefinition {
    return {
      name: 'SortAlgorithm',
      purpose: requirement,
      steps: [
        'Validate input data',
        'Determine sort criteria',
        'Apply sorting algorithm',
        'Verify sort order',
        'Return sorted data'
      ],
      inputs: ['unsortedData', 'sortCriteria'],
      outputs: ['sortedData'],
      complexity: 'O(n log n)'
    };
  }

  /**
   * Create validation algorithm definition
   */
  private createValidationAlgorithm(requirement: string): AlgorithmDefinition {
    return {
      name: 'ValidationAlgorithm',
      purpose: requirement,
      steps: [
        'Parse input data',
        'Apply validation rules',
        'Check constraints',
        'Generate error messages',
        'Return validation result'
      ],
      inputs: ['inputData', 'validationRules'],
      outputs: ['isValid', 'errors'],
      complexity: 'O(n)'
    };
  }

  /**
   * Create processing algorithm definition
   */
  private createProcessingAlgorithm(requirement: string): AlgorithmDefinition {
    return {
      name: 'ProcessingAlgorithm',
      purpose: requirement,
      steps: [
        'Initialize processing context',
        'Load required data',
        'Execute processing steps',
        'Handle errors and edge cases',
        'Return processed results'
      ],
      inputs: ['rawData', 'processingConfig'],
      outputs: ['processedData', 'processingLog'],
      complexity: 'O(n)'
    };
  }

  /**
   * Create generic algorithm definition
   */
  private createGenericAlgorithm(requirement: string): AlgorithmDefinition {
    return {
      name: 'GenericAlgorithm',
      purpose: requirement,
      steps: [
        'Initialize algorithm state',
        'Process input parameters',
        'Execute main logic',
        'Handle edge cases',
        'Return results'
      ],
      inputs: ['parameters'],
      outputs: ['results'],
      complexity: 'O(n)'
    };
  }

  /**
   * Define data structures for algorithms
   * Dependency Inversion: Can depend on abstractions
   */
  private async defineDataStructures(request: PseudocodeRequest): Promise<DataStructureDefinition[]> {
    const structures: DataStructureDefinition[] = [];
    
    // Analyze requirements for data structure needs
    const needsList = this.hasListStructure(request.requirements);
    const needsMap = this.hasMapStructure(request.requirements);
    const needsTree = this.hasTreeStructure(request.requirements);
    
    if (needsList) {
      structures.push(this.createListStructure());
    }
    
    if (needsMap) {
      structures.push(this.createMapStructure());
    }
    
    if (needsTree) {
      structures.push(this.createTreeStructure());
    }
    
    return structures;
  }

  /**
   * Check if requirements need list structure
   */
  private hasListStructure(requirements: string[]): boolean {
    return requirements.some(req => 
      req.toLowerCase().includes('list') || 
      req.toLowerCase().includes('array') ||
      req.toLowerCase().includes('collection'));
  }

  /**
   * Check if requirements need map structure
   */
  private hasMapStructure(requirements: string[]): boolean {
    return requirements.some(req => 
      req.toLowerCase().includes('map') || 
      req.toLowerCase().includes('dictionary') ||
      req.toLowerCase().includes('key-value'));
  }

  /**
   * Check if requirements need tree structure
   */
  private hasTreeStructure(requirements: string[]): boolean {
    return requirements.some(req => 
      req.toLowerCase().includes('tree') || 
      req.toLowerCase().includes('hierarchy') ||
      req.toLowerCase().includes('nested'));
  }

  /**
   * Create list data structure definition
   */
  private createListStructure(): DataStructureDefinition {
    return {
      name: 'DataList',
      type: 'List',
      properties: ['items', 'size', 'capacity'],
      operations: ['add', 'remove', 'get', 'indexOf', 'clear'],
      constraints: ['Ordered', 'Allow duplicates', 'Dynamic size']
    };
  }

  /**
   * Create map data structure definition
   */
  private createMapStructure(): DataStructureDefinition {
    return {
      name: 'DataMap',
      type: 'Map',
      properties: ['keys', 'values', 'size'],
      operations: ['put', 'get', 'remove', 'containsKey', 'clear'],
      constraints: ['Unique keys', 'Key-value pairs', 'Fast lookup']
    };
  }

  /**
   * Create tree data structure definition
   */
  private createTreeStructure(): DataStructureDefinition {
    return {
      name: 'DataTree',
      type: 'Tree',
      properties: ['root', 'nodes', 'height'],
      operations: ['insert', 'delete', 'search', 'traverse', 'balance'],
      constraints: ['Hierarchical', 'Parent-child relationships', 'Balanced']
    };
  }

  /**
   * Create flow diagram from algorithms
   */
  private async createFlowDiagram(algorithms: AlgorithmDefinition[]): Promise<FlowStep[]> {
    const steps: FlowStep[] = [];
    let stepId = 1;

    steps.push({
      id: `step_${stepId++}`,
      description: 'Start',
      type: 'start',
      next: [`step_${stepId}`]
    });

    for (const algorithm of algorithms) {
      for (const step of algorithm.steps) {
        steps.push({
          id: `step_${stepId}`,
          description: step,
          type: 'process',
          next: [`step_${stepId + 1}`]
        });
        stepId++;
      }
    }

    steps.push({
      id: `step_${stepId}`,
      description: 'End',
      type: 'end'
    });

    return steps;
  }

  /**
   * Analyze complexity of algorithms and data structures
   */
  private async analyzeComplexity(
    algorithms: AlgorithmDefinition[], 
    dataStructures: DataStructureDefinition[]
  ): Promise<ComplexityAnalysis> {
    const timeComplexities = algorithms.map(a => a.complexity);
    const worstTimeComplexity = this.getWorstComplexity(timeComplexities);
    
    return {
      timeComplexity: worstTimeComplexity,
      spaceComplexity: this.calculateSpaceComplexity(dataStructures),
      bottlenecks: this.identifyBottlenecks(algorithms),
      optimizations: this.suggestOptimizations(algorithms, dataStructures)
    };
  }

  /**
   * Get worst time complexity from list
   */
  private getWorstComplexity(complexities: string[]): string {
    const complexityOrder = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2^n)'];
    
    let worst = 'O(1)';
    for (const complexity of complexities) {
      const currentIndex = complexityOrder.indexOf(complexity);
      const worstIndex = complexityOrder.indexOf(worst);
      if (currentIndex > worstIndex) {
        worst = complexity;
      }
    }
    
    return worst;
  }

  /**
   * Calculate space complexity from data structures
   */
  private calculateSpaceComplexity(structures: DataStructureDefinition[]): string {
    if (structures.length === 0) return 'O(1)';
    if (structures.some(s => s.type === 'Tree')) return 'O(n)';
    if (structures.some(s => s.type === 'Map')) return 'O(n)';
    return 'O(n)';
  }

  /**
   * Identify potential bottlenecks
   */
  private identifyBottlenecks(algorithms: AlgorithmDefinition[]): string[] {
    const bottlenecks: string[] = [];
    
    algorithms.forEach(algorithm => {
      if (algorithm.complexity.includes('n²') || algorithm.complexity.includes('2^n')) {
        bottlenecks.push(`${algorithm.name} has high complexity: ${algorithm.complexity}`);
      }
    });
    
    return bottlenecks;
  }

  /**
   * Suggest optimizations
   */
  private suggestOptimizations(
    algorithms: AlgorithmDefinition[], 
    structures: DataStructureDefinition[]
  ): string[] {
    const optimizations: string[] = [];
    
    if (algorithms.some(a => a.complexity.includes('n²'))) {
      optimizations.push('Consider using more efficient algorithms (e.g., hash tables for O(1) lookup)');
    }
    
    if (structures.some(s => s.type === 'List' && s.operations.includes('search'))) {
      optimizations.push('Use Map for faster lookups instead of linear search in List');
    }
    
    return optimizations;
  }

  /**
   * Calculate quality score for pseudocode
   */
  private async calculateQualityScore(
    algorithms: AlgorithmDefinition[],
    structures: DataStructureDefinition[],
    complexity: ComplexityAnalysis
  ): Promise<number> {
    let score = 0;
    
    // Algorithm completeness (40% of score)
    score += Math.min(algorithms.length / 3, 1) * 0.4;
    
    // Data structure appropriateness (30% of score)
    score += Math.min(structures.length / 2, 1) * 0.3;
    
    // Complexity analysis (30% of score)
    const hasReasonableComplexity = !complexity.timeComplexity.includes('2^n');
    score += hasReasonableComplexity ? 0.3 : 0.15;
    
    return Math.min(score, 1);
  }

  /**
   * Validate pseudocode meets quality gate
   */
  async validateQualityGate(result: PseudocodeResult): Promise<MaestroValidationResult> {
    const passed = result.qualityScore >= this.qualityThreshold;
    
    return {
      passed,
      score: result.qualityScore,
      issues: passed ? [] : ['Pseudocode quality below threshold'],
      suggestions: passed ? [] : [
        'Add more detailed algorithms', 
        'Define appropriate data structures',
        'Optimize complexity where possible'
      ]
    };
  }

  /**
   * Set quality threshold for pseudocode
   */
  setQualityThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Quality threshold must be between 0 and 1');
    }
    this.qualityThreshold = threshold;
  }
}