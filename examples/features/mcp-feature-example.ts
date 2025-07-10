/**
 * Example: Using MCP Feature Tools
 * 
 * This example demonstrates how to use the MCP feature tools
 * to manage features through the MCP protocol.
 */

import { MCPClient } from '../../src/mcp/client.js';
import { StdioTransport } from '../../src/mcp/transports/stdio.js';
import { createLogger } from '../../src/core/logger.js';

async function main() {
  // Create logger
  const logger = createLogger({
    level: 'info',
    format: 'pretty',
  });

  // Create MCP client
  const transport = new StdioTransport();
  const client = new MCPClient(
    { transport: 'stdio' },
    transport,
    logger
  );

  try {
    // Initialize client
    await client.initialize({
      clientInfo: {
        name: 'feature-example',
        version: '1.0.0',
      },
    });

    logger.info('MCP client initialized');

    // List all features
    logger.info('Listing all features...');
    const allFeatures = await client.callTool('features/list', {});
    logger.info(`Found ${allFeatures.total} features`, { 
      features: allFeatures.features.map(f => f.id) 
    });

    // List only experimental features
    logger.info('Listing experimental features...');
    const experimentalFeatures = await client.callTool('features/list', {
      category: 'experimental',
    });
    logger.info(`Found ${experimentalFeatures.total} experimental features`);

    // Get status of a specific feature
    const featureId = 'advanced-swarm';
    logger.info(`Getting status of feature: ${featureId}`);
    try {
      const status = await client.callTool('features/status', {
        featureId,
        includeDependencies: true,
      });
      
      logger.info('Feature status:', {
        id: status.feature.id,
        enabled: status.feature.enabled,
        state: status.feature.state,
        dependencies: status.dependencies,
      });
    } catch (error) {
      logger.warn(`Feature ${featureId} not found`);
    }

    // Enable a feature
    logger.info('Enabling neural-patterns feature...');
    try {
      const enableResult = await client.callTool('features/enable', {
        featureId: 'neural-patterns',
        force: false,
      });
      
      if (enableResult.success) {
        logger.info('Feature enabled successfully', { 
          message: enableResult.message 
        });
      } else {
        logger.warn('Failed to enable feature', { 
          error: enableResult.error,
          dependencies: enableResult.dependencies,
        });
      }
    } catch (error) {
      logger.error('Error enabling feature', { error });
    }

    // Configure a feature
    logger.info('Configuring neural-patterns feature...');
    try {
      const configResult = await client.callTool('features/config', {
        featureId: 'neural-patterns',
        config: {
          modelSize: 'medium',
          threshold: 0.75,
          enableCaching: true,
          maxCacheSize: 1000,
        },
      });
      
      if (configResult.success) {
        logger.info('Feature configured successfully', {
          config: configResult.config,
        });
      }
    } catch (error) {
      logger.error('Error configuring feature', { error });
    }

    // Disable a feature
    logger.info('Disabling a feature...');
    try {
      const disableResult = await client.callTool('features/disable', {
        featureId: 'experimental-feature',
        force: true, // Force disable even with dependents
      });
      
      if (disableResult.success) {
        logger.info('Feature disabled successfully');
      }
    } catch (error) {
      logger.warn('Error disabling feature', { error });
    }

    // Advanced: Filter features by tags
    logger.info('Finding AI-related features...');
    const aiFeatures = await client.callTool('features/list', {
      tags: ['ai', 'neural', 'ml'],
    });
    
    for (const feature of aiFeatures.features) {
      logger.info('AI Feature:', {
        id: feature.id,
        name: feature.name,
        tags: feature.tags,
        experimental: feature.experimental,
      });
    }

  } catch (error) {
    logger.error('Error in feature example', { error });
  } finally {
    // Cleanup
    await client.close();
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };