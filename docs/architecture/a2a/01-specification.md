# A2A Protocol Integration - Specification Phase

## 1. Overview

This document defines the complete requirements for integrating Agent-to-Agent (A2A) protocol into claude-flow, enabling seamless multi-agent collaboration across platforms including Codex, Gemini-CLI, and OpenCode.

## 2. Multi-Agent Platform Support Requirements

### 2.1 Target Platforms

#### 2.1.1 Codex Integration
- **Platform**: Microsoft Codex Agent Framework
- **Requirements**:
  - Support for Codex agent lifecycle (spawn, pause, resume, terminate)
  - Integration with Codex capability model
  - Message format compatibility
  - Authentication via Codex tokens
  - Resource sharing through Codex infrastructure

#### 2.1.2 Gemini-CLI Integration
- **Platform**: Google Gemini CLI Agent System
- **Requirements**:
  - Support for Gemini agent types (researcher, coder, analyst)
  - Integration with Gemini's function calling
  - Streaming response handling
  - Google Cloud authentication
  - Memory sharing with Gemini context

#### 2.1.3 OpenCode Integration
- **Platform**: OpenCode Open-Source Agent Framework
- **Requirements**:
  - Support for OpenCode agent protocols
  - Plugin architecture compatibility
  - Event-driven communication model
  - Open authentication standards (OAuth2, API keys)
  - Extensible capability system

### 2.2 Cross-Platform Capabilities

- **Universal Agent Discovery**: Any platform can discover agents from other platforms
- **Protocol Negotiation**: Automatic protocol version and capability negotiation
- **Capability Translation**: Map platform-specific capabilities to A2A standard
- **Resource Coordination**: Unified resource allocation across platforms
- **Error Handling**: Consistent error codes and recovery strategies

## 3. A2A Protocol Message Schemas

### 3.1 Core Message Types

#### 3.1.1 Agent Advertisement Message
```json
{
  "$schema": "https://a2a-protocol.org/schemas/v1/agent-advertisement.json",
  "type": "agent.advertisement",
  "version": "1.0.0",
  "timestamp": "2025-10-01T00:00:00Z",
  "agent": {
    "id": "agent-uuid-v4",
    "name": "Research Agent",
    "platform": "claude-flow",
    "version": "2.5.0",
    "status": "available",
    "capabilities": [
      {
        "id": "research",
        "type": "core",
        "description": "Research and analysis",
        "parameters": {
          "maxTokens": 100000,
          "supportedLanguages": ["en", "es", "fr"],
          "specializations": ["academic", "technical", "market"]
        }
      }
    ],
    "resources": {
      "cpu": {"available": 80, "unit": "percent"},
      "memory": {"available": 4096, "unit": "MB"},
      "tokens": {"available": 1000000, "unit": "tokens"}
    },
    "protocols": {
      "supported": ["http", "websocket", "grpc"],
      "preferred": "websocket",
      "endpoints": {
        "http": "https://api.claude-flow.io/agents/agent-uuid/v1",
        "websocket": "wss://ws.claude-flow.io/agents/agent-uuid/v1",
        "grpc": "grpc://grpc.claude-flow.io:50051/agents/agent-uuid/v1"
      }
    },
    "authentication": {
      "methods": ["bearer", "oauth2", "api-key"],
      "required": true
    }
  }
}
```

#### 3.1.2 Task Request Message
```json
{
  "$schema": "https://a2a-protocol.org/schemas/v1/task-request.json",
  "type": "task.request",
  "version": "1.0.0",
  "messageId": "msg-uuid-v4",
  "timestamp": "2025-10-01T00:00:00Z",
  "source": {
    "agentId": "requesting-agent-uuid",
    "platform": "codex",
    "sessionId": "session-uuid"
  },
  "target": {
    "agentId": "target-agent-uuid",
    "platform": "claude-flow",
    "capabilityRequired": "research"
  },
  "task": {
    "id": "task-uuid-v4",
    "type": "research",
    "priority": "high",
    "description": "Research machine learning optimization techniques",
    "parameters": {
      "query": "latest ML optimization algorithms 2025",
      "depth": "comprehensive",
      "format": "structured",
      "maxResults": 50
    },
    "constraints": {
      "maxDuration": 300,
      "maxTokens": 50000,
      "deadline": "2025-10-01T01:00:00Z"
    },
    "context": {
      "projectId": "project-uuid",
      "previousTasks": ["task-uuid-1", "task-uuid-2"],
      "sharedMemoryKeys": ["project/context", "research/findings"]
    }
  },
  "callback": {
    "url": "https://api.codex.io/callbacks/task-uuid",
    "method": "POST",
    "authentication": {
      "type": "bearer",
      "token": "encrypted-token"
    }
  }
}
```

