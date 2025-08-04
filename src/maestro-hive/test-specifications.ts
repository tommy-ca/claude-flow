/**
 * Test Specifications for HiveMind Claude Flow Maestro Workflows
 * 
 * This file defines comprehensive test specifications following the specs-driven methodology.
 * It provides the foundation for testing all aspects of the HiveMind integration, SPARC workflows,
 * and quality validation mechanisms.
 */

import type {
  MaestroTask,
  MaestroWorkflow,
  SpecsDrivenWorkflow,
  MaestroValidationResult,
  MaestroSwarmStatus,
  MaestroAgent
} from './interfaces.js';
import { SpecsDrivenPhase } from './specs-driven-flow';

// ===== TEST SPECIFICATION DEFINITIONS =====

/**
 * Core test categories for comprehensive coverage
 */
export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  END_TO_END = 'e2e',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  RECOVERY = 'recovery',
  MOCK_FALLBACK = 'mock_fallback'
}

/**
 * Test priority levels for execution order
 */
export enum TestPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Test execution status tracking
 */
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ERROR = 'error'
}

/**
 * Comprehensive test specification interface
 */
export interface TestSpecification {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  priority: TestPriority;
  
  // Test configuration
  timeout?: number;
  retries?: number;
  prerequisites?: string[];
  cleanup?: boolean;
  
  // Test assertions
  assertions: TestAssertion[];
  
  // Validation criteria
  successCriteria: SuccessCriteria;
  
  // Performance expectations
  performanceBaseline?: PerformanceBaseline;
  
  // Mock configuration
  mockConfig?: MockConfiguration;
  
  // Test data
  testData?: any;
  
  // Tags for filtering
  tags: string[];
}

/**
 * Test assertion definition
 */
export interface TestAssertion {
  id: string;
  description: string;
  type: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'custom';
  expected: any;
  actual?: any;
  tolerance?: number;
  customValidator?: (actual: any, expected: any) => boolean;
}

/**
 * Success criteria for test validation
 */
export interface SuccessCriteria {
  // Completion criteria
  requiredTasks?: number;
  requiredWorkflows?: number;
  requiredAgents?: number;
  
  // Quality criteria
  minQualityScore?: number;
  maxErrorRate?: number;
  minSuccessRate?: number;
  
  // Performance criteria
  maxExecutionTime?: number;
  minThroughput?: number;
  maxMemoryUsage?: number;
  
  // Functional criteria
  requiredFeatures?: string[];
  requiredOutputs?: string[];
  
  // Custom validation
  customValidators?: Array<(result: any) => boolean>;
}

/**
 * Performance baseline expectations
 */
export interface PerformanceBaseline {
  maxExecutionTime: number;
  minThroughput: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  
  // Swarm-specific metrics
  maxAgentSpawnTime?: number;
  minCoordinationEfficiency?: number;
  maxConsensusTime?: number;
}

/**
 * Mock configuration for fallback testing
 */
export interface MockConfiguration {
  enableMocks: boolean;
  mockServices: string[];
  mockResponses: Record<string, any>;
  fallbackBehavior: 'fail' | 'warn' | 'continue';
  simulateLatency?: number;
  simulateErrors?: boolean;
  errorRate?: number;
}

/**
 * Test result with comprehensive metrics
 */
export interface TestResult {
  testId: string;
  status: TestStatus;
  duration: number;
  startTime: Date;
  endTime?: Date;
  
  // Assertions results
  assertionResults: AssertionResult[];
  
  // Metrics collected
  metrics: TestMetrics;
  
  // Error information
  error?: TestError;
  
  // Additional context
  context?: Record<string, any>;
}

/**
 * Individual assertion result
 */
export interface AssertionResult {
  assertionId: string;
  passed: boolean;
  actual: any;
  expected: any;
  message?: string;
}

/**
 * Test metrics collection
 */
export interface TestMetrics {
  // Performance metrics
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  
  // Functional metrics
  tasksCreated: number;
  workflowsCompleted: number;
  agentsSpawned: number;
  
  // Quality metrics
  averageQualityScore: number;
  validationsPassed: number;
  consensusAchieved: number;
  
  // Error metrics
  errorsEncountered: number;
  warningsGenerated: number;
  recoveriesAttempted: number;
}

/**
 * Test error information
 */
export interface TestError {
  type: string;
  message: string;
  stack?: string;
  code?: string;
  context?: Record<string, any>;
}

// ===== COMPREHENSIVE TEST SPECIFICATIONS =====

/**
 * Complete test suite specification for HiveMind Maestro workflows
 */
export const HIVEMIND_TEST_SPECIFICATIONS: TestSpecification[] = [
  
  // ===== CORE FUNCTIONALITY TESTS =====
  
  {
    id: 'core-001',
    name: 'Basic Task Creation and Management',
    description: 'Test fundamental task creation, updating, and retrieval operations',
    category: TestCategory.UNIT,
    priority: TestPriority.CRITICAL,
    timeout: 5000,
    assertions: [
      {
        id: 'core-001-a1',
        description: 'Task should be created with valid ID',
        type: 'exists',
        expected: true
      },
      {
        id: 'core-001-a2', 
        description: 'Task type should match specification',
        type: 'equals',
        expected: 'spec'
      },
      {
        id: 'core-001-a3',
        description: 'Task should be retrievable by ID',
        type: 'exists',
        expected: true
      }
    ],
    successCriteria: {
      requiredTasks: 3,
      minSuccessRate: 1.0
    },
    tags: ['core', 'task-management', 'crud']
  },

  {
    id: 'core-002',
    name: 'Workflow Management and Coordination',
    description: 'Test workflow creation, task assignment, and execution coordination',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.CRITICAL,
    timeout: 10000,
    assertions: [
      {
        id: 'core-002-a1',
        description: 'Workflow should be created successfully',
        type: 'exists',
        expected: true
      },
      {
        id: 'core-002-a2',
        description: 'Tasks should be added to workflow',
        type: 'greaterThan',
        expected: 0
      },
      {
        id: 'core-002-a3',
        description: 'Workflow should execute completely',
        type: 'equals',
        expected: 'completed'
      }
    ],
    successCriteria: {
      requiredWorkflows: 1,
      requiredTasks: 2,
      minSuccessRate: 1.0
    },
    tags: ['core', 'workflow', 'coordination']
  },

  {
    id: 'core-003',
    name: 'Content Generation with Agent Selection',
    description: 'Test content generation with appropriate agent type selection',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.HIGH,
    timeout: 15000,
    assertions: [
      {
        id: 'core-003-a1',
        description: 'Content should be generated',
        type: 'exists',
        expected: true
      },
      {
        id: 'core-003-a2',
        description: 'Content length should meet minimum requirements',
        type: 'greaterThan',
        expected: 50
      },
      {
        id: 'core-003-a3',
        description: 'Content should have proper structure',
        type: 'contains',
        expected: '#'
      }
    ],
    successCriteria: {
      minQualityScore: 0.7,
      requiredOutputs: ['spec_content', 'design_content']
    },
    tags: ['core', 'content-generation', 'agents']
  },

  {
    id: 'core-004',
    name: 'Quality Validation System',
    description: 'Test comprehensive quality validation with scoring',
    category: TestCategory.UNIT,
    priority: TestPriority.HIGH,
    timeout: 8000,
    assertions: [
      {
        id: 'core-004-a1',
        description: 'Good content should pass validation',
        type: 'equals',
        expected: true
      },
      {
        id: 'core-004-a2',
        description: 'Good content should have high score',
        type: 'greaterThan',
        expected: 0.7
      },
      {
        id: 'core-004-a3',
        description: 'Poor content should fail validation',
        type: 'equals',
        expected: false
      }
    ],
    successCriteria: {
      minQualityScore: 0.8,
      maxErrorRate: 0.1
    },
    tags: ['core', 'validation', 'quality']
  },

  // ===== HIVEMIND INTEGRATION TESTS =====

  {
    id: 'hive-001',
    name: 'Swarm Initialization and Health',
    description: 'Test HiveMind swarm initialization and health monitoring',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.CRITICAL,
    timeout: 15000,
    assertions: [
      {
        id: 'hive-001-a1',
        description: 'Swarm should initialize successfully',
        type: 'exists',
        expected: true
      },
      {
        id: 'hive-001-a2',
        description: 'Swarm health should be healthy',
        type: 'equals',
        expected: 'healthy'
      },
      {
        id: 'hive-001-a3',
        description: 'Swarm should have valid topology',
        type: 'exists',
        expected: true
      }
    ],
    successCriteria: {
      requiredFeatures: ['swarm_id', 'health_status', 'topology']
    },
    performanceBaseline: {
      maxExecutionTime: 10000,
      minThroughput: 1,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxCpuUsage: 50
    },
    tags: ['hivemind', 'swarm', 'initialization']
  },

  {
    id: 'hive-002',
    name: 'Dynamic Agent Spawning',
    description: 'Test dynamic agent creation with different types and capabilities',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.HIGH,
    timeout: 12000,
    assertions: [
      {
        id: 'hive-002-a1',
        description: 'Analyst agent should spawn successfully',
        type: 'equals',
        expected: 'analyst'
      },
      {
        id: 'hive-002-a2',
        description: 'Coder agent should spawn with capabilities',
        type: 'contains',
        expected: 'code_generation'
      },
      {
        id: 'hive-002-a3',
        description: 'Agents should have unique IDs',
        type: 'custom',
        expected: true,
        customValidator: (agents: MaestroAgent[]) => {
          const ids = agents.map(a => a.id);
          return new Set(ids).size === ids.length;
        }
      }
    ],
    successCriteria: {
      requiredAgents: 2,
      requiredFeatures: ['agent_id', 'agent_type', 'capabilities']
    },
    performanceBaseline: {
      maxAgentSpawnTime: 3000,
      maxExecutionTime: 10000,
      minThroughput: 2,
      maxMemoryUsage: 50 * 1024 * 1024
    },
    tags: ['hivemind', 'agents', 'spawning']
  },

  {
    id: 'hive-003',
    name: 'Task Orchestration and Distribution',
    description: 'Test automatic task orchestration across swarm agents',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.HIGH,
    timeout: 20000,
    assertions: [
      {
        id: 'hive-003-a1',
        description: 'Task should be created and orchestrated',
        type: 'exists',
        expected: true
      },
      {
        id: 'hive-003-a2',
        description: 'Task should have assigned agent',
        type: 'exists',
        expected: true
      },
      {
        id: 'hive-003-a3',
        description: 'Task should progress from pending',
        type: 'custom',
        expected: true,
        customValidator: (task: MaestroTask) => task.status !== 'pending'
      }
    ],
    successCriteria: {
      requiredTasks: 1,
      minSuccessRate: 1.0
    },
    performanceBaseline: {
      maxExecutionTime: 15000,
      minCoordinationEfficiency: 0.8,
      minThroughput: 1,
      maxMemoryUsage: 75 * 1024 * 1024
    },
    tags: ['hivemind', 'orchestration', 'distribution']
  },

  // ===== SPECS-DRIVEN WORKFLOW TESTS =====

  {
    id: 'sparc-001',
    name: 'Specs-Driven Workflow Creation',
    description: 'Test comprehensive specs-driven workflow creation with all SPARC phases',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.CRITICAL,
    timeout: 25000,
    assertions: [
      {
        id: 'sparc-001-a1',
        description: 'Workflow should be created with all phases',
        type: 'equals',
        expected: Object.keys(SpecsDrivenPhase).length
      },
      {
        id: 'sparc-001-a2',
        description: 'Specification phase should be properly configured',
        type: 'exists',
        expected: true
      },
      {
        id: 'sparc-001-a3',
        description: 'Design phase should be properly configured',
        type: 'exists',
        expected: true
      }
    ],
    successCriteria: {
      requiredWorkflows: 1,
      requiredTasks: 5, // One per SPARC phase
      requiredFeatures: ['specification_phase', 'design_phase']
    },
    performanceBaseline: {
      maxExecutionTime: 20000,
      minThroughput: 1,
      maxMemoryUsage: 100 * 1024 * 1024
    },
    tags: ['sparc', 'specs-driven', 'workflow-creation']
  },

  {
    id: 'sparc-002',
    name: 'SPARC Phase Execution with Quality Gates',
    description: 'Test sequential SPARC phase execution with quality gate validation',
    category: TestCategory.END_TO_END,
    priority: TestPriority.CRITICAL,
    timeout: 60000,
    retries: 2,
    assertions: [
      {
        id: 'sparc-002-a1',
        description: 'All SPARC phases should complete',
        type: 'equals',
        expected: 'completed'
      },
      {
        id: 'sparc-002-a2',
        description: 'All tasks should be completed',
        type: 'custom',
        expected: true,
        customValidator: (workflow: SpecsDrivenWorkflow) => {
          return workflow.tasks.every(t => t.status === 'completed');
        }
      },
      {
        id: 'sparc-002-a3',
        description: 'Quality gates should pass',
        type: 'greaterThan',
        expected: 0.7
      }
    ],
    successCriteria: {
      requiredWorkflows: 1,
      minQualityScore: 0.8,
      minSuccessRate: 1.0
    },
    performanceBaseline: {
      maxExecutionTime: 50000,
      minThroughput: 1,
      maxMemoryUsage: 150 * 1024 * 1024
    },
    tags: ['sparc', 'execution', 'quality-gates', 'e2e']
  },

  {
    id: 'sparc-003',
    name: 'Quality Gate Validation and Enforcement',
    description: 'Test quality gate validation with failure handling and recovery',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.HIGH,
    timeout: 30000,
    assertions: [
      {
        id: 'sparc-003-a1',
        description: 'Quality gate progress should be tracked',
        type: 'exists',
        expected: true
      },
      {
        id: 'sparc-003-a2',
        description: 'Phase progress should be accurate',
        type: 'equals',
        expected: Object.keys(SpecsDrivenPhase).length
      },
      {
        id: 'sparc-003-a3',
        description: 'Overall progress should be calculated',
        type: 'greaterThan',
        expected: 0
      }
    ],
    successCriteria: {
      requiredFeatures: ['current_phase', 'phase_progress', 'overall_progress']
    },
    tags: ['sparc', 'quality-gates', 'validation']
  },

  {
    id: 'sparc-004',
    name: 'Steering Document Integration',
    description: 'Test integration with steering documents for compliance validation',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.MEDIUM,
    timeout: 20000,
    assertions: [
      {
        id: 'sparc-004-a1',
        description: 'Steering references should be found',
        type: 'greaterThan',
        expected: 0
      },
      {
        id: 'sparc-004-a2',
        description: 'Mandatory references should be present',
        type: 'greaterThan',
        expected: 0
      },
      {
        id: 'sparc-004-a3',
        description: 'Compliance score should be calculated',
        type: 'custom',
        expected: true,
        customValidator: (result: any) => typeof result.score === 'number'
      }
    ],
    successCriteria: {
      requiredFeatures: ['steering_references', 'compliance_score']
    },
    tags: ['sparc', 'steering', 'compliance']
  },

  // ===== PERFORMANCE AND RELIABILITY TESTS =====

  {
    id: 'perf-001',
    name: 'Concurrent Task Execution Performance',
    description: 'Test system performance under concurrent task load',
    category: TestCategory.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    timeout: 45000,
    assertions: [
      {
        id: 'perf-001-a1',
        description: 'All concurrent tasks should complete',
        type: 'equals',
        expected: 5
      },
      {
        id: 'perf-001-a2',
        description: 'Task IDs should be unique',
        type: 'equals',
        expected: 5
      },
      {
        id: 'perf-001-a3',
        description: 'No task ID collisions',
        type: 'equals',
        expected: true
      }
    ],
    successCriteria: {
      requiredTasks: 5,
      maxExecutionTime: 30000,
      minThroughput: 5
    },
    performanceBaseline: {
      maxExecutionTime: 30000,
      minThroughput: 5,
      maxMemoryUsage: 200 * 1024 * 1024,
      maxCpuUsage: 80
    },
    tags: ['performance', 'concurrency', 'stress']
  },

  {
    id: 'perf-002',
    name: 'Memory Usage and Resource Management',
    description: 'Test memory usage patterns and resource cleanup',
    category: TestCategory.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    timeout: 30000,
    assertions: [
      {
        id: 'perf-002-a1',
        description: 'Memory usage should stay within limits',
        type: 'lessThan',
        expected: 250 * 1024 * 1024 // 250MB
      },
      {
        id: 'perf-002-a2',
        description: 'Memory should be released after cleanup',
        type: 'lessThan',
        expected: 100 * 1024 * 1024 // 100MB after cleanup
      }
    ],
    performanceBaseline: {
      maxMemoryUsage: 250 * 1024 * 1024,
      maxExecutionTime: 25000,
      minThroughput: 1
    },
    tags: ['performance', 'memory', 'resources']
  },

  {
    id: 'perf-003',
    name: 'Swarm Coordination Efficiency',
    description: 'Test efficiency of swarm coordination mechanisms',
    category: TestCategory.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    timeout: 25000,
    assertions: [
      {
        id: 'perf-003-a1',
        description: 'Coordination latency should be acceptable',
        type: 'lessThan',
        expected: 5000
      },
      {
        id: 'perf-003-a2',
        description: 'Consensus should be achieved quickly',
        type: 'lessThan',
        expected: 10000
      }
    ],
    performanceBaseline: {
      minCoordinationEfficiency: 0.8,
      maxConsensusTime: 8000,
      maxExecutionTime: 20000
    },
    tags: ['performance', 'coordination', 'consensus']
  },

  // ===== ERROR HANDLING AND RECOVERY TESTS =====

  {
    id: 'error-001',
    name: 'Graceful Error Handling',
    description: 'Test graceful handling of various error conditions',
    category: TestCategory.RECOVERY,
    priority: TestPriority.HIGH,
    timeout: 15000,
    assertions: [
      {
        id: 'error-001-a1',
        description: 'Invalid operations should be handled gracefully',
        type: 'greaterThan',
        expected: 0
      },
      {
        id: 'error-001-a2',
        description: 'System should remain stable after errors',
        type: 'equals',
        expected: true
      }
    ],
    successCriteria: {
      maxErrorRate: 0.2,
      requiredFeatures: ['error_handling']
    },
    tags: ['error-handling', 'recovery', 'stability']
  },

  {
    id: 'error-002',
    name: 'System Recovery and Resilience',
    description: 'Test system recovery from failures and degraded states',
    category: TestCategory.RECOVERY,
    priority: TestPriority.HIGH,
    timeout: 20000,
    assertions: [
      {
        id: 'error-002-a1',
        description: 'System should recover from agent failures',
        type: 'equals',
        expected: true
      },
      {
        id: 'error-002-a2',
        description: 'Failed tasks should be reassigned',
        type: 'equals',
        expected: true
      }
    ],
    successCriteria: {
      minSuccessRate: 0.8,
      requiredFeatures: ['failure_recovery', 'task_reassignment']
    },
    tags: ['recovery', 'resilience', 'failure-handling']
  },

  // ===== MOCK FALLBACK TESTS =====

  {
    id: 'mock-001',
    name: 'Mock Service Integration',
    description: 'Test system behavior with mocked external services',
    category: TestCategory.MOCK_FALLBACK,
    priority: TestPriority.MEDIUM,
    timeout: 10000,
    mockConfig: {
      enableMocks: true,
      mockServices: ['claude-api', 'swarm-coordinator'],
      mockResponses: {
        'claude-api': { content: 'Mocked content generation' },
        'swarm-coordinator': { status: 'healthy', agents: 3 }
      },
      fallbackBehavior: 'continue'
    },
    assertions: [
      {
        id: 'mock-001-a1',
        description: 'System should work with mocked services',
        type: 'equals',
        expected: true
      },
      {
        id: 'mock-001-a2',
        description: 'Mock responses should be used',
        type: 'contains',
        expected: 'Mocked content'
      }
    ],
    successCriteria: {
      minSuccessRate: 1.0,
      requiredFeatures: ['mock_integration']
    },
    tags: ['mock', 'fallback', 'offline']
  },

  {
    id: 'mock-002',
    name: 'Offline Mode Functionality',
    description: 'Test system functionality in offline/disconnected mode',
    category: TestCategory.MOCK_FALLBACK,
    priority: TestPriority.LOW,
    timeout: 8000,
    mockConfig: {
      enableMocks: true,
      mockServices: ['*'],
      mockResponses: {},
      fallbackBehavior: 'continue',
      simulateLatency: 100
    },
    assertions: [
      {
        id: 'mock-002-a1',
        description: 'Basic operations should work offline',
        type: 'equals',
        expected: true
      }
    ],
    successCriteria: {
      requiredFeatures: ['offline_mode']
    },
    tags: ['mock', 'offline', 'fallback']
  },

  // ===== CLI INTEGRATION TESTS =====

  {
    id: 'cli-001',
    name: 'CLI Command Integration',
    description: 'Test CLI integration with HiveMind backend',
    category: TestCategory.INTEGRATION,
    priority: TestPriority.MEDIUM,
    timeout: 20000,
    assertions: [
      {
        id: 'cli-001-a1',
        description: 'CLI should initialize HiveMind successfully',
        type: 'equals',
        expected: true
      },
      {
        id: 'cli-001-a2',
        description: 'CLI should execute workflows',
        type: 'equals',
        expected: 'completed'
      }
    ],
    successCriteria: {
      requiredFeatures: ['cli_integration', 'command_execution']
    },
    tags: ['cli', 'integration', 'commands']
  },

  {
    id: 'cli-002',
    name: 'SPARC CLI Workflow Execution',
    description: 'Test SPARC workflow execution through CLI interface',
    category: TestCategory.END_TO_END,
    priority: TestPriority.MEDIUM,
    timeout: 45000,
    assertions: [
      {
        id: 'cli-002-a1',
        description: 'SPARC workflow should execute via CLI',
        type: 'equals',
        expected: 'completed'
      },
      {
        id: 'cli-002-a2',
        description: 'All SPARC phases should complete',
        type: 'equals',
        expected: Object.keys(SpecsDrivenPhase).length
      }
    ],
    successCriteria: {
      requiredWorkflows: 1,
      minSuccessRate: 1.0
    },
    tags: ['cli', 'sparc', 'e2e']
  }

];

