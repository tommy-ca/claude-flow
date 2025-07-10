import {
  IFeatureRegistry,
  IFeature,
  FeatureMetadata,
  FeatureConstructor
} from '../types/feature-types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Feature Registry implementation
 * Discovers and loads features from the filesystem
 */
export class FeatureRegistry implements IFeatureRegistry {
  private featureCache: Map<string, IFeature> = new Map();

  async discover(searchPath?: string): Promise<IFeature[]> {
    const features: IFeature[] = [];
    const basePath = searchPath || path.join(process.cwd(), 'features');

    try {
      const files = await fs.readdir(basePath);
      
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          try {
            const filePath = path.join(basePath, file);
            const feature = await this.loadFeatureFromFile(filePath);
            if (feature) {
              features.push(feature);
            }
          } catch (error) {
            // Log error but continue discovering other features
            console.error(`Failed to load feature from ${file}:`, error);
          }
        }
      }
    } catch (error) {
      // Return empty array if directory doesn't exist
      console.error(`Failed to discover features in ${basePath}:`, error);
    }

    return features;
  }

  async load(featureId: string): Promise<IFeature> {
    // Check cache first
    if (this.featureCache.has(featureId)) {
      return this.featureCache.get(featureId)!;
    }

    try {
      // Try to load as a module
      const module = await import(featureId);
      const FeatureClass = module.default || module[featureId];
      
      if (!FeatureClass) {
        throw new Error(`No default export or named export '${featureId}' found`);
      }

      const feature = new FeatureClass();
      
      if (this.validate(feature)) {
        this.featureCache.set(featureId, feature);
        return feature;
      } else {
        throw new Error(`Invalid feature structure`);
      }
    } catch (error) {
      throw new Error(`Failed to load feature: ${featureId}`, { cause: error });
    }
  }

  async scan(patterns?: string[]): Promise<FeatureMetadata[]> {
    const metadata: FeatureMetadata[] = [];
    const basePath = process.cwd();
    const searchPatterns = patterns || ['**/feature*.js', '**/feature*.ts'];

    try {
      // Simple pattern matching (in production, use a glob library)
      const files = await this.findFiles(basePath, searchPatterns);
      
      for (const file of files) {
        try {
          const packageJsonPath = path.join(path.dirname(file), 'package.json');
          const packageJson = await this.loadPackageJson(packageJsonPath);
          
          if (packageJson?.claudeFlow?.feature) {
            const featureMetadata: FeatureMetadata = {
              id: packageJson.claudeFlow.feature.id || packageJson.name,
              name: packageJson.claudeFlow.feature.name || packageJson.name,
              version: packageJson.version || '0.0.0',
              description: packageJson.claudeFlow.feature.description || packageJson.description,
              author: packageJson.author,
              dependencies: packageJson.claudeFlow.feature.dependencies,
              tags: packageJson.claudeFlow.feature.tags
            };
            metadata.push(featureMetadata);
          }
        } catch (error) {
          // Continue scanning even if one file fails
          console.error(`Failed to scan ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to scan for features:', error);
    }

    return metadata;
  }

  validate(feature: IFeature): boolean {
    // Check if feature has required properties
    if (!feature.metadata || typeof feature.metadata !== 'object') {
      return false;
    }

    // Check required metadata fields
    const { id, name, version } = feature.metadata;
    if (!id || !name || !version) {
      return false;
    }

    // Check required methods
    const requiredMethods = ['initialize', 'start', 'stop', 'destroy', 'getState', 'updateConfig'];
    for (const method of requiredMethods) {
      if (typeof (feature as any)[method] !== 'function') {
        return false;
      }
    }

    // Check required properties
    if (!('state' in feature) || !('config' in feature)) {
      return false;
    }

    return true;
  }

  private async loadFeatureFromFile(filePath: string): Promise<IFeature | null> {
    try {
      const module = await import(filePath);
      const FeatureClass = module.default;
      
      if (!FeatureClass) {
        return null;
      }

      const feature = new FeatureClass();
      
      if (this.validate(feature)) {
        return feature;
      }
    } catch (error) {
      console.error(`Failed to load feature from ${filePath}:`, error);
    }

    return null;
  }

  private async loadPackageJson(packageJsonPath: string): Promise<any> {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  private async findFiles(basePath: string, patterns: string[]): Promise<string[]> {
    const files: string[] = [];
    
    // Simple implementation - in production use a proper glob library
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(basePath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          // Recursively search subdirectories
          const subFiles = await this.findFiles(fullPath, patterns);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if file matches any pattern
          for (const pattern of patterns) {
            const simplePattern = pattern.replace('**/', '').replace('*', '');
            if (entry.name.includes(simplePattern)) {
              files.push(fullPath);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to search directory ${basePath}:`, error);
    }

    return files;
  }
}