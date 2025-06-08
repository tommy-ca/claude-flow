# MCP Configuration Guide

## Introduction

The Model Context Protocol (MCP) configuration is essential for integrating external tools and services with the Claude Code SDK. This guide provides comprehensive instructions for setting up, configuring, and managing MCP servers to extend Claude's capabilities with custom tools and resources.

Proper MCP configuration enables:
- Integration with external APIs and services
- Custom tool development and deployment
- Secure permission management
- Scalable server architecture
- Seamless workflow automation

## MCP Configuration File

### Configuration File Structure

MCP servers are defined in a JSON configuration file that specifies server details, execution parameters, and environment settings. The configuration follows this structure:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable-command",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      },
      "alwaysAllow": ["tool1", "tool2"],
      "timeout": 300
    }
  }
}
```

### Configuration Parameters

#### Required Parameters

- **`command`**: The executable command to start the MCP server
- **`args`**: Array of command-line arguments passed to the server

#### Optional Parameters

- **`env`**: Environment variables for the server process
- **`alwaysAllow`**: Array of tools that are automatically permitted without user confirmation
- **`timeout`**: Server startup timeout in seconds (default: 30)
- **`url`**: For remote servers, the HTTP/HTTPS endpoint
- **`headers`**: For remote servers, HTTP headers to include in requests

### Complete Configuration Example

```json
{
  "mcpServers": {
    "claude-code": {
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {
        "CLAUDE_API_KEY": "${ANTHROPIC_API_KEY}",
        "LOG_LEVEL": "info"
      },
      "alwaysAllow": [
        "Task",
        "Bash",
        "Glob",
        "Grep",
        "LS",
        "Read",
        "MultiEdit",
        "Edit",
        "Write",
        "NotebookRead",
        "NotebookEdit",
        "WebFetch",
        "TodoRead",
        "TodoWrite",
        "WebSearch"
      ],
      "timeout": 60
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "alwaysAllow": [
        "resolve-library-id",
        "get-library-docs"
      ],
      "timeout": 300
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ROOT_PATH": "/workspace"
      },
      "alwaysAllow": [
        "read_file",
        "write_file",
        "list_directory"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "alwaysAllow": [
        "create_or_update_file",
        "search_repositories",
        "create_issue"
      ]
    },
    "remote-api": {
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "Content-Type": "application/json"
      },
      "timeout": 120
    }
  }
}
```

## Setting Up MCP Servers

### Filesystem Server

The filesystem server provides secure file system access with configurable root paths and permissions.

#### Installation

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

#### Configuration

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ROOT_PATH": "/workspace",
        "ALLOWED_EXTENSIONS": ".js,.ts,.py,.md,.json",
        "MAX_FILE_SIZE": "10MB"
      },
      "alwaysAllow": [
        "read_file",
        "write_file",
        "list_directory",
        "search_files"
      ]
    }
  }
}
```

#### Available Tools

- **`read_file`**: Read file contents
- **`write_file`**: Write content to files
- **`list_directory`**: List directory contents
- **`search_files`**: Search for files by pattern
- **`get_file_info`**: Get file metadata

### GitHub Server

The GitHub server enables repository management, issue tracking, and code collaboration features.

#### Installation

```bash
npm install -g @modelcontextprotocol/server-github
```

#### Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}",
        "DEFAULT_OWNER": "your-username",
        "DEFAULT_REPO": "your-repo"
      },
      "alwaysAllow": [
        "search_repositories",
        "get_file_contents",
        "list_issues"
      ]
    }
  }
}
```

#### Available Tools

- **`create_or_update_file`**: Create or update repository files
- **`search_repositories`**: Search GitHub repositories
- **`create_issue`**: Create GitHub issues
- **`list_issues`**: List repository issues
- **`get_file_contents`**: Read repository file contents
- **`create_pull_request`**: Create pull requests

### Custom Servers

You can create custom MCP servers for specific use cases or integrations.

#### Basic Custom Server Structure

```typescript
import { MCPServer } from '@modelcontextprotocol/sdk';

