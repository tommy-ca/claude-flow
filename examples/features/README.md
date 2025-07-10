# Feature System Examples

This directory contains examples demonstrating the claude-flow feature system.

## Examples

### MCP Feature Management
- `mcp-feature-example.ts` - Shows how to use MCP tools to manage features

## Running the Examples

### Prerequisites
1. Ensure claude-flow is installed and configured
2. Start the MCP server with feature tools enabled

### Running MCP Feature Example

```bash
# Start MCP server (in one terminal)
claude-flow mcp start

# Run the example (in another terminal)
npx tsx examples/features/mcp-feature-example.ts
```

## Key Concepts

### Feature Categories
- **core** - Essential system features
- **agent** - Agent-related features
- **memory** - Memory system features
- **coordination** - Coordination and orchestration features
- **integration** - External integration features
- **ui** - User interface features
- **utility** - Utility and helper features
- **experimental** - Experimental features
- **custom** - Custom user-defined features

### Feature States
- **uninitialized** - Feature not yet initialized
- **initializing** - Feature is being initialized
- **ready** - Feature is ready to be enabled
- **enabling** - Feature is being enabled
- **enabled** - Feature is active and working
- **disabling** - Feature is being disabled
- **disabled** - Feature is turned off
- **error** - Feature encountered an error

### Feature Operations

1. **List Features** - Discover available features with filtering
2. **Enable Feature** - Turn on a feature with dependency checking
3. **Disable Feature** - Turn off a feature with dependent checking
4. **Configure Feature** - Update feature settings
5. **Check Status** - Get detailed feature information

## Best Practices

1. **Check Dependencies** - Always verify dependencies before enabling features
2. **Handle Errors** - Gracefully handle missing or failed features
3. **Use Filtering** - Filter features by category, tags, or state
4. **Monitor State** - Track feature state changes
5. **Document Features** - Provide clear descriptions and metadata