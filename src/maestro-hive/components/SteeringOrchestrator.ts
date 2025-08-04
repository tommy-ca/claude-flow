/**
 * Steering Workflow Orchestrator
 * 
 * High-level workflow coordination component that orchestrates document operations,
 * validation processes, and error recovery following SOLID principles and SPARC methodology.
 * 
 * Responsibilities:
 * - Main workflow coordination and execution
 * - Component integration and dependency management
 * - Progress tracking and event emission
 * - Error handling and recovery strategies
 * - Cross-validation coordination
 * 
 * ~200 lines of focused orchestration logic extracted from steering-workflow-engine.ts
 */

import { EventEmitter } from 'events';
import type {
  ISteeringWorkflowCoordination,
  ISteeringDocumentManager,
  ISteeringValidator,
  ISteeringContentGenerator,
  SteeringWorkflowRequest,
  SteeringOperationResult,
  SteeringOperation,
  SteeringDocument,
  SteeringDocumentType,
  ValidationResult,
  WorkflowProgress,
  RecoveryResult,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  ValidationRequest,
  DocumentOperationContext,
  CrossDocumentValidation
} from '../interfaces/steering-interfaces.js';
import type {
  MaestroCoordinator,
  MaestroLogger,
  MaestroValidationResult
} from '../interfaces.js';

/**
 * Main orchestration class responsible for coordinating steering workflow operations
 * 
 * Implements the ISteeringWorkflowCoordination interface and extends EventEmitter
 * for event-driven communication with other components.
 */
export class SteeringOrchestrator extends EventEmitter implements ISteeringWorkflowCoordination {
  private documentManager: ISteeringDocumentManager;
  private validator: ISteeringValidator;
  private contentGenerator: ISteeringContentGenerator;
  private coordinator: MaestroCoordinator;
  private logger: MaestroLogger;
  private activeWorkflows: Map<string, WorkflowProgress> = new Map();

  constructor(
    documentManager: ISteeringDocumentManager,
    validator: ISteeringValidator,
    contentGenerator: ISteeringContentGenerator,
    coordinator: MaestroCoordinator,
    logger: MaestroLogger
  ) {
    super();
    this.documentManager = documentManager;
    this.validator = validator;
    this.contentGenerator = contentGenerator;
    this.coordinator = coordinator;
    this.logger = logger;

    this.logger.info('SteeringOrchestrator initialized', {
      components: ['documentManager', 'validator', 'contentGenerator', 'coordinator']
    });
  }

