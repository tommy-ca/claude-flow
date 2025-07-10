/**
 * MCP Feature Adapter
 * 
 * Integrates the feature system with the MCP interface, providing
 * transparent feature management through MCP tools.
 */

import type { MCPTool, MCPContext } from '../../utils/types.js';
import type { ILogger } from '../../core/logger.js';
import type { DefaultFeatureRegistry } from '../core/FeatureRegistry.js';
import type { IFeature, IFeatureMetadata, FeatureCategory, FeatureState } from '../types/IFeature.js';
import type { IFeatureManager } from '../types/index.js';
import { MCPError } from '../../utils/errors.js';

export interface McpFeatureToolContext extends MCPContext {
  featureRegistry: DefaultFeatureRegistry;
  featureManager?: IFeatureManager;
}

/**
 * Creates MCP tools for feature management
 */
export function createFeatureTools(
  featureRegistry: DefaultFeatureRegistry,
  featureManager: IFeatureManager | undefined,
  logger: ILogger
): MCPTool[] {
  return [
    createFeatureListTool(featureRegistry, logger),
    createFeatureEnableTool(featureManager, logger),
    createFeatureDisableTool(featureManager, logger),
    createFeatureConfigTool(featureManager, logger),
    createFeatureStatusTool(featureRegistry, featureManager, logger),
  ];
}

/**
 * Lists all available features
 */
function createFeatureListTool(registry: DefaultFeatureRegistry, logger: ILogger): MCPTool {
  return {
    name: 'features/list',
    description: 'List all available features with their metadata and status',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by feature category',
          enum: ['core', 'agent', 'memory', 'coordination', 'integration', 'ui', 'utility', 'experimental', 'custom'],
        },
        enabled: {
          type: 'boolean',
          description: 'Filter by enabled status',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
      },
      required: [],
    },
    handler: async (input: any, context?: McpFeatureToolContext) => {
      try {
        const featureRegistry = context?.featureRegistry || registry;
        
        let features = featureRegistry.getAll();
        
        // Apply filters
        if (input.category) {
          features = features.filter(f => f.category === input.category);
        }
        
        if (input.enabled !== undefined) {
          features = features.filter(f => f.enabled === input.enabled);
        }
        
        if (input.tags && Array.isArray(input.tags)) {
          features = features.filter(f => 
            f.metadata?.tags?.some(tag => input.tags.includes(tag))
          );
        }
        
        return {
          success: true,
          features: features.map(feature => ({
            id: feature.id,
            name: feature.name,
            description: feature.description,
            category: feature.category,
            enabled: feature.enabled,
            version: feature.version,
            tags: feature.metadata?.tags || [],
            dependencies: feature.dependencies || [],
            experimental: feature.metadata?.experimental || false,
            minVersion: feature.metadata?.minVersion,
            maxVersion: feature.metadata?.maxVersion,
          })),
          total: features.length,
        };
      } catch (error) {
        logger.error('Failed to list features', { error });
        throw error;
      }
    },
  };
}

/**
 * Enables a feature
 */
function createFeatureEnableTool(manager: IFeatureManager | undefined, logger: ILogger): MCPTool {
  return {
    name: 'features/enable',
    description: 'Enable a feature by ID',
    inputSchema: {
      type: 'object',
      properties: {
        featureId: {
          type: 'string',
          description: 'The ID of the feature to enable',
        },
        force: {
          type: 'boolean',
          description: 'Force enable even with missing dependencies',
          default: false,
        },
      },
      required: ['featureId'],
    },
    handler: async (input: any, context?: McpFeatureToolContext) => {
      try {
        const featureManager = context?.featureManager || manager;
        if (!featureManager) {
          throw new MCPError('Feature manager not available');
        }

        const { featureId, force = false } = input;
        
        // Check if feature exists
        const feature = featureManager.get(featureId);
        if (!feature) {
          throw new MCPError(`Feature not found: ${featureId}`);
        }

        // Check if already enabled
        if (featureManager.isEnabled(featureId)) {
          return {
            success: true,
            featureId,
            status: 'already_enabled',
            message: `Feature '${featureId}' is already enabled`,
          };
        }

        // Check dependencies if not forcing
        if (!force && feature.dependencies && feature.dependencies.length > 0) {
          const missingDeps = feature.dependencies.filter(
            dep => !featureManager.isEnabled(dep)
          );
          
          if (missingDeps.length > 0) {
            return {
              success: false,
              error: 'Unsatisfied dependencies',
              dependencies: missingDeps,
            };
          }
        }

        // Enable the feature
        await featureManager.enable(featureId);
        
        return {
          success: true,
          featureId,
          status: 'enabled',
          message: `Feature '${featureId}' enabled successfully`,
        };
      } catch (error) {
        logger.error('Failed to enable feature', { error, input });
        throw error;
      }
    },
  };
}

