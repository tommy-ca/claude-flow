#!/usr/bin/env node

/**
 * Resource Manager Demo
 * Demonstrates the resource management capabilities
 */

import { createResourceManager } from './index';

async function runDemo() {
  console.log('🚀 Resource Manager Demo Starting...\n');

  // Create resource manager
  const resourceManager = createResourceManager({
    monitorConfig: {
      interval: 2000, // Monitor every 2 seconds
      enableCPU: true,
      enableMemory: true,
      enableDisk: true,
      enableNetwork: true,
      enableGPU: false,
      historySize: 20,
      alertThresholds: {
        cpu: 70,
        memory: 80,
        disk: 90
      }
    },
    maxAllocationsPerAgent: 3,
    defaultPriority: 'medium'
  });

  // Set up event listeners
  resourceManager.on('resource:event', event => {
    console.log(`📊 Event: ${event.type} - ${event.resourceType} - ${event.severity}`);
    if (event.data.resource) {
      console.log(`   Resource: ${event.data.resource}`);
    }
  });

  resourceManager.on('resources:updated', resources => {
    console.log(`🔄 Resources updated: ${resources.length} resources detected`);
  });

  try {
    // Initialize resource manager
    console.log('📋 Initializing resource manager...');
    await resourceManager.initialize();

    // Wait for initial resource detection
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Show initial resources
    console.log('\n📊 Initial Resources:');
    const resources = resourceManager.getResources();
    resources.forEach(resource => {
      console.log(`  ${resource.type.toUpperCase()}: ${resource.name}`);
      console.log(`    Capacity: ${resource.capacity} ${resource.unit}`);
      console.log(`    Available: ${resource.available} ${resource.unit}`);
      console.log(`    Status: ${resource.status}`);
      console.log('');
    });

    // Show resource summary
    console.log('📈 Resource Summary:');
    const summary = resourceManager.getResourceSummary();
    console.log(`  Total Resources: ${summary.totalResources}`);
    console.log(`  Available Resources: ${summary.availableResources}`);
    console.log(`  Utilization: ${summary.utilizationPercentage.toFixed(1)}%`);
    console.log('');

    // Test allocations
    console.log('🎯 Testing Resource Allocations...\n');

    // Allocate CPU resources
    console.log('Allocating CPU resources...');
    const cpuAllocation = await resourceManager.allocate({
      agentId: 'demo-agent-1',
      resourceType: 'cpu',
      amount: 25,
      priority: 'high',
      metadata: { purpose: 'demo-task' }
    });
    console.log(`✅ CPU allocated: ${cpuAllocation.amount}% to ${cpuAllocation.agentId}`);

    // Allocate memory resources
    console.log('Allocating memory resources...');
    const memoryAllocation = await resourceManager.allocate({
      agentId: 'demo-agent-2',
      resourceType: 'memory',
      amount: 1024 * 1024 * 100, // 100MB
      priority: 'medium',
      metadata: { purpose: 'data-processing' }
    });
    console.log(
      `✅ Memory allocated: ${(memoryAllocation.amount / 1024 / 1024).toFixed(0)}MB to ${memoryAllocation.agentId}`
    );

    // Show allocations
    console.log('\n📋 Active Allocations:');
    const allocations = resourceManager.getAllocations();
    allocations.forEach(allocation => {
      console.log(
        `  ${allocation.id}: ${allocation.resourceType} - ${allocation.amount} (${allocation.priority})`
      );
      console.log(`    Agent: ${allocation.agentId}`);
      console.log(`    Status: ${allocation.status}`);
      console.log('');
    });

    // Test agent-specific allocations
    console.log('🤖 Agent-Specific Allocations:');
    const agent1Allocations = resourceManager.getAllocationsByAgent('demo-agent-1');
    console.log(`  demo-agent-1: ${agent1Allocations.length} allocations`);

    const agent2Allocations = resourceManager.getAllocationsByAgent('demo-agent-2');
    console.log(`  demo-agent-2: ${agent2Allocations.length} allocations`);

    // Monitor for a bit
    console.log('\n⏱️  Monitoring resources for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Show updated summary
    console.log('\n📊 Updated Resource Summary:');
    const updatedSummary = resourceManager.getResourceSummary();
    console.log(`  Total Resources: ${updatedSummary.totalResources}`);
    console.log(`  Available Resources: ${updatedSummary.availableResources}`);
    console.log(`  Utilization: ${updatedSummary.utilizationPercentage.toFixed(1)}%`);
    console.log(`  Active Allocations: ${updatedSummary.allocatedResources}`);

    // Test deallocation
    console.log('\n🔄 Testing Deallocation...');
    await resourceManager.deallocate(cpuAllocation.id);
    console.log(`✅ CPU allocation deallocated: ${cpuAllocation.id}`);

    await resourceManager.deallocate(memoryAllocation.id);
    console.log(`✅ Memory allocation deallocated: ${memoryAllocation.id}`);

    // Show allocation history
    console.log('\n📚 Allocation History:');
    const history = resourceManager.getAllocationHistory();
    history.slice(-5).forEach(allocation => {
      console.log(`  ${allocation.id}: ${allocation.resourceType} - ${allocation.status}`);
      console.log(
        `    Duration: ${
          allocation.endTime
            ? allocation.endTime.getTime() - allocation.startTime.getTime() + 'ms'
            : 'ongoing'
        }`
      );
    });

    // Test resource limits
    console.log('\n⚠️  Testing Resource Limits...');
    try {
      // Try to allocate too many resources to one agent
      for (let i = 0; i < 5; i++) {
        await resourceManager.allocate({
          agentId: 'greedy-agent',
          resourceType: 'cpu',
          amount: 5,
          priority: 'low'
        });
      }
    } catch (error) {
      console.log(`❌ Allocation limit reached: ${error.message}`);
    }

    // Test pending requests
    console.log('\n⏳ Testing Pending Requests...');
    try {
      await resourceManager.allocate({
        agentId: 'impossible-agent',
        resourceType: 'cpu',
        amount: 150, // More than 100%
        priority: 'critical'
      });
    } catch (error) {
      console.log(`❌ Impossible allocation: ${error.message}`);
    }

    const pendingRequests = resourceManager.getPendingRequests();
    console.log(`📋 Pending requests: ${pendingRequests.length}`);

    // Show final status
    console.log('\n📊 Final Status:');
    const monitor = resourceManager.getMonitor();
    const status = monitor.getStatus();
    console.log(`  Monitoring: ${status.isMonitoring ? 'Active' : 'Inactive'}`);
    console.log(`  Uptime: ${(status.uptime / 1000).toFixed(1)}s`);
    console.log(`  Resources tracked: ${status.resourceCount}`);
    console.log(`  History entries: ${status.historySize}`);
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Shutting down...');
    await resourceManager.shutdown();
    console.log('✅ Demo completed successfully!');
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };
