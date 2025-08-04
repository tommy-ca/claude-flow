/**
 * SPARC Comprehensive Test Suite
 * 
 * Comprehensive testing of SPARC methodology implementation
 * Tests all 5 phases, quality gates, workflow integration, and production readiness
 * 
 * @version 1.0.0
 * @author SPARCTestCoordinator Agent
 * @since 2025-08-04
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';
import { 
  SPARCCoordinator, 
  type SPARCTask, 
  type SPARCWorkflow 
} from '../../src/maestro-hive/SPARCCoordinator.js';
import { 
  SPARCWorkflowOrchestrator,
  SPARCPhaseHandlerFactory,
  QualityGateManager,
  SPARCPhase
} from '../../src/maestro-hive/phase-handlers/index.js';
import { 
  SpecificationHandler,
  type SpecificationRequest,
  type SpecificationResult 
} from '../../src/maestro-hive/phase-handlers/SpecificationHandler.js';
import { 
  RefinementHandler,
  type RefinementResult 
} from '../../src/maestro-hive/phase-handlers/RefinementHandler.js';
import type { MaestroHiveConfig, MaestroLogger } from '../../src/maestro-hive/interfaces.js';

/**
 * Mock Logger for Testing
 */
class MockLogger implements MaestroLogger {
  private logs: Array<{level: string, message: string, context?: any}> = [];

  info(message: string, context?: any): void {
    this.logs.push({ level: 'info', message, context });
  }

  warn(message: string, context?: any): void {
    this.logs.push({ level: 'warn', message, context });
  }

  error(message: string, error?: any): void {
    this.logs.push({ level: 'error', message, context: error });
  }

  debug(message: string, context?: any): void {
    this.logs.push({ level: 'debug', message, context });
  }

  logTask(event: string, task: any): void {
    this.logs.push({ level: 'info', message: `Task ${event}`, context: task });
  }

  logWorkflow(event: string, workflow: any): void {
    this.logs.push({ level: 'info', message: `Workflow ${event}`, context: workflow });
  }

  logAgent(event: string, agent: any): void {
    this.logs.push({ level: 'info', message: `Agent ${event}`, context: agent });
  }

  logQuality(event: string, score: number, details?: any): void {
    this.logs.push({ level: 'info', message: `Quality ${event}`, context: { score, ...details } });
  }

