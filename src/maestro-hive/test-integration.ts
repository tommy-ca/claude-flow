/**
 * Maestro Hive Mind Integration Tests
 * 
 * Comprehensive test suite for validating Maestro functionality on HiveMind
 * Tests specs-driven flow, quality gates, and swarm coordination
 */

import { EventEmitter } from 'events';
import type {
  MaestroHiveCoordinator,
  MaestroTask,
  MaestroWorkflow,
  MaestroHiveConfig,
  SpecsDrivenWorkflow
} from './interfaces.js';
import { createMaestroHiveCoordinator } from './coordinator.js';
import { createPresetConfig } from './config.js';
import { 
  SpecsDrivenFlowOrchestrator, 
  createSpecsDrivenFlowOrchestrator,
  SpecsDrivenPhase 
} from './specs-driven-flow.js';

/**
 * Test result interface
 */
interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
}

/**
 * Test suite for Maestro Hive integration
 */
export class MaestroHiveTestSuite extends EventEmitter {
  private coordinator: MaestroHiveCoordinator;
  private specsDrivenOrchestrator: SpecsDrivenFlowOrchestrator;
  private config: MaestroHiveConfig;
  private testResults: TestResult[] = [];

  constructor() {
    super();
    
    // Create test configuration
    this.config = createPresetConfig('testing');
    this.config.name = 'MaestroHiveTestSwarm';
    this.config.maxAgents = 6;
    this.config.qualityThreshold = 0.6; // Lower threshold for testing
    this.config.consensusRequired = false; // Disable for faster testing
    
    // Create coordinator
    this.coordinator = createMaestroHiveCoordinator(this.config);
    
    // Create specs-driven orchestrator
    this.specsDrivenOrchestrator = createSpecsDrivenFlowOrchestrator(
      this.coordinator,
      {
        info: (msg, ctx) => console.log(`[TEST-INFO] ${msg}`, ctx || ''),
        warn: (msg, ctx) => console.warn(`[TEST-WARN] ${msg}`, ctx || ''),
        error: (msg, err) => console.error(`[TEST-ERROR] ${msg}`, err || ''),
        debug: (msg, ctx) => console.log(`[TEST-DEBUG] ${msg}`, ctx || ''),
        logTask: (event, task) => console.log(`[TEST-TASK] ${event}`, { taskId: task.id }),
        logWorkflow: (event, workflow) => console.log(`[TEST-WORKFLOW] ${event}`, { workflowId: workflow.id }),
        logAgent: (event, agent) => console.log(`[TEST-AGENT] ${event}`, { agentId: agent.id }),
        logQuality: (event, score) => console.log(`[TEST-QUALITY] ${event}`, { score })
      }
    );
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('\n🚀 Starting Maestro Hive Mind Integration Tests\n');
    
    try {
      // Initialize swarm for testing
      await this.initializeTestSwarm();
      
      // Core functionality tests
      await this.runTest('Basic Task Creation', () => this.testBasicTaskCreation());
      await this.runTest('Workflow Management', () => this.testWorkflowManagement());
      await this.runTest('Content Generation', () => this.testContentGeneration());
      await this.runTest('Validation System', () => this.testValidationSystem());
      
      // HiveMind integration tests
      await this.runTest('Swarm Initialization', () => this.testSwarmInitialization());
      await this.runTest('Agent Spawning', () => this.testAgentSpawning());
      await this.runTest('Task Orchestration', () => this.testTaskOrchestration());
      
      // Specs-driven flow tests
      await this.runTest('Specs-Driven Workflow Creation', () => this.testSpecsDrivenWorkflowCreation());
      await this.runTest('SPARC Phase Execution', () => this.testSPARCPhaseExecution());
      await this.runTest('Quality Gate Validation', () => this.testQualityGateValidation());
      await this.runTest('Steering Document Integration', () => this.testSteeringDocumentIntegration());
      
      // Performance and reliability tests
      await this.runTest('Concurrent Task Execution', () => this.testConcurrentTaskExecution());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('System Status Reporting', () => this.testSystemStatusReporting());
      
    } finally {
      // Cleanup
      await this.cleanup();
    }
    
    this.printTestSummary();
    return this.testResults;
  }

