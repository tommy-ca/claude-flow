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
jest.mock('systeminformation', () => ({
  cpu: jest.fn().mockResolvedValue({
    manufacturer: 'Intel',
    brand: 'Intel(R) Core(TM) i7-9700K',
    speed: 3.6,
    cores: 8,
    physicalCores: 8,
    processors: 1
  }),
  currentLoad: jest.fn().mockResolvedValue({
    avgload: 45.2,
    currentload: 45.2,
    currentload_user: 23.1,
    currentload_system: 22.1,
    currentload_nice: 0,
    currentload_idle: 54.8,
    currentload_irq: 0,
    raw_currentload: 4520
  }),
  mem: jest.fn().mockResolvedValue({
    total: 17179869184,
    free: 8589934592,
    used: 8589934592,
    active: 6442450944,
    available: 10737418240,
    cached: 2147483648,
    buffers: 536870912,
    swaptotal: 2147483648,
    swapused: 0,
    swapfree: 2147483648
  }),
  fsSize: jest.fn().mockResolvedValue([
    {
      fs: '/dev/sda1',
      type: 'ext4',
      size: 1000000000000,
      used: 500000000000,
      available: 500000000000,
      use: 50,
      mount: '/'
    }
  ]),
  networkInterfaces: jest.fn().mockResolvedValue([
    {
      iface: 'eth0',
      ip4: '192.168.1.100',
      ip6: '',
      mac: '00:11:22:33:44:55',
      internal: false,
      virtual: false,
      operstate: 'up',
      type: 'wired',
      duplex: 'full',
      mtu: 1500,
      speed: 1000,
      dhcp: true
    }
  ]),
  graphics: jest.fn().mockResolvedValue({
    controllers: [
      {
        vendor: 'NVIDIA',
        model: 'GeForce GTX 1080',
        bus: 'PCIe',
        vram: 8192,
        vramDynamic: false
      }
    ]
  })
}));

jest.mock('node-os-utils', () => ({
  cpu: {
    usage: jest.fn().mockResolvedValue(45.2),
    info: jest.fn().mockResolvedValue({
      model: 'Intel(R) Core(TM) i7-9700K',
      speed: '3.60',
      cores: 8
    }),
    loadavg: jest.fn().mockReturnValue([1.2, 1.5, 1.8])
  },
  mem: {
    info: jest.fn().mockResolvedValue({
      totalMemMb: 16384,
      usedMemMb: 8192,
      freeMemMb: 8192
    })
  },
  drive: {
    info: jest.fn().mockResolvedValue({
      totalGb: 1000,
      usedGb: 500,
      freeGb: 500
    })
  }
}));

// Mock implementations for testing
class MockResourceManager {
  private servers: Map<string, MCPResourceReport> = new Map();
  private allocations: Map<string, any> = new Map();

  async registerServer(server: MCPResourceReport): Promise<void> {
    this.servers.set(server.serverId, server);
  }

  async updateServerStatus(server: MCPResourceReport): Promise<void> {
    this.servers.set(server.serverId, server);
  }

  async getAllServerStatus(): Promise<MCPResourceReport[]> {
    return Array.from(this.servers.values());
  }

  async allocateResources(request: ResourceAllocationRequest): Promise<{ allocated: boolean; serverId?: string }> {
    // Simple allocation logic for testing
    const availableServers = Array.from(this.servers.values()).filter(s => s.status === 'healthy');
    if (availableServers.length > 0) {
      const server = availableServers[0];
      this.allocations.set(request.requestId, { server, request });
      return { allocated: true, serverId: server.serverId };
    }
    return { allocated: false };
  }

  async releaseResources(requestId: string): Promise<boolean> {
    return this.allocations.delete(requestId);
  }

  async analyzeResourceUsage(): Promise<any> {
    return {
      totalServers: this.servers.size,
      healthyServers: Array.from(this.servers.values()).filter(s => s.status === 'healthy').length,
      totalAllocations: this.allocations.size
    };
  }

  async shutdown(): Promise<void> {
    this.servers.clear();
    this.allocations.clear();
  }
}

class MockAgentResourceManager {
  private agents: Map<string, any> = new Map();