#### 3.1.3 Task Response Message
```json
{
  "$schema": "https://a2a-protocol.org/schemas/v1/task-response.json",
  "type": "task.response",
  "version": "1.0.0",
  "messageId": "msg-uuid-v4",
  "inReplyTo": "original-msg-uuid",
  "timestamp": "2025-10-01T00:05:00Z",
  "source": {
    "agentId": "responding-agent-uuid",
    "platform": "claude-flow"
  },
  "target": {
    "agentId": "requesting-agent-uuid",
    "platform": "codex"
  },
  "status": {
    "code": "success",
    "message": "Task completed successfully",
    "progress": 100
  },
  "result": {
    "taskId": "task-uuid-v4",
    "completedAt": "2025-10-01T00:05:00Z",
    "executionTime": 300,
    "tokensUsed": 45000,
    "data": {
      "findings": [...],
      "citations": [...],
      "confidence": 0.95
    },
    "artifacts": [
      {
        "id": "artifact-uuid",
        "type": "document",
        "format": "markdown",
        "url": "https://storage.claude-flow.io/artifacts/artifact-uuid",
        "size": 102400,
        "checksum": "sha256:..."
      }
    ],
    "metrics": {
      "accuracy": 0.95,
      "coverage": 0.88,
      "relevance": 0.92
    }
  },
  "nextActions": [
    {
      "type": "recommendation",
      "description": "Further analysis needed on neural architecture search",
      "suggestedAgent": "analysis-agent-uuid"
    }
  ]
}
```

#### 3.1.4 Memory Sync Message
```json
{
  "$schema": "https://a2a-protocol.org/schemas/v1/memory-sync.json",
  "type": "memory.sync",
  "version": "1.0.0",
  "messageId": "msg-uuid-v4",
  "timestamp": "2025-10-01T00:00:00Z",
  "source": {
    "agentId": "agent-uuid-1",
    "platform": "claude-flow"
  },
  "target": {
    "agentIds": ["agent-uuid-2", "agent-uuid-3"],
    "platform": "all",
    "broadcast": true
  },
  "operation": "update",
  "memory": {
    "namespace": "project/ml-optimization",
    "key": "research/findings/neural-arch",
    "value": {
      "type": "structured",
      "data": {
        "summary": "...",
        "details": {...}
      },
      "metadata": {
        "version": 2,
        "lastModified": "2025-10-01T00:00:00Z",
        "modifiedBy": "agent-uuid-1"
      }
    },
    "ttl": 3600,
    "conflictResolution": "last-write-wins",
    "syncStrategy": "immediate"
  }
}
```

#### 3.1.5 Event Notification Message
```json
{
  "$schema": "https://a2a-protocol.org/schemas/v1/event-notification.json",
  "type": "event.notification",
  "version": "1.0.0",
  "messageId": "msg-uuid-v4",
  "timestamp": "2025-10-01T00:00:00Z",
  "source": {
    "agentId": "agent-uuid",
    "platform": "claude-flow",
    "component": "task-orchestrator"
  },
  "event": {
    "type": "task.completed",
    "severity": "info",
    "category": "task-lifecycle",
    "data": {
      "taskId": "task-uuid",
      "result": "success",
      "metrics": {...}
    }
  },
  "subscribers": {
    "filter": {
      "eventTypes": ["task.completed"],
      "platforms": ["all"],
      "agentIds": []
    },
    "deliveryMode": "fanout"
  }
}
```

### 3.2 Protocol Contracts

