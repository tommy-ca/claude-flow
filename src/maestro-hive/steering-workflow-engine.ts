/**
 * Steering Workflow Engine
 * 
 * Implements steering documents workflow operations on top of maestro-hive architecture.
 * Provides specialized coordination for product.md, structure.md, and tech.md documents
 * with Claude Flow swarm intelligence and cross-document validation.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  MaestroCoordinator,
  MaestroTask,
  MaestroWorkflow,
  MaestroValidationResult,
  MaestroHiveConfig,
  MaestroLogger,
  MaestroFileManager
} from './interfaces.js';
import type { TaskPriority } from '../hive-mind/types.js';
import { SpecsDrivenFlowOrchestrator, SpecsDrivenPhase } from './specs-driven-flow.js';
import { 
  SteeringDocumentManager, 
  SteeringDocumentType, 
  CreateDocumentRequest,
  UpdateDocumentRequest,
  SteeringDocumentMeta,
  createSteeringDocumentManager
} from './steering-document-manager.js';
import { 
  SteeringValidator, 
  createSteeringValidator,
  type SteeringDocument,
  type CrossValidationResult,
  type ConsensusResult,
  type ComplianceResult
} from './steering-validator.js';

/**
 * Simple file manager implementation for fallback compatibility
 */
class SimpleFileManager implements MaestroFileManager {
  async writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, 'utf-8');
  }

  async readFile(path: string): Promise<string> {
    return await fs.readFile(path, 'utf-8');
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
  }

  async listFiles(directory: string): Promise<string[]> {
    const files = await fs.readdir(directory);
    return files;
  }

  // Placeholder implementations for workflow methods (not used in document manager)
  async saveWorkflow(workflow: MaestroWorkflow): Promise<void> {
    throw new Error('Method not implemented in SimpleFileManager');
  }

  async loadWorkflow(id: string): Promise<MaestroWorkflow | null> {
    throw new Error('Method not implemented in SimpleFileManager');
  }

  async archiveWorkflow(id: string): Promise<void> {
    throw new Error('Method not implemented in SimpleFileManager');
  }

  async saveTaskArtifact(taskId: string, artifact: any): Promise<void> {
    throw new Error('Method not implemented in SimpleFileManager');
  }

  async getTaskArtifacts(taskId: string): Promise<any[]> {
    throw new Error('Method not implemented in SimpleFileManager');
  }
}

// Re-export types from document manager for backward compatibility
export { 
  SteeringDocumentType, 
  SteeringDocumentMeta,
  CreateDocumentRequest,
  UpdateDocumentRequest 
} from './steering-document-manager.js';

/**
 * Steering workflow operation types
 */
export enum SteeringOperation {
  CREATE = 'create',
  UPDATE = 'update',
  VALIDATE = 'validate',
  SYNC = 'sync',
  CROSS_VALIDATE = 'cross_validate',
  GENERATE_SPEC = 'generate_spec'
}

// CrossDocumentValidation interface moved to steering-validator.ts

/**
 * Steering workflow request
 */
export interface SteeringWorkflowRequest {
  operation: SteeringOperation;
  documentType?: SteeringDocumentType;
  content?: string;
  globalContext?: Record<string, any>;
  requireConsensus?: boolean;
  priority?: TaskPriority;
  metadata?: Record<string, any>;
}

/**
 * Steering workflow result
 */
export interface SteeringWorkflowResult {
  success: boolean;
  operation: SteeringOperation;
  documentType?: SteeringDocumentType;
  content?: string;
  metadata?: SteeringDocumentMeta;
  validation?: MaestroValidationResult;
  crossValidation?: CrossValidationResult;
  taskId?: string;
  workflowId?: string;
  duration: number;
  timestamp: Date;
}

/**
 * Main Steering Workflow Engine
 * 
 * Extends maestro-hive functionality with specialized steering document operations
 */
export class SteeringWorkflowEngine extends EventEmitter {
  private coordinator: MaestroCoordinator;
  private specsDrivenOrchestrator: SpecsDrivenFlowOrchestrator;
  private validator: SteeringValidator;
  private documentManager: SteeringDocumentManager;
  private logger: MaestroLogger;
  private config: MaestroHiveConfig;
  private steeringDir: string;
  private activeWorkflows: Map<string, MaestroWorkflow> = new Map();
  private documentsCache: Map<SteeringDocumentType, SteeringDocumentMeta> = new Map();

