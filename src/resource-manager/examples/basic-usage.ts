/**
 * Basic Usage Example for Intelligent Resource Management System
 *
 * This example demonstrates how to use the resource management system
 * to monitor resources, manage agents, and prevent pressure issues.
 */

import { ResourceManager } from '../core/resource-manager';
import { ResourceDetector } from '../monitors/resource-detector';
import { ResourceMonitor } from '../monitors/resource-monitor';
import { PressureDetector } from '../monitors/pressure-detector';
import { AgentResourceManager } from '../agents/agent-resource-manager';
import { ResourceDashboard } from '../monitors/resource-dashboard';
import { ResourceManagerConfigManager } from '../../config/resource-manager-config';
import { ResourceMemoryManager } from '../../memory/resource-memory';
import { ResourceManagerFactory } from '../factory/resource-manager-factory';

async function basicUsageExample() {
  console.log('🚀 Starting Resource Management System Example');

  // 1. Initialize the resource management system
  const factory = new ResourceManagerFactory();
  const resourceManager = await factory.createResourceManager();

  // 2. Initialize monitoring components
  const detector = new ResourceDetector();
  const monitor = new ResourceMonitor(detector);
  const pressureDetector = new PressureDetector();
  const agentManager = new AgentResourceManager(pressureDetector);
  const dashboard = new ResourceDashboard(resourceManager, pressureDetector, agentManager);

  // 3. Initialize all components
  await detector.initialize();
  await monitor.initialize();
  await pressureDetector.initialize();
  await agentManager.initialize();
  await dashboard.initialize();

  console.log('✅ All components initialized');

  // 4. Start monitoring
  monitor.startMonitoring();
  pressureDetector.startMonitoring();
  await dashboard.start();

  console.log('📊 Monitoring started');

  // 5. Register some sample agents
  await agentManager.registerAgent({
    agentId: 'web-server-01',
    type: 'web-server',
    qosClass: 'Guaranteed',
    resources: {
      cpu: { minimum: 1, maximum: 4, target: 70 },
      memory: { minimum: 512, maximum: 2048, target: 80 },
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

  await agentManager.registerAgent({
    agentId: 'background-worker-01',
    type: 'background-worker',
    qosClass: 'Burstable',
    resources: {
      cpu: { minimum: 0.5, maximum: 2, target: 60 },
      memory: { minimum: 256, maximum: 1024, target: 70 },
      priority: 5
    },
    scaling: {
      enabled: true,
      minReplicas: 1,
      maxReplicas: 3,
      scaleUpThreshold: 75,
      scaleDownThreshold: 25,
      scaleUpCooldown: 90000,
      scaleDownCooldown: 300000
    },
    healthCheck: {
      enabled: true,
      interval: 60000,
      timeout: 10000,
      retries: 2
    }
  });

  console.log('🤖 Sample agents registered');

  // 6. Set up event listeners
  setupEventListeners(resourceManager, pressureDetector, agentManager, dashboard);

  // 7. Simulate some resource updates
  await simulateResourceUpdates(detector, monitor, agentManager);

  // 8. Display dashboard information
  await displayDashboardInfo(dashboard);

  // 9. Generate recommendations
  await generateRecommendations(agentManager);

  // 10. Perform pressure analysis
  await performPressureAnalysis(pressureDetector);

  console.log('🎉 Example completed successfully!');
  console.log('💡 The system is now running and monitoring resources');
  console.log('📈 Check the dashboard for real-time metrics and alerts');

  // Keep the example running for a bit to show real-time updates
  setTimeout(async () => {
    console.log('🔄 Stopping example...');
    await cleanup(monitor, pressureDetector, agentManager, dashboard);
    console.log('✅ Example stopped');
  }, 30000);
}

function setupEventListeners(
  resourceManager: ResourceManager,
  pressureDetector: PressureDetector,
  agentManager: AgentResourceManager,
  dashboard: ResourceDashboard
) {
  // Resource manager events
  resourceManager.on('resource-allocated', event => {
    console.log(`📦 Resource allocated: ${event.agentId} on ${event.serverId}`);
  });

  resourceManager.on('resource-released', event => {
    console.log(`📤 Resource released: ${event.agentId}`);
  });

  // Pressure detector events
  pressureDetector.on('pressure-alert', alert => {
    console.log(`⚠️ Pressure alert: ${alert.message} (${alert.level})`);
  });

  // Agent manager events
  agentManager.on('agent-scaled-up', event => {
    console.log(`⬆️ Agent scaled up: ${event.agentId} to ${event.toReplicas} replicas`);
  });

  agentManager.on('agent-scaled-down', event => {
    console.log(`⬇️ Agent scaled down: ${event.agentId} to ${event.toReplicas} replicas`);
  });

  // Dashboard events
  dashboard.on('new-alert', alert => {
    console.log(`🚨 Dashboard alert: ${alert.title} - ${alert.message}`);
  });

  dashboard.on('data-updated', data => {
    console.log(
      `📊 Dashboard updated: ${data.metrics.agents.totalAgents} agents, ${data.metrics.cluster.totalServers} servers`
    );
  });
}

async function simulateResourceUpdates(
  detector: ResourceDetector,
  monitor: ResourceMonitor,
  agentManager: AgentResourceManager
) {
  console.log('🔄 Simulating resource updates...');

  // Simulate some metrics updates
  setInterval(async () => {
    const metrics = await detector.getResourceMetrics();

    // Update agent metrics
    await agentManager.updateAgentUsage('web-server-01', {
      ...metrics,
      cpu: { ...metrics.cpu, usage: 60 + Math.random() * 20 },
      memory: { ...metrics.memory, usage: 70 + Math.random() * 15 }
    });

    await agentManager.updateAgentUsage('background-worker-01', {
      ...metrics,
      cpu: { ...metrics.cpu, usage: 40 + Math.random() * 30 },
      memory: { ...metrics.memory, usage: 50 + Math.random() * 25 }
    });
  }, 5000);
}

async function displayDashboardInfo(dashboard: ResourceDashboard) {
  console.log('📊 Dashboard Information:');

  const metrics = dashboard.getMetrics();
  const stats = dashboard.getStats();
  const alerts = dashboard.getAlerts();

  console.log('System Metrics:', {
    cpu: `${metrics.system.cpu.toFixed(1)}%`,
    memory: `${metrics.system.memory.toFixed(1)}%`,
    uptime: `${(metrics.system.uptime / 1000 / 60).toFixed(1)} minutes`
  });

  console.log('Agent Summary:', {
    total: metrics.agents.totalAgents,
    healthy: metrics.agents.healthyAgents,
    degraded: metrics.agents.degradedAgents,
    unhealthy: metrics.agents.unhealthyAgents
  });

  console.log('Pressure Status:', {
    level: metrics.pressure.level,
    score: metrics.pressure.score.toFixed(1),
    alerts: metrics.pressure.alerts
  });

  console.log('Statistics:', {
    uptime: `${(stats.uptime / 1000 / 60).toFixed(1)} minutes`,
    totalAlerts: stats.totalAlerts,
    resolvedAlerts: stats.resolvedAlerts,
    successRate: `${stats.successRate.toFixed(1)}%`
  });

  if (alerts.length > 0) {
    console.log(
      'Active Alerts:',
      alerts.map(a => `${a.level}: ${a.title}`)
    );
  }
}

async function generateRecommendations(agentManager: AgentResourceManager) {
  console.log('💡 Generating recommendations...');

  try {
    const recommendations = await agentManager.generateRecommendations('web-server-01');

    if (recommendations.length > 0) {
      console.log('Recommendations for web-server-01:');
      recommendations.forEach((rec, index) => {
        console.log(
          `${index + 1}. ${rec.type}: ${rec.reasoning[0]} (confidence: ${rec.confidence})`
        );
      });
    } else {
      console.log('No recommendations needed for web-server-01');
    }
  } catch (error) {
    console.log('Could not generate recommendations:', error);
  }
}

async function performPressureAnalysis(pressureDetector: PressureDetector) {
  console.log('🔍 Performing pressure analysis...');

  try {
    const analysis = await pressureDetector.analyzePressure();

    console.log('Pressure Analysis Results:');
    console.log('Overall Pressure:', {
      level: analysis.overall.level,
      value: analysis.overall.value.toFixed(1),
      trend: analysis.overall.trend
    });

    console.log('Resource Pressure:');
    Object.entries(analysis.resources).forEach(([resource, pressure]) => {
      console.log(`  ${resource}: ${pressure.level} (${pressure.value.toFixed(1)}%)`);
    });

    if (analysis.mitigationActions.length > 0) {
      console.log('Mitigation Actions:');
      analysis.mitigationActions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action.type}: ${action.description} (${action.urgency})`);
      });
    }
  } catch (error) {
    console.log('Could not perform pressure analysis:', error);
  }
}

async function cleanup(
  monitor: ResourceMonitor,
  pressureDetector: PressureDetector,
  agentManager: AgentResourceManager,
  dashboard: ResourceDashboard
) {
  monitor.stopMonitoring();
  pressureDetector.stopMonitoring();
  dashboard.stop();

  await agentManager.shutdown();
  await pressureDetector.shutdown();
  await monitor.shutdown();
  await dashboard.shutdown();
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };
