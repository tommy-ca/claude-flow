/**
 * Feature Tools for MCP
 * 
 * Creates and registers feature management tools for the MCP server
 */

import type { MCPTool } from '../utils/types.js';
import type { ILogger } from '../core/logger.js';
import { createFeatureTools } from '../features/adapters/McpFeatureAdapter.js';
import { featureRegistry } from '../features/core/FeatureRegistry.js';

/**
 * Create feature management tools for MCP
 * 
 * These tools allow MCP clients to manage features transparently
 * through the MCP protocol.
 */
export function createMcpFeatureTools(
  logger: ILogger,
  featureManager?: any // IFeatureManager instance if available
): MCPTool[] {
  logger.info('Creating MCP feature tools');
  
  try {
    // Create feature tools using the adapter
    const tools = createFeatureTools(
      featureRegistry,
      featureManager,
      logger
    );
    
    logger.info('Created MCP feature tools', { count: tools.length });
    return tools;
  } catch (error) {
    logger.error('Failed to create MCP feature tools', { error });
    return [];
  }
}

/**
 * Get feature tool metadata for capability discovery
 */
export function getFeatureToolCapabilities(): Array<{
  name: string;
  category: string;
  description: string;
  experimental: boolean;
}> {
  return [
    {
      name: 'features/list',
      category: 'feature-management',
      description: 'List all available features with filtering options',
      experimental: false,
    },
    {
      name: 'features/enable',
      category: 'feature-management',
      description: 'Enable a feature with dependency checking',
      experimental: false,
    },
    {
      name: 'features/disable',
      category: 'feature-management',
      description: 'Disable a feature with dependent feature checking',
      experimental: false,
    },
    {
      name: 'features/config',
      category: 'feature-management',
      description: 'Configure a feature with custom settings',
      experimental: false,
    },
    {
      name: 'features/status',
      category: 'feature-management',
      description: 'Get detailed status and dependencies of a feature',
      experimental: false,
    },
  ];
}