/**
 * Test suite configuration
 */
export interface TestSuiteConfig {
  name: string;
  description: string;
  specifications: TestSpecification[];
  
  // Execution configuration
  parallel: boolean;
  maxConcurrency: number;
  timeout: number;
  retries: number;
  
  // Filtering options
  includeCategories?: TestCategory[];
  excludeCategories?: TestCategory[];
  includeTags?: string[];
  excludeTags?: string[];
  minPriority?: TestPriority;
  
  // Reporting options
  reportFormat: 'json' | 'html' | 'junit' | 'console';
  outputDir: string;
  verbose: boolean;
  
  // Performance tracking
  trackPerformance: boolean;
  performanceThresholds: PerformanceBaseline;
}

/**
 * Default test suite configuration
 */
export const DEFAULT_TEST_SUITE_CONFIG: TestSuiteConfig = {
  name: 'HiveMind Maestro Comprehensive Test Suite',
  description: 'Complete test suite for HiveMind Claude Flow maestro workflows',
  specifications: HIVEMIND_TEST_SPECIFICATIONS,
  
  parallel: true,
  maxConcurrency: 4,
  timeout: 60000,
  retries: 1,
  
  reportFormat: 'console',
  outputDir: './test-results',
  verbose: true,
  
  trackPerformance: true,
  performanceThresholds: {
    maxExecutionTime: 60000,
    minThroughput: 1,
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    maxCpuUsage: 80,
    maxAgentSpawnTime: 5000,
    minCoordinationEfficiency: 0.7,
    maxConsensusTime: 15000
  }
};

