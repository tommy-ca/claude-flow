/**
 * Unit tests for Agent Factory
 * Tests agent creation based on resource availability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, TEST_FIXTURES } from '../test-config';

// These imports will fail initially (TDD approach)
import {
  AgentFactory,
  AgentType,
  AgentRequirements,
  AgentInstance,
  AgentCapabilities,
  AgentPool,
  ResourceRequirements,
  DeploymentStrategy
} from '../../../src/resource-manager/factory/agent-factory';

import {
  ResourceSnapshot,
  ResourceConstraints
} from '../../../src/resource-manager/types/resources';

describe('AgentFactory', () => {
  let factory: AgentFactory;
  let mockResourceSnapshot: ResourceSnapshot;

  beforeEach(() => {
    factory = new AgentFactory();
    
    // Default resource snapshot with normal load
    mockResourceSnapshot = {
      timestamp: Date.now(),
      cpu: TEST_CONFIG.mocks.generateCpuLoad(30),
      memory: TEST_CONFIG.mocks.generateMemoryUsage(45),
      disk: TEST_CONFIG.mocks.generateDiskUsage(50),
      network: TEST_CONFIG.mocks.generateNetworkStats(100)
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Type Definitions', () => {
    it('should define all standard agent types', () => {
      const agentTypes = factory.getAvailableAgentTypes();

      expect(agentTypes).toContain('researcher');
      expect(agentTypes).toContain('coder');
      expect(agentTypes).toContain('analyst');
      expect(agentTypes).toContain('tester');
      expect(agentTypes).toContain('coordinator');
      expect(agentTypes).toContain('architect');
    });

    it('should have resource requirements for each agent type', () => {
      const agentTypes = factory.getAvailableAgentTypes();

      agentTypes.forEach(type => {
        const requirements = factory.getAgentRequirements(type);
        
        expect(requirements).toMatchObject({
          cpu: expect.any(Number),
          memory: expect.any(Number),
          disk: expect.any(Number),
          network: expect.objectContaining({
            minBandwidth: expect.any(Number)
          })
        });
      });
    });

    it('should have capabilities defined for each agent type', () => {
      const capabilities = factory.getAgentCapabilities('researcher');

      expect(capabilities).toMatchObject({
        canSearch: true,
        canAnalyze: true,
        canWrite: false,
        canExecute: false,
        specializations: expect.arrayContaining(['web-search', 'documentation'])
      });
    });

    it('should support custom agent type registration', () => {
      const customAgent = {
        type: 'custom-analyzer',
        requirements: {
          cpu: 30,
          memory: 2048,
          disk: 1000,
          network: { minBandwidth: 10 }
        },
        capabilities: {
          canAnalyze: true,
          canVisualize: true,
          specializations: ['data-viz', 'ml-analysis']
        }
      };

      factory.registerAgentType(customAgent);

      expect(factory.getAvailableAgentTypes()).toContain('custom-analyzer');
      expect(factory.getAgentRequirements('custom-analyzer')).toEqual(customAgent.requirements);
    });
  });

  describe('Resource-Based Agent Creation', () => {
    it('should create agent when resources are sufficient', () => {
      const agent = factory.createAgent('researcher', mockResourceSnapshot);

      expect(agent).toMatchObject({
        id: expect.any(String),
        type: 'researcher',
        status: 'initializing',
        createdAt: expect.any(Number),
        resourceAllocation: expect.objectContaining({
          cpu: expect.any(Number),
          memory: expect.any(Number),
          disk: expect.any(Number)
        })
      });
    });

    it('should fail to create agent when CPU is insufficient', () => {
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(95);

      expect(() => factory.createAgent('coder', mockResourceSnapshot))
        .toThrow('Insufficient CPU resources');
    });

    it('should fail to create agent when memory is insufficient', () => {
      mockResourceSnapshot.memory = TEST_CONFIG.mocks.generateMemoryUsage(98);

      expect(() => factory.createAgent('analyst', mockResourceSnapshot))
        .toThrow('Insufficient memory resources');
    });

    it('should respect resource reservation buffer', () => {
      // Set resource buffer to ensure system stability
      factory.setResourceBuffer({
        cpu: 20,    // Keep 20% CPU free
        memory: 15, // Keep 15% memory free
        disk: 10    // Keep 10% disk free
      });

      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(75);

      expect(() => factory.createAgent('coder', mockResourceSnapshot))
        .toThrow('Insufficient resources after applying buffer');
    });

    it('should calculate accurate resource allocation', () => {
      const agent = factory.createAgent('researcher', mockResourceSnapshot);
      const requirements = factory.getAgentRequirements('researcher');

      expect(agent.resourceAllocation.cpu).toBe(requirements.cpu);
      expect(agent.resourceAllocation.memory).toBe(requirements.memory);
      expect(agent.resourceAllocation.disk).toBe(requirements.disk);
    });
  });

  describe('Agent Deployment Strategies', () => {
    it('should support greedy deployment strategy', () => {
      factory.setDeploymentStrategy('greedy');

      const agents = factory.deployAgents(mockResourceSnapshot, {
        targetAgents: ['coder', 'researcher', 'tester'],
        maxAgents: 5
      });

      // Greedy strategy deploys as many as possible
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.length).toBeLessThanOrEqual(5);
    });

    it('should support balanced deployment strategy', () => {
      factory.setDeploymentStrategy('balanced');

      const agents = factory.deployAgents(mockResourceSnapshot, {
        targetAgents: ['coder', 'researcher', 'analyst'],
        maxAgents: 6
      });

      // Balanced strategy tries to deploy equal numbers of each type
      const typeCounts = agents.reduce((acc, agent) => {
        acc[agent.type] = (acc[agent.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const counts = Object.values(typeCounts);
      const maxDiff = Math.max(...counts) - Math.min(...counts);
      expect(maxDiff).toBeLessThanOrEqual(1);
    });

    it('should support priority-based deployment strategy', () => {
      factory.setDeploymentStrategy('priority');

      const agents = factory.deployAgents(mockResourceSnapshot, {
        targetAgents: [
          { type: 'coordinator', priority: 1 },
          { type: 'coder', priority: 2 },
          { type: 'tester', priority: 3 }
        ],
        maxAgents: 3
      });

      // Should deploy in priority order
      expect(agents[0].type).toBe('coordinator');
      if (agents.length > 1) expect(agents[1].type).toBe('coder');
      if (agents.length > 2) expect(agents[2].type).toBe('tester');
    });

    it('should support resource-optimized deployment strategy', () => {
      factory.setDeploymentStrategy('resource-optimized');

      const agents = factory.deployAgents(mockResourceSnapshot, {
        targetAgents: ['researcher', 'coder', 'analyst'],
        optimizeFor: 'count' // Maximize agent count
      });

      // Should prefer lightweight agents to maximize count
      const researcherCount = agents.filter(a => a.type === 'researcher').length;
      const analystCount = agents.filter(a => a.type === 'analyst').length;

      expect(researcherCount).toBeGreaterThanOrEqual(analystCount);
    });
  });

  describe('Agent Pool Management', () => {
    let agentPool: AgentPool;

    beforeEach(() => {
      agentPool = factory.createAgentPool({
        maxAgents: 10,
        minAgents: 2,
        autoScale: true
      });
    });

    it('should create and manage agent pool', () => {
      expect(agentPool).toMatchObject({
        id: expect.any(String),
        maxAgents: 10,
        minAgents: 2,
        autoScale: true,
        agents: []
      });
    });

    it('should scale agents based on resource availability', async () => {
      // Start with normal resources
      await agentPool.scale(mockResourceSnapshot);
      const initialCount = agentPool.getActiveAgents().length;
      expect(initialCount).toBeGreaterThanOrEqual(2);

      // Simulate resource pressure
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(85);
      mockResourceSnapshot.memory = TEST_CONFIG.mocks.generateMemoryUsage(80);
      
      await agentPool.scale(mockResourceSnapshot);
      const reducedCount = agentPool.getActiveAgents().length;
      expect(reducedCount).toBeLessThan(initialCount);
    });

    it('should respect minimum agent count during scaling', async () => {
      // Simulate very high resource usage
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(95);
      mockResourceSnapshot.memory = TEST_CONFIG.mocks.generateMemoryUsage(95);

      await agentPool.scale(mockResourceSnapshot);
      
      expect(agentPool.getActiveAgents().length).toBe(2); // Minimum
    });

    it('should handle agent failures and replacement', async () => {
      await agentPool.scale(mockResourceSnapshot);
      const agents = agentPool.getActiveAgents();
      const agentToFail = agents[0];

      // Simulate agent failure
      agentPool.reportAgentFailure(agentToFail.id, 'Out of memory');

      expect(agentPool.getAgent(agentToFail.id)?.status).toBe('failed');

      // Pool should attempt to replace failed agent
      await agentPool.maintainPool(mockResourceSnapshot);

      const newAgents = agentPool.getActiveAgents();
      expect(newAgents.length).toBe(agents.length);
      expect(newAgents.find(a => a.id === agentToFail.id)).toBeUndefined();
    });

    it('should track agent performance metrics', async () => {
      await agentPool.scale(mockResourceSnapshot);
      const agent = agentPool.getActiveAgents()[0];

      // Simulate agent work
      agentPool.recordAgentMetric(agent.id, 'tasksCompleted', 5);
      agentPool.recordAgentMetric(agent.id, 'cpuTime', 1250);
      agentPool.recordAgentMetric(agent.id, 'memoryPeak', 512);

      const metrics = agentPool.getAgentMetrics(agent.id);

      expect(metrics).toMatchObject({
        tasksCompleted: 5,
        cpuTime: 1250,
        memoryPeak: 512,
        efficiency: expect.any(Number)
      });
    });

    it('should rebalance agent types based on workload', async () => {
      await agentPool.scale(mockResourceSnapshot);

      // Simulate workload that needs more coders
      const workloadProfile = {
        coding: 0.6,
        research: 0.2,
        testing: 0.2
      };

      await agentPool.rebalance(mockResourceSnapshot, workloadProfile);

      const agents = agentPool.getActiveAgents();
      const coderRatio = agents.filter(a => a.type === 'coder').length / agents.length;

      expect(coderRatio).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Resource Constraints and Limits', () => {
    it('should enforce per-agent resource limits', () => {
      factory.setAgentLimits('coder', {
        maxCpu: 30,
        maxMemory: 2048,
        maxDisk: 5000
      });

      const agent = factory.createAgent('coder', mockResourceSnapshot);

      expect(agent.resourceAllocation.cpu).toBeLessThanOrEqual(30);
      expect(agent.resourceAllocation.memory).toBeLessThanOrEqual(2048);
      expect(agent.resourceAllocation.disk).toBeLessThanOrEqual(5000);
    });

    it('should enforce global resource limits', () => {
      factory.setGlobalLimits({
        maxTotalCpu: 70,
        maxTotalMemory: 12288,
        maxTotalAgents: 8
      });

      const agents = factory.deployAgents(mockResourceSnapshot, {
        targetAgents: Array(20).fill('researcher'),
        maxAgents: 20
      });

      expect(agents.length).toBeLessThanOrEqual(8);

      const totalCpu = agents.reduce((sum, a) => sum + a.resourceAllocation.cpu, 0);
      const totalMemory = agents.reduce((sum, a) => sum + a.resourceAllocation.memory, 0);

      expect(totalCpu).toBeLessThanOrEqual(70);
      expect(totalMemory).toBeLessThanOrEqual(12288);
    });

    it('should handle resource fragmentation', () => {
      // Simulate fragmented resources (enough total, but not contiguous)
      mockResourceSnapshot.memory = {
        total: 16384,
        used: 8192,
        free: 8192,
        fragmented: true,
        largestFreeBlock: 1024,
        percentage: 50
      };

      // Should fail to create agent requiring more than largest free block
      expect(() => factory.createAgent('analyst', mockResourceSnapshot))
        .toThrow('Memory too fragmented');
    });
  });

  describe('Agent Lifecycle Management', () => {
    it('should initialize agent with proper lifecycle hooks', () => {
      const agent = factory.createAgent('researcher', mockResourceSnapshot);

      expect(agent.lifecycle).toMatchObject({
        onInit: expect.any(Function),
        onStart: expect.any(Function),
        onStop: expect.any(Function),
        onError: expect.any(Function),
        onDestroy: expect.any(Function)
      });
    });

    it('should transition agent through lifecycle states', async () => {
      const agent = factory.createAgent('coder', mockResourceSnapshot);
      const stateHistory: string[] = [];

      agent.on('stateChange', (state: string) => {
        stateHistory.push(state);
      });

      await factory.startAgent(agent.id);
      expect(agent.status).toBe('running');

      await factory.stopAgent(agent.id);
      expect(agent.status).toBe('stopped');

      await factory.destroyAgent(agent.id);
      expect(agent.status).toBe('destroyed');

      expect(stateHistory).toEqual(['initializing', 'ready', 'running', 'stopping', 'stopped', 'destroyed']);
    });

    it('should handle agent initialization failures', async () => {
      const agent = factory.createAgent('tester', mockResourceSnapshot);

      // Simulate initialization failure
      agent.lifecycle.onInit = vi.fn().mockRejectedValue(new Error('Init failed'));

      await expect(factory.startAgent(agent.id))
        .rejects.toThrow('Failed to initialize agent');

      expect(agent.status).toBe('failed');
      expect(agent.error).toBe('Init failed');
    });

    it('should implement agent health checks', async () => {
      const agent = factory.createAgent('coordinator', mockResourceSnapshot);
      await factory.startAgent(agent.id);

      // Configure health check
      factory.configureHealthCheck(agent.id, {
        interval: 1000,
        timeout: 500,
        maxFailures: 3
      });

      // Simulate healthy responses
      agent.healthCheck = vi.fn().mockResolvedValue({ healthy: true });

      await new Promise(resolve => setTimeout(resolve, 1500));
      expect(agent.healthCheck).toHaveBeenCalledAtLeast(1);
      expect(agent.health).toBe('healthy');

      // Simulate unhealthy response
      agent.healthCheck = vi.fn().mockResolvedValue({ healthy: false });
      
      await new Promise(resolve => setTimeout(resolve, 3500));
      expect(agent.health).toBe('unhealthy');
      expect(agent.status).toBe('failed');
    });
  });

  describe('Agent Communication and Coordination', () => {
    it('should establish inter-agent communication channels', async () => {
      const coordinator = factory.createAgent('coordinator', mockResourceSnapshot);
      const coder = factory.createAgent('coder', mockResourceSnapshot);

      await factory.startAgent(coordinator.id);
      await factory.startAgent(coder.id);

      const channel = factory.createChannel(coordinator.id, coder.id);

      expect(channel).toMatchObject({
        id: expect.any(String),
        source: coordinator.id,
        target: coder.id,
        status: 'open'
      });
    });

    it('should route messages between agents', async () => {
      const agents = await factory.deployAndStart(mockResourceSnapshot, {
        targetAgents: ['coordinator', 'coder', 'tester']
      });

      const coordinator = agents.find(a => a.type === 'coordinator')!;
      const coder = agents.find(a => a.type === 'coder')!;

      const messageReceived = vi.fn();
      factory.onMessage(coder.id, messageReceived);

      await factory.sendMessage(coordinator.id, coder.id, {
        type: 'task',
        payload: { action: 'implement', feature: 'auth' }
      });

      expect(messageReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          from: coordinator.id,
          type: 'task',
          payload: { action: 'implement', feature: 'auth' }
        })
      );
    });

    it('should support broadcast messaging', async () => {
      const agents = await factory.deployAndStart(mockResourceSnapshot, {
        targetAgents: ['coordinator', 'coder', 'coder', 'tester']
      });

      const coordinator = agents.find(a => a.type === 'coordinator')!;
      const receivers: string[] = [];

      agents.forEach(agent => {
        if (agent.id !== coordinator.id) {
          factory.onMessage(agent.id, () => {
            receivers.push(agent.id);
          });
        }
      });

      await factory.broadcast(coordinator.id, {
        type: 'announcement',
        payload: { message: 'Task completed' }
      });

      expect(receivers.length).toBe(agents.length - 1);
    });
  });

  describe('Resource Recovery and Optimization', () => {
    it('should detect and reclaim unused resources', async () => {
      const pool = factory.createAgentPool({ maxAgents: 5 });
      await pool.scale(mockResourceSnapshot);

      // Mark some agents as idle
      const agents = pool.getActiveAgents();
      pool.markAgentIdle(agents[0].id, 300000); // 5 minutes idle

      const reclaimable = pool.getReclaimableResources();

      expect(reclaimable).toMatchObject({
        cpu: agents[0].resourceAllocation.cpu,
        memory: agents[0].resourceAllocation.memory,
        disk: agents[0].resourceAllocation.disk
      });

      await pool.reclaimResources();
      expect(pool.getAgent(agents[0].id)?.status).toBe('stopped');
    });

    it('should optimize resource allocation over time', async () => {
      const pool = factory.createAgentPool({ 
        maxAgents: 10,
        enableOptimization: true 
      });

      // Simulate workload patterns
      for (let i = 0; i < 10; i++) {
        await pool.scale(mockResourceSnapshot);
        
        // Record performance metrics
        pool.getActiveAgents().forEach(agent => {
          const efficiency = Math.random() * 0.5 + 0.5; // 50-100%
          pool.recordAgentMetric(agent.id, 'efficiency', efficiency);
        });

        await pool.optimize();
      }

      // Pool should favor more efficient agent configurations
      const finalAgents = pool.getActiveAgents();
      const avgEfficiency = finalAgents.reduce((sum, agent) => {
        return sum + (pool.getAgentMetrics(agent.id)?.efficiency || 0);
      }, 0) / finalAgents.length;

      expect(avgEfficiency).toBeGreaterThan(0.7);
    });

    it('should implement resource defragmentation', async () => {
      // Simulate fragmented state with many small agents
      const fragmentedPool = factory.createAgentPool({ maxAgents: 20 });
      
      // Deploy many small agents
      for (let i = 0; i < 15; i++) {
        const agent = factory.createAgent('researcher', mockResourceSnapshot);
        fragmentedPool.addAgent(agent);
      }

      const beforeDefrag = fragmentedPool.getResourceFragmentation();
      expect(beforeDefrag).toBeGreaterThan(0.5);

      await fragmentedPool.defragment(mockResourceSnapshot);

      const afterDefrag = fragmentedPool.getResourceFragmentation();
      expect(afterDefrag).toBeLessThan(beforeDefrag);
    });
  });
});