/**
 * Feature registry implementation
 */

import { IFeature, FeatureCategory } from '../types/IFeature.js';
import { IFeatureMetadata, FeatureState } from '../types/index.js';

export interface FeatureRegistryInterface {
  register(feature: IFeature): void;
  unregister(featureId: string): void;
  get(featureId: string): IFeature | undefined;
  getAll(): IFeature[];
  getByCategory(category: FeatureCategory): IFeature[];
  isRegistered(featureId: string): boolean;
}

export class DefaultFeatureRegistry implements FeatureRegistryInterface {
  private features: Map<string, IFeature> = new Map();

  register(feature: IFeature): void {
    if (this.features.has(feature.id)) {
      throw new Error(`Feature with id '${feature.id}' is already registered`);
    }
    
    // Validate feature
    this.validateFeature(feature);
    
    this.features.set(feature.id, feature);
  }

  unregister(featureId: string): void {
    if (!this.features.has(featureId)) {
      throw new Error(`Feature with id '${featureId}' is not registered`);
    }
    
    this.features.delete(featureId);
  }

  get(featureId: string): IFeature | undefined {
    return this.features.get(featureId);
  }

  getAll(): IFeature[] {
    return Array.from(this.features.values());
  }

  getByCategory(category: FeatureCategory): IFeature[] {
    return Array.from(this.features.values())
      .filter(feature => feature.category === category);
  }

  isRegistered(featureId: string): boolean {
    return this.features.has(featureId);
  }

  private validateFeature(feature: IFeature): void {
    if (!feature.id || typeof feature.id !== 'string') {
      throw new Error('Feature must have a valid id');
    }
    
    if (!feature.name || typeof feature.name !== 'string') {
      throw new Error('Feature must have a valid name');
    }
    
    if (!feature.description || typeof feature.description !== 'string') {
      throw new Error('Feature must have a valid description');
    }
    
    if (!feature.version || typeof feature.version !== 'string') {
      throw new Error('Feature must have a valid version');
    }
    
    if (!feature.category) {
      throw new Error('Feature must have a valid category');
    }
    
    // Validate dependencies
    if (feature.dependencies) {
      if (!Array.isArray(feature.dependencies)) {
        throw new Error('Feature dependencies must be an array');
      }
      
      for (const dep of feature.dependencies) {
        if (typeof dep !== 'string') {
          throw new Error('Feature dependency must be a string');
        }
      }
    }
    
    // Validate conflicts
    if (feature.conflicts) {
      if (!Array.isArray(feature.conflicts)) {
        throw new Error('Feature conflicts must be an array');
      }
      
      for (const conflict of feature.conflicts) {
        if (typeof conflict !== 'string') {
          throw new Error('Feature conflict must be a string');
        }
      }
    }
  }
}

// Export singleton instance
export const featureRegistry = new DefaultFeatureRegistry();