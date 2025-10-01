# A2A (Agent-to-Agent) Protocol

**Version:** 1.0.0
**Status:** Stable

## Overview

The A2A protocol defines the communication standards for agent-to-agent interactions in Claude Flow. It provides a comprehensive framework for message passing, shared memory, service discovery, and coordination between autonomous agents.

## Architecture

### Core Components

1. **Transport Layer** - Message envelope and routing
2. **Memory Protocol** - Shared state and coordination
3. **Service Discovery** - Agent registry and capability matching
4. **Task Orchestration** - Distributed task execution
5. **Event System** - Publish/subscribe notifications

## Directory Structure

```
src/a2a/
├── types/                    # TypeScript type definitions
│   ├── core-messages.ts     # Core message types
│   ├── memory-protocol.ts   # Memory operations
│   └── service-discovery.ts # Service registry
├── schemas/                  # JSON Schema definitions
│   ├── message-schema.json  # Message validation
│   └── error-codes.json     # Error code registry
├── protocols/                # Protocol specifications
│   └── versioning.ts        # Version negotiation
└── examples/                 # Example implementations
    └── example-messages.ts  # Common scenarios
```

## Key Features

### 1. Message Envelope

All A2A messages use a standardized envelope:

```typescript
interface MessageEnvelope<T> {
  version: string;              // Protocol version
  type: MessageType;            // Message type
  messageId: string;            // Unique ID (UUID)
  correlationId?: string;       // Request/response correlation

  from: AgentAddress;           // Source agent
  to: AgentAddress;             // Destination agent(s)

  priority: MessagePriority;    // QoS priority (0-4)
  timestamp: number;            // Unix timestamp

  // Distributed tracing
  traceId?: string;
  spanId?: string;

  payload: T;                   // Message payload
}
```

### 2. Message Types

- **Registration**: `REGISTER`, `DEREGISTER`, `REGISTER_ACK`
- **Capability**: `CAPABILITY_ADVERTISE`, `CAPABILITY_QUERY`, `CAPABILITY_RESPONSE`
- **Tasks**: `TASK_REQUEST`, `TASK_RESPONSE`, `TASK_STATUS`, `TASK_CANCEL`
- **State**: `STATE_SYNC`, `STATE_QUERY`, `STATE_UPDATE`
- **Events**: `EVENT_NOTIFY`, `EVENT_SUBSCRIBE`, `EVENT_UNSUBSCRIBE`
- **Health**: `HEARTBEAT`, `HEALTH_CHECK`, `HEALTH_RESPONSE`
- **Errors**: `ERROR`

### 3. Priority Levels

```typescript
enum MessagePriority {
  CRITICAL = 0,    // System-critical (health, errors)
  HIGH = 1,        // Important tasks
  MEDIUM = 2,      // Standard operations
  LOW = 3,         // Background sync
  BULK = 4         // Batch operations
}
```

### 4. Agent Addressing

```typescript
interface AgentAddress {
  agentId: string;      // Unique agent ID
  swarmId?: string;     // Swarm/group ID
  nodeId?: string;      // Physical node ID
  namespace?: string;   // Logical namespace
}
```

## Common Scenarios

### Agent Registration

```typescript
// 1. Agent registers with registry
const registration: MessageEnvelope<RegisterMessage> = {
  version: '1.0.0',
  type: MessageType.REGISTER,
  messageId: uuid(),
  from: { agentId: 'agent-001' },
  to: { agentId: 'registry-service' },
  priority: MessagePriority.HIGH,
  timestamp: Date.now(),
  payload: {
    agent: { /* metadata */ },
    capabilities: [ /* capabilities */ ]
  }
};

// 2. Registry acknowledges
const ack: MessageEnvelope<RegisterAckMessage> = {
  // ... envelope ...
  payload: {
    agentId: 'agent-001',
    success: true,
    assignedAddress: { /* address */ }
  }
};
```

### Task Execution

```typescript
// 1. Request task
const taskRequest: MessageEnvelope<TaskRequestMessage> = {
  // ... envelope ...
  correlationId: uuid(),
  payload: {
    taskId: 'task-001',
    taskType: 'rest-api-development',
    requiredCapabilities: ['coding'],
    input: { /* task data */ },
    timeoutMs: 300000
  }
};

// 2. Progress updates
const status: MessageEnvelope<TaskStatusMessage> = {
  // ... envelope ...
  correlationId: taskRequest.messageId,
  payload: {
    taskId: 'task-001',
    status: TaskState.IN_PROGRESS,
    progress: 0.5
  }
};

// 3. Task completion
const response: MessageEnvelope<TaskResponseMessage> = {
  // ... envelope ...
  correlationId: taskRequest.messageId,
  payload: {
    taskId: 'task-001',
    status: TaskState.COMPLETED,
    output: { /* results */ }
  }
};
```

### Shared Memory

```typescript
// Write to shared memory
const write: MessageEnvelope<MemoryWriteRequest> = {
  // ... envelope ...
  payload: {
    namespace: 'swarm/dev/project',
    key: 'api/schema',
    value: { /* data */ },
    ttl: 86400000,
    consistencyModel: ConsistencyModel.STRONG
  }
};

// Read from shared memory
const read: MessageEnvelope<MemoryReadRequest> = {
  // ... envelope ...
  payload: {
    namespace: 'swarm/dev/project',
    key: 'api/schema',
    consistencyModel: ConsistencyModel.CAUSAL
  }
};
```

### Service Discovery