const server = new MCPServer({
  name: 'custom-server',
  version: '1.0.0'
});

// Add a custom tool
server.addTool({
  name: 'custom_action',
  description: 'Performs a custom action',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  handler: async (params) => {
    // Custom logic here
    return {
      success: true,
      result: `Processed: ${params.input}`
    };
  }
});

// Start the server
server.start();
```

#### Configuration for Custom Server

```json
{
  "mcpServers": {
    "custom-server": {
      "command": "node",
      "args": ["./custom-server.js"],
      "env": {
        "CUSTOM_API_KEY": "${CUSTOM_API_KEY}",
        "DEBUG": "true"
      },
      "alwaysAllow": [
        "custom_action"
      ]
    }
  }
}
```

## Command Line Integration

### Using the `--mcp-config` Flag

Specify a custom MCP configuration file when running Claude Code:

```bash
claude --mcp-config ./my-mcp-config.json -p "List files in the current directory"
```

#### Default Configuration Locations

Claude Code looks for MCP configuration in these locations (in order):

1. `--mcp-config` flag value
2. `./.roo/mcp.json` (project-specific)
3. `~/.claude/mcp.json` (user-specific)
4. Built-in default configuration

### Specifying Allowed Tools

Use the `--allowedTools` flag to restrict which tools Claude can access:

```bash
claude --allowedTools "filesystem:read_file,filesystem:list_directory" -p "Show me the project structure"
```

#### Tool Specification Format

```bash
# Single tool
--allowedTools "server:tool"

# Multiple tools from same server
--allowedTools "server:tool1,server:tool2"

# Multiple tools from different servers
--allowedTools "server1:tool1,server2:tool2"

# All tools from a server
--allowedTools "server:*"
```

### MCP Tool Naming Convention

MCP tools follow the naming convention: `mcp__$serverName__$toolName`

#### Examples

- `mcp__filesystem__read_file`
- `mcp__github__create_issue`
- `mcp__claude-code__Bash`
- `mcp__context7__resolve-library-id`

#### Using Tools in Prompts

```bash
claude -p "Use mcp__filesystem__read_file to show me the contents of package.json"
```

## Permission Management

### Setting Up Permission Prompt Tool

The permission prompt tool allows for dynamic approval/denial of tool usage during execution.

#### Configuration

```bash
claude --permission-prompt-tool "./permission-handler.js" -p "Your prompt here"
```

#### Permission Handler Script

```javascript
#!/usr/bin/env node

// permission-handler.js
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr // Use stderr to avoid interfering with main output
});

