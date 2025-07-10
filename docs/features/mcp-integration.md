# MCP Feature Integration

This document describes how the feature system integrates with the MCP (Model Context Protocol) interface to provide transparent feature management.

## Overview

The MCP Feature Integration allows Claude and other MCP clients to discover, enable, disable, and configure features through standard MCP tools. This provides a unified interface for feature management across different clients and environments.

## Architecture

### Components

1. **McpFeatureAdapter** - Main adapter class that bridges the feature system with MCP
2. **Feature Tools** - MCP tools for feature management operations
3. **Feature Registry** - Central registry of all available features
4. **Feature Manager** - Manages feature lifecycle and state (optional)

### MCP Tools

The integration provides the following MCP tools:

#### features/list
Lists all available features with filtering options.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "enum": ["core", "agent", "memory", "coordination", "integration", "ui", "utility", "experimental", "custom"]
    },
    "enabled": {
      "type": "boolean"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

**Example:**
```json
// Request
{
  "category": "experimental",
  "enabled": true
}

// Response
{
  "success": true,
  "features": [
    {
      "id": "neural-patterns",
      "name": "Neural Pattern Recognition",
      "description": "Advanced pattern recognition using neural networks",
      "category": "experimental",
      "enabled": true,
      "version": "0.1.0",
      "tags": ["ai", "neural", "experimental"],
      "dependencies": ["neural-core"],
      "experimental": true
    }
  ],
  "total": 1
}
```

#### features/enable
Enables a feature with dependency checking.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "featureId": {
      "type": "string"
    },
    "force": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["featureId"]
}
```

**Example:**
```json
// Request
{
  "featureId": "advanced-swarm",
  "force": false
}

// Response (success)
{
  "success": true,
  "featureId": "advanced-swarm",
  "status": "enabled",
  "message": "Feature 'advanced-swarm' enabled successfully"
}

// Response (failed dependencies)
{
  "success": false,
  "error": "Unsatisfied dependencies",
  "dependencies": ["swarm-core", "neural-patterns"]
}
```

#### features/disable
Disables a feature with dependent feature checking.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "featureId": {
      "type": "string"
    },
    "force": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["featureId"]
}
```

#### features/config
Configures a feature with custom settings.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "featureId": {
      "type": "string"
    },
    "config": {
      "type": "object"
    }
  },
  "required": ["featureId", "config"]
}
```

**Example:**
```json
// Request
{
  "featureId": "neural-patterns",
  "config": {
    "modelSize": "large",
    "threshold": 0.85,
    "enableCaching": true
  }
}

// Response
{
  "success": true,
  "featureId": "neural-patterns",
  "config": {
    "modelSize": "large",
    "threshold": 0.85,
    "enableCaching": true
  },
  "message": "Feature 'neural-patterns' configured successfully"
}
```

#### features/status
Gets detailed status and dependencies of a feature.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "featureId": {
      "type": "string"
    },
    "includeDependencies": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["featureId"]
}
```

**Example Response:**
```json
{
  "success": true,
  "feature": {
    "id": "advanced-swarm",
    "name": "Advanced Swarm Orchestration",
    "description": "Enhanced swarm coordination with neural patterns",
    "category": "coordination",
    "enabled": true,
    "state": "active",
    "version": "2.0.0",
    "experimental": false,
    "tags": ["swarm", "coordination", "advanced"]
  },
  "dependencies": {
    "required": ["swarm-core", "neural-patterns"],
    "satisfied": ["swarm-core"],
    "missing": ["neural-patterns"]
  },
  "dependents": ["super-swarm", "hive-mind-pro"]
}
```

## Integration Usage

### In MCP Server

```typescript
import { createMcpFeatureTools } from './feature-tools.js';
import { McpFeatureAdapter } from '../features/adapters/McpFeatureAdapter.js';
import { featureRegistry } from '../features/core/FeatureRegistry.js';

// In MCP server initialization
private registerFeatureTools(): void {
  // Create feature tools
  const featureTools = createMcpFeatureTools(this.logger, this.featureManager);
  
  // Create adapter for response enrichment
  const featureAdapter = new McpFeatureAdapter(
    featureRegistry,
    this.featureManager,
    this.logger
  );
  
  // Register tools
  for (const tool of featureTools) {
    this.registerTool(tool);
  }
  
  // Store adapter for response enrichment
  this.featureAdapter = featureAdapter;
}
```

### Response Enrichment

The adapter can enrich MCP responses with feature metadata:

```typescript
// In request handler
const response = await handleRequest(request);
const enrichedResponse = this.featureAdapter.enrichResponse(
  response,
  ['feature-1', 'feature-2'] // Features used in this request
);
```

Enriched response includes:
```json
{
  "result": "...",
  "_metadata": {
    "features": {
      "feature-1": {
        "enabled": true,
        "version": "1.0.0",
        "experimental": false
      },
      "feature-2": {
        "enabled": false,
        "version": "0.5.0",
        "experimental": true
      }
    }
  }
}
```

### Feature Discovery

MCP clients can discover available features:

```typescript
const features = await adapter.discoverFeatures({
  tags: ['ai', 'neural'],
  experimental: false
});
```

### Tool Feature Requirements

Check if a tool requires specific features:

```typescript
const check = await adapter.checkToolFeatures('swarm/advanced-orchestration');
if (!check.allowed) {
  console.log('Missing features:', check.missingFeatures);
}
```

## Best Practices

1. **Dependency Management**: Always check dependencies before enabling features
2. **Graceful Degradation**: Handle missing features gracefully in tools
3. **Feature Flags**: Use feature flags to control rollout of new capabilities
4. **Metadata Enrichment**: Include feature metadata in responses for transparency
5. **Error Handling**: Provide clear error messages when features are unavailable

## Security Considerations

1. **Permission Checks**: Validate permissions before allowing feature changes
2. **Configuration Validation**: Validate all configuration inputs
3. **Audit Logging**: Log all feature state changes
4. **Rate Limiting**: Limit feature management operations to prevent abuse

## Future Enhancements

1. **Feature Bundles**: Group related features for easier management
2. **A/B Testing**: Support for feature experiments
3. **Remote Configuration**: Cloud-based feature management
4. **Feature Analytics**: Track feature usage and performance
5. **Dynamic Loading**: Load features on-demand