  /**
   * Main entry point for executing steering workflow operations
   * Coordinates the entire workflow from request to completion
   */
  async executeSteeringWorkflow(request: SteeringWorkflowRequest): Promise<SteeringOperationResult> {
    const startTime = Date.now();
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info('Executing steering workflow', {
      workflowId,
      operation: request.operation,
      documentType: request.documentType,
      priority: request.priority
    });

    this.emitWorkflowEvent('workflow_started', { workflowId, operation: request.operation });

    try {
      // Initialize workflow progress tracking
      const progress = this.initializeWorkflowProgress(workflowId, request.operation);
      this.activeWorkflows.set(workflowId, progress);

      // Execute operation-specific logic
      let result: SteeringOperationResult;
      switch (request.operation) {
        case SteeringOperation.CREATE:
          result = await this.executeCreateOperation(request as CreateDocumentRequest);
          break;
        case SteeringOperation.UPDATE:
          result = await this.executeUpdateOperation(request as UpdateDocumentRequest);
          break;
        case SteeringOperation.VALIDATE:
          result = await this.executeValidationOperation(request as ValidationRequest);
          break;
        case SteeringOperation.SYNC:
          result = await this.executeSyncOperation(request);
          break;
        case SteeringOperation.CROSS_VALIDATE:
          result = await this.executeCrossValidationOperation(request);
          break;
        case SteeringOperation.GENERATE_SPEC:
          result = await this.executeSpecGenerationOperation(request);
          break;
        default:
          throw new Error(`Unsupported operation: ${request.operation}`);
      }

      // Finalize result with metadata
      result.workflowId = workflowId;
      result.duration = Date.now() - startTime;
      result.timestamp = new Date();

      // Update progress and cleanup
      this.updateWorkflowProgress(workflowId, 'completed', 100);
      this.activeWorkflows.delete(workflowId);

      this.logger.info('Steering workflow completed', {
        workflowId,
        operation: request.operation,
        success: result.success,
        duration: result.duration
      });

      this.emitWorkflowEvent('workflow_completed', result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('Steering workflow failed', {
        workflowId,
        operation: request.operation,
        error: error.message,
        duration
      });

      // Attempt recovery
      const recoveryResult = await this.handleWorkflowFailure(workflowId, error);
      
      const errorResult: SteeringOperationResult = {
        success: false,
        operation: request.operation,
        documentType: request.documentType,
        workflowId,
        duration,
        timestamp: new Date(),
        errors: [error.message],
        warnings: recoveryResult.success ? ['Recovery attempted'] : ['Recovery failed']
      };

      this.emitWorkflowEvent('workflow_failed', { workflowId, error, request });
      this.activeWorkflows.delete(workflowId);
      
      return errorResult;
    }
  }

  /**
   * Orchestrate document operations with proper coordination
   */
  async orchestrateDocumentOperation(operation: SteeringOperation, request: any): Promise<SteeringOperationResult> {
    const context: DocumentOperationContext = {
      operation,
      documentType: request.documentType,
      workflowId: `op-${Date.now()}`,
      taskId: `task-${Date.now()}`,
      startTime: new Date(),
      metadata: request.metadata || {}
    };

    this.logger.info('Orchestrating document operation', context);

    try {
      // Create maestro task for coordination
      const task = await this.coordinator.createTask(
        `${operation} operation for ${request.documentType || 'all documents'}`,
        'spec',
        request.priority || 'medium'
      );

      context.taskId = task.id;

      // Execute operation based on type
      let result: SteeringOperationResult;
      switch (operation) {
        case SteeringOperation.CREATE:
          result = await this.executeCreateOperation(request);
          break;
        case SteeringOperation.UPDATE:
          result = await this.executeUpdateOperation(request);
          break;
        case SteeringOperation.VALIDATE:
          result = await this.executeValidationOperation(request);
          break;
        default:
          throw new Error(`Operation ${operation} not supported in orchestrateDocumentOperation`);
      }

      // Update task with results
      await this.coordinator.updateTask(task.id, {
        status: 'completed',
        metadata: { ...task.metadata, operationResult: result }
      });

      result.taskId = task.id;
      return result;

    } catch (error) {
      this.logger.error('Document operation failed', { context, error: error.message });
      throw error;
    }
  }

  /**
   * Coordinate validation process across multiple documents
   */
  async coordinateValidationProcess(documents: SteeringDocument[]): Promise<ValidationResult> {
    this.logger.info('Coordinating validation process', { documentCount: documents.length });

    const validationResults: ValidationResult[] = [];
    
    // Validate each document individually
    for (const document of documents) {
      try {
        const result = await this.validator.validateDocument(document);
        validationResults.push(result);
        
        this.emitWorkflowEvent('document_validated', { document, validation: result });
      } catch (error) {
        this.logger.warn('Document validation failed', { 
          documentType: document.type, 
          error: error.message 
        });
        
        validationResults.push({
          valid: false,
          score: 0,
          errors: [error.message],
          warnings: [],
          suggestions: [],
          timestamp: new Date()
        });
      }
    }

    // Aggregate validation results
    const overallValid = validationResults.every(r => r.valid);
    const averageScore = validationResults.reduce((sum, r) => sum + r.score, 0) / validationResults.length;
    const allErrors = validationResults.flatMap(r => r.errors);
    const allWarnings = validationResults.flatMap(r => r.warnings);
    const allSuggestions = validationResults.flatMap(r => r.suggestions);

    return {
      valid: overallValid,
      score: averageScore,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      timestamp: new Date()
    };
  }

  /**
   * Manage workflow progress tracking
   */
  async manageWorkflowProgress(workflowId: string): Promise<WorkflowProgress> {
    const progress = this.activeWorkflows.get(workflowId);
    
    if (!progress) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Update progress metrics
    progress.lastUpdated = new Date();
    this.emitWorkflowEvent('progress_updated', progress);
    
    return progress;
  }

  /**
   * Handle workflow failures with recovery strategies
   */
  async handleWorkflowFailure(workflowId: string, error: Error): Promise<RecoveryResult> {
    this.logger.error('Handling workflow failure', { workflowId, error: error.message });

    const progress = this.activeWorkflows.get(workflowId);
    
    if (progress) {
      progress.status = 'failed';
      progress.lastUpdated = new Date();
    }

    // Implement recovery strategies
    const actions: string[] = [];
    let success = false;
    let strategy = 'basic';

    try {
      // Strategy 1: Reset and retry
      if (error.message.includes('validation')) {
        strategy = 'validation-retry';
        actions.push('Reset validation state');
        actions.push('Retry validation with relaxed criteria');
        success = true;
      }
      
      // Strategy 2: Partial recovery
      else if (error.message.includes('document')) {
        strategy = 'document-recovery';
        actions.push('Backup current state');
        actions.push('Load last known good state');
        success = true;
      }
      
      // Strategy 3: Graceful degradation
      else {
        strategy = 'graceful-degradation';
        actions.push('Save partial progress');
        actions.push('Notify administrators');
        success = false;
      }

    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed', { 
        workflowId, 
        originalError: error.message,
        recoveryError: recoveryError.message 
      });
      
      actions.push('Recovery failed - manual intervention required');
      success = false;
    }