#### 3.2.1 Message Envelope
All A2A messages MUST include:
- `$schema`: JSON Schema reference for validation
- `type`: Message type identifier
- `version`: Protocol version (semantic versioning)
- `messageId`: Unique message identifier (UUID v4)
- `timestamp`: ISO 8601 timestamp
- `source`: Source agent identification
- `target`: Target agent/platform identification

#### 3.2.2 Error Message Format
```json
{
  "$schema": "https://a2a-protocol.org/schemas/v1/error.json",
  "type": "error",
  "version": "1.0.0",
  "messageId": "msg-uuid-v4",
  "inReplyTo": "original-msg-uuid",
  "timestamp": "2025-10-01T00:00:00Z",
  "error": {
    "code": "A2A_ERR_404",
    "type": "AgentNotFound",
    "message": "Target agent not available",
    "details": {
      "requestedAgentId": "agent-uuid",
      "platform": "claude-flow"
    },
    "recoverable": true,
    "suggestedActions": [
      {
        "action": "retry",
        "after": 30,
        "maxAttempts": 3
      },
      {
        "action": "fallback",
        "agentId": "fallback-agent-uuid"
      }
    ]
  }
}
```

## 4. Agent Capability Advertisement

### 4.1 Capability Model

#### 4.1.1 Capability Categories
- **Core Capabilities**: Essential agent functions (research, coding, testing)
- **Specialized Capabilities**: Domain-specific skills (ML, security, DevOps)
- **Platform Capabilities**: Platform-specific features
- **Integration Capabilities**: External service integrations

#### 4.1.2 Capability Schema
```json
{
  "capability": {
    "id": "unique-capability-id",
    "type": "core | specialized | platform | integration",
    "name": "Human-readable name",
    "description": "Detailed description",
    "version": "1.0.0",
    "status": "available | limited | unavailable",
    "parameters": {
      "required": [
        {
          "name": "parameter-name",
          "type": "string | number | boolean | object | array",
          "description": "Parameter description",
          "validation": {
            "pattern": "regex",
            "min": 0,
            "max": 100,
            "enum": ["option1", "option2"]
          }
        }
      ],
      "optional": [...]
    },
    "constraints": {
      "maxConcurrent": 5,
      "maxDuration": 600,
      "maxTokens": 100000,
      "rateLimits": {
        "requestsPerMinute": 60,
        "requestsPerHour": 1000
      }
    },
    "quality": {
      "accuracy": 0.95,
      "reliability": 0.98,
      "averageResponseTime": 5.2
    },
    "dependencies": [
      {
        "capabilityId": "prerequisite-capability",
        "required": true
      }
    ]
  }
}
```

### 4.2 Capability Discovery

#### 4.2.1 Discovery Methods
1. **Active Advertisement**: Agents broadcast capabilities periodically
2. **Registry Query**: Query central capability registry
3. **Peer Discovery**: Request capabilities from known agents
4. **Service Discovery**: Use platform-specific service discovery

#### 4.2.2 Discovery Protocol
```
1. Agent joins network
2. Agent broadcasts AGENT_ADVERTISEMENT message
3. Registry updates agent catalog
4. Other agents receive advertisement
5. Interested agents establish direct connections
```

## 5. Memory Sharing and Synchronization

### 5.1 Memory Model

#### 5.1.1 Hierarchical Namespaces
```
/global                          # Cross-platform shared memory
  /project/{project-id}          # Project-scoped memory
    /context                     # Project context
    /agents                      # Agent-specific data
      /{agent-id}               # Individual agent memory
    /tasks                       # Task-related memory
      /{task-id}                # Task-specific data
    /results                     # Shared results
  /platform/{platform-name}      # Platform-specific memory
  /session/{session-id}          # Session-scoped memory
```

