/**
 * Unit tests for Feature base class
 */

import { describe, it, beforeEach } from "https://deno.land/std@0.220.0/testing/bdd.ts";
import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { Feature } from '../core/feature.ts';
import { 
  FeatureState, 
  FeatureConfig, 
  FeatureMetadata,
  FeaturePriority 
} from '../types/index.ts';

describe('Feature', () => {
  let feature: Feature;
  const mockMetadata: FeatureMetadata = {
    id: 'test-feature',
    name: 'Test Feature',
    version: '1.0.0',
    description: 'A test feature'
  };

  beforeEach(() => {
    feature = new TestFeature(mockMetadata);
  });

  describe('constructor', () => {
    it('should initialize with correct metadata', () => {
      assertEquals(feature.metadata, mockMetadata);
    });

    it('should start in UNINITIALIZED state', () => {
      assertEquals(feature.state, FeatureState.UNINITIALIZED);
    });

    it('should have default config', () => {
      assertEquals(feature.config, {
        enabled: false,
        priority: FeaturePriority.NORMAL
      });
    });
  });

  describe('initialize', () => {
    it('should transition to READY state', async () => {
      await feature.initialize();
      assertEquals(feature.state, FeatureState.READY);
    });

    it('should accept custom config', async () => {
      const config: FeatureConfig = {
        enabled: true,
        priority: FeaturePriority.HIGH,
        settings: { key: 'value' }
      };
      
      await feature.initialize(config);
      assertEquals(feature.config, config);
    });

    it('should call onInit lifecycle hook', async () => {
      let hookCalled = false;
      feature.onInit = async () => { hookCalled = true; };
      
      await feature.initialize();
      assertEquals(hookCalled, true);
    });

    it('should transition to ERROR state on initialization failure', async () => {
      feature.onInit = async () => { throw new Error('Init failed'); };
      
      await assertRejects(
        () => feature.initialize(),
        Error,
        'Init failed'
      );
      assertEquals(feature.state, FeatureState.ERROR);
    });
  });

  describe('start', () => {
    beforeEach(async () => {
      await feature.initialize({ enabled: true });
    });

    it('should transition to ACTIVE state', async () => {
      await feature.start();
      assertEquals(feature.state, FeatureState.ACTIVE);
    });

    it('should call onStart lifecycle hook', async () => {
      let hookCalled = false;
      feature.onStart = async () => { hookCalled = true; };
      
      await feature.start();
      assertEquals(hookCalled, true);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedFeature = new TestFeature(mockMetadata);
      await assertRejects(
        () => uninitializedFeature.start(),
        Error,
        'Feature must be initialized before starting'
      );
    });

    it('should throw error if disabled', async () => {
      await feature.updateConfig({ enabled: false });
      await assertRejects(
        () => feature.start(),
        Error,
        'Cannot start disabled feature'
      );
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await feature.initialize({ enabled: true });
      await feature.start();
    });

    it('should transition to SUSPENDED state', async () => {
      await feature.stop();
      assertEquals(feature.state, FeatureState.SUSPENDED);
    });

    it('should call onStop lifecycle hook', async () => {
      let hookCalled = false;
      feature.onStop = async () => { hookCalled = true; };
      
      await feature.stop();
      assertEquals(hookCalled, true);
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      await feature.initialize();
    });

    it('should transition to DISABLED state', async () => {
      await feature.destroy();
      assertEquals(feature.state, FeatureState.DISABLED);
    });

    it('should call onDestroy lifecycle hook', async () => {
      let hookCalled = false;
      feature.onDestroy = async () => { hookCalled = true; };
      
      await feature.destroy();
      assertEquals(hookCalled, true);
    });
  });

  describe('updateConfig', () => {
    beforeEach(async () => {
      await feature.initialize({ enabled: true });
    });

    it('should update config partially', async () => {
      await feature.updateConfig({ priority: FeaturePriority.HIGH });
      
      assertEquals(feature.config.priority, FeaturePriority.HIGH);
      assertEquals(feature.config.enabled, true);
    });

    it('should call onConfigChange lifecycle hook', async () => {
      let newConfig: FeatureConfig | undefined;
      feature.onConfigChange = async (config) => { newConfig = config; };
      
      await feature.updateConfig({ priority: FeaturePriority.HIGH });
      
      assertExists(newConfig);
      assertEquals(newConfig?.priority, FeaturePriority.HIGH);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      assertEquals(feature.getState(), FeatureState.UNINITIALIZED);
    });
  });
});

// Test implementation of Feature
class TestFeature extends Feature {
  constructor(metadata: FeatureMetadata) {
    super(metadata);
  }
}