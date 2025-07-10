import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FeatureManager } from '../core/feature-manager';
import { Feature } from '../core/feature';
import { 
  IFeature, 
  FeatureState, 
  FeatureConfig, 
  FeatureMetadata,
  FeaturePriority 
} from '../types';

describe('FeatureManager', () => {
  let manager: FeatureManager;
  let mockFeature: IFeature;

  beforeEach(() => {
    manager = new FeatureManager();
    
    // Create a mock feature
    mockFeature = {
      metadata: {
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0',
        description: 'A test feature'
      },
      state: FeatureState.UNINITIALIZED,
      config: {
        enabled: true,
        priority: FeaturePriority.NORMAL
      },
      initialize: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn().mockReturnValue(FeatureState.READY),
      updateConfig: jest.fn().mockResolvedValue(undefined)
    };
  });

  describe('register', () => {
    it('should register a feature successfully', async () => {
      await manager.register(mockFeature);
      
      const feature = manager.get('test-feature');
      expect(feature).toBe(mockFeature);
    });

    it('should throw error when registering duplicate feature', async () => {
      await manager.register(mockFeature);
      
      await expect(manager.register(mockFeature))
        .rejects.toThrow('Feature test-feature is already registered');
    });

    it('should initialize feature on registration', async () => {
      await manager.register(mockFeature);
      
      expect(mockFeature.initialize).toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    it('should unregister a feature successfully', async () => {
      await manager.register(mockFeature);
      await manager.unregister('test-feature');
      
      const feature = manager.get('test-feature');
      expect(feature).toBeUndefined();
    });

    it('should call destroy on unregister', async () => {
      await manager.register(mockFeature);
      await manager.unregister('test-feature');
      
      expect(mockFeature.destroy).toHaveBeenCalled();
    });

    it('should throw error when unregistering non-existent feature', async () => {
      await expect(manager.unregister('non-existent'))
        .rejects.toThrow('Feature non-existent not found');
    });
  });

  describe('enable/disable', () => {
    it('should enable a feature', async () => {
      await manager.register(mockFeature);
      await manager.enable('test-feature');
      
      expect(manager.isEnabled('test-feature')).toBe(true);
      expect(mockFeature.start).toHaveBeenCalled();
    });

    it('should disable a feature', async () => {
      await manager.register(mockFeature);
      await manager.enable('test-feature');
      await manager.disable('test-feature');
      
      expect(manager.isEnabled('test-feature')).toBe(false);
      expect(mockFeature.stop).toHaveBeenCalled();
    });
  });

  describe('start/stop', () => {
    it('should start all features when no featureId provided', async () => {
      const feature2 = { ...mockFeature, metadata: { ...mockFeature.metadata, id: 'test-feature-2' } };
      await manager.register(mockFeature);
      await manager.register(feature2);
      
      await manager.start();
      
      expect(mockFeature.start).toHaveBeenCalled();
      expect(feature2.start).toHaveBeenCalled();
    });

    it('should start specific feature when featureId provided', async () => {
      await manager.register(mockFeature);
      await manager.start('test-feature');
      
      expect(mockFeature.start).toHaveBeenCalled();
    });

    it('should stop all features when no featureId provided', async () => {
      await manager.register(mockFeature);
      await manager.start();
      await manager.stop();
      
      expect(mockFeature.stop).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return feature state', async () => {
      await manager.register(mockFeature);
      
      const state = manager.getState('test-feature');
      expect(state).toBe(FeatureState.READY);
    });

    it('should return undefined for non-existent feature', () => {
      const state = manager.getState('non-existent');
      expect(state).toBeUndefined();
    });
  });
});