  constructor(
    coordinator: MaestroCoordinator,
    specsDrivenOrchestrator: SpecsDrivenFlowOrchestrator,
    logger: MaestroLogger,
    config: MaestroHiveConfig,
    fileManager?: MaestroFileManager
  ) {
    super();
    this.coordinator = coordinator;
    this.specsDrivenOrchestrator = specsDrivenOrchestrator;
    this.validator = createSteeringValidator(coordinator, logger);
    this.logger = logger;
    this.config = config;
    this.steeringDir = join(config.workflowDirectory, '..', 'steering');
    
    // Initialize document manager with dependency injection
    if (fileManager) {
      this.documentManager = createSteeringDocumentManager(fileManager, logger, this.steeringDir);
    } else {
      // Fallback for backward compatibility - create a simple file manager
      const simpleFileManager = new SimpleFileManager();
      this.documentManager = createSteeringDocumentManager(simpleFileManager, logger, this.steeringDir);
    }
    
    this.logger.info('SteeringWorkflowEngine initialized', {
      steeringDir: this.steeringDir,
      specsDriven: config.enableSpecsDriven,
      validatorEnabled: true,
      documentManagerEnabled: true
    });
  }

  /**
   * Execute steering workflow operation with Claude Flow coordination
   * REFACTORED: Pipeline pattern for KISS compliance (was 67 lines, now <15)
   */
  async executeSteeringWorkflow(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    const context = await this.initializeWorkflowContext(request);
    const validatedRequest = await this.validateWorkflowRequest(context);
    const result = await this.executeWorkflowOperation(validatedRequest);
    return await this.finalizeWorkflowResult(result, context.startTime);
  }

  /**
   * Initialize workflow execution context
   */
  private async initializeWorkflowContext(request: SteeringWorkflowRequest) {
    const startTime = Date.now();
    
    this.logger.info('Executing steering workflow', {
      operation: request.operation,
      documentType: request.documentType,
      priority: request.priority
    });

    return { request, startTime };
  }

  /**
   * Validate workflow request parameters
   */
  private async validateWorkflowRequest(context: any) {
    // Basic validation logic here
    return context.request;
  }

  /**
   * Execute the specific workflow operation
   */
  private async executeWorkflowOperation(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    const operationStrategy = this.getOperationStrategy(request.operation);
    return await operationStrategy.execute(request);
  }

  /**
   * Get operation strategy based on request type
   */
  private getOperationStrategy(operation: SteeringOperation) {
    const strategies = {
      [SteeringOperation.CREATE]: { execute: (req: any) => this.createSteeringDocument(req) },
      [SteeringOperation.UPDATE]: { execute: (req: any) => this.updateSteeringDocument(req) },
      [SteeringOperation.VALIDATE]: { execute: (req: any) => this.validateSteeringDocument(req) },
      [SteeringOperation.SYNC]: { execute: (req: any) => this.syncSteeringDocuments(req) },
      [SteeringOperation.CROSS_VALIDATE]: { execute: (req: any) => this.crossValidateDocuments(req) },
      [SteeringOperation.GENERATE_SPEC]: { execute: (req: any) => this.generateSpecFromSteering(req) }
    };
    
    const strategy = strategies[operation];
    if (!strategy) {
      throw new Error(`Unsupported operation: ${operation}`);
    }
    
    return strategy;
  }

  /**
   * Finalize workflow result with timing
   */
  private async finalizeWorkflowResult(result: SteeringWorkflowResult, startTime: number): Promise<SteeringWorkflowResult> {
    result.duration = Date.now() - startTime;
    result.timestamp = new Date();

    this.logger.info('Steering workflow completed', {
      operation: result.operation,
      success: result.success,
      duration: result.duration
    });

    this.emit('steeringWorkflowCompleted', result);
    return result;
  }

