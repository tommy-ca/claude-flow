/**
 * Dashboard Integration Tests for Resource Management System
 * Tests integration between dashboard and all resource management components
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ResourceManager } from '../../../src/resource-manager/core/resource-manager';
import { PressureDetector } from '../../../src/resource-manager/monitors/pressure-detector';
import { AgentResourceManager } from '../../../src/resource-manager/agents/agent-resource-manager';
import { ResourceDashboard } from '../../../src/resource-manager/monitors/resource-dashboard';
import { ResourceDetector } from '../../../src/resource-manager/monitors/resource-detector';
import { ResourceMonitor } from '../../../src/resource-manager/monitors/resource-monitor';
import { ResourceManagerConfigManager } from '../../../src/config/resource-manager-config';
import { ResourceMemoryManager } from '../../../src/memory/resource-memory';
import { MCPResourceReport } from '../../../src/mcp/resource-protocol';

// Mock external dependencies
jest.mock('systeminformation');
jest.mock('node-os-utils');
jest.mock('../../../src/config/resource-manager-config');
jest.mock('../../../src/memory/resource-memory');

describe('Dashboard Integration Tests', () => {
  let resourceManager: ResourceManager;
  let pressureDetector: PressureDetector;
  let agentManager: AgentResourceManager;
  let dashboard: ResourceDashboard;
  let detector: ResourceDetector;
  let monitor: ResourceMonitor;
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
      })
    } as any;

    memoryManager = {
      initialize: jest.fn(),
      storeMetrics: jest.fn(),
      storeEvent: jest.fn(),
      queryMetrics: jest.fn().mockResolvedValue([]),
      shutdown: jest.fn()
    } as any;

    // Initialize components
    resourceManager = new ResourceManager(configManager, memoryManager);
    detector = new ResourceDetector();
    monitor = new ResourceMonitor(detector);
    pressureDetector = new PressureDetector();
    agentManager = new AgentResourceManager(pressureDetector);
    dashboard = new ResourceDashboard(resourceManager, pressureDetector, agentManager);

    // Initialize all components
    await resourceManager.initialize();
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

  describe('Dashboard Initialization and Configuration', () => {
    test('should initialize dashboard with all components', async () => {
      expect(dashboard).toBeDefined();
      
      const config = dashboard.getConfig();
      expect(config.refreshInterval).toBe(5000);
      expect(config.features.realTimeCharts).toBe(true);
      expect(config.features.alertingSystem).toBe(true);
    });

    test('should update dashboard configuration', async () => {
      const newConfig = {
        refreshInterval: 3000,
        alertThresholds: {
          cpu: 85,
          memory: 85,
          disk: 90,
          network: 80
        }
      };

      dashboard.updateConfig(newConfig);

      const updatedConfig = dashboard.getConfig();
      expect(updatedConfig.refreshInterval).toBe(3000);
      expect(updatedConfig.alertThresholds.cpu).toBe(85);
    });

    test('should handle custom dashboard configuration', async () => {
      const customDashboard = new ResourceDashboard(
        resourceManager,
        pressureDetector,
        agentManager,
        {
          refreshInterval: 10000,
          historyDuration: 48 * 60 * 60 * 1000,
          features: {
            realTimeCharts: false,
            predictiveAnalytics: false,
            alertingSystem: true,
            autoRecommendations: true
          }
        }
      );

      await customDashboard.initialize();

      const config = customDashboard.getConfig();
      expect(config.refreshInterval).toBe(10000);
      expect(config.historyDuration).toBe(48 * 60 * 60 * 1000);
      expect(config.features.realTimeCharts).toBe(false);
      expect(config.features.predictiveAnalytics).toBe(false);

      await customDashboard.shutdown();
    });
  });

  describe('Real-time Data Collection', () => {
    test('should collect and display real-time metrics', async () => {
      // Register test servers
      const server1: MCPResourceReport = {
        serverId: 'test-server-1',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 45.5, available: 4.36 },
          memory: { total: 16384, used: 6553, available: 9831, usage: 40.0 },
          disk: { total: 1000000, used: 400000, available: 600000, usage: 40.0 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 25.0 },
          gpu: []
        },
        capabilities: ['compute', 'storage'],
        version: '1.0.0'
      };

      const server2: MCPResourceReport = {
        serverId: 'test-server-2',
        timestamp: Date.now(),
        status: 'degraded',
        resources: {
          cpu: { cores: 4, usage: 85.2, available: 0.59 },
          memory: { total: 8192, used: 7372, available: 820, usage: 90.0 },
          disk: { total: 500000, used: 425000, available: 75000, usage: 85.0 },
          network: { bytesIn: 1024000, bytesOut: 512000, usage: 70.0 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server1);
      await resourceManager.registerServer(server2);

      // Register test agents
      await agentManager.registerAgent({
        agentId: 'test-agent-1',
        type: 'web-server',
        qosClass: 'Guaranteed',
        resources: {
          cpu: { minimum: 2, maximum: 4, target: 70 },
          memory: { minimum: 2048, maximum: 4096, target: 80 },
          priority: 8
        },
        scaling: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 5,
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

      // Start dashboard
      await dashboard.start();

      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check metrics
      const metrics = dashboard.getMetrics();
      expect(metrics.cluster.totalServers).toBe(2);
      expect(metrics.cluster.healthyServers).toBe(1);
      expect(metrics.cluster.degradedServers).toBe(1);
      expect(metrics.agents.totalAgents).toBe(1);
      expect(metrics.agents.healthyAgents).toBe(1);

      dashboard.stop();
    });

    test('should track metrics over time', async () => {
      const server: MCPResourceReport = {
        serverId: 'metrics-server',
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
      await dashboard.start();

      // Simulate metrics changes over time
      const updates = [55, 60, 65, 70, 75];
      
      for (const cpuUsage of updates) {
        const updatedServer = {
          ...server,
          timestamp: Date.now(),
          resources: {
            ...server.resources,
            cpu: { ...server.resources.cpu, usage: cpuUsage }
          }
        };

        await resourceManager.updateServerStatus(updatedServer);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check chart data
      const chartData = dashboard.getChartData('cpu-utilization');
      expect(chartData).toBeDefined();
      expect(chartData?.labels.length).toBeGreaterThan(0);
      expect(chartData?.datasets[0].data.length).toBeGreaterThan(0);

      dashboard.stop();
    });
  });

  describe('Alert Management', () => {
    test('should generate and manage alerts', async () => {
      // Register server with high usage
      const server: MCPResourceReport = {
        serverId: 'alert-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 95, available: 0.4 },
          memory: { total: 16384, used: 15728, available: 656, usage: 96 },
          disk: { total: 1000000, used: 900000, available: 100000, usage: 90 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 80 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);
      await dashboard.start();

      // Wait for alerts to be generated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check alerts
      const alerts = dashboard.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      // Find CPU alert
      const cpuAlert = alerts.find(a => a.message.includes('CPU'));
      expect(cpuAlert).toBeDefined();
      expect(cpuAlert?.level).toBe('critical');
      expect(cpuAlert?.source).toBe('system');

      // Find memory alert
      const memoryAlert = alerts.find(a => a.message.includes('memory'));
      expect(memoryAlert).toBeDefined();
      expect(memoryAlert?.level).toBe('critical');

      dashboard.stop();
    });

    test('should acknowledge alerts', async () => {
      // Generate alert
      const server: MCPResourceReport = {
        serverId: 'ack-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 90, available: 0.8 },
          memory: { total: 16384, used: 14745, available: 1639, usage: 90 },
          disk: { total: 1000000, used: 500000, available: 500000, usage: 50 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 30 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);
      await dashboard.start();

      // Wait for alert generation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const alerts = dashboard.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      // Acknowledge first alert
      const firstAlert = alerts[0];
      const acknowledged = dashboard.acknowledgeAlert(firstAlert.id);
      expect(acknowledged).toBe(true);

      // Check that alert is now acknowledged
      const allAlerts = dashboard.getAllAlerts();
      const acknowledgedAlert = allAlerts.find(a => a.id === firstAlert.id);
      expect(acknowledgedAlert?.acknowledged).toBe(true);

      // Check that active alerts don't include acknowledged ones
      const activeAlerts = dashboard.getAlerts();
      expect(activeAlerts.find(a => a.id === firstAlert.id)).toBeUndefined();

      dashboard.stop();
    });

    test('should handle alert cooldown', async () => {
      const server: MCPResourceReport = {
        serverId: 'cooldown-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 85, available: 1.2 },
          memory: { total: 16384, used: 13107, available: 3277, usage: 80 },
          disk: { total: 1000000, used: 500000, available: 500000, usage: 50 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 30 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);
      await dashboard.start();

      // Wait for initial alerts
      await new Promise(resolve => setTimeout(resolve, 1000));

      const initialAlerts = dashboard.getAlerts();
      const initialAlertCount = initialAlerts.length;

      // Update server again with similar values (should be in cooldown)
      const updatedServer = {
        ...server,
        timestamp: Date.now() + 1000,
        resources: {
          ...server.resources,
          cpu: { ...server.resources.cpu, usage: 86 }
        }
      };

      await resourceManager.updateServerStatus(updatedServer);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Alert count should not increase due to cooldown
      const afterCooldownAlerts = dashboard.getAlerts();
      expect(afterCooldownAlerts.length).toBe(initialAlertCount);

      dashboard.stop();
    });
  });

  describe('Data Export and Reporting', () => {
    test('should export dashboard data in JSON format', async () => {
      // Setup test data
      const server: MCPResourceReport = {
        serverId: 'export-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 60, available: 3.2 },
          memory: { total: 16384, used: 9830, available: 6554, usage: 60 },
          disk: { total: 1000000, used: 600000, available: 400000, usage: 60 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 40 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);
      await dashboard.start();

      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Export data
      const exportedData = dashboard.exportData('json');
      expect(exportedData).toBeDefined();

      const data = JSON.parse(exportedData);
      expect(data.timestamp).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.system).toBeDefined();
      expect(data.agents).toBeDefined();

      dashboard.stop();
    });

    test('should export dashboard data in CSV format', async () => {
      const server: MCPResourceReport = {
        serverId: 'csv-server',
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
      await dashboard.start();

      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Export data
      const exportedData = dashboard.exportData('csv');
      expect(exportedData).toBeDefined();
      expect(typeof exportedData).toBe('string');
      expect(exportedData.includes(',')).toBe(true); // CSV should contain commas

      dashboard.stop();
    });

    test('should provide system overview', async () => {
      const server: MCPResourceReport = {
        serverId: 'overview-server',
        timestamp: Date.now(),
        status: 'healthy',
        resources: {
          cpu: { cores: 8, usage: 45, available: 4.4 },
          memory: { total: 16384, used: 7372, available: 9012, usage: 45 },
          disk: { total: 1000000, used: 450000, available: 550000, usage: 45 },
          network: { bytesIn: 2048000, bytesOut: 1024000, usage: 25 },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      };

      await resourceManager.registerServer(server);
      await dashboard.start();

      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get system overview
      const overview = dashboard.getSystemOverview();
      expect(overview.timestamp).toBeDefined();
      expect(overview.health).toBeDefined();
      expect(overview.performance).toBeDefined();
      expect(overview.capacity).toBeDefined();
      expect(overview.trends).toBeDefined();
      expect(overview.recommendations).toBeDefined();

      expect(overview.health).toBeGreaterThan(0);
      expect(overview.performance).toBeGreaterThan(0);
      expect(overview.capacity).toBeGreaterThan(0);

      dashboard.stop();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple servers efficiently', async () => {
      const startTime = Date.now();
      const serverCount = 20;

      // Register multiple servers
      const servers = Array.from({ length: serverCount }, (_, i) => ({
        serverId: `perf-server-${i}`,
        timestamp: Date.now(),
        status: 'healthy' as const,
        resources: {
          cpu: { cores: 8, usage: 30 + (i % 50), available: 5.6 - ((i % 50) * 0.112) },
          memory: { 
            total: 16384, 
            used: 4915 + (i * 100), 
            available: 11469 - (i * 100), 
            usage: 30 + (i % 50) 
          },
          disk: { 
            total: 1000000, 
            used: 300000 + (i * 10000), 
            available: 700000 - (i * 10000), 
            usage: 30 + (i % 30) 
          },
          network: { 
            bytesIn: 2048000 + (i * 50000), 
            bytesOut: 1024000 + (i * 25000), 
            usage: 20 + (i % 40) 
          },
          gpu: []
        },
        capabilities: ['compute'],
        version: '1.0.0'
      }));

      // Register all servers
      await Promise.all(servers.map(server => resourceManager.registerServer(server)));

      // Start dashboard
      await dashboard.start();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const processingTime = Date.now() - startTime;

      // Check dashboard can handle all servers
      const metrics = dashboard.getMetrics();
      expect(metrics.cluster.totalServers).toBe(serverCount);
      expect(metrics.cluster.healthyServers).toBe(serverCount);

      // Performance assertion
      expect(processingTime).toBeLessThan(5000); // Should handle 20 servers in under 5 seconds

      dashboard.stop();

      console.log(`Dashboard handled ${serverCount} servers in ${processingTime}ms`);
    });

    test('should update charts efficiently', async () => {
      const server: MCPResourceReport = {
        serverId: 'chart-server',
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
      await dashboard.start();

      const startTime = Date.now();
      const updateCount = 50;

      // Perform rapid updates
      for (let i = 0; i < updateCount; i++) {
        const updatedServer = {
          ...server,
          timestamp: Date.now() + i,
          resources: {
            ...server.resources,
            cpu: { ...server.resources.cpu, usage: 50 + (i % 30) }
          }
        };

        await resourceManager.updateServerStatus(updatedServer);
      }

      // Wait for chart updates
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updateTime = Date.now() - startTime;

      // Check chart data
      const chartData = dashboard.getChartData('cpu-utilization');
      expect(chartData).toBeDefined();
      expect(chartData?.datasets[0].data.length).toBeGreaterThan(0);

      // Performance assertion
      expect(updateTime).toBeLessThan(3000); // Should handle 50 updates in under 3 seconds

      dashboard.stop();

      console.log(`Chart updated ${updateCount} times in ${updateTime}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle component failures gracefully', async () => {
      await dashboard.start();

      // Simulate component failure by shutting down resource manager
      await resourceManager.shutdown();

      // Dashboard should continue operating
      const metrics = dashboard.getMetrics();
      expect(metrics).toBeDefined();

      // Should handle gracefully
      const overview = dashboard.getSystemOverview();
      expect(overview).toBeDefined();

      dashboard.stop();
    });

    test('should recover from configuration errors', async () => {
      // Test with invalid configuration
      const invalidConfig = {
        refreshInterval: -1000, // Invalid negative interval
        alertThresholds: {
          cpu: 150, // Invalid percentage > 100
          memory: -10 // Invalid negative threshold
        }
      };

      // Should handle invalid config gracefully
      expect(() => dashboard.updateConfig(invalidConfig)).not.toThrow();

      // Should maintain valid configuration
      const config = dashboard.getConfig();
      expect(config.refreshInterval).toBeGreaterThan(0);
      expect(config.alertThresholds.cpu).toBeLessThanOrEqual(100);
      expect(config.alertThresholds.memory).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing data gracefully', async () => {
      // Start dashboard without any servers or agents
      await dashboard.start();

      // Should handle empty state
      const metrics = dashboard.getMetrics();
      expect(metrics.cluster.totalServers).toBe(0);
      expect(metrics.agents.totalAgents).toBe(0);

      // Should not crash on empty data
      const overview = dashboard.getSystemOverview();
      expect(overview).toBeDefined();

      const chartData = dashboard.getChartData('cpu-utilization');
      expect(chartData).toBeDefined();

      dashboard.stop();
    });
  });

  describe('Integration with External Systems', () => {
    test('should integrate with pressure detector events', async () => {
      let alertReceived = false;

      // Listen for dashboard alerts
      dashboard.on('new-alert', (alert) => {
        if (alert.source === 'pressure') {
          alertReceived = true;
        }
      });

      // Start systems
      await dashboard.start();
      pressureDetector.startMonitoring(500); // Fast monitoring

      // Simulate pressure alert
      const metrics = await detector.getResourceMetrics();
      pressureDetector.updateMetrics({
        ...metrics,
        cpu: { ...metrics.cpu, usage: 95 },
        memory: { ...metrics.memory, usage: 96 }
      });

      // Wait for pressure detection and alert
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if alert was received
      expect(alertReceived).toBe(true);

      const alerts = dashboard.getAlerts();
      const pressureAlert = alerts.find(a => a.source === 'pressure');
      expect(pressureAlert).toBeDefined();

      pressureDetector.stopMonitoring();
      dashboard.stop();
    });

    test('should integrate with agent manager events', async () => {
      let scalingEventReceived = false;

      // Listen for dashboard alerts
      dashboard.on('new-alert', (alert) => {
        if (alert.source === 'agent' && alert.message.includes('scaled')) {
          scalingEventReceived = true;
        }
      });

      // Register agent
      await agentManager.registerAgent({
        agentId: 'scaling-agent',
        type: 'worker',
        qosClass: 'Burstable',
        resources: {
          cpu: { minimum: 1, maximum: 4, target: 70 },
          memory: { minimum: 1024, maximum: 4096, target: 80 },
          priority: 5
        },
        scaling: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 3,
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
      });

      // Start dashboard
      await dashboard.start();

      // Trigger scaling
      await agentManager.scaleAgentUp('scaling-agent', 'Test scaling');

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if scaling event was received
      expect(scalingEventReceived).toBe(true);

      const alerts = dashboard.getAlerts();
      const scalingAlert = alerts.find(a => a.source === 'agent' && a.message.includes('scaled'));
      expect(scalingAlert).toBeDefined();

      dashboard.stop();
    });
  });
});