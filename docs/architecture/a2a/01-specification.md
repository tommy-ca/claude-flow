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

## 9. Compliance and Standards

### 9.1 Protocol Standards
- JSON Schema for message validation
- OpenAPI 3.0 for REST APIs
- gRPC for high-performance communication
- WebSocket for real-time bidirectional communication

### 9.2 Data Standards
- ISO 8601 for timestamps
- UUID v4 for identifiers
- UTF-8 for text encoding
- Semantic versioning for protocol versions

## 10. Non-Functional Requirements

### 10.1 Observability
- Distributed tracing (OpenTelemetry)
- Metrics collection (Prometheus format)
- Structured logging (JSON logs)
- Health check endpoints

### 10.2 Extensibility
- Plugin architecture for new platforms
- Custom message types support
- Extensible capability model
- Hook system for customization

### 10.3 Backward Compatibility
- Protocol versioning support
- Graceful degradation
- Feature negotiation
- Migration paths between versions