  /**
   * Create new steering document with Claude Flow enhancement
   */
  private async createSteeringDocument(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    if (!request.documentType) {
      throw new Error('Document type required for create operation');
    }

    // Create maestro task for steering document creation
    const task = await this.coordinator.createTask(
      `Create ${request.documentType} steering document`,
      'spec',
      request.priority || 'high'
    );

    // Generate content using Claude Flow coordination
    const content = await this.generateSteeringContent(
      request.documentType,
      request.content || '',
      request.globalContext || {}
    );

    // Create document metadata
    const metadata: SteeringDocumentMeta = {
      type: request.documentType,
      title: this.getSteeringDocumentTitle(request.documentType),
      version: '1.0.0',
      lastUpdated: new Date(),
      status: 'active',
      globalContext: request.globalContext || {},
      dependencies: this.getDocumentDependencies(request.documentType)
    };

    // Save document to filesystem
    const filePath = this.getSteeringDocumentPath(request.documentType);
    await this.ensureSteeringDirectory();
    await fs.writeFile(filePath, content, 'utf-8');

    // Cache metadata
    this.documentsCache.set(request.documentType, metadata);

    // Validate created document using SteeringValidator
    const validation = await this.validator.validateDocument(content, request.documentType);

    // Update task status
    await this.coordinator.updateTask(task.id, {
      status: 'completed',
      metadata: { ...task.metadata, steeringDocument: metadata, validation }
    });

    return {
      success: true,
      operation: SteeringOperation.CREATE,
      documentType: request.documentType,
      content,
      metadata,
      validation,
      taskId: task.id,
      duration: 0, // Will be set by caller
      timestamp: new Date()
    };
  }

  /**
   * Update existing steering document with validation
   * REFACTORED: Pipeline pattern for KISS compliance (was 73 lines, now <15)
   */
  private async updateSteeringDocument(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    const updateContext = await this.prepareDocumentUpdate(request);
    const enhancedContent = await this.enhanceDocumentContent(updateContext);
    const updatedDocument = await this.saveUpdatedDocument(updateContext, enhancedContent);
    return await this.validateUpdatedDocument(updatedDocument);
  }

  /**
   * Prepare document update context
   */
  private async prepareDocumentUpdate(request: SteeringWorkflowRequest) {
    if (!request.documentType || !request.content) {
      throw new Error('Document type and content required for update operation');
    }

    const existingMeta = await this.loadSteeringDocumentMeta(request.documentType);
    if (!existingMeta) {
      throw new Error(`Steering document ${request.documentType} not found`);
    }

    const task = await this.coordinator.createTask(
      `Update ${request.documentType} steering document`,
      'spec',
      request.priority || 'medium'
    );

    return { request, existingMeta, task };
  }

  /**
   * Enhance document content with Claude Flow coordination
   */
  private async enhanceDocumentContent(context: any): Promise<string> {
    return await this.enhanceSteeringContent(
      context.request.documentType,
      context.request.content,
      context.request.globalContext || context.existingMeta.globalContext
    );
  }

  /**
   * Save updated document with metadata
   */
  private async saveUpdatedDocument(context: any, enhancedContent: string) {
    const updatedMeta: SteeringDocumentMeta = {
      ...context.existingMeta,
      version: this.incrementVersion(context.existingMeta.version),
      lastUpdated: new Date(),
      globalContext: { ...context.existingMeta.globalContext, ...context.request.globalContext }
    };

    const filePath = this.getSteeringDocumentPath(context.request.documentType);
    await fs.writeFile(filePath, enhancedContent, 'utf-8');
    this.documentsCache.set(context.request.documentType, updatedMeta);

    return { ...context, updatedMeta, enhancedContent };
  }

  /**
   * Validate updated document with cross-validation
   */
  private async validateUpdatedDocument(documentContext: any): Promise<SteeringWorkflowResult> {
    const validation = await this.validator.validateDocument(
      documentContext.enhancedContent, 
      documentContext.request.documentType
    );
    
    const documents = await this.loadAllSteeringDocuments();
    const crossValidation = await this.validator.validateCrossDocumentAlignment(documents);

    await this.coordinator.updateTask(documentContext.task.id, {
      status: 'completed',
      metadata: { 
        ...documentContext.task.metadata, 
        steeringDocument: documentContext.updatedMeta, 
        validation,
        crossValidation 
      }
    });

    return {
      success: true,
      operation: SteeringOperation.UPDATE,
      documentType: documentContext.request.documentType,
      content: documentContext.enhancedContent,
      metadata: documentContext.updatedMeta,
      validation,
      crossValidation,
      taskId: documentContext.task.id,
      duration: 0,
      timestamp: new Date()
    };
  }

