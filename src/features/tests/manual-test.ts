/**
 * Manual test runner for feature system
 * Run with: npx tsx src/features/tests/manual-test.ts
 */

import { Feature, FeatureManager, FeatureRegistry, TransparencyLayer, ConfigurationManager } from '../core';
import { FeatureState, FeaturePriority, FeatureMetadata, TransparencyEventType } from '../types/feature-types';

// Test Feature implementation
class TestFeature extends Feature {
  constructor() {
    super({
      id: 'test-feature',
      name: 'Test Feature',
      version: '1.0.0',
      description: 'A test feature for validation'
    });
  }

  async onInit() {
    console.log('TestFeature: onInit called');
  }

  async onStart() {
    console.log('TestFeature: onStart called');
  }

  async onStop() {
    console.log('TestFeature: onStop called');
  }

  async onDestroy() {
    console.log('TestFeature: onDestroy called');
  }
}

async function runTests() {
  console.log('🧪 Starting Feature System Tests\n');
  
  // Debug enum values
  console.log('Debug - FeatureState enum values:');
  console.log('ACTIVE:', FeatureState.ACTIVE);
  console.log('SUSPENDED:', FeatureState.SUSPENDED);
  console.log('---\n');

  try {
    // Test 1: Feature lifecycle
    console.log('Test 1: Feature Lifecycle');
    const feature = new TestFeature();
    
    console.log(`Initial state: ${feature.state}`);
    assert(feature.state === FeatureState.UNINITIALIZED, 'Feature should start uninitialized');
    
    await feature.initialize({ enabled: true });
    console.log(`After init: ${feature.state}`);
    assert(feature.state === FeatureState.READY, 'Feature should be ready after init');
    
    await feature.start();
    console.log(`After start: ${feature.getState()} (expected: ${FeatureState.ACTIVE})`);
    const startState = feature.getState();
    console.log(`Start state value:`, startState);
    assert(startState === FeatureState.ACTIVE, 'Feature should be active after start');
    
    await feature.stop();
    console.log(`After stop: ${feature.getState()} (expected: ${FeatureState.SUSPENDED})`);
    const stopState = feature.getState();
    console.log(`Stop state value:`, stopState);
    assert(stopState === FeatureState.SUSPENDED, 'Feature should be suspended after stop');
    
    await feature.destroy();
    console.log(`After destroy: ${feature.state}`);
    assert(feature.state === FeatureState.DISABLED, 'Feature should be disabled after destroy');
    
    console.log('✅ Feature lifecycle test passed\n');

    // Test 2: Feature Manager
    console.log('Test 2: Feature Manager');
    const manager = new FeatureManager();
    const feature1 = new TestFeature();
    const feature2 = new TestFeature();
    feature2.metadata = { ...feature2.metadata, id: 'test-feature-2' };
    
    await manager.register(feature1);
    console.log('Registered feature1');
    
    const retrieved = manager.get('test-feature');
    assert(retrieved === feature1, 'Should retrieve registered feature');
    
    await manager.enable('test-feature');
    assert(manager.isEnabled('test-feature'), 'Feature should be enabled');
    
    await manager.disable('test-feature');
    assert(!manager.isEnabled('test-feature'), 'Feature should be disabled');
    
    console.log('✅ Feature Manager test passed\n');

    // Test 3: Transparency Layer
    console.log('Test 3: Transparency Layer');
    const transparencyLayer = new TransparencyLayer();
    let eventReceived = false;
    
    const unsubscribe = transparencyLayer.subscribe((event) => {
      console.log(`Event received: ${event.type} for ${event.featureId}`);
      eventReceived = true;
    });
    
    transparencyLayer.log({
      type: TransparencyEventType.FEATURE_REGISTERED,
      featureId: 'test-feature',
      timestamp: new Date(),
      data: { test: 'data' }
    });
    
    assert(eventReceived, 'Should receive transparency event');
    
    const history = transparencyLayer.getHistory();
    assert(history.length > 0, 'Should have event history');
    assert(history[0].type === TransparencyEventType.FEATURE_REGISTERED, 'Event type should be correct');
    
    unsubscribe();
    console.log('✅ Transparency Layer test passed\n');

    // Test 4: Configuration Manager
    console.log('Test 4: Configuration Manager');
    const configManager = new ConfigurationManager();
    
    configManager.set('test-feature', {
      enabled: true,
      priority: FeaturePriority.HIGH,
      settings: { key: 'value' }
    });
    
    const config = configManager.get('test-feature');
    assert(config?.enabled === true, 'Config should be enabled');
    assert(config?.priority === FeaturePriority.HIGH, 'Config should have high priority');
    
    configManager.update('test-feature', { priority: FeaturePriority.LOW });
    const updatedConfig = configManager.get('test-feature');
    assert(updatedConfig?.priority === FeaturePriority.LOW, 'Config priority should be updated');
    
    console.log('✅ Configuration Manager test passed\n');

    // Test 5: Feature Registry
    console.log('Test 5: Feature Registry');
    const registry = new FeatureRegistry();
    
    const isValid = registry.validate(feature1);
    assert(isValid, 'Feature should be valid');
    
    console.log('✅ Feature Registry test passed\n');

    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Run tests
runTests().catch(console.error);