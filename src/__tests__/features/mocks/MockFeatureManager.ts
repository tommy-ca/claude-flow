/**
 * Mock FeatureManager for testing
 * Provides a mock implementation of the FeatureManager
 */

import { Feature, FeatureMetadata } from '../../../features/types';

export class MockFeatureManager {
  private features: Map<string, Feature> = new Map();
  private activeFeatures: Set<string> = new Set();
  private activationOrder: string[] = [];
  private deactivationOrder: string[] = [];

  // Mock methods
  register = jest.fn().mockImplementation((feature: Feature) => {
    if (this.features.has(feature.id)) {
      throw new Error(`Feature ${feature.id} already registered`);
    }
    
    // Validate dependencies
    if (feature.dependencies) {
      for (const dep of feature.dependencies) {
        if (!this.features.has(dep)) {
          throw new Error(`Missing dependency: ${dep}`);
        }
      }
    }
    
    this.features.set(feature.id, feature);
  });

  activate = jest.fn().mockImplementation(async (featureId: string) => {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }
    
    if (this.activeFeatures.has(featureId)) {
      return; // Already active
    }
    
    // Activate dependencies first
    if (feature.dependencies) {
      for (const dep of feature.dependencies) {
        await this.activate(dep);
      }
    }
    
    try {
      if (feature.onBeforeActivate) {
        await feature.onBeforeActivate();
      }
      
      await feature.activate();
      this.activeFeatures.add(featureId);
      this.activationOrder.push(featureId);
      
      if (feature.onAfterActivate) {
        await feature.onAfterActivate();
      }
    } catch (error) {
      // Rollback on error
      if (feature.dependencies) {
        for (const dep of feature.dependencies) {
          if (!this.wasActiveBeforeOperation(dep)) {
            await this.deactivate(dep);
          }
        }
      }
      throw new Error(`Failed to activate feature ${featureId}: ${error.message}`);
    }
  });

  deactivate = jest.fn().mockImplementation(async (featureId: string) => {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }
    
    if (!this.activeFeatures.has(featureId)) {
      return; // Already inactive
    }
    
    // Deactivate dependent features first
    const dependents = this.getDependentFeatures(featureId);
    for (const dependent of dependents) {
      await this.deactivate(dependent);
    }
    
    if (feature.onBeforeDeactivate) {
      await feature.onBeforeDeactivate();
    }
    
    await feature.deactivate();
    this.activeFeatures.delete(featureId);
    this.deactivationOrder.push(featureId);
    
    if (feature.onAfterDeactivate) {
      await feature.onAfterDeactivate();
    }
  });

  configure = jest.fn().mockImplementation(async (featureId: string, config: any) => {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }
    
    if (feature.configSchema) {
      // Simple validation mock
      const result = this.validateConfigMock(config, feature.configSchema);
      if (!result.valid) {
        throw new Error('Invalid configuration');
      }
    }
    
    if (feature.configure) {
      await feature.configure(config);
    }
  });

  getFeature = jest.fn().mockImplementation((featureId: string) => {
    return this.features.get(featureId);
  });

  isActive = jest.fn().mockImplementation((featureId: string) => {
    return this.activeFeatures.has(featureId);
  });

  listFeatures = jest.fn().mockImplementation((filter?: { status?: 'active' | 'inactive' }) => {
    const features = Array.from(this.features.values());
    
    if (filter?.status === 'active') {
      return features.filter(f => this.activeFeatures.has(f.id));
    }
    
    if (filter?.status === 'inactive') {
      return features.filter(f => !this.activeFeatures.has(f.id));
    }
    
    return features;
  });

  getMetadata = jest.fn().mockImplementation((featureId: string): FeatureMetadata | undefined => {
    const feature = this.features.get(featureId);
    if (!feature) {
      return undefined;
    }
    
    return {
      id: feature.id,
      name: feature.name,
      version: feature.version,
      description: feature.description,
      isActive: this.activeFeatures.has(featureId),
      dependencies: feature.dependencies || [],
      dependents: this.getDependentFeatures(featureId),
    };
  });

  // Helper methods for testing
  getActivationOrder(): string[] {
    return [...this.activationOrder];
  }

  getDeactivationOrder(): string[] {
    return [...this.deactivationOrder];
  }

  reset(): void {
    this.features.clear();
    this.activeFeatures.clear();
    this.activationOrder = [];
    this.deactivationOrder = [];
    jest.clearAllMocks();
  }

  // Private helper methods
  private getDependentFeatures(featureId: string): string[] {
    const dependents: string[] = [];
    
    for (const [id, feature] of this.features) {
      if (feature.dependencies?.includes(featureId)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  private wasActiveBeforeOperation(featureId: string): boolean {
    // This is a simplified check for testing
    return this.activationOrder.includes(featureId) && 
           !this.deactivationOrder.includes(featureId);
  }

  private validateConfigMock(config: any, schema: any): { valid: boolean; errors: any[] } {
    // Very simple validation for testing
    const errors: any[] = [];
    
    if (schema.required) {
      for (const required of schema.required) {
        if (!config.settings || !(required in config.settings)) {
          errors.push({
            path: `/settings/${required}`,
            message: `Property ${required} is required`,
          });
        }
      }
    }
    
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const value = config.settings?.[key];
        
        if (value !== undefined && propSchema.type) {
          if (propSchema.type === 'string' && typeof value !== 'string') {
            errors.push({
              path: `/settings/${key}`,
              message: `Property ${key} must be a string`,
            });
          }
          
          if (propSchema.minLength && value.length < propSchema.minLength) {
            errors.push({
              path: `/settings/${key}`,
              message: `Property ${key} must have minLength ${propSchema.minLength}`,
            });
          }
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// Export a factory function for creating instances
export function createMockFeatureManager(): MockFeatureManager {
  return new MockFeatureManager();
}