  /**
   * Validate steering document with Claude Flow intelligence
   */
  private async validateSteeringDocument(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    if (!request.documentType) {
      throw new Error('Document type required for validation');
    }

    // Load document content from document manager
    const existingDoc = await this.documentManager.getDocument(request.documentType);
    const content = request.content || (existingDoc ? await this.loadDocumentContentFromManager(request.documentType) : null);
    if (!content) {
      throw new Error(`Steering document ${request.documentType} not found`);
    }

    // Create validation task
    const task = await this.coordinator.createTask(
      `Validate ${request.documentType} steering document`,
      'review',
      request.priority || 'medium'
    );

    // Perform comprehensive validation using SteeringValidator
    const validation = await this.validator.validateDocument(content, request.documentType);

    // Perform consensus validation if required
    let consensusResult: ConsensusResult | undefined;
    if (request.requireConsensus) {
      consensusResult = await this.validator.performConsensusValidation(content, request.documentType);
    }

    // Use validation result directly from SteeringValidator
    const combinedValidation: MaestroValidationResult = {
      ...validation,
      consensusAchieved: consensusResult?.consensusReached
    };

    // Update task
    await this.coordinator.updateTask(task.id, {
      status: 'completed',
      metadata: { ...task.metadata, validation: combinedValidation }
    });

    return {
      success: combinedValidation.valid,
      operation: SteeringOperation.VALIDATE,
      documentType: request.documentType,
      content,
      validation: combinedValidation,
      taskId: task.id,
      duration: 0,
      timestamp: new Date()
    };
  }

  /**
   * Synchronize all steering documents for consistency
   */
  private async syncSteeringDocuments(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    // Create sync workflow
    const workflow = await this.coordinator.createWorkflow(
      'Steering Documents Synchronization',
      'Sync all steering documents for cross-document consistency'
    );

    this.activeWorkflows.set(workflow.id, workflow);

    // Create tasks for each document type
    const syncTasks: MaestroTask[] = [];
    for (const docType of Object.values(SteeringDocumentType)) {
      const task = await this.coordinator.createTask(
        `Sync ${docType} steering document`,
        'spec',
        'medium'
      );
      
      syncTasks.push(task);
      await this.coordinator.addTaskToWorkflow(workflow.id, task);
    }

    // Perform cross-validation using SteeringValidator
    const documents = await this.loadAllSteeringDocuments();
    const crossValidation = await this.validator.validateCrossDocumentAlignment(documents);

    // Update workflow with sync results
    for (const task of syncTasks) {
      await this.coordinator.updateTask(task.id, {
        status: 'completed',
        metadata: { 
          ...task.metadata, 
          syncOperation: true,
          crossValidation 
        }
      });
    }

    // Complete workflow
    await this.coordinator.executeWorkflow(workflow.id);

    return {
      success: crossValidation.overallAlignment > 0.95,
      operation: SteeringOperation.SYNC,
      crossValidation,
      workflowId: workflow.id,
      duration: 0,
      timestamp: new Date()
    };
  }

  /**
   * Cross-validate all steering documents
   */
  private async crossValidateDocuments(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    // Create cross-validation task
    const task = await this.coordinator.createTask(
      'Cross-validate steering documents',
      'review',
      request.priority || 'high'
    );

    // Perform comprehensive cross-validation using SteeringValidator
    const documents = await this.loadAllSteeringDocuments();
    const crossValidation = await this.validator.validateCrossDocumentAlignment(documents);

    // Update task
    await this.coordinator.updateTask(task.id, {
      status: 'completed',
      metadata: { ...task.metadata, crossValidation }
    });

    return {
      success: crossValidation.overallAlignment > 0.95,
      operation: SteeringOperation.CROSS_VALIDATE,
      crossValidation,
      taskId: task.id,
      duration: 0,
      timestamp: new Date()
    };
  }

  /**
   * Generate specification from steering documents
   */
  private async generateSpecFromSteering(request: SteeringWorkflowRequest): Promise<SteeringWorkflowResult> {
    if (!request.metadata?.specName) {
      throw new Error('Spec name required in metadata for generate_spec operation');
    }

    const specName = request.metadata.specName;
    const description = request.metadata.description || `Generated specification based on steering documents`;

    // Create specs-driven workflow
    const requirements = await this.extractRequirementsFromSteering();
    const stakeholders = request.metadata.stakeholders || ['development-team'];

    const specWorkflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      specName,
      description,
      requirements,
      stakeholders
    );

