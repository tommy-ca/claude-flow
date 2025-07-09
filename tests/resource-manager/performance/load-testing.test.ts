/**
 * Load Testing for Resource Management System
 * Tests system performance under heavy load conditions
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

describe('Load Testing Suite', () => {
  let factory: ResourceManagerFactory;
  let resourceManager: any;
  let detector: ResourceDetector;
  let monitor: ResourceMonitor;
  let pressureDetector: PressureDetector;
  let agentManager: AgentResourceManager;
  let dashboard: ResourceDashboard;

  beforeEach(async () => {
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
    await dashboard.shutdown();
    await agentManager.shutdown();
    await pressureDetector.shutdown();
    await monitor.shutdown();
    await detector.shutdown();
    await resourceManager.shutdown();
  });

  describe('High Volume Server Registration', () => {
    test('should handle 1000 server registrations efficiently', async () => {
      const serverCount = 1000;
      const startTime = Date.now();

      // Generate test servers
      const servers: MCPResourceReport[] = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `load-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { 
            cores: 4 + (i % 16), 
            usage: 20 + (i % 60), 
            available: (4 + (i % 16)) * (1 - (20 + (i % 60)) / 100)
          },
          memory: { 
            total: 8192 + (i % 8) * 1024, 
            used: Math.floor((8192 + (i % 8) * 1024) * (30 + (i % 40)) / 100),
            available: Math.floor((8192 + (i % 8) * 1024) * (70 - (i % 40)) / 100),
            usage: 30 + (i % 40)
          },
          disk: { 
            total: 500000 + (i % 10) * 50000, 
            used: Math.floor((500000 + (i % 10) * 50000) * (25 + (i % 30)) / 100),
            available: Math.floor((500000 + (i % 10) * 50000) * (75 - (i % 30)) / 100),
            usage: 25 + (i % 30)
          },
          network: { 
            bytesIn: 1024000 + (i * 1000), 
            bytesOut: 512000 + (i * 500), 
            usage: 15 + (i % 25)
          },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      // Register servers in batches for better performance
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < servers.length; i += batchSize) {
        batches.push(servers.slice(i, i + batchSize));
      }

      // Process batches
      for (const batch of batches) {
        await Promise.all(batch.map(server => resourceManager.registerServer(server)));
      }

      const registrationTime = Date.now() - startTime;

      // Verify all servers were registered
      const allServers = await resourceManager.getAllServerStatus();
      expect(allServers).toHaveLength(serverCount);

      // Performance assertions
      expect(registrationTime).toBeLessThan(30000); // Should complete in under 30 seconds
      console.log(`Registered ${serverCount} servers in ${registrationTime}ms`);
      console.log(`Average registration time: ${(registrationTime / serverCount).toFixed(2)}ms per server`);
    });

    test('should handle rapid server status updates', async () => {
      const serverCount = 50;
      const updatesPerServer = 20;
      const totalUpdates = serverCount * updatesPerServer;

      // Register initial servers
      const servers: MCPResourceReport[] = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `update-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 8, usage: 40, available: 4.8 },
          memory: { total: 16384, used: 6553, available: 9831, usage: 40 },
          disk: { total: 1000000, used: 400000, available: 600000, usage: 40 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 25 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

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
                usage: 40 + (i * 2) % 50 
              }
            }
          };
          updatePromises.push(resourceManager.updateServerStatus(updatedServer));
        }
      }

      // Process all updates
      await Promise.all(updatePromises);

      const updateTime = Date.now() - startTime;

      // Performance assertions
      expect(updateTime).toBeLessThan(20000); // Should complete in under 20 seconds
      console.log(`Processed ${totalUpdates} updates in ${updateTime}ms`);
      console.log(`Average update time: ${(updateTime / totalUpdates).toFixed(2)}ms per update`);
    });
  });

  describe('Resource Allocation Under Load', () => {
    test('should handle 500 concurrent resource allocations', async () => {
      const allocationCount = 500;
      const serverCount = 20;

      // Register servers with high capacity
      const servers: MCPResourceReport[] = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `allocation-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 16, usage: 20, available: 12.8 },
          memory: { total: 32768, used: 6553, available: 26215, usage: 20 },
          disk: { total: 2000000, used: 400000, available: 1600000, usage: 20 },
          network: { bytesIn: 4096000, bytesOut: 2048000, usage: 15 },
          gpu: []
        },
        capabilities: ['compute', 'storage'],
        version: '1.0.0'
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Generate allocation requests
      const requests: ResourceAllocationRequest[] = Array.from({ length: allocationCount }, (_, i) => ({
        requestId: `load-req-${i}`,
        agentId: `load-agent-${i}`,
        agentType: 'worker',
        requirements: {
          cpu: { cores: 1 + (i % 4) },
          memory: { minimum: 1024 + (i % 3) * 512, preferred: 2048 + (i % 3) * 512 },
          gpu: { required: false },
          priority: 1 + (i % 10)
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'load-testing',
          duration: 'short-term'
        }
      }));

      const startTime = Date.now();

      // Process allocations in batches
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < requests.length; i += batchSize) {
        batches.push(requests.slice(i, i + batchSize));
      }

      let successfulAllocations = 0;
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(req => resourceManager.allocateResources(req))
        );
        successfulAllocations += batchResults.filter(r => r.allocated).length;
      }

      const allocationTime = Date.now() - startTime;

      // Performance assertions
      expect(allocationTime).toBeLessThan(25000); // Should complete in under 25 seconds
      expect(successfulAllocations).toBeGreaterThan(allocationCount * 0.8); // At least 80% success rate

      console.log(`Processed ${allocationCount} allocations in ${allocationTime}ms`);
      console.log(`Success rate: ${(successfulAllocations / allocationCount * 100).toFixed(1)}%`);
      console.log(`Average allocation time: ${(allocationTime / allocationCount).toFixed(2)}ms per allocation`);

      // Cleanup - release all successful allocations
      const releasePromises = [];
      for (let i = 0; i < allocationCount; i++) {
        releasePromises.push(resourceManager.releaseResources(`load-req-${i}`));
      }
      await Promise.all(releasePromises);
    });

    test('should handle allocation failures gracefully under resource pressure', async () => {
      const serverCount = 5;
      const allocationCount = 100;

      // Register servers with limited capacity
      const servers: MCPResourceReport[] = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `limited-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 4, usage: 60, available: 1.6 },
          memory: { total: 8192, used: 4915, available: 3277, usage: 60 },
          disk: { total: 500000, used: 300000, available: 200000, usage: 60 },
          network: { bytesIn: 1024000, bytesOut: 512000, usage: 40 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Generate high-resource requests
      const requests: ResourceAllocationRequest[] = Array.from({ length: allocationCount }, (_, i) => ({
        requestId: `pressure-req-${i}`,
        agentId: `pressure-agent-${i}`,
        agentType: 'high-demand',
        requirements: {
          cpu: { cores: 2 + (i % 3) },
          memory: { minimum: 2048 + (i % 4) * 1024, preferred: 4096 + (i % 4) * 1024 },
          gpu: { required: false },
          priority: 1 + (i % 10)
        },
        constraints: {
          location: 'any',
          isolation: false
        },
        metadata: {
          purpose: 'pressure-testing',
          duration: 'medium-term'
        }
      }));

      const startTime = Date.now();

      // Process allocations
      const results = await Promise.all(
        requests.map(req => resourceManager.allocateResources(req))
      );

      const allocationTime = Date.now() - startTime;

      const successful = results.filter(r => r.allocated).length;
      const failed = results.filter(r => !r.allocated).length;

      // System should handle failures gracefully
      expect(allocationTime).toBeLessThan(15000); // Should complete in under 15 seconds
      expect(failed).toBeGreaterThan(0); // Should have some failures due to resource pressure
      expect(successful).toBeGreaterThan(0); // Should have some successes

      console.log(`Processed ${allocationCount} allocations under pressure in ${allocationTime}ms`);
      console.log(`Successful: ${successful}, Failed: ${failed}`);
      console.log(`Success rate: ${(successful / allocationCount * 100).toFixed(1)}%`);
    });
  });

  describe('Agent Management Under Load', () => {
    test('should handle 200 agent registrations efficiently', async () => {
      const agentCount = 200;
      const startTime = Date.now();

      // Generate agent configurations
      const agentConfigs = Array.from({ length: agentCount }, (_, i) => ({
        agentId: `load-agent-${i}`,
        type: ['web-server', 'background-worker', 'api-service'][i % 3],
        qosClass: (['Guaranteed', 'Burstable', 'BestEffort'] as const)[i % 3],
        resources: {
          cpu: { 
            minimum: 0.5 + (i % 2) * 0.5, 
            maximum: 2 + (i % 4), 
            target: 60 + (i % 20) 
          },
          memory: { 
            minimum: 512 + (i % 4) * 256, 
            maximum: 2048 + (i % 4) * 1024, 
            target: 70 + (i % 20) 
          },
          priority: 1 + (i % 10)
        },
        scaling: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 2 + (i % 4),
          scaleUpThreshold: 75 + (i % 15),
          scaleDownThreshold: 25 + (i % 15),
          scaleUpCooldown: 60000 + (i % 5) * 30000,
          scaleDownCooldown: 300000 + (i % 5) * 60000
        },
        healthCheck: {
          enabled: i % 2 === 0,
          interval: 30000 + (i % 6) * 10000,
          timeout: 5000 + (i % 3) * 2000,
          retries: 2 + (i % 3)
        }
      }));

      // Register agents in batches
      const batchSize = 25;
      const batches = [];
      for (let i = 0; i < agentConfigs.length; i += batchSize) {
        batches.push(agentConfigs.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await Promise.all(batch.map(config => agentManager.registerAgent(config)));
      }

      const registrationTime = Date.now() - startTime;

      // Verify all agents were registered
      const allAgents = agentManager.getAllAgentsUsage();
      expect(allAgents).toHaveLength(agentCount);

      // Performance assertions
      expect(registrationTime).toBeLessThan(20000); // Should complete in under 20 seconds
      console.log(`Registered ${agentCount} agents in ${registrationTime}ms`);
      console.log(`Average registration time: ${(registrationTime / agentCount).toFixed(2)}ms per agent`);
    });

    test('should handle concurrent agent scaling operations', async () => {
      const agentCount = 50;
      const scalingOperations = 100;

      // Register agents
      const agentConfigs = Array.from({ length: agentCount }, (_, i) => ({
        agentId: `scaling-agent-${i}`,
        type: 'scalable-service',
        qosClass: 'Burstable' as const,
        resources: {
          cpu: { minimum: 1, maximum: 8, target: 70 },
          memory: { minimum: 1024, maximum: 8192, target: 80 },
          priority: 5
        },
        scaling: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 10,
          scaleUpThreshold: 80,
          scaleDownThreshold: 30,
          scaleUpCooldown: 1000, // Short cooldown for testing
          scaleDownCooldown: 1000
        },
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 3
        }
      }));

      await Promise.all(agentConfigs.map(config => agentManager.registerAgent(config)));

      const startTime = Date.now();

      // Generate scaling operations
      const scalingPromises = [];
      for (let i = 0; i < scalingOperations; i++) {
        const agentId = `scaling-agent-${i % agentCount}`;
        const operation = i % 2 === 0 ? 'up' : 'down';
        
        if (operation === 'up') {
          scalingPromises.push(
            agentManager.scaleAgentUp(agentId, `Load test scaling ${i}`)
          );
        } else {
          scalingPromises.push(
            agentManager.scaleAgentDown(agentId, `Load test scaling ${i}`)
          );
        }
      }

      // Process scaling operations
      const results = await Promise.all(scalingPromises);
      const scalingTime = Date.now() - startTime;

      const successful = results.filter(r => r === true).length;
      const failed = results.filter(r => r === false).length;

      // Performance assertions
      expect(scalingTime).toBeLessThan(15000); // Should complete in under 15 seconds
      expect(successful).toBeGreaterThan(0); // Should have some successes

      console.log(`Processed ${scalingOperations} scaling operations in ${scalingTime}ms`);
      console.log(`Successful: ${successful}, Failed: ${failed} (due to cooldowns/limits)`);
      console.log(`Average scaling time: ${(scalingTime / scalingOperations).toFixed(2)}ms per operation`);
    });
  });

  describe('Dashboard Performance Under Load', () => {
    test('should handle high-frequency dashboard updates', async () => {
      const serverCount = 100;
      const updateFrequency = 1000; // 1 second updates
      const testDuration = 10000; // 10 seconds

      // Register servers
      const servers: MCPResourceReport[] = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `dashboard-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 8, usage: 30 + (i % 40), available: 5.6 - ((i % 40) * 0.14) },
          memory: { 
            total: 16384, 
            used: 4915 + (i % 40) * 205, 
            available: 11469 - (i % 40) * 205, 
            usage: 30 + (i % 40) 
          },
          disk: { 
            total: 1000000, 
            used: 300000 + (i % 30) * 13333, 
            available: 700000 - (i % 30) * 13333, 
            usage: 30 + (i % 30) 
          },
          network: { 
            bytesIn: 2048000 + (i * 10000), 
            bytesOut: 1024000 + (i * 5000), 
            usage: 20 + (i % 30) 
          },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Start dashboard
      await dashboard.start();

      const startTime = Date.now();
      let updateCount = 0;

      // Simulate high-frequency updates
      const updateInterval = setInterval(async () => {
        updateCount++;
        
        // Update random servers
        const updatePromises = [];
        for (let i = 0; i < 10; i++) {
          const serverIndex = Math.floor(Math.random() * serverCount);
          const server = servers[serverIndex];
          
          const updatedServer = {
            ...server,
            timestamp: Date.now(),
            resources: {
              ...server.resources,
              cpu: { 
                ...server.resources.cpu, 
                usage: 30 + Math.random() * 40 
              }
            }
          };
          
          updatePromises.push(resourceManager.updateServerStatus(updatedServer));
        }
        
        await Promise.all(updatePromises);
      }, updateFrequency);

      // Run for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(updateInterval);

      const totalTime = Date.now() - startTime;

      // Check dashboard performance
      const metrics = dashboard.getMetrics();
      expect(metrics.cluster.totalServers).toBe(serverCount);

      // Check chart data
      const chartData = dashboard.getChartData('cpu-utilization');
      expect(chartData).toBeDefined();
      expect(chartData?.datasets[0].data.length).toBeGreaterThan(0);

      dashboard.stop();

      console.log(`Dashboard handled ${updateCount} update cycles over ${totalTime}ms`);
      console.log(`Average update processing time: ${(totalTime / updateCount).toFixed(2)}ms per cycle`);
    });

    test('should handle concurrent dashboard data exports', async () => {
      const serverCount = 50;
      const exportCount = 20;

      // Register servers
      const servers: MCPResourceReport[] = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `export-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 8, usage: 40 + (i % 30), available: 4.8 - ((i % 30) * 0.16) },
          memory: { 
            total: 16384, 
            used: 6553 + (i % 30) * 273, 
            available: 9831 - (i % 30) * 273, 
            usage: 40 + (i % 30) 
          },
          disk: { 
            total: 1000000, 
            used: 400000 + (i % 25) * 16000, 
            available: 600000 - (i % 25) * 16000, 
            usage: 40 + (i % 25) 
          },
          network: { 
            bytesIn: 2048000 + (i * 20000), 
            bytesOut: 1024000 + (i * 10000), 
            usage: 25 + (i % 25) 
          },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));
      await dashboard.start();

      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 1000));

      const startTime = Date.now();

      // Perform concurrent exports
      const exportPromises = [];
      for (let i = 0; i < exportCount; i++) {
        const format = i % 2 === 0 ? 'json' : 'csv';
        exportPromises.push(
          new Promise((resolve) => {
            const exportData = dashboard.exportData(format);
            resolve(exportData);
          })
        );
      }

      const results = await Promise.all(exportPromises);
      const exportTime = Date.now() - startTime;

      // Verify exports
      expect(results).toHaveLength(exportCount);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        
        if (index % 2 === 0) {
          // JSON format
          expect(() => JSON.parse(result as string)).not.toThrow();
        } else {
          // CSV format
          expect((result as string).includes(',')).toBe(true);
        }
      });

      // Performance assertions
      expect(exportTime).toBeLessThan(10000); // Should complete in under 10 seconds

      dashboard.stop();

      console.log(`Processed ${exportCount} concurrent exports in ${exportTime}ms`);
      console.log(`Average export time: ${(exportTime / exportCount).toFixed(2)}ms per export`);
    });
  });

  describe('System-wide Load Testing', () => {
    test('should handle complete system under maximum load', async () => {
      const serverCount = 200;
      const agentCount = 100;
      const allocationCount = 300;
      const testDuration = 30000; // 30 seconds

      console.log('Starting comprehensive load test...');

      // Phase 1: Register servers
      console.log('Phase 1: Registering servers...');
      const serverStartTime = Date.now();
      
      const servers: MCPResourceReport[] = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `system-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 8 + (i % 8), usage: 25 + (i % 50), available: (8 + (i % 8)) * (1 - (25 + (i % 50)) / 100) },
          memory: { 
            total: 16384 + (i % 4) * 8192, 
            used: Math.floor((16384 + (i % 4) * 8192) * (30 + (i % 40)) / 100),
            available: Math.floor((16384 + (i % 4) * 8192) * (70 - (i % 40)) / 100),
            usage: 30 + (i % 40)
          },
          disk: { 
            total: 1000000 + (i % 10) * 100000, 
            used: Math.floor((1000000 + (i % 10) * 100000) * (25 + (i % 35)) / 100),
            available: Math.floor((1000000 + (i % 10) * 100000) * (75 - (i % 35)) / 100),
            usage: 25 + (i % 35)
          },
          network: { 
            bytesIn: 2048000 + (i * 5000), 
            bytesOut: 1024000 + (i * 2500), 
            usage: 15 + (i % 30) 
          },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));
      console.log(`Registered ${serverCount} servers in ${Date.now() - serverStartTime}ms`);

      // Phase 2: Register agents
      console.log('Phase 2: Registering agents...');
      const agentStartTime = Date.now();
      
      const agentConfigs = Array.from({ length: agentCount }, (_, i) => ({
        agentId: `system-agent-${i}`,
        type: ['web-server', 'background-worker', 'api-service', 'database'][i % 4],
        qosClass: (['Guaranteed', 'Burstable', 'BestEffort'] as const)[i % 3],
        resources: {
          cpu: { minimum: 1 + (i % 3), maximum: 4 + (i % 4), target: 65 + (i % 15) },
          memory: { minimum: 1024 + (i % 4) * 512, maximum: 4096 + (i % 4) * 2048, target: 75 + (i % 15) },
          priority: 1 + (i % 10)
        },
        scaling: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 3 + (i % 5),
          scaleUpThreshold: 75 + (i % 15),
          scaleDownThreshold: 25 + (i % 15),
          scaleUpCooldown: 60000,
          scaleDownCooldown: 300000
        },
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 3
        }
      }));

      await Promise.all(agentConfigs.map(config => agentManager.registerAgent(config)));
      console.log(`Registered ${agentCount} agents in ${Date.now() - agentStartTime}ms`);

      // Phase 3: Start monitoring systems
      console.log('Phase 3: Starting monitoring systems...');
      monitor.startMonitoring();
      pressureDetector.startMonitoring();
      await dashboard.start();

      // Phase 4: Load testing
      console.log('Phase 4: Starting load testing...');
      const loadStartTime = Date.now();

      // Continuous operations
      const operations = [];
      
      // Continuous allocations
      operations.push(
        (async () => {
          const requests: ResourceAllocationRequest[] = Array.from({ length: allocationCount }, (_, i) => ({
            requestId: `system-req-${i}`,
            agentId: `system-agent-${i % agentCount}`,
            agentType: 'load-test',
            requirements: {
              cpu: { cores: 1 + (i % 3) },
              memory: { minimum: 1024 + (i % 4) * 512, preferred: 2048 + (i % 4) * 512 },
              gpu: { required: false },
              priority: 1 + (i % 10)
            },
            constraints: {
              location: 'any',
              isolation: false
            },
            metadata: {
              purpose: 'system-load-test',
              duration: 'short-term'
            }
          }));

          const results = await Promise.all(
            requests.map(req => resourceManager.allocateResources(req))
          );
          
          return results.filter(r => r.allocated).length;
        })()
      );

      // Continuous server updates
      operations.push(
        (async () => {
          const updatePromises = [];
          for (let i = 0; i < 100; i++) {
            const serverIndex = Math.floor(Math.random() * serverCount);
            const server = servers[serverIndex];
            
            const updatedServer = {
              ...server,
              timestamp: Date.now() + i * 100,
              resources: {
                ...server.resources,
                cpu: { 
                  ...server.resources.cpu, 
                  usage: 25 + Math.random() * 50 
                }
              }
            };
            
            updatePromises.push(resourceManager.updateServerStatus(updatedServer));
          }
          
          await Promise.all(updatePromises);
          return updatePromises.length;
        })()
      );

      // Wait for all operations to complete
      const results = await Promise.all(operations);
      const loadTime = Date.now() - loadStartTime;

      // Phase 5: Verification
      console.log('Phase 5: Verification...');
      
      // Verify system state
      const finalMetrics = dashboard.getMetrics();
      expect(finalMetrics.cluster.totalServers).toBe(serverCount);
      expect(finalMetrics.agents.totalAgents).toBe(agentCount);

      // Verify dashboard functionality
      const overview = dashboard.getSystemOverview();
      expect(overview).toBeDefined();

      // Verify resource analysis
      const analysis = await resourceManager.analyzeResourceUsage();
      expect(analysis).toBeDefined();

      // Cleanup
      monitor.stopMonitoring();
      pressureDetector.stopMonitoring();
      dashboard.stop();

      // Performance summary
      const totalTime = Date.now() - serverStartTime;
      console.log(`\n=== Load Test Results ===`);
      console.log(`Total test duration: ${totalTime}ms`);
      console.log(`Servers registered: ${serverCount}`);
      console.log(`Agents registered: ${agentCount}`);
      console.log(`Successful allocations: ${results[0]}`);
      console.log(`Server updates processed: ${results[1]}`);
      console.log(`Load testing phase: ${loadTime}ms`);
      console.log(`System remained stable: ${finalMetrics.cluster.healthyServers > 0}`);

      // Performance assertions
      expect(totalTime).toBeLessThan(60000); // Should complete in under 60 seconds
      expect(finalMetrics.cluster.healthyServers).toBeGreaterThan(0);
      expect(results[0]).toBeGreaterThan(0); // Some allocations should succeed
    });
  });
});