/**
 * Disables a feature
 */
function createFeatureDisableTool(manager: IFeatureManager | undefined, logger: ILogger): MCPTool {
  return {
    name: 'features/disable',
    description: 'Disable a feature by ID',
    inputSchema: {
      type: 'object',
      properties: {
        featureId: {
          type: 'string',
          description: 'The ID of the feature to disable',
        },
        force: {
          type: 'boolean',
          description: 'Force disable even if other features depend on it',
          default: false,
        },
      },
      required: ['featureId'],
    },
    handler: async (input: any, context?: McpFeatureToolContext) => {
      try {
        const featureManager = context?.featureManager || manager;
        if (!featureManager) {
          throw new MCPError('Feature manager not available');
        }

        const { featureId, force = false } = input;
        
        // Check if feature exists
        const feature = featureManager.get(featureId);
        if (!feature) {
          throw new MCPError(`Feature not found: ${featureId}`);
        }

        // Check if already disabled
        if (!featureManager.isEnabled(featureId)) {
          return {
            success: true,
            featureId,
            status: 'already_disabled',
            message: `Feature '${featureId}' is already disabled`,
          };
        }

        // Check if other features depend on this one (if not forcing)
        if (!force) {
          const allFeatures = featureManager.getAll();
          const dependents: string[] = [];
          
          for (const [depId, depFeature] of allFeatures) {
            if (depFeature.dependencies?.includes(featureId) && featureManager.isEnabled(depId)) {
              dependents.push(depId);
            }
          }
          
          if (dependents.length > 0) {
            return {
              success: false,
              error: 'Other features depend on this feature',
              dependents,
            };
          }
        }

        // Disable the feature
        await featureManager.disable(featureId);
        
        return {
          success: true,
          featureId,
          status: 'disabled',
          message: `Feature '${featureId}' disabled successfully`,
        };
      } catch (error) {
        logger.error('Failed to disable feature', { error, input });
        throw error;
      }
    },
  };
}

/**
 * Configures a feature
 */
function createFeatureConfigTool(manager: IFeatureManager | undefined, logger: ILogger): MCPTool {
  return {
    name: 'features/config',
    description: 'Configure a feature',
    inputSchema: {
      type: 'object',
      properties: {
        featureId: {
          type: 'string',
          description: 'The ID of the feature to configure',
        },
        config: {
          type: 'object',
          description: 'Configuration to apply',
        },
      },
      required: ['featureId', 'config'],
    },
    handler: async (input: any, context?: McpFeatureToolContext) => {
      try {
        const featureManager = context?.featureManager || manager;
        if (!featureManager) {
          throw new MCPError('Feature manager not available');
        }

        const { featureId, config } = input;
        
        // Get current feature
        const feature = featureManager.get(featureId);
        if (!feature) {
          throw new MCPError(`Feature not found: ${featureId}`);
        }

        if (!featureManager.isEnabled(featureId)) {
          return {
            success: false,
            error: 'Feature must be enabled before configuring',
            featureId,
          };
        }

        // Update feature configuration
        if (feature.lifecycle?.onConfigChange) {
          await feature.lifecycle.onConfigChange(config, {});
        }
        
        return {
          success: true,
          featureId,
          config,
          message: `Feature '${featureId}' configured successfully`,
        };
      } catch (error) {
        logger.error('Failed to configure feature', { error, input });
        throw error;
      }
    },
  };
}

/**
 * Gets feature status
 */