    // Execute the specs-driven workflow
    const completedWorkflow = await this.specsDrivenOrchestrator.executeSpecsDrivenWorkflow(
      specWorkflow.id
    );

    return {
      success: completedWorkflow.status === 'completed',
      operation: SteeringOperation.GENERATE_SPEC,
      workflowId: completedWorkflow.id,
      metadata: {
        specName,
        requirements,
        stakeholders,
        specsDrivenWorkflow: true
      } as any,
      duration: 0,
      timestamp: new Date()
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Load document content from document manager (backward compatibility helper)
   */
  private async loadDocumentContentFromManager(type: SteeringDocumentType): Promise<string | null> {
    // This is a placeholder - in practice, we'd need to read the file directly
    // since the document manager only stores metadata, not content
    try {
      const filePath = join(this.steeringDir, `${type}.md`);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger.warn(`Could not load content for document ${type}`, error);
      return null;
    }
  }

  /**
   * Generate steering content using pipeline pattern
   * REFACTORED: Extracted from complex method (was 71 lines, now <10)
   */
  private async generateSteeringContent(
    type: SteeringDocumentType,
    baseContent: string,
    globalContext: Record<string, any>
  ): Promise<string> {
    const prompt = this.createSteeringPrompt(type, baseContent, globalContext);
    return await this.coordinator.generateContent(
      prompt,
      'steering-document',
      this.selectSteeringAgent(type)
    );
  }

  /**
   * Enhance steering content with context integration
   * REFACTORED: Strategy pattern for content enhancement
   */
  private async enhanceSteeringContent(
    type: SteeringDocumentType,
    content: string,
    globalContext: Record<string, any>
  ): Promise<string> {
    const enhancementStrategy = this.getContentEnhancementStrategy(type);
    return await enhancementStrategy.enhance(content, globalContext);
  }

  /**
   * Get content enhancement strategy based on document type
   */
  private getContentEnhancementStrategy(type: SteeringDocumentType) {
    const strategies = {
      [SteeringDocumentType.PRODUCT]: new ProductContentEnhancer(this.coordinator),
      [SteeringDocumentType.STRUCTURE]: new StructureContentEnhancer(this.coordinator),
      [SteeringDocumentType.TECH]: new TechContentEnhancer(this.coordinator)
    };
    
    return strategies[type] || new DefaultContentEnhancer(this.coordinator);
  }

  /**
   * Legacy enhancement method for backward compatibility
   */
  private async enhanceSteeringContentLegacy(
    type: SteeringDocumentType,
    content: string,
    globalContext: Record<string, any>
  ): Promise<string> {
    const enhancementPrompt = `Enhance the following ${type} steering document with Claude Flow coordination and global context integration:\n\n${content}`;
    
    return await this.coordinator.generateContent(
      enhancementPrompt,
      'steering-document',
      this.selectSteeringAgent(type)
    );
  }

  private createSteeringPrompt(
    type: SteeringDocumentType,
    baseContent: string,
    globalContext: Record<string, any>
  ): string {
    const templates = {
      [SteeringDocumentType.PRODUCT]: `Create a comprehensive product vision and mission steering document following Kiro methodology. Include:
- Vision statement for specs-driven development with Claude Flow coordination
- Mission statement emphasizing AI-human collaboration
- Strategic objectives with measurable targets
- User personas enhanced with Claude Flow solutions
- Success metrics including Claude Flow specific KPIs
- Product principles focusing on specifications-driven implementation
- Integration specifications for maestro workflow coordination

Base content: ${baseContent}
Global context: ${JSON.stringify(globalContext, null, 2)}`,

      [SteeringDocumentType.STRUCTURE]: `Create a structural architecture steering document with Clean Architecture and SOLID principles. Include:
- Architecture vision with Claude Flow swarm intelligence integration
- Clean Architecture layer implementation with validation
- SOLID principles with practical TypeScript examples
- Module structure optimized for Claude Flow coordination
- Domain-driven design patterns
- Swarm architecture validation specifications
- Intelligent architecture evolution capabilities

Base content: ${baseContent}
Global context: ${JSON.stringify(globalContext, null, 2)}`,

      [SteeringDocumentType.TECH]: `Create a technology standards and development tools steering document. Include:
- Technology vision with Claude Flow enhancement
- Modern JavaScript/TypeScript stack specifications
- AI-enhanced development tools and processes
- Performance standards monitored by Claude Flow
- Security standards validated by swarm intelligence
- Quality assurance with automated validation
- Swarm-coordinated technology standards

Base content: ${baseContent}
Global context: ${JSON.stringify(globalContext, null, 2)}`
    };

    return templates[type];
  }

  private selectSteeringAgent(type: SteeringDocumentType) {
    const agentMapping = {
      [SteeringDocumentType.PRODUCT]: 'requirements_analyst',
      [SteeringDocumentType.STRUCTURE]: 'design_architect',
      [SteeringDocumentType.TECH]: 'implementation_coder'
    } as const;

    return agentMapping[type];
  }

  /**
   * Load all steering documents for cross-validation
   */
  private async loadAllSteeringDocuments(): Promise<SteeringDocument[]> {
    const documents: SteeringDocument[] = [];
    
    for (const docType of Object.values(SteeringDocumentType)) {
      try {
        const content = await this.loadSteeringDocumentContent(docType);
        const meta = await this.loadSteeringDocumentMeta(docType);
        
        if (content && meta) {
          documents.push({
            type: docType,
            content,
            title: meta.title,
            version: meta.version,
            lastUpdated: meta.lastUpdated,
            status: meta.status
          });
        }
      } catch (error) {
        this.logger.warn(`Could not load ${docType} document for cross-validation`, { error: error.message });
      }
    }
    
    return documents;
  }

  /**
   * Get the steering validator instance for external access
   */
  getValidator(): SteeringValidator {
    return this.validator;
  }

  private async extractRequirementsFromSteering(): Promise<string[]> {
    const requirements: string[] = [];
    
    for (const docType of Object.values(SteeringDocumentType)) {
      try {
        const content = await this.loadSteeringDocumentContent(docType);
        if (content) {
          // Extract requirements from steering document
          const docRequirements = this.extractRequirementsFromContent(content, docType);
          requirements.push(...docRequirements);
        }
      } catch (error) {
        this.logger.warn(`Could not extract requirements from ${docType} document`);
      }
    }

    return requirements;
  }

  private extractRequirementsFromContent(content: string, docType: SteeringDocumentType): string[] {
    const requirements: string[] = [];
    
    // Extract bullet points as potential requirements
    const bulletPoints = content.match(/^[\s]*[-*+]\s+(.+)$/gm) || [];
    for (const point of bulletPoints) {
      const requirement = point.replace(/^[\s]*[-*+]\s+/, '').trim();
      if (requirement.length > 10) {
        requirements.push(`${docType}: ${requirement}`);
      }
    }

    // Extract numbered lists
    const numberedItems = content.match(/^\s*\d+\.\s+(.+)$/gm) || [];
    for (const item of numberedItems) {
      const requirement = item.replace(/^\s*\d+\.\s+/, '').trim();
      if (requirement.length > 10) {
        requirements.push(`${docType}: ${requirement}`);
      }
    }

    return requirements;
  }

  private getSteeringDocumentTitle(type: SteeringDocumentType): string {
    const titles = {
      [SteeringDocumentType.PRODUCT]: 'Product Vision & Mission',
      [SteeringDocumentType.STRUCTURE]: 'Structural Architecture',
      [SteeringDocumentType.TECH]: 'Technology Standards & Development Tools'
    };

    return titles[type];
  }

  private getDocumentDependencies(type: SteeringDocumentType): SteeringDocumentType[] {
    const dependencies = {
      [SteeringDocumentType.PRODUCT]: [],
      [SteeringDocumentType.STRUCTURE]: [SteeringDocumentType.PRODUCT],
      [SteeringDocumentType.TECH]: [SteeringDocumentType.PRODUCT, SteeringDocumentType.STRUCTURE]
    };

    return dependencies[type];
  }

  private getSteeringDocumentPath(type: SteeringDocumentType): string {
    return join(this.steeringDir, `${type}.md`);
  }

  private async ensureSteeringDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.steeringDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async loadSteeringDocumentContent(type: SteeringDocumentType): Promise<string | null> {
    try {
      const filePath = this.getSteeringDocumentPath(type);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  private async loadSteeringDocumentMeta(type: SteeringDocumentType): Promise<SteeringDocumentMeta | null> {
    // Check cache first
    if (this.documentsCache.has(type)) {
      return this.documentsCache.get(type)!;
    }

    // Try to load from filesystem metadata
    try {
      const content = await this.loadSteeringDocumentContent(type);
      if (content) {
        // Extract metadata from document content
        const meta = this.parseSteeringDocumentMeta(content, type);
        this.documentsCache.set(type, meta);
        return meta;
      }
    } catch (error) {
      this.logger.warn(`Could not load metadata for ${type} document`);
    }

    return null;
  }

  private parseSteeringDocumentMeta(content: string, type: SteeringDocumentType): SteeringDocumentMeta {
    // Basic metadata parsing from document content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/\*\*Status\*\*:\s*🟢\s*\*\*(.+?)\*\*/);
    const dateMatch = content.match(/\*\*Last Updated\*\*:\s*(.+)/);

    return {
      type,
      title: titleMatch ? titleMatch[1] : this.getSteeringDocumentTitle(type),
      version: '1.0.0', // Default version
      lastUpdated: dateMatch ? new Date(dateMatch[1]) : new Date(),
      status: statusMatch ? 'active' : 'draft',
      globalContext: {},
      dependencies: this.getDocumentDependencies(type)
    };
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
}

// Strategy pattern interfaces for KISS compliance
interface ContentEnhancer {
  enhance(content: string, globalContext: Record<string, any>): Promise<string>;
}

class DefaultContentEnhancer implements ContentEnhancer {
  constructor(private coordinator: MaestroCoordinator) {}
  
  async enhance(content: string, globalContext: Record<string, any>): Promise<string> {
    const enhancementPrompt = `Enhance the following steering document with Claude Flow coordination:\n\n${content}`;
    return await this.coordinator.generateContent(enhancementPrompt, 'steering-document', 'default');
  }
}

class ProductContentEnhancer implements ContentEnhancer {
  constructor(private coordinator: MaestroCoordinator) {}
  
  async enhance(content: string, globalContext: Record<string, any>): Promise<string> {
    const enhancementPrompt = `Enhance the following product steering document with vision alignment:\n\n${content}`;
    return await this.coordinator.generateContent(enhancementPrompt, 'steering-document', 'product-specialist');
  }
}

class StructureContentEnhancer implements ContentEnhancer {
  constructor(private coordinator: MaestroCoordinator) {}
  
  async enhance(content: string, globalContext: Record<string, any>): Promise<string> {
    const enhancementPrompt = `Enhance the following structure steering document with architectural patterns:\n\n${content}`;
    return await this.coordinator.generateContent(enhancementPrompt, 'steering-document', 'architect');
  }
}

class TechContentEnhancer implements ContentEnhancer {
  constructor(private coordinator: MaestroCoordinator) {}
  
  async enhance(content: string, globalContext: Record<string, any>): Promise<string> {
    const enhancementPrompt = `Enhance the following tech steering document with technical best practices:\n\n${content}`;
    return await this.coordinator.generateContent(enhancementPrompt, 'steering-document', 'tech-lead');
  }
}

/**
 * Factory function for creating SteeringWorkflowEngine
 */
export function createSteeringWorkflowEngine(
  coordinator: MaestroCoordinator,
  specsDrivenOrchestrator: SpecsDrivenFlowOrchestrator,
  logger: MaestroLogger,
  config: MaestroHiveConfig,
  fileManager?: MaestroFileManager
): SteeringWorkflowEngine {
  return new SteeringWorkflowEngine(coordinator, specsDrivenOrchestrator, logger, config, fileManager);
}

/**
 * Helper function to create steering workflow with default configuration
 */
export async function createSteeringWorkflow(
  coordinator: MaestroCoordinator,
  logger: MaestroLogger,
  config: MaestroHiveConfig,
  fileManager?: MaestroFileManager
): Promise<SteeringWorkflowEngine> {
  // Create specs-driven orchestrator
  const specsDrivenOrchestrator = new SpecsDrivenFlowOrchestrator(coordinator, logger);
  
  // Create steering workflow engine
  const steeringEngine = createSteeringWorkflowEngine(
    coordinator,
    specsDrivenOrchestrator,
    logger,
    config,
    fileManager
  );

  logger.info('Steering workflow system initialized', {
    specsDriven: config.enableSpecsDriven,
    workflowDirectory: config.workflowDirectory
  });

  return steeringEngine;
}