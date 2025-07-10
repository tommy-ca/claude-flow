import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FeatureRegistry } from '../core/feature-registry';
import { Feature } from '../core/feature';
import { IFeature, FeatureMetadata } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('FeatureRegistry', () => {
  let registry: FeatureRegistry;

  beforeEach(() => {
    registry = new FeatureRegistry();
    jest.clearAllMocks();
  });

  describe('discover', () => {
    it('should discover features from default path', async () => {
      const mockFiles = ['feature1.js', 'feature2.ts', 'not-a-feature.txt'];
      const mockFeatureModule = {
        default: class TestFeature extends Feature {
          constructor() {
            super({
              id: 'test-feature',
              name: 'Test Feature',
              version: '1.0.0'
            });
          }
        }
      };

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      jest.doMock(path.join(process.cwd(), 'features', 'feature1.js'), () => mockFeatureModule, { virtual: true });

      const features = await registry.discover();
      
      expect(features.length).toBeGreaterThan(0);
    });

    it('should handle discovery errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      const features = await registry.discover('/non-existent');
      
      expect(features).toEqual([]);
    });
  });

  describe('load', () => {
    it('should load a specific feature', async () => {
      const mockFeature = new Feature({
        id: 'test-feature',
        name: 'Test Feature',
        version: '1.0.0'
      });

      // Mock the module loading
      jest.doMock('test-feature', () => ({
        default: class extends Feature {
          constructor() {
            super(mockFeature.metadata);
          }
        }
      }), { virtual: true });

      const feature = await registry.load('test-feature');
      
      expect(feature).toBeDefined();
      expect(feature.metadata.id).toBe('test-feature');
    });

    it('should throw error for non-existent feature', async () => {
      await expect(registry.load('non-existent'))
        .rejects.toThrow('Failed to load feature: non-existent');
    });
  });

  describe('scan', () => {
    it('should scan for feature metadata', async () => {
      const mockFiles = ['feature1.js', 'feature2.ts'];
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      
      const mockPackageJson = {
        name: 'test-feature',
        version: '1.0.0',
        description: 'Test feature',
        claudeFlow: {
          feature: {
            id: 'test-feature',
            name: 'Test Feature'
          }
        }
      };
      
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockPackageJson));

      const metadata = await registry.scan(['**/feature*.js']);
      
      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
    });

    it('should handle invalid package.json gracefully', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['feature1.js']);
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');

      const metadata = await registry.scan();
      
      expect(metadata).toEqual([]);
    });
  });

  describe('validate', () => {
    it('should validate a valid feature', () => {
      const feature = new Feature({
        id: 'valid-feature',
        name: 'Valid Feature',
        version: '1.0.0'
      });

      const isValid = registry.validate(feature);
      
      expect(isValid).toBe(true);
    });

    it('should reject feature without metadata', () => {
      const invalidFeature = {
        state: 'ready',
        config: { enabled: true }
      } as any;

      const isValid = registry.validate(invalidFeature);
      
      expect(isValid).toBe(false);
    });

    it('should reject feature without required metadata fields', () => {
      const invalidFeature = new Feature({
        id: '',
        name: 'Invalid',
        version: ''
      });

      const isValid = registry.validate(invalidFeature);
      
      expect(isValid).toBe(false);
    });

    it('should reject feature without required methods', () => {
      const invalidFeature = {
        metadata: {
          id: 'test',
          name: 'Test',
          version: '1.0.0'
        },
        state: 'ready',
        config: { enabled: true },
        initialize: 'not a function'
      } as any;

      const isValid = registry.validate(invalidFeature);
      
      expect(isValid).toBe(false);
    });
  });
});