import {
  IConfigurationManager,
  FeatureConfig,
  FeaturePriority
} from '../types/feature-types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Configuration Manager implementation
 * Manages feature configurations with persistence support
 */
export class ConfigurationManager implements IConfigurationManager {
  private configs: Map<string, FeatureConfig> = new Map();
  private defaultConfigPath: string = path.join(process.cwd(), '.claude', 'features.config.json');

  async load(configPath?: string): Promise<Record<string, FeatureConfig>> {
    const filePath = configPath || this.defaultConfigPath;
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const configs = JSON.parse(content);
      
      // Validate and store configs
      Object.entries(configs).forEach(([featureId, config]) => {
        if (this.validate(featureId, config as FeatureConfig)) {
          this.configs.set(featureId, config as FeatureConfig);
        }
      });

      return Object.fromEntries(this.configs);
    } catch (error) {
      // Return empty object if file doesn't exist or is invalid
      console.error(`Failed to load configuration from ${filePath}:`, error);
      return {};
    }
  }

  async save(configs: Record<string, FeatureConfig>, configPath?: string): Promise<void> {
    const filePath = configPath || this.defaultConfigPath;
    
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Save configurations
      await fs.writeFile(filePath, JSON.stringify(configs, null, 2));
    } catch (error) {
      throw new Error(`Failed to save configuration to ${filePath}`, { cause: error });
    }
  }

  get(featureId: string): FeatureConfig | undefined {
    return this.configs.get(featureId);
  }

  set(featureId: string, config: FeatureConfig): void {
    if (this.validate(featureId, config)) {
      this.configs.set(featureId, config);
    } else {
      throw new Error(`Invalid configuration for feature ${featureId}`);
    }
  }

  update(featureId: string, updates: Partial<FeatureConfig>): void {
    const currentConfig = this.configs.get(featureId) || {
      enabled: false,
      priority: FeaturePriority.NORMAL
    };

    const newConfig: FeatureConfig = {
      ...currentConfig,
      ...updates
    };

    // Handle nested objects properly
    if (updates.settings !== undefined) {
      newConfig.settings = updates.settings;
    }

    if (updates.metadata !== undefined) {
      newConfig.metadata = updates.metadata;
    }

    this.set(featureId, newConfig);
  }

  validate(featureId: string, config: FeatureConfig): boolean {
    // Check required fields
    if (typeof config.enabled !== 'boolean') {
      return false;
    }

    // Check priority if provided
    if (config.priority !== undefined) {
      const validPriorities = Object.values(FeaturePriority);
      if (!validPriorities.includes(config.priority)) {
        return false;
      }
    }

    // Check settings if provided
    if (config.settings !== undefined && typeof config.settings !== 'object') {
      return false;
    }

    // Check metadata if provided
    if (config.metadata !== undefined && typeof config.metadata !== 'object') {
      return false;
    }

    return true;
  }
}