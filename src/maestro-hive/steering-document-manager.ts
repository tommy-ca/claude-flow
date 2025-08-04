/**
 * Steering Document Manager
 * 
 * Single Responsibility: Document CRUD operations for steering documents
 * Following SOLID principles with dependency injection and proper error handling
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { MaestroFileManager, MaestroLogger } from './interfaces.js';

/**
 * Steering document types in the Kiro methodology
 */
export enum SteeringDocumentType {
  PRODUCT = 'product',
  STRUCTURE = 'structure', 
  TECH = 'tech'
}

/**
 * Steering document metadata
 */
export interface SteeringDocumentMeta {
  type: SteeringDocumentType;
  title: string;
  version: string;
  lastUpdated: Date;
  status: 'draft' | 'active' | 'archived';
  globalContext: Record<string, any>;
  alignmentScore?: number;
  dependencies: SteeringDocumentType[];
}

/**
 * Document creation request
 */
export interface CreateDocumentRequest {
  type: SteeringDocumentType;
  content?: string;
  globalContext?: Record<string, any>;
  title?: string;
}

/**
 * Document update request
 */
export interface UpdateDocumentRequest {
  type: SteeringDocumentType;
  content: string;
  globalContext?: Record<string, any>;
  version?: string;
}

/**
 * Steering operation result
 */
export interface SteeringOperationResult {
  success: boolean;
  type: SteeringDocumentType;
  content?: string;
  metadata?: SteeringDocumentMeta;
  error?: string;
  timestamp: Date;
}

/**
 * Document operations interface for steering documents
 */
export interface ISteeringDocumentOperations {
  createDocument(request: CreateDocumentRequest): Promise<SteeringOperationResult>;
  updateDocument(request: UpdateDocumentRequest): Promise<SteeringOperationResult>;
  getDocument(type: SteeringDocumentType): Promise<SteeringDocumentMeta | null>;
  deleteDocument(type: SteeringDocumentType): Promise<boolean>;
  validateDocumentExists(type: SteeringDocumentType): Promise<boolean>;
}

/**
 * Steering Document Manager - Single Responsibility Implementation
 * 
 * Handles only document CRUD operations with proper dependency injection
 */
export class SteeringDocumentManager implements ISteeringDocumentOperations {
  private fileManager: MaestroFileManager;
  private logger: MaestroLogger;
  private documentsCache: Map<SteeringDocumentType, SteeringDocumentMeta>;
  private steeringDir: string;

  constructor(
    fileManager: MaestroFileManager, 
    logger: MaestroLogger,
    steeringDirectory: string = 'docs/maestro/steering'
  ) {
    this.fileManager = fileManager;
    this.logger = logger;
    this.documentsCache = new Map();
    this.steeringDir = steeringDirectory;
    
    this.logger.info('SteeringDocumentManager initialized', {
      steeringDir: this.steeringDir,
      cacheEnabled: true
    });
  }

