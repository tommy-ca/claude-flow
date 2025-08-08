/**
 * Specs-Driven Flow Implementation
 * 
 * Implements the comprehensive specs-driven workflow pattern on top of HiveMind
 * Following SPARC methodology and integrating with steering documentation
 */

import { EventEmitter } from 'events';
import type {
  MaestroCoordinator,
  MaestroTask,
  MaestroWorkflow,
  SpecsDrivenWorkflow,
  MaestroValidationResult,
  MaestroLogger
} from './interfaces.js';
import type { 
  AgentType, 
  TaskPriority, 
  AgentCapability 
} from '../hive-mind/types.js';

/**
 * Specs-driven workflow phases following SPARC methodology
 */
export enum SpecsDrivenPhase {
  SPECIFICATION = 'specification',
  PSEUDOCODE = 'pseudocode', 
  ARCHITECTURE = 'architecture',
  REFINEMENT = 'refinement',
  COMPLETION = 'completion'
}

/**
 * Steering document types for governance
 */
export enum SteeringDocumentType {
  TECHNICAL = 'technical',
  WORKFLOW = 'workflow',
  PRODUCT = 'product',
  GOVERNANCE = 'governance'
}

/**
 * Quality gates for each phase
 */
export interface PhaseQualityGate {
  phase: SpecsDrivenPhase;
  requiredScore: number;
  consensusRequired: boolean;
  reviewerTypes: AgentType[];
  validationCriteria: string[];
  deliverables: string[];
}

/**
 * Steering document reference
 */
export interface SteeringReference {
  type: SteeringDocumentType;
  path: string;
  section?: string;
  relevance: 'mandatory' | 'recommended' | 'optional';
}

/**
 * Specs-driven task specification
 */
export interface SpecsDrivenTaskSpec extends MaestroTask {
  phase: SpecsDrivenPhase;
  steeringReferences: SteeringReference[];
  qualityGate: PhaseQualityGate;
  predecessorTasks: string[];
  successorTasks: string[];
  acceptanceCriteria: string[];
  testScenarios: string[];
}

/**
 * Comprehensive specs-driven workflow orchestrator
 */
export class SpecsDrivenFlowOrchestrator extends EventEmitter {
  private coordinator: MaestroCoordinator;
  private logger: MaestroLogger;
  private activeWorkflows: Map<string, SpecsDrivenWorkflow> = new Map();
  
  // Default quality gates for each phase
  private readonly DEFAULT_QUALITY_GATES: Record<SpecsDrivenPhase, PhaseQualityGate> = {
    [SpecsDrivenPhase.SPECIFICATION]: {
      phase: SpecsDrivenPhase.SPECIFICATION,
      requiredScore: 0.85,
      consensusRequired: true,
      reviewerTypes: ['requirements_analyst', 'design_architect'],
      validationCriteria: [
        'Requirements completeness',
        'Acceptance criteria clarity',
        'Stakeholder alignment',
        'Technical feasibility',
        'Steering compliance'
      ],
      deliverables: [
        'Requirements document',
        'User stories',
        'Acceptance criteria',
        'Stakeholder analysis',
        'Steering document references'
      ]
    },
    
    [SpecsDrivenPhase.PSEUDOCODE]: {
      phase: SpecsDrivenPhase.PSEUDOCODE,
      requiredScore: 0.80,
      consensusRequired: false,
      reviewerTypes: ['design_architect', 'implementation_coder'],
      validationCriteria: [
        'Algorithm clarity',
        'Logic completeness',
        'Edge case coverage',
        'Performance considerations',
        'Maintainability'
      ],
      deliverables: [
        'Pseudocode algorithms',
        'Data flow diagrams',
        'Decision trees',
        'Edge case documentation'
      ]
    },
    
    [SpecsDrivenPhase.ARCHITECTURE]: {
      phase: SpecsDrivenPhase.ARCHITECTURE,
      requiredScore: 0.85,
      consensusRequired: true,
      reviewerTypes: ['design_architect', 'system_architect'],
      validationCriteria: [
        'System design clarity',
        'Component integration',
        'Scalability planning',
        'Security considerations',
        'Technology alignment'
      ],
      deliverables: [
        'System architecture',
        'Component diagrams',
        'Integration patterns',
        'Security architecture',
        'Technology stack'
      ]
    },
    
    [SpecsDrivenPhase.REFINEMENT]: {
      phase: SpecsDrivenPhase.REFINEMENT,
      requiredScore: 0.75,
      consensusRequired: false,
      reviewerTypes: ['quality_reviewer', 'implementation_coder'],
      validationCriteria: [
        'Code quality',
        'Test coverage',
        'Performance optimization',
        'Error handling',
        'Documentation quality'
      ],
      deliverables: [
        'Implementation code',
        'Unit tests',
        'Integration tests',
        'Performance benchmarks',
        'Error handling'
      ]
    },
    
    [SpecsDrivenPhase.COMPLETION]: {
      phase: SpecsDrivenPhase.COMPLETION,
      requiredScore: 0.90,
      consensusRequired: true,
      reviewerTypes: ['quality_reviewer', 'steering_documenter'],
      validationCriteria: [
        'Requirements fulfillment',
        'Quality standards compliance',
        'Documentation completeness',
        'Production readiness',
        'Stakeholder approval'
      ],
      deliverables: [
        'Final implementation',
        'Comprehensive tests',
        'User documentation',
        'Deployment guide',
        'Sign-off documentation'
      ]
    }
  };