// Read the permission request from stdin
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const request = JSON.parse(input);
    
    // Display permission request
    console.error(`\n🔐 Permission Request:`);
    console.error(`Server: ${request.server}`);
    console.error(`Tool: ${request.tool}`);
    console.error(`Description: ${request.description || 'No description provided'}`);
    
    if (request.parameters) {
      console.error(`Parameters:`);
      console.error(JSON.stringify(request.parameters, null, 2));
    }
    
    rl.question('\nAllow this action? (y/n/always): ', (answer) => {
      const response = {
        allowed: answer.toLowerCase().startsWith('y') || answer.toLowerCase() === 'always',
        remember: answer.toLowerCase() === 'always'
      };
      
      // Output response to stdout
      console.log(JSON.stringify(response));
      rl.close();
    });
  } catch (error) {
    // Deny on error
    console.log(JSON.stringify({ allowed: false, remember: false }));
    rl.close();
  }
});
```

### JSON Payload Format

#### Permission Request Format

```json
{
  "server": "filesystem",
  "tool": "read_file",
  "description": "Read the contents of a file",
  "parameters": {
    "path": "/workspace/package.json"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456"
}
```

#### Permission Response Format

```json
{
  "allowed": true,
  "remember": false,
  "reason": "User approved file read operation",
  "restrictions": {
    "maxFileSize": "1MB",
    "allowedPaths": ["/workspace"]
  }
}
```

### Implementation Example

#### Advanced Permission Handler

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG_FILE = path.join(process.env.HOME, '.claude-permissions.json');
const AUTO_ALLOW_PATTERNS = [
  /^filesystem:(read_file|list_directory)$/,
  /^github:search_repositories$/
];

class PermissionManager {
  constructor() {
    this.config = this.loadConfig();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr
    });
  }
  
  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading permission config:', error.message);
    }
    return { alwaysAllow: [], alwaysDeny: [] };
  }
  
  saveConfig() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving permission config:', error.message);
    }
  }
  
  async handleRequest(request) {
    const toolKey = `${request.server}:${request.tool}`;
    
    // Check always allow list
    if (this.config.alwaysAllow.includes(toolKey)) {
      return { allowed: true, remember: true };
    }
    
    // Check always deny list
    if (this.config.alwaysDeny.includes(toolKey)) {
      return { allowed: false, remember: true };
    }
    
    // Check auto-allow patterns
    for (const pattern of AUTO_ALLOW_PATTERNS) {
      if (pattern.test(toolKey)) {
        return { allowed: true, remember: false };
      }
    }
    
    // Prompt user
    return await this.promptUser(request, toolKey);
  }
  
  async promptUser(request, toolKey) {
    console.error(`\n🔐 Permission Request:`);
    console.error(`Server: ${request.server}`);
    console.error(`Tool: ${request.tool}`);
    console.error(`Description: ${request.description || 'No description provided'}`);
    
    if (request.parameters) {
      console.error(`Parameters:`);
      console.error(JSON.stringify(request.parameters, null, 2));
    }
    
    return new Promise((resolve) => {
      this.rl.question('\nAllow this action? (y/n/always/never): ', (answer) => {
        const lower = answer.toLowerCase();
        let allowed = false;
        let remember = false;
        
        if (lower.startsWith('y') || lower === 'always') {
          allowed = true;
        }
        
        if (lower === 'always') {
          this.config.alwaysAllow.push(toolKey);
          remember = true;
          this.saveConfig();
        } else if (lower === 'never') {
          this.config.alwaysDeny.push(toolKey);
          remember = true;
          this.saveConfig();
        }
        
        resolve({ allowed, remember });
      });
    });
  }
}

// Main execution
async function main() {
  let input = '';
  
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  
  try {
    const request = JSON.parse(input);
    const manager = new PermissionManager();
    const response = await manager.handleRequest(request);
    
    console.log(JSON.stringify(response));
  } catch (error) {
    console.log(JSON.stringify({ allowed: false, remember: false }));
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
```

## Common Configuration Patterns

### Development Environment Setup

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ROOT_PATH": "./",
        "ALLOWED_EXTENSIONS": ".js,.ts,.jsx,.tsx,.py,.md,.json,.yaml,.yml"
      },
      "alwaysAllow": ["read_file", "list_directory", "search_files"]
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "alwaysAllow": ["status", "log", "diff"]
    },
    "npm": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-npm"],
      "alwaysAllow": ["list_packages", "get_package_info"]
    }
  }
}
```

### Production Environment Setup

```json
{
  "mcpServers": {
    "monitoring": {
      "url": "https://monitoring.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MONITORING_TOKEN}",
        "X-Environment": "production"
      },
      "timeout": 30
    },
    "deployment": {
      "command": "./deployment-server",
      "env": {
        "DEPLOY_ENV": "production",
        "KUBECTL_CONFIG": "/etc/kubernetes/config"
      },
      "alwaysAllow": ["get_status", "list_deployments"]
    }
  }
}
```

### Multi-Project Setup

```json
{
  "mcpServers": {
    "project-a-fs": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ROOT_PATH": "/workspace/project-a"
      }
    },
    "project-b-fs": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ROOT_PATH": "/workspace/project-b"
      }
    },
    "shared-github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

## Troubleshooting

### Common Configuration Issues

#### Server Startup Failures

**Problem**: MCP server fails to start

```
Error: Failed to start MCP server 'filesystem'
```

**Solutions**:

1. **Check command availability**:
   ```bash
   which npx
   npm list -g @modelcontextprotocol/server-filesystem
   ```

