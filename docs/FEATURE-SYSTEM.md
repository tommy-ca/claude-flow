# Claude-Flow Feature System

## Overview

The Claude-Flow feature system provides a transparent, configurable way to control system capabilities. It allows users to:

- Enable/disable features without code changes
- Configure feature-specific settings
- Understand feature dependencies and conflicts
- Monitor feature health and status
- Control experimental features safely

## Architecture

### Core Components

1. **Feature Registry**: Central registry of all available features
2. **Feature Manager**: Handles feature lifecycle and configuration
3. **CLI Adapter**: Integrates features with the command-line interface
4. **Command Hooks**: Allows commands to check and use features

### Feature Categories

- **core**: Essential system features (e.g., terminal UI, web UI)
- **memory**: Persistence and caching features
- **swarm**: Multi-agent coordination features
- **agent**: Agent management capabilities
- **workflow**: Automation and workflow features
- **integration**: External service integrations
- **performance**: Optimization features
- **experimental**: Beta/experimental features

## CLI Commands

### List Features

```bash
# List all features
claude-flow features list

# List by category
claude-flow features list --category swarm

# List only enabled features
claude-flow features list --enabled true

# List with verbose details
claude-flow features list --verbose

# Output as JSON
claude-flow features list --json
```

### Enable/Disable Features

```bash
# Enable a feature
claude-flow features enable advanced-memory

# Disable a feature
claude-flow features disable experimental-ui

# Toggle a feature
claude-flow features toggle web-ui
```

### Configure Features

```bash
# View configuration
claude-flow features config advanced-memory

# Set a configuration value
claude-flow features config swarm-coordination --set maxAgents=10

# Set multiple values
claude-flow features config advanced-memory --set backend=sqlite --set cacheSize=1000

# Reset configuration
claude-flow features config advanced-memory --reset
```

### Check Feature Status

```bash
# Overall system status
claude-flow features status

# Specific feature status
claude-flow features status advanced-memory

# Include health check
claude-flow features status github-integration --health

# JSON output
claude-flow features status --json
```

## Feature Definitions

### Example Feature Implementation

```typescript
export const advancedMemoryFeature: Feature = {
  id: 'advanced-memory',
  name: 'Advanced Memory',
  description: 'Enhanced memory persistence with SQLite backend',
  version: '1.0.0',
  category: FeatureCategory.MEMORY,
  dependencies: [], // Other features this depends on
  conflicts: [], // Features that conflict with this
  defaultEnabled: true,
  experimental: false,
  
  // Lifecycle methods
  async initialize() {
    // Setup code
  },
  
  async activate() {
    // Activation code
  },
  
  async deactivate() {
    // Deactivation code
  },
  
  async cleanup() {
    // Cleanup code
  },
  
  async healthCheck() {
    return {
      healthy: true,
      status: FeatureStatus.ACTIVE,
      message: 'Memory backend operational',
      lastChecked: new Date(),
      metrics: { storageUsed: '45MB' }
    };
  }
};
```

## Integration with Commands

### Using Feature Hooks

```javascript
import { withFeature, hasFeature, getFeatureConfig } from '../features/hooks/command-hooks';

// Check if feature is enabled
if (hasFeature('advanced-memory')) {
  console.log('Advanced memory is available');
}

// Execute conditionally based on feature
await withFeature(
  'advanced-memory',
  async () => {
    // Code to run when feature is enabled
    console.log('Using advanced memory operations');
  },
  async () => {
    // Fallback code when feature is disabled
    console.log('Using basic memory operations');
  }
);

// Get feature configuration
const config = getFeatureConfig('swarm-coordination');
const maxAgents = config?.maxAgents || 5;
```

### Feature-Aware Commands

Commands can declare required and optional features:

```javascript
export const myCommand = featureAwareCommand(
  async (args, flags) => {
    // Command implementation
  },
  ['required-feature'], // Required features
  ['optional-feature']  // Optional features
);
```

## Feature Dependencies and Conflicts

### Dependencies

Features can depend on other features. The system ensures all dependencies are enabled before activating a feature:

```bash
# This will fail if dependencies aren't met
claude-flow features enable hive-mind

# Error: Feature hive-mind requires swarm-coordination (not enabled)
```

### Conflicts

Features can declare conflicts with other features to prevent incompatible combinations:

```bash
# If terminal-ui is enabled
claude-flow features enable web-ui

# Error: Feature web-ui conflicts with terminal-ui
```

## Configuration Management

Feature configurations are stored in the main Claude-Flow configuration file and can be:

- Set individually via CLI
- Exported/imported as JSON
- Modified programmatically
- Reset to defaults

### Configuration Examples

```bash
# SQLite backend for memory
claude-flow features config advanced-memory --set backend=sqlite

# Swarm coordination settings
claude-flow features config swarm-coordination --set maxAgents=8 --set strategy=balanced

# Performance monitoring intervals
claude-flow features config performance-monitoring --set interval=5000
```

## Best Practices

1. **Start with defaults**: Most features have sensible defaults
2. **Enable incrementally**: Don't enable all features at once
3. **Check dependencies**: Use `features status` to understand dependencies
4. **Monitor health**: Regularly check feature health, especially for critical features
5. **Test experimental features**: Use a test environment for experimental features
6. **Document custom settings**: Keep track of configuration changes

## Transparency Benefits

The feature system provides transparency by:

1. **Clear visibility**: See exactly what's enabled and configured
2. **Explicit dependencies**: Understand feature relationships
3. **Health monitoring**: Know when features are working properly
4. **Configuration clarity**: All settings in one place
5. **Version tracking**: Know which version of each feature is active
6. **Experimental flags**: Clearly marked experimental features

## Adding Custom Features

To add a custom feature:

1. Create a feature definition implementing the `Feature` interface
2. Register it with the feature manager
3. Add any necessary configuration options
4. Document the feature's purpose and settings

```typescript
// my-custom-feature.ts
export const myCustomFeature: Feature = {
  id: 'my-custom-feature',
  name: 'My Custom Feature',
  description: 'Adds custom functionality',
  version: '1.0.0',
  category: FeatureCategory.EXPERIMENTAL,
  // ... rest of implementation
};

// Register in your initialization code
await featureManager.register(myCustomFeature);
```

## Troubleshooting

### Feature won't enable

1. Check dependencies: `claude-flow features status <feature-id>`
2. Check for conflicts: `claude-flow features list --verbose`
3. Check health: `claude-flow features status <feature-id> --health`

### Feature configuration not working

1. Verify the setting name is correct
2. Check the value type (string, number, boolean)
3. Reset and reconfigure: `claude-flow features config <feature-id> --reset`

### Performance issues

1. Disable non-essential features
2. Check feature health for errors
3. Review feature metrics with `--health` flag

## Future Enhancements

- Feature marketplace for community features
- A/B testing support for features
- Feature usage analytics
- Automatic feature recommendations
- Feature rollback capabilities
- Remote feature management