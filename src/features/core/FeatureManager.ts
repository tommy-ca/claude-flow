/**
 * Feature manager implementation
 */

import { EventEmitter } from 'events';
import {
  Feature,
  FeatureConfig,
  FeatureStatus,
  FeatureHealth,
  FeatureManager,
  FeatureEvent,
  FeatureEventData,
  ListFeaturesOptions,
  FeatureError,
  FeatureConflictError,
  FeatureDependencyError
} from '../types';
import { featureRegistry } from './FeatureRegistry';
import { ConfigManager } from '../../config/config-manager';

export class DefaultFeatureManager extends EventEmitter implements FeatureManager {
  private featureConfigs: Map<string, FeatureConfig> = new Map();
  private featureStatuses: Map<string, FeatureStatus> = new Map();
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    super();
    this.configManager = configManager;
    this.loadFeatureConfigs();
  }

  async register(feature: Feature): Promise<void> {
    try {
      // Register in registry
      featureRegistry.register(feature);
      
      // Set initial status
      this.featureStatuses.set(feature.id, FeatureStatus.NOT_INITIALIZED);
      
      // Load or create config
      const config = this.loadFeatureConfig(feature.id) || {
        enabled: feature.defaultEnabled ?? false,
        settings: {}
      };
      this.featureConfigs.set(feature.id, config);
      
      // Initialize if enabled
      if (config.enabled) {
        await this.initialize(feature);
      }
      
      this.emitEvent({
        featureId: feature.id,
        event: FeatureEvent.INITIALIZED,
        timestamp: new Date()
      });
    } catch (error) {
      throw new FeatureError(
        `Failed to register feature: ${error.message}`,
        feature.id,
        'REGISTRATION_FAILED'
      );
    }
  }

  async unregister(featureId: string): Promise<void> {
    const feature = featureRegistry.get(featureId);
    if (!feature) {
      throw new FeatureError(
        `Feature not found: ${featureId}`,
        featureId,
        'NOT_FOUND'
      );
    }
    
    // Cleanup if active
    const status = this.featureStatuses.get(featureId);
    if (status === FeatureStatus.ACTIVE) {
      await this.cleanup(feature);
    }
    
    // Remove from registry
    featureRegistry.unregister(featureId);
    
    // Clean up internal state
    this.featureConfigs.delete(featureId);
    this.featureStatuses.delete(featureId);
  }

  async enable(featureId: string): Promise<void> {
    const feature = featureRegistry.get(featureId);
    if (!feature) {
      throw new FeatureError(
        `Feature not found: ${featureId}`,
        featureId,
        'NOT_FOUND'
      );
    }
    
    // Check dependencies
    await this.checkDependencies(feature);
    
    // Check conflicts
    await this.checkConflicts(feature);
    
    // Update config
    const config = this.featureConfigs.get(featureId) || { enabled: false };
    config.enabled = true;
    this.featureConfigs.set(featureId, config);
    this.saveFeatureConfig(featureId, config);
    
    // Initialize and activate
    const status = this.featureStatuses.get(featureId);
    if (status === FeatureStatus.NOT_INITIALIZED) {
      await this.initialize(feature);
    }
    
    if (this.featureStatuses.get(featureId) !== FeatureStatus.ACTIVE) {
      await this.activate(feature);
    }
    
    this.emitEvent({
      featureId,
      event: FeatureEvent.ACTIVATED,
      timestamp: new Date()
    });
  }

  async disable(featureId: string): Promise<void> {
    const feature = featureRegistry.get(featureId);
    if (!feature) {
      throw new FeatureError(
        `Feature not found: ${featureId}`,
        featureId,
        'NOT_FOUND'
      );
    }
    
    // Check if other features depend on this
    await this.checkDependents(feature);
    
    // Update config
    const config = this.featureConfigs.get(featureId) || { enabled: true };
    config.enabled = false;
    this.featureConfigs.set(featureId, config);
    this.saveFeatureConfig(featureId, config);
    
    // Deactivate if active
    if (this.featureStatuses.get(featureId) === FeatureStatus.ACTIVE) {
      await this.deactivate(feature);
    }
    
    this.emitEvent({
      featureId,
      event: FeatureEvent.DEACTIVATED,
      timestamp: new Date()
    });
  }

  async toggle(featureId: string): Promise<void> {
    const config = this.featureConfigs.get(featureId);
    if (!config) {
      throw new FeatureError(
        `Feature not found: ${featureId}`,
        featureId,
        'NOT_FOUND'
      );
    }
    
    if (config.enabled) {
      await this.disable(featureId);
    } else {
      await this.enable(featureId);
    }
  }

  async configure(featureId: string, config: Partial<FeatureConfig>): Promise<void> {
    const feature = featureRegistry.get(featureId);
    if (!feature) {
      throw new FeatureError(
        `Feature not found: ${featureId}`,
        featureId,
        'NOT_FOUND'
      );
    }
    
    const currentConfig = this.featureConfigs.get(featureId) || { enabled: false };
    const newConfig = { ...currentConfig, ...config };
    
    this.featureConfigs.set(featureId, newConfig);
    this.saveFeatureConfig(featureId, newConfig);
    
    this.emitEvent({
      featureId,
      event: FeatureEvent.CONFIG_CHANGED,
      timestamp: new Date(),
      data: { oldConfig: currentConfig, newConfig }
    });
  }

  getConfig(featureId: string): FeatureConfig | undefined {
    return this.featureConfigs.get(featureId);
  }

  getStatus(featureId: string): FeatureStatus {
    return this.featureStatuses.get(featureId) || FeatureStatus.NOT_INITIALIZED;
  }

  async getHealth(featureId: string): Promise<FeatureHealth | undefined> {
    const feature = featureRegistry.get(featureId);
    if (!feature || !feature.healthCheck) {
      return undefined;
    }
    
    try {
      return await feature.healthCheck();
    } catch (error) {
      return {
        healthy: false,
        status: FeatureStatus.ERROR,
        message: error.message,
        lastChecked: new Date()
      };
    }
  }

  isEnabled(featureId: string): boolean {
    const config = this.featureConfigs.get(featureId);
    return config?.enabled ?? false;
  }

  async isHealthy(featureId: string): Promise<boolean> {
    const health = await this.getHealth(featureId);
    return health?.healthy ?? false;
  }

  listFeatures(options?: ListFeaturesOptions): Feature[] {
    let features = featureRegistry.getAll();
    
    if (options) {
      if (options.category) {
        features = features.filter(f => f.category === options.category);
      }
      
      if (options.enabled !== undefined) {
        features = features.filter(f => this.isEnabled(f.id) === options.enabled);
      }
      
      if (options.experimental !== undefined) {
        features = features.filter(f => (f.experimental ?? false) === options.experimental);
      }
    }
    
    return features;
  }

  private async initialize(feature: Feature): Promise<void> {
    try {
      this.featureStatuses.set(feature.id, FeatureStatus.INITIALIZING);
      
      if (feature.initialize) {
        await feature.initialize();
      }
      
      this.featureStatuses.set(feature.id, FeatureStatus.INACTIVE);
    } catch (error) {
      this.featureStatuses.set(feature.id, FeatureStatus.ERROR);
      throw new FeatureError(
        `Failed to initialize feature: ${error.message}`,
        feature.id,
        'INITIALIZATION_FAILED'
      );
    }
  }

  private async activate(feature: Feature): Promise<void> {
    try {
      if (feature.activate) {
        await feature.activate();
      }
      
      this.featureStatuses.set(feature.id, FeatureStatus.ACTIVE);
    } catch (error) {
      this.featureStatuses.set(feature.id, FeatureStatus.ERROR);
      throw new FeatureError(
        `Failed to activate feature: ${error.message}`,
        feature.id,
        'ACTIVATION_FAILED'
      );
    }
  }

  private async deactivate(feature: Feature): Promise<void> {
    try {
      if (feature.deactivate) {
        await feature.deactivate();
      }
      
      this.featureStatuses.set(feature.id, FeatureStatus.INACTIVE);
    } catch (error) {
      this.featureStatuses.set(feature.id, FeatureStatus.ERROR);
      throw new FeatureError(
        `Failed to deactivate feature: ${error.message}`,
        feature.id,
        'DEACTIVATION_FAILED'
      );
    }
  }

  private async cleanup(feature: Feature): Promise<void> {
    try {
      if (feature.cleanup) {
        await feature.cleanup();
      }
      
      this.featureStatuses.set(feature.id, FeatureStatus.NOT_INITIALIZED);
    } catch (error) {
      throw new FeatureError(
        `Failed to cleanup feature: ${error.message}`,
        feature.id,
        'CLEANUP_FAILED'
      );
    }
  }

  private async checkDependencies(feature: Feature): Promise<void> {
    if (!feature.dependencies) return;
    
    for (const depId of feature.dependencies) {
      const dep = featureRegistry.get(depId);
      if (!dep) {
        throw new FeatureDependencyError(feature.id, depId);
      }
      
      if (!this.isEnabled(depId)) {
        throw new FeatureDependencyError(
          feature.id,
          `${depId} (not enabled)`
        );
      }
    }
  }

  private async checkConflicts(feature: Feature): Promise<void> {
    if (!feature.conflicts) return;
    
    for (const conflictId of feature.conflicts) {
      if (this.isEnabled(conflictId)) {
        throw new FeatureConflictError(feature.id, conflictId);
      }
    }
  }

  private async checkDependents(feature: Feature): Promise<void> {
    const allFeatures = featureRegistry.getAll();
    
    for (const otherFeature of allFeatures) {
      if (otherFeature.dependencies?.includes(feature.id) && this.isEnabled(otherFeature.id)) {
        throw new FeatureError(
          `Cannot disable ${feature.id}: ${otherFeature.id} depends on it`,
          feature.id,
          'HAS_DEPENDENTS'
        );
      }
    }
  }

  private loadFeatureConfigs(): void {
    const features = this.configManager.get('features') || {};
    
    for (const [featureId, config] of Object.entries(features)) {
      if (typeof config === 'object' && config !== null) {
        this.featureConfigs.set(featureId, config as FeatureConfig);
      }
    }
  }

  private loadFeatureConfig(featureId: string): FeatureConfig | undefined {
    const features = this.configManager.get('features') || {};
    return features[featureId];
  }

  private saveFeatureConfig(featureId: string, config: FeatureConfig): void {
    const features = this.configManager.get('features') || {};
    features[featureId] = config;
    this.configManager.set('features', features);
    this.configManager.save();
  }

  private emitEvent(eventData: FeatureEventData): void {
    this.emit(eventData.event, eventData);
    this.emit('feature:event', eventData);
  }
}

// Export singleton instance
let featureManagerInstance: DefaultFeatureManager | null = null;

export function getFeatureManager(configManager: ConfigManager): DefaultFeatureManager {
  if (!featureManagerInstance) {
    featureManagerInstance = new DefaultFeatureManager(configManager);
  }
  return featureManagerInstance;
}