#### 5.1.2 Memory Entry Schema
```json
{
  "entry": {
    "namespace": "/global/project/proj-123/context",
    "key": "research-findings",
    "value": {
      "type": "json | binary | text",
      "data": "...",
      "encoding": "utf-8 | base64"
    },
    "metadata": {
      "version": 1,
      "created": "2025-10-01T00:00:00Z",
      "modified": "2025-10-01T00:00:00Z",
      "createdBy": "agent-uuid",
      "modifiedBy": "agent-uuid",
      "accessCount": 42,
      "size": 10240
    },
    "access": {
      "visibility": "public | private | restricted",
      "permissions": {
        "read": ["agent-uuid-1", "agent-uuid-2", "*"],
        "write": ["agent-uuid-1"],
        "delete": ["agent-uuid-1"]
      }
    },
    "lifecycle": {
      "ttl": 3600,
      "persistent": true,
      "expiresAt": "2025-10-01T01:00:00Z"
    },
    "synchronization": {
      "strategy": "immediate | eventual | manual",
      "conflictResolution": "last-write-wins | merge | manual",
      "replication": {
        "enabled": true,
        "minReplicas": 2,
        "platforms": ["claude-flow", "codex"]
      }
    }
  }
}
```

### 5.2 Synchronization Strategies

#### 5.2.1 Immediate Synchronization
- Changes propagate immediately to all replicas
- Strong consistency guarantee
- Higher latency, lower availability
- Use for critical shared state

#### 5.2.2 Eventual Consistency
- Changes propagate asynchronously
- Eventual consistency guarantee
- Lower latency, higher availability
- Use for non-critical shared data

#### 5.2.3 Conflict Resolution
```
1. Last-Write-Wins: Timestamp-based resolution
2. Merge: Application-specific merge logic
3. Manual: Require human intervention
4. Version Vector: Causal consistency tracking
```

### 5.3 Memory Operations

#### 5.3.1 Standard Operations
- `CREATE`: Create new memory entry
- `READ`: Read existing entry
- `UPDATE`: Update entry value
- `DELETE`: Delete entry
- `LIST`: List entries in namespace
- `WATCH`: Subscribe to entry changes

#### 5.3.2 Advanced Operations
- `TRANSACTION`: Multi-entry atomic operations
- `BATCH`: Batch multiple operations
- `SEARCH`: Query entries by criteria
- `SNAPSHOT`: Create point-in-time snapshot
- `RESTORE`: Restore from snapshot

## 6. Event-Driven Communication Model

### 6.1 Event Architecture

#### 6.1.1 Event Categories
- **Lifecycle Events**: Agent spawn, pause, resume, terminate
- **Task Events**: Task request, started, progress, completed, failed
- **Memory Events**: Create, update, delete, sync
- **System Events**: Resource allocation, errors, warnings
- **Custom Events**: Application-specific events

#### 6.1.2 Event Schema
```json
{
  "event": {
    "id": "event-uuid-v4",
    "type": "event.type.subtype",
    "timestamp": "2025-10-01T00:00:00Z",
    "source": {
      "agentId": "agent-uuid",
      "platform": "claude-flow",
      "component": "component-name"
    },
    "severity": "debug | info | warning | error | critical",
    "category": "lifecycle | task | memory | system | custom",
    "data": {
      "key": "value"
    },
    "correlation": {
      "traceId": "trace-uuid",
      "spanId": "span-uuid",
      "parentSpanId": "parent-span-uuid"
    },
    "metadata": {
      "tags": ["tag1", "tag2"],
      "labels": {"env": "production"}
    }
  }
}
```

### 6.2 Event Subscription Model

#### 6.2.1 Subscription Schema
```json
{
  "subscription": {
    "id": "sub-uuid-v4",
    "subscriberId": "agent-uuid",
    "filter": {
      "eventTypes": ["task.*", "memory.update"],
      "sources": {
        "platforms": ["claude-flow", "codex"],
        "agentIds": ["agent-uuid-1"],
        "components": ["task-orchestrator"]
      },
      "severity": ["warning", "error", "critical"],
      "customFilters": {
        "data.projectId": "proj-123"
      }
    },
    "delivery": {
      "mode": "push | pull",
      "endpoint": "https://api.example.com/events",
      "protocol": "http | websocket | grpc",
      "batching": {
        "enabled": true,
        "maxSize": 100,
        "maxWait": 5000
      },
      "retry": {
        "maxAttempts": 3,
        "backoff": "exponential",
        "initialDelay": 1000
      }
    },
    "status": "active | paused | cancelled"
  }
}
```

### 6.3 Event Processing