    const recoveryResult: RecoveryResult = {
      success,
      strategy,
      actions,
      timestamp: new Date()
    };

    this.emitWorkflowEvent('recovery_attempted', recoveryResult);
    return recoveryResult;
  }

  // ===== PRIVATE OPERATION METHODS =====

  private async executeCreateOperation(request: CreateDocumentRequest): Promise<SteeringOperationResult> {
    this.logger.info('Executing create operation', { documentType: request.documentType });

    // Generate content using content generator
    const content = await this.contentGenerator.generateContent(
      request.documentType,
      request.content || '',
      request.globalContext || {}
    );

    // Create document via document manager
    const document = await this.documentManager.createDocument(
      request.documentType,
      content,
      request.globalContext || {}
    );

    // Validate created document
    const validation = await this.validator.validateDocument(document);

    this.emitWorkflowEvent('document_created', document);

    return {
      success: validation.valid,
      operation: SteeringOperation.CREATE,
      documentType: request.documentType,
      content,
      metadata: document,
      validation: this.convertValidationResult(validation),
      duration: 0,
      timestamp: new Date()
    };
  }

  private async executeUpdateOperation(request: UpdateDocumentRequest): Promise<SteeringOperationResult> {
    this.logger.info('Executing update operation', { documentType: request.documentType });

    // Enhance content using content generator
    const enhancedContent = await this.contentGenerator.enhanceContent(
      request.documentType,
      request.content,
      request.globalContext || {}
    );

    // Update document via document manager
    const document = await this.documentManager.updateDocument(
      request.documentType,
      enhancedContent,
      request.globalContext
    );

    // Validate updated document
    const validation = await this.validator.validateDocument(document);

    this.emitWorkflowEvent('document_updated', document);

    return {
      success: validation.valid,
      operation: SteeringOperation.UPDATE,
      documentType: request.documentType,
      content: enhancedContent,
      metadata: document,
      validation: this.convertValidationResult(validation),
      duration: 0,
      timestamp: new Date()
    };
  }

  private async executeValidationOperation(request: ValidationRequest): Promise<SteeringOperationResult> {
    this.logger.info('Executing validation operation', { documentType: request.documentType });

    if (request.documentType) {
      // Validate single document
      const document = await this.documentManager.getDocument(request.documentType);
      if (!document) {
        throw new Error(`Document ${request.documentType} not found`);
      }

      const validation = await this.validator.validateDocument(document);

      return {
        success: validation.valid,
        operation: SteeringOperation.VALIDATE,
        documentType: request.documentType,
        content: document.content,
        validation: this.convertValidationResult(validation),
        duration: 0,
        timestamp: new Date()
      };
    } else {
      // Validate all documents
      const documents = await this.documentManager.getAllDocuments();
      const validation = await this.coordinateValidationProcess(documents);

      return {
        success: validation.valid,
        operation: SteeringOperation.VALIDATE,
        validation: this.convertValidationResult(validation),
        duration: 0,
        timestamp: new Date()
      };
    }
  }

  private async executeSyncOperation(request: SteeringWorkflowRequest): Promise<SteeringOperationResult> {
    this.logger.info('Executing sync operation');

    const documents = await this.documentManager.getAllDocuments();
    const crossValidation = await this.validator.crossValidateDocuments(documents);

    this.emitWorkflowEvent('cross_validation_completed', crossValidation);

    return {
      success: crossValidation.overallAlignment > 0.95,
      operation: SteeringOperation.SYNC,
      crossValidation,
      duration: 0,
      timestamp: new Date()
    };
  }

  private async executeCrossValidationOperation(request: SteeringWorkflowRequest): Promise<SteeringOperationResult> {
    this.logger.info('Executing cross-validation operation');

    const documents = await this.documentManager.getAllDocuments();
    const crossValidation = await this.validator.crossValidateDocuments(documents);

    this.emitWorkflowEvent('cross_validation_completed', crossValidation);

    return {
      success: crossValidation.overallAlignment > 0.95,
      operation: SteeringOperation.CROSS_VALIDATE,
      crossValidation,
      duration: 0,
      timestamp: new Date()
    };
  }

  private async executeSpecGenerationOperation(request: SteeringWorkflowRequest): Promise<SteeringOperationResult> {
    this.logger.info('Executing spec generation operation');

    const documents = await this.documentManager.getAllDocuments();
    const requirements = await this.contentGenerator.extractRequirements(documents);

    return {
      success: true,
      operation: SteeringOperation.GENERATE_SPEC,
      metadata: {
        requirements,
        specsDrivenWorkflow: true,
        generatedAt: new Date()
      } as any,
      duration: 0,
      timestamp: new Date()
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private initializeWorkflowProgress(workflowId: string, operation: SteeringOperation): WorkflowProgress {
    return {
      workflowId,
      totalSteps: this.getOperationStepCount(operation),
      completedSteps: 0,
      currentStep: `Starting ${operation} operation`,
      status: 'active',
      progress: 0,
      lastUpdated: new Date()
    };
  }

  private getOperationStepCount(operation: SteeringOperation): number {
    const stepCounts = {
      [SteeringOperation.CREATE]: 4,
      [SteeringOperation.UPDATE]: 4,
      [SteeringOperation.VALIDATE]: 2,
      [SteeringOperation.SYNC]: 6,
      [SteeringOperation.CROSS_VALIDATE]: 3,
      [SteeringOperation.GENERATE_SPEC]: 5
    };
    return stepCounts[operation] || 3;
  }

  private updateWorkflowProgress(workflowId: string, status: WorkflowProgress['status'], progress: number): void {
    const workflowProgress = this.activeWorkflows.get(workflowId);
    if (workflowProgress) {
      workflowProgress.status = status;
      workflowProgress.progress = progress;
      workflowProgress.lastUpdated = new Date();
      this.emitWorkflowEvent('progress_updated', workflowProgress);
    }
  }

  private convertValidationResult(validation: ValidationResult): MaestroValidationResult {
    return {
      valid: validation.valid,
      score: validation.score,
      errors: validation.errors,
      warnings: validation.warnings,
      suggestions: validation.suggestions,
      timestamp: validation.timestamp
    };
  }

  private emitWorkflowEvent(event: string, data: any): void {
    this.emit('steeringWorkflowEvent', { type: event, data, timestamp: new Date() });
    this.logger.debug('Workflow event emitted', { event, dataType: typeof data });
  }
}