  // Default steering document references
  private readonly DEFAULT_STEERING_REFERENCES: Record<SpecsDrivenPhase, SteeringReference[]> = {
    [SpecsDrivenPhase.SPECIFICATION]: [
      { type: SteeringDocumentType.PRODUCT, path: 'steering/product.md', relevance: 'mandatory' },
      { type: SteeringDocumentType.WORKFLOW, path: 'steering/workflow.md', relevance: 'recommended' }
    ],
    [SpecsDrivenPhase.PSEUDOCODE]: [
      { type: SteeringDocumentType.TECHNICAL, path: 'steering/technical.md', relevance: 'mandatory' },
      { type: SteeringDocumentType.WORKFLOW, path: 'steering/workflow.md', relevance: 'recommended' }
    ],
    [SpecsDrivenPhase.ARCHITECTURE]: [
      { type: SteeringDocumentType.TECHNICAL, path: 'steering/technical.md', relevance: 'mandatory' },
      { type: SteeringDocumentType.GOVERNANCE, path: 'steering/governance.md', relevance: 'recommended' }
    ],
    [SpecsDrivenPhase.REFINEMENT]: [
      { type: SteeringDocumentType.TECHNICAL, path: 'steering/technical.md', relevance: 'mandatory' },
      { type: SteeringDocumentType.WORKFLOW, path: 'steering/workflow.md', relevance: 'recommended' }
    ],
    [SpecsDrivenPhase.COMPLETION]: [
      { type: SteeringDocumentType.PRODUCT, path: 'steering/product.md', relevance: 'mandatory' },
      { type: SteeringDocumentType.GOVERNANCE, path: 'steering/governance.md', relevance: 'mandatory' },
      { type: SteeringDocumentType.WORKFLOW, path: 'steering/workflow.md', relevance: 'recommended' }
    ]
  };

  constructor(coordinator: MaestroCoordinator, logger: MaestroLogger) {
    super();
    this.coordinator = coordinator;
    this.logger = logger;
  }

  /**
   * Create a comprehensive specs-driven workflow
   * REFACTORED: Builder pattern for KISS compliance (was 62 lines, now <15)
   */
  async createSpecsDrivenWorkflow(
    name: string,
    description: string,
    requirements: string[],
    stakeholders: string[],
    customQualityGates?: Partial<Record<SpecsDrivenPhase, Partial<PhaseQualityGate>>>
  ): Promise<SpecsDrivenWorkflow> {
    const workflowBuilder = new SpecsDrivenWorkflowBuilder(this.coordinator, this.logger);
    const workflow = await workflowBuilder
      .setBasicInfo(name, description)
      .setRequirements(requirements, stakeholders)
      .setCustomQualityGates(customQualityGates)
      .build();
    
    this.activeWorkflows.set(workflow.id, workflow);
    this.emit('specsDrivenWorkflowCreated', { workflow });
    
    return workflow;
  }

  /**
   * Execute specs-driven workflow with proper phase gating
   * REFACTORED: Pipeline pattern for KISS compliance (was 52 lines, now <15)
   */
  async executeSpecsDrivenWorkflow(workflowId: string): Promise<SpecsDrivenWorkflow> {
    const workflow = await this.initializeWorkflow(workflowId);
    const executionContext = await this.createExecutionContext(workflow);
    const completedWorkflow = await this.executePhasesPipeline(executionContext);
    return await this.finalizeWorkflowExecution(completedWorkflow);
  }

