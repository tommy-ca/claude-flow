/**
 * Integration tests for Agent Deployment Flow
 * Tests complete workflows from resource detection to agent deployment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, TEST_FIXTURES } from '../test-config';

// These imports will fail initially (TDD approach)
import {
  DeploymentOrchestrator,
  ResourceManager,
  AgentDeploymentPipeline,
  DeploymentStrategy,
  DeploymentResult,
  DeploymentMonitor,
  DeploymentRollback
} from '../../../src/resource-manager/core/deployment-orchestrator';

import {
  ResourceDetector,
  ResourceSnapshot
} from '../../../src/resource-manager/core/resource-detector';

import {
  AgentFactory,
  AgentInstance
} from '../../../src/resource-manager/factory/agent-factory';

import {
  ResourceAllocator,
  AllocationResult
} from '../../../src/resource-manager/allocators/resource-allocator';

import {
  PressureDetector,
  PressureLevel
} from '../../../src/resource-manager/monitors/pressure-detector';

describe('Agent Deployment Flow Integration', () => {
  let orchestrator: DeploymentOrchestrator;
  let resourceManager: ResourceManager;
  let mockResourceDetector: ResourceDetector;
  let mockAgentFactory: AgentFactory;
  let mockResourceAllocator: ResourceAllocator;
  let mockPressureDetector: PressureDetector;

  beforeEach(() => {
    // Set up mocks
    mockResourceDetector = {
      detectAll: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      getMovingAverage: vi.fn(),
      isSupported: vi.fn().mockReturnValue(true)
    } as any;

    mockAgentFactory = {
      createAgent: vi.fn(),
      getAvailableAgentTypes: vi.fn().mockReturnValue(['researcher', 'coder', 'tester']),
      getAgentRequirements: vi.fn(),
      deployAgents: vi.fn(),
      destroyAgent: vi.fn()
    } as any;

    mockResourceAllocator = {
      allocate: vi.fn(),
      release: vi.fn(),
      getAvailableResources: vi.fn(),
      getActiveAllocations: vi.fn().mockReturnValue([])
    } as any;

    mockPressureDetector = {
      detectPressure: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      enableAutoThrottling: vi.fn(),
      getMitigationActions: vi.fn().mockReturnValue([])
    } as any;

    resourceManager = new ResourceManager(
      mockResourceDetector,
      mockResourceAllocator,
      mockPressureDetector
    );

    orchestrator = new DeploymentOrchestrator(
      resourceManager,
      mockAgentFactory
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Deployment Pipeline', () => {
    it('should execute full deployment pipeline successfully', async () => {
      // Setup resource availability
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(50),
        disk: TEST_CONFIG.mocks.generateDiskUsage(45),
        network: TEST_CONFIG.mocks.generateNetworkStats(100)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'normal',
        memory: 'normal',
        disk: 'normal',
        network: 'normal',
        overall: 'normal'
      });

      // Setup successful allocation
      mockResourceAllocator.allocate.mockReturnValue({
        success: true,
        allocated: { cpu: 20, memory: 2048, disk: 1000 },
        reservationId: 'res-123'
      });

      // Setup successful agent creation
      const mockAgent: AgentInstance = {
        id: 'agent-123',
        type: 'researcher',
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 20, memory: 2048, disk: 1000 }
      };

      mockAgentFactory.createAgent.mockReturnValue(mockAgent);

      // Execute deployment
      const result = await orchestrator.deployAgent({
        type: 'researcher',
        priority: 'normal',
        constraints: {
          maxCpu: 30,
          maxMemory: 4096
        }
      });

      // Verify complete pipeline execution
      expect(mockResourceDetector.detectAll).toHaveBeenCalled();
      expect(mockPressureDetector.detectPressure).toHaveBeenCalled();
      expect(mockResourceAllocator.allocate).toHaveBeenCalled();
      expect(mockAgentFactory.createAgent).toHaveBeenCalled();

      expect(result).toMatchObject({
        success: true,
        agent: mockAgent,
        deployment: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      });
    });

    it('should handle resource insufficiency during deployment', async () => {
      // Setup resource scarcity
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(95),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(98),
        disk: TEST_CONFIG.mocks.generateDiskUsage(92),
        network: TEST_CONFIG.mocks.generateNetworkStats(50)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'critical',
        memory: 'critical',
        disk: 'high',
        network: 'normal',
        overall: 'critical'
      });

      // Setup failed allocation
      mockResourceAllocator.allocate.mockReturnValue({
        success: false,
        reason: 'Insufficient memory resources',
        shortage: { memory: 1024 }
      });

      // Execute deployment
      const result = await orchestrator.deployAgent({
        type: 'analyst',
        priority: 'normal'
      });

      expect(result).toMatchObject({
        success: false,
        reason: 'Insufficient memory resources',
        suggestedActions: expect.arrayContaining([
          expect.objectContaining({
            type: 'wait',
            reason: 'resource_pressure'
          })
        ])
      });
    });

    it('should implement deployment queue for delayed deployment', async () => {
      // Setup initial resource pressure
      const highPressureSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(90),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(95),
        disk: TEST_CONFIG.mocks.generateDiskUsage(88),
        network: TEST_CONFIG.mocks.generateNetworkStats(80)
      };

      mockResourceDetector.detectAll.mockResolvedValue(highPressureSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'high',
        memory: 'critical',
        disk: 'high',
        network: 'moderate',
        overall: 'critical'
      });

      // Queue deployment request
      const queueResult = await orchestrator.queueDeployment({
        type: 'coder',
        priority: 'normal',
        maxWaitTime: 60000
      });

      expect(queueResult).toMatchObject({
        queued: true,
        position: 1,
        estimatedWait: expect.any(Number)
      });

      // Simulate resource availability improvement
      const normalSnapshot: ResourceSnapshot = {
        timestamp: Date.now() + 30000,
        cpu: TEST_CONFIG.mocks.generateCpuLoad(45),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(55),
        disk: TEST_CONFIG.mocks.generateDiskUsage(50),
        network: TEST_CONFIG.mocks.generateNetworkStats(60)
      };

      mockResourceDetector.detectAll.mockResolvedValue(normalSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'normal',
        memory: 'normal',
        disk: 'normal',
        network: 'normal',
        overall: 'normal'
      });

      mockResourceAllocator.allocate.mockReturnValue({
        success: true,
        allocated: { cpu: 25, memory: 2048, disk: 1000 },
        reservationId: 'res-456'
      });

      const mockAgent: AgentInstance = {
        id: 'agent-456',
        type: 'coder',
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 25, memory: 2048, disk: 1000 }
      };

      mockAgentFactory.createAgent.mockReturnValue(mockAgent);

      // Process queue
      const processResult = await orchestrator.processDeploymentQueue();

      expect(processResult).toMatchObject({
        processed: 1,
        successful: 1,
        failed: 0,
        deployments: [
          expect.objectContaining({
            agent: mockAgent,
            queueTime: expect.any(Number)
          })
        ]
      });
    });

    it('should handle deployment rollback on failure', async () => {
      // Setup normal resources
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(50),
        disk: TEST_CONFIG.mocks.generateDiskUsage(45),
        network: TEST_CONFIG.mocks.generateNetworkStats(100)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'normal',
        memory: 'normal',
        disk: 'normal',
        network: 'normal',
        overall: 'normal'
      });

      // Setup successful allocation
      mockResourceAllocator.allocate.mockReturnValue({
        success: true,
        allocated: { cpu: 20, memory: 2048, disk: 1000 },
        reservationId: 'res-rollback'
      });

      // Setup agent creation failure
      mockAgentFactory.createAgent.mockImplementation(() => {
        throw new Error('Agent initialization failed');
      });

      // Execute deployment
      const result = await orchestrator.deployAgent({
        type: 'tester',
        priority: 'normal'
      });

      // Verify rollback occurred
      expect(mockResourceAllocator.release).toHaveBeenCalledWith('res-rollback');
      expect(result).toMatchObject({
        success: false,
        reason: 'Agent initialization failed',
        rolledBack: true
      });
    });
  });

  describe('Multi-Agent Deployment Scenarios', () => {
    it('should deploy multiple agents with resource coordination', async () => {
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(30),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(40),
        disk: TEST_CONFIG.mocks.generateDiskUsage(35),
        network: TEST_CONFIG.mocks.generateNetworkStats(120)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'normal',
        memory: 'normal',
        disk: 'normal',
        network: 'normal',
        overall: 'normal'
      });

      // Setup allocations for multiple agents
      mockResourceAllocator.allocate
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 15, memory: 1024, disk: 500 },
          reservationId: 'res-1'
        })
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 20, memory: 2048, disk: 1000 },
          reservationId: 'res-2'
        })
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 10, memory: 1024, disk: 500 },
          reservationId: 'res-3'
        });

      // Setup agent creation
      const mockAgents = [
        {
          id: 'agent-1',
          type: 'researcher',
          status: 'ready',
          createdAt: Date.now(),
          resourceAllocation: { cpu: 15, memory: 1024, disk: 500 }
        },
        {
          id: 'agent-2',
          type: 'coder',
          status: 'ready',
          createdAt: Date.now(),
          resourceAllocation: { cpu: 20, memory: 2048, disk: 1000 }
        },
        {
          id: 'agent-3',
          type: 'tester',
          status: 'ready',
          createdAt: Date.now(),
          resourceAllocation: { cpu: 10, memory: 1024, disk: 500 }
        }
      ];

      mockAgentFactory.createAgent
        .mockReturnValueOnce(mockAgents[0])
        .mockReturnValueOnce(mockAgents[1])
        .mockReturnValueOnce(mockAgents[2]);

      // Execute batch deployment
      const result = await orchestrator.deployAgentBatch([
        { type: 'researcher', priority: 'normal' },
        { type: 'coder', priority: 'high' },
        { type: 'tester', priority: 'low' }
      ]);

      expect(result).toMatchObject({
        success: true,
        deployed: 3,
        failed: 0,
        agents: mockAgents,
        resourceUtilization: expect.objectContaining({
          totalCpu: 45,
          totalMemory: 4096,
          totalDisk: 2000
        })
      });
    });

    it('should handle partial batch deployment failures', async () => {
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(60),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(70),
        disk: TEST_CONFIG.mocks.generateDiskUsage(65),
        network: TEST_CONFIG.mocks.generateNetworkStats(80)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'normal',
        memory: 'moderate',
        disk: 'normal',
        network: 'normal',
        overall: 'moderate'
      });

      // Setup mixed allocation results
      mockResourceAllocator.allocate
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 15, memory: 1024, disk: 500 },
          reservationId: 'res-success'
        })
        .mockReturnValueOnce({
          success: false,
          reason: 'Insufficient memory resources',
          shortage: { memory: 512 }
        })
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 10, memory: 1024, disk: 500 },
          reservationId: 'res-success-2'
        });

      const successfulAgent = {
        id: 'agent-success',
        type: 'researcher',
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 15, memory: 1024, disk: 500 }
      };

      const successfulAgent2 = {
        id: 'agent-success-2',
        type: 'tester',
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 10, memory: 1024, disk: 500 }
      };

      mockAgentFactory.createAgent
        .mockReturnValueOnce(successfulAgent)
        .mockReturnValueOnce(successfulAgent2);

      // Execute batch deployment
      const result = await orchestrator.deployAgentBatch([
        { type: 'researcher', priority: 'normal' },
        { type: 'analyst', priority: 'high' }, // This will fail
        { type: 'tester', priority: 'low' }
      ]);

      expect(result).toMatchObject({
        success: false,
        deployed: 2,
        failed: 1,
        agents: [successfulAgent, successfulAgent2],
        failures: [
          expect.objectContaining({
            type: 'analyst',
            reason: 'Insufficient memory resources'
          })
        ]
      });
    });

    it('should coordinate agents with dependencies', async () => {
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(35),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(45),
        disk: TEST_CONFIG.mocks.generateDiskUsage(40),
        network: TEST_CONFIG.mocks.generateNetworkStats(100)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'normal',
        memory: 'normal',
        disk: 'normal',
        network: 'normal',
        overall: 'normal'
      });

      // Setup allocations
      mockResourceAllocator.allocate
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 25, memory: 2048, disk: 1000 },
          reservationId: 'res-coordinator'
        })
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 20, memory: 2048, disk: 1000 },
          reservationId: 'res-worker'
        });

      // Setup agent creation
      const coordinatorAgent = {
        id: 'agent-coordinator',
        type: 'coordinator',
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 25, memory: 2048, disk: 1000 }
      };

      const workerAgent = {
        id: 'agent-worker',
        type: 'coder',
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 20, memory: 2048, disk: 1000 }
      };

      mockAgentFactory.createAgent
        .mockReturnValueOnce(coordinatorAgent)
        .mockReturnValueOnce(workerAgent);

      // Execute deployment with dependencies
      const result = await orchestrator.deployAgentWithDependencies({
        primary: { type: 'coordinator', priority: 'high' },
        dependents: [
          { type: 'coder', priority: 'normal', dependsOn: 'coordinator' }
        ]
      });

      expect(result).toMatchObject({
        success: true,
        coordinatorAgent: coordinatorAgent,
        dependentAgents: [workerAgent],
        deploymentOrder: ['coordinator', 'coder']
      });
    });
  });

  describe('Deployment Monitoring and Health Checks', () => {
    let deploymentMonitor: DeploymentMonitor;

    beforeEach(() => {
      deploymentMonitor = orchestrator.getMonitor();
    });

    it('should monitor deployment progress in real-time', async () => {
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(50),
        disk: TEST_CONFIG.mocks.generateDiskUsage(45),
        network: TEST_CONFIG.mocks.generateNetworkStats(100)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'normal',
        memory: 'normal',
        disk: 'normal',
        network: 'normal',
        overall: 'normal'
      });

      mockResourceAllocator.allocate.mockReturnValue({
        success: true,
        allocated: { cpu: 20, memory: 2048, disk: 1000 },
        reservationId: 'res-monitor'
      });

      // Setup delayed agent creation to test monitoring
      mockAgentFactory.createAgent.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              id: 'agent-monitor',
              type: 'researcher',
              status: 'ready',
              createdAt: Date.now(),
              resourceAllocation: { cpu: 20, memory: 2048, disk: 1000 }
            });
          }, 1000);
        });
      });

      const progressUpdates: any[] = [];
      deploymentMonitor.onProgress(update => {
        progressUpdates.push(update);
      });

      // Execute deployment
      const deploymentPromise = orchestrator.deployAgent({
        type: 'researcher',
        priority: 'normal'
      });

      // Wait for completion
      await deploymentPromise;

      expect(progressUpdates).toContainEqual(
        expect.objectContaining({
          stage: 'resource_detection',
          progress: 100
        })
      );
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({
          stage: 'resource_allocation',
          progress: 100
        })
      );
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({
          stage: 'agent_creation',
          progress: 100
        })
      );
    });

    it('should perform health checks on deployed agents', async () => {
      const mockAgent: AgentInstance = {
        id: 'agent-health',
        type: 'coder',
        status: 'running',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 20, memory: 2048, disk: 1000 },
        healthCheck: vi.fn().mockResolvedValue({ healthy: true, metrics: {} })
      };

      // Deploy agent
      mockResourceDetector.detectAll.mockResolvedValue({
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(50),
        disk: TEST_CONFIG.mocks.generateDiskUsage(45),
        network: TEST_CONFIG.mocks.generateNetworkStats(100)
      });

      mockResourceAllocator.allocate.mockReturnValue({
        success: true,
        allocated: { cpu: 20, memory: 2048, disk: 1000 },
        reservationId: 'res-health'
      });

      mockAgentFactory.createAgent.mockReturnValue(mockAgent);

      const deployResult = await orchestrator.deployAgent({
        type: 'coder',
        priority: 'normal'
      });

      expect(deployResult.success).toBe(true);

      // Perform health check
      const healthResult = await deploymentMonitor.checkAgentHealth(mockAgent.id);

      expect(healthResult).toMatchObject({
        agentId: mockAgent.id,
        healthy: true,
        lastChecked: expect.any(Number),
        metrics: expect.any(Object)
      });

      expect(mockAgent.healthCheck).toHaveBeenCalled();
    });

    it('should handle agent failure detection and recovery', async () => {
      const mockAgent: AgentInstance = {
        id: 'agent-failure',
        type: 'tester',
        status: 'running',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 15, memory: 1024, disk: 500 },
        healthCheck: vi.fn().mockRejectedValue(new Error('Agent unresponsive'))
      };

      // Deploy agent
      mockResourceDetector.detectAll.mockResolvedValue({
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(50),
        disk: TEST_CONFIG.mocks.generateDiskUsage(45),
        network: TEST_CONFIG.mocks.generateNetworkStats(100)
      });

      mockResourceAllocator.allocate.mockReturnValue({
        success: true,
        allocated: { cpu: 15, memory: 1024, disk: 500 },
        reservationId: 'res-failure'
      });

      mockAgentFactory.createAgent.mockReturnValue(mockAgent);

      await orchestrator.deployAgent({
        type: 'tester',
        priority: 'normal'
      });

      // Simulate health check failure
      const healthResult = await deploymentMonitor.checkAgentHealth(mockAgent.id);

      expect(healthResult).toMatchObject({
        agentId: mockAgent.id,
        healthy: false,
        error: 'Agent unresponsive',
        actionRequired: true
      });

      // Verify recovery action was triggered
      const recoveryActions = await deploymentMonitor.getRecoveryActions(mockAgent.id);
      expect(recoveryActions).toContainEqual(
        expect.objectContaining({
          type: 'restart',
          urgency: 'high'
        })
      );
    });

    it('should track deployment metrics and performance', async () => {
      const deploymentRequests = [
        { type: 'researcher', priority: 'normal' },
        { type: 'coder', priority: 'high' },
        { type: 'tester', priority: 'low' }
      ];

      // Setup successful deployments
      mockResourceDetector.detectAll.mockResolvedValue({
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(50),
        disk: TEST_CONFIG.mocks.generateDiskUsage(45),
        network: TEST_CONFIG.mocks.generateNetworkStats(100)
      });

      mockResourceAllocator.allocate.mockReturnValue({
        success: true,
        allocated: { cpu: 20, memory: 2048, disk: 1000 },
        reservationId: 'res-metrics'
      });

      mockAgentFactory.createAgent.mockImplementation((type: string) => ({
        id: `agent-${type}`,
        type,
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 20, memory: 2048, disk: 1000 }
      }));

      // Execute deployments
      for (const request of deploymentRequests) {
        await orchestrator.deployAgent(request);
      }

      // Get deployment metrics
      const metrics = await deploymentMonitor.getDeploymentMetrics();

      expect(metrics).toMatchObject({
        totalDeployments: 3,
        successfulDeployments: 3,
        failedDeployments: 0,
        averageDeploymentTime: expect.any(Number),
        resourceUtilization: expect.objectContaining({
          cpu: expect.any(Number),
          memory: expect.any(Number),
          disk: expect.any(Number)
        }),
        deploymentsByType: {
          researcher: 1,
          coder: 1,
          tester: 1
        }
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle resource detection failures gracefully', async () => {
      mockResourceDetector.detectAll.mockRejectedValue(
        new Error('Resource detection failed')
      );

      const result = await orchestrator.deployAgent({
        type: 'researcher',
        priority: 'normal'
      });

      expect(result).toMatchObject({
        success: false,
        reason: 'Resource detection failed',
        stage: 'resource_detection',
        recoverable: true
      });
    });

    it('should implement circuit breaker for repeated failures', async () => {
      // Setup consistent failures
      mockResourceDetector.detectAll.mockRejectedValue(
        new Error('Service unavailable')
      );

      // Attempt multiple deployments
      for (let i = 0; i < 5; i++) {
        await orchestrator.deployAgent({
          type: 'researcher',
          priority: 'normal'
        });
      }

      // Circuit breaker should be open
      const circuitState = orchestrator.getCircuitBreakerState();
      expect(circuitState).toBe('open');

      // Next request should fail fast
      const startTime = Date.now();
      const result = await orchestrator.deployAgent({
        type: 'researcher',
        priority: 'normal'
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(false);
      expect(result.reason).toContain('circuit breaker');
      expect(duration).toBeLessThan(100); // Should fail fast
    });

    it('should handle concurrent deployment conflicts', async () => {
      const mockSnapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpu: TEST_CONFIG.mocks.generateCpuLoad(70),
        memory: TEST_CONFIG.mocks.generateMemoryUsage(75),
        disk: TEST_CONFIG.mocks.generateDiskUsage(65),
        network: TEST_CONFIG.mocks.generateNetworkStats(80)
      };

      mockResourceDetector.detectAll.mockResolvedValue(mockSnapshot);
      mockPressureDetector.detectPressure.mockReturnValue({
        cpu: 'moderate',
        memory: 'moderate',
        disk: 'normal',
        network: 'normal',
        overall: 'moderate'
      });

      // Setup limited resources that can only handle one deployment
      mockResourceAllocator.allocate
        .mockReturnValueOnce({
          success: true,
          allocated: { cpu: 25, memory: 4096, disk: 2000 },
          reservationId: 'res-conflict-1'
        })
        .mockReturnValueOnce({
          success: false,
          reason: 'Insufficient resources',
          shortage: { cpu: 5, memory: 1024 }
        });

      const mockAgent: AgentInstance = {
        id: 'agent-conflict',
        type: 'analyst',
        status: 'ready',
        createdAt: Date.now(),
        resourceAllocation: { cpu: 25, memory: 4096, disk: 2000 }
      };

      mockAgentFactory.createAgent.mockReturnValue(mockAgent);

      // Execute concurrent deployments
      const [result1, result2] = await Promise.all([
        orchestrator.deployAgent({ type: 'analyst', priority: 'high' }),
        orchestrator.deployAgent({ type: 'analyst', priority: 'high' })
      ]);

      // One should succeed, one should fail
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.reason).toContain('Insufficient resources');
    });
  });
});