function createFeatureStatusTool(
  registry: DefaultFeatureRegistry, 
  manager: IFeatureManager | undefined,
  logger: ILogger
): MCPTool {
  return {
    name: 'features/status',
    description: 'Get detailed status of a feature',
    inputSchema: {
      type: 'object',
      properties: {
        featureId: {
          type: 'string',
          description: 'The ID of the feature to check',
        },
        includeDependencies: {
          type: 'boolean',
          description: 'Include dependency information',
          default: true,
        },
      },
      required: ['featureId'],
    },
    handler: async (input: any, context?: McpFeatureToolContext) => {
      try {
        const featureRegistry = context?.featureRegistry || registry;
        const featureManager = context?.featureManager || manager;
        
        const { featureId, includeDependencies = true } = input;
        
        const feature = featureRegistry.get(featureId);
        if (!feature) {
          throw new MCPError(`Feature not found: ${featureId}`);
        }

        const state = featureManager?.getState(featureId) || FeatureState.UNINITIALIZED;
        const enabled = featureManager?.isEnabled(featureId) || false;
        
        const response: any = {
          success: true,
          feature: {
            id: feature.id,
            name: feature.name,
            description: feature.description,
            category: feature.category,
            enabled,
            state,
            version: feature.version,
            experimental: feature.metadata?.experimental || false,
            tags: feature.metadata?.tags || [],
          },
        };

        if (includeDependencies) {
          response.dependencies = {
            required: feature.dependencies || [],
            satisfied: [],
            missing: [],
          };
          
          // Check dependency status
          if (feature.dependencies && featureManager) {
            for (const dep of feature.dependencies) {
              if (featureManager.isEnabled(dep)) {
                response.dependencies.satisfied.push(dep);
              } else {
                response.dependencies.missing.push(dep);
              }
            }
          }
          
          // Find dependents
          const dependents: string[] = [];
          if (featureManager) {
            const allFeatures = featureManager.getAll();
            for (const [depId, depFeature] of allFeatures) {
              if (depFeature.dependencies?.includes(featureId)) {
                dependents.push(depId);
              }
            }
          }
          response.dependents = dependents;
        }

        return response;
      } catch (error) {
        logger.error('Failed to get feature status', { error, input });
        throw error;
      }
    },
  };
}

/**
 * MCP Feature Adapter class for advanced integration
 */
export class McpFeatureAdapter {
  private tools: MCPTool[];

  constructor(
    private featureRegistry: DefaultFeatureRegistry,
    private featureManager: IFeatureManager | undefined,
    private logger: ILogger
  ) {
    this.tools = createFeatureTools(featureRegistry, featureManager, logger);
  }

  /**
   * Get all feature tools
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Add feature metadata to MCP responses
   */
  enrichResponse(response: any, featureContext?: string[]): any {
    if (!featureContext || featureContext.length === 0) {
      return response;
    }

    const metadata: any = {
      features: {},
    };

    for (const featureId of featureContext) {
      try {
        const feature = this.featureRegistry.get(featureId);
        if (feature) {
          metadata.features[featureId] = {
            enabled: this.featureManager?.isEnabled(featureId) || false,
            version: feature.version,
            experimental: feature.metadata?.experimental || false,
          };
        }
      } catch (error) {
        this.logger.warn('Failed to get feature metadata', { featureId, error });
      }
    }

    return {
      ...response,
      _metadata: {
        ...response._metadata,
        ...metadata,
      },
    };
  }

  /**
   * Check if a tool requires specific features
   */
  async checkToolFeatures(toolName: string): Promise<{
    allowed: boolean;
    requiredFeatures: string[];
    missingFeatures: string[];
  }> {
    // This would integrate with tool capability definitions
    const toolFeatureMap: Record<string, string[]> = {
      'swarm/advanced-orchestration': ['advanced-swarm', 'neural-patterns'],
      'memory/distributed': ['distributed-memory'],
      'ai/neural-training': ['neural-networks', 'gpu-acceleration'],
    };

    const requiredFeatures = toolFeatureMap[toolName] || [];
    const missingFeatures: string[] = [];

    for (const featureId of requiredFeatures) {
      const feature = this.featureRegistry.get(featureId);
      if (!feature || (this.featureManager && !this.featureManager.isEnabled(featureId))) {
        missingFeatures.push(featureId);
      }
    }

    return {
      allowed: missingFeatures.length === 0,
      requiredFeatures,
      missingFeatures,
    };
  }

  /**
   * Handle feature discovery for MCP clients
   */
  async discoverFeatures(query?: {
    capabilities?: string[];
    tags?: string[];
    experimental?: boolean;
  }): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: FeatureCategory;
    tags: string[];
    experimental: boolean;
  }>> {
    const allFeatures = this.featureRegistry.getAll();
    
    let filteredFeatures = allFeatures;
    
    if (query) {
      filteredFeatures = allFeatures.filter(feature => {
        if (query.capabilities) {
          const hasCapability = query.capabilities.some(cap => 
            feature.metadata?.tags?.includes(cap) || feature.category === cap
          );
          if (!hasCapability) return false;
        }

        if (query.tags) {
          const hasTag = query.tags.some(tag => feature.metadata?.tags?.includes(tag));
          if (!hasTag) return false;
        }

        if (query.experimental !== undefined && 
            (feature.metadata?.experimental || false) !== query.experimental) {
          return false;
        }

        return true;
      });
    }

    return filteredFeatures.map(feature => ({
      id: feature.id,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      tags: feature.metadata?.tags || [],
      experimental: feature.metadata?.experimental || false,
    }));
  }
}