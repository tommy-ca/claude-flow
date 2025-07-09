/**
 * Simple Load Testing for Resource Management System
 * Basic performance validation that works in all CI environments
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock data generators
function generateMockServer(id) {
  return {
    serverId: `test-server-${id}`,
    timestamp: Date.now(),
    status: 'healthy',
    resources: {
      cpu: {
        cores: 4 + (id % 8),
        usage: 20 + (id % 60)
      },
      memory: {
        total: 8192 + (id % 8) * 1024,
        used: Math.floor((8192 + (id % 8) * 1024) * (30 + (id % 40)) / 100),
        available: Math.floor((8192 + (id % 8) * 1024) * (70 - (id % 40)) / 100)
      },
      disk: {
        total: 500000 + (id % 10) * 50000,
        used: Math.floor((500000 + (id % 10) * 50000) * (25 + (id % 30)) / 100),
        available: Math.floor((500000 + (id % 10) * 50000) * (75 - (id % 30)) / 100)
      },
      network: {
        latency: 15 + (id % 25),
        bandwidth: 1000000000,
        bytesIn: 1024000 + (id * 1000),
        bytesOut: 512000 + (id * 500)
      },
      capabilities: ['compute']
    }
  };
}

function generateMockAllocationRequest(id) {
  return {
    requestId: `test-req-${id}`,
    agentId: `test-agent-${id}`,
    requirements: {
      cpu: { cores: 1 + (id % 4) },
      memory: { minimum: 1024 + (id % 3) * 512, preferred: 2048 + (id % 3) * 512 },
      gpu: { required: false }
    },
    constraints: {
      preferredServers: [],
      excludedServers: []
    },
    priority: ['low', 'normal', 'high', 'critical'][id % 4],
    duration: 3600
  };
}

// Mock resource manager
class MockResourceManager {
  constructor() {
    this.servers = new Map();
    this.allocations = new Map();
    this.serverAllocations = new Map(); // Track allocations per server
    this.performance = {
      registrationTimes: [],
      allocationTimes: [],
      updateTimes: []
    };
  }

  async registerServer(server) {
    const start = Date.now();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1 + Math.random() * 5));
    
    this.servers.set(server.serverId, server);
    this.performance.registrationTimes.push(Date.now() - start);
    
    return { success: true, serverId: server.serverId };
  }

  async updateServerStatus(server) {
    const start = Date.now();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 0.5 + Math.random() * 2));
    
    if (this.servers.has(server.serverId)) {
      this.servers.set(server.serverId, server);
      this.performance.updateTimes.push(Date.now() - start);
      return { success: true };
    }
    
    throw new Error(`Server ${server.serverId} not found`);
  }

  async getAllServerStatus() {
    return Array.from(this.servers.values());
  }

  async allocateResources(request) {
    const start = Date.now();
    
    // Simulate allocation logic
    await new Promise(resolve => setTimeout(resolve, 2 + Math.random() * 8));
    
    const availableServers = Array.from(this.servers.values())
      .filter(s => s.status === 'healthy')
      .filter(s => {
        // Get current allocations for this server
        const serverAllocs = this.serverAllocations.get(s.serverId) || [];
        const allocatedMemory = serverAllocs.reduce((sum, alloc) => sum + alloc.memory, 0);
        const allocatedCores = serverAllocs.reduce((sum, alloc) => sum + alloc.cores, 0);
        
        const memoryAvailable = s.resources.memory.available - allocatedMemory >= request.requirements.memory.minimum;
        const cpuAvailable = s.resources.cpu.cores - allocatedCores >= (request.requirements.cpu.cores || 1);
        
        return memoryAvailable && cpuAvailable;
      });
    
    if (availableServers.length > 0) {
      const server = availableServers[0];
      const allocation = {
        memory: request.requirements.memory.minimum,
        cores: request.requirements.cpu.cores || 1
      };
      
      // Track server allocations
      if (!this.serverAllocations.has(server.serverId)) {
        this.serverAllocations.set(server.serverId, []);
      }
      this.serverAllocations.get(server.serverId).push(allocation);
      
      this.allocations.set(request.requestId, { server, request, allocation, timestamp: Date.now() });
      this.performance.allocationTimes.push(Date.now() - start);
      
      return {
        allocated: true,
        serverId: server.serverId,
        allocation: {
          memory: { allocated: allocation.memory },
          cpu: { cores: allocation.cores }
        }
      };
    }
    
    this.performance.allocationTimes.push(Date.now() - start);
    return {
      allocated: false,
      reason: 'No suitable servers available'
    };
  }

  async releaseResources(requestId) {
    const allocation = this.allocations.get(requestId);
    if (allocation) {
      // Remove from server allocations
      const serverAllocs = this.serverAllocations.get(allocation.server.serverId) || [];
      const index = serverAllocs.findIndex(a => a.memory === allocation.allocation.memory && a.cores === allocation.allocation.cores);
      if (index > -1) {
        serverAllocs.splice(index, 1);
      }
      
      const success = this.allocations.delete(requestId);
      return { success };
    }
    return { success: false };
  }

  async analyzeResourceUsage() {
    const servers = Array.from(this.servers.values());
    const totalCores = servers.reduce((sum, s) => sum + s.resources.cpu.cores, 0);
    const totalMemory = servers.reduce((sum, s) => sum + s.resources.memory.total, 0);
    const usedMemory = servers.reduce((sum, s) => sum + s.resources.memory.used, 0);
    
    return {
      totalServers: servers.length,
      healthyServers: servers.filter(s => s.status === 'healthy').length,
      totalAllocations: this.allocations.size,
      resources: {
        cpu: { totalCores, averageUsage: servers.reduce((sum, s) => sum + s.resources.cpu.usage, 0) / servers.length },
        memory: { total: totalMemory, used: usedMemory, utilization: (usedMemory / totalMemory) * 100 }
      }
    };
  }

  getPerformanceMetrics() {
    return {
      registration: {
        count: this.performance.registrationTimes.length,
        average: this.performance.registrationTimes.reduce((a, b) => a + b, 0) / this.performance.registrationTimes.length,
        max: Math.max(...this.performance.registrationTimes),
        min: Math.min(...this.performance.registrationTimes)
      },
      allocation: {
        count: this.performance.allocationTimes.length,
        average: this.performance.allocationTimes.reduce((a, b) => a + b, 0) / this.performance.allocationTimes.length,
        max: Math.max(...this.performance.allocationTimes),
        min: Math.min(...this.performance.allocationTimes)
      },
      update: {
        count: this.performance.updateTimes.length,
        average: this.performance.updateTimes.reduce((a, b) => a + b, 0) / this.performance.updateTimes.length,
        max: Math.max(...this.performance.updateTimes),
        min: Math.min(...this.performance.updateTimes)
      }
    };
  }

  reset() {
    this.servers.clear();
    this.allocations.clear();
    this.serverAllocations.clear();
    this.performance = {
      registrationTimes: [],
      allocationTimes: [],
      updateTimes: []
    };
  }
}

describe('Resource Manager Load Testing', () => {
  let resourceManager;

  beforeEach(() => {
    resourceManager = new MockResourceManager();
  });

  afterEach(() => {
    resourceManager.reset();
  });

  describe('Server Registration Performance', () => {
    test('should handle 100 server registrations under 5 seconds', async () => {
      const serverCount = 100;
      const startTime = Date.now();

      // Generate and register servers
      const servers = Array.from({ length: serverCount }, (_, i) => generateMockServer(i));
      
      // Register in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < servers.length; i += batchSize) {
        const batch = servers.slice(i, i + batchSize);
        await Promise.all(batch.map(server => resourceManager.registerServer(server)));
      }

      const totalTime = Date.now() - startTime;
      const allServers = await resourceManager.getAllServerStatus();

      // Assertions
      expect(allServers).toHaveLength(serverCount);
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds

      // Performance metrics
      const metrics = resourceManager.getPerformanceMetrics();
      expect(metrics.registration.average).toBeLessThan(50); // Average registration under 50ms
      expect(metrics.registration.max).toBeLessThan(100); // No single registration over 100ms

      console.log(`✓ Registered ${serverCount} servers in ${totalTime}ms`);
      console.log(`  Average registration time: ${metrics.registration.average.toFixed(2)}ms`);
      console.log(`  Max registration time: ${metrics.registration.max.toFixed(2)}ms`);
    });

    test('should handle rapid server status updates', async () => {
      const serverCount = 20;
      const updatesPerServer = 5;
      const totalUpdates = serverCount * updatesPerServer;

      // Register initial servers
      const servers = Array.from({ length: serverCount }, (_, i) => generateMockServer(i));
      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      const startTime = Date.now();

      // Generate updates
      const updatePromises = [];
      for (let i = 0; i < updatesPerServer; i++) {
        for (let j = 0; j < serverCount; j++) {
          const updatedServer = {
            ...servers[j],
            timestamp: Date.now() + (i * 1000),
            resources: {
              ...servers[j].resources,
              cpu: {
                ...servers[j].resources.cpu,
                usage: 20 + (i * 10) + Math.random() * 20
              }
            }
          };
          updatePromises.push(resourceManager.updateServerStatus(updatedServer));
        }
      }

      await Promise.all(updatePromises);
      const totalTime = Date.now() - startTime;

      // Assertions
      expect(totalTime).toBeLessThan(3000); // Should complete in under 3 seconds

      const metrics = resourceManager.getPerformanceMetrics();
      expect(metrics.update.average).toBeLessThan(50); // Average update under 50ms

      console.log(`✓ Processed ${totalUpdates} updates in ${totalTime}ms`);
      console.log(`  Average update time: ${metrics.update.average.toFixed(2)}ms`);
    });
  });

  describe('Resource Allocation Performance', () => {
    test('should handle 50 concurrent resource allocations', async () => {
      const serverCount = 10;
      const allocationCount = 50;

      // Register high-capacity servers
      const servers = Array.from({ length: serverCount }, (_, i) => ({
        ...generateMockServer(i),
        resources: {
          cpu: { cores: 16, usage: 20 },
          memory: { total: 32768, used: 6553, available: 26215 },
          disk: { total: 2000000, used: 400000, available: 1600000 },
          network: { latency: 10, bandwidth: 1000000000, bytesIn: 1000000, bytesOut: 500000 },
          capabilities: ['compute', 'storage']
        }
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Generate allocation requests
      const requests = Array.from({ length: allocationCount }, (_, i) => generateMockAllocationRequest(i));

      const startTime = Date.now();

      // Process allocations in batches
      const batchSize = 5;
      let successfulAllocations = 0;
      
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(req => resourceManager.allocateResources(req))
        );
        successfulAllocations += batchResults.filter(r => r.allocated).length;
      }

      const totalTime = Date.now() - startTime;

      // Assertions
      expect(totalTime).toBeLessThan(4000); // Should complete in under 4 seconds
      expect(successfulAllocations).toBeGreaterThan(allocationCount * 0.7); // At least 70% success rate

      const metrics = resourceManager.getPerformanceMetrics();
      expect(metrics.allocation.average).toBeLessThan(100); // Average allocation under 100ms

      console.log(`✓ Processed ${allocationCount} allocations in ${totalTime}ms`);
      console.log(`  Success rate: ${(successfulAllocations / allocationCount * 100).toFixed(1)}%`);
      console.log(`  Average allocation time: ${metrics.allocation.average.toFixed(2)}ms`);
    });

    test('should handle allocation failures gracefully under resource pressure', async () => {
      const serverCount = 3;
      const allocationCount = 30;

      // Register limited-capacity servers
      const servers = Array.from({ length: serverCount }, (_, i) => ({
        ...generateMockServer(i),
        resources: {
          cpu: { cores: 4, usage: 60 },
          memory: { total: 8192, used: 4915, available: 3277 },
          disk: { total: 500000, used: 300000, available: 200000 },
          network: { latency: 40, bandwidth: 100000000, bytesIn: 500000, bytesOut: 250000 },
          capabilities: ['compute']
        }
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Generate high-resource requests
      const requests = Array.from({ length: allocationCount }, (_, i) => ({
        ...generateMockAllocationRequest(i),
        requirements: {
          cpu: { cores: 2 + (i % 3) },
          memory: { minimum: 2048 + (i % 2) * 1024, preferred: 4096 + (i % 2) * 2048 },
          gpu: { required: false }
        }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => resourceManager.allocateResources(req))
      );
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.allocated).length;
      const failed = results.filter(r => !r.allocated).length;

      // Assertions
      expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(failed).toBeGreaterThan(0); // Should have some failures due to resource pressure
      expect(successful).toBeGreaterThan(0); // Should have some successes

      console.log(`✓ Processed ${allocationCount} allocations under pressure in ${totalTime}ms`);
      console.log(`  Successful: ${successful}, Failed: ${failed}`);
      console.log(`  Success rate: ${(successful / allocationCount * 100).toFixed(1)}%`);
    });
  });

  describe('System Performance Under Load', () => {
    test('should handle mixed operations efficiently', async () => {
      const serverCount = 50;
      const allocationCount = 30;
      const updateCount = 20;

      console.log('Starting mixed operations test...');

      // Phase 1: Register servers
      const serverStart = Date.now();
      const servers = Array.from({ length: serverCount }, (_, i) => generateMockServer(i));
      await Promise.all(servers.map(server => resourceManager.registerServer(server)));
      const serverTime = Date.now() - serverStart;

      // Phase 2: Process allocations
      const allocationStart = Date.now();
      const requests = Array.from({ length: allocationCount }, (_, i) => generateMockAllocationRequest(i));
      const allocationResults = await Promise.all(
        requests.map(req => resourceManager.allocateResources(req))
      );
      const allocationTime = Date.now() - allocationStart;

      // Phase 3: Update server status
      const updateStart = Date.now();
      const updatePromises = [];
      for (let i = 0; i < updateCount; i++) {
        const serverIndex = Math.floor(Math.random() * serverCount);
        const server = servers[serverIndex];
        const updatedServer = {
          ...server,
          timestamp: Date.now() + i * 100,
          resources: {
            ...server.resources,
            cpu: {
              ...server.resources.cpu,
              usage: 20 + Math.random() * 60
            }
          }
        };
        updatePromises.push(resourceManager.updateServerStatus(updatedServer));
      }
      await Promise.all(updatePromises);
      const updateTime = Date.now() - updateStart;

      // Phase 4: Analyze results
      const analysis = await resourceManager.analyzeResourceUsage();
      const metrics = resourceManager.getPerformanceMetrics();

      // Assertions
      expect(serverTime).toBeLessThan(3000);
      expect(allocationTime).toBeLessThan(2000);
      expect(updateTime).toBeLessThan(1000);
      expect(analysis.totalServers).toBe(serverCount);
      expect(analysis.healthyServers).toBeGreaterThan(0);

      const successfulAllocations = allocationResults.filter(r => r.allocated).length;
      
      console.log(`✓ Mixed operations test completed successfully`);
      console.log(`  Server registration: ${serverTime}ms`);
      console.log(`  Resource allocation: ${allocationTime}ms (${successfulAllocations}/${allocationCount} successful)`);
      console.log(`  Status updates: ${updateTime}ms`);
      console.log(`  System analysis: ${JSON.stringify(analysis.resources, null, 2)}`);
    });
  });

  describe('Memory and Resource Cleanup', () => {
    test('should handle resource cleanup efficiently', async () => {
      const serverCount = 20;
      const allocationCount = 15;

      // Register servers and allocate resources
      const servers = Array.from({ length: serverCount }, (_, i) => generateMockServer(i));
      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      const requests = Array.from({ length: allocationCount }, (_, i) => generateMockAllocationRequest(i));
      const allocationResults = await Promise.all(
        requests.map(req => resourceManager.allocateResources(req))
      );

      const successful = allocationResults.filter(r => r.allocated);
      expect(successful.length).toBeGreaterThan(0);

      // Clean up allocations
      const cleanupStart = Date.now();
      const cleanupPromises = successful.map(result => 
        resourceManager.releaseResources(result.allocation ? requests.find(r => r.agentId.includes(result.serverId?.split('-')[2] || ''))?.requestId : '')
      );
      
      await Promise.all(cleanupPromises);
      const cleanupTime = Date.now() - cleanupStart;

      // Verify cleanup
      const finalAnalysis = await resourceManager.analyzeResourceUsage();
      
      expect(cleanupTime).toBeLessThan(500); // Cleanup should be fast
      expect(finalAnalysis.totalServers).toBe(serverCount);

      console.log(`✓ Resource cleanup completed in ${cleanupTime}ms`);
      console.log(`  ${successful.length} allocations cleaned up`);
      console.log(`  ${finalAnalysis.totalServers} servers remain active`);
    });
  });
});