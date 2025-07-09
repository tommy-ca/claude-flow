/**
 * System Integration Tests for Resource Management System
 * End-to-end testing of the complete resource management workflow
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ResourceManagerFactory } from '../../../src/resource-manager/factory/resource-manager-factory';
import { ResourceDetector } from '../../../src/resource-manager/monitors/resource-detector';
import { ResourceMonitor } from '../../../src/resource-manager/monitors/resource-monitor';
import { PressureDetector } from '../../../src/resource-manager/monitors/pressure-detector';
import { AgentResourceManager } from '../../../src/resource-manager/agents/agent-resource-manager';
import { ResourceDashboard } from '../../../src/resource-manager/monitors/resource-dashboard';
import { MCPResourceReport, ResourceAllocationRequest } from '../../../src/mcp/resource-protocol';

// Mock external dependencies
jest.mock('systeminformation');
jest.mock('node-os-utils');

describe('System Integration Tests', () => {
  let factory: ResourceManagerFactory;
  let resourceManager: any;
  let detector: ResourceDetector;
  let monitor: ResourceMonitor;
  let pressureDetector: PressureDetector;
  let agentManager: AgentResourceManager;
  let dashboard: ResourceDashboard;

  beforeEach(async () => {
    // Initialize the complete system
    factory = new ResourceManagerFactory();
    resourceManager = await factory.createResourceManager();
    
    detector = new ResourceDetector();
    monitor = new ResourceMonitor(detector);
    pressureDetector = new PressureDetector();
    agentManager = new AgentResourceManager(pressureDetector);
    dashboard = new ResourceDashboard(resourceManager, pressureDetector, agentManager);

    // Initialize all components
    await detector.initialize();
    await monitor.initialize();
    await pressureDetector.initialize();
    await agentManager.initialize();
    await dashboard.initialize();
  });

  afterEach(async () => {
    // Cleanup all components
    await dashboard.shutdown();
    await agentManager.shutdown();
    await pressureDetector.shutdown();
    await monitor.shutdown();
    await detector.shutdown();
    await resourceManager.shutdown();
  });

  describe('Complete Workflow Integration', () => {
    test('should handle complete resource allocation workflow', async () => {
      // Step 1: Register MCP servers
      const servers: MCPResourceReport[] = [
        {
          serverId: 'integration-server-1',
          timestamp: Date.now(),
          status: 'healthy',
          resources: {
            cpu: { cores: 8, usage: 30, available: 5.6 },
            memory: { total: 16384, used: 4915, available: 11469, usage: 30 },
            disk: { total: 1000000, used: 300000, available: 700000, usage: 30 },
            network: { bytesIn: 2048000, bytesOut: 1024000, usage: 20 },
            gpu: []
          },
          capabilities: ['compute', 'storage'],
          version: '1.0.0'
        },
        {
          serverId: 'integration-server-2',
          timestamp: Date.now(),
          status: 'healthy',
          resources: {
            cpu: { cores: 4, usage: 45, available: 2.2 },
            memory: { total: 8192, used: 3686, available: 4506, usage: 45 },
            disk: { total: 500000, used: 225000, available: 275000, usage: 45 },
            network: { bytesIn: 1024000, bytesOut: 512000, usage: 30 },
            gpu: []
          },
          capabilities: ['compute'],
          version: '1.0.0'
        }
      ];

      // Register servers
      for (const server of servers) {
        await resourceManager.registerServer(server);
      }

      // Step 2: Register agents with different QoS requirements
      await agentManager.registerAgent({
        agentId: 'high-priority-agent',
        type: 'web-server',
        qosClass: 'Guaranteed',
        resources: {
          cpu: { minimum: 2, maximum: 4, target: 70 },
          memory: { minimum: 2048, maximum: 4096, target: 80 },
          priority: 9
        },
        scaling: {
          enabled: true,
          minReplicas: 2,
          maxReplicas: 8,
          scaleUpThreshold: 80,
          scaleDownThreshold: 30,
          scaleUpCooldown: 60000,
          scaleDownCooldown: 300000
        },
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 3
        }
      });

      await agentManager.registerAgent({
        agentId: 'background-agent',
        type: 'background-worker',
        qosClass: 'BestEffort',
        resources: {
          cpu: { minimum: 0.5, maximum: 2, target: 60 },
          memory: { minimum: 512, maximum: 2048, target: 70 },
          priority: 3
        },
        scaling: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 4,
          scaleUpThreshold: 85,
          scaleDownThreshold: 25,
          scaleUpCooldown: 120000,
          scaleDownCooldown: 600000
        },
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 10000,
          retries: 2
        }
      });

      // Step 3: Start monitoring and dashboard
      monitor.startMonitoring();
      pressureDetector.startMonitoring();
      await dashboard.start();

      // Step 4: Allocate resources for high-priority agent
      const allocationRequest: ResourceAllocationRequest = {
        requestId: 'req-high-priority-001',
        agentId: 'high-priority-agent',
        agentType: 'web-server',
        requirements: {
          cpu: { cores: 2 },
          memory: { minimum: 2048, preferred: 3072 },
          gpu: { required: false },
          priority: 9
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'high-priority-web-serving',
          duration: 'long-running'
        }
      };

      const allocation = await resourceManager.allocateResources(allocationRequest);
      expect(allocation.allocated).toBe(true);
      expect(allocation.serverId).toBeDefined();

      // Step 5: Simulate resource pressure
      const pressuredServer = {
        ...servers[0],
        timestamp: Date.now() + 10000,
        resources: {
          ...servers[0].resources,
          cpu: { ...servers[0].resources.cpu, usage: 92 },
          memory: { 
            ...servers[0].resources.memory, 
            used: 15728, 
            available: 656, 
            usage: 96 
          }
        }
      };

      await resourceManager.updateServerStatus(pressuredServer);

      // Step 6: Wait for pressure detection and auto-scaling
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 7: Verify pressure was detected
      const pressureAnalysis = await pressureDetector.analyzePressure();
      expect(pressureAnalysis.overall.level).not.toBe('normal');

      // Step 8: Verify dashboard captured all events
      const dashboardMetrics = dashboard.getMetrics();
      expect(dashboardMetrics.cluster.totalServers).toBe(2);
      expect(dashboardMetrics.agents.totalAgents).toBe(2);

      // Step 9: Generate optimization plan
      const optimizationPlan = await resourceManager.generateOptimizationPlan('balanced');
      expect(optimizationPlan.actions.length).toBeGreaterThan(0);

      // Step 10: Apply optimization
      const optimizationResults = await resourceManager.applyOptimizationPlan(optimizationPlan);
      expect(optimizationResults.length).toBeGreaterThan(0);

      // Step 11: Release resources
      const released = await resourceManager.releaseResources('req-high-priority-001');
      expect(released).toBe(true);

      // Step 12: Verify final state
      const finalMetrics = dashboard.getMetrics();
      expect(finalMetrics).toBeDefined();
    }, 15000); // Increased timeout for complete workflow

    test('should handle multiple concurrent allocations', async () => {
      // Register a high-capacity server
      const server: MCPResourceReport = {
        serverId: 'concurrent-test-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 16, usage: 20, available: 12.8 },
          memory: { total: 32768, used: 6553, available: 26215, usage: 20 },
          disk: { total: 2000000, used: 400000, available: 1600000, usage: 20 },
          network: { bytesIn: 4096000, bytesOut: 2048000, usage: 15 },
          gpu: []
        },
        capabilities: ['compute', 'storage'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);

      // Create multiple allocation requests
      const requests: ResourceAllocationRequest[] = Array.from({ length: 5 }, (_, i) => ({
        requestId: `concurrent-req-${i}`,
        agentId: `concurrent-agent-${i}`,
        agentType: 'worker',
        requirements: {
          cpu: { cores: 1 },
          memory: { minimum: 1024, preferred: 2048 },
          gpu: { required: false },
          priority: 5
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'concurrent-testing',
          duration: 'short-term'
        }
      }));

      // Allocate all resources concurrently
      const allocations = await Promise.all(
        requests.map(req => resourceManager.allocateResources(req))
      );

      // Verify all allocations succeeded
      allocations.forEach(allocation => {
        expect(allocation.allocated).toBe(true);
        expect(allocation.serverId).toBe('concurrent-test-server');
      });

      // Release all resources
      const releases = await Promise.all(
        requests.map(req => resourceManager.releaseResources(req.requestId))
      );

      releases.forEach(released => {
        expect(released).toBe(true);
      });
    });

    test('should handle server failure and recovery scenarios', async () => {
      // Register servers
      const primaryServer: MCPResourceReport = {
        serverId: 'primary-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 40, available: 4.8 },
          memory: { total: 16384, used: 6553, available: 9831, usage: 40 },
          disk: { total: 1000000, used: 400000, available: 600000, usage: 40 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 25 },
          gpu: []
        },
        capabilities: ['compute', 'storage'],
        version: '1.0.0'
      };

      const backupServer: MCPResourceReport = {
        serverId: 'backup-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 4, usage: 20, available: 3.2 },
          memory: { total: 8192, used: 1638, available: 6554, usage: 20 },
          disk: { total: 500000, used: 100000, available: 400000, usage: 20 },
          network: { bytesIn: 1024000, bytesOut: 512000, usage: 15 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(primaryServer);
      await resourceManager.registerServer(backupServer);

      // Allocate on primary server
      const allocation = await resourceManager.allocateResources({
        requestId: 'failover-test-req',
        agentId: 'failover-test-agent',
        agentType: 'critical-service',
        requirements: {
          cpu: { cores: 2 },
          memory: { minimum: 2048, preferred: 4096 },
          gpu: { required: false },
          priority: 8
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'failover-testing',
          duration: 'long-running'
        }
      });

      expect(allocation.allocated).toBe(true);
      expect(allocation.serverId).toBe('primary-server');

      // Simulate primary server failure
      const failedServer = {
        ...primaryServer,
        timestamp: Date.now() + 5000,
        status: 'offline' as const
      };

      await resourceManager.updateServerStatus(failedServer);

      // Verify failover to backup server for new allocations
      const newAllocation = await resourceManager.allocateResources({
        requestId: 'failover-new-req',
        agentId: 'failover-new-agent',
        agentType: 'service',
        requirements: {
          cpu: { cores: 1 },
          memory: { minimum: 1024, preferred: 2048 },
          gpu: { required: false },
          priority: 6
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'post-failover-testing',
          duration: 'medium-term'
        }
      });

      expect(newAllocation.allocated).toBe(true);
      expect(newAllocation.serverId).toBe('backup-server');

      // Simulate primary server recovery
      const recoveredServer = {
        ...primaryServer,
        timestamp: Date.now() + 10000,
        status: 'healthy' as const
      };

      await resourceManager.updateServerStatus(recoveredServer);

      // Verify server is available again
      const healthyServers = await resourceManager.getHealthyServers();
      expect(healthyServers).toHaveLength(2);
      expect(healthyServers.find(s => s.serverId === 'primary-server')).toBeDefined();
    });

    test('should handle resource pressure escalation and mitigation', async () => {
      // Setup server with limited resources
      const limitedServer: MCPResourceReport = {
        serverId: 'limited-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 4, usage: 60, available: 1.6 },
          memory: { total: 8192, used: 4915, available: 3277, usage: 60 },
          disk: { total: 250000, used: 150000, available: 100000, usage: 60 },
          network: { bytesIn: 1024000, bytesOut: 512000, usage: 40 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(limitedServer);

      // Register agents with different priorities
      const agents = [
        {
          agentId: 'critical-agent',
          priority: 10,
          qosClass: 'Guaranteed' as const
        },
        {
          agentId: 'normal-agent',
          priority: 5,
          qosClass: 'Burstable' as const
        },
        {
          agentId: 'low-priority-agent',
          priority: 2,
          qosClass: 'BestEffort' as const
        }
      ];

      for (const agent of agents) {
        await agentManager.registerAgent({
          agentId: agent.agentId,
          type: 'service',
          qosClass: agent.qosClass,
          resources: {
            cpu: { minimum: 0.5, maximum: 2, target: 70 },
            memory: { minimum: 512, maximum: 2048, target: 80 },
            priority: agent.priority
          },
          scaling: {
            enabled: true,
            minReplicas: 1,
            maxReplicas: 3,
            scaleUpThreshold: 80,
            scaleDownThreshold: 30,
            scaleUpCooldown: 60000,
            scaleDownCooldown: 300000
          },
          healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000,
            retries: 3
          }
        });
      }

      // Start monitoring
      pressureDetector.startMonitoring(1000); // Fast monitoring for test

      // Gradually increase pressure
      const pressureSteps = [75, 85, 95, 98];
      
      for (const pressure of pressureSteps) {
        const pressuredServer = {
          ...limitedServer,
          timestamp: Date.now(),
          resources: {
            ...limitedServer.resources,
            cpu: { ...limitedServer.resources.cpu, usage: pressure },
            memory: { 
              ...limitedServer.resources.memory,
              used: Math.floor(limitedServer.resources.memory.total * pressure / 100),
              available: Math.floor(limitedServer.resources.memory.total * (100 - pressure) / 100),
              usage: pressure
            }
          }
        };

        await resourceManager.updateServerStatus(pressuredServer);
        
        // Wait for pressure detection
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check pressure level
        const analysis = await pressureDetector.analyzePressure();
        
        if (pressure >= 95) {
          expect(['critical', 'emergency']).toContain(analysis.overall.level);
        } else if (pressure >= 85) {
          expect(['warning', 'critical']).toContain(analysis.overall.level);
        }
      }

      // Verify mitigation actions were suggested
      const finalAnalysis = await pressureDetector.analyzePressure();
      expect(finalAnalysis.mitigationActions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration Tests', () => {
    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Register multiple servers
      const servers = Array.from({ length: 10 }, (_, i) => ({
        serverId: `perf-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 8, usage: 30 + (i % 30), available: 5.6 - ((i % 30) * 0.187) },
          memory: { total: 16384, used: 4915 + (i * 100), available: 11469 - (i * 100), usage: 30 + (i % 30) },
          disk: { total: 1000000, used: 300000 + (i * 10000), available: 700000 - (i * 10000), usage: 30 + (i % 20) },
          network: { bytesIn: 2048000 + (i * 50000), bytesOut: 1024000 + (i * 25000), usage: 20 + (i % 25) },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      // Register all servers
      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Create multiple allocation requests
      const requests = Array.from({ length: 50 }, (_, i) => ({
        requestId: `perf-req-${i}`,
        agentId: `perf-agent-${i}`,
        agentType: 'worker',
        requirements: {
          cpu: { cores: 1 },
          memory: { minimum: 1024, preferred: 2048 },
          gpu: { required: false },
          priority: 5
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'performance-testing',
          duration: 'short-term'
        }
      }));

      // Perform allocations
      const allocationPromises = requests.map(req => resourceManager.allocateResources(req));
      const allocations = await Promise.all(allocationPromises);

      const allocationTime = Date.now() - startTime;

      // Verify allocations
      const successfulAllocations = allocations.filter(a => a.allocated);
      expect(successfulAllocations.length).toBeGreaterThan(0);

      // Performance assertion (should complete within reasonable time)
      expect(allocationTime).toBeLessThan(5000); // 5 seconds for 50 allocations

      // Cleanup
      const releasePromises = successfulAllocations.map(a => 
        resourceManager.releaseResources(a.requestId)
      );
      await Promise.all(releasePromises);

      console.log(`Performance test completed:
        - Registered 10 servers
        - Processed 50 allocation requests in ${allocationTime}ms
        - ${successfulAllocations.length} successful allocations`);
    });

    test('should handle rapid status updates efficiently', async () => {
      const server: MCPResourceReport = {
        serverId: 'rapid-update-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 50, available: 4 },
          memory: { total: 16384, used: 8192, available: 8192, usage: 50 },
          disk: { total: 1000000, used: 500000, available: 500000, usage: 50 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 30 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);

      const startTime = Date.now();
      const updateCount = 100;

      // Perform rapid updates
      const updatePromises = Array.from({ length: updateCount }, (_, i) => {
        const updatedServer = {
          ...server,
          timestamp: Date.now() + i,
          resources: {
            ...server.resources,
            cpu: { ...server.resources.cpu, usage: 50 + (i % 30) }
          }
        };
        return resourceManager.updateServerStatus(updatedServer);
      });

      await Promise.all(updatePromises);

      const updateTime = Date.now() - startTime;

      // Verify final state
      const finalStatus = await resourceManager.getServerStatus('rapid-update-server');
      expect(finalStatus).toBeDefined();

      // Performance assertion
      expect(updateTime).toBeLessThan(2000); // 2 seconds for 100 updates

      console.log(`Rapid update test completed:
        - Processed ${updateCount} status updates in ${updateTime}ms
        - Average: ${(updateTime / updateCount).toFixed(2)}ms per update`);
    });
  });

  describe('Data Consistency Integration Tests', () => {
    test('should maintain data consistency across all components', async () => {
      // Register server
      const server: MCPResourceReport = {
        serverId: 'consistency-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 40, available: 4.8 },
          memory: { total: 16384, used: 6553, available: 9831, usage: 40 },
          disk: { total: 1000000, used: 400000, available: 600000, usage: 40 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 25 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);

      // Register agent
      await agentManager.registerAgent({
        agentId: 'consistency-agent',
        type: 'service',
        qosClass: 'Guaranteed',
        resources: {
          cpu: { minimum: 2, maximum: 4, target: 70 },
          memory: { minimum: 2048, maximum: 4096, target: 80 },
          priority: 8
        },
        scaling: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 3,
          scaleUpThreshold: 80,
          scaleDownThreshold: 30,
          scaleUpCooldown: 60000,
          scaleDownCooldown: 300000
        },
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 3
        }
      });

      // Start all monitoring
      monitor.startMonitoring();
      pressureDetector.startMonitoring();
      await dashboard.start();

      // Perform allocation
      const allocation = await resourceManager.allocateResources({
        requestId: 'consistency-req',
        agentId: 'consistency-agent',
        agentType: 'service',
        requirements: {
          cpu: { cores: 2 },
          memory: { minimum: 2048, preferred: 3072 },
          gpu: { required: false },
          priority: 8
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'consistency-testing',
          duration: 'medium-term'
        }
      });

      expect(allocation.allocated).toBe(true);

      // Update agent metrics
      const agentMetrics = await detector.getResourceMetrics();
      await agentManager.updateAgentUsage('consistency-agent', {
        ...agentMetrics,
        cpu: { ...agentMetrics.cpu, usage: 75 },
        memory: { ...agentMetrics.memory, usage: 80 }
      });

      // Wait for all components to process updates
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify consistency across all components
      
      // 1. Resource Manager state
      const rmServerStatus = await resourceManager.getServerStatus('consistency-server');
      expect(rmServerStatus.serverId).toBe('consistency-server');

      // 2. Agent Manager state
      const agentUsage = agentManager.getAgentUsage('consistency-agent');
      expect(agentUsage).toBeDefined();
      expect(agentUsage?.agentId).toBe('consistency-agent');

      // 3. Dashboard state
      const dashboardMetrics = dashboard.getMetrics();
      expect(dashboardMetrics.cluster.totalServers).toBe(1);
      expect(dashboardMetrics.agents.totalAgents).toBe(1);

      // 4. Pressure Detector state
      const pressureAnalysis = await pressureDetector.analyzePressure();
      expect(pressureAnalysis).toBeDefined();

      // All components should reflect the same underlying state
      expect(dashboardMetrics.cluster.healthyServers).toBe(1);
      expect(dashboardMetrics.agents.healthyAgents).toBe(1);
    });
  });
});