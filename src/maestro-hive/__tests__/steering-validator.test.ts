/**
 * SteeringValidator Test Suite
 * 
 * Tests for the extracted steering validation logic following Single Responsibility Principle.
 * Verifies document validation, cross-document alignment, and consensus mechanisms.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { MaestroCoordinator, MaestroLogger, MaestroValidationResult } from '../interfaces.js';
import { 
  SteeringValidator, 
  createSteeringValidator,
  SteeringDocumentType,
  type SteeringDocument,
  type CrossValidationResult,
  type ConsensusResult,
  type ComplianceResult
} from '../steering-validator.js';

// Mock dependencies
const mockCoordinator: jest.Mocked<MaestroCoordinator> = {
  validate: jest.fn(),
  generateContent: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  getTasks: jest.fn(),
  deleteTask: jest.fn(),
  createWorkflow: jest.fn(),
  addTaskToWorkflow: jest.fn(),
  executeWorkflow: jest.fn(),
  getWorkflow: jest.fn(),
  initializeSwarm: jest.fn(),
  getSwarmStatus: jest.fn(),
  spawnAgent: jest.fn(),
  getStatus: jest.fn(),
  shutdown: jest.fn()
};

const mockLogger: jest.Mocked<MaestroLogger> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logTask: jest.fn(),
  logWorkflow: jest.fn(),
  logAgent: jest.fn(),
  logQuality: jest.fn()
};

describe('SteeringValidator', () => {
  let validator: SteeringValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = createSteeringValidator(mockCoordinator, mockLogger);
  });

  describe('Document Validation', () => {
    test('should validate product document with vision and mission statements', async () => {
      const productContent = `
# Product Vision & Mission

## Vision Statement
To create innovative AI-powered solutions that enhance human productivity.

## Mission Statement
We develop tools that leverage Claude Flow coordination for seamless AI-human collaboration.

## Strategic Objectives
- Improve developer productivity by 50%
- Reduce time-to-market for AI solutions
- Create intuitive user experiences
      `;

      const result = await validator.validateDocument(productContent, SteeringDocumentType.PRODUCT);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0.8);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validating steering document',
        expect.objectContaining({ type: SteeringDocumentType.PRODUCT })
      );
    });

    test('should fail validation for product document missing vision statement', async () => {
      const invalidProductContent = `
# Product Document

## Mission Statement
We develop tools for AI-human collaboration.

## Strategic Objectives
- Improve productivity
      `;

      const result = await validator.validateDocument(invalidProductContent, SteeringDocumentType.PRODUCT);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product document must include Vision Statement');
    });

    test('should validate structure document with Clean Architecture and SOLID', async () => {
      const structureContent = `
# Structural Architecture

## Clean Architecture
The system follows Clean Architecture principles with clear separation of concerns.

## SOLID Principles
We implement all SOLID principles:
- Single Responsibility Principle
- Open/Closed Principle
- Liskov Substitution Principle
- Interface Segregation Principle
- Dependency Inversion Principle

## Domain Layer
The domain layer contains business logic and entities.
      `;

      const result = await validator.validateDocument(structureContent, SteeringDocumentType.STRUCTURE);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0.8);
    });

    test('should validate tech document with technology stack and performance standards', async () => {
      const techContent = `
# Technology Standards & Development Tools

## Technology Stack
- Node.js runtime environment
- TypeScript for type safety
- Express.js for API development

## Performance Standards
- API response time < 200ms
- 99.9% uptime requirement
- Memory usage < 512MB

## Quality Assurance
Comprehensive testing strategy with unit and integration tests.
      `;

      const result = await validator.validateDocument(techContent, SteeringDocumentType.TECH);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0.8);
    });
  });

  describe('Cross-Document Validation', () => {
    test('should validate alignment across multiple documents', async () => {
      const documents: SteeringDocument[] = [
        {
          type: SteeringDocumentType.PRODUCT,
          content: `# Product Vision
Vision Statement: AI-powered development tools
Mission Statement: Enhance developer productivity
Strategic objectives with Claude Flow integration`,
          title: 'Product Vision & Mission',
          version: '1.0.0',
          lastUpdated: new Date(),
          status: 'active'
        },
        {
          type: SteeringDocumentType.STRUCTURE,
          content: `# Structural Architecture
Clean Architecture implementation
SOLID principles throughout codebase
Domain Layer with business logic`,
          title: 'Structural Architecture',
          version: '1.0.0',
          lastUpdated: new Date(),
          status: 'active'
        },
        {
          type: SteeringDocumentType.TECH,
          content: `# Technology Standards
Node.js and TypeScript stack
Performance Standards defined
Quality assurance processes`,
          title: 'Technology Standards',
          version: '1.0.0',
          lastUpdated: new Date(),
          status: 'active'
        }
      ];

      const result = await validator.validateCrossDocumentAlignment(documents);

      expect(result.overallAlignment).toBeGreaterThan(0.7);
      expect(result.documentScores).toHaveProperty(SteeringDocumentType.PRODUCT);
      expect(result.documentScores).toHaveProperty(SteeringDocumentType.STRUCTURE);
      expect(result.documentScores).toHaveProperty(SteeringDocumentType.TECH);
      expect(result.lastValidated).toBeInstanceOf(Date);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performing cross-document validation',
        expect.objectContaining({ documentCount: 3 })
      );
    });

    test('should identify alignment issues in cross-document validation', async () => {
      const documents: SteeringDocument[] = [
        {
          type: SteeringDocumentType.PRODUCT,
          content: 'Brief product document without key elements',
          title: 'Product',
          version: '1.0.0',
          lastUpdated: new Date(),
          status: 'active'
        }
      ];

      const result = await validator.validateCrossDocumentAlignment(documents);

      expect(result.overallAlignment).toBeLessThan(0.95);
      if (result.overallAlignment < 0.95) {
        expect(result.issues).toContain('Cross-document alignment below recommended threshold (95%)');
      }
    });
  });

  describe('Quality Score Calculation', () => {
    test('should calculate higher scores for comprehensive documents', async () => {
      const comprehensiveContent = `
# Comprehensive Document

## Section 1
Detailed content with proper structure and multiple sections.

## Section 2
### Subsection 2.1
More detailed content with nested structure.

### Subsection 2.2
- Bullet points
- Multiple items
- Well-structured content

## Section 3
Additional content that demonstrates depth and comprehensive coverage
of the topic with relevant keywords and proper organization.
      `;

      const score = await validator.calculateQualityScore(comprehensiveContent, SteeringDocumentType.PRODUCT);

      expect(score).toBeGreaterThan(0.8);
    });

    test('should calculate lower scores for brief documents', async () => {
      const briefContent = 'Brief document.';

      const score = await validator.calculateQualityScore(briefContent, SteeringDocumentType.PRODUCT);

      expect(score).toBeLessThan(0.8);
    });
  });

  describe('Consensus Validation', () => {
    test('should perform consensus validation successfully', async () => {
      const mockValidationResult: MaestroValidationResult = {
        valid: true,
        score: 0.9,
        errors: [],
        warnings: [],
        suggestions: [],
        timestamp: new Date()
      };

      mockCoordinator.validate.mockResolvedValue(mockValidationResult);

      const content = 'Test content for consensus validation';
      const result = await validator.performConsensusValidation(content, SteeringDocumentType.PRODUCT);

      expect(result.consensusReached).toBe(true);
      expect(result.confidence).toBe(0.9);
      expect(result.finalScore).toBe(0.9);
      expect(result.consensusDetails).toHaveProperty('agreements');
      expect(result.consensusDetails).toHaveProperty('disagreements');
      expect(mockCoordinator.validate).toHaveBeenCalledWith(
        content,
        'steering-document',
        true
      );
    });

    test('should handle consensus validation failure', async () => {
      const mockValidationResult: MaestroValidationResult = {
        valid: false,
        score: 0.3,
        errors: ['Validation error'],
        warnings: ['Validation warning'],
        suggestions: [],
        timestamp: new Date()
      };

      mockCoordinator.validate.mockResolvedValue(mockValidationResult);

      const content = 'Invalid content';
      const result = await validator.performConsensusValidation(content, SteeringDocumentType.PRODUCT);

      expect(result.consensusReached).toBe(false);
      expect(result.confidence).toBe(0.3);
      expect(result.consensusDetails.disagreements).toContain('Some quality issues identified');
    });
  });

  describe('Compliance Validation', () => {
    test('should validate compliance with requirements', async () => {
      const content = `
# Compliance Document

## Vision Statement must be present
Clear vision for the product with strategic direction.

## Mission Statement required
Well-defined mission that aligns with organizational goals.

## Architecture design documentation
Clean Architecture implementation with SOLID principles.

## Performance standards definition
Performance standards and monitoring capabilities.
      `;

      const requirements = [
        'Vision Statement must be present',
        'Mission Statement required',
        'Architecture design documentation',
        'Performance standards definition'
      ];

      const result = await validator.validateSteeringCompliance(content, requirements);

      expect(result.compliant).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.fulfilledRequirements).toHaveLength(4);
      expect(result.missingRequirements).toHaveLength(0);
      expect(result.complianceDetails.percentage).toBe(100);
    });

    test('should identify missing requirements in compliance validation', async () => {
      const content = 'Brief content without required elements';
      const requirements = [
        'Vision Statement must be present',
        'Mission Statement required',
        'Architecture documentation needed'
      ];

      const result = await validator.validateSteeringCompliance(content, requirements);

      expect(result.compliant).toBe(false);
      expect(result.missingRequirements.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.complianceDetails.percentage).toBeLessThan(100);
    });
  });

  describe('Factory Function', () => {
    test('should create validator instance correctly', () => {
      const createdValidator = createSteeringValidator(mockCoordinator, mockLogger);

      expect(createdValidator).toBeInstanceOf(SteeringValidator);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SteeringValidator initialized',
        expect.objectContaining({ rulesLoaded: expect.any(Number) })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle validation rule failures gracefully', async () => {
      // Create content that might cause validation rule issues
      const problematicContent = null as any;

      const result = await validator.validateDocument('', SteeringDocumentType.PRODUCT);

      // Validator should handle errors gracefully and return a result
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('suggestions');
    });

    test('should handle consensus validation errors', async () => {
      mockCoordinator.validate.mockRejectedValue(new Error('Consensus service unavailable'));

      await expect(
        validator.performConsensusValidation('test content', SteeringDocumentType.PRODUCT)
      ).rejects.toThrow('Consensus service unavailable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Consensus validation failed',
        expect.objectContaining({ error: 'Consensus service unavailable' })
      );
    });
  });
});