/**
 * Test specification helper functions
 */
export class TestSpecificationHelper {
  
  /**
   * Filter test specifications by criteria
   */
  static filterSpecifications(
    specs: TestSpecification[],
    criteria: {
      categories?: TestCategory[];
      priorities?: TestPriority[];
      tags?: string[];
    }
  ): TestSpecification[] {
    return specs.filter(spec => {
      if (criteria.categories && !criteria.categories.includes(spec.category)) {
        return false;
      }
      
      if (criteria.priorities && !criteria.priorities.includes(spec.priority)) {
        return false;
      }
      
      if (criteria.tags && !criteria.tags.some(tag => spec.tags.includes(tag))) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Get specifications by priority order
   */
  static getByPriority(specs: TestSpecification[], priority: TestPriority): TestSpecification[] {
    return specs.filter(spec => spec.priority === priority);
  }
  
  /**
   * Get critical path specifications
   */
  static getCriticalPath(specs: TestSpecification[]): TestSpecification[] {
    return this.getByPriority(specs, TestPriority.CRITICAL);
  }
  
  /**
   * Validate test specification
   */
  static validateSpecification(spec: TestSpecification): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!spec.id) errors.push('Test ID is required');
    if (!spec.name) errors.push('Test name is required');
    if (!spec.assertions || spec.assertions.length === 0) {
      errors.push('At least one assertion is required');
    }
    if (!spec.successCriteria) errors.push('Success criteria is required');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Generate test execution plan
   */
  static generateExecutionPlan(
    specs: TestSpecification[],
    config: Partial<TestSuiteConfig> = {}
  ): {
    phases: {
      name: string;
      specifications: TestSpecification[];
      estimatedTime: number;
    }[];
    totalEstimatedTime: number;
  } {
    const phases = [
      {
        name: 'Critical Unit Tests',
        specifications: this.filterSpecifications(specs, {
          categories: [TestCategory.UNIT],
          priorities: [TestPriority.CRITICAL]
        }),
        estimatedTime: 0
      },
      {
        name: 'Critical Integration Tests',
        specifications: this.filterSpecifications(specs, {
          categories: [TestCategory.INTEGRATION],
          priorities: [TestPriority.CRITICAL]
        }),
        estimatedTime: 0
      },
      {
        name: 'High Priority Tests',
        specifications: this.filterSpecifications(specs, {
          priorities: [TestPriority.HIGH]
        }),
        estimatedTime: 0
      },
      {
        name: 'End-to-End Tests',
        specifications: this.filterSpecifications(specs, {
          categories: [TestCategory.END_TO_END]
        }),
        estimatedTime: 0
      },
      {
        name: 'Performance Tests',
        specifications: this.filterSpecifications(specs, {
          categories: [TestCategory.PERFORMANCE]
        }),
        estimatedTime: 0
      },
      {
        name: 'Recovery and Mock Tests',
        specifications: this.filterSpecifications(specs, {
          categories: [TestCategory.RECOVERY, TestCategory.MOCK_FALLBACK]
        }),
        estimatedTime: 0
      }
    ];
    
    // Calculate estimated times
    phases.forEach(phase => {
      phase.estimatedTime = phase.specifications.reduce(
        (total, spec) => total + (spec.timeout || 30000),
        0
      );
    });
    
    const totalEstimatedTime = phases.reduce(
      (total, phase) => total + phase.estimatedTime,
      0
    );
    
    return {
      phases,
      totalEstimatedTime
    };
  }
}