# Claude-Flow MCP Integration with Claude Code

This guide explains how to add Claude-Flow as an MCP server to Claude Code, enabling you to use all Claude-Flow tools directly within Claude Code.

## Quick Start

### Method 1: Using `claude mcp add` (Recommended)

Add Claude-Flow as an MCP server to Claude Code:

```bash
# For local development (if you're in the claude-flow directory)
claude mcp add claude-flow ./claude-flow mcp serve

# For global installation
claude mcp add claude-flow npx -y claude-flow mcp serve

# For a specific version
claude mcp add claude-flow npx -y claude-flow@latest mcp serve
```

### Method 2: Using `.mcp.json` Configuration

1. Create or update `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "claude-flow": {
      "command": "npx",
      "args": ["-y", "claude-flow", "mcp", "serve"],
      "env": {}
    }
  }
}
```

2. Claude Code will automatically detect and use this configuration.

### Method 3: Import from Existing Configuration

If Claude-Flow is already in your project:

```bash
# Navigate to your claude-flow directory
cd /path/to/claude-code-flow

# Add using the local binary
claude mcp add claude-flow ./claude-flow mcp serve
```

## Available Tools

Once added, Claude-Flow provides these MCP tools to Claude Code:

### System Tools
- `system/info` - Get system information
- `system/health` - Get system health status
- `tools/list` - List all available tools
- `tools/schema` - Get schema for a specific tool

### SPARC Mode Tools (All 17+ modes)
- `sparc/orchestrator` - Multi-agent task orchestration
- `sparc/coder` - Autonomous code generation
- `sparc/researcher` - Deep research and analysis
- `sparc/tdd` - Test-driven development
- `sparc/architect` - System architecture design
- `sparc/reviewer` - Code review and analysis
- `sparc/debugger` - Debug and fix issues
- `sparc/tester` - Comprehensive testing
- `sparc/analyzer` - Code and performance analysis
- `sparc/optimizer` - Performance optimization
- `sparc/documenter` - Documentation generation
- `sparc/designer` - UI/UX design assistance
- `sparc/innovator` - Creative problem solving
- `sparc/swarm-coordinator` - Multi-agent coordination
- `sparc/memory-manager` - Memory and state management
- `sparc/batch-executor` - Batch operations
- `sparc/workflow-manager` - Workflow automation

### SPARC Meta Tools
- `sparc/list` - List all available SPARC modes
- `sparc/execute` - Execute custom SPARC workflows
- `sparc/swarm` - Coordinate multiple SPARC agents

## Usage Examples

### In Claude Code

Once added, you can use Claude-Flow tools in Claude Code:

```javascript
// Use SPARC researcher mode
await claude.useTool('sparc/researcher', {
  task: 'Research modern web frameworks performance comparison',
  context: {
    memoryKey: 'framework_research',
    parallel: true
  }
});

// List available SPARC modes
const modes = await claude.useTool('sparc/list', { verbose: true });

// Execute a SPARC swarm
await claude.useTool('sparc/swarm', {
  objective: 'Build a REST API with authentication',
  strategy: 'development',
  mode: 'hierarchical',
  maxAgents: 5
});
```

## Advanced Configuration

### With Custom Environment Variables

```bash
claude mcp add claude-flow ./claude-flow mcp serve \
  --env CLAUDE_FLOW_LOG_LEVEL=debug \
  --env CLAUDE_FLOW_MEMORY_BACKEND=sqlite
```

### Using JSON Configuration

```bash
claude mcp add-json claude-flow '{
  "command": "npx",
  "args": ["-y", "claude-flow", "mcp", "serve"],
  "env": {
    "CLAUDE_FLOW_LOG_LEVEL": "info",
    "NODE_ENV": "production"
  }
}'
```

## Verifying Installation

1. List configured MCP servers:
```bash
claude mcp list
```

2. Get details about Claude-Flow server:
```bash
claude mcp get claude-flow
```

3. Test the connection:
```bash
# In Claude Code, try using a tool
await claude.useTool('sparc/list', {});
```

## Troubleshooting

### Server Not Starting
- Ensure Claude-Flow is installed: `npm install -g claude-flow`
- Check if the path is correct: `which claude-flow`
- Try with verbose logging: Add `--verbose` to the args

### Tools Not Available
- The server starts with basic tools and loads more as needed
- Check server logs for any errors
- Ensure you're using the latest version of Claude-Flow

### Permission Issues
- Make sure the claude-flow binary is executable
- For local installations, use the full path to the binary

## Removing Claude-Flow

To remove Claude-Flow from Claude Code:

```bash
claude mcp remove claude-flow
```

## HTTP vs STDIO Transport

Claude Code uses STDIO transport by default. The `mcp serve` command automatically configures Claude-Flow for STDIO mode, ensuring compatibility with Claude Code's MCP implementation.

For debugging or standalone use, you can still use HTTP transport with `mcp start`:
```bash
./claude-flow mcp start --port 3000
```

## Next Steps

- Explore the [SPARC methodology](https://github.com/ruvnet/sparc) for optimal agent usage
- Check out [example workflows](../examples/workflows/) 
- Read about [swarm coordination](./12-swarm.md) for complex tasks