2. **Verify environment variables**:
   ```bash
   echo $GITHUB_TOKEN
   echo $ANTHROPIC_API_KEY
   ```

3. **Test server manually**:
   ```bash
   npx -y @modelcontextprotocol/server-filesystem
   ```

4. **Check timeout settings**:
   ```json
   {
     "timeout": 120  // Increase timeout for slow servers
   }
   ```

#### Permission Denied Errors

**Problem**: Tools are blocked by permission system

```
Error: Permission denied for tool 'read_file'
```

**Solutions**:

1. **Add to alwaysAllow list**:
   ```json
   {
     "alwaysAllow": ["read_file", "write_file"]
   }
   ```

2. **Use permission prompt tool**:
   ```bash
   claude --permission-prompt-tool ./permission-handler.js
   ```

3. **Check tool naming**:
   ```bash
   # Correct format
   --allowedTools "filesystem:read_file"
   
   # Incorrect format
   --allowedTools "read_file"
   ```

#### Environment Variable Issues

**Problem**: Environment variables not being resolved

```
Error: Invalid token: ${GITHUB_TOKEN}
```

**Solutions**:

1. **Verify variable is set**:
   ```bash
   echo $GITHUB_TOKEN
   ```

2. **Use absolute paths for env files**:
   ```bash
   source /absolute/path/to/.env
   ```

3. **Check variable syntax**:
   ```json
   {
     "env": {
       "TOKEN": "${GITHUB_TOKEN}",  // Correct
       "TOKEN": "$GITHUB_TOKEN",   // Incorrect
       "TOKEN": "%GITHUB_TOKEN%"   // Windows style - incorrect
     }
   }
   ```

#### Network and Connectivity Issues

**Problem**: Remote MCP servers not responding

```
Error: Connection timeout to https://api.example.com/mcp
```

**Solutions**:

1. **Test connectivity**:
   ```bash
   curl -I https://api.example.com/mcp
   ```

2. **Check firewall settings**:
   ```bash
   # Allow outbound HTTPS
   sudo ufw allow out 443
   ```

3. **Verify SSL certificates**:
   ```bash
   curl -v https://api.example.com/mcp
   ```

4. **Use proxy if required**:
   ```json
   {
     "env": {
       "HTTP_PROXY": "http://proxy.company.com:8080",
       "HTTPS_PROXY": "http://proxy.company.com:8080"
     }
   }
   ```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Enable MCP debug mode
export MCP_DEBUG=1
claude --mcp-config ./debug-config.json -p "Test prompt"
```

#### Debug Configuration

```json
{
  "mcpServers": {
    "debug-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "DEBUG": "*",
        "LOG_LEVEL": "debug"
      }
    }
  },
  "debug": {
    "enabled": true,
    "logLevel": "verbose",
    "logFile": "./mcp-debug.log"
  }
}
```

### Performance Optimization

#### Server Startup Optimization

```json
{
  "mcpServers": {
    "fast-server": {
      "command": "node",
      "args": ["--max-old-space-size=512", "./server.js"],
      "env": {
        "NODE_ENV": "production"
      },
      "timeout": 10  // Faster timeout for local servers
    }
  }
}
```

#### Connection Pooling

```json
{
  "mcpServers": {
    "pooled-server": {
      "url": "https://api.example.com/mcp",
      "connectionPool": {
        "maxConnections": 10,
        "keepAlive": true,
        "timeout": 30
      }
    }
  }
}
```

---

## Next Steps

Now that you have MCP configured, explore these advanced topics:

- **[Security Best Practices](./security.md)** - Secure your MCP integrations
- **[Building Custom Servers](./custom-servers.md)** - Create your own MCP servers
- **[API Reference](./api-reference.md)** - Complete MCP API documentation
- **[Troubleshooting Guide](./troubleshooting.md)** - Detailed problem-solving guide

---

*Ready to supercharge your development workflow? Start with a basic filesystem server configuration and gradually add more specialized tools as your needs grow.*