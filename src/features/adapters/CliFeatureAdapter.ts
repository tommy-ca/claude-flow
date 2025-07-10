/**
 * CLI Feature Adapter - Integrates feature system with CLI commands
 */

import { Feature, FeatureCategory } from '../types';
import { getFeatureManager } from '../core/FeatureManager';
import { ConfigManager } from '../../config/config-manager';
import { formatters } from '../../utils/formatters';

export class CliFeatureAdapter {
  private featureManager;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.featureManager = getFeatureManager(configManager);
  }

  /**
   * List all available features
   */
  async listFeatures(args: string[], flags: any): Promise<void> {
    const { category, enabled, experimental, json, verbose } = flags;
    
    const features = this.featureManager.listFeatures({
      category: category as FeatureCategory,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      experimental: experimental === 'true' ? true : experimental === 'false' ? false : undefined
    });

    if (json) {
      console.log(JSON.stringify(features, null, 2));
      return;
    }

    if (features.length === 0) {
      console.log('No features found matching the criteria.');
      return;
    }

    console.log('\n🎯 Available Features:');
    console.log('━'.repeat(80));

    // Group by category
    const grouped = features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, Feature[]>);

    for (const [category, categoryFeatures] of Object.entries(grouped)) {
      console.log(`\n📁 ${formatters.capitalize(category)}:`);
      
      for (const feature of categoryFeatures) {
        const status = this.featureManager.getStatus(feature.id);
        const isEnabled = this.featureManager.isEnabled(feature.id);
        const config = this.featureManager.getConfig(feature.id);
        
        const statusIcon = isEnabled ? '✅' : '❌';
        const experimentalTag = feature.experimental ? ' 🧪' : '';
        
        console.log(`  ${statusIcon} ${feature.name}${experimentalTag} (${feature.id})`);
        console.log(`     ${feature.description}`);
        
        if (verbose) {
          console.log(`     Version: ${feature.version}`);
          console.log(`     Status: ${status}`);
          
          if (feature.dependencies && feature.dependencies.length > 0) {
            console.log(`     Dependencies: ${feature.dependencies.join(', ')}`);
          }
          
          if (feature.conflicts && feature.conflicts.length > 0) {
            console.log(`     Conflicts: ${feature.conflicts.join(', ')}`);
          }
          
          if (config?.settings && Object.keys(config.settings).length > 0) {
            console.log(`     Settings: ${JSON.stringify(config.settings)}`);
          }
        }
      }
    }
    
    console.log('\n' + '━'.repeat(80));
    console.log(`Total: ${features.length} features`);
    
    if (!verbose) {
      console.log('\nTip: Use --verbose for more details');
    }
  }

  /**
   * Enable a feature
   */
  async enableFeature(args: string[], flags: any): Promise<void> {
    const featureId = args[0];
    
    if (!featureId) {
      throw new Error('Feature ID is required');
    }

    try {
      await this.featureManager.enable(featureId);
      console.log(`✅ Feature '${featureId}' has been enabled`);
      
      // Show any important info about the feature
      const feature = this.featureManager.listFeatures().find(f => f.id === featureId);
      if (feature) {
        if (feature.experimental) {
          console.log('⚠️  This is an experimental feature. Use with caution.');
        }
        
        if (feature.dependencies && feature.dependencies.length > 0) {
          console.log(`📦 Dependencies: ${feature.dependencies.join(', ')}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to enable feature '${featureId}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Disable a feature
   */
  async disableFeature(args: string[], flags: any): Promise<void> {
    const featureId = args[0];
    
    if (!featureId) {
      throw new Error('Feature ID is required');
    }

    try {
      await this.featureManager.disable(featureId);
      console.log(`✅ Feature '${featureId}' has been disabled`);
    } catch (error) {
      console.error(`❌ Failed to disable feature '${featureId}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Configure a feature
   */
  async configureFeature(args: string[], flags: any): Promise<void> {
    const featureId = args[0];
    const { set, get, reset, json } = flags;
    
    if (!featureId) {
      throw new Error('Feature ID is required');
    }

    const config = this.featureManager.getConfig(featureId);
    if (!config) {
      throw new Error(`Feature '${featureId}' not found`);
    }

    // Get configuration
    if (get || (!set && !reset)) {
      if (json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(`\n⚙️  Configuration for '${featureId}':`);
        console.log('━'.repeat(50));
        console.log(`Enabled: ${config.enabled ? '✅' : '❌'}`);
        
        if (config.settings && Object.keys(config.settings).length > 0) {
          console.log('\nSettings:');
          for (const [key, value] of Object.entries(config.settings)) {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
          }
        } else {
          console.log('\nNo custom settings configured.');
        }
        
        if (config.overrides && Object.keys(config.overrides).length > 0) {
          console.log('\nOverrides:');
          for (const [key, value] of Object.entries(config.overrides)) {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
          }
        }
      }
      return;
    }

    // Set configuration
    if (set) {
      const [key, ...valueParts] = set.split('=');
      const value = valueParts.join('=');
      
      if (!key || !value) {
        throw new Error('Invalid configuration format. Use: --set key=value');
      }

      const settings = config.settings || {};
      
      // Parse value
      let parsedValue: any = value;
      try {
        // Try to parse as JSON first
        parsedValue = JSON.parse(value);
      } catch {
        // If not JSON, treat as string
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = Number(value);
      }

      settings[key] = parsedValue;
      
      await this.featureManager.configure(featureId, {
        ...config,
        settings
      });

      console.log(`✅ Set ${key} = ${JSON.stringify(parsedValue)} for feature '${featureId}'`);
      return;
    }

    // Reset configuration
    if (reset) {
      await this.featureManager.configure(featureId, {
        enabled: config.enabled,
        settings: {},
        overrides: {}
      });
      
      console.log(`✅ Reset configuration for feature '${featureId}'`);
    }
  }

  /**
   * Show feature status
   */
  async showFeatureStatus(args: string[], flags: any): Promise<void> {
    const featureId = args[0];
    const { json, health } = flags;
    
    if (featureId) {
      // Show specific feature status
      const feature = this.featureManager.listFeatures().find(f => f.id === featureId);
      if (!feature) {
        throw new Error(`Feature '${featureId}' not found`);
      }

      const status = this.featureManager.getStatus(featureId);
      const isEnabled = this.featureManager.isEnabled(featureId);
      const config = this.featureManager.getConfig(featureId);
      
      const statusData: any = {
        id: feature.id,
        name: feature.name,
        enabled: isEnabled,
        status,
        version: feature.version,
        category: feature.category,
        experimental: feature.experimental || false
      };

      if (health) {
        const healthStatus = await this.featureManager.getHealth(featureId);
        if (healthStatus) {
          statusData.health = healthStatus;
        }
      }

      if (json) {
        console.log(JSON.stringify(statusData, null, 2));
      } else {
        console.log(`\n📊 Feature Status: ${feature.name}`);
        console.log('━'.repeat(50));
        console.log(`ID: ${feature.id}`);
        console.log(`Enabled: ${isEnabled ? '✅' : '❌'}`);
        console.log(`Status: ${this.getStatusIcon(status)} ${status}`);
        console.log(`Version: ${feature.version}`);
        console.log(`Category: ${feature.category}`);
        
        if (feature.experimental) {
          console.log(`Experimental: 🧪 Yes`);
        }

        if (health && statusData.health) {
          console.log(`\nHealth Check:`);
          console.log(`  Status: ${statusData.health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          if (statusData.health.message) {
            console.log(`  Message: ${statusData.health.message}`);
          }
          console.log(`  Last Checked: ${statusData.health.lastChecked}`);
        }
      }
    } else {
      // Show all features status summary
      const features = this.featureManager.listFeatures();
      const enabledCount = features.filter(f => this.featureManager.isEnabled(f.id)).length;
      const experimentalCount = features.filter(f => f.experimental).length;
      
      if (json) {
        const summary = {
          total: features.length,
          enabled: enabledCount,
          disabled: features.length - enabledCount,
          experimental: experimentalCount
        };
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log('\n📊 Feature System Status');
        console.log('━'.repeat(50));
        console.log(`Total Features: ${features.length}`);
        console.log(`Enabled: ${enabledCount}`);
        console.log(`Disabled: ${features.length - enabledCount}`);
        console.log(`Experimental: ${experimentalCount}`);
        
        console.log('\nUse "claude-flow features status <feature-id>" for detailed status');
      }
    }
  }

  /**
   * Toggle a feature
   */
  async toggleFeature(args: string[], flags: any): Promise<void> {
    const featureId = args[0];
    
    if (!featureId) {
      throw new Error('Feature ID is required');
    }

    try {
      const wasEnabled = this.featureManager.isEnabled(featureId);
      await this.featureManager.toggle(featureId);
      const isEnabled = this.featureManager.isEnabled(featureId);
      
      console.log(`✅ Feature '${featureId}' has been ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`❌ Failed to toggle feature '${featureId}': ${error.message}`);
      throw error;
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return '🟢';
      case 'inactive': return '🟡';
      case 'error': return '🔴';
      case 'initializing': return '🔄';
      case 'not_initialized': return '⚪';
      case 'disabled': return '⚫';
      default: return '❓';
    }
  }
}

// Export factory function
export function createCliFeatureAdapter(configManager: ConfigManager): CliFeatureAdapter {
  return new CliFeatureAdapter(configManager);
}