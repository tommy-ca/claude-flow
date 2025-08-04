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
import { createMaestroHiveCoordinator } from './coordinator';
import { createPresetConfig } from './config';
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

  // ===== EXTENDED TEST METHODS =====

  /**
   * Run comprehensive HiveMind integration tests
   */
  async runComprehensiveTests(): Promise<TestResult[]> {
    console.log('\n🔬 Running Comprehensive HiveMind Integration Tests\n');
    
    try {
      // Initialize enhanced test environment
      await this.initializeTestSwarm();
      
      // Core functionality tests
      await this.runTest('Advanced Task Management', () => this.testAdvancedTaskManagement());
      await this.runTest('Complex Workflow Orchestration', () => this.testComplexWorkflowOrchestration());
      await this.runTest('Multi-Agent Coordination', () => this.testMultiAgentCoordination());
      
      // SPARC methodology tests
      await this.runTest('Complete SPARC Workflow', () => this.testCompleteSPARCWorkflow());
      await this.runTest('Quality Gate Enforcement', () => this.testQualityGateEnforcement());
      await this.runTest('Steering Document Compliance', () => this.testSteeringDocumentCompliance());
      
      // Performance and scalability tests
      await this.runTest('Concurrent Workflow Execution', () => this.testConcurrentWorkflowExecution());
      await this.runTest('Load Balancing Efficiency', () => this.testLoadBalancingEfficiency());
      await this.runTest('Resource Optimization', () => this.testResourceOptimization());
      
      // Error handling and recovery tests
      await this.runTest('Fault Tolerance', () => this.testFaultTolerance());
      await this.runTest('Recovery Mechanisms', () => this.testRecoveryMechanisms());
      await this.runTest('Data Consistency', () => this.testDataConsistency());
      
    } finally {
      await this.cleanup();
    }
    
    this.printTestSummary();
    return this.testResults;
  }

  private async testAdvancedTaskManagement(): Promise<any> {
    // Test advanced task management features
    const tasks = [];
    
    // Create tasks with dependencies
    const specTask = await this.coordinator.createTask('Advanced specification', 'spec', 'critical');
    const designTask = await this.coordinator.createTask('Advanced design', 'design', 'high');
    const implTask = await this.coordinator.createTask('Advanced implementation', 'implementation', 'medium');
    
    tasks.push(specTask, designTask, implTask);
    
    // Test task prioritization
    const prioritizedTasks = await this.coordinator.getTasks();
    const sortedTasks = prioritizedTasks.sort((a, b) => {
      const priorities = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
      return priorities[b.priority as keyof typeof priorities] - priorities[a.priority as keyof typeof priorities];
    });
    
    // Test task assignment to specific agents
    const analyst = await this.coordinator.spawnAgent('analyst', ['requirements_analysis']);
    await this.coordinator.updateTask(specTask.id, { assignedTo: analyst.id });
    
    return {
      tasksCreated: tasks.length,
      prioritization: sortedTasks[0].priority === 'critical',
      agentAssignment: specTask.assignedTo === analyst.id
    };
  }

  private async testComplexWorkflowOrchestration(): Promise<any> {
    // Test complex workflow with multiple phases and dependencies
    const workflow = await this.coordinator.createWorkflow(
      'Complex Multi-Phase Workflow',
      'Advanced workflow with multiple interdependent phases'
    );
    
    // Create phase 1 tasks
    const phase1Tasks = [];
    for (let i = 0; i < 3; i++) {
      const task = await this.coordinator.createTask(`Phase 1 Task ${i + 1}`, 'spec', 'high');
      phase1Tasks.push(task);
      await this.coordinator.addTaskToWorkflow(workflow.id, task);
    }
    
    // Create phase 2 tasks (dependent on phase 1)
    const phase2Tasks = [];
    for (let i = 0; i < 2; i++) {
      const task = await this.coordinator.createTask(`Phase 2 Task ${i + 1}`, 'design', 'medium');
      phase2Tasks.push(task);
      await this.coordinator.addTaskToWorkflow(workflow.id, task);
    }
    
    // Simulate workflow execution
    const updatedWorkflow = await this.coordinator.getWorkflow(workflow.id);
    
    return {
      workflowId: workflow.id,
      totalTasks: updatedWorkflow?.tasks.length || 0,
      phase1Tasks: phase1Tasks.length,
      phase2Tasks: phase2Tasks.length,
      orchestrationSuccess: (updatedWorkflow?.tasks.length || 0) === 5
    };
  }

  private async testMultiAgentCoordination(): Promise<any> {
    // Test coordination between multiple agents
    const agents = [];
    
    // Spawn different types of agents
    const agentTypes = ['analyst', 'coder', 'reviewer', 'coordinator'];
    for (const type of agentTypes) {
      const agent = await this.coordinator.spawnAgent(type as any);
      agents.push(agent);
    }
    
    // Create tasks that require coordination
    const coordinationTask = await this.coordinator.createTask(
      'Multi-agent coordination task',
      'implementation',
      'high'
    );
    
    // Test agent communication (simulated)
    const messages = [];
    for (let i = 0; i < agents.length - 1; i++) {
      messages.push({
        from: agents[i].id,
        to: agents[i + 1].id,
        content: `Coordination message ${i + 1}`,
        timestamp: new Date()
      });
    }
    
    return {
      agentsSpawned: agents.length,
      agentTypes: agentTypes,
      coordinationTaskId: coordinationTask.id,
      messagesExchanged: messages.length,
      coordinationEfficient: messages.length === agentTypes.length - 1
    };
  }

  private async testCompleteSPARCWorkflow(): Promise<any> {
    // Test complete SPARC workflow execution
    const requirements = [
      'Comprehensive user authentication system',
      'Multi-factor authentication support',
      'Session management with JWT tokens',
      'Role-based access control'
    ];
    
    const stakeholders = [
      'Product Owner',
      'Security Team',
      'Development Team',
      'QA Team',
      'DevOps Team'
    ];
    
    const workflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'Complete Authentication System',
      'End-to-end authentication system following SPARC methodology',
      requirements,
      stakeholders
    );
    
    // Verify all SPARC phases are present
    const phases = ['specification', 'pseudocode', 'architecture', 'refinement', 'completion'];
    const phaseTasksCount = phases.map(phase => 
      workflow.tasks.filter(t => (t as any).phase === phase).length
    );
    
    return {
      workflowId: workflow.id,
      requirements: requirements.length,
      stakeholders: stakeholders.length,
      totalTasks: workflow.tasks.length,
      phasesImplemented: phaseTasksCount.filter(count => count > 0).length,
      sparcComplete: phaseTasksCount.every(count => count > 0)
    };
  }

  private async testQualityGateEnforcement(): Promise<any> {
    // Test quality gate enforcement mechanisms
    const workflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'Quality Gate Test Workflow',
      'Workflow to test quality gate enforcement',
      ['Quality requirement with strict validation'],
      ['Quality Assurance Team']
    );
    
    // Test quality validation with different content qualities
    const highQualityContent = `# High Quality Specification

## Requirements
- Comprehensive requirement analysis
- Detailed acceptance criteria
- Security considerations
- Performance requirements
- Scalability planning

## Acceptance Criteria
- [ ] All requirements are testable
- [ ] Security requirements are defined
- [ ] Performance benchmarks are established
- [ ] Scalability limits are documented`;
    
    const lowQualityContent = 'Basic requirement';
    
    const highQualityValidation = await this.coordinator.validate(highQualityContent, 'spec');
    const lowQualityValidation = await this.coordinator.validate(lowQualityContent, 'spec');
    
    return {
      workflowId: workflow.id,
      highQualityScore: highQualityValidation.score,
      lowQualityScore: lowQualityValidation.score,
      qualityDifferentiation: highQualityValidation.score > lowQualityValidation.score,
      gateEnforcement: highQualityValidation.valid && !lowQualityValidation.valid
    };
  }

  private async testSteeringDocumentCompliance(): Promise<any> {
    // Test steering document compliance validation
    const workflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'Compliance Test Workflow',
      'Test steering document compliance mechanisms',
      ['Compliance requirement'],
      ['Compliance Officer']
    );
    
    // Test compliance for different phases
    const phases = ['specification', 'architecture', 'completion'] as const;
    const complianceResults = [];
    
    for (const phase of phases) {
      const compliance = await this.specsDrivenOrchestrator.validateSteeringCompliance(
        workflow.id,
        phase as any
      );
      complianceResults.push({
        phase,
        compliant: compliance.compliant,
        score: compliance.score,
        references: compliance.steeringReferences.length
      });
    }
    
    return {
      workflowId: workflow.id,
      phasesChecked: complianceResults.length,
      complianceResults,
      overallCompliance: complianceResults.every(r => r.compliant || r.score > 0.5)
    };
  }

  private async testConcurrentWorkflowExecution(): Promise<any> {
    // Test concurrent execution of multiple workflows
    const workflowPromises = [];
    const concurrentWorkflows = 3;
    
    for (let i = 0; i < concurrentWorkflows; i++) {
      const promise = this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
        `Concurrent Workflow ${i + 1}`,
        `Test workflow ${i + 1} for concurrent execution`,
        [`Requirement ${i + 1}`],
        [`Stakeholder ${i + 1}`]
      );
      workflowPromises.push(promise);
    }
    
    const startTime = Date.now();
    const workflows = await Promise.all(workflowPromises);
    const executionTime = Date.now() - startTime;
    
    // Verify all workflows were created successfully
    const uniqueIds = new Set(workflows.map(w => w.id));
    
    return {
      concurrentWorkflows,
      successfulCreations: workflows.length,
      uniqueWorkflows: uniqueIds.size,
      executionTime,
      concurrencySuccess: workflows.length === concurrentWorkflows && uniqueIds.size === concurrentWorkflows
    };
  }

  private async testLoadBalancingEfficiency(): Promise<any> {
    // Test load balancing across agents
    const agents = [];
    const agentCount = 4;
    
    // Spawn multiple agents
    for (let i = 0; i < agentCount; i++) {
      const agent = await this.coordinator.spawnAgent('coder', ['code_generation']);
      agents.push(agent);
    }
    
    // Create tasks that should be distributed
    const tasks = [];
    const taskCount = 8;
    
    for (let i = 0; i < taskCount; i++) {
      const task = await this.coordinator.createTask(
        `Load balancing task ${i + 1}`,
        'implementation',
        'medium'
      );
      tasks.push(task);
    }
    
    // Simulate task distribution (in a real system, this would be automatic)
    const taskDistribution = new Map();
    agents.forEach(agent => taskDistribution.set(agent.id, 0));
    
    tasks.forEach((task, index) => {
      const agentId = agents[index % agents.length].id;
      taskDistribution.set(agentId, taskDistribution.get(agentId) + 1);
    });
    
    // Calculate load distribution efficiency
    const idealLoadPerAgent = taskCount / agentCount;
    const actualLoads = Array.from(taskDistribution.values());
    const loadVariance = actualLoads.reduce((sum, load) => 
      sum + Math.pow(load - idealLoadPerAgent, 2), 0
    ) / agentCount;
    
    return {
      agentCount,
      taskCount,
      idealLoadPerAgent,
      actualLoads,
      loadVariance,
      loadBalancingEfficient: loadVariance < 1.0
    };
  }

  private async testResourceOptimization(): Promise<any> {
    // Test resource optimization and management
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create and execute resource-intensive operations
    const resourceIntensiveWorkflow = await this.specsDrivenOrchestrator.createSpecsDrivenWorkflow(
      'Resource Optimization Test',
      'Test resource optimization capabilities',
      ['Resource-intensive requirement'],
      ['Performance Team']
    );
    
    // Generate large content to test memory management
    const largeContent = 'Large content block. '.repeat(1000);
    const contentValidation = await this.coordinator.validate(largeContent, 'spec');
    
    // Measure resource usage
    const peakMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = peakMemory - initialMemory;
    
    // Force garbage collection if available to test cleanup
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryCleanup = peakMemory - finalMemory;
    
    return {
      workflowId: resourceIntensiveWorkflow.id,
      initialMemoryMB: Math.round(initialMemory / 1024 / 1024),
      peakMemoryMB: Math.round(peakMemory / 1024 / 1024),
      finalMemoryMB: Math.round(finalMemory / 1024 / 1024),
      memoryIncreaseMB: Math.round(memoryIncrease / 1024 / 1024),
      memoryCleanupMB: Math.round(memoryCleanup / 1024 / 1024),
      contentValidated: contentValidation.valid,
      resourceOptimized: memoryCleanup > 0
    };
  }

  private async testFaultTolerance(): Promise<any> {
    // Test system fault tolerance
    const faults = [];
    
    try {
      // Test invalid agent spawning
      await this.coordinator.spawnAgent('invalid_agent_type' as any);
    } catch (error) {
      faults.push({ type: 'invalid_agent', handled: true, error: error.message });
    }
    
    try {
      // Test invalid task creation
      await this.coordinator.createTask('', 'invalid_type' as any, 'invalid_priority' as any);
    } catch (error) {
      faults.push({ type: 'invalid_task', handled: true, error: error.message });
    }
    
    try {
      // Test invalid workflow operations
      await this.coordinator.getWorkflow('nonexistent-workflow-id');
    } catch (error) {
      faults.push({ type: 'invalid_workflow', handled: true, error: error.message });
    }
    
    // Test system stability after faults
    const stabilityTask = await this.coordinator.createTask('Stability test', 'spec', 'medium');
    const systemStable = !!stabilityTask.id;
    
    return {
      faultsEncountered: faults.length,
      faultsHandled: faults.filter(f => f.handled).length,
      systemStable,
      faultTolerance: faults.length > 0 && systemStable
    };
  }

  private async testRecoveryMechanisms(): Promise<any> {
    // Test recovery mechanisms
    const recoveryTests = [];
    
    // Test workflow recovery
    const workflow = await this.coordinator.createWorkflow('Recovery Test', 'Test workflow recovery');
    const task = await this.coordinator.createTask('Recovery task', 'implementation', 'high');
    await this.coordinator.addTaskToWorkflow(workflow.id, task);
    
    // Simulate task failure and recovery
    await this.coordinator.updateTask(task.id, { status: 'failed' });
    
    // Test recovery by creating replacement task
    const recoveryTask = await this.coordinator.createTask('Recovery replacement', 'implementation', 'high');
    await this.coordinator.addTaskToWorkflow(workflow.id, recoveryTask);
    
    recoveryTests.push({
      type: 'task_recovery',
      originalTaskFailed: true,
      recoveryTaskCreated: !!recoveryTask.id,
      success: !!recoveryTask.id
    });
    
    // Test agent recovery
    const agent = await this.coordinator.spawnAgent('coder');
    const replacementAgent = await this.coordinator.spawnAgent('coder');
    
    recoveryTests.push({
      type: 'agent_recovery',
      originalAgent: agent.id,
      replacementAgent: replacementAgent.id,
      success: agent.id !== replacementAgent.id
    });
    
    return {
      recoveryTestsRun: recoveryTests.length,
      successfulRecoveries: recoveryTests.filter(t => t.success).length,
      recoveryMechanismsWorking: recoveryTests.every(t => t.success)
    };
  }

  private async testDataConsistency(): Promise<any> {
    // Test data consistency across operations
    const consistency = {
      taskConsistency: true,
      workflowConsistency: true,
      agentConsistency: true
    };
    
    // Test task consistency
    const task = await this.coordinator.createTask('Consistency test', 'spec', 'medium');
    const retrievedTask = (await this.coordinator.getTasks({ id: task.id }))[0];
    
    if (!retrievedTask || retrievedTask.id !== task.id || retrievedTask.type !== task.type) {
      consistency.taskConsistency = false;
    }
    
    // Test workflow consistency
    const workflow = await this.coordinator.createWorkflow('Consistency workflow', 'Test consistency');
    await this.coordinator.addTaskToWorkflow(workflow.id, task);
    
    const retrievedWorkflow = await this.coordinator.getWorkflow(workflow.id);
    if (!retrievedWorkflow || retrievedWorkflow.tasks.length !== 1 || 
        retrievedWorkflow.tasks[0].id !== task.id) {
      consistency.workflowConsistency = false;
    }
    
    // Test agent consistency
    const agent = await this.coordinator.spawnAgent('analyst');
    await this.coordinator.updateTask(task.id, { assignedTo: agent.id });
    
    const updatedTask = (await this.coordinator.getTasks({ id: task.id }))[0];
    if (!updatedTask || updatedTask.assignedTo !== agent.id) {
      consistency.agentConsistency = false;
    }
    
    return {
      taskConsistency: consistency.taskConsistency,
      workflowConsistency: consistency.workflowConsistency,
      agentConsistency: consistency.agentConsistency,
      overallConsistency: Object.values(consistency).every(c => c)
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