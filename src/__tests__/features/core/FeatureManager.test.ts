/**
 * FeatureManager Test Suite
 * Tests for the core feature management system
 * Following TDD principles - all tests should initially fail
 */

import { FeatureManager } from '../../../features/core/FeatureManager';
import { Feature, FeatureConfig, FeatureMetadata } from '../../../features/types';

describe('FeatureManager', () => {
  let featureManager: FeatureManager;

  beforeEach(() => {
    featureManager = new FeatureManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Registration', () => {
    it('should register a new feature', () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature);
      
      expect(featureManager.getFeature('test-feature')).toBe(feature);
    });

    it('should throw error when registering duplicate feature', () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature);
      
      expect(() => featureManager.register(feature)).toThrow('Feature test-feature already registered');
    });

    it('should validate feature dependencies before registration', () => {
      const feature: Feature = {
        id: 'dependent-feature',
        name: 'Dependent Feature',
        version: '1.0.0',
        description: 'A feature with dependencies',
        dependencies: ['base-feature'],
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      expect(() => featureManager.register(feature)).toThrow('Missing dependency: base-feature');
    });
  });

  describe('Feature Activation', () => {
    it('should activate a registered feature', async () => {
      const activate = jest.fn().mockResolvedValue(undefined);
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate,
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature);
      await featureManager.activate('test-feature');

      expect(activate).toHaveBeenCalled();
      expect(featureManager.isActive('test-feature')).toBe(true);
    });

    it('should activate dependencies before feature', async () => {
      const baseActivate = jest.fn().mockResolvedValue(undefined);
      const dependentActivate = jest.fn().mockResolvedValue(undefined);
      
      const baseFeature: Feature = {
        id: 'base-feature',
        name: 'Base Feature',
        version: '1.0.0',
        description: 'A base feature',
        activate: baseActivate,
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const dependentFeature: Feature = {
        id: 'dependent-feature',
        name: 'Dependent Feature',
        version: '1.0.0',
        description: 'A feature with dependencies',
        dependencies: ['base-feature'],
        activate: dependentActivate,
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(baseFeature);
      featureManager.register(dependentFeature);
      
      await featureManager.activate('dependent-feature');

      expect(baseActivate).toHaveBeenCalledBefore(dependentActivate);
      expect(featureManager.isActive('base-feature')).toBe(true);
      expect(featureManager.isActive('dependent-feature')).toBe(true);
    });

    it('should not activate already active feature', async () => {
      const activate = jest.fn().mockResolvedValue(undefined);
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate,
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature);
      await featureManager.activate('test-feature');
      await featureManager.activate('test-feature');

      expect(activate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature Deactivation', () => {
    it('should deactivate an active feature', async () => {
      const deactivate = jest.fn().mockResolvedValue(undefined);
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate,
      };

      featureManager.register(feature);
      await featureManager.activate('test-feature');
      await featureManager.deactivate('test-feature');

      expect(deactivate).toHaveBeenCalled();
      expect(featureManager.isActive('test-feature')).toBe(false);
    });

    it('should deactivate dependent features first', async () => {
      const baseDeactivate = jest.fn().mockResolvedValue(undefined);
      const dependentDeactivate = jest.fn().mockResolvedValue(undefined);
      
      const baseFeature: Feature = {
        id: 'base-feature',
        name: 'Base Feature',
        version: '1.0.0',
        description: 'A base feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: baseDeactivate,
      };

      const dependentFeature: Feature = {
        id: 'dependent-feature',
        name: 'Dependent Feature',
        version: '1.0.0',
        description: 'A feature with dependencies',
        dependencies: ['base-feature'],
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: dependentDeactivate,
      };

      featureManager.register(baseFeature);
      featureManager.register(dependentFeature);
      await featureManager.activate('base-feature');
      await featureManager.activate('dependent-feature');
      
      await featureManager.deactivate('base-feature');

      expect(dependentDeactivate).toHaveBeenCalledBefore(baseDeactivate);
      expect(featureManager.isActive('dependent-feature')).toBe(false);
      expect(featureManager.isActive('base-feature')).toBe(false);
    });
  });

  describe('Feature Discovery', () => {
    it('should list all registered features', () => {
      const feature1: Feature = {
        id: 'feature-1',
        name: 'Feature 1',
        version: '1.0.0',
        description: 'First feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const feature2: Feature = {
        id: 'feature-2',
        name: 'Feature 2',
        version: '1.0.0',
        description: 'Second feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature1);
      featureManager.register(feature2);

      const features = featureManager.listFeatures();
      
      expect(features).toHaveLength(2);
      expect(features.map(f => f.id)).toContain('feature-1');
      expect(features.map(f => f.id)).toContain('feature-2');
    });

    it('should get feature metadata', () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature);
      const metadata = featureManager.getMetadata('test-feature');

      expect(metadata).toMatchObject({
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        isActive: false,
        dependencies: [],
      });
    });

    it('should filter features by status', async () => {
      const feature1: Feature = {
        id: 'feature-1',
        name: 'Feature 1',
        version: '1.0.0',
        description: 'First feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      const feature2: Feature = {
        id: 'feature-2',
        name: 'Feature 2',
        version: '1.0.0',
        description: 'Second feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature1);
      featureManager.register(feature2);
      await featureManager.activate('feature-1');

      const activeFeatures = featureManager.listFeatures({ status: 'active' });
      const inactiveFeatures = featureManager.listFeatures({ status: 'inactive' });

      expect(activeFeatures).toHaveLength(1);
      expect(activeFeatures[0].id).toBe('feature-1');
      expect(inactiveFeatures).toHaveLength(1);
      expect(inactiveFeatures[0].id).toBe('feature-2');
    });
  });

  describe('Feature Configuration', () => {
    it('should configure a feature before activation', async () => {
      const configure = jest.fn().mockResolvedValue(undefined);
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
        configure,
      };

      const config: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'test-key',
          timeout: 5000,
        },
      };

      featureManager.register(feature);
      await featureManager.configure('test-feature', config);

      expect(configure).toHaveBeenCalledWith(config);
    });

    it('should validate configuration schema', async () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
        configSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' },
            timeout: { type: 'number' },
          },
          required: ['apiKey'],
        },
      };

      const invalidConfig: FeatureConfig = {
        enabled: true,
        settings: {
          timeout: 5000, // missing required apiKey
        },
      };

      featureManager.register(feature);
      
      await expect(featureManager.configure('test-feature', invalidConfig))
        .rejects.toThrow('Invalid configuration');
    });
  });

  describe('Feature Lifecycle Hooks', () => {
    it('should call onBeforeActivate hook', async () => {
      const onBeforeActivate = jest.fn().mockResolvedValue(undefined);
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
        onBeforeActivate,
      };

      featureManager.register(feature);
      await featureManager.activate('test-feature');

      expect(onBeforeActivate).toHaveBeenCalledBefore(feature.activate as jest.Mock);
    });

    it('should call onAfterDeactivate hook', async () => {
      const onAfterDeactivate = jest.fn().mockResolvedValue(undefined);
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockResolvedValue(undefined),
        deactivate: jest.fn().mockResolvedValue(undefined),
        onAfterDeactivate,
      };

      featureManager.register(feature);
      await featureManager.activate('test-feature');
      await featureManager.deactivate('test-feature');

      expect(onAfterDeactivate).toHaveBeenCalledAfter(feature.deactivate as jest.Mock);
    });
  });

  describe('Error Handling', () => {
    it('should handle activation errors gracefully', async () => {
      const feature: Feature = {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature',
        activate: jest.fn().mockRejectedValue(new Error('Activation failed')),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(feature);
      
      await expect(featureManager.activate('test-feature'))
        .rejects.toThrow('Failed to activate feature test-feature: Activation failed');
      
      expect(featureManager.isActive('test-feature')).toBe(false);
    });

    it('should rollback on dependency activation failure', async () => {
      const baseActivate = jest.fn().mockResolvedValue(undefined);
      const baseDeactivate = jest.fn().mockResolvedValue(undefined);
      
      const baseFeature: Feature = {
        id: 'base-feature',
        name: 'Base Feature',
        version: '1.0.0',
        description: 'A base feature',
        activate: baseActivate,
        deactivate: baseDeactivate,
      };

      const dependentFeature: Feature = {
        id: 'dependent-feature',
        name: 'Dependent Feature',
        version: '1.0.0',
        description: 'A feature with dependencies',
        dependencies: ['base-feature'],
        activate: jest.fn().mockRejectedValue(new Error('Activation failed')),
        deactivate: jest.fn().mockResolvedValue(undefined),
      };

      featureManager.register(baseFeature);
      featureManager.register(dependentFeature);
      
      await expect(featureManager.activate('dependent-feature'))
        .rejects.toThrow('Failed to activate feature dependent-feature');

      expect(baseDeactivate).toHaveBeenCalled();
      expect(featureManager.isActive('base-feature')).toBe(false);
      expect(featureManager.isActive('dependent-feature')).toBe(false);
    });
  });
});