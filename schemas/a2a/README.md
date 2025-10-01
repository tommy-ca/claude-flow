# A2A Protocol JSON Schema Validation

This directory contains comprehensive JSON Schema definitions and validation utilities for all Agent-to-Agent (A2A) protocol message types in claude-flow.

## Overview

The A2A protocol enables seamless multi-agent collaboration across platforms including Claude Flow, Codex, Gemini-CLI, and OpenCode. These schemas ensure message validity, type safety, and protocol compliance.

## Schema Files

### Core Schemas

- **`message-envelope.json`** - Base message envelope for all A2A communications
- **`agent-registration.json`** - Agent registration and capability advertisement
- **`task-request.json`** - Task request messages
- **`task-response.json`** - Task response and status messages
- **`memory-operations.json`** - Memory read/write/update/delete operations
- **`discovery-query.json`** - Service discovery and agent queries
- **`health-check.json`** - Health checks and heartbeat messages
- **`error-response.json`** - Standardized error responses

### Validation Utilities

- **`validator.ts`** - TypeScript validation functions and type guards
- **`schemas.test.ts`** - Comprehensive test suite

## Usage

### Basic Validation

```typescript
import {
  validateMessageEnvelope,
  validateTaskRequest,
  validateTaskResponse,
} from './schemas/a2a/validator.js';

// Validate a message envelope
const envelope = {
  version: '1.0.0',
  type: 'a2a.task.request',
  messageId: '550e8400-e29b-41d4-a716-446655440000',
  from: { agentId: 'agent-001' },
  to: { agentId: 'agent-002' },
  priority: 1,
  timestamp: Date.now(),
  payload: { /* task data */ }
};

const result = validateMessageEnvelope(envelope);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Type Guards

```typescript
import { isMessageEnvelope, isTaskRequest } from './schemas/a2a/validator.js';

function processMessage(data: unknown) {
  if (isMessageEnvelope(data)) {
    // TypeScript now knows data is a valid MessageEnvelope
    console.log('Message ID:', data.messageId);

    if (isTaskRequest(data.payload)) {
      // Process task request
      console.log('Task ID:', data.payload.taskId);
    }
  }
}
```

### Assertions

```typescript
import { assertValid } from './schemas/a2a/validator.js';

function handleTaskRequest(data: unknown) {
  // Throws if validation fails
  assertValid('task-request', data);

  // TypeScript knows data is valid here
  processTask(data);
}
```

### Memory Operations

```typescript
import { validateMemoryOperation } from './schemas/a2a/validator.js';

// Validate read request
const readRequest = {
  namespace: 'project/ml-optimization',
  key: 'research/findings',
  consistencyModel: 'strong'
};

const result = validateMemoryOperation(readRequest, 'read');

// Validate write request
const writeRequest = {
  namespace: 'project/ml-optimization',
  key: 'research/findings',
  value: { summary: 'Research completed' },
  ttl: 3600000,
  consistencyModel: 'eventual'
};

validateMemoryOperation(writeRequest, 'write');
```

## Schema Examples

### Message Envelope

```json
{
  "version": "1.0.0",
  "type": "a2a.task.request",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "from": {
    "agentId": "agent-001",
    "swarmId": "swarm-alpha",
    "namespace": "production"
  },
  "to": {
    "agentId": "agent-002",
    "swarmId": "swarm-beta"
  },
  "priority": 1,
  "ttl": 30000,
  "timestamp": 1696118400000,
  "traceId": "trace-xyz123",
  "spanId": "span-abc456",
  "payload": {
    "taskId": "task-001",
    "taskType": "research",
    "description": "Analyze data"
  }
}
```

### Agent Registration

```json
{
  "agent": {
    "agentId": "agent-researcher-001",
    "agentType": "researcher",
    "name": "Research Agent Alpha",
    "version": "2.5.0",
    "description": "Specialized research and analysis agent",
    "tags": ["research", "analysis", "academic"],
    "maxConcurrentTasks": 5,
    "maxMemoryMb": 2048
  },
  "capabilities": [
    {
      "name": "research",
      "version": "1.0.0",
      "description": "Research and information gathering",
      "averageLatencyMs": 5000,
      "maxLatencyMs": 30000,
      "successRate": 0.95,
      "tags": ["core", "research"]
    }
  ],
  "endpoints": [
    {
      "protocol": "https",
      "address": "api.example.com",
      "port": 443,
      "path": "/agents/researcher-001"
    }
  ]
}
```

### Task Request

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "taskType": "research",
  "description": "Research machine learning optimization techniques",
  "requiredCapabilities": ["research", "analysis"],
  "priority": 1,
  "input": {
    "query": "latest ML optimization algorithms 2025",
    "depth": "comprehensive",
    "maxResults": 50
  },
  "context": {
    "sessionId": "session-001",
    "workflowId": "660e8400-e29b-41d4-a716-446655440001",
    "memoryNamespace": "project/ml-research",
    "environment": "production"
  },
  "timeoutMs": 300000,
  "maxRetries": 3,
  "progressCallback": true
}
```