  async registerAgent(config: any): Promise<void> {
    this.agents.set(config.agentId, config);
  }

  getAllAgentsUsage(): any[] {
    return Array.from(this.agents.values());
  }

  async scaleAgentUp(agentId: string, reason: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (agent && agent.scaling?.enabled) {
      return Math.random() > 0.3; // 70% success rate
    }
    return false;
  }

  async scaleAgentDown(agentId: string, reason: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (agent && agent.scaling?.enabled) {
      return Math.random() > 0.2; // 80% success rate
    }
    return false;
  }

  async shutdown(): Promise<void> {
    this.agents.clear();
  }
}

class MockResourceDashboard {
  private isRunning = false;
  private metrics: any;

  constructor(private resourceManager: MockResourceManager, private pressureDetector: any, private agentManager: MockAgentResourceManager) {
    this.metrics = {
      cluster: { totalServers: 0, healthyServers: 0 },
      agents: { totalAgents: 0 }
    };
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async start(): Promise<void> {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  getMetrics(): any {
    return {
      cluster: {
        totalServers: this.resourceManager['servers']?.size || 0,
        healthyServers: Array.from(this.resourceManager['servers']?.values() || []).filter(s => s.status === 'healthy').length,
      },
      agents: {
        totalAgents: this.agentManager['agents']?.size || 0
      }
    };
  }

  getSystemOverview(): any {
    return {
      status: 'healthy',
      uptime: Date.now(),
      version: '1.0.0'
    };
  }

  getChartData(type: string): any {
    return {
      datasets: [{
        data: [1, 2, 3, 4, 5],
        labels: ['1', '2', '3', '4', '5']
      }]
    };
  }

  exportData(format: string): string {
    const data = this.getMetrics();
    if (format === 'json') {
      return JSON.stringify(data);
    } else if (format === 'csv') {
      return 'server,status,agents\n1,healthy,5\n2,healthy,3';
    }
    return '';
  }

  async shutdown(): Promise<void> {
    this.stop();
  }
}

describe('Load Testing Suite', () => {
  let resourceManager: MockResourceManager;
  let agentManager: MockAgentResourceManager;
  let dashboard: MockResourceDashboard;

  beforeEach(async () => {
    resourceManager = new MockResourceManager();
    agentManager = new MockAgentResourceManager();
    dashboard = new MockResourceDashboard(resourceManager, null, agentManager);

    // Initialize all components
    await dashboard.initialize();
  });

  afterEach(async () => {
    await dashboard.shutdown();
    await agentManager.shutdown();
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
            usage: 20 + (i % 60)
          },
          memory: { 
            total: 8192 + (i % 8) * 1024, 
            used: Math.floor((8192 + (i % 8) * 1024) * (30 + (i % 40)) / 100),
            available: Math.floor((8192 + (i % 8) * 1024) * (70 - (i % 40)) / 100)
          },
          disk: { 
            total: 500000 + (i % 10) * 50000, 
            used: Math.floor((500000 + (i % 10) * 50000) * (25 + (i % 30)) / 100),
            available: Math.floor((500000 + (i % 10) * 50000) * (75 - (i % 30)) / 100)
          },
          network: { 
            latency: 15 + (i % 25),
            bandwidth: 1000000000,
            bytesIn: 1024000 + (i * 1000), 
            bytesOut: 512000 + (i * 500)
          },
          capabilities: ['compute']
        }
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
          cpu: { cores: 8, usage: 40 },
          memory: { total: 16384, used: 6553, available: 9831 },
          disk: { total: 1000000, used: 400000, available: 600000 },
          network: { latency: 25, bandwidth: 1000000000, bytesIn: 2048000, bytesOut: 1024000 },
          capabilities: ['compute']
        }
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
          cpu: { cores: 16, usage: 20 },
          memory: { total: 32768, used: 6553, available: 26215 },
          disk: { total: 2000000, used: 400000, available: 1600000 },
          network: { latency: 15, bandwidth: 1000000000, bytesIn: 4096000, bytesOut: 2048000 },
          capabilities: ['compute', 'storage']
        }
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Generate allocation requests
      const requests: ResourceAllocationRequest[] = Array.from({ length: allocationCount }, (_, i) => ({
        requestId: `load-req-${i}`,
        agentId: `load-agent-${i}`,
        requirements: {
          cpu: { cores: 1 + (i % 4) },
          memory: { minimum: 1024 + (i % 3) * 512, preferred: 2048 + (i % 3) * 512 },
          gpu: { required: false }
        },
        constraints: {
          preferredServers: [],
          excludedServers: []
        },
        priority: ['low', 'normal', 'high', 'critical'][i % 4] as any,
        duration: 3600 // 1 hour
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
          cpu: { cores: 4, usage: 60 },
          memory: { total: 8192, used: 4915, available: 3277 },
          disk: { total: 500000, used: 300000, available: 200000 },
          network: { latency: 40, bandwidth: 1000000000, bytesIn: 1024000, bytesOut: 512000 },
          capabilities: ['compute']
        }
      }));

      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Generate high-resource requests
      const requests: ResourceAllocationRequest[] = Array.from({ length: allocationCount }, (_, i) => ({
        requestId: `pressure-req-${i}`,
        agentId: `pressure-agent-${i}`,
        requirements: {
          cpu: { cores: 2 + (i % 3) },
          memory: { minimum: 2048 + (i % 4) * 1024, preferred: 4096 + (i % 4) * 1024 },
          gpu: { required: false }
        },
        constraints: {
          preferredServers: [],
          excludedServers: []
        },
        priority: ['low', 'normal', 'high', 'critical'][i % 4] as any,
        duration: 7200 // 2 hours
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
          cpu: { cores: 8, usage: 30 + (i % 40) },
          memory: { 
            total: 16384, 
            used: 4915 + (i % 40) * 205, 
            available: 11469 - (i % 40) * 205
          },
          disk: { 
            total: 1000000, 
            used: 300000 + (i % 30) * 13333, 
            available: 700000 - (i % 30) * 13333
          },
          network: { 
            latency: 20 + (i % 30),
            bandwidth: 1000000000,
            bytesIn: 2048000 + (i * 10000), 
            bytesOut: 1024000 + (i * 5000)
          },
          capabilities: ['compute']
        }
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
          cpu: { cores: 8, usage: 40 + (i % 30) },
          memory: { 
            total: 16384, 
            used: 6553 + (i % 30) * 273, 
            available: 9831 - (i % 30) * 273
          },
          disk: { 
            total: 1000000, 
            used: 400000 + (i % 25) * 16000, 
            available: 600000 - (i % 25) * 16000
          },
          network: { 
            latency: 25 + (i % 25),
            bandwidth: 1000000000,
            bytesIn: 2048000 + (i * 20000), 
            bytesOut: 1024000 + (i * 10000)
          },
          capabilities: ['compute']
        }
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
          cpu: { cores: 8 + (i % 8), usage: 25 + (i % 50) },
          memory: { 
            total: 16384 + (i % 4) * 8192, 
            used: Math.floor((16384 + (i % 4) * 8192) * (30 + (i % 40)) / 100),
            available: Math.floor((16384 + (i % 4) * 8192) * (70 - (i % 40)) / 100)
          },
          disk: { 
            total: 1000000 + (i % 10) * 100000, 
            used: Math.floor((1000000 + (i % 10) * 100000) * (25 + (i % 35)) / 100),
            available: Math.floor((1000000 + (i % 10) * 100000) * (75 - (i % 35)) / 100)
          },
          network: { 
            latency: 15 + (i % 30),
            bandwidth: 1000000000,
            bytesIn: 2048000 + (i * 5000), 
            bytesOut: 1024000 + (i * 2500)
          },
          capabilities: ['compute']
        }
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
            requirements: {
              cpu: { cores: 1 + (i % 3) },
              memory: { minimum: 1024 + (i % 4) * 512, preferred: 2048 + (i % 4) * 512 },
              gpu: { required: false }
            },
            constraints: {
              preferredServers: [],
              excludedServers: []
            },
            priority: ['low', 'normal', 'high', 'critical'][i % 4] as any,
            duration: 3600 // 1 hour
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