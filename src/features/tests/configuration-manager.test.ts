import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigurationManager } from '../core/configuration-manager';
import { FeatureConfig, FeaturePriority } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  const mockConfigPath = '/test/config.json';

  beforeEach(() => {
    configManager = new ConfigurationManager();
    jest.clearAllMocks();
  });

  describe('load', () => {
    it('should load configuration from file', async () => {
      const mockConfig = {
        'feature1': {
          enabled: true,
          priority: FeaturePriority.HIGH,
          settings: { key: 'value' }
        },
        'feature2': {
          enabled: false,
          priority: FeaturePriority.LOW
        }
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      const configs = await configManager.load(mockConfigPath);
      
      expect(configs).toEqual(mockConfig);
      expect(configManager.get('feature1')).toEqual(mockConfig.feature1);
    });

    it('should handle missing config file gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const configs = await configManager.load(mockConfigPath);
      
      expect(configs).toEqual({});
    });

    it('should handle invalid JSON gracefully', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');

      const configs = await configManager.load(mockConfigPath);
      
      expect(configs).toEqual({});
    });
  });

  describe('save', () => {
    it('should save configuration to file', async () => {
      const configs = {
        'feature1': {
          enabled: true,
          priority: FeaturePriority.NORMAL
        }
      };

      await configManager.save(configs, mockConfigPath);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(configs, null, 2)
      );
    });

    it('should create directory if it does not exist', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      
      await configManager.save({}, mockConfigPath);
      
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(mockConfigPath),
        { recursive: true }
      );
    });
  });

  describe('get/set', () => {
    it('should get and set feature config', () => {
      const config: FeatureConfig = {
        enabled: true,
        priority: FeaturePriority.HIGH,
        settings: { test: 'value' }
      };

      configManager.set('test-feature', config);
      
      expect(configManager.get('test-feature')).toEqual(config);
    });

    it('should return undefined for non-existent feature', () => {
      expect(configManager.get('non-existent')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update existing config partially', () => {
      const initialConfig: FeatureConfig = {
        enabled: true,
        priority: FeaturePriority.NORMAL,
        settings: { key1: 'value1', key2: 'value2' }
      };

      configManager.set('test-feature', initialConfig);
      configManager.update('test-feature', {
        priority: FeaturePriority.HIGH,
        settings: { key1: 'updated' }
      });

      const updatedConfig = configManager.get('test-feature');
      expect(updatedConfig?.enabled).toBe(true);
      expect(updatedConfig?.priority).toBe(FeaturePriority.HIGH);
      expect(updatedConfig?.settings).toEqual({ key1: 'updated' });
    });

    it('should create new config if feature does not exist', () => {
      configManager.update('new-feature', {
        enabled: true
      });

      const config = configManager.get('new-feature');
      expect(config).toEqual({
        enabled: true,
        priority: FeaturePriority.NORMAL
      });
    });
  });

  describe('validate', () => {
    it('should validate valid config', () => {
      const config: FeatureConfig = {
        enabled: true,
        priority: FeaturePriority.HIGH
      };

      const isValid = configManager.validate('test-feature', config);
      
      expect(isValid).toBe(true);
    });

    it('should reject config without enabled field', () => {
      const config = {
        priority: FeaturePriority.HIGH
      } as any;

      const isValid = configManager.validate('test-feature', config);
      
      expect(isValid).toBe(false);
    });

    it('should reject config with invalid priority', () => {
      const config = {
        enabled: true,
        priority: 'invalid' as any
      };

      const isValid = configManager.validate('test-feature', config);
      
      expect(isValid).toBe(false);
    });
  });
});