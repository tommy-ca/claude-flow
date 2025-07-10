/**
 * Configuration Test Suite
 * Tests for the feature system configuration management
 * Following TDD principles - all tests should initially fail
 */

import { ConfigurationManager } from '../../../features/core/Configuration';
import { FeatureConfig, ConfigSchema, ValidationError } from '../../../features/types';

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    configManager = new ConfigurationManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Storage', () => {
    it('should store feature configuration', () => {
      const config: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'test-key',
          timeout: 5000,
          retryCount: 3,
        },
      };

      configManager.setConfig('test-feature', config);
      const retrievedConfig = configManager.getConfig('test-feature');

      expect(retrievedConfig).toEqual(config);
    });

    it('should return undefined for non-existent configuration', () => {
      const config = configManager.getConfig('non-existent-feature');
      expect(config).toBeUndefined();
    });

    it('should update existing configuration', () => {
      const initialConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'initial-key',
          timeout: 5000,
        },
      };

      const updatedConfig: FeatureConfig = {
        enabled: false,
        settings: {
          apiKey: 'updated-key',
          timeout: 10000,
        },
      };

      configManager.setConfig('test-feature', initialConfig);
      configManager.setConfig('test-feature', updatedConfig);

      expect(configManager.getConfig('test-feature')).toEqual(updatedConfig);
    });

    it('should merge partial configuration updates', () => {
      const initialConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'test-key',
          timeout: 5000,
          retryCount: 3,
        },
      };

      configManager.setConfig('test-feature', initialConfig);
      configManager.updateConfig('test-feature', {
        settings: {
          timeout: 10000,
        },
      });

      const mergedConfig = configManager.getConfig('test-feature');
      
      expect(mergedConfig).toEqual({
        enabled: true,
        settings: {
          apiKey: 'test-key',
          timeout: 10000,
          retryCount: 3,
        },
      });
    });
  });

  describe('Schema Validation', () => {
    it('should register configuration schema', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string', minLength: 10 },
          timeout: { type: 'number', minimum: 0, maximum: 30000 },
          retryCount: { type: 'integer', minimum: 0, maximum: 10 },
        },
        required: ['apiKey'],
      };

      configManager.registerSchema('test-feature', schema);
      const retrievedSchema = configManager.getSchema('test-feature');

      expect(retrievedSchema).toEqual(schema);
    });

    it('should validate configuration against schema', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string', minLength: 10 },
          timeout: { type: 'number', minimum: 0, maximum: 30000 },
        },
        required: ['apiKey'],
      };

      configManager.registerSchema('test-feature', schema);

      const validConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: '1234567890',
          timeout: 5000,
        },
      };

      const result = configManager.validateConfig('test-feature', validConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect schema validation errors', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string', minLength: 10 },
          timeout: { type: 'number', minimum: 0, maximum: 30000 },
        },
        required: ['apiKey', 'timeout'],
      };

      configManager.registerSchema('test-feature', schema);

      const invalidConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'short', // Too short
          // Missing required timeout
        },
      };

      const result = configManager.validateConfig('test-feature', invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/settings/apiKey',
          message: expect.stringContaining('minLength'),
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/settings/timeout',
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should validate nested configuration properties', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          database: {
            type: 'object',
            properties: {
              host: { type: 'string', format: 'hostname' },
              port: { type: 'integer', minimum: 1, maximum: 65535 },
              credentials: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['username', 'password'],
              },
            },
            required: ['host', 'port', 'credentials'],
          },
        },
        required: ['database'],
      };

      configManager.registerSchema('test-feature', schema);

      const config: FeatureConfig = {
        enabled: true,
        settings: {
          database: {
            host: 'localhost',
            port: 5432,
            credentials: {
              username: 'admin',
              password: 'securepass123',
            },
          },
        },
      };

      const result = configManager.validateConfig('test-feature', config);
      
      expect(result.valid).toBe(true);
    });

    it('should enforce configuration through schema on set', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string', minLength: 10 },
        },
        required: ['apiKey'],
      };

      configManager.registerSchema('test-feature', schema);
      configManager.setValidationMode('strict');

      const invalidConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'short',
        },
      };

      expect(() => configManager.setConfig('test-feature', invalidConfig))
        .toThrow(ValidationError);
    });
  });

  describe('Configuration Defaults', () => {
    it('should apply default values from schema', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          timeout: { type: 'number', default: 5000 },
          retryCount: { type: 'integer', default: 3 },
          options: {
            type: 'object',
            properties: {
              debug: { type: 'boolean', default: false },
              logLevel: { type: 'string', default: 'info' },
            },
            default: {},
          },
        },
        required: ['apiKey'],
      };

      configManager.registerSchema('test-feature', schema);

      const config: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'test-key-123',
        },
      };

      const configWithDefaults = configManager.applyDefaults('test-feature', config);
      
      expect(configWithDefaults.settings).toEqual({
        apiKey: 'test-key-123',
        timeout: 5000,
        retryCount: 3,
        options: {
          debug: false,
          logLevel: 'info',
        },
      });
    });

    it('should not override existing values with defaults', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          timeout: { type: 'number', default: 5000 },
        },
      };

      configManager.registerSchema('test-feature', schema);

      const config: FeatureConfig = {
        enabled: true,
        settings: {
          timeout: 10000,
        },
      };

      const configWithDefaults = configManager.applyDefaults('test-feature', config);
      
      expect(configWithDefaults.settings.timeout).toBe(10000);
    });
  });

  describe('Configuration Persistence', () => {
    it('should save configuration to storage', async () => {
      const mockStorage = {
        save: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      configManager.setStorage(mockStorage);

      const config: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'test-key',
        },
      };

      configManager.setConfig('test-feature', config);
      await configManager.saveConfig('test-feature');

      expect(mockStorage.save).toHaveBeenCalledWith(
        'feature-config:test-feature',
        config
      );
    });

    it('should load configuration from storage', async () => {
      const storedConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'stored-key',
        },
      };

      const mockStorage = {
        save: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue(storedConfig),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      configManager.setStorage(mockStorage);
      await configManager.loadConfig('test-feature');

      const loadedConfig = configManager.getConfig('test-feature');
      
      expect(loadedConfig).toEqual(storedConfig);
      expect(mockStorage.load).toHaveBeenCalledWith('feature-config:test-feature');
    });

    it('should handle storage errors gracefully', async () => {
      const mockStorage = {
        save: jest.fn().mockRejectedValue(new Error('Storage error')),
        load: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      configManager.setStorage(mockStorage);

      const config: FeatureConfig = {
        enabled: true,
        settings: {},
      };

      configManager.setConfig('test-feature', config);
      
      await expect(configManager.saveConfig('test-feature'))
        .rejects.toThrow('Failed to save configuration: Storage error');
    });
  });

  describe('Configuration Watching', () => {
    it('should notify watchers on configuration change', () => {
      const watcher = jest.fn();
      
      configManager.watchConfig('test-feature', watcher);

      const config: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'test-key',
        },
      };

      configManager.setConfig('test-feature', config);

      expect(watcher).toHaveBeenCalledWith({
        featureId: 'test-feature',
        config,
        previousConfig: undefined,
      });
    });

    it('should provide previous configuration in change event', () => {
      const watcher = jest.fn();
      
      const initialConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiKey: 'initial-key',
        },
      };

      const updatedConfig: FeatureConfig = {
        enabled: false,
        settings: {
          apiKey: 'updated-key',
        },
      };

      configManager.setConfig('test-feature', initialConfig);
      configManager.watchConfig('test-feature', watcher);
      configManager.setConfig('test-feature', updatedConfig);

      expect(watcher).toHaveBeenCalledWith({
        featureId: 'test-feature',
        config: updatedConfig,
        previousConfig: initialConfig,
      });
    });

    it('should support multiple watchers', () => {
      const watcher1 = jest.fn();
      const watcher2 = jest.fn();
      
      configManager.watchConfig('test-feature', watcher1);
      configManager.watchConfig('test-feature', watcher2);

      const config: FeatureConfig = {
        enabled: true,
        settings: {},
      };

      configManager.setConfig('test-feature', config);

      expect(watcher1).toHaveBeenCalled();
      expect(watcher2).toHaveBeenCalled();
    });

    it('should unwatch configuration changes', () => {
      const watcher = jest.fn();
      
      const unwatch = configManager.watchConfig('test-feature', watcher);
      unwatch();

      const config: FeatureConfig = {
        enabled: true,
        settings: {},
      };

      configManager.setConfig('test-feature', config);

      expect(watcher).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Export/Import', () => {
    it('should export all configurations', () => {
      const config1: FeatureConfig = {
        enabled: true,
        settings: { feature: 'one' },
      };

      const config2: FeatureConfig = {
        enabled: false,
        settings: { feature: 'two' },
      };

      configManager.setConfig('feature-1', config1);
      configManager.setConfig('feature-2', config2);

      const exported = configManager.exportAll();
      
      expect(exported).toEqual({
        'feature-1': config1,
        'feature-2': config2,
      });
    });

    it('should import multiple configurations', () => {
      const configurations = {
        'feature-1': {
          enabled: true,
          settings: { feature: 'one' },
        },
        'feature-2': {
          enabled: false,
          settings: { feature: 'two' },
        },
      };

      configManager.importAll(configurations);

      expect(configManager.getConfig('feature-1')).toEqual(configurations['feature-1']);
      expect(configManager.getConfig('feature-2')).toEqual(configurations['feature-2']);
    });

    it('should validate imported configurations', () => {
      const schema: ConfigSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string', minLength: 10 },
        },
        required: ['apiKey'],
      };

      configManager.registerSchema('feature-1', schema);
      configManager.setValidationMode('strict');

      const configurations = {
        'feature-1': {
          enabled: true,
          settings: { apiKey: 'short' }, // Invalid
        },
      };

      expect(() => configManager.importAll(configurations))
        .toThrow(ValidationError);
    });
  });

  describe('Environment-based Configuration', () => {
    it('should support environment-specific configurations', () => {
      const baseConfig: FeatureConfig = {
        enabled: true,
        settings: {
          apiUrl: 'https://api.example.com',
          timeout: 5000,
        },
      };

      const devOverride: Partial<FeatureConfig> = {
        settings: {
          apiUrl: 'http://localhost:3000',
          debug: true,
        },
      };

      const prodOverride: Partial<FeatureConfig> = {
        settings: {
          timeout: 10000,
          debug: false,
        },
      };

      configManager.setConfig('test-feature', baseConfig);
      configManager.setEnvironmentConfig('test-feature', 'development', devOverride);
      configManager.setEnvironmentConfig('test-feature', 'production', prodOverride);

      const devConfig = configManager.getConfig('test-feature', 'development');
      const prodConfig = configManager.getConfig('test-feature', 'production');

      expect(devConfig?.settings).toEqual({
        apiUrl: 'http://localhost:3000',
        timeout: 5000,
        debug: true,
      });

      expect(prodConfig?.settings).toEqual({
        apiUrl: 'https://api.example.com',
        timeout: 10000,
        debug: false,
      });
    });
  });
});