```typescript
// Query for agents
const query: MessageEnvelope<CapabilityQueryMessage> = {
  // ... envelope ...
  payload: {
    requiredCapabilities: ['rest-api-development'],
    minSuccessRate: 0.90,
    maxLatencyMs: 10000
  }
};

// Load balancing
const selection: MessageEnvelope<AgentSelectionRequest> = {
  // ... envelope ...
  payload: {
    requiredCapabilities: ['coding'],
    strategy: LoadBalancingStrategy.LEAST_LOADED,
    count: 1
  }
};
```

## Memory Protocol

### Consistency Models

- **STRONG**: Linearizability (immediate consistency)
- **SEQUENTIAL**: Sequential consistency
- **CAUSAL**: Causal consistency (preserves causality)
- **EVENTUAL**: Eventual consistency
- **WEAK**: Weak consistency

### Operations

- **Basic**: `READ`, `WRITE`, `UPDATE`, `DELETE`
- **Batch**: `BATCH_READ`, `BATCH_WRITE`
- **Transactions**: `BEGIN`, `COMMIT`, `ROLLBACK`
- **Locking**: `LOCK_ACQUIRE`, `LOCK_RELEASE`
- **Cache**: `CACHE_INVALIDATE`, `CACHE_SYNC`

### Namespace Isolation

```typescript
interface NamespaceConfig {
  namespace: string;
  owner: AgentAddress;
  isolation: NamespaceIsolation;  // PRIVATE, SHARED, PUBLIC
  permissions: NamespacePermission[];
  maxKeys?: number;
  defaultTtl?: number;
}
```

## Error Handling

### Error Code Format

`A2A-<CATEGORY>-<NUMBER>`

Categories:
- **P**: Protocol errors
- **R**: Routing errors
- **C**: Capability errors
- **T**: Task errors
- **M**: Memory errors
- **REG**: Registry errors
- **AUTH**: Authentication errors
- **RL**: Rate limiting errors
- **SYS**: System errors

### Example Errors

```typescript
// Task timeout
{
  code: 'A2A-T-002',
  message: 'Task timeout',
  retryable: true,
  retryAfterMs: 60000
}

// Memory version mismatch
{
  code: 'A2A-M-004',
  message: 'Version mismatch (optimistic lock)',
  retryable: true
}

// Agent not found
{
  code: 'A2A-R-001',
  message: 'Agent not found',
  retryable: true
}
```

## Version Negotiation

### Supported Versions

- **Current**: 1.0.0
- **Status**: Stable
- **Compatibility**: 1.0.0

### Version Negotiation Flow

```typescript
// Client requests negotiation
const request: VersionNegotiationRequest = {
  supportedVersions: ['1.0.0'],
  preferredVersion: '1.0.0',
  features: ['core-messaging', 'task-orchestration']
};

// Server responds
const response: VersionNegotiationResponse = {
  selectedVersion: '1.0.0',
  serverFeatures: ['core-messaging', 'task-orchestration', 'shared-memory']
};
```

## Load Balancing Strategies

- **ROUND_ROBIN**: Distribute evenly across agents
- **LEAST_LOADED**: Select agent with lowest load
- **WEIGHTED**: Weighted distribution based on capacity
- **RANDOM**: Random selection
- **CONSISTENT_HASH**: Consistent hashing for affinity
- **LATENCY_BASED**: Select by lowest latency
- **CAPABILITY_MATCH**: Best capability match

## Best Practices

### 1. Message Design

- Keep payloads small and focused
- Use correlation IDs for request/response
- Set appropriate priorities
- Include tracing information

### 2. Error Handling

- Always check for error responses
- Respect retry-after headers
- Implement exponential backoff
- Log errors with context

### 3. Memory Operations

- Use appropriate consistency models
- Implement optimistic locking
- Set reasonable TTLs
- Use namespaces for isolation

### 4. Service Discovery

- Cache registry results
- Monitor agent health
- Implement circuit breakers
- Use load balancing

### 5. Performance

- Batch operations when possible
- Use async patterns
- Monitor latency metrics
- Implement timeouts

## Security Considerations

### 1. Message Security

- Validate all incoming messages
- Check message signatures
- Encrypt sensitive payloads
- Implement rate limiting

### 2. Access Control

- Use namespace permissions
- Implement authentication
- Check authorization
- Audit access logs

### 3. Resource Limits

- Enforce message size limits
- Implement quotas
- Monitor resource usage
- Prevent DoS attacks

## Examples

See `/examples/example-messages.ts` for complete examples including:

- Agent registration flow
- Task execution lifecycle
- Memory operations
- Service discovery
- Event notifications
- Error handling
- Load balancing

## Protocol Extensions

The protocol supports custom extensions via:

1. Custom message types (namespaced)
2. Extension registration
3. Feature negotiation
4. Schema validation

```typescript
registerExtension({
  name: 'custom-feature',
  version: '1.0.0',
  namespace: 'com.example.custom',
  messageTypes: ['com.example.custom.action']
});
```

## Backward Compatibility

- Protocol uses semantic versioning
- Message adapters for version translation
- Feature detection and negotiation
- Migration guides for breaking changes

## References

- [Core Message Types](./types/core-messages.ts)
- [Memory Protocol](./types/memory-protocol.ts)
- [Service Discovery](./types/service-discovery.ts)
- [Error Codes](./schemas/error-codes.json)
- [Example Messages](./examples/example-messages.ts)

## Contributing

When extending the protocol:

1. Follow semantic versioning
2. Add comprehensive types
3. Update JSON schemas
4. Provide examples
5. Document changes
6. Consider backward compatibility

## License

Same as Claude Flow project license.