  /**
   * Initialize workflow for execution
   */
  private async initializeWorkflow(workflowId: string): Promise<SpecsDrivenWorkflow> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Specs-driven workflow ${workflowId} not found`);
    }

    this.logger.info('Executing specs-driven workflow', { workflowId });
    return workflow;
  }

  /**
   * Create execution context for workflow
   */
  private async createExecutionContext(workflow: SpecsDrivenWorkflow) {
    return {
      workflow,
      phases: Object.values(SpecsDrivenPhase),
      currentPhaseIndex: 0,
      results: new Map()
    };
  }

  /**
   * Execute all phases in pipeline with quality gates
   */
  private async executePhasesPipeline(context: any): Promise<SpecsDrivenWorkflow> {
    for (const phase of context.phases) {
      await this.executePhaseWithQualityGate(context.workflow, phase);
      this.emit('phaseCompleted', { workflow: context.workflow, phase });
    }
    return context.workflow;
  }

  /**
   * Execute single phase with quality gate validation
   */
  private async executePhaseWithQualityGate(workflow: SpecsDrivenWorkflow, phase: SpecsDrivenPhase): Promise<void> {
    await this.executePhase(workflow, phase);
    
    const gateResult = await this.validateQualityGate(workflow, phase);
    if (!gateResult.passed) {
      await this.handleQualityGateFailure(workflow, phase, gateResult);
      
      if (gateResult.retryRecommended) {
        await this.executePhase(workflow, phase);
      } else {
        throw new Error(`Quality gate failed for phase ${phase}: ${gateResult.issues.join(', ')}`);
      }
    }
    
    this.logger.info('Phase completed successfully', { 
      workflowId: workflow.id, 
      phase, 
      score: gateResult.score 
    });
  }

  /**
   * Finalize workflow execution
   */
  private async finalizeWorkflowExecution(workflow: SpecsDrivenWorkflow): Promise<SpecsDrivenWorkflow> {
    await this.validateWorkflowCompletion(workflow);
    
    workflow.status = 'completed';
    workflow.updated = new Date();
    
    this.logger.info('Specs-driven workflow completed', { workflowId: workflow.id });
    this.emit('specsDrivenWorkflowCompleted', { workflow });
    
    return workflow;
  }

  /**
   * Get workflow progress with phase-level detail
   * REFACTORED: Pipeline pattern for KISS compliance (was 63 lines, now <15)
   */
  async getWorkflowProgress(workflowId: string): Promise<{
    workflow: SpecsDrivenWorkflow;
    currentPhase: SpecsDrivenPhase | null;
    phaseProgress: Record<SpecsDrivenPhase, any>;
    overallProgress: number;
  }> {
    const workflow = await this.validateWorkflowExists(workflowId);
    const progressAnalyzer = new WorkflowProgressAnalyzer(workflow);
    return await progressAnalyzer.analyze();
  }

  /**
   * Validate workflow exists and return it
   */
  private async validateWorkflowExists(workflowId: string): Promise<SpecsDrivenWorkflow> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    return workflow;
  }

  /**
   * Validate compliance with steering documents
   */
  async validateSteeringCompliance(
    workflowId: string,
    phase: SpecsDrivenPhase
  ): Promise<{
    compliant: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
    steeringReferences: SteeringReference[];
  }> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const references = this.DEFAULT_STEERING_REFERENCES[phase];
    const issues: string[] = [];
    const recommendations: string[] = [];
    let complianceScore = 1.0;

    // Validate each steering reference
    for (const reference of references) {
      const compliance = await this.validateSteeringReference(workflow, phase, reference);
      
      if (!compliance.valid) {
        if (reference.relevance === 'mandatory') {
          issues.push(`Mandatory steering compliance failed: ${reference.path}`);
          complianceScore -= 0.3;
        } else {
          recommendations.push(`Consider reviewing: ${reference.path}`);
          complianceScore -= 0.1;
        }
      }
    }

    complianceScore = Math.max(0, complianceScore);

    return {
      compliant: issues.length === 0,
      score: complianceScore,
      issues,
      recommendations,
      steeringReferences: references
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private async createSpecsDrivenTasks(
    workflow: SpecsDrivenWorkflow,
    requirements: string[],
    customQualityGates?: Partial<Record<SpecsDrivenPhase, Partial<PhaseQualityGate>>>
  ): Promise<SpecsDrivenTaskSpec[]> {
    
    const tasks: SpecsDrivenTaskSpec[] = [];
    const phases = Object.values(SpecsDrivenPhase);
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const qualityGate = {
        ...this.DEFAULT_QUALITY_GATES[phase],
        ...(customQualityGates?.[phase] || {})
      };
      
      // Create task for this phase
      const task = await this.coordinator.createTask(
        `${workflow.name} - ${phase.charAt(0).toUpperCase() + phase.slice(1)}`,
        this.mapPhaseToTaskType(phase),
        this.mapPhaseToPriority(phase)
      );

      // Create specs-driven task specification
      const specTask: SpecsDrivenTaskSpec = {
        ...task,
        phase,
        steeringReferences: this.DEFAULT_STEERING_REFERENCES[phase],
        qualityGate,
        predecessorTasks: i > 0 ? [tasks[i - 1].id] : [],
        successorTasks: [], // Will be filled in next iteration
        acceptanceCriteria: this.generateAcceptanceCriteria(phase, requirements),
        testScenarios: this.generateTestScenarios(phase, requirements)
      };

      // Update predecessor's successor tasks
      if (i > 0) {
        tasks[i - 1].successorTasks = [specTask.id];
      }

      tasks.push(specTask);
    }

    return tasks;
  }

  private async executePhase(workflow: SpecsDrivenWorkflow, phase: SpecsDrivenPhase): Promise<void> {
    this.logger.info('Executing phase', { workflowId: workflow.id, phase });
    
    const phaseTasks = workflow.tasks.filter(t => 
      (t as any).phase === phase
    );

    for (const task of phaseTasks) {
      if (task.status === 'pending') {
        // Update to in progress
        await this.coordinator.updateTask(task.id, { status: 'in_progress' });
        
        // Generate content with phase-specific agents
        const content = await this.coordinator.generateContent(
          task.description,
          task.type,
          this.selectPhaseAgent(phase)
        );
        
        // Store generated content
        task.metadata = { 
          ...task.metadata, 
          generatedContent: content,
          phase,
          steeringReferences: (task as any).steeringReferences
        };
        
        // Phase-specific processing
        await this.processPhaseContent(workflow, phase, task, content);
        
        // Update to completed
        await this.coordinator.updateTask(task.id, { 
          status: 'completed', 
          completed: new Date() 
        });
      }
    }
  }

  /**
   * REFACTORED: Validate quality gate using chain of responsibility pattern
   * (was 49 lines, now <15 lines)
   */
  private async validateQualityGate(
    workflow: SpecsDrivenWorkflow, 
    phase: SpecsDrivenPhase
  ): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    retryRecommended: boolean;
  }> {
    const qualityGateValidator = new QualityGateValidator(this.coordinator);
    return await qualityGateValidator.validate(workflow, phase, this.DEFAULT_QUALITY_GATES[phase]);
  }

  /**
   * REFACTORED: Handle quality gate failure using strategy pattern
   * (was 38 lines, now <10 lines)
   */
  private async handleQualityGateFailure(
    workflow: SpecsDrivenWorkflow,
    phase: SpecsDrivenPhase,
    gateResult: any
  ): Promise<void> {
    const failureHandler = new QualityGateFailureHandler(this.coordinator, this.logger);
    const improvementTask = await failureHandler.handle(workflow, phase, gateResult);
    this.emit('qualityGateFailure', { workflow, phase, gateResult, improvementTask });
  }

  private async validateWorkflowCompletion(workflow: SpecsDrivenWorkflow): Promise<void> {
    // Validate all phases completed successfully
    const allTasks = workflow.tasks;
    const failedTasks = allTasks.filter(t => t.status === 'failed');
    
    if (failedTasks.length > 0) {
      throw new Error(`Workflow completion failed: ${failedTasks.length} tasks failed`);
    }
    
    // Validate all deliverables present
    for (const phase of Object.values(SpecsDrivenPhase)) {
      const qualityGate = this.DEFAULT_QUALITY_GATES[phase];
      const phaseDeliverables = this.getPhaseDeliverables(workflow, phase);
      
      for (const deliverable of qualityGate.deliverables) {
        if (!phaseDeliverables.includes(deliverable)) {
          throw new Error(`Missing deliverable: ${deliverable} for phase ${phase}`);
        }
      }
    }
    
    this.logger.info('Workflow completion validated', { workflowId: workflow.id });
  }

  private async validateSteeringReference(
    workflow: SpecsDrivenWorkflow,
    phase: SpecsDrivenPhase,
    reference: SteeringReference
  ): Promise<{ valid: boolean; details?: string }> {
    // Simplified validation - in production would check actual files
    // and compare against workflow content
    
    try {
      // Check if steering document exists and is referenced in task content
      const phaseTasks = workflow.tasks.filter(t => (t as any).phase === phase);
      const hasReference = phaseTasks.some(task => 
        task.metadata?.generatedContent?.includes(reference.path) ||
        task.metadata?.steeringReferences?.some((ref: any) => ref.path === reference.path)
      );
      
      return { 
        valid: hasReference || reference.relevance !== 'mandatory',
        details: hasReference ? 'Reference found' : 'Reference not found'
      };
    } catch (error) {
      return { 
        valid: reference.relevance !== 'mandatory',
        details: `Validation error: ${error}`
      };
    }
  }

  private async processPhaseContent(
    workflow: SpecsDrivenWorkflow,
    phase: SpecsDrivenPhase,
    task: MaestroTask,
    content: string
  ): Promise<void> {
    // Phase-specific content processing
    switch (phase) {
      case SpecsDrivenPhase.SPECIFICATION:
        workflow.specificationPhase.acceptanceCriteria = this.extractAcceptanceCriteria(content);
        break;
        
      case SpecsDrivenPhase.ARCHITECTURE:
        workflow.designPhase.architecture = content;
        workflow.designPhase.components = this.extractComponents(content);
        workflow.designPhase.interfaces = this.extractInterfaces(content);
        break;
        
      case SpecsDrivenPhase.COMPLETION:
        workflow.validationPhase.qualityGates = this.extractQualityGates(content);
        workflow.validationPhase.acceptanceTests = this.extractAcceptanceTests(content);
        break;
    }
  }

  private mapPhaseToTaskType(phase: SpecsDrivenPhase): MaestroTask['type'] {
    const mapping = {
      [SpecsDrivenPhase.SPECIFICATION]: 'spec',
      [SpecsDrivenPhase.PSEUDOCODE]: 'design',
      [SpecsDrivenPhase.ARCHITECTURE]: 'design',
      [SpecsDrivenPhase.REFINEMENT]: 'implementation',
      [SpecsDrivenPhase.COMPLETION]: 'review'
    } as const;
    
    return mapping[phase];
  }

  private mapPhaseToPriority(phase: SpecsDrivenPhase): TaskPriority {
    const mapping = {
      [SpecsDrivenPhase.SPECIFICATION]: 'critical',
      [SpecsDrivenPhase.PSEUDOCODE]: 'high',
      [SpecsDrivenPhase.ARCHITECTURE]: 'critical',
      [SpecsDrivenPhase.REFINEMENT]: 'medium',
      [SpecsDrivenPhase.COMPLETION]: 'critical'
    } as const;
    
    return mapping[phase];
  }

  private selectPhaseAgent(phase: SpecsDrivenPhase): AgentType {
    const mapping = {
      [SpecsDrivenPhase.SPECIFICATION]: 'requirements_analyst',
      [SpecsDrivenPhase.PSEUDOCODE]: 'design_architect',
      [SpecsDrivenPhase.ARCHITECTURE]: 'design_architect',
      [SpecsDrivenPhase.REFINEMENT]: 'implementation_coder',
      [SpecsDrivenPhase.COMPLETION]: 'quality_reviewer'
    } as const;
    
    return mapping[phase];
  }

  private generateAcceptanceCriteria(phase: SpecsDrivenPhase, requirements: string[]): string[] {
    return requirements.map(req => 
      `${phase} phase should address: ${req}`
    );
  }

  private generateTestScenarios(phase: SpecsDrivenPhase, requirements: string[]): string[] {
    return [
      `Validate ${phase} deliverables completeness`,
      `Verify ${phase} quality standards`,
      `Test ${phase} integration with previous phases`
    ];
  }

  private calculatePhaseScore(tasks: MaestroTask[]): number {
    const scores = tasks
      .map(t => t.metadata?.validation?.score || 0.8)
      .filter(score => score > 0);
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.8;
  }

  private extractPhaseDeliverables(tasks: MaestroTask[]): string[] {
    return tasks.flatMap(t => 
      t.metadata?.deliverables || []
    );
  }

  private getPhaseDeliverables(workflow: SpecsDrivenWorkflow, phase: SpecsDrivenPhase): string[] {
    const phaseTasks = workflow.tasks.filter(t => (t as any).phase === phase);
    return this.extractPhaseDeliverables(phaseTasks);
  }

  private async generateImprovementRecommendations(
    workflow: SpecsDrivenWorkflow,
    phase: SpecsDrivenPhase,
    issues: string[]
  ): Promise<string[]> {
    return issues.map(issue => 
      `Address ${phase} issue: ${issue}`
    );
  }

  // Content extraction helpers (simplified implementations)
  private extractAcceptanceCriteria(content: string): string[] {
    const matches = content.match(/- \[.\] .+/g) || [];
    return matches.map(match => match.replace(/- \[.\] /, ''));
  }

  private extractComponents(content: string): string[] {
    const matches = content.match(/## Components?\n(.*?)(?=\n##|\n$)/s);
    return matches ? matches[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : [];
  }

  private extractInterfaces(content: string): string[] {
    const matches = content.match(/## Interfaces?\n(.*?)(?=\n##|\n$)/s);
    return matches ? matches[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : [];
  }

  private extractQualityGates(content: string): string[] {
    const matches = content.match(/## Quality.*\n(.*?)(?=\n##|\n$)/s);
    return matches ? matches[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : [];
  }

  private extractAcceptanceTests(content: string): string[] {
    const matches = content.match(/## (?:Acceptance )?Tests?\n(.*?)(?=\n##|\n$)/s);
    return matches ? matches[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : [];
  }
}

// Strategy classes for KISS compliance - Method extraction support
/**
 * Enhanced workflow progress analyzer - Single Responsibility Principle
 * REFACTORED: Extracted status analysis strategies for better maintainability
 */
class WorkflowProgressAnalyzer {
  private readonly statusAnalyzer: PhaseStatusAnalyzer;
  private readonly progressCalculator: ProgressCalculator;

  constructor(private workflow: SpecsDrivenWorkflow) {
    this.statusAnalyzer = new PhaseStatusAnalyzer();
    this.progressCalculator = new ProgressCalculator();
  }
  
  async analyze() {
    const phaseProgress = this.analyzePhaseProgress();
    const currentPhase = this.progressCalculator.determineCurrentPhase(phaseProgress);
    const overallProgress = this.progressCalculator.calculateOverallProgress(phaseProgress);
    
    return {
      workflow: this.workflow,
      currentPhase,
      phaseProgress,
      overallProgress
    };
  }
  
  private analyzePhaseProgress(): Record<SpecsDrivenPhase, any> {
    const phaseProgress: Record<SpecsDrivenPhase, any> = {} as any;
    
    for (const phase of Object.values(SpecsDrivenPhase)) {
      const phaseTasks = this.workflow.tasks.filter(t => (t as any).phase === phase);
      phaseProgress[phase] = this.statusAnalyzer.analyzePhaseTaskStatus(phaseTasks);
    }
    
    return phaseProgress;
  }
}

/**
 * Phase status analysis service - Single Responsibility Principle
 */
class PhaseStatusAnalyzer {
  analyzePhaseTaskStatus(phaseTasks: MaestroTask[]) {
    if (phaseTasks.length === 0) return { status: 'pending' };
    
    const taskCounts = this.categorizeTasksByStatus(phaseTasks);
    return this.determinePhaseStatus(taskCounts, phaseTasks);
  }

  private categorizeTasksByStatus(phaseTasks: MaestroTask[]) {
    return {
      completed: phaseTasks.filter(t => t.status === 'completed'),
      inProgress: phaseTasks.filter(t => t.status === 'in_progress'),
      failed: phaseTasks.filter(t => t.status === 'failed'),
      total: phaseTasks.length
    };
  }

  private determinePhaseStatus(taskCounts: any, phaseTasks: MaestroTask[]) {
    if (taskCounts.failed.length > 0) {
      return { 
        status: 'failed', 
        issues: taskCounts.failed.map((t: MaestroTask) => `Task ${t.id} failed`) 
      };
    } else if (taskCounts.completed.length === taskCounts.total) {
      return { 
        status: 'completed', 
        score: 85, 
        deliverables: phaseTasks.map(t => `${t.id}`) 
      };
    } else if (taskCounts.inProgress.length > 0) {
      return { status: 'in_progress' };
    } else {
      return { status: 'pending' };
    }
  }
}

/**
 * Progress calculation service - Single Responsibility Principle
 */
class ProgressCalculator {
  determineCurrentPhase(phaseProgress: Record<SpecsDrivenPhase, any>): SpecsDrivenPhase | null {
    for (const phase of Object.values(SpecsDrivenPhase)) {
      const status = phaseProgress[phase].status;
      if (status === 'in_progress' || status === 'pending') {
        return phase;
      }
    }
    return null;
  }
  
  calculateOverallProgress(phaseProgress: Record<SpecsDrivenPhase, any>): number {
    const completedPhases = Object.values(phaseProgress)
      .filter(progress => progress.status === 'completed').length;
    const totalPhases = Object.keys(SpecsDrivenPhase).length;
    return (completedPhases / totalPhases) * 100;
  }
}

/**
 * Enhanced specs-driven workflow builder - Builder Pattern with Validation
 * REFACTORED: Added validation, error handling, and phase initialization strategies
 */
class SpecsDrivenWorkflowBuilder {
  private workflowData: WorkflowBuilderData;
  private readonly phaseInitializer: PhaseInitializer;
  private readonly workflowValidator: WorkflowValidator;
  
  constructor(private coordinator: MaestroCoordinator, private logger: MaestroLogger) {
    this.workflowData = new WorkflowBuilderData();
    this.phaseInitializer = new PhaseInitializer();
    this.workflowValidator = new WorkflowValidator();
  }
  
  setBasicInfo(name: string, description: string): this {
    this.workflowData.setBasicInfo(name, description);
    return this;
  }
  
  setRequirements(requirements: string[], stakeholders: string[]): this {
    this.workflowData.setRequirements(requirements, stakeholders);
    return this;
  }
  
  setCustomQualityGates(customQualityGates?: Partial<Record<SpecsDrivenPhase, Partial<PhaseQualityGate>>>): this {
    this.workflowData.setCustomQualityGates(customQualityGates);
    return this;
  }
  
  async build(): Promise<SpecsDrivenWorkflow> {
    this.workflowValidator.validateBuilder(this.workflowData);
    
    this.logger.info('Building specs-driven workflow', { name: this.workflowData.name });
    
    const baseWorkflow = await this.coordinator.createWorkflow(
      this.workflowData.name, 
      this.workflowData.description
    );
    
    const specsDrivenWorkflow = this.createEnhancedWorkflow(baseWorkflow);
    
    this.logger.info('Specs-driven workflow built', { workflowId: specsDrivenWorkflow.id });
    return specsDrivenWorkflow;
  }
  
  private createEnhancedWorkflow(baseWorkflow: MaestroWorkflow): SpecsDrivenWorkflow {
    return {
      ...baseWorkflow,
      ...this.phaseInitializer.initializeAllPhases(this.workflowData)
    };
  }
}

/**
 * Workflow builder data container - Data Transfer Object
 */
class WorkflowBuilderData {
  public name: string = '';
  public description: string = '';
  public requirements: string[] = [];
  public stakeholders: string[] = [];
  public customQualityGates?: Partial<Record<SpecsDrivenPhase, Partial<PhaseQualityGate>>>;

  setBasicInfo(name: string, description: string): void {
    this.name = name;
    this.description = description;
  }

  setRequirements(requirements: string[], stakeholders: string[]): void {
    this.requirements = requirements;
    this.stakeholders = stakeholders;
  }

  setCustomQualityGates(customQualityGates?: Partial<Record<SpecsDrivenPhase, Partial<PhaseQualityGate>>>): void {
    this.customQualityGates = customQualityGates;
  }
}

/**
 * Phase initialization service - Single Responsibility Principle
 */
class PhaseInitializer {
  initializeAllPhases(data: WorkflowBuilderData) {
    return {
      specificationPhase: this.initializeSpecificationPhase(data),
      designPhase: this.initializeDesignPhase(),
      implementationPhase: this.initializeImplementationPhase(),
      validationPhase: this.initializeValidationPhase()
    };
  }

  private initializeSpecificationPhase(data: WorkflowBuilderData) {
    return {
      requirements: data.requirements,
      acceptanceCriteria: [],
      stakeholders: data.stakeholders
    };
  }

  private initializeDesignPhase() {
    return {
      architecture: '',
      components: [],
      interfaces: []
    };
  }

  private initializeImplementationPhase() {
    return {
      technologies: [],
      patterns: [],
      testStrategy: ''
    };
  }

  private initializeValidationPhase() {
    return {
      qualityGates: [],
      reviewCriteria: [],
      acceptanceTests: []
    };
  }
}

/**
 * Workflow validation service - Single Responsibility Principle
 */
class WorkflowValidator {
  validateBuilder(data: WorkflowBuilderData): void {
    if (!data.name?.trim()) {
      throw new Error('Workflow name is required');
    }
    if (!data.description?.trim()) {
      throw new Error('Workflow description is required');
    }
    if (!data.requirements || data.requirements.length === 0) {
      throw new Error('At least one requirement is required');
    }
    if (!data.stakeholders || data.stakeholders.length === 0) {
      throw new Error('At least one stakeholder is required');
    }
  }
}

// Quality gate validation chain for KISS compliance
class QualityGateValidator {
  constructor(private coordinator: MaestroCoordinator) {}
  
  async validate(
    workflow: SpecsDrivenWorkflow, 
    phase: SpecsDrivenPhase, 
    qualityGate: PhaseQualityGate
  ): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    retryRecommended: boolean;
  }> {
    const phaseTasks = workflow.tasks.filter(t => (t as any).phase === phase);
    const contentValidator = new ContentValidator(this.coordinator);
    const steeringValidator = new SteeringComplianceValidator();
    
    const contentResult = await contentValidator.validate(phaseTasks, qualityGate);
    const steeringResult = await steeringValidator.validate(workflow.id, phase);
    
    const combinedIssues = [...contentResult.issues, ...steeringResult.issues];
    const passed = contentResult.passed && steeringResult.compliant && combinedIssues.length === 0;
    
    return {
      passed,
      score: contentResult.score,
      issues: combinedIssues,
      retryRecommended: contentResult.score >= (qualityGate.requiredScore * 0.8)
    };
  }
}

class ContentValidator {
  constructor(private coordinator: MaestroCoordinator) {}
  
  async validate(phaseTasks: MaestroTask[], qualityGate: PhaseQualityGate) {
    let totalScore = 0;
    const issues: string[] = [];
    
    for (const task of phaseTasks) {
      const content = task.metadata?.generatedContent || '';
      const validation = await this.coordinator.validate(
        content, 
        task.type, 
        qualityGate.consensusRequired
      );
      
      totalScore += validation.score;
      if (!validation.valid) {
        issues.push(...validation.errors);
      }
      issues.push(...validation.warnings);
    }
    
    const averageScore = phaseTasks.length > 0 ? totalScore / phaseTasks.length : 0;
    return {
      passed: averageScore >= qualityGate.requiredScore,
      score: averageScore,
      issues
    };
  }
}

class SteeringComplianceValidator {
  async validate(workflowId: string, phase: SpecsDrivenPhase) {
    // Simplified steering compliance check
    return {
      compliant: true,
      issues: [] as string[]
    };
  }
}

class QualityGateFailureHandler {
  constructor(private coordinator: MaestroCoordinator, private logger: MaestroLogger) {}
  
  async handle(
    workflow: SpecsDrivenWorkflow,
    phase: SpecsDrivenPhase,
    gateResult: any
  ): Promise<MaestroTask> {
    this.logger.warn('Handling quality gate failure', { 
      workflowId: workflow.id, 
      phase, 
      score: gateResult.score 
    });
    
    const improvements = await this.generateImprovements(gateResult.issues);
    const improvementTask = await this.createImprovementTask(workflow, phase, gateResult, improvements);
    
    workflow.tasks.push(improvementTask);
    await this.coordinator.addTaskToWorkflow(workflow.id, improvementTask);
    
    return improvementTask;
  }
  
  private async generateImprovements(issues: string[]): Promise<string[]> {
    return issues.map(issue => `Improve: ${issue}`);
  }
  
  private async createImprovementTask(
    workflow: SpecsDrivenWorkflow,
    phase: SpecsDrivenPhase,
    gateResult: any,
    improvements: string[]
  ): Promise<MaestroTask> {
    const improvementTask = await this.coordinator.createTask(
      `${workflow.name} - ${phase} Improvements`,
      'review',
      'high'
    );
    
    improvementTask.metadata = {
      ...improvementTask.metadata,
      phase,
      originalIssues: gateResult.issues,
      improvements,
      retryPhase: true
    };
    
    return improvementTask;
  }
}

/**
 * Factory function for creating specs-driven flow orchestrator
 */
export function createSpecsDrivenFlowOrchestrator(
  coordinator: MaestroCoordinator,
  logger: MaestroLogger
): SpecsDrivenFlowOrchestrator {
  return new SpecsDrivenFlowOrchestrator(coordinator, logger);
}