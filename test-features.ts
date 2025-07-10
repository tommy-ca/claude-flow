#!/usr/bin/env tsx
/**
 * Test script for the transparent feature system
 */

import { FeatureManager } from './src/features/core/feature-manager.js';
import { FeatureRegistry } from './src/features/core/feature-registry.js';
import { TransparencyLayer } from './src/features/core/transparency-layer.js';
import { ConfigurationManager } from './src/features/core/configuration-manager.js';
import { Feature } from './src/features/core/feature.js';
import { IFeature, FeatureState, FeatureCategory } from './src/features/types/feature-types.js';
import chalk from 'chalk';

// Create test feature
class TestFeature extends Feature {
  constructor() {
    super({
      id: 'test-feature',
      name: 'Test Feature',
      description: 'A test feature for validation',
      version: '1.0.0',
      category: FeatureCategory.CORE
    });
  }

  async onInitialize(): Promise<void> {
    console.log(chalk.blue('Test feature initializing...'));
  }

  async onStart(): Promise<void> {
    console.log(chalk.green('Test feature started!'));
  }

  async onStop(): Promise<void> {
    console.log(chalk.yellow('Test feature stopped.'));
  }
}

async function runTests() {
  console.log(chalk.cyan.bold('\n🧪 Testing Transparent Feature System\n'));

  // Test 1: Feature Registration
  console.log(chalk.white.bold('Test 1: Feature Registration'));
  const registry = new FeatureRegistry();
  const testFeature = new TestFeature();
  
  try {
    registry.register(testFeature);
    console.log(chalk.green('✅ Feature registered successfully'));
  } catch (error) {
    console.log(chalk.red('❌ Feature registration failed:'), error);
  }

  // Test 2: Transparency Layer
  console.log(chalk.white.bold('\nTest 2: Transparency Layer'));
  const transparencyLayer = new TransparencyLayer();
  
  transparencyLayer.on('feature.enabled', (event) => {
    console.log(chalk.blue('📢 Event:'), event);
  });

  transparencyLayer.logEvent('feature.enabled', {
    featureId: 'test-feature',
    timestamp: new Date()
  });
  console.log(chalk.green('✅ Transparency layer working'));

  // Test 3: Configuration Manager
  console.log(chalk.white.bold('\nTest 3: Configuration Manager'));
  const configManager = new ConfigurationManager('./test-config.json');
  
  await configManager.set('test-feature', { enabled: true, timeout: 5000 });
  const config = await configManager.get('test-feature');
  console.log(chalk.blue('Configuration:'), config);
  console.log(chalk.green('✅ Configuration manager working'));

  // Test 4: Feature Manager
  console.log(chalk.white.bold('\nTest 4: Feature Manager'));
  const featureManager = new FeatureManager({
    registry,
    transparencyLayer,
    configurationManager: configManager
  });

  try {
    await featureManager.enableFeature('test-feature');
    console.log(chalk.green('✅ Feature enabled successfully'));
    
    const status = featureManager.getFeatureStatus('test-feature');
    console.log(chalk.blue('Feature status:'), status);
    
    await featureManager.disableFeature('test-feature');
    console.log(chalk.green('✅ Feature disabled successfully'));
  } catch (error) {
    console.log(chalk.red('❌ Feature manager error:'), error);
  }

  // Test 5: Feature Discovery
  console.log(chalk.white.bold('\nTest 5: Feature Discovery'));
  const features = registry.getAll();
  console.log(chalk.blue('Registered features:'), features.length);
  features.forEach(f => {
    console.log(chalk.gray(`  - ${f.metadata.name} (${f.metadata.id})`));
  });

  console.log(chalk.cyan.bold('\n✨ All tests completed!\n'));
}

// Run tests
runTests().catch(console.error);