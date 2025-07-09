/**
 * MCP Integration Tests for Resource Management System
 * Tests integration between resource manager and MCP protocol
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ResourceManager } from '../../../src/resource-manager/core/resource-manager';
import { ResourceManagerConfigManager } from '../../../src/config/resource-manager-config';
import { ResourceMemoryManager } from '../../../src/memory/resource-memory';
import { MCPResourceReport, ResourceAllocationRequest } from '../../../src/mcp/resource-protocol';

// Mock MCP components
jest.mock('../../../src/mcp/resource-protocol');
jest.mock('../../../src/config/resource-manager-config');
jest.mock('../../../src/memory/resource-memory');

describe('MCP Integration Tests', () => {
  let resourceManager: ResourceManager;
  let configManager: jest.Mocked<ResourceManagerConfigManager>;
  let memoryManager: jest.Mocked<ResourceMemoryManager>;

  beforeEach(async () => {
    // Setup mocked dependencies
    configManager = {
      initialize: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        monitoring: { enabled: true, interval: 5000 },
        optimization: { enabled: true, strategy: 'balanced', schedule: { enabled: false } },
        thresholds: {
          cpu: { warning: 80, critical: 90 },
          memory: { warning: 80, critical: 90 }
        }
      }),
      updateConfig: jest.fn(),
      validateConfig: jest.fn()
    } as any;

    memoryManager = {
      initialize: jest.fn(),
      storeMetrics: jest.fn(),
      storeEvent: jest.fn(),
      queryMetrics: jest.fn().mockResolvedValue([]),
      shutdown: jest.fn()
    } as any;

    resourceManager = new ResourceManager(configManager, memoryManager);
    await resourceManager.initialize();
  });

  afterEach(async () => {
    await resourceManager.shutdown();
    jest.clearAllMocks();
  });

  describe('MCP Server Registration', () => {
    test('should register MCP server with resource report', async () => {
      const report: MCPResourceReport = {
        serverId: 'test-server-1',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: {
            cores: 4,
            usage: 45.5,
            available: 2.18
          },
          memory: {
            total: 8192,
            used: 3276,
            available: 4916,
            usage: 40.0
          },
          disk: {
            total: 500000,
            used: 200000,
            available: 300000,
            usage: 40.0
          },
          network: {
            bytesIn: 1024000,
            bytesOut: 512000,
            usage: 25.0
          },
          gpu: []
        },
        capabilities: ['compute', 'storage'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(report);

      // Verify server was registered
      const serverStatus = await resourceManager.getServerStatus('test-server-1');
      expect(serverStatus).toEqual(report);
      expect(memoryManager.storeMetrics).toHaveBeenCalledWith(report);
    });

    test('should update server status when receiving updates', async () => {
      const initialReport: MCPResourceReport = {
        serverId: 'test-server-2',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 2, usage: 30, available: 1.4 },
          memory: { total: 4096, used: 1024, available: 3072, usage: 25 },
          disk: { total: 250000, used: 100000, available: 150000, usage: 40 },
          network: { bytesIn: 500000, bytesOut: 250000, usage: 15 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      // Register server
      await resourceManager.registerServer(initialReport);

      // Update server status
      const updatedReport = {
        ...initialReport,
        timestamp: Date.now() + 5000,
        status: 'degraded' as const,
        resources: {
          ...initialReport.resources,
          cpu: { ...initialReport.resources.cpu, usage: 85 }
        }
      };

      await resourceManager.updateServerStatus(updatedReport);

      // Verify status was updated
      const serverStatus = await resourceManager.getServerStatus('test-server-2');
      expect(serverStatus.status).toBe('degraded');
      expect(serverStatus.resources.cpu.usage).toBe(85);
    });
  });

  describe('Resource Allocation via MCP', () => {
    beforeEach(async () => {
      // Register a test server
      const server: MCPResourceReport = {
        serverId: 'allocation-test-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 30, available: 5.6 },
          memory: { total: 16384, used: 4096, available: 12288, usage: 25 },
          disk: { total: 1000000, used: 300000, available: 700000, usage: 30 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 20 },
          gpu: []
        },
        capabilities: ['compute', 'storage'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);
    });

    test('should allocate resources for agent via MCP request', async () => {
      const request: ResourceAllocationRequest = {
        requestId: 'req-001',
        agentId: 'test-agent-1',
        agentType: 'web-server',
        requirements: {
          cpu: { cores: 2 },
          memory: { minimum: 1024, preferred: 2048 },
          gpu: { required: false },
          priority: 7
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'web-serving',
          duration: 'long-running'
        }
      };

      const response = await resourceManager.allocateResources(request);

      expect(response.allocated).toBe(true);
      expect(response.serverId).toBe('allocation-test-server');
      expect(response.requestId).toBe('req-001');
      expect(response.allocation).toBeDefined();
    });

    test('should fail allocation when insufficient resources', async () => {
      const request: ResourceAllocationRequest = {
        requestId: 'req-002',
        agentId: 'test-agent-2',
        agentType: 'compute-intensive',
        requirements: {
          cpu: { cores: 16 }, // More than available
          memory: { minimum: 32768, preferred: 65536 }, // More than available
          gpu: { required: false },
          priority: 5
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'heavy-computation',
          duration: 'short-term'
        }
      };

      const response = await resourceManager.allocateResources(request);

      expect(response.allocated).toBe(false);
      expect(response.reason).toContain('No suitable servers available');
      expect(response.alternativeServers).toEqual([]);
    });

    test('should release allocated resources', async () => {
      // First allocate
      const request: ResourceAllocationRequest = {
        requestId: 'req-003',
        agentId: 'test-agent-3',
        agentType: 'background-task',
        requirements: {
          cpu: { cores: 1 },
          memory: { minimum: 512, preferred: 1024 },
          gpu: { required: false },
          priority: 3
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'background-processing',
          duration: 'medium-term'
        }
      };

      const allocation = await resourceManager.allocateResources(request);
      expect(allocation.allocated).toBe(true);

      // Then release
      const released = await resourceManager.releaseResources('req-003');
      expect(released).toBe(true);
    });
  });

  describe('MCP Resource Reporting', () => {
    test('should handle multiple server reports simultaneously', async () => {
      const servers: MCPResourceReport[] = [
        {
          serverId: 'multi-server-1',
          timestamp: Date.now(),
          status: 'healthy',
          resources: {
            cpu: { cores: 4, usage: 50, available: 2 },
            memory: { total: 8192, used: 4096, available: 4096, usage: 50 },
            disk: { total: 500000, used: 250000, available: 250000, usage: 50 },
            network: { bytesIn: 1000000, bytesOut: 500000, usage: 30 },
            gpu: []
          },
          capabilities: ['compute'],
          version: '1.0.0'
        },
        {
          serverId: 'multi-server-2',
          timestamp: Date.now(),
          status: 'healthy',
          resources: {
            cpu: { cores: 8, usage: 25, available: 6 },
            memory: { total: 16384, used: 2048, available: 14336, usage: 12.5 },
            disk: { total: 1000000, used: 100000, available: 900000, usage: 10 },
            network: { bytesIn: 2000000, bytesOut: 1000000, usage: 20 },
            gpu: []
          },
          capabilities: ['compute', 'storage'],
          version: '1.0.0'
        },
        {
          serverId: 'multi-server-3',
          timestamp: Date.now(),
          status: 'degraded',
          resources: {
            cpu: { cores: 2, usage: 90, available: 0.2 },
            memory: { total: 4096, used: 3686, available: 410, usage: 90 },
            disk: { total: 250000, used: 225000, available: 25000, usage: 90 },
            network: { bytesIn: 500000, bytesOut: 250000, usage: 85 },
            gpu: []
          },
          capabilities: ['compute'],
          version: '1.0.0'
        }
      ];

      // Register all servers
      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Verify all servers are registered
      const allServers = await resourceManager.getAllServerStatus();
      expect(allServers).toHaveLength(3);

      // Check healthy servers
      const healthyServers = await resourceManager.getHealthyServers();
      expect(healthyServers).toHaveLength(2); // Only healthy and degraded, not offline

      // Check cluster utilization
      const utilization = await resourceManager.getClusterUtilization();
      expect(utilization.cpu).toBeGreaterThan(0);
      expect(utilization.memory).toBeGreaterThan(0);
    });

    test('should handle server offline scenarios', async () => {
      const server: MCPResourceReport = {
        serverId: 'offline-test-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 4, usage: 40, available: 2.4 },
          memory: { total: 8192, used: 3276, available: 4916, usage: 40 },
          disk: { total: 500000, used: 200000, available: 300000, usage: 40 },
          network: { bytesIn: 1024000, bytesOut: 512000, usage: 25 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);

      // Simulate server going offline
      const offlineReport = {
        ...server,
        timestamp: Date.now() + 10000,
        status: 'offline' as const
      };

      await resourceManager.updateServerStatus(offlineReport);

      // Verify server is marked as offline
      const serverStatus = await resourceManager.getServerStatus('offline-test-server');
      expect(serverStatus.status).toBe('offline');

      // Verify it's not included in healthy servers
      const healthyServers = await resourceManager.getHealthyServers();
      expect(healthyServers.find(s => s.serverId === 'offline-test-server')).toBeUndefined();
    });
  });

  describe('Resource Analysis Integration', () => {
    test('should perform resource analysis across MCP servers', async () => {
      // Register servers with different utilization patterns
      const servers: MCPResourceReport[] = [
        {
          serverId: 'analysis-server-1',
          timestamp: Date.now(),
          status: 'healthy',
          resources: {
            cpu: { cores: 4, usage: 95, available: 0.2 }, // Overloaded
            memory: { total: 8192, used: 7864, available: 328, usage: 96 }, // Overloaded
            disk: { total: 500000, used: 200000, available: 300000, usage: 40 },
            network: { bytesIn: 1024000, bytesOut: 512000, usage: 25 },
            gpu: []
          },
          capabilities: ['compute'],
          version: '1.0.0'
        },
        {
          serverId: 'analysis-server-2',
          timestamp: Date.now(),
          status: 'healthy',
          resources: {
            cpu: { cores: 8, usage: 15, available: 6.8 }, // Underutilized
            memory: { total: 16384, used: 1638, available: 14746, usage: 10 }, // Underutilized
            disk: { total: 1000000, used: 100000, available: 900000, usage: 10 },
            network: { bytesIn: 2000000, bytesOut: 1000000, usage: 5 },
            gpu: []
          },
          capabilities: ['compute', 'storage'],
          version: '1.0.0'
        }
      ];

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Perform analysis
      const analysis = await resourceManager.analyzeResourceUsage();

      // Verify analysis identifies issues and opportunities
      expect(analysis.issues).toHaveLength(1);
      expect(analysis.issues[0].type).toBe('overload');
      expect(analysis.issues[0].affectedServers).toContain('analysis-server-1');

      expect(analysis.opportunities).toHaveLength(1);
      expect(analysis.opportunities[0].type).toBe('consolidation');

      expect(analysis.recommendations).toHaveLength(2);
    });

    test('should generate optimization plans based on MCP data', async () => {
      // Register a server with issues
      const server: MCPResourceReport = {
        serverId: 'optimization-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 4, usage: 92, available: 0.32 },
          memory: { total: 8192, used: 7372, available: 820, usage: 90 },
          disk: { total: 500000, used: 450000, available: 50000, usage: 90 },
          network: { bytesIn: 1024000, bytesOut: 512000, usage: 80 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);

      // Generate optimization plan
      const plan = await resourceManager.generateOptimizationPlan('balanced');

      expect(plan.strategy).toBe('balanced');
      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0].type).toBe('migrate');
      expect(plan.expectedOutcomes).toBeDefined();
      expect(plan.expectedOutcomes.cpuReduction).toBeDefined();
      expect(plan.expectedOutcomes.memorySavings).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle MCP server connection failures gracefully', async () => {
      // Simulate a server that fails to report
      const failingServer: MCPResourceReport = {
        serverId: 'failing-server',
        timestamp: Date.now() - 300000, // 5 minutes old
        status: 'healthy',
        resources: {
          cpu: { cores: 4, usage: 50, available: 2 },
          memory: { total: 8192, used: 4096, available: 4096, usage: 50 },
          disk: { total: 500000, used: 250000, available: 250000, usage: 50 },
          network: { bytesIn: 1000000, bytesOut: 500000, usage: 30 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(failingServer);

      // Verify server is still accessible but may be considered stale
      const serverStatus = await resourceManager.getServerStatus('failing-server');
      expect(serverStatus).toBeDefined();
    });

    test('should handle invalid resource allocation requests', async () => {
      const invalidRequest: ResourceAllocationRequest = {
        requestId: 'invalid-req',
        agentId: '',
        agentType: '',
        requirements: {
          cpu: { cores: -1 }, // Invalid negative cores
          memory: { minimum: -1, preferred: -1 }, // Invalid negative memory
          gpu: { required: false },
          priority: 11 // Invalid priority (should be 1-10)
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: '',
          duration: ''
        }
      };

      // This should either handle gracefully or throw an appropriate error
      const response = await resourceManager.allocateResources(invalidRequest);
      expect(response.allocated).toBe(false);
      expect(response.reason).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large numbers of MCP servers efficiently', async () => {
      const startTime = Date.now();
      const numServers = 100;
      
      // Create and register many servers
      const servers: MCPResourceReport[] = Array.from({ length: numServers }, (_, i) => ({
        serverId: `perf-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 4, usage: 30 + (i % 50), available: 2.8 - ((i % 50) * 0.056) },
          memory: { total: 8192, used: 2457 + (i * 10), available: 5735 - (i * 10), usage: 30 + (i % 50) },
          disk: { total: 500000, used: 150000 + (i * 1000), available: 350000 - (i * 1000), usage: 30 + (i % 30) },
          network: { bytesIn: 1000000 + (i * 10000), bytesOut: 500000 + (i * 5000), usage: 20 + (i % 40) },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      const registrationTime = Date.now() - startTime;

      // Verify all servers are registered
      const allServers = await resourceManager.getAllServerStatus();
      expect(allServers).toHaveLength(numServers);

      // Test cluster operations performance
      const clusterStartTime = Date.now();
      const utilization = await resourceManager.getClusterUtilization();
      const healthyServers = await resourceManager.getHealthyServers();
      const clusterTime = Date.now() - clusterStartTime;

      expect(utilization).toBeDefined();
      expect(healthyServers).toHaveLength(numServers);

      // Performance assertions (should complete reasonably quickly)
      expect(registrationTime).toBeLessThan(5000); // 5 seconds
      expect(clusterTime).toBeLessThan(1000); // 1 second

      console.log(`Performance test completed:
        - Registered ${numServers} servers in ${registrationTime}ms
        - Cluster operations completed in ${clusterTime}ms`);
    });
  });
});