### Error Response

```json
{
  "errorCode": "A2A-R-404",
  "errorType": "not_found",
  "message": "Target agent not available",
  "details": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent 'agent-001' is not registered",
    "metadata": {
      "requestedAgentId": "agent-001",
      "platform": "claude-flow"
    }
  },
  "originalMessageId": "660e8400-e29b-41d4-a716-446655440001",
  "failedOperation": "route_message",
  "retryable": true,
  "retryAfterMs": 30000
}
```

## Error Code Ranges

The A2A protocol uses standardized error codes with the format `A2A-{CATEGORY}-{NUMBER}`:

- **A2A-P-xxx**: Protocol-level errors
  - `A2A-P-001`: Invalid message format
  - `A2A-P-002`: Unsupported protocol version
  - `A2A-P-003`: Missing required field

- **A2A-R-xxx**: Routing and addressing errors
  - `A2A-R-404`: Agent not found
  - `A2A-R-429`: Rate limit exceeded
  - `A2A-R-500`: Internal routing error
  - `A2A-R-503`: Agent unavailable

- **A2A-S-xxx**: Security and authentication errors
  - `A2A-S-401`: Authentication required
  - `A2A-S-403`: Permission denied
  - `A2A-S-498`: Token expired

- **A2A-M-xxx**: Memory protocol errors
  - `A2A-M-001`: Namespace not found
  - `A2A-M-002`: Key not found
  - `A2A-M-409`: Version conflict

- **A2A-T-xxx**: Task execution errors
  - `A2A-T-408`: Task timeout
  - `A2A-T-409`: Task conflict
  - `A2A-T-500`: Task execution failed

- **A2A-C-xxx**: Capability errors
  - `A2A-C-404`: Capability not found
  - `A2A-C-501`: Capability not implemented

## Validation Features

### Strict Validation
- All schemas use JSON Schema Draft 2020-12
- Strict mode enabled for maximum safety
- Type coercion disabled
- Additional properties not allowed (unless explicitly specified)

### Rich Error Messages
- Detailed validation errors with field paths
- Human-readable error messages
- Suggested fixes where applicable

### Performance
- Schema caching for fast validation
- Compiled validators for optimal performance
- Batch validation support

## Testing

Run the comprehensive test suite:

```bash
npm test schemas/a2a/schemas.test.ts
```

Tests cover:
- Valid message examples
- Invalid message examples
- Edge cases
- Type guards
- Assertion functions
- Error formatting

## Integration

### With TypeScript Types

The schemas are designed to match the TypeScript types in:
- `/src/a2a/types/core-messages.ts`
- `/src/a2a/types/memory-protocol.ts`
- `/src/a2a/types/service-discovery.ts`

### With A2A Transport Layer

```typescript
import { validateMessageEnvelope } from './schemas/a2a/validator.js';
import { A2ATransport } from './src/a2a/transport/index.js';

class ValidatingTransport extends A2ATransport {
  async send(envelope: unknown) {
    const result = validateMessageEnvelope(envelope);
    if (!result.valid) {
      throw new Error(`Invalid message: ${JSON.stringify(result.errors)}`);
    }

    await super.send(envelope);
  }
}
```

## Dependencies

- **ajv**: JSON Schema validator (v8.x)
- **ajv-formats**: Format validators for ajv

Install dependencies:

```bash
npm install ajv ajv-formats
```

## Best Practices

1. **Always validate incoming messages** before processing
2. **Use type guards** for type-safe message handling
3. **Cache validators** when validating multiple messages
4. **Handle validation errors gracefully** with proper error responses
5. **Include validation in CI/CD** to catch schema violations early
6. **Version schemas** alongside protocol versions

## Contributing

When adding new message types:

1. Create JSON schema file in this directory
2. Add validation function in `validator.ts`
3. Add comprehensive tests in `schemas.test.ts`
4. Update this README with examples
5. Ensure TypeScript types match schema exactly

## References

- [JSON Schema Specification](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [A2A Protocol Specification](/docs/architecture/a2a/01-specification.md)
- [A2A TypeScript Types](/src/a2a/types/)

## License

Part of claude-flow project. See main LICENSE file.
