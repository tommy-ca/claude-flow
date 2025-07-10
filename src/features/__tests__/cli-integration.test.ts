/**
 * Tests for CLI feature integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigManager } from '../../config/config-manager';
import { createCliFeatureAdapter } from '../adapters/CliFeatureAdapter';
import { getFeatureManager } from '../core/FeatureManager';
import { registerBuiltInFeatures } from '../built-in';
import { resetFeatureSystem } from '../initializer';

describe('CLI Feature Integration', () => {
  let configManager: ConfigManager;
  let adapter: any;
  let featureManager: any;
  let consoleSpy: jest.SpyInstance;
  
  beforeEach(async () => {
    resetFeatureSystem();
    configManager = new ConfigManager();
    featureManager = getFeatureManager(configManager);
    adapter = createCliFeatureAdapter(configManager);
    
    // Register built-in features
    await registerBuiltInFeatures(featureManager);
    
    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });
  
  afterEach(() => {
    consoleSpy.mockRestore();
    resetFeatureSystem();
  });
  
  describe('listFeatures', () => {
    it('should list all features', async () => {
      await adapter.listFeatures([], {});
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Features'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Advanced Memory'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Swarm Coordination'));
    });
    
    it('should filter by category', async () => {
      await adapter.listFeatures([], { category: 'swarm' });
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Swarm Coordination');
      expect(output).toContain('Hive Mind');
      expect(output).not.toContain('GitHub Integration');
    });
    
    it('should output JSON format', async () => {
      await adapter.listFeatures([], { json: true });
      
      const jsonOutput = consoleSpy.mock.calls[0][0];
      const features = JSON.parse(jsonOutput);
      
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
      expect(features[0]).toHaveProperty('id');
      expect(features[0]).toHaveProperty('name');
      expect(features[0]).toHaveProperty('category');
    });
  });
  
  describe('enableFeature', () => {
    it('should enable a feature', async () => {
      await featureManager.disable('swarm-coordination');
      
      await adapter.enableFeature(['swarm-coordination'], {});
      
      expect(featureManager.isEnabled('swarm-coordination')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Feature 'swarm-coordination' has been enabled"));
    });
    
    it('should show warning for experimental features', async () => {
      await adapter.enableFeature(['neural-patterns'], {});
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('experimental feature'));
    });
    
    it('should show dependencies', async () => {
      await adapter.enableFeature(['hive-mind'], {});
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dependencies'));
    });
    
    it('should fail if feature not found', async () => {
      await expect(adapter.enableFeature(['non-existent'], {})).rejects.toThrow('Feature not found');
    });
  });
  
  describe('disableFeature', () => {
    it('should disable a feature', async () => {
      await featureManager.enable('github-integration');
      
      await adapter.disableFeature(['github-integration'], {});
      
      expect(featureManager.isEnabled('github-integration')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Feature 'github-integration' has been disabled"));
    });
    
    it('should fail if feature has dependents', async () => {
      await featureManager.enable('advanced-memory');
      await featureManager.enable('swarm-coordination');
      
      await expect(adapter.disableFeature(['advanced-memory'], {})).rejects.toThrow('depends on it');
    });
  });
  
  describe('toggleFeature', () => {
    it('should toggle feature on', async () => {
      await featureManager.disable('web-ui');
      
      await adapter.toggleFeature(['web-ui'], {});
      
      expect(featureManager.isEnabled('web-ui')).toBe(true);
    });
    
    it('should toggle feature off', async () => {
      await featureManager.enable('web-ui');
      
      await adapter.toggleFeature(['web-ui'], {});
      
      expect(featureManager.isEnabled('web-ui')).toBe(false);
    });
  });
  
  describe('configureFeature', () => {
    it('should get feature configuration', async () => {
      await adapter.configureFeature(['advanced-memory'], { get: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Configuration for 'advanced-memory'"));
    });
    
    it('should set configuration value', async () => {
      await adapter.configureFeature(['advanced-memory'], { set: 'backend=sqlite' });
      
      const config = featureManager.getConfig('advanced-memory');
      expect(config.settings.backend).toBe('sqlite');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Set backend = "sqlite"'));
    });
    
    it('should parse boolean values', async () => {
      await adapter.configureFeature(['advanced-memory'], { set: 'semanticSearch=true' });
      
      const config = featureManager.getConfig('advanced-memory');
      expect(config.settings.semanticSearch).toBe(true);
    });
    
    it('should parse numeric values', async () => {
      await adapter.configureFeature(['swarm-coordination'], { set: 'maxAgents=10' });
      
      const config = featureManager.getConfig('swarm-coordination');
      expect(config.settings.maxAgents).toBe(10);
    });
    
    it('should reset configuration', async () => {
      await featureManager.configure('advanced-memory', { settings: { backend: 'sqlite', cache: true } });
      
      await adapter.configureFeature(['advanced-memory'], { reset: true });
      
      const config = featureManager.getConfig('advanced-memory');
      expect(config.settings).toEqual({});
    });
  });
  
  describe('showFeatureStatus', () => {
    it('should show specific feature status', async () => {
      await adapter.showFeatureStatus(['advanced-memory'], {});
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Feature Status: Advanced Memory'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Version:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Category:'));
    });
    
    it('should include health check', async () => {
      await adapter.showFeatureStatus(['advanced-memory'], { health: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Health Check:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Healthy'));
    });
    
    it('should show overall status summary', async () => {
      await adapter.showFeatureStatus([], {});
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Feature System Status'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total Features:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Enabled:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Experimental:'));
    });
  });
  
  describe('Feature conflicts', () => {
    it('should prevent enabling conflicting features', async () => {
      await featureManager.enable('terminal-ui');
      
      await expect(featureManager.enable('web-ui')).rejects.toThrow('conflicts with');
    });
    
    it('should allow enabling after disabling conflict', async () => {
      await featureManager.enable('terminal-ui');
      await featureManager.disable('terminal-ui');
      await featureManager.enable('web-ui');
      
      expect(featureManager.isEnabled('web-ui')).toBe(true);
      expect(featureManager.isEnabled('terminal-ui')).toBe(false);
    });
  });
  
  describe('Feature dependencies', () => {
    it('should enable dependencies automatically', async () => {
      await featureManager.disable('advanced-memory');
      await featureManager.disable('swarm-coordination');
      
      await expect(featureManager.enable('hive-mind')).rejects.toThrow('not enabled');
    });
    
    it('should work with all dependencies enabled', async () => {
      await featureManager.enable('advanced-memory');
      await featureManager.enable('swarm-coordination');
      await featureManager.enable('hive-mind');
      
      expect(featureManager.isEnabled('hive-mind')).toBe(true);
    });
  });
});

describe('Feature Command Hooks', () => {
  let configManager: ConfigManager;
  let featureManager: any;
  
  beforeEach(async () => {
    resetFeatureSystem();
    configManager = new ConfigManager();
    featureManager = getFeatureManager(configManager);
    await registerBuiltInFeatures(featureManager);
  });
  
  afterEach(() => {
    resetFeatureSystem();
  });
  
  it('should check feature requirements', async () => {
    const { hasFeature, hasAllFeatures, hasAnyFeature } = await import('../hooks/command-hooks');
    
    await featureManager.enable('advanced-memory');
    await featureManager.enable('swarm-coordination');
    await featureManager.disable('hive-mind');
    
    expect(hasFeature('advanced-memory')).toBe(true);
    expect(hasFeature('hive-mind')).toBe(false);
    
    expect(hasAllFeatures('advanced-memory', 'swarm-coordination')).toBe(true);
    expect(hasAllFeatures('advanced-memory', 'hive-mind')).toBe(false);
    
    expect(hasAnyFeature('hive-mind', 'advanced-memory')).toBe(true);
    expect(hasAnyFeature('hive-mind', 'neural-patterns')).toBe(false);
  });
  
  it('should execute conditionally with features', async () => {
    const { withFeature } = await import('../hooks/command-hooks');
    
    await featureManager.enable('advanced-memory');
    
    const result = await withFeature(
      'advanced-memory',
      async () => 'enabled',
      async () => 'disabled'
    );
    
    expect(result).toBe('enabled');
    
    const result2 = await withFeature(
      'non-existent',
      async () => 'enabled',
      async () => 'disabled'
    );
    
    expect(result2).toBe('disabled');
  });
  
  it('should get feature configuration', async () => {
    const { getFeatureConfig } = await import('../hooks/command-hooks');
    
    await featureManager.configure('advanced-memory', {
      enabled: true,
      settings: {
        backend: 'sqlite',
        cacheSize: 100
      }
    });
    
    expect(getFeatureConfig('advanced-memory', 'backend')).toBe('sqlite');
    expect(getFeatureConfig('advanced-memory', 'cacheSize')).toBe(100);
    expect(getFeatureConfig('advanced-memory')).toEqual({
      backend: 'sqlite',
      cacheSize: 100
    });
  });
});