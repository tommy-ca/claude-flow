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
   */
  async createSpecsDrivenWorkflow(
    name: string,
    description: string,
    requirements: string[],
    stakeholders: string[],
    customQualityGates?: Partial<Record<SpecsDrivenPhase, Partial<PhaseQualityGate>>>
  ): Promise<SpecsDrivenWorkflow> {
    
    this.logger.info('Creating specs-driven workflow', { name, phases: Object.keys(SpecsDrivenPhase) });
    
    // Create base workflow
    const baseWorkflow = await this.coordinator.createWorkflow(name, description);
    
    // Create specs-driven workflow with enhanced properties
    const specsDrivenWorkflow: SpecsDrivenWorkflow = {
      ...baseWorkflow,
      specificationPhase: {
        requirements,
        acceptanceCriteria: [],
        stakeholders
      },
      designPhase: {
        architecture: '',
        components: [],
        interfaces: []
      },
      implementationPhase: {
        technologies: [],
        patterns: [],
        testStrategy: ''
      },
      validationPhase: {
        qualityGates: [],
        reviewCriteria: [],
        acceptanceTests: []
      }
    };

    // Create tasks for each SPARC phase
    const tasks = await this.createSpecsDrivenTasks(
      specsDrivenWorkflow, 
      requirements,
      customQualityGates
    );

    // Add tasks to workflow with proper dependencies
    for (const task of tasks) {
      specsDrivenWorkflow.tasks.push(task);
      await this.coordinator.addTaskToWorkflow(specsDrivenWorkflow.id, task);
    }

    // Store the enhanced workflow
    this.activeWorkflows.set(specsDrivenWorkflow.id, specsDrivenWorkflow);
    
    this.logger.info('Specs-driven workflow created', { 
      workflowId: specsDrivenWorkflow.id,
      totalTasks: tasks.length 
    });

    this.emit('specsDrivenWorkflowCreated', { workflow: specsDrivenWorkflow });
    
    return specsDrivenWorkflow;
  }

  /**
   * Execute specs-driven workflow with proper phase gating
   */
  async executeSpecsDrivenWorkflow(workflowId: string): Promise<SpecsDrivenWorkflow> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Specs-driven workflow ${workflowId} not found`);
    }

    this.logger.info('Executing specs-driven workflow', { workflowId });

    // Execute phases in SPARC order with quality gates
    for (const phase of Object.values(SpecsDrivenPhase)) {
      await this.executePhase(workflow, phase);
      
      // Quality gate validation
      const gateResult = await this.validateQualityGate(workflow, phase);
      if (!gateResult.passed) {
        this.logger.warn('Quality gate failed', { 
          workflowId, 
          phase, 
          score: gateResult.score,
          issues: gateResult.issues 
        });
        
        // Handle quality gate failure
        await this.handleQualityGateFailure(workflow, phase, gateResult);
        
        // Retry phase if appropriate
        if (gateResult.retryRecommended) {
          await this.executePhase(workflow, phase);
        } else {
          throw new Error(`Quality gate failed for phase ${phase}: ${gateResult.issues.join(', ')}`);
        }
      }
      
      this.logger.info('Phase completed successfully', { 
        workflowId, 
        phase, 
        score: gateResult.score 
      });
      
      this.emit('phaseCompleted', { workflow, phase, gateResult });
    }

    // Final workflow validation
    await this.validateWorkflowCompletion(workflow);
    
    workflow.status = 'completed';
    workflow.updated = new Date();
    
    this.logger.info('Specs-driven workflow completed', { workflowId });
    this.emit('specsDrivenWorkflowCompleted', { workflow });
    
    return workflow;
  }

  /**
   * Get workflow progress with phase-level detail
   */
  async getWorkflowProgress(workflowId: string): Promise<{
    workflow: SpecsDrivenWorkflow;
    currentPhase: SpecsDrivenPhase | null;
    phaseProgress: Record<SpecsDrivenPhase, {
      status: 'pending' | 'in_progress' | 'completed' | 'failed';
      score?: number;
      issues?: string[];
      deliverables?: string[];
    }>;
    overallProgress: number;
  }> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const phaseProgress: Record<SpecsDrivenPhase, any> = {} as any;
    let currentPhase: SpecsDrivenPhase | null = null;
    let completedPhases = 0;
    
    for (const phase of Object.values(SpecsDrivenPhase)) {
      const phaseTasks = workflow.tasks.filter(t => 
        (t as any).phase === phase
      );
      
      if (phaseTasks.length === 0) {
        phaseProgress[phase] = { status: 'pending' };
        continue;
      }
      
      const completedTasks = phaseTasks.filter(t => t.status === 'completed');
      const inProgressTasks = phaseTasks.filter(t => t.status === 'in_progress');
      const failedTasks = phaseTasks.filter(t => t.status === 'failed');
      
      if (failedTasks.length > 0) {
        phaseProgress[phase] = { 
          status: 'failed',
          issues: failedTasks.map(t => `Task ${t.id} failed`)
        };
      } else if (completedTasks.length === phaseTasks.length) {
        phaseProgress[phase] = { 
          status: 'completed',
          score: this.calculatePhaseScore(phaseTasks),
          deliverables: this.extractPhaseDeliverables(phaseTasks)
        };
        completedPhases++;
      } else if (inProgressTasks.length > 0) {
        phaseProgress[phase] = { status: 'in_progress' };
        if (!currentPhase) currentPhase = phase;
      } else {
        phaseProgress[phase] = { status: 'pending' };
        if (!currentPhase) currentPhase = phase;
      }
    }
    
    const overallProgress = (completedPhases / Object.keys(SpecsDrivenPhase).length) * 100;
    
    return {
      workflow,
      currentPhase,
      phaseProgress,
      overallProgress
    };
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

  private async validateQualityGate(
    workflow: SpecsDrivenWorkflow, 
    phase: SpecsDrivenPhase
  ): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    retryRecommended: boolean;
  }> {
    const qualityGate = this.DEFAULT_QUALITY_GATES[phase];
    const phaseTasks = workflow.tasks.filter(t => (t as any).phase === phase);
    
    let totalScore = 0;
    const issues: string[] = [];
    
    for (const task of phaseTasks) {
      const content = task.metadata?.generatedContent || '';
      
      // Validate content
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
    const passed = averageScore >= qualityGate.requiredScore && issues.length === 0;
    
    // Steering compliance check
    const steeringCompliance = await this.validateSteeringCompliance(workflow.id, phase);
    if (!steeringCompliance.compliant) {
      issues.push(...steeringCompliance.issues);
    }
    
    return {
      passed,
      score: averageScore,
      issues,
      retryRecommended: averageScore >= (qualityGate.requiredScore * 0.8)
    };
  }

  private async handleQualityGateFailure(
    workflow: SpecsDrivenWorkflow,
    phase: SpecsDrivenPhase,
    gateResult: any
  ): Promise<void> {
    this.logger.warn('Handling quality gate failure', { 
      workflowId: workflow.id, 
      phase, 
      score: gateResult.score 
    });
    
    // Generate improvement recommendations
    const improvements = await this.generateImprovementRecommendations(
      workflow, 
      phase, 
      gateResult.issues
    );
    
    // Create improvement task
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
    
    // Add to workflow
    workflow.tasks.push(improvementTask);
    await this.coordinator.addTaskToWorkflow(workflow.id, improvementTask);
    
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

/**
 * Factory function for creating specs-driven flow orchestrator
 */
export function createSpecsDrivenFlowOrchestrator(
  coordinator: MaestroCoordinator,
  logger: MaestroLogger
): SpecsDrivenFlowOrchestrator {
  return new SpecsDrivenFlowOrchestrator(coordinator, logger);
}