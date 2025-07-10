/**
 * Feature system hooks for CLI commands
 */

import { getFeatureManager } from '../core/FeatureManager';
import { ConfigManager } from '../../config/config-manager';

/**
 * Check if a feature is enabled before executing a command
 */
export function requireFeature(featureId: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const configManager = new ConfigManager();
      const featureManager = getFeatureManager(configManager);
      
      if (!featureManager.isEnabled(featureId)) {
        throw new Error(`Feature '${featureId}' is required but not enabled. Enable it with: claude-flow features enable ${featureId}`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Add feature flags to command options
 */
export function addFeatureFlags(flags: any): any {
  return {
    ...flags,
    'no-feature': {
      description: 'Disable feature checks for this command',
      type: 'boolean',
      default: false
    },
    'feature': {
      description: 'Enable specific features for this command',
      type: 'string',
      multiple: true
    }
  };
}

/**
 * Check feature health before command execution
 */
export async function checkFeatureHealth(featureId: string): Promise<boolean> {
  const configManager = new ConfigManager();
  const featureManager = getFeatureManager(configManager);
  
  if (!featureManager.isEnabled(featureId)) {
    return false;
  }
  
  const health = await featureManager.getHealth(featureId);
  return health?.healthy ?? false;
}

/**
 * Get feature-specific configuration for a command
 */
export function getFeatureConfig(featureId: string, key?: string): any {
  const configManager = new ConfigManager();
  const featureManager = getFeatureManager(configManager);
  
  const config = featureManager.getConfig(featureId);
  if (!config) {
    return undefined;
  }
  
  if (key) {
    return config.settings?.[key];
  }
  
  return config.settings;
}

/**
 * Check if any of the required features are enabled
 */
export function hasAnyFeature(...featureIds: string[]): boolean {
  const configManager = new ConfigManager();
  const featureManager = getFeatureManager(configManager);
  
  return featureIds.some(id => featureManager.isEnabled(id));
}

/**
 * Check if all required features are enabled
 */
export function hasAllFeatures(...featureIds: string[]): boolean {
  const configManager = new ConfigManager();
  const featureManager = getFeatureManager(configManager);
  
  return featureIds.every(id => featureManager.isEnabled(id));
}

/**
 * Execute code conditionally based on feature state
 */
export async function withFeature<T>(
  featureId: string,
  enabledCallback: () => Promise<T>,
  disabledCallback?: () => Promise<T>
): Promise<T | undefined> {
  const configManager = new ConfigManager();
  const featureManager = getFeatureManager(configManager);
  
  if (featureManager.isEnabled(featureId)) {
    return enabledCallback();
  } else if (disabledCallback) {
    return disabledCallback();
  }
  
  return undefined;
}

/**
 * Log feature usage for analytics
 */
export function logFeatureUsage(featureId: string, operation: string): void {
  const configManager = new ConfigManager();
  const featureManager = getFeatureManager(configManager);
  
  if (featureManager.isEnabled('performance-monitoring')) {
    // Log to performance monitoring system
    console.debug(`Feature usage: ${featureId} - ${operation}`);
  }
}

/**
 * Create a feature-aware command wrapper
 */
export function featureAwareCommand(
  handler: Function,
  requiredFeatures?: string[],
  optionalFeatures?: string[]
) {
  return async function (args: any, flags: any) {
    const configManager = new ConfigManager();
    const featureManager = getFeatureManager(configManager);
    
    // Check if feature system is bypassed
    if (flags['no-feature']) {
      return handler(args, flags);
    }
    
    // Check required features
    if (requiredFeatures) {
      for (const featureId of requiredFeatures) {
        if (!featureManager.isEnabled(featureId)) {
          throw new Error(
            `This command requires the '${featureId}' feature to be enabled.\n` +
            `Enable it with: claude-flow features enable ${featureId}`
          );
        }
      }
    }
    
    // Enable temporary features from flags
    const temporaryFeatures: string[] = [];
    if (flags.feature) {
      const features = Array.isArray(flags.feature) ? flags.feature : [flags.feature];
      for (const featureId of features) {
        if (!featureManager.isEnabled(featureId)) {
          await featureManager.enable(featureId);
          temporaryFeatures.push(featureId);
        }
      }
    }
    
    try {
      // Add feature context to flags
      flags._features = {
        required: requiredFeatures || [],
        optional: optionalFeatures || [],
        enabled: (optionalFeatures || []).filter(id => featureManager.isEnabled(id)),
        temporary: temporaryFeatures
      };
      
      // Execute command
      return await handler(args, flags);
    } finally {
      // Disable temporary features
      for (const featureId of temporaryFeatures) {
        await featureManager.disable(featureId);
      }
    }
  };
}