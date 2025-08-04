/**
 * Unit Tests for SteeringDocumentManager
 * 
 * Tests document CRUD operations following TDD principles
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  SteeringDocumentManager, 
  SteeringDocumentType,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  SteeringDocumentMeta,
  createSteeringDocumentManager
} from '../steering-document-manager.js';
import type { MaestroFileManager, MaestroLogger } from '../interfaces.js';

// Mock implementations
const mockFileManager: MaestroFileManager = {
  writeFile: jest.fn(),
  readFile: jest.fn(),
  fileExists: jest.fn(),
  createDirectory: jest.fn(),
  listFiles: jest.fn(),
  saveWorkflow: jest.fn(),
  loadWorkflow: jest.fn(),
  archiveWorkflow: jest.fn(),
  saveTaskArtifact: jest.fn(),
  getTaskArtifacts: jest.fn()
};

const mockLogger: MaestroLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logTask: jest.fn(),
  logWorkflow: jest.fn(),
  logAgent: jest.fn(),
  logQuality: jest.fn()
};

describe('SteeringDocumentManager', () => {
  let documentManager: SteeringDocumentManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh instance
    documentManager = new SteeringDocumentManager(
      mockFileManager,
      mockLogger,
      'test/steering'
    );
  });

  describe('Constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(documentManager).toBeInstanceOf(SteeringDocumentManager);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SteeringDocumentManager initialized',
        expect.objectContaining({
          steeringDir: 'test/steering',
          cacheEnabled: true
        })
      );
    });

    it('should use default directory when not provided', () => {
      const defaultManager = new SteeringDocumentManager(mockFileManager, mockLogger);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SteeringDocumentManager initialized',
        expect.objectContaining({
          steeringDir: 'docs/maestro/steering'
        })
      );
    });
  });

  describe('createDocument', () => {
    const createRequest: CreateDocumentRequest = {
      type: SteeringDocumentType.PRODUCT,
      content: '# Test Product Document\n\nTest content',
      globalContext: { project: 'test' }
    };

    beforeEach(() => {
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(false);
      (mockFileManager.writeFile as jest.MockedFunction<any>).mockResolvedValue(undefined);
      (mockFileManager.createDirectory as jest.MockedFunction<any>).mockResolvedValue(undefined);
    });

    it('should create document successfully', async () => {
      const result = await documentManager.createDocument(createRequest);

      expect(result.success).toBe(true);
      expect(result.type).toBe(SteeringDocumentType.PRODUCT);
      expect(result.content).toBe(createRequest.content);
      expect(result.metadata).toEqual(expect.objectContaining({
        type: SteeringDocumentType.PRODUCT,
        title: 'Product Vision & Mission',
        version: '1.0.0',
        status: 'active',
        globalContext: { project: 'test' },
        dependencies: []
      }));

      expect(mockFileManager.writeFile).toHaveBeenCalledWith(
        'test/steering/product.md',
        createRequest.content
      );
    });

    it('should generate default content when none provided', async () => {
      const requestWithoutContent = { ...createRequest, content: undefined };
      
      const result = await documentManager.createDocument(requestWithoutContent);

      expect(result.success).toBe(true);
      expect(result.content).toContain('# Product Vision & Mission');
      expect(result.content).toContain('## Vision Statement');
    });

    it('should fail if document already exists', async () => {
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(true);

      const result = await documentManager.createDocument(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document product already exists');
      expect(mockFileManager.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file system errors gracefully', async () => {
      (mockFileManager.writeFile as jest.MockedFunction<any>).mockRejectedValue(new Error('Write failed'));

      const result = await documentManager.createDocument(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create document',
        expect.any(Error)
      );
    });
  });

  describe('updateDocument', () => {
    const updateRequest: UpdateDocumentRequest = {
      type: SteeringDocumentType.PRODUCT,
      content: '# Updated Product Document\n\nUpdated content',
      globalContext: { updated: true }
    };

    const existingMeta: SteeringDocumentMeta = {
      type: SteeringDocumentType.PRODUCT,
      title: 'Product Vision & Mission',
      version: '1.0.0',
      lastUpdated: new Date('2025-01-01'),
      status: 'active',
      globalContext: { project: 'test' },
      dependencies: []
    };

    beforeEach(() => {
      (mockFileManager.writeFile as jest.MockedFunction<any>).mockResolvedValue(undefined);
    });

    it('should update document successfully', async () => {
      // Mock getDocument to return existing metadata
      jest.spyOn(documentManager, 'getDocument').mockResolvedValue(existingMeta);

      const result = await documentManager.updateDocument(updateRequest);

      expect(result.success).toBe(true);
      expect(result.type).toBe(SteeringDocumentType.PRODUCT);
      expect(result.content).toBe(updateRequest.content);
      expect(result.metadata?.version).toBe('1.0.1'); // Version incremented
      expect(result.metadata?.globalContext).toEqual({
        project: 'test',
        updated: true
      });

      expect(mockFileManager.writeFile).toHaveBeenCalledWith(
        'test/steering/product.md',
        updateRequest.content
      );
    });

    it('should fail if document not found', async () => {
      jest.spyOn(documentManager, 'getDocument').mockResolvedValue(null);

      const result = await documentManager.updateDocument(updateRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document product not found');
      expect(mockFileManager.writeFile).not.toHaveBeenCalled();
    });

    it('should use provided version', async () => {
      jest.spyOn(documentManager, 'getDocument').mockResolvedValue(existingMeta);
      const requestWithVersion = { ...updateRequest, version: '2.0.0' };

      const result = await documentManager.updateDocument(requestWithVersion);

      expect(result.success).toBe(true);
      expect(result.metadata?.version).toBe('2.0.0');
    });
  });

  describe('getDocument', () => {
    const documentContent = '# Product Document\n**Status**: 🟢 **Active**\n**Last Updated**: 2025-01-01';

    it('should return document from cache if available', async () => {
      // Pre-populate cache
      const cachedMeta: SteeringDocumentMeta = {
        type: SteeringDocumentType.PRODUCT,
        title: 'Cached Document',
        version: '1.0.0',
        lastUpdated: new Date(),
        status: 'active',
        globalContext: {},
        dependencies: []
      };

      // Access private cache property for testing
      (documentManager as any).documentsCache.set(SteeringDocumentType.PRODUCT, cachedMeta);

      const result = await documentManager.getDocument(SteeringDocumentType.PRODUCT);

      expect(result).toEqual(cachedMeta);
      expect(mockFileManager.readFile).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Document retrieved from cache',
        { type: SteeringDocumentType.PRODUCT }
      );
    });

    it('should load document from filesystem if not cached', async () => {
      (mockFileManager.readFile as jest.MockedFunction<any>).mockResolvedValue(documentContent);

      const result = await documentManager.getDocument(SteeringDocumentType.PRODUCT);

      expect(result).toEqual(expect.objectContaining({
        type: SteeringDocumentType.PRODUCT,
        title: 'Product Document',
        status: 'active'
      }));

      expect(mockFileManager.readFile).toHaveBeenCalledWith('test/steering/product.md');
    });

    it('should return null if document not found', async () => {
      (mockFileManager.readFile as jest.MockedFunction<any>).mockResolvedValue(null);

      const result = await documentManager.getDocument(SteeringDocumentType.PRODUCT);

      expect(result).toBeNull();
    });

    it('should handle file system errors gracefully', async () => {
      // Mock loadDocumentContent to throw error by making readFile throw
      (mockFileManager.readFile as jest.MockedFunction<any>).mockRejectedValue(new Error('Read failed'));

      const result = await documentManager.getDocument(SteeringDocumentType.PRODUCT);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Could not load document product',
        expect.any(Error)
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(true);
      // Mock fs.unlink
      const fs = await import('fs');
      jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);

      const result = await documentManager.deleteDocument(SteeringDocumentType.PRODUCT);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document deleted successfully',
        { type: SteeringDocumentType.PRODUCT }
      );
    });

    it('should return false if document not found', async () => {
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(false);

      const result = await documentManager.deleteDocument(SteeringDocumentType.PRODUCT);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Document not found for deletion',
        expect.objectContaining({ type: SteeringDocumentType.PRODUCT })
      );
    });
  });

  describe('validateDocumentExists', () => {
    it('should return true if document exists', async () => {
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(true);

      const result = await documentManager.validateDocumentExists(SteeringDocumentType.PRODUCT);

      expect(result).toBe(true);
      expect(mockFileManager.fileExists).toHaveBeenCalledWith('test/steering/product.md');
    });

    it('should return false if document does not exist', async () => {
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(false);

      const result = await documentManager.validateDocumentExists(SteeringDocumentType.PRODUCT);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockRejectedValue(new Error('Access denied'));

      const result = await documentManager.validateDocumentExists(SteeringDocumentType.PRODUCT);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Document existence check failed',
        expect.objectContaining({ type: SteeringDocumentType.PRODUCT })
      );
    });
  });

  describe('Document Types and Dependencies', () => {
    it('should have correct dependencies for each document type', async () => {
      const productRequest: CreateDocumentRequest = { type: SteeringDocumentType.PRODUCT };
      const structureRequest: CreateDocumentRequest = { type: SteeringDocumentType.STRUCTURE };
      const techRequest: CreateDocumentRequest = { type: SteeringDocumentType.TECH };

      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(false);
      (mockFileManager.writeFile as jest.MockedFunction<any>).mockResolvedValue(undefined);

      const productResult = await documentManager.createDocument(productRequest);
      const structureResult = await documentManager.createDocument(structureRequest);
      const techResult = await documentManager.createDocument(techRequest);

      expect(productResult.metadata?.dependencies).toEqual([]);
      expect(structureResult.metadata?.dependencies).toEqual([SteeringDocumentType.PRODUCT]);
      expect(techResult.metadata?.dependencies).toEqual([
        SteeringDocumentType.PRODUCT,
        SteeringDocumentType.STRUCTURE
      ]);
    });

    it('should generate appropriate default content for each type', async () => {
      const types = Object.values(SteeringDocumentType);
      
      (mockFileManager.fileExists as jest.MockedFunction<any>).mockResolvedValue(false);
      (mockFileManager.writeFile as jest.MockedFunction<any>).mockResolvedValue(undefined);

      for (const type of types) {
        const result = await documentManager.createDocument({ type });
        
        expect(result.success).toBe(true);
        expect(result.content).toContain('#');
        expect(result.content).toContain('**Status**: 🟢 **Active**');
        expect(result.content).toContain('**Last Updated**:');
      }
    });
  });

  describe('Factory Functions', () => {
    it('should create SteeringDocumentManager via factory', () => {
      const manager = createSteeringDocumentManager(
        mockFileManager,
        mockLogger,
        'custom/path'
      );

      expect(manager).toBeInstanceOf(SteeringDocumentManager);
    });
  });

  describe('Version Management', () => {
    it('should increment patch version correctly', async () => {
      const existingMeta: SteeringDocumentMeta = {
        type: SteeringDocumentType.PRODUCT,
        title: 'Test',
        version: '1.2.3',
        lastUpdated: new Date(),
        status: 'active',
        globalContext: {},
        dependencies: []
      };

      jest.spyOn(documentManager, 'getDocument').mockResolvedValue(existingMeta);
      (mockFileManager.writeFile as jest.MockedFunction<any>).mockResolvedValue(undefined);

      const result = await documentManager.updateDocument({
        type: SteeringDocumentType.PRODUCT,
        content: 'Updated content'
      });

      expect(result.metadata?.version).toBe('1.2.4');
    });
  });
});