  /**
   * Create a new steering document
   */
  async createDocument(request: CreateDocumentRequest): Promise<SteeringOperationResult> {
    try {
      this.logger.info('Creating steering document', { type: request.type });

      // Validate request
      if (await this.validateDocumentExists(request.type)) {
        throw new Error(`Document ${request.type} already exists`);
      }

      // Create document metadata
      const metadata: SteeringDocumentMeta = {
        type: request.type,
        title: request.title || this.getSteeringDocumentTitle(request.type),
        version: '1.0.0',
        lastUpdated: new Date(),
        status: 'active',
        globalContext: request.globalContext || {},
        dependencies: this.getDocumentDependencies(request.type)
      };

      // Generate content if not provided
      const content = request.content || this.generateDefaultContent(request.type);

      // Save document to filesystem
      const filePath = this.getSteeringDocumentPath(request.type);
      await this.ensureSteeringDirectory();
      await this.saveDocumentContent(filePath, content);

      // Update cache
      this.updateDocumentCache(request.type, metadata);

      this.logger.info('Document created successfully', { 
        type: request.type, 
        version: metadata.version 
      });

      return {
        success: true,
        type: request.type,
        content,
        metadata,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to create document', error);
      return {
        success: false,
        type: request.type,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Update an existing steering document
   */
  async updateDocument(request: UpdateDocumentRequest): Promise<SteeringOperationResult> {
    try {
      this.logger.info('Updating steering document', { type: request.type });

      // Load existing metadata
      const existingMeta = await this.getDocument(request.type);
      if (!existingMeta) {
        throw new Error(`Document ${request.type} not found`);
      }

      // Update metadata
      const updatedMeta: SteeringDocumentMeta = {
        ...existingMeta,
        version: request.version || this.incrementVersion(existingMeta.version),
        lastUpdated: new Date(),
        globalContext: { ...existingMeta.globalContext, ...request.globalContext }
      };

      // Save updated document
      const filePath = this.getSteeringDocumentPath(request.type);
      await this.saveDocumentContent(filePath, request.content);

      // Update cache
      this.updateDocumentCache(request.type, updatedMeta);

      this.logger.info('Document updated successfully', { 
        type: request.type, 
        version: updatedMeta.version 
      });

      return {
        success: true,
        type: request.type,
        content: request.content,
        metadata: updatedMeta,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to update document', error);
      return {
        success: false,
        type: request.type,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get steering document metadata
   */
  async getDocument(type: SteeringDocumentType): Promise<SteeringDocumentMeta | null> {
    try {
      // Check cache first
      if (this.documentsCache.has(type)) {
        this.logger.debug('Document retrieved from cache', { type });
        return this.documentsCache.get(type)!;
      }

      // Try to load from filesystem
      const content = await this.loadDocumentContent(this.getSteeringDocumentPath(type));
      if (content) {
        const metadata = this.parseSteeringDocumentMeta(content, type);
        this.updateDocumentCache(type, metadata);
        this.logger.debug('Document loaded from filesystem', { type });
        return metadata;
      }

      return null;

    } catch (error) {
      this.logger.warn(`Could not load document ${type}`, error);
      return null;
    }
  }

  /**
   * Delete a steering document
   */
  async deleteDocument(type: SteeringDocumentType): Promise<boolean> {
    try {
      this.logger.info('Deleting steering document', { type });

      const filePath = this.getSteeringDocumentPath(type);
      
      // Check if file exists
      if (!(await this.fileManager.fileExists(filePath))) {
        this.logger.warn('Document not found for deletion', { type, filePath });
        return false;
      }

      // Delete from filesystem (using fs since MaestroFileManager doesn't have delete)
      await fs.unlink(filePath);

      // Remove from cache
      this.documentsCache.delete(type);

      this.logger.info('Document deleted successfully', { type });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete document', error);
      return false;
    }
  }

  /**
   * Validate if document exists
   */
  async validateDocumentExists(type: SteeringDocumentType): Promise<boolean> {
    try {
      const filePath = this.getSteeringDocumentPath(type);
      return await this.fileManager.fileExists(filePath);
    } catch (error) {
      this.logger.debug('Document existence check failed', { type, error: error.message });
      return false;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Load document content from file system
   */
  private async loadDocumentContent(path: string): Promise<string | null> {
    try {
      return await this.fileManager.readFile(path);
    } catch (error) {
      this.logger.debug('Could not load document content', { path, error: error.message });
      throw error; // Re-throw to let calling method handle it
    }
  }

  /**
   * Save document content to file system
   */
  private async saveDocumentContent(path: string, content: string): Promise<void> {
    try {
      await this.fileManager.writeFile(path, content);
    } catch (error) {
      this.logger.error('Failed to save document content', { path, error });
      throw error;
    }
  }

  /**
   * Update document cache with metadata
   */
  private updateDocumentCache(type: SteeringDocumentType, meta: SteeringDocumentMeta): void {
    this.documentsCache.set(type, meta);
    this.logger.debug('Document cache updated', { type, version: meta.version });
  }

  /**
   * Get document file path
   */
  private getSteeringDocumentPath(type: SteeringDocumentType): string {
    return join(this.steeringDir, `${type}.md`);
  }

  /**
   * Ensure steering directory exists
   */
  private async ensureSteeringDirectory(): Promise<void> {
    try {
      await this.fileManager.createDirectory(this.steeringDir);
    } catch (error) {
      // Directory might already exist - use fileExists to check
      // If it doesn't exist, try to create with fs
      try {
        await fs.mkdir(this.steeringDir, { recursive: true });
      } catch (createError) {
        this.logger.debug('Directory creation handled', { 
          dir: this.steeringDir, 
          error: createError.message 
        });
      }
    }
  }

  /**
   * Get default document title
   */
  private getSteeringDocumentTitle(type: SteeringDocumentType): string {
    const titles = {
      [SteeringDocumentType.PRODUCT]: 'Product Vision & Mission',
      [SteeringDocumentType.STRUCTURE]: 'Structural Architecture',
      [SteeringDocumentType.TECH]: 'Technology Standards & Development Tools'
    };

    return titles[type];
  }

  /**
   * Get document dependencies
   */
  private getDocumentDependencies(type: SteeringDocumentType): SteeringDocumentType[] {
    const dependencies = {
      [SteeringDocumentType.PRODUCT]: [],
      [SteeringDocumentType.STRUCTURE]: [SteeringDocumentType.PRODUCT],
      [SteeringDocumentType.TECH]: [SteeringDocumentType.PRODUCT, SteeringDocumentType.STRUCTURE]
    };

    return dependencies[type];
  }

  /**
   * Generate default document content based on type
   */
  private generateDefaultContent(type: SteeringDocumentType): string {
    const templates = {
      [SteeringDocumentType.PRODUCT]: `# Product Vision & Mission

## Vision Statement
[Define the product vision here]

## Mission Statement  
[Define the product mission here]

## Strategic Objectives
- [Objective 1]
- [Objective 2]
- [Objective 3]

## Status
**Status**: 🟢 **Active**

**Last Updated**: ${new Date().toISOString().split('T')[0]}
`,

      [SteeringDocumentType.STRUCTURE]: `# Structural Architecture

## Architecture Vision
[Define the structural architecture vision here]

## Clean Architecture Implementation
### Domain Layer
[Define domain layer structure]

### Application Layer
[Define application layer structure]

### Infrastructure Layer
[Define infrastructure layer structure]

## SOLID Principles
[Define SOLID implementation]

## Status
**Status**: 🟢 **Active**

**Last Updated**: ${new Date().toISOString().split('T')[0]}
`,

      [SteeringDocumentType.TECH]: `# Technology Standards & Development Tools

## Technology Vision
[Define technology vision here]

## Technology Stack
### Core Technologies
- Node.js
- TypeScript
- [Additional technologies]

### Development Tools
- [Tool 1]
- [Tool 2]
- [Tool 3]

## Performance Standards
[Define performance standards]

## Security Standards
[Define security standards]

## Status
**Status**: 🟢 **Active**

**Last Updated**: ${new Date().toISOString().split('T')[0]}
`
    };

    return templates[type];
  }

  /**
   * Parse document metadata from content
   */
  private parseSteeringDocumentMeta(content: string, type: SteeringDocumentType): SteeringDocumentMeta {
    // Basic metadata parsing from document content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/\*\*Status\*\*:\s*🟢\s*\*\*(.+?)\*\*/);
    const dateMatch = content.match(/\*\*Last Updated\*\*:\s*(.+)/);

    return {
      type,
      title: titleMatch ? titleMatch[1] : this.getSteeringDocumentTitle(type),
      version: '1.0.0', // Default version - could be enhanced to parse from content
      lastUpdated: dateMatch ? new Date(dateMatch[1]) : new Date(),
      status: statusMatch ? 'active' : 'draft',
      globalContext: {},
      dependencies: this.getDocumentDependencies(type)
    };
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
}

/**
 * Factory function for creating SteeringDocumentManager
 */
export function createSteeringDocumentManager(
  fileManager: MaestroFileManager,
  logger: MaestroLogger,
  steeringDirectory?: string
): SteeringDocumentManager {
  return new SteeringDocumentManager(fileManager, logger, steeringDirectory);
}

/**
 * Helper function to validate document type
 */
export function isValidSteeringDocumentType(type: string): type is SteeringDocumentType {
  return Object.values(SteeringDocumentType).includes(type as SteeringDocumentType);
}