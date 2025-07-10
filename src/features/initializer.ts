/**
 * Feature system initializer
 */

import { ConfigManager } from '../config/config-manager';
import { getFeatureManager } from './core/FeatureManager';
import { registerBuiltInFeatures } from './built-in';

let initialized = false;

/**
 * Initialize the feature system
 */
export async function initializeFeatureSystem(configManager?: ConfigManager): Promise<void> {
  if (initialized) {
    return;
  }
  
  try {
    const config = configManager || new ConfigManager();
    const featureManager = getFeatureManager(config);
    
    // Register built-in features
    await registerBuiltInFeatures(featureManager);
    
    // Log initialization
    console.debug('Feature system initialized successfully');
    
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize feature system:', error.message);
    throw error;
  }
}

/**
 * Check if feature system is initialized
 */
export function isFeatureSystemInitialized(): boolean {
  return initialized;
}

/**
 * Reset feature system (mainly for testing)
 */
export function resetFeatureSystem(): void {
  initialized = false;
}