# Custom MCP Tools

## Introduction

Custom MCP (Model Context Protocol) tools extend the capabilities of Claude Code by allowing developers to create specialized functions that can be invoked during AI-assisted development workflows. These tools enable seamless integration with external APIs, databases, file systems, and custom business logic, transforming Claude from a conversational AI into a powerful development partner with access to your entire technology stack.

Custom MCP tools are essential for:
- **Domain-specific operations** - Create tools tailored to your specific business logic and workflows
- **External system integration** - Connect Claude to databases, APIs, and third-party services
- **Workflow automation** - Automate complex development tasks and processes
- **Security and compliance** - Implement controlled access to sensitive systems and data
- **Performance optimization** - Build efficient tools for resource-intensive operations

## MCP Tool Fundamentals

### What Makes a Tool

An MCP tool is a function that Claude can invoke to perform specific actions or retrieve information. Each tool consists of:

1. **Name** - A unique identifier for the tool
2. **Description** - Human-readable explanation of what the tool does
3. **Input Schema** - JSON Schema defining expected parameters
4. **Handler Function** - The actual implementation that processes requests
5. **Output Format** - Structured response that Claude can understand

### Tool Registration

Tools are registered with an MCP server during initialization:

```typescript
server.addTool({
  name: 'tool_name',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' },
      param2: { type: 'number' }
    },
    required: ['param1']
  },
  handler: async (params) => {
    // Tool implementation
    return { result: 'success' };
  }
});
```

### Input/Output Patterns

#### Input Schema Validation

MCP tools use JSON Schema for input validation:

```typescript
// Simple string parameter
{
  type: 'object',
  properties: {
    message: { type: 'string' }
  },
  required: ['message']
}

// Complex nested object
{
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        age: { type: 'number', minimum: 0 }
      },
      required: ['name', 'email']
    },
    options: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['user']
}

// Enum values
{
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['create', 'update', 'delete']
    },
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  required: ['action']
}
```

#### Output Response Format

Tool responses should be structured and informative:

```typescript
// Success response
{
  success: true,
  data: {
    id: '12345',
    status: 'created'
  },
  message: 'User created successfully'
}

// Error response
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid email format',
    details: {
      field: 'email',
      value: 'invalid-email'
    }
  }
}

// Data response
{
  success: true,
  data: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ],
  metadata: {
    total: 2,
    page: 1,
    limit: 10
  }
}
```

### Tool Naming Conventions

Follow these naming conventions for consistency:

- **Use snake_case** for tool names: `read_file`, `create_user`, `send_email`
- **Be descriptive** but concise: `get_user_profile` not `get_user`
- **Use verbs** to indicate actions: `create`, `update`, `delete`, `get`, `list`
- **Group related tools** with prefixes: `db_query`, `db_insert`, `db_update`
- **Avoid abbreviations** unless widely understood: `authenticate` not `auth`

## Creating Custom Tools

### Step-by-Step Guide

#### Step 1: Define Tool Structure

Start by defining what your tool will do and what parameters it needs:

```typescript
// Tool specification
const toolSpec = {
  name: 'send_notification',
  description: 'Send a notification to users via email or SMS',
  inputSchema: {
    type: 'object',
    properties: {
      recipients: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of email addresses or phone numbers'
      },
      message: {
        type: 'string',
        description: 'Notification message content'
      },
      type: {
        type: 'string',
        enum: ['email', 'sms'],
        description: 'Notification delivery method'
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high'],
        default: 'normal'
      }
    },
    required: ['recipients', 'message', 'type']
  }
};
```

#### Step 2: Input Schema Validation

Implement robust input validation using libraries like Zod:

```typescript
import { z } from 'zod';

// Define Zod schema
const NotificationSchema = z.object({
  recipients: z.array(z.string().email()).min(1),
  message: z.string().min(1).max(1000),
  type: z.enum(['email', 'sms']),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

// Validation function
function validateInput(params: unknown) {
  try {
    return NotificationSchema.parse(params);
  } catch (error) {
    throw new Error(`Invalid input: ${error.message}`);
  }
}
```

#### Step 3: Handler Implementation

Implement the core logic with proper error handling:

```typescript
async function sendNotificationHandler(params: unknown) {
  try {
    // Validate input
    const validated = validateInput(params);
    
    // Business logic
    const results = [];
    
    for (const recipient of validated.recipients) {
      try {
        let result;
        
        if (validated.type === 'email') {
          result = await sendEmail({
            to: recipient,
            subject: 'Notification',
            body: validated.message,
            priority: validated.priority
          });
        } else {
          result = await sendSMS({
            to: recipient,
            message: validated.message,
            priority: validated.priority
          });
        }
        
        results.push({
          recipient,
          status: 'sent',
          messageId: result.id
        });
        
      } catch (error) {
        results.push({
          recipient,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      data: {
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        results
      },
      message: `Notification sent to ${results.filter(r => r.status === 'sent').length} recipients`
    };
    
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOTIFICATION_ERROR',
        message: error.message
      }
    };
  }
}
```

#### Step 4: Error Handling

Implement comprehensive error handling:

```typescript
class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

function handleToolError(error: unknown) {
  if (error instanceof ToolError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }
  
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: error.errors
      }
    };
  }
  
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  };
}
```

## TypeScript Implementation Example

### Complete Custom Tool Server

Here's a complete example of creating a custom MCP server with TypeScript:

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Server configuration
const SERVER_NAME = 'custom-tools-server';
const SERVER_VERSION = '1.0.0';

// Initialize server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Input schemas
const FileOperationSchema = z.object({
  path: z.string(),
  content: z.string().optional(),
  encoding: z.enum(['utf8', 'base64']).default('utf8')
});

const ApiRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional(),
  data: z.any().optional(),
  timeout: z.number().min(1000).max(30000).default(5000)
});

const DatabaseQuerySchema = z.object({
  query: z.string(),
  params: z.array(z.any()).optional(),
  database: z.string().default('default')
});

// Tool implementations
class CustomTools {
  // File operations tool
  static async handleFileOperation(params: unknown) {
    try {
      const { path: filePath, content, encoding } = FileOperationSchema.parse(params);
      
      if (content !== undefined) {
        // Write file
        await fs.writeFile(filePath, content, encoding);
        return {
          success: true,
          data: {
            operation: 'write',
            path: filePath,
            size: content.length
          },
          message: `File written successfully to ${filePath}`
        };
      } else {
        // Read file
        const fileContent = await fs.readFile(filePath, encoding);
        const stats = await fs.stat(filePath);
        
        return {
          success: true,
          data: {
            operation: 'read',
            path: filePath,
            content: fileContent,
            size: stats.size,
            modified: stats.mtime
          },
          message: `File read successfully from ${filePath}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_OPERATION_ERROR',
          message: error instanceof Error ? error.message : 'File operation failed'
        }
      };
    }
  }
  
  // API request tool
  static async handleApiRequest(params: unknown) {
    try {
      const { url, method, headers, data, timeout } = ApiRequestSchema.parse(params);
      
      const response = await axios({
        url,
        method,
        headers,
        data,
        timeout,
        validateStatus: () => true // Don't throw on HTTP errors
      });
      
      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        },
        message: `API request completed with status ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'API request failed'
        }
      };
    }
  }
  
  // Database query tool (mock implementation)
  static async handleDatabaseQuery(params: unknown) {
    try {
      const { query, params: queryParams, database } = DatabaseQuerySchema.parse(params);
      
      // Mock database operation
      // In a real implementation, you would connect to your actual database
      const mockResult = {
        rows: [
          { id: 1, name: 'Sample Record 1' },
          { id: 2, name: 'Sample Record 2' }
        ],
        rowCount: 2,
        executionTime: Math.random() * 100
      };
      
      return {
        success: true,
        data: {
          query,
          params: queryParams,
          database,
          result: mockResult
        },
        message: `Query executed successfully on ${database} database`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Database query failed'
        }
      };
    }
  }
}

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'file_operation',
        description: 'Read from or write to files on the local filesystem',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path to read from or write to'
            },
            content: {
              type: 'string',
              description: 'Content to write to file (omit for read operation)'
            },
            encoding: {
              type: 'string',
              enum: ['utf8', 'base64'],
              default: 'utf8',
              description: 'File encoding'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'api_request',
        description: 'Make HTTP requests to external APIs',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              description: 'API endpoint URL'
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE'],
              default: 'GET',
              description: 'HTTP method'
            },
            headers: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'HTTP headers'
            },
            data: {
              description: 'Request body data'
            },
            timeout: {
              type: 'number',
              minimum: 1000,
              maximum: 30000,
              default: 5000,
              description: 'Request timeout in milliseconds'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'database_query',
        description: 'Execute database queries (mock implementation)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute'
            },
            params: {
              type: 'array',
              description: 'Query parameters'
            },
            database: {
              type: 'string',
              default: 'default',
              description: 'Database name'
            }
          },
          required: ['query']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'file_operation':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(await CustomTools.handleFileOperation(args), null, 2)
          }
        ]
      };
      
    case 'api_request':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(await CustomTools.handleApiRequest(args), null, 2)
          }
        ]
      };
      
    case 'database_query':
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(await CustomTools.handleDatabaseQuery(args), null, 2)
          }
        ]
      };
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { server };
```

### Package Configuration

Create a `package.json` for your custom server:

```json
{
  "name": "custom-mcp-tools",
  "version": "1.0.0",
  "description": "Custom MCP tools server",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "custom-mcp-tools": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

### TypeScript Configuration

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Tool Categories and Use Cases

### Data Access Tools

Tools that provide access to data sources and storage systems.

#### File System Tools
```typescript
// File operations
'read_file', 'write_file', 'list_directory', 'search_files'

// Use cases:
// - Reading configuration files
// - Writing generated code
// - Searching codebases
// - Managing project files
```

#### Database Tools
```typescript
// Database operations
'execute_query', 'get_schema', 'backup_data', 'migrate_schema'

// Use cases:
// - Data analysis and reporting
// - Schema exploration
// - Database maintenance
// - Migration assistance
```

#### Cloud Storage Tools
```typescript
// Cloud storage operations
'upload_file', 'download_file', 'list_objects', 'sync_directory'

// Use cases:
// - Asset management
// - Backup operations
// - Content distribution
// - Data archiving
```

### External API Tools

Tools that integrate with third-party services and APIs.

#### Communication Tools
```typescript
// Messaging and notifications
'send_email', 'send_sms', 'post_slack_message', 'create_calendar_event'

// Use cases:
// - Team notifications
// - Alert systems
// - Meeting scheduling
// - Status updates
```

#### Development Tools
```typescript
// Development services
'create_github_issue', 'deploy_application', 'run_ci_pipeline', 'update_documentation'

// Use cases:
// - Issue tracking
// - Automated deployments
// - Continuous integration
// - Documentation updates
```

#### Business Tools
```typescript
// Business integrations
'create_invoice', 'update_crm_record', 'generate_report', 'sync_inventory'

// Use cases:
// - Financial operations
// - Customer management
// - Business intelligence
// - Inventory management
```

### Utility Tools

General-purpose tools for common development tasks.

#### Code Generation Tools
```typescript
// Code generation
'generate_component', 'create_test_file', 'scaffold_project', 'generate_docs'

// Use cases:
// - Rapid prototyping
// - Test automation
// - Project setup
// - Documentation generation
```

#### Analysis Tools
```typescript
// Code analysis
'analyze_dependencies', 'check_security', 'measure_performance', 'validate_config'

// Use cases:
// - Dependency management
// - Security auditing
// - Performance optimization
// - Configuration validation
```

#### Transformation Tools
```typescript
// Data transformation
'convert_format', 'compress_files', 'resize_images', 'parse_data'

// Use cases:
// - Data migration
// - Asset optimization
// - Format conversion
// - Data processing
```

### Permission Management Tools

Tools that handle authentication, authorization, and access control.

#### Authentication Tools
```typescript
// Authentication
'authenticate_user', 'generate_token', 'validate_session', 'refresh_credentials'

// Use cases:
// - User authentication
// - Token management
// - Session handling
// - Credential refresh
```

#### Authorization Tools
```typescript
// Authorization
'check_permissions', 'grant_access', 'revoke_access', 'audit_permissions'

// Use cases:
// - Access control
// - Permission management
// - Security auditing
// - Compliance checking
```

## Testing and Debugging

### Unit Testing Custom Tools

Create comprehensive tests for your custom tools:

```typescript
// tests/custom-tools.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CustomTools } from '../src/index.js';
import fs from 'fs/promises';
import path from 'path';

describe('CustomTools', () => {
  const testDir = path.join(__dirname, 'temp');
  const testFile = path.join(testDir, 'test.txt');
  
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  describe('handleFileOperation', () => {
    it('should write file successfully', async () => {
      const params = {
        path: testFile,
        content: 'Hello, World!',
        encoding: 'utf8'
      };
      
      const result = await CustomTools.handleFileOperation(params);
      
      expect(result.success).toBe(true);
      expect(result.data.operation).toBe('write');
      expect(result.data.path).toBe(testFile);
      
      // Verify file was actually written
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('Hello, World!');
    });
    
    it('should read file successfully', async () => {
      // Setup: write test file
      await fs.writeFile(testFile, 'Test content', 'utf8');
      
      const params = {
        path: testFile,
        encoding: 'utf8'
      };
      
      const result = await CustomTools.handleFileOperation(params);
      
      expect(result.success).toBe(true);
      expect(result.data.operation).toBe('read');
      expect(result.data.content).toBe('Test content');
    });
    
    it('should handle file not found error', async () => {
      const params = {
        path: '/nonexistent/file.txt',
        encoding: 'utf8'
      };
      
      const result = await CustomTools.handleFileOperation(params);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FILE_OPERATION_ERROR');
    });
    
    it('should validate input parameters', async () => {
      const params = {
        // Missing required 'path' parameter
        content: 'Hello'
      };
      
      const result = await CustomTools.handleFileOperation(params);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FILE_OPERATION_ERROR');
    });
  });
  
  describe('handleApiRequest', () => {
    it('should make GET request successfully', async () => {
      const params = {
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET',
        timeout: 5000
      };
      
      const result = await CustomTools.handleApiRequest(params);
      
      expect(result.success).toBe(true);
      expect(result.data.status).toBe(200);
      expect(result.data.data).toHaveProperty('id');
    });
    
    it('should handle network errors', async () => {
      const params = {
        url: 'https://nonexistent-domain-12345.com',
        method: 'GET',
        timeout: 1000
      };
      
      const result = await CustomTools.handleApiRequest(params);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('API_REQUEST_ERROR');
    });
  });
});
```

### Integration Testing

Test your MCP server integration:

```typescript
// tests/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';

describe('MCP Server Integration', () => {
  let serverProcess: ChildProcess;
  let client: Client;
  let transport: StdioClientTransport;
  
  beforeAll(async () => {
    // Start the MCP server
    serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Create client and connect
    transport = new StdioClientTransport({
      stdin: serverProcess.stdout!,
      stdout: serverProcess.stdin!
    });
    
    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    await client.connect(transport);
  });
  
  afterAll(async () => {
    await client.close();
    serverProcess.kill();
  });
  
  it('should list available tools', async () => {
    const response = await client.listTools();
    
    expect(response.tools).toHaveLength(3);
    expect(response.tools.map(t => t.name)).toEqual([
      'file_operation',
      'api_request',
      'database_query'
    ]);
  });
  
  it('should execute file_operation tool', async () => {
    const response = await client.callTool({
      name: 'file_operation',
      arguments: {
        path: '/tmp/test.txt',
        content: 'Integration test content'
      }
    });
    
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    
    const result = JSON.parse(response.content[0].text);
    expect(result.success).toBe(true);
  });
});
```

### Debugging Tools

Implement debugging utilities:

```typescript
// src/debug.ts
export class DebugLogger {
  private static instance: DebugLogger;
  private debugMode: boolean;
  
  private constructor() {
    this.debugMode = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }
  
  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }
  
  log(message: string, data?: any) {
    if (this.debugMode) {
      console.error(`[DEBUG] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.error(JSON.stringify(data, null, 2));
      }
    }
  }
  
  error(message: string, error?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  }
  
  performance(label: string, fn: () => Promise<any>) {
    return async (...args: any[]) => {
      const start = Date.now();
      try {
        const result = await fn.apply(this, args);
        const duration = Date.now() - start;
        this.log(`${label} completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        this.error(`${label} failed after ${duration}ms`, error);
        throw error;
      }
    };
  }
}

// Usage in tools
const logger = DebugLogger.getInstance();

export async function debuggedFileOperation(params: unknown) {
  logger.log('File operation started', { params });
  
  try {
    const result = await CustomTools.handleFileOperation(params);
    logger.log('File operation completed', { result });
    return result;
  } catch (error) {
    logger.error('File operation failed', error);
    throw error;
  }
}
```

### Manual Testing

Create scripts for manual testing:

```bash
#!/bin/bash
# test-server.sh

echo "Testing custom MCP server..."

# Start server in background
node dist/index.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Test with Claude Code CLI
echo "Testing file operation..."
claude --mcp-config test-config.json -p "Use the file_operation tool to read package.json"

echo "Testing API request..."
claude --mcp-config test-config.json -p "Use the api_request tool to fetch data from https://api.github.com/users/octocat"

echo "Testing database query..."
claude --mcp-config test-config.json -p "Use the database_query tool to select all users"

# Clean up
kill $SERVER_PID
echo "Testing complete"
```

## Best Practices

### Tool Security

#### Input Validation
```typescript
// Always validate and sanitize inputs
function validateFilePath(path: string): string {
  // Prevent directory traversal
  const normalizedPath = path.normalize(path);
  if (normalizedPath.includes('..')) {
    throw new Error('Directory traversal not allowed');
  }
  
  // Ensure path is within allowed directory
  const allowedRoot = '/workspace';
  if (!normalizedPath.startsWith(allowedRoot)) {
    throw new Error('Access denied: path outside allowed directory');
  }
  
  return normalizedPath;
}

// Sanitize SQL queries
function sanitizeQuery(query: string): string {
  // Remove dangerous SQL keywords
  const dangerous = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
  const upperQuery = query.toUpperCase();
  
  for (const keyword of dangerous) {
    if (upperQuery.includes(keyword)) {
      throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
    }
  }
  
  return query;
}
```

#### Authentication and Authorization
```typescript
// Implement role-based access control
interface UserContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

function checkPermission(user: UserContext, requiredPermission: string): boolean {
  return user.permissions.includes(requiredPermission) || 
         user.roles.includes('admin');
}

async function secureToolHandler(params: unknown, user: UserContext) {
  // Check permissions before executing
  if (!checkPermission(user, 'file:write')) {
    throw new Error('Insufficient permissions');
  }
  
  // Audit log
  console.log(`User ${user.userId} executed tool with params:`, params);
  
  // Execute tool
  return await toolImplementation(params);
}
```

#### Rate Limiting
```typescript
// Implement rate limiting
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  isAllowed(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    
    return true;
  }
}

const rateLimiter = new RateLimiter();

async function rateLimitedTool(params: unknown, userId: string) {
  if (!rateLimiter.isAllowed(userId, 10, 60000)) { // 10 requests per minute
    throw new Error('Rate limit exceeded');
  }
  
  return await toolImplementation(params);
}
```

### Performance Optimization

#### Caching
```typescript
// Implement caching for expensive operations
class ToolCache {
  private cache = new Map<string, { data: any; expires: number }>();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }
}

const cache = new ToolCache();

async function cachedApiRequest(params: { url: string }) {
  const cacheKey = `api:${params.url}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Make request
  const result = await makeApiRequest(params);
  
  // Cache result for 5 minutes
  cache.set(cacheKey, result, 5 * 60 * 1000);
  
  return result;
}
```

#### Connection Pooling
```typescript
// Database connection pooling
import { Pool } from 'pg';

class DatabaseManager {
  private pool: Pool;
  
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }
  
  async close() {
    await this.pool.end();
  }
}
```

#### Async Processing
```typescript
// Handle long-running operations asynchronously
class TaskQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    
    this.processing = false;
  }
}

const taskQueue = new TaskQueue();

async function longRunningTool(params: unknown) {
  return await taskQueue.add(async () => {
    // Expensive operation
    return await performExpensiveOperation(params);
  });
}
```

### Error Handling

#### Comprehensive Error Types
```typescript
// Define specific error types
export class ValidationError extends Error {
  constructor(message: string, public field: string, public value: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service: string, public statusCode?: number) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

// Centralized error handler
function handleError(error: unknown) {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        field: error.field,
        value: error.value
      }
    };
  }
  
  if (error instanceof AuthenticationError) {
    return {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: error.message
      }
    };
  }
  
  if (error instanceof AuthorizationError) {
    return {
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: error.message
      }
    };
  }
  
  if (error instanceof ExternalServiceError) {
    return {
      success: false,
      error: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: error.message,
        service: error.service,
        statusCode: error.statusCode
      }
    };
  }
  
  // Unknown error
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  };
}
```

#### Retry Logic
```typescript
// Implement retry logic for transient failures
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Usage
async function reliableApiCall(params: unknown) {
  return await withRetry(async () => {
    return await makeApiRequest(params);
  }, 3, 1000);
}
```

### Documentation

#### Tool Documentation Template
```typescript
/**
 * Tool: send_notification
 * 
 * Description:
 * Sends notifications to users via email or SMS with support for different
 * priority levels and delivery methods.
 * 
 * Parameters:
 * @param recipients - Array of email addresses or phone numbers
 * @param message - Notification message content (1-1000 characters)
 * @param type - Delivery method: 'email' or 'sms'
 * @param priority - Message priority: 'low', 'normal', or 'high' (default: 'normal')
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: {
 *     sent: number,        // Number of successful deliveries
 *     failed: number,      // Number of failed deliveries
 *     results: Array<{     // Detailed results for each recipient
 *       recipient: string,
 *       status: 'sent' | 'failed',
 *       messageId?: string,
 *       error?: string
 *     }>
 *   },
 *   message: string
 * }
 * 
 * Errors:
 * - VALIDATION_ERROR: Invalid input parameters
 * - NOTIFICATION_ERROR: Failed to send notification
 * - RATE_LIMIT_ERROR: Too many requests
 * 
 * Examples:
 * 
 * // Send email notification
 * {
 *   "recipients": ["user@example.com"],
 *   "message": "Your order has been shipped!",
 *   "type": "email",
 *   "priority": "normal"
 * }
 * 
 * // Send high-priority SMS
 * {
 *   "recipients": ["+1234567890"],
 *   "message": "Critical system alert",
 *   "type": "sms",
 *   "priority": "high"
 * }
 * 
 * Security:
 * - Requires 'notification:send' permission
 * - Rate limited to 100 requests per hour per user
 * - Message content is logged for audit purposes
 * 
 * Dependencies:
 * - Email service: SendGrid API
 * - SMS service: Twilio API
 */
```

---

## Next Steps

Now that you understand how to create custom MCP tools, explore these advanced topics:

- **[MCP Configuration Guide](./configuration.md)** - Set up your custom tools in Claude Code
- **[Security Best Practices](./security.md)** - Secure your custom tool implementations
- **[MCP Server Registry](https://mcp-registry.dev)** - Discover and share community tools
- **[API Reference](./api-reference.md)** - Complete MCP SDK documentation

### Community Resources

- **[GitHub Examples](https://github.com/anthropics/mcp-examples)** - Real-world custom tool implementations
- **[Discord Community](https://discord.gg/mcp)** - Get help and share your tools
- **[Tool Registry](https://mcp-tools.dev)** - Publish your tools for others to use

---

**Ready to build your first custom MCP tool?** Start with a simple file operation tool and gradually add more complex functionality as you become comfortable with the MCP SDK and tool development patterns.