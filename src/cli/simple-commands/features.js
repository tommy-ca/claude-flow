/**
 * Feature management CLI commands
 */

import { ConfigManager } from '../../config/config-manager.js';
import { createCliFeatureAdapter } from '../../features/adapters/CliFeatureAdapter.js';

// Feature command handler
export async function featuresCommand(args, flags) {
  const subcommand = args[0];
  const subArgs = args.slice(1);
  
  // Initialize config manager
  const configManager = new ConfigManager();
  const adapter = createCliFeatureAdapter(configManager);
  
  try {
    switch (subcommand) {
      case 'list':
        await adapter.listFeatures(subArgs, flags);
        break;
        
      case 'enable':
        await adapter.enableFeature(subArgs, flags);
        break;
        
      case 'disable':
        await adapter.disableFeature(subArgs, flags);
        break;
        
      case 'toggle':
        await adapter.toggleFeature(subArgs, flags);
        break;
        
      case 'config':
      case 'configure':
        await adapter.configureFeature(subArgs, flags);
        break;
        
      case 'status':
        await adapter.showFeatureStatus(subArgs, flags);
        break;
        
      case 'help':
      default:
        showFeatureHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function showFeatureHelp() {
  console.log(`
🎯 Claude-Flow Feature Management

Feature flags allow you to enable/disable and configure various system capabilities.

Usage: claude-flow features <subcommand> [options]

Subcommands:
  list                    List all available features
  enable <feature-id>     Enable a feature
  disable <feature-id>    Disable a feature  
  toggle <feature-id>     Toggle a feature on/off
  config <feature-id>     Configure a feature
  status [feature-id]     Show feature status

Options:
  --category <type>       Filter by category (list)
  --enabled <true|false>  Filter by enabled state (list)
  --experimental <bool>   Filter experimental features (list)
  --verbose              Show detailed information
  --json                 Output in JSON format
  --set <key=value>      Set configuration value (config)
  --get                  Get configuration (config)
  --reset                Reset configuration (config)
  --health               Include health check (status)

Examples:
  claude-flow features list
  claude-flow features list --category swarm --enabled true
  claude-flow features enable advanced-memory
  claude-flow features config swarm-coordination --set maxAgents=10
  claude-flow features status --health

Feature Categories:
  • core         Core system features
  • memory       Memory and persistence features
  • swarm        Swarm coordination features
  • agent        Agent management features
  • workflow     Workflow automation features
  • integration  External integration features
  • performance  Performance optimization features
  • experimental Experimental features (use with caution)

Tip: Use 'claude-flow features list --verbose' to see all feature details.
  `);
}