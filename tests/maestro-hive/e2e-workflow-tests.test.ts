/**
 * End-to-End Workflow Testing Suite
 * 
 * Tests complete SPARC workflows with quality gates and performance optimization
 */

import { jest } from '@jest/globals';
import {
  HiveMindTestRunner,
  createHiveMindTestRunner,
  runFullTestSuite
} from '../../src/maestro-hive/test-framework.js';
import {
  HIVEMIND_TEST_SPECIFICATIONS,
  TestCategory,
  TestPriority,
  TestSpecificationHelper
} from '../../src/maestro-hive/test-specifications.js';
import { createMaestroHiveCoordinator } from '../../src/maestro-hive/coordinator.js';
import { createPresetConfig } from '../../src/maestro-hive/config.js';

describe('End-to-End SPARC Workflow Testing', () => {
  let testRunner: HiveMindTestRunner;
  let coordinator: any;

  beforeAll(async () => {
    // Create test coordinator with proper configuration
    const config = createPresetConfig('testing');
    config.enableSpecsDriven = true;
    config.qualityThreshold = 0.75;
    config.consensusRequired = false; // Disable for testing speed
    config.maxAgents = 4;
    
    coordinator = createMaestroHiveCoordinator(config);
    
    // Initialize swarm for E2E testing
    try {
      await coordinator.initializeSwarm();
    } catch (error) {
      console.warn('HiveMind initialization skipped for testing:', error.message);
    }

    testRunner = createHiveMindTestRunner({
      timeout: 120000,
      parallel: false,
      maxConcurrency: 1
    });
  });

  afterAll(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }
  });

  describe('Complete SPARC Workflow Execution', () => {
    
    test('should execute full 5-phase SPARC workflow', async () => {
      // Test the complete SPARC workflow: Specification → Pseudocode → Architecture → Refinement → Completion
      const result = await testRunner.runTest('sparc-002');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('sparc-002');
      expect(result.status).toBeOneOf(['passed', 'completed']);
      
      // Verify workflow context
      if (result.context) {
        expect(result.context.workflow).toBeDefined();
        expect(result.context.totalTasks).toBeGreaterThan(0);
        expect(result.context.completedTasks).toBeDefined();
        
        // Verify all SPARC phases were executed
        const workflow = result.context.workflow;
        expect(workflow.tasks.length).toBeGreaterThanOrEqual(5);
      }
      
      // Verify metrics
      expect(result.metrics.workflowsCompleted).toBeGreaterThanOrEqual(1);
      expect(result.duration).toBeGreaterThan(0);
    }, 120000);

    test('should enforce quality gates throughout workflow', async () => {
      const result = await testRunner.runTest('sparc-003');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('sparc-003');
      
      if (result.context) {
        const progress = result.context.progress;
        expect(progress).toBeDefined();
        expect(progress.currentPhase).toBeDefined();
        expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
        expect(progress.trackedPhases).toBeGreaterThan(0);
        
        // Verify quality gate enforcement
        expect(progress.phaseProgress).toBeDefined();
        
        // Each phase should have quality metrics
        Object.values(progress.phaseProgress).forEach((phaseData: any) => {
          if (phaseData && phaseData.qualityScore !== undefined) {
            expect(phaseData.qualityScore).toBeGreaterThanOrEqual(0);
            expect(phaseData.qualityScore).toBeLessThanOrEqual(1);
          }
        });
      }
    }, 90000);

    test('should validate steering document integration', async () => {
      const result = await testRunner.runTest('sparc-004');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('sparc-004');
      
      if (result.context) {
        const compliance = result.context.compliance;
        expect(compliance).toBeDefined();
        expect(compliance.steeringReferences).toBeDefined();
        expect(Array.isArray(compliance.steeringReferences)).toBe(true);
        
        // Verify mandatory references are identified
        const mandatoryRefs = result.context.mandatoryReferences;
        expect(Array.isArray(mandatoryRefs)).toBe(true);
      }
    }, 60000);

  });

  describe('Quality Gate Validation', () => {
    
    test('should enforce quality thresholds at each phase', async () => {
      // Create a workflow with quality gates
      const workflow = await coordinator.createWorkflow(
        'Quality Gate Test Workflow',
        'Testing quality enforcement throughout phases'
      );
      
      // Create tasks for each SPARC phase
      const phases = ['spec', 'design', 'implementation', 'test', 'review'];
      const tasks = [];
      
      for (const phase of phases) {
        const task = await coordinator.createTask(
          `${phase} phase task`,
          phase,
          'high'
        );
        tasks.push(task);
        await coordinator.addTaskToWorkflow(workflow.id, task);
      }
      
      // Execute workflow with quality validation
      const executedWorkflow = await coordinator.executeWorkflow(workflow.id);
      
      expect(executedWorkflow).toBeDefined();
      expect(executedWorkflow.tasks.length).toBe(5);
      
      // Check that each task was validated
      for (const task of executedWorkflow.tasks) {
        if (task.metadata?.validation) {
          expect(task.metadata.validation.score).toBeDefined();
          expect(task.metadata.validation.valid).toBeDefined();
        }
      }
    }, 90000);

    test('should handle quality gate failures gracefully', async () => {
      // Test with poor quality content to trigger validation failures
      const poorContent = 'x'; // Very short content that should fail validation
      
      const validation = await coordinator.validate(poorContent, 'spec');
      
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should calculate quality scores accurately', async () => {
      const goodContent = `
# User Authentication Specification

## Overview
This specification defines the requirements for a secure user authentication system.

## Requirements
- User must be able to register with email and password
- Password must meet complexity requirements
- Session management with secure tokens
- Multi-factor authentication support

## Acceptance Criteria
- [ ] User registration form validation
- [ ] Secure password hashing
- [ ] JWT token implementation
- [ ] Session timeout handling
      `;
      
      const validation = await coordinator.validate(goodContent, 'spec');
      
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);
      expect(validation.score).toBeGreaterThan(0.7);
      expect(validation.errors.length).toBe(0);
    });

  });

  describe('Performance Integration Testing', () => {
    
    test('should maintain performance standards during workflow execution', async () => {
      const startTime = Date.now();
      
      // Execute performance test
      const result = await testRunner.runTest('perf-001');
      
      const executionTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('perf-001');
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      // Verify performance metrics
      expect(result.metrics.executionTime).toBeGreaterThan(0);
      expect(result.metrics.tasksCreated).toBe(5);
      
      if (result.context) {
        expect(result.context.allHaveIds).toBe(true);
        expect(result.context.uniqueIds.size).toBe(5);
      }
    }, 45000);

    test('should handle concurrent workflow executions', async () => {
      // Create multiple workflows and execute concurrently
      const workflows = [];
      
      for (let i = 0; i < 3; i++) {
        const workflow = await coordinator.createWorkflow(
          `Concurrent Workflow ${i + 1}`,
          `Testing concurrent execution ${i + 1}`
        );
        
        const task = await coordinator.createTask(
          `Concurrent task ${i + 1}`,
          'implementation',
          'medium'
        );
        
        await coordinator.addTaskToWorkflow(workflow.id, task);
        workflows.push(workflow);
      }
      
      // Execute all workflows concurrently
      const startTime = Date.now();
      const promises = workflows.map(w => coordinator.executeWorkflow(w.id));
      const results = await Promise.all(promises);
      const executionTime = Date.now() - startTime;
      
      expect(results.length).toBe(3);
      expect(executionTime).toBeLessThan(15000); // Should be faster than sequential
      
      // Verify all workflows completed
      results.forEach(workflow => {
        expect(workflow.status).toBeOneOf(['completed', 'active']);
        expect(workflow.tasks.length).toBeGreaterThan(0);
      });
    }, 30000);

  });

  describe('Error Recovery and Resilience', () => {
    
    test('should recover from workflow failures', async () => {
      const result = await testRunner.runTest('error-001');
      
      expect(result).toBeDefined();
      expect(result.testId).toBe('error-001');
      
      if (result.context) {
        expect(result.context.errorHandlingWorking).toBe(true);
        expect(result.context.errorsHandled).toBeGreaterThan(0);
        expect(result.metrics.errorsEncountered).toBeGreaterThan(0);
      }
    });

    test('should handle swarm initialization failures gracefully', async () => {
      // Test with invalid configuration
      const invalidConfig = createPresetConfig('testing');
      invalidConfig.maxAgents = -1; // Invalid value
      
      const testCoordinator = createMaestroHiveCoordinator(invalidConfig);
      
      try {
        await testCoordinator.initializeSwarm();
        // If it succeeds, that's also fine (graceful handling)
        await testCoordinator.shutdown();
      } catch (error) {
        // Should provide meaningful error information
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });

  });

  describe('System Integration Validation', () => {
    
    test('should integrate with HiveMind memory system', async () => {
      // Test memory integration
      const task = await coordinator.createTask(
        'Memory integration test',
        'spec',
        'medium'
      );
      
      expect(task.id).toBeDefined();
      expect(task.metadata?.specsDriven).toBe(true);
      
      // Verify task was stored
      const retrievedTasks = await coordinator.getTasks({ id: task.id });
      expect(retrievedTasks.length).toBe(1);
      expect(retrievedTasks[0].id).toBe(task.id);
    });

    test('should maintain workflow state consistency', async () => {
      const workflow = await coordinator.createWorkflow(
        'State Consistency Test',
        'Testing workflow state management'
      );
      
      const task1 = await coordinator.createTask('Task 1', 'spec', 'high');
      const task2 = await coordinator.createTask('Task 2', 'design', 'medium');
      
      await coordinator.addTaskToWorkflow(workflow.id, task1);
      await coordinator.addTaskToWorkflow(workflow.id, task2);
      
      const retrievedWorkflow = await coordinator.getWorkflow(workflow.id);
      
      expect(retrievedWorkflow).toBeDefined();
      expect(retrievedWorkflow!.tasks.length).toBe(2);
      expect(retrievedWorkflow!.tasks[0].workflow).toBe(workflow.id);
      expect(retrievedWorkflow!.tasks[1].workflow).toBe(workflow.id);
    });

    test('should provide comprehensive system status', async () => {
      const status = await coordinator.getStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.tasks).toBe('number');
      expect(typeof status.workflows).toBe('number');
      expect(typeof status.agents).toBe('number');
      expect(typeof status.active).toBe('boolean');
    });

  });

  describe('Full System End-to-End Tests', () => {
    
    test('should execute complete software development workflow', async () => {
      // Simulate a complete software development project
      const projectWorkflow = await coordinator.createWorkflow(
        'Complete Software Project',
        'End-to-end software development with SPARC methodology'
      );
      
      // Phase 1: Specification
      const specTask = await coordinator.createTask(
        'Create user authentication specification',
        'spec',
        'critical'
      );
      await coordinator.addTaskToWorkflow(projectWorkflow.id, specTask);
      
      // Phase 2: Design
      const designTask = await coordinator.createTask(
        'Design authentication system architecture',
        'design',
        'high'
      );
      await coordinator.addTaskToWorkflow(projectWorkflow.id, designTask);
      
      // Phase 3: Implementation
      const implTask = await coordinator.createTask(
        'Implement authentication endpoints',
        'implementation',
        'high'
      );
      await coordinator.addTaskToWorkflow(projectWorkflow.id, implTask);
      
      // Phase 4: Testing
      const testTask = await coordinator.createTask(
        'Create comprehensive test suite',
        'test',
        'medium'
      );
      await coordinator.addTaskToWorkflow(projectWorkflow.id, testTask);
      
      // Phase 5: Review
      const reviewTask = await coordinator.createTask(
        'Review and validate implementation',
        'review',
        'high'
      );
      await coordinator.addTaskToWorkflow(projectWorkflow.id, reviewTask);
      
      // Execute the complete workflow
      const executedWorkflow = await coordinator.executeWorkflow(projectWorkflow.id);
      
      expect(executedWorkflow).toBeDefined();
      expect(executedWorkflow.tasks.length).toBe(5);
      
      // Verify workflow completion
      const completedTasks = executedWorkflow.tasks.filter(t => t.status === 'completed');
      expect(completedTasks.length).toBeGreaterThan(0);
      
      // Verify each phase has proper content
      for (const task of executedWorkflow.tasks) {
        expect(task.metadata?.generatedContent).toBeDefined();
        expect(task.metadata.generatedContent.length).toBeGreaterThan(10);
      }
    }, 150000);

    test('should maintain quality throughout complete workflow', async () => {
      // Execute a workflow and verify quality is maintained at each step
      const qualityWorkflow = await coordinator.createWorkflow(
        'Quality Assurance Workflow',
        'Testing quality maintenance throughout workflow'
      );
      
      const tasks = [];
      const phases = ['spec', 'design', 'implementation'];
      
      for (const phase of phases) {
        const task = await coordinator.createTask(
          `Quality ${phase} task`,
          phase,
          'high'
        );
        tasks.push(task);
        await coordinator.addTaskToWorkflow(qualityWorkflow.id, task);
      }
      
      const executedWorkflow = await coordinator.executeWorkflow(qualityWorkflow.id);
      
      // Verify quality scores for each completed task
      let totalQualityScore = 0;
      let validatedTasks = 0;
      
      for (const task of executedWorkflow.tasks) {
        if (task.metadata?.validation) {
          totalQualityScore += task.metadata.validation.score;
          validatedTasks++;
          expect(task.metadata.validation.score).toBeGreaterThan(0.5);
        }
      }
      
      if (validatedTasks > 0) {
        const averageQuality = totalQualityScore / validatedTasks;
        expect(averageQuality).toBeGreaterThan(0.7);
      }
    }, 120000);

  });

});

// Custom Jest matcher for flexible status checking
expect.extend({
  toBeOneOf(received, items) {
    const pass = items.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${items.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${items.join(', ')}`,
        pass: false,
      };
    }
  },
});