/**
 * Feature-aware memory command example
 * This demonstrates how commands can integrate with the feature system
 */

import { withFeature, getFeatureConfig, logFeatureUsage, hasFeature } from '../../features/hooks/command-hooks.js';
import { memoryCommand as originalMemoryCommand } from './memory.js';

// Wrap the original memory command with feature awareness
export async function featureAwareMemoryCommand(args, flags) {
  const subcommand = args[0];
  
  // Log feature usage
  logFeatureUsage('advanced-memory', `memory-${subcommand}`);
  
  // Check if advanced memory feature is enabled
  const useAdvancedMemory = hasFeature('advanced-memory');
  
  if (useAdvancedMemory) {
    console.log('✨ Using advanced memory features');
    
    // Get feature-specific configuration
    const config = getFeatureConfig('advanced-memory');
    if (config?.backend === 'sqlite') {
      console.log('📊 SQLite backend enabled');
    }
    if (config?.semanticSearch) {
      console.log('🔍 Semantic search enabled');
    }
  }
  
  // Execute with feature-specific behavior
  return withFeature(
    'advanced-memory',
    async () => {
      // Advanced memory implementation
      console.log('🚀 Advanced memory operations available');
      return originalMemoryCommand(args, flags);
    },
    async () => {
      // Fallback to basic memory
      console.log('📝 Using basic memory operations');
      return originalMemoryCommand(args, flags);
    }
  );
}

// Example of feature-specific subcommands
export async function semanticSearchCommand(args, flags) {
  return withFeature(
    'advanced-memory',
    async () => {
      const query = args.join(' ');
      console.log(`🔍 Performing semantic search for: "${query}"`);
      
      // Semantic search implementation would go here
      console.log('✅ Semantic search completed');
    },
    async () => {
      console.error('❌ Semantic search requires the advanced-memory feature');
      console.log('Enable it with: claude-flow features enable advanced-memory');
      process.exit(1);
    }
  );
}