#### 6.3.1 Processing Guarantees
- **At-Most-Once**: Fire and forget, no guarantee
- **At-Least-Once**: Guaranteed delivery, possible duplicates
- **Exactly-Once**: Guaranteed single delivery (requires deduplication)

#### 6.3.2 Event Ordering
- **No Ordering**: Events may arrive out of order
- **Partition Ordering**: Events from same source ordered
- **Global Ordering**: All events globally ordered (expensive)

## 7. Security and Authentication Requirements

### 7.1 Authentication Methods

#### 7.1.1 Supported Methods
- **API Keys**: Simple, stateless authentication
- **OAuth 2.0**: Standard authorization framework
- **Bearer Tokens**: JWT-based authentication
- **Mutual TLS**: Certificate-based authentication
- **Platform-Specific**: Integration with platform auth

#### 7.1.2 Authentication Flow
```
1. Agent authenticates with A2A registry
2. Registry issues authentication token
3. Agent includes token in all messages
4. Receiving agents validate token with registry
5. Token refresh before expiration
```

### 7.2 Authorization Model

#### 7.2.1 Resource-Based Access Control
```json
{
  "authorization": {
    "subject": "agent-uuid",
    "resource": {
      "type": "agent | task | memory | capability",
      "id": "resource-uuid",
      "namespace": "global | project | platform"
    },
    "permissions": ["read", "write", "execute", "delete"],
    "conditions": {
      "time": {
        "after": "2025-10-01T00:00:00Z",
        "before": "2025-10-01T23:59:59Z"
      },
      "context": {
        "platform": ["claude-flow"],
        "projectId": "proj-123"
      }
    }
  }
}
```

### 7.3 Security Requirements

#### 7.3.1 Transport Security
- **Encryption**: TLS 1.3 for all communications
- **Certificate Validation**: Strict certificate checks
- **Perfect Forward Secrecy**: Ephemeral key exchange

#### 7.3.2 Message Security
- **Signing**: All messages digitally signed
- **Encryption**: End-to-end encryption option
- **Integrity**: Message tampering detection

#### 7.3.3 Audit Requirements
- Log all authentication attempts
- Log all authorization decisions
- Track message flow and transformations
- Monitor for anomalous behavior

## 8. Quality Attributes

### 8.1 Performance Requirements
- **Message Latency**: < 100ms p99 for same-platform
- **Throughput**: > 1000 messages/sec per agent
- **Memory Sync**: < 1s for immediate consistency
- **Discovery**: < 5s to find available agents

### 8.2 Reliability Requirements
- **Availability**: 99.9% uptime for A2A infrastructure
- **Message Delivery**: 99.99% successful delivery
- **Fault Tolerance**: Automatic failover and retry
- **Data Durability**: No message loss

### 8.3 Scalability Requirements
- **Agents**: Support 10,000+ concurrent agents
- **Platforms**: Support 10+ different platforms
- **Messages**: Handle 1M+ messages/hour
- **Memory**: Scale to 100GB+ shared memory

## 9. CLI Agent Communication

### 9.1 CLI Invocation Patterns

#### 9.1.1 Direct Invocation
```bash
# Execute CLI agent directly
codex-cli agent create --type researcher --name "Research Agent"

# Pass task via stdin
echo '{"task": "research", "query": "ML algorithms"}' | gemini-cli execute

# Pass task via arguments
cursor-cli run --task "write function" --language typescript
```

#### 9.1.2 Subprocess Management
CLI agents are spawned as child processes with controlled lifecycle:

```typescript
interface CLIProcessConfig {
  command: string;                    // CLI executable path
  args: string[];                     // Command arguments
  cwd: string;                        // Working directory
  env: Record<string, string>;        // Environment variables
  timeout: number;                    // Execution timeout (ms)
  maxMemory: number;                  // Memory limit (MB)
  shell: boolean;                     // Use shell execution
}
```

#### 9.1.3 Process Lifecycle
```
1. Spawn Process
   ├── Validate executable exists
   ├── Set working directory
   ├── Configure environment
   └── Start process with stdio pipes

2. Monitor Process
   ├── Track PID
   ├── Monitor resource usage
   ├── Handle stdout/stderr streams
   └── Watch for exit events

3. Terminate Process
   ├── Send SIGTERM (graceful)
   ├── Wait for exit (timeout)
   ├── Send SIGKILL if needed
   └── Clean up resources
```

### 9.2 Stdio Protocol Specifications

#### 9.2.1 Communication Channels
- **stdin**: Send commands and data to CLI agent
- **stdout**: Receive results and responses
- **stderr**: Capture errors and diagnostics

#### 9.2.2 Message Formats
```typescript
// JSON Lines (NDJSON) Protocol
interface StdioMessage {
  type: 'request' | 'response' | 'event' | 'error';
  id: string;                         // Message correlation ID
  timestamp: string;                  // ISO 8601
  payload: unknown;                   // Message content
}

// Streaming format (one JSON object per line)
{"type":"request","id":"msg-1","payload":{"task":"research"}}\n
{"type":"response","id":"msg-1","payload":{"result":"..."}}\n
```

#### 9.2.3 Error Handling
```typescript
// CLI-specific error codes
enum CLIErrorCode {
  PROCESS_SPAWN_FAILED = 'CLI_ERR_SPAWN',
  PROCESS_TIMEOUT = 'CLI_ERR_TIMEOUT',
  PROCESS_CRASHED = 'CLI_ERR_CRASH',
  INVALID_OUTPUT = 'CLI_ERR_OUTPUT',
  RESOURCE_EXCEEDED = 'CLI_ERR_RESOURCE',
}
```

### 9.3 Context Passing Strategies

#### 9.3.1 Stdin Context (Recommended)
Pass context as JSON via stdin for most operations:

```typescript
interface StdinContext {
  method: 'stdin';
  format: 'json' | 'ndjson';
  streaming: boolean;
}

// Example
const context = {
  agent: { id: 'agent-123', platform: 'claude-flow' },
  task: { id: 'task-456', type: 'research' },
  memory: { projectId: 'proj-789' }
};
process.stdin.write(JSON.stringify(context) + '\n');
```

#### 9.3.2 Temporary File Context
Use for large payloads (>1MB):

```typescript
interface TempFileContext {
  method: 'tempfile';
  path: string;                      // Temp file path
  format: 'json' | 'yaml';
  cleanup: boolean;                  // Auto-delete after use
}

// Example
const contextFile = '/tmp/a2a-context-abc123.json';
await fs.writeFile(contextFile, JSON.stringify(context));
spawn('gemini-cli', ['--context-file', contextFile]);
```

#### 9.3.3 Working Directory Context
Place context files in working directory:

```typescript
interface WorkingDirContext {
  method: 'workingdir';
  files: {
    context: '.a2a/context.json';
    memory: '.a2a/memory/';
    artifacts: '.a2a/artifacts/';
  };
}

// Example directory structure
project/
  .a2a/
    context.json          # Task and agent context
    memory/               # Shared memory entries
    artifacts/            # Task artifacts
```

#### 9.3.4 Environment Variable Context
Pass small metadata via environment:

```typescript
interface EnvContext {
  method: 'env';
  prefix: 'A2A_';
  variables: {
    A2A_AGENT_ID: string;
    A2A_PLATFORM: string;
    A2A_TASK_ID: string;
    A2A_SESSION_ID: string;
  };
}

// Example
const env = {
  A2A_AGENT_ID: 'agent-123',
  A2A_PLATFORM: 'gemini-cli',
  A2A_TASK_ID: 'task-456',
  A2A_SESSION_ID: 'session-789'
};
spawn('codex-cli', args, { env });
```

#### 9.3.5 Command Argument Context
Pass simple parameters as CLI arguments:

```typescript
interface ArgContext {
  method: 'args';
  mapping: Record<string, string>;
}

// Example
codex-cli execute \
  --agent-id agent-123 \
  --task-type research \
  --project proj-789
```

### 9.4 Session Management for CLI Agents

#### 9.4.1 Session Lifecycle
```typescript
interface CLISession {
  id: string;
  agentId: string;
  processId: number;
  startTime: string;
  lastActivity: string;
  state: 'active' | 'idle' | 'suspended';
  context: SessionContext;
}

interface SessionContext {
  memory: Map<string, unknown>;      // Session-scoped memory
  workingDir: string;                // Session workspace
  artifacts: string[];               // Generated artifacts
  metrics: SessionMetrics;           // Resource usage
}
```

#### 9.4.2 Session Persistence
```typescript
// Save session state for resume
interface SessionSnapshot {
  sessionId: string;
  timestamp: string;
  context: SessionContext;
  processState?: {
    cwd: string;
    env: Record<string, string>;
    checkpoint?: string;             // Application-level checkpoint
  };
}

// Restore session
async function resumeSession(snapshot: SessionSnapshot): Promise<CLISession> {
  // Restore working directory
  // Reinitialize environment
  // Resume or restart process
  // Restore context
}
```

#### 9.4.3 Session Pooling
```typescript
class CLISessionPool {
  private sessions: Map<string, CLISession>;
  private maxSessions: number = 10;

  async acquire(agentType: string): Promise<CLISession> {
    // Reuse idle session if available
    // Or spawn new session
    // Track in pool
  }

  async release(sessionId: string): Promise<void> {
    // Mark session as idle
    // Keep alive for reuse
    // Or terminate if pool full
  }

  async cleanup(): Promise<void> {
    // Terminate idle sessions after timeout
    // Preserve active sessions
  }
}
```

### 9.5 CLI-Specific Message Extensions

#### 9.5.1 Process Metadata
Add CLI process information to message envelope:

```json
{
  "$schema": "https://a2a-protocol.org/schemas/v1/task-request.json",
  "type": "task.request",
  "source": {
    "agentId": "agent-uuid",
    "platform": "gemini-cli",
    "cliMetadata": {
      "executable": "/usr/local/bin/gemini-cli",
      "version": "1.2.3",
      "processId": 12345,
      "sessionId": "session-uuid",
      "spawnedAt": "2025-10-01T00:00:00Z"
    }
  }
}
```

#### 9.5.2 Context Serialization Format
```json
{
  "contextStrategy": {
    "primary": "stdin",
    "fallback": "tempfile",
    "format": "json",
    "streaming": true,
    "compression": false
  },
  "contextData": {
    "inline": { /* data if small */ },
    "reference": "/tmp/context-abc.json" /* if large */
  }
}
```

#### 9.5.3 CLI Error Codes
```json
{
  "error": {
    "code": "CLI_ERR_PROCESS_TIMEOUT",
    "message": "CLI process exceeded 300s timeout",
    "details": {
      "processId": 12345,
      "command": "gemini-cli execute",
      "timeout": 300000,
      "elapsed": 300124,
      "lastOutput": "Processing request..."
    },
    "recoverable": true,
    "suggestedActions": [
      {
        "action": "retry",
        "parameters": { "timeout": 600000 }
      },
      {
        "action": "restart",
        "description": "Restart with increased timeout"
      }
    ]
  }
}
```

## 10. MCP Integration

### 10.1 MCP as A2A Transport Layer

#### 10.1.1 MCP Server as A2A Gateway
MCP servers can act as A2A protocol gateways, allowing agents to communicate via standardized MCP tools:

```typescript
// MCP tool for A2A agent discovery
{
  name: 'a2a_discover_agents',
  description: 'Discover agents across A2A-compatible platforms',
  parameters: {
    capabilities: ['research', 'coding'],
    platforms: ['codex', 'gemini-cli']
  }
}

// MCP tool for A2A task delegation
{
  name: 'a2a_delegate_task',
  description: 'Delegate task to discovered A2A agent',
  parameters: {
    agentId: 'agent-uuid',
    task: { type: 'research', description: '...' }
  }
}
```

#### 10.1.2 MCP Transport Implementation
```typescript
class MCPTransport implements ITransport {
  private mcpClient: MCPClient;

  async send(message: A2AMessage, destination: Destination): Promise<void> {
    // Convert A2A message to MCP tool call
    const toolCall = this.messageToToolCall(message);

    // Execute via MCP
    const result = await this.mcpClient.callTool(
      'a2a_send_message',
      toolCall
    );

    return result;
  }

  subscribe(filter: MessageFilter, handler: MessageHandler): Subscription {
    // Subscribe to MCP notifications
    return this.mcpClient.subscribeResource(
      `a2a://messages/${filter.eventTypes.join(',')}`,
      (message) => handler(this.toolCallToMessage(message))
    );
  }
}
```

#### 10.1.3 Benefits of MCP Integration
- **Standardization**: Leverage MCP's tool-calling conventions
- **Compatibility**: Work with existing MCP infrastructure
- **Simplicity**: No need for separate A2A server
- **Security**: Use MCP's authentication and authorization
- **Observability**: Benefit from MCP's logging and tracing

### 10.2 MCP Tools for A2A Operations

#### 10.2.1 Core A2A Tools
```typescript
// Agent discovery
mcp__claude-flow__a2a_discover
mcp__claude-flow__a2a_advertise

// Task delegation
mcp__claude-flow__a2a_delegate
mcp__claude-flow__a2a_task_status

// Memory operations
mcp__claude-flow__a2a_memory_read
mcp__claude-flow__a2a_memory_write
mcp__claude-flow__a2a_memory_sync

// Event operations
mcp__claude-flow__a2a_publish_event
mcp__claude-flow__a2a_subscribe_events
```

#### 10.2.2 CLI-Specific MCP Tools
```typescript
// CLI process management
mcp__claude-flow__cli_spawn_agent
mcp__claude-flow__cli_list_processes
mcp__claude-flow__cli_terminate

// CLI session management
mcp__claude-flow__cli_create_session
mcp__claude-flow__cli_resume_session
mcp__claude-flow__cli_cleanup_sessions
```

### 10.3 Use Cases

#### 10.3.1 When to Use MCP Transport
✅ **Use MCP when**:
- Working within claude-flow ecosystem
- Need rapid prototyping
- Want unified tool interface
- Require existing MCP features

❌ **Don't use MCP when**:
- Need maximum performance (use direct transport)
- Working with non-MCP platforms
- Require protocol-level control
- Need custom transport features

#### 10.3.2 Hybrid Approach
```typescript
// Use MCP for coordination, direct transport for data
class HybridTransport implements ITransport {
  private mcpTransport: MCPTransport;
  private directTransport: WebSocketTransport;

  async send(message: A2AMessage, destination: Destination): Promise<void> {
    if (message.payload.size < 1024 * 1024) { // 1MB
      // Small messages via MCP
      return this.mcpTransport.send(message, destination);
    } else {
      // Large messages via direct transport
      return this.directTransport.send(message, destination);
    }
  }
}
```

## 11. Compliance and Standards

### 11.1 Protocol Standards
- JSON Schema for message validation
- OpenAPI 3.0 for REST APIs
- gRPC for high-performance communication
- WebSocket for real-time bidirectional communication
- MCP protocol for tool-based communication

### 11.2 Data Standards
- ISO 8601 for timestamps
- UUID v4 for identifiers
- UTF-8 for text encoding
- Semantic versioning for protocol versions
- NDJSON for streaming CLI communication

### 11.3 CLI Standards
- POSIX-compliant process management
- Standard exit codes (0=success, 1=error, 2=misuse)
- Graceful signal handling (SIGTERM, SIGINT)
- Resource limit enforcement (ulimit, cgroups)

## 12. Non-Functional Requirements

### 12.1 Observability
- Distributed tracing (OpenTelemetry)
- Metrics collection (Prometheus format)
- Structured logging (JSON logs)
- Health check endpoints

### 12.2 Extensibility
- Plugin architecture for new platforms
- Custom message types support
- Extensible capability model
- Hook system for customization
- Custom CLI adapter templates

### 12.3 Backward Compatibility
- Protocol versioning support
- Graceful degradation
- Feature negotiation
- Migration paths between versions
- CLI interface versioning

### 12.4 CLI-Specific Requirements

#### 12.4.1 Performance
- Process spawn time: <500ms
- Context serialization: <100ms for <1MB
- Stdio throughput: >10MB/s
- Maximum concurrent CLI processes: 50

#### 12.4.2 Reliability
- Process crash detection: <5s
- Automatic restart on failure
- Resource leak prevention
- Zombie process cleanup

#### 12.4.3 Security
- Sandboxed CLI execution (optional)
- Environment variable filtering
- Command injection prevention
- Resource limit enforcement (CPU, memory, disk)