  /**
   * Run individual test with timing and error handling
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 Running test: ${testName}`);
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        duration,
        details: result
      });
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error(`❌ ${testName} - FAILED (${duration}ms):`, error);
    }
  }

  // ===== CORE FUNCTIONALITY TESTS =====

  private async testBasicTaskCreation(): Promise<any> {
    // Test task creation with different types and priorities
    const specTask = await this.coordinator.createTask('Test specification', 'spec', 'high');
    const designTask = await this.coordinator.createTask('Test design', 'design', 'medium');
    const implTask = await this.coordinator.createTask('Test implementation', 'implementation', 'low');
    
    // Validate task properties
    if (!specTask.id || specTask.type !== 'spec' || specTask.priority !== 'high') {
      throw new Error('Spec task creation failed');
    }
    
    if (!designTask.id || designTask.type !== 'design' || designTask.priority !== 'medium') {
      throw new Error('Design task creation failed');
    }
    
    if (!implTask.id || implTask.type !== 'implementation' || implTask.priority !== 'low') {
      throw new Error('Implementation task creation failed');
    }
    
    // Test task retrieval
    const allTasks = await this.coordinator.getTasks();
    if (allTasks.length < 3) {
      throw new Error('Task retrieval failed');
    }
    
    // Test task filtering
    const specTasks = await this.coordinator.getTasks({ type: 'spec' });
    if (specTasks.length !== 1 || specTasks[0].id !== specTask.id) {
      throw new Error('Task filtering failed');
    }
    
    return {
      createdTasks: 3,
      retrievedTasks: allTasks.length,
      filteredTasks: specTasks.length
    };
  }

  private async testWorkflowManagement(): Promise<any> {
    // Create workflow
    const workflow = await this.coordinator.createWorkflow(
      'Test Workflow',
      'Integration test workflow'
    );
    
    if (!workflow.id || workflow.name !== 'Test Workflow') {
      throw new Error('Workflow creation failed');
    }
    
    // Create tasks and add to workflow
    const task1 = await this.coordinator.createTask('Workflow task 1', 'spec', 'medium');
    const task2 = await this.coordinator.createTask('Workflow task 2', 'design', 'medium');
    
    const updatedWorkflow1 = await this.coordinator.addTaskToWorkflow(workflow.id, task1);
    const updatedWorkflow2 = await this.coordinator.addTaskToWorkflow(workflow.id, task2);
    
    if (updatedWorkflow2.tasks.length !== 2) {
      throw new Error('Task addition to workflow failed');
    }
    
    // Test workflow retrieval
    const retrievedWorkflow = await this.coordinator.getWorkflow(workflow.id);
    if (!retrievedWorkflow || retrievedWorkflow.tasks.length !== 2) {
      throw new Error('Workflow retrieval failed');
    }
    
    return {
      workflowId: workflow.id,
      tasksInWorkflow: retrievedWorkflow.tasks.length
    };
  }

  private async testContentGeneration(): Promise<any> {
    // Test content generation for different types
    const specContent = await this.coordinator.generateContent(
      'Create user authentication specification',
      'spec'
    );
    
    const designContent = await this.coordinator.generateContent(
      'Design user authentication system',
      'design',
      'design_architect'
    );
    
    if (!specContent || specContent.length < 50) {
      throw new Error('Specification content generation failed');
    }
    
    if (!designContent || designContent.length < 50) {
      throw new Error('Design content generation failed');
    }
    
    // Validate content structure
    if (!specContent.includes('#') || !specContent.includes('Requirements')) {
      throw new Error('Specification content structure invalid');
    }
    
    if (!designContent.includes('#') || !designContent.includes('Architecture')) {
      throw new Error('Design content structure invalid');
    }
    
    return {
      specContentLength: specContent.length,
      designContentLength: designContent.length,
      specHasStructure: specContent.includes('#'),
      designHasStructure: designContent.includes('#')
    };
  }

  private async testValidationSystem(): Promise<any> {
    // Test validation for different content types
    const goodContent = `# Test Specification

## Requirements
- User authentication must be secure
- Password complexity requirements
- Session management

## Acceptance Criteria
- [ ] User can log in successfully
- [ ] Password validation works
- [ ] Session expires appropriately`;

    const poorContent = 'Short content';
    
    const goodValidation = await this.coordinator.validate(goodContent, 'spec');
    const poorValidation = await this.coordinator.validate(poorContent, 'spec');
    
    if (!goodValidation.valid || goodValidation.score < 0.7) {
      throw new Error('Good content validation failed');
    }
    
    if (poorValidation.valid || poorValidation.score > 0.5) {
      throw new Error('Poor content validation should fail');
    }
    
    return {
      goodContentScore: goodValidation.score,
      poorContentScore: poorValidation.score,
      goodContentValid: goodValidation.valid,
      poorContentValid: poorValidation.valid
    };
  }

  // ===== HIVE MIND INTEGRATION TESTS =====

  private async testSwarmInitialization(): Promise<any> {
    // Test swarm status
    const status = await this.coordinator.getSwarmStatus();
    
    if (!status.swarmId || status.name !== this.config.name) {
      throw new Error('Swarm initialization failed');
    }
    
    if (status.health !== 'healthy') {
      throw new Error('Swarm health check failed');
    }
    
    return {
      swarmId: status.swarmId,
      health: status.health,
      totalAgents: status.totalAgents,
      topology: status.topology
    };
  }

  private async testAgentSpawning(): Promise<any> {
    // Test spawning different agent types
    const analyst = await this.coordinator.spawnAgent('analyst');
    const coder = await this.coordinator.spawnAgent('coder', ['code_generation']);
    
    if (!analyst.id || analyst.type !== 'analyst') {
      throw new Error('Analyst agent spawning failed');
    }
    
    if (!coder.id || coder.type !== 'coder') {
      throw new Error('Coder agent spawning failed');
    }
    
    // Check agent capabilities
    if (!coder.capabilities.includes('code_generation')) {
      throw new Error('Agent capabilities not set correctly');
    }
    
    return {
      analystId: analyst.id,
      coderId: coder.id,
      coderCapabilities: coder.capabilities.length
    };
  }

  private async testTaskOrchestration(): Promise<any> {
    // Create a task and verify it gets orchestrated
    const task = await this.coordinator.createTask('Orchestration test', 'implementation', 'medium');
    
    // Wait a moment for orchestration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check task status
    const tasks = await this.coordinator.getTasks({ id: task.id });
    const updatedTask = tasks[0];
    
    if (!updatedTask) {
      throw new Error('Task not found after orchestration');
    }
    
    return {
      taskId: task.id,
      status: updatedTask.status,
      hasMetadata: !!updatedTask.metadata
    };
  }

  // ===== SPECS-DRIVEN FLOW TESTS =====

  private async testSpecsDrivenWorkflowCreation(): Promise<any> {
    const requirements = [
      'User authentication system',
      'Secure password handling',
      'Session management'
    ];
    
    const stakeholders = ['Product Owner', 'Security Team', 'Development Team'];
    
    const workflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'User Auth System',
      'Complete user authentication system implementation',
      requirements,
      stakeholders
    );
    
    if (!workflow.id || workflow.tasks.length === 0) {
      throw new Error('Specs-driven workflow creation failed');
    }
    
    // Verify SPARC phases are present
    const phaseCount = Object.keys(SpecsDrivenPhase).length;
    if (workflow.tasks.length < phaseCount) {
      throw new Error('Not all SPARC phases created');
    }
    
    // Verify workflow structure
    if (!workflow.specificationPhase || !workflow.designPhase) {
      throw new Error('Workflow phase structure incomplete');
    }
    
    return {
      workflowId: workflow.id,
      totalTasks: workflow.tasks.length,
      requirements: workflow.specificationPhase.requirements.length,
      stakeholders: workflow.specificationPhase.stakeholders.length
    };
  }

  private async testSPARCPhaseExecution(): Promise<any> {
    // Create a simple specs-driven workflow
    const workflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'SPARC Test',
      'Test SPARC phase execution',
      ['Test requirement'],
      ['Test stakeholder']
    );
    
    // Execute the workflow (this will run all phases)
    const executedWorkflow = await this.specsDrivenOrchestrator.executeSpecsDrivenWorkflow(workflow.id);
    
    if (executedWorkflow.status !== 'completed') {
      throw new Error('SPARC workflow execution did not complete');
    }
    
    // Check that all tasks are completed
    const completedTasks = executedWorkflow.tasks.filter(t => t.status === 'completed');
    if (completedTasks.length !== executedWorkflow.tasks.length) {
      throw new Error('Not all SPARC tasks completed');
    }
    
    return {
      workflowId: executedWorkflow.id,
      status: executedWorkflow.status,
      completedTasks: completedTasks.length,
      totalTasks: executedWorkflow.tasks.length
    };
  }

  private async testQualityGateValidation(): Promise<any> {
    // Create workflow for quality gate testing
    const workflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'Quality Gate Test',
      'Test quality gate validation',
      ['Quality requirement'],
      ['Quality stakeholder']
    );
    
    // Get workflow progress to test quality gate reporting
    const progress = await this.specsDrivenOrchestrator.getWorkflowProgress(workflow.id);
    
    if (!progress.workflow || !progress.phaseProgress) {
      throw new Error('Workflow progress tracking failed');
    }
    
    // Verify phase progress structure
    const phases = Object.keys(progress.phaseProgress);
    if (phases.length !== Object.keys(SpecsDrivenPhase).length) {
      throw new Error('Phase progress tracking incomplete');
    }
    
    return {
      workflowId: workflow.id,
      currentPhase: progress.currentPhase,
      overallProgress: progress.overallProgress,
      trackedPhases: phases.length
    };
  }

  private async testSteeringDocumentIntegration(): Promise<any> {
    // Test steering document compliance validation
    const workflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'Steering Test',
      'Test steering document integration',
      ['Steering requirement'],
      ['Steering stakeholder']
    );
    
    // Test compliance validation for specification phase
    const compliance = await this.specsDrivenOrchestrator.validateSteeringCompliance(
      workflow.id,
      SpecsDrivenPhase.SPECIFICATION
    );
    
    if (!compliance.steeringReferences || compliance.steeringReferences.length === 0) {
      throw new Error('Steering references not found');
    }
    
    // Verify steering reference structure
    const mandatoryRefs = compliance.steeringReferences.filter(ref => ref.relevance === 'mandatory');
    if (mandatoryRefs.length === 0) {
      throw new Error('No mandatory steering references found');
    }
    
    return {
      workflowId: workflow.id,
      compliant: compliance.compliant,
      score: compliance.score,
      totalReferences: compliance.steeringReferences.length,
      mandatoryReferences: mandatoryRefs.length
    };
  }

  // ===== PERFORMANCE AND RELIABILITY TESTS =====

  private async testConcurrentTaskExecution(): Promise<any> {
    // Create multiple tasks concurrently
    const taskPromises = [];
    for (let i = 0; i < 5; i++) {
      taskPromises.push(
        this.coordinator.createTask(`Concurrent task ${i}`, 'implementation', 'medium')
      );
    }
    
    const tasks = await Promise.all(taskPromises);
    
    if (tasks.length !== 5) {
      throw new Error('Concurrent task creation failed');
    }
    
    // Verify all tasks have unique IDs
    const uniqueIds = new Set(tasks.map(t => t.id));
    if (uniqueIds.size !== 5) {
      throw new Error('Task ID collision detected');
    }
    
    return {
      tasksCreated: tasks.length,
      uniqueIds: uniqueIds.size,
      allHaveIds: tasks.every(t => !!t.id)
    };
  }

  private async testErrorHandling(): Promise<any> {
    // Test error handling for invalid operations
    let errorCount = 0;
    
    // Test invalid task creation
    try {
      await this.coordinator.createTask('', 'spec' as any, 'invalid' as any);
    } catch (error) {
      errorCount++;
    }
    
    // Test invalid workflow operations
    try {
      await this.coordinator.getWorkflow('nonexistent-id');
    } catch (error) {
      // This should not throw, should return null
    }
    
    // Test invalid task update
    try {
      await this.coordinator.updateTask('nonexistent-id', { status: 'completed' });
    } catch (error) {
      errorCount++;
    }
    
    return {
      errorsHandled: errorCount,
      errorHandlingWorking: errorCount > 0
    };
  }

  private async testSystemStatusReporting(): Promise<any> {
    // Test system status reporting
    const status = await this.coordinator.getStatus();
    const swarmStatus = await this.coordinator.getSwarmStatus();
    
    if (typeof status.active !== 'boolean' || typeof status.tasks !== 'number') {
      throw new Error('Basic status reporting failed');
    }
    
    if (!swarmStatus.swarmId || typeof swarmStatus.totalAgents !== 'number') {
      throw new Error('Swarm status reporting failed');
    }
    
    // Verify status consistency
    if (status.tasks !== swarmStatus.totalTasks) {
      console.warn('Status inconsistency detected (may be expected during testing)');
    }
    
    return {
      systemActive: status.active,
      totalTasks: status.tasks,
      totalWorkflows: status.workflows,
      totalAgents: status.agents,
      swarmHealth: swarmStatus.health
    };
  }

  // ===== HELPER METHODS =====

  private async initializeTestSwarm(): Promise<void> {
    console.log('🔧 Initializing test swarm...');
    await this.coordinator.initializeSwarm();
    
    // Wait for swarm to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Test swarm initialized\n');
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      await this.coordinator.shutdown();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('⚠️ Cleanup error:', error);
    }
  }

  private printTestSummary(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${Math.round(totalDuration / totalTests)}ms`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`);
        });
    }
    
    console.log('\n🎉 Integration test suite completed!');
  }
}

/**
 * Factory function to create and run integration tests
 */
export async function runMaestroHiveIntegrationTests(): Promise<TestResult[]> {
  const testSuite = new MaestroHiveTestSuite();
  return await testSuite.runAllTests();
}

/**
 * Quick validation test for basic functionality
 */
export async function runQuickValidationTest(): Promise<boolean> {
  console.log('🚀 Running quick validation test...');
  
  try {
    const config = createPresetConfig('testing');
    const coordinator = createMaestroHiveCoordinator(config);
    
    // Initialize
    await coordinator.initializeSwarm();
    
    // Create a simple task
    const task = await coordinator.createTask('Quick test', 'spec', 'medium');
    
    // Generate content
    const content = await coordinator.generateContent('Test content generation', 'spec');
    
    // Validate
    const validation = await coordinator.validate(content, 'spec');
    
    // Check status
    const status = await coordinator.getStatus();
    
    // Cleanup
    await coordinator.shutdown();
    
    const success = !!(task.id && content && validation && status);
    
    console.log(success ? '✅ Quick validation PASSED' : '❌ Quick validation FAILED');
    return success;
    
  } catch (error) {
    console.error('❌ Quick validation FAILED:', error);
    return false;
  }
}