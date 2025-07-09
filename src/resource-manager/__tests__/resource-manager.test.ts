/**
 * Resource Manager Tests
 * Basic test suite for resource management functionality
 */

import { ResourceManager } from '../core/resource-manager';
import { ResourceMonitorConfig, ResourceManagerOptions } from '../types';

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;
  
  const testConfig: ResourceMonitorConfig = {
    interval: 1000,
    enableCPU: true,
    enableMemory: true,
    enableDisk: true,
    enableNetwork: true,
    enableGPU: false,
    historySize: 10,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      disk: 90
    }
  };

  const testOptions: ResourceManagerOptions = {
    monitorConfig: testConfig,
    enableAutoScaling: false,
    enablePrediction: false,
    persistHistory: true,
    maxAllocationsPerAgent: 5,
    defaultPriority: 'medium'
  };

  beforeEach(() => {
    resourceManager = new ResourceManager(testOptions);
  });

  afterEach(async () => {
    await resourceManager.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(resourceManager.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await resourceManager.initialize();
      await expect(resourceManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('resource allocation', () => {
    beforeEach(async () => {
      await resourceManager.initialize();
      // Wait for initial resource detection
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should allocate resources successfully', async () => {
      const allocation = await resourceManager.allocate({
        agentId: 'test-agent',
        resourceType: 'cpu',
        amount: 10,
        priority: 'medium'
      });

      expect(allocation).toBeDefined();
      expect(allocation.agentId).toBe('test-agent');
      expect(allocation.resourceType).toBe('cpu');
      expect(allocation.amount).toBe(10);
      expect(allocation.status).toBe('active');
    });

    it('should track allocations by agent', async () => {
      const allocation = await resourceManager.allocate({
        agentId: 'test-agent',
        resourceType: 'cpu',
        amount: 10,
        priority: 'medium'
      });

      const agentAllocations = resourceManager.getAllocationsByAgent('test-agent');
      expect(agentAllocations).toHaveLength(1);
      expect(agentAllocations[0].id).toBe(allocation.id);
    });

    it('should deallocate resources', async () => {
      const allocation = await resourceManager.allocate({
        agentId: 'test-agent',
        resourceType: 'cpu',
        amount: 10,
        priority: 'medium'
      });

      await resourceManager.deallocate(allocation.id);

      const agentAllocations = resourceManager.getAllocationsByAgent('test-agent');
      expect(agentAllocations).toHaveLength(0);
    });

    it('should respect agent allocation limits', async () => {
      const promises: Promise<any>[] = [];
      
      // Try to allocate more than the limit
      for (let i = 0; i < 10; i++) {
        promises.push(
          resourceManager.allocate({
            agentId: 'test-agent',
            resourceType: 'cpu',
            amount: 1,
            priority: 'medium'
          }).catch(err => err)
        );
      }

      const results = await Promise.all(promises);
      
      // Should have some successful allocations and some errors
      const successful = results.filter(r => r.id);
      const errors = results.filter(r => r instanceof Error);
      
      expect(successful.length).toBeLessThanOrEqual(5);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate allocation requests', async () => {
      await expect(resourceManager.allocate({
        agentId: '',
        resourceType: 'cpu',
        amount: 10,
        priority: 'medium'
      })).rejects.toThrow('Agent ID is required');

      await expect(resourceManager.allocate({
        agentId: 'test-agent',
        resourceType: 'cpu',
        amount: 0,
        priority: 'medium'
      })).rejects.toThrow('Amount must be greater than 0');
    });
  });

  describe('resource monitoring', () => {
    beforeEach(async () => {
      await resourceManager.initialize();
      // Wait for initial resource detection
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should get current resources', () => {
      const resources = resourceManager.getResources();
      expect(resources).toBeInstanceOf(Array);
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should get resource summary', () => {
      const summary = resourceManager.getResourceSummary();
      
      expect(summary).toBeDefined();
      expect(summary.timestamp).toBeInstanceOf(Date);
      expect(summary.totalResources).toBeGreaterThan(0);
      expect(summary.resourcesByType).toBeDefined();
    });

    it('should emit resource events', (done) => {
      resourceManager.on('resource:event', (event) => {
        expect(event).toBeDefined();
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      // Trigger an event by allocating
      resourceManager.allocate({
        agentId: 'test-agent',
        resourceType: 'cpu',
        amount: 10,
        priority: 'medium'
      });
    });
  });

  describe('pending requests', () => {
    beforeEach(async () => {
      await resourceManager.initialize();
      // Wait for initial resource detection
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should handle pending requests when resources unavailable', async () => {
      // Try to allocate an impossible amount
      try {
        await resourceManager.allocate({
          agentId: 'test-agent',
          resourceType: 'cpu',
          amount: 200, // 200% CPU
          priority: 'medium'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('No suitable');
      }

      const pendingRequests = resourceManager.getPendingRequests();
      expect(pendingRequests.length).toBeGreaterThan(0);
    });

    it('should cancel pending requests', async () => {
      try {
        await resourceManager.allocate({
          id: 'test-request',
          agentId: 'test-agent',
          resourceType: 'cpu',
          amount: 200,
          priority: 'medium'
        });
      } catch (error) {
        // Expected to fail
      }

      const cancelled = resourceManager.cancelPendingRequest('test-request');
      expect(cancelled).toBe(true);

      const pendingRequests = resourceManager.getPendingRequests();
      expect(pendingRequests.find(r => r.id === 'test-request')).toBeUndefined();
    });
  });

  describe('history tracking', () => {
    beforeEach(async () => {
      await resourceManager.initialize();
      // Wait for initial resource detection
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should track allocation history', async () => {
      const allocation = await resourceManager.allocate({
        agentId: 'test-agent',
        resourceType: 'cpu',
        amount: 10,
        priority: 'medium'
      });

      await resourceManager.deallocate(allocation.id);

      const history = resourceManager.getAllocationHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history.find(h => h.id === allocation.id)).toBeDefined();
    });

    it('should track event history', async () => {
      await resourceManager.allocate({
        agentId: 'test-agent',
        resourceType: 'cpu',
        amount: 10,
        priority: 'medium'
      });

      const eventHistory = resourceManager.getEventHistory();
      expect(eventHistory.length).toBeGreaterThan(0);
      expect(eventHistory.some(e => e.type === 'allocation')).toBe(true);
    });
  });
});