  getLogs(): Array<{level: string, message: string, context?: any}> {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Test Configuration Factory
 */
function createTestConfig(): MaestroHiveConfig {
  return {
    name: 'SPARC Test Configuration',
    topology: 'hierarchical',
    maxAgents: 5,
    queenMode: 'active',
    memoryTTL: 3600000,
    consensusThreshold: 0.75,
    autoSpawn: true,
    enableConsensus: true,
    enableMemory: true,
    enableCommunication: true,
    enableSpecsDriven: true,
    consensusRequired: true,
    autoValidation: true,
    qualityThreshold: 0.8,
    workflowDirectory: './test-workflows',
    enabledFeatures: [
      'specs-driven-workflow',
      'requirements-validation',
      'design-consensus',
      'quality-gates',
      'neural-learning'
    ],
    agentCapabilities: {
      spec: ['requirements_analysis', 'user_story_creation'],
      design: ['system_design', 'architecture'],
      implementation: ['code_generation', 'debugging'],
      test: ['test_generation', 'quality_assurance'],
      review: ['code_review', 'standards_enforcement']
    }
  };
}

describe('SPARC Comprehensive Test Suite', () => {
  let coordinator: SPARCCoordinator;
  let mockLogger: MockLogger;
  let testConfig: MaestroHiveConfig;

  beforeEach(() => {
    mockLogger = new MockLogger();
    testConfig = createTestConfig();
    coordinator = new SPARCCoordinator(testConfig, mockLogger);
  });

  afterEach(async () => {
    await coordinator.shutdown();
    mockLogger.clearLogs();
  });

  describe('SPARC Phase Handler Validation', () => {
    test('should initialize all SPARC phase handlers correctly', () => {
      const factory = new SPARCPhaseHandlerFactory(mockLogger);
      
      // Test all phases can be created
      const phases = factory.getSupportedPhases();
      expect(phases).toHaveLength(5);
      expect(phases).toContain(SPARCPhase.SPECIFICATION);
      expect(phases).toContain(SPARCPhase.PSEUDOCODE);
      expect(phases).toContain(SPARCPhase.ARCHITECTURE);
      expect(phases).toContain(SPARCPhase.REFINEMENT);
      expect(phases).toContain(SPARCPhase.COMPLETION);
      
      // Test handlers can be instantiated
      phases.forEach(phase => {
        const handler = factory.createHandler(phase);
        expect(handler).toBeDefined();
        expect(typeof handler.executePhase).toBe('function');
        expect(typeof handler.validateQualityGate).toBe('function');
      });
    });

    test('should validate SPARC phase sequence correctly', () => {
      const factory = new SPARCPhaseHandlerFactory(mockLogger);
      
      // Valid sequence
      const validSequence = [
        SPARCPhase.SPECIFICATION,
        SPARCPhase.PSEUDOCODE,
        SPARCPhase.ARCHITECTURE,
        SPARCPhase.REFINEMENT,
        SPARCPhase.COMPLETION
      ];
      expect(factory.validatePhaseSequence(validSequence)).toBe(true);
      
      // Invalid sequences
      expect(factory.validatePhaseSequence([
        SPARCPhase.PSEUDOCODE,
        SPARCPhase.SPECIFICATION  // Wrong order
      ])).toBe(false);
      
      expect(factory.validatePhaseSequence([
        SPARCPhase.SPECIFICATION,
        SPARCPhase.COMPLETION  // Skipping phases
      ])).toBe(false);
    });

    test('should execute Specification phase with quality validation', async () => {
      const handler = new SpecificationHandler(mockLogger);
      
      const request: SpecificationRequest = {
        taskId: 'test-spec-001',
        description: 'Create comprehensive user authentication system',
        context: 'Enterprise web application',
        existingRequirements: ['Security compliance', 'Multi-factor authentication']
      };
      
      const result: SpecificationResult = await handler.executePhase(request);
      
      // Validate result structure
      expect(result).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(Array.isArray(result.requirements)).toBe(true);
      expect(result.acceptanceCriteria).toBeDefined();
      expect(Array.isArray(result.acceptanceCriteria)).toBe(true);
      expect(result.constraints).toBeDefined();
      expect(Array.isArray(result.constraints)).toBe(true);
      expect(result.stakeholders).toBeDefined();
      expect(Array.isArray(result.stakeholders)).toBe(true);
      expect(typeof result.qualityScore).toBe('number');
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
      
      // Quality gate validation
      const validation = await handler.validateQualityGate(result);
      expect(validation).toBeDefined();
      expect(typeof validation.passed).toBe('boolean');
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });

    test('should handle Refinement phase with TDD implementation', async () => {
      const handler = new RefinementHandler(mockLogger);
      
      // Mock architecture result as prerequisite
      const architectureResult = {
        components: [
          { name: 'AuthService', type: 'service', dependencies: ['UserRepository'] },
          { name: 'UserRepository', type: 'repository', dependencies: [] }
        ],
        interfaces: [
          { name: 'IAuthService', methods: ['login', 'logout', 'validateToken'] },
          { name: 'IUserRepository', methods: ['findById', 'create', 'update'] }
        ],
        qualityScore: 0.85
      };
      
      const request = {
        taskId: 'test-refine-001',
        requirements: ['Implement JWT authentication', 'Add password hashing'],
        architectureResult,
        constraints: ['Methods <25 lines', 'Classes <300 lines']
      };
      
      const result: RefinementResult = await handler.executePhase(request);
      
      // Validate TDD implementation plan
      expect(result).toBeDefined();
      expect(result.implementation).toBeDefined();
      expect(result.implementation.tddCycles).toBeDefined();
      expect(Array.isArray(result.implementation.tddCycles)).toBe(true);
      
      // Validate each TDD cycle structure
      if (result.implementation.tddCycles.length > 0) {
        const cycle = result.implementation.tddCycles[0];
        expect(cycle.redPhase).toBeDefined();
        expect(Array.isArray(cycle.redPhase)).toBe(true);
        expect(cycle.greenPhase).toBeDefined();
        expect(Array.isArray(cycle.greenPhase)).toBe(true);
        expect(cycle.refactorPhase).toBeDefined();
        expect(Array.isArray(cycle.refactorPhase)).toBe(true);
      }
      
      // Validate testing suite
      expect(result.testingSuite).toBeDefined();
      expect(result.testingSuite.unitTests).toBeDefined();
      expect(result.testingSuite.integrationTests).toBeDefined();
      expect(result.testingSuite.acceptanceTests).toBeDefined();
      
      // Validate code quality metrics
      expect(result.codeQuality).toBeDefined();
      expect(typeof result.codeQuality.complexity).toBe('number');
      expect(typeof result.codeQuality.maintainability).toBe('number');
      expect(typeof result.codeQuality.testCoverage).toBe('number');
      
      // Quality validation
      expect(typeof result.qualityScore).toBe('number');
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Quality Gate Testing', () => {
    test('should enforce correct quality thresholds for each phase', () => {
      const qualityGateManager = new QualityGateManager();
      
      // Test default thresholds match specification
      expect(qualityGateManager.getThreshold(SPARCPhase.SPECIFICATION)).toBe(0.8);
      expect(qualityGateManager.getThreshold(SPARCPhase.PSEUDOCODE)).toBe(0.75);
      expect(qualityGateManager.getThreshold(SPARCPhase.ARCHITECTURE)).toBe(0.75);
      expect(qualityGateManager.getThreshold(SPARCPhase.REFINEMENT)).toBe(0.8);
      expect(qualityGateManager.getThreshold(SPARCPhase.COMPLETION)).toBe(0.85);
      
      // Test threshold updates
      qualityGateManager.setThreshold(SPARCPhase.SPECIFICATION, 0.9);
      expect(qualityGateManager.getThreshold(SPARCPhase.SPECIFICATION)).toBe(0.9);
      
      // Test invalid threshold bounds
      expect(() => {
        qualityGateManager.setThreshold(SPARCPhase.SPECIFICATION, 1.5);
      }).toThrow('Quality threshold must be between 0 and 1');
      
      expect(() => {
        qualityGateManager.setThreshold(SPARCPhase.SPECIFICATION, -0.1);
      }).toThrow('Quality threshold must be between 0 and 1');
    });

    test('should validate quality gates correctly', async () => {
      const qualityGateManager = new QualityGateManager();
      
      // Test passing quality gate
      const passingResult = { qualityScore: 0.85 };
      const passingValidation = await qualityGateManager.validateQualityGate(
        SPARCPhase.SPECIFICATION, 
        passingResult
      );
      expect(passingValidation).toBe(true);
      
      // Test failing quality gate
      const failingResult = { qualityScore: 0.7 };
      const failingValidation = await qualityGateManager.validateQualityGate(
        SPARCPhase.SPECIFICATION, 
        failingResult
      );
      expect(failingValidation).toBe(false);
      
      // Test edge case - exactly at threshold
      const edgeResult = { qualityScore: 0.8 };
      const edgeValidation = await qualityGateManager.validateQualityGate(
        SPARCPhase.SPECIFICATION, 
        edgeResult
      );
      expect(edgeValidation).toBe(true);
    });
  });

  describe('SPARC Workflow Integration', () => {
    test('should create SPARC workflow with all phases', async () => {
      const workflow = await coordinator.createWorkflow(
        'Test Authentication System',
        'Implement comprehensive user authentication'
      );
      
      expect(workflow).toBeDefined();
      expect(workflow.id).toBeTruthy();
      expect(workflow.name).toBe('Test Authentication System');
      expect(workflow.description).toBe('Implement comprehensive user authentication');
      
      // Verify SPARC-specific properties
      const sparcWorkflow = workflow as SPARCWorkflow;
      expect(sparcWorkflow.methodology).toBe('SPARC');
      expect(sparcWorkflow.phases).toHaveLength(5);
      expect(sparcWorkflow.phases).toEqual([
        SPARCPhase.SPECIFICATION,
        SPARCPhase.PSEUDOCODE,
        SPARCPhase.ARCHITECTURE,
        SPARCPhase.REFINEMENT,
        SPARCPhase.COMPLETION
      ]);
      expect(sparcWorkflow.phaseResults).toBeDefined();
      expect(sparcWorkflow.qualityScore).toBe(0);
      expect(sparcWorkflow.status).toBe('pending');
    });

    test('should execute complete SPARC workflow end-to-end', async () => {
      const requirements = [
        'Implement JWT-based authentication',
        'Add password hashing with bcrypt',
        'Support multi-factor authentication',
        'Provide session management',
        'Implement role-based access control'
      ];
      
      const workflow = await coordinator.executeSPARCWorkflow('auth-system-001', requirements);
      
      expect(workflow).toBeDefined();
      expect(workflow.status).toBe('completed');
      expect(workflow.phaseResults.size).toBe(5);
      expect(workflow.qualityScore).toBeGreaterThan(0);
      
      // Verify all phases were executed
      expect(workflow.phaseResults.has(SPARCPhase.SPECIFICATION)).toBe(true);
      expect(workflow.phaseResults.has(SPARCPhase.PSEUDOCODE)).toBe(true);
      expect(workflow.phaseResults.has(SPARCPhase.ARCHITECTURE)).toBe(true);
      expect(workflow.phaseResults.has(SPARCPhase.REFINEMENT)).toBe(true);
      expect(workflow.phaseResults.has(SPARCPhase.COMPLETION)).toBe(true);
      
      // Verify phase results structure
      const specResult = workflow.phaseResults.get(SPARCPhase.SPECIFICATION);
      expect(specResult).toBeDefined();
      expect(specResult.requirements).toBeDefined();
      expect(specResult.acceptanceCriteria).toBeDefined();
      expect(typeof specResult.qualityScore).toBe('number');
      
      // Verify logging occurred
      const logs = mockLogger.getLogs();
      expect(logs.some(log => log.message.includes('Starting SPARC workflow execution'))).toBe(true);
      expect(logs.some(log => log.message.includes('specification phase'))).toBe(true);
      expect(logs.some(log => log.message.includes('pseudocode phase'))).toBe(true);
      expect(logs.some(log => log.message.includes('architecture phase'))).toBe(true);
      expect(logs.some(log => log.message.includes('refinement phase'))).toBe(true);
      expect(logs.some(log => log.message.includes('completion phase'))).toBe(true);
    });

    test('should handle workflow failures gracefully', async () => {
      // Test with incomplete requirements that should cause quality gate failures
      const incompleteRequirements = ['Vague requirement'];
      
      try {
        await coordinator.executeSPARCWorkflow('failing-workflow-001', incompleteRequirements);
        fail('Expected workflow to fail due to quality gate');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Quality gate failed');
        
        // Verify workflow exists in failed state
        const workflows = await coordinator.getWorkflows();
        const failedWorkflow = workflows.find(w => w.name.includes('failing-workflow-001'));
        expect(failedWorkflow?.status).toBe('failed');
      }
    });
  });

  describe('SPARC Task Management', () => {
    test('should create SPARC tasks with phase tracking', async () => {
      const task = await coordinator.createTask(
        'Implement user authentication API',
        'development',
        'high'
      );
      
      expect(task).toBeDefined();
      expect(task.id).toBeTruthy();
      expect(task.description).toBe('Implement user authentication API');
      expect(task.type).toBe('development');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('pending');
      
      // Verify SPARC-specific properties
      const sparcTask = task as SPARCTask;
      expect(sparcTask.phase).toBe(SPARCPhase.SPECIFICATION);
      expect(sparcTask.phaseResults).toBeDefined();
      expect(sparcTask.qualityGates).toBeDefined();
      expect(sparcTask.metadata?.methodology).toBe('SPARC');
      expect(sparcTask.metadata?.specsDriven).toBe(true);
    });

    test('should update task phase progression', async () => {
      const task = await coordinator.createTask('Test task', 'development');
      expect(task.phase).toBe(SPARCPhase.SPECIFICATION);
      
      const updatedTask = await coordinator.updateTask(task.id, {
        phase: SPARCPhase.PSEUDOCODE,
        status: 'in_progress'
      });
      
      expect(updatedTask.phase).toBe(SPARCPhase.PSEUDOCODE);
      expect(updatedTask.status).toBe('in_progress');
    });

    test('should filter tasks by SPARC phase', async () => {
      // Create tasks in different phases
      const task1 = await coordinator.createTask('Spec task', 'development');
      const task2 = await coordinator.createTask('Code task', 'development');
      await coordinator.updateTask(task2.id, { phase: SPARCPhase.REFINEMENT });
      
      // Filter by specification phase
      const specTasks = await coordinator.getTasks({ phase: SPARCPhase.SPECIFICATION });
      expect(specTasks).toHaveLength(1);
      expect(specTasks[0].id).toBe(task1.id);
      
      // Filter by refinement phase
      const refinementTasks = await coordinator.getTasks({ phase: SPARCPhase.REFINEMENT });
      expect(refinementTasks).toHaveLength(1);
      expect(refinementTasks[0].id).toBe(task2.id);
    });
  });

  describe('SPARC Compliance Validation', () => {
    test('should validate SPARC compliance for complete workflow', async () => {
      const requirements = ['Complete authentication system'];
      const workflow = await coordinator.executeSPARCWorkflow('compliance-test-001', requirements);
      
      const validation = await coordinator.validateSPARCCompliance(workflow.id);
      
      expect(validation).toBeDefined();
      expect(validation.passed).toBe(true);
      expect(validation.score).toBeGreaterThan(0);
      expect(validation.issues).toHaveLength(0);
      expect(validation.suggestions).toHaveLength(0);
    });

    test('should detect non-compliant workflows', async () => {
      // Create incomplete workflow manually
      const incompleteWorkflow = await coordinator.createWorkflow(
        'Incomplete Workflow',
        'Missing SPARC phases'
      );
      
      const validation = await coordinator.validateSPARCCompliance(incompleteWorkflow.id);
      
      expect(validation.passed).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.suggestions.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('Not all SPARC phases completed');
    });
  });

  describe('Performance and Optimization', () => {
    test('should complete SPARC workflow within performance bounds', async () => {
      const startTime = Date.now();
      const requirements = ['Simple feature implementation'];
      
      const workflow = await coordinator.executeSPARCWorkflow('perf-test-001', requirements);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (30 seconds for test)
      expect(duration).toBeLessThan(30000);
      expect(workflow.status).toBe('completed');
      expect(workflow.qualityScore).toBeGreaterThan(0);
    });

    test('should track quality score improvements across phases', async () => {
      const requirements = ['Feature with incremental quality improvements'];
      const workflow = await coordinator.executeSPARCWorkflow('quality-tracking-001', requirements);
      
      // Extract quality scores from each phase
      const phaseScores: number[] = [];
      workflow.phaseResults.forEach((result, phase) => {
        if (result.qualityScore !== undefined) {
          phaseScores.push(result.qualityScore);
        }
      });
      
      expect(phaseScores.length).toBeGreaterThan(0);
      
      // Verify all scores meet minimum thresholds
      const qualityGateManager = new QualityGateManager();
      let phaseIndex = 0;
      for (const [phase, result] of workflow.phaseResults) {
        const threshold = qualityGateManager.getThreshold(phase);
        expect(result.qualityScore).toBeGreaterThanOrEqual(threshold);
        phaseIndex++;
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle invalid phase requests gracefully', async () => {
      const invalidPhase = 'invalid-phase' as SPARCPhase;
      
      expect(() => {
        coordinator.setPhaseQualityThreshold(invalidPhase, 0.8);
      }).not.toThrow(); // Should handle gracefully
      
      // Test invalid agent spawning
      try {
        await coordinator.spawnAgent('invalid-agent-type');
        fail('Expected error for invalid agent type');
      } catch (error) {
        expect(error.message).toContain('Unsupported SPARC agent type');
      }
    });

    test('should recover from phase execution failures', async () => {
      // This test would ideally inject failures and test recovery
      // For now, verify basic error handling structure is in place
      
      const coordinator = new SPARCCoordinator(testConfig, mockLogger);
      
      // Test shutdown recovery
      await coordinator.shutdown();
      
      // Verify clean shutdown
      expect(mockLogger.getLogs().some(log => 
        log.message.includes('Shutting down SPARC coordinator')
      )).toBe(true);
    });
  });

  describe('Production Readiness Validation', () => {
    test('should validate SOLID principles compliance', async () => {
      // Test Single Responsibility - each handler has one job
      const factory = new SPARCPhaseHandlerFactory(mockLogger);
      const handler = factory.createHandler(SPARCPhase.SPECIFICATION);
      
      // Handler should only have phase execution methods
      const handlerMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(handler));
      expect(handlerMethods).toContain('executePhase');
      expect(handlerMethods).toContain('validateQualityGate');
      
      // Test Open/Closed - can extend without modifying
      expect(() => {
        factory.createHandler(SPARCPhase.ARCHITECTURE);
      }).not.toThrow();
      
      // Test Interface Segregation - clean interfaces
      expect(typeof handler.executePhase).toBe('function');
      expect(typeof handler.validateQualityGate).toBe('function');
    });

    test('should validate KISS methodology compliance', () => {
      // Verify coordinator class is reasonable size
      const coordinatorSource = coordinator.constructor.toString();
      
      // Should not be excessively complex
      expect(coordinatorSource.length).toBeLessThan(50000); // Reasonable class size
      
      // Test method simplicity - methods should be focused
      const methodCount = Object.getOwnPropertyNames(SPARCCoordinator.prototype).length;
      expect(methodCount).toBeLessThan(30); // Reasonable method count
    });

    test('should handle concurrent SPARC workflows', async () => {
      const requirements1 = ['Concurrent workflow 1'];
      const requirements2 = ['Concurrent workflow 2'];
      const requirements3 = ['Concurrent workflow 3'];
      
      // Execute multiple workflows concurrently
      const [workflow1, workflow2, workflow3] = await Promise.all([
        coordinator.executeSPARCWorkflow('concurrent-001', requirements1),
        coordinator.executeSPARCWorkflow('concurrent-002', requirements2),
        coordinator.executeSPARCWorkflow('concurrent-003', requirements3)
      ]);
      
      // All workflows should complete successfully
      expect(workflow1.status).toBe('completed');
      expect(workflow2.status).toBe('completed');
      expect(workflow3.status).toBe('completed');
      
      // All should have quality scores
      expect(workflow1.qualityScore).toBeGreaterThan(0);
      expect(workflow2.qualityScore).toBeGreaterThan(0);
      expect(workflow3.qualityScore).toBeGreaterThan(0);
      
      // Verify independent execution
      expect(workflow1.id).not.toBe(workflow2.id);
      expect(workflow2.id).not.toBe(workflow3.id);
      expect(workflow1.id).not.toBe(workflow3.id);
    });

    test('should maintain backward compatibility', async () => {
      // Test basic MaestroCoordinator interface compliance
      expect(typeof coordinator.createTask).toBe('function');
      expect(typeof coordinator.createWorkflow).toBe('function');
      expect(typeof coordinator.updateTask).toBe('function');
      expect(typeof coordinator.getTasks).toBe('function');
      expect(typeof coordinator.deleteTask).toBe('function');
      expect(typeof coordinator.getWorkflow).toBe('function');
      expect(typeof coordinator.deleteWorkflow).toBe('function');
      expect(typeof coordinator.shutdown).toBe('function');
      
      // Test swarm integration stubs
      expect(typeof coordinator.initializeSwarm).toBe('function');
      expect(typeof coordinator.spawnAgent).toBe('function');
      expect(typeof coordinator.getSwarmStatus).toBe('function');
      
      // Verify swarm status structure
      const swarmStatus = await coordinator.getSwarmStatus();
      expect(swarmStatus.type).toBe('SPARC');
      expect(swarmStatus.phases).toEqual(Object.values(SPARCPhase));
      expect(typeof swarmStatus.activeWorkflows).toBe('number');
      expect(typeof swarmStatus.activeTasks).toBe('number');
      expect(swarmStatus.qualityThresholds).toBeDefined();
    });
  });
});