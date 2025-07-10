#!/usr/bin/env node
/**
 * Feature Transparency Demo
 * This example demonstrates how the feature system provides transparency
 * in claude-flow operations
 */

import { execSync } from 'child_process';

console.log('🎯 Claude-Flow Feature Transparency Demo\n');

// Helper to run commands and display output
function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`   Command: ${command}`);
  console.log('   Output:');
  
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(output.split('\n').map(line => '   ' + line).join('\n'));
  } catch (error) {
    console.error('   Error:', error.message);
  }
}

// Demo sequence
console.log('This demo shows how features provide transparency and control:\n');

// 1. List all features
runCommand(
  'npx claude-flow features list',
  'Listing all available features'
);

// 2. Show feature status
runCommand(
  'npx claude-flow features status',
  'Showing overall feature system status'
);

// 3. Show specific feature details
runCommand(
  'npx claude-flow features status advanced-memory --health',
  'Checking advanced memory feature health'
);

// 4. Configure a feature
runCommand(
  'npx claude-flow features config swarm-coordination --set maxAgents=8',
  'Configuring swarm coordination settings'
);

// 5. Enable a feature
runCommand(
  'npx claude-flow features enable github-integration',
  'Enabling GitHub integration feature'
);

// 6. List only enabled features
runCommand(
  'npx claude-flow features list --enabled true --verbose',
  'Showing only enabled features with details'
);

// 7. Show feature dependencies
runCommand(
  'npx claude-flow features status hive-mind',
  'Checking hive-mind feature dependencies'
);

console.log('\n✅ Demo Complete!\n');
console.log('Key takeaways:');
console.log('1. Features provide fine-grained control over system capabilities');
console.log('2. Each feature has clear dependencies and conflicts');
console.log('3. Features can be configured independently');
console.log('4. Health checks ensure features are working properly');
console.log('5. The system is transparent about what\'s enabled and why');
console.log('\nTry running these commands yourself to explore the feature system!');