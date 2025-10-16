# Unified Requirements Document: Claude Flow A2A Integration

**Version**: 1.0.0
**Date**: 2025-10-01
**Status**: Draft
**Authors**: Architecture Review Team

---

## Document Purpose

This document consolidates requirements for integrating Claude Flow with the Agent-to-Agent (A2A) protocol, enabling cross-platform multi-agent coordination. It synthesizes findings from:

- Claude Flow v2.5.0 architecture analysis
- A2A Protocol Specifications v1.0
- Integration Analysis Document
- CLI Adapter Implementation (Claude CLI)

---

## Executive Summary

**Integration Objective**: Enable Claude Flow agents to communicate and coordinate with agents from other platforms (Gemini, Codex, Cursor) using the A2A protocol while preserving Claude Flow's 2.8-4.4x performance advantage and 84.8% SWE-Bench solve rate.

**Approach**: Adapter-based integration using translation layers rather than core refactoring, maintaining backward compatibility with existing Claude Flow functionality.

**Effort Estimate**: 6-7 weeks, 3-4 developers
**Risk Level**: Medium (manageable with proper testing)
**Success Probability**: High (80% existing compatibility)

---

## Table of Contents

1. [Functional Requirements](#1-functional-requirements)
2. [Non-Functional Requirements](#2-non-functional-requirements)
3. [Interface Requirements](#3-interface-requirements)
4. [Data Requirements](#4-data-requirements)
5. [Integration Requirements](#5-integration-requirements)
6. [Testing Requirements](#6-testing-requirements)
7. [Security Requirements](#7-security-requirements)
8. [Performance Requirements](#8-performance-requirements)
9. [Compliance Requirements](#9-compliance-requirements)
10. [Dependencies](#10-dependencies)
11. [Acceptance Criteria](#11-acceptance-criteria)

---

## 1. Functional Requirements

### FR-1: Agent-to-Agent Message Exchange

**ID**: FR-1
**Priority**: Critical
**Status**: To Be Implemented

**Description**: Claude Flow agents must be able to send and receive A2A protocol messages to/from agents on other platforms.

**Requirements**:

- **FR-1.1**: Claude Flow agents SHALL translate internal `AgentState` to A2A `AgentAdvertisement` format
- **FR-1.2**: Claude Flow agents SHALL translate internal `Task` to A2A `TaskRequest/TaskResponse` format
- **FR-1.3**: Message translation SHALL preserve semantic meaning without data loss
- **FR-1.4**: Translation SHALL support bidirectional conversion (CF ↔ A2A)
- **FR-1.5**: Invalid messages SHALL be rejected with descriptive error messages
- **FR-1.6**: Message versioning SHALL support protocol evolution (v1.0, v1.1, v2.0)

**Acceptance Criteria**:
- [ ] Claude Flow agent can send `AgentAdvertisement` to external platform
- [ ] Claude Flow agent can receive and process `TaskRequest` from external platform
- [ ] Claude Flow agent can send `TaskResponse` with results
- [ ] Message validation catches 100% of schema violations
- [ ] All data fields map correctly between formats (verified by integration tests)

**Dependencies**: FR-3 (CLI Adapters), FR-5 (Transport Layer)

---

### FR-2: Cross-Platform Agent Discovery

**ID**: FR-2
**Priority**: Critical
**Status**: To Be Implemented

**Description**: Claude Flow must discover and advertise agents across platforms using A2A protocol.

**Requirements**:

- **FR-2.1**: Claude Flow SHALL advertise local agents to A2A registry
- **FR-2.2**: Claude Flow SHALL discover remote agents from other platforms
- **FR-2.3**: Agent capabilities SHALL be accurately represented in A2A format
- **FR-2.4**: Discovery SHALL support filtering by capability, status, and resource availability
- **FR-2.5**: Agent registry SHALL update dynamically as agents spawn/terminate
- **FR-2.6**: Discovery SHALL work with multiple transport mechanisms (MCP, HTTP, WebSocket)

**Acceptance Criteria**:
- [ ] Local agent spawning triggers A2A advertisement within 500ms
- [ ] Remote agents appear in Claude Flow's agent directory within 2s of advertisement
- [ ] Capability queries return accurate matches (100% precision)
- [ ] Agent status updates propagate within 1s
- [ ] Discovery works with at least 2 different transport mechanisms

**Dependencies**: FR-1 (Message Exchange), FR-5 (Transport Layer)

---

### FR-3: CLI Agent Platform Adapters

**ID**: FR-3
**Priority**: High
**Status**: Partially Implemented (Claude CLI working)

**Description**: Claude Flow must integrate CLI-based agents (Gemini, Codex, Cursor) using minimal adapter pattern.

**Requirements**:

- **FR-3.1**: Each CLI platform SHALL have a dedicated adapter class implementing `ICLIAdapter` interface
- **FR-3.2**: Adapters SHALL support non-interactive execution mode (JSON output)
- **FR-3.3**: Adapters SHALL support streaming responses for long-running tasks
- **FR-3.4**: Adapters SHALL extract usage metrics (tokens, cost, duration)
- **FR-3.5**: Adapters SHALL handle CLI errors gracefully with retry logic
- **FR-3.6**: Adapters SHALL auto-detect CLI installation path
- **FR-3.7**: Adapters SHALL validate CLI availability before spawning agents

**Current Status**:
- ✅ Claude CLI adapter: **COMPLETE** (200 lines, 6/6 tests passing)
- ⏳ Gemini CLI adapter: **BLOCKED** (API authentication errors)
- ⏳ Codex CLI adapter: **BLOCKED** (wrong base URL configuration)
- ⏳ Cursor CLI adapter: **NOT STARTED** (CLI not installed)

**Acceptance Criteria**:
- [x] Claude CLI adapter executes prompts and returns structured responses
- [x] Claude CLI adapter supports streaming with NDJSON parsing
- [x] Claude CLI adapter extracts usage metadata (tokens, cost)
- [ ] Gemini CLI adapter follows same pattern as Claude CLI
- [ ] Codex CLI adapter follows same pattern as Claude CLI
- [ ] All adapters pass real integration tests (NO MOCKS)
- [ ] Adapter selection is automatic based on agent type

**Dependencies**: FR-1 (Message Exchange), existing `src/cli-adapters/claude-cli.ts`

---

### FR-4: Task Orchestration Across Platforms

**ID**: FR-4
**Priority**: High
**Status**: To Be Implemented

**Description**: Claude Flow orchestrator must coordinate tasks across local and remote agents.

**Requirements**:

- **FR-4.1**: Orchestrator SHALL route tasks to best-fit agents (local or remote)
- **FR-4.2**: Task distribution SHALL consider agent capabilities, load, and health
- **FR-4.3**: Remote task execution SHALL use A2A `TaskRequest/TaskResponse` protocol
- **FR-4.4**: Task timeout and retry policies SHALL apply to both local and remote agents
- **FR-4.5**: Orchestrator SHALL maintain task execution history for auditing
- **FR-4.6**: Parallel task execution SHALL work across mixed local/remote agents

**Acceptance Criteria**:
- [ ] Task assigned to remote Gemini agent executes successfully
- [ ] Orchestrator selects Claude agent for coding, Gemini for research (capability-based)
- [ ] Task timeout triggers retry with fallback agent
- [ ] Mixed swarm (2 local, 2 remote) executes 4 parallel tasks correctly
- [ ] Task history includes remote agent execution details

**Dependencies**: FR-1 (Message Exchange), FR-2 (Discovery), FR-3 (CLI Adapters)

---

### FR-5: Transport Layer Abstraction

**ID**: FR-5
**Priority**: Medium
**Status**: To Be Implemented

**Description**: Support multiple transport mechanisms for A2A message delivery.

**Requirements**:

- **FR-5.1**: Transport layer SHALL support MCP (Model Context Protocol)
- **FR-5.2**: Transport layer SHALL support HTTP/REST
- **FR-5.3**: Transport layer SHALL support WebSocket for real-time streaming
- **FR-5.4**: Transport selection SHALL be configurable per agent/platform
- **FR-5.5**: Transport SHALL handle connection failures with automatic reconnection
- **FR-5.6**: Transport SHALL support message queuing for offline agents

**Acceptance Criteria**:
- [ ] Agent sends message via MCP successfully
- [ ] Agent sends message via HTTP REST successfully
- [ ] Agent sends streaming response via WebSocket successfully
- [ ] Connection failure triggers reconnection with exponential backoff
- [ ] Offline agent receives queued messages upon reconnection

**Dependencies**: FR-1 (Message Exchange)

---

### FR-6: Memory Synchronization

**ID**: FR-6
**Priority**: Medium
**Status**: To Be Implemented

**Description**: Synchronize distributed memory across platforms using A2A `MemorySync` protocol.

**Requirements**:

- **FR-6.1**: Memory updates SHALL propagate to remote agents via `MemorySync` messages
- **FR-6.2**: Memory conflicts SHALL be resolved using last-write-wins or CRDT
- **FR-6.3**: Memory synchronization SHALL be incremental (delta-based)
- **FR-6.4**: Memory SHALL support namespacing per swarm/session
- **FR-6.5**: Memory SHALL respect TTL (time-to-live) settings
- **FR-6.6**: Memory SHALL compress large payloads before transmission

**Acceptance Criteria**:
- [ ] Local agent updates memory, remote agent receives update within 2s
- [ ] Concurrent memory updates resolve without data loss
- [ ] Memory sync uses delta encoding (not full snapshots)
- [ ] Memory namespacing prevents cross-swarm leakage
- [ ] TTL expiration removes stale memory entries

**Dependencies**: FR-1 (Message Exchange), existing `src/memory/distributed-memory.ts`

---

### FR-7: Event Propagation

**ID**: FR-7
**Priority**: Low
**Status**: To Be Implemented

**Description**: Propagate agent lifecycle and task events across platforms.

**Requirements**:

- **FR-7.1**: Agent spawn/terminate events SHALL trigger A2A notifications
- **FR-7.2**: Task start/complete/fail events SHALL propagate to interested agents
- **FR-7.3**: Event subscriptions SHALL support filtering by type and agent ID
- **FR-7.4**: Event delivery SHALL be at-least-once with deduplication
- **FR-7.5**: Event history SHALL be queryable for debugging

**Acceptance Criteria**:
- [ ] Remote agent receives `agent.spawned` event for local agent
- [ ] Remote agent receives `task.completed` event with results
- [ ] Event subscription filters work correctly (only subscribed events received)
- [ ] Duplicate events are deduplicated
- [ ] Event history query returns last 100 events

**Dependencies**: FR-1 (Message Exchange), FR-5 (Transport Layer)

---

## 2. Non-Functional Requirements

### NFR-1: Performance Preservation

**ID**: NFR-1
**Priority**: Critical
**Status**: Design Constraint

**Description**: A2A integration must NOT degrade Claude Flow's existing performance characteristics.

**Requirements**:

- **NFR-1.1**: Message translation overhead SHALL be <5% of total task execution time
- **NFR-1.2**: Cross-platform task execution SHALL be <10% slower than local execution for equivalent tasks
- **NFR-1.3**: Agent discovery SHALL complete within 2 seconds for swarms of 50 agents
- **NFR-1.4**: Memory synchronization SHALL use <10% additional memory overhead
- **NFR-1.5**: Parallel agent spawning (10-20x improvement) SHALL be preserved

**Acceptance Criteria**:
- [ ] Benchmark: Local task execution baseline = 10s → A2A task execution ≤ 10.5s
- [ ] Benchmark: Agent spawning with A2A adapters = 340ms ± 50ms
- [ ] Benchmark: Discovery of 50 agents ≤ 2s
- [ ] Memory profiling: A2A components use ≤ 50MB additional RAM

**Testing**: Performance regression tests, profiling with `clinic.js`

---

### NFR-2: Reliability

**ID**: NFR-2
**Priority**: Critical
**Status**: Design Constraint

**Description**: System must maintain high reliability despite cross-platform complexity.

**Requirements**:

- **NFR-2.1**: System SHALL maintain 99.9% uptime (8.76 hours downtime/year)
- **NFR-2.2**: Remote agent failures SHALL NOT crash local orchestrator
- **NFR-2.3**: Message delivery SHALL be guaranteed (at-least-once semantics)
- **NFR-2.4**: System SHALL recover from network partitions within 30s
- **NFR-2.5**: Circuit breakers SHALL prevent cascade failures

**Acceptance Criteria**:
- [ ] Chaos testing: 10% random agent failures → orchestrator continues
- [ ] Network partition: system recovers within 30s
- [ ] Message delivery: 100% delivery confirmed (or error reported)
- [ ] Circuit breaker: opens after 5 consecutive failures, half-open after 60s

**Testing**: Chaos engineering, fault injection, long-running stability tests

---

### NFR-3: Scalability

**ID**: NFR-3
**Priority**: High
**Status**: Design Constraint

**Description**: System must scale to large multi-platform swarms.

**Requirements**:

- **NFR-3.1**: System SHALL support 100+ concurrent agents (local + remote)
- **NFR-3.2**: Message throughput SHALL be ≥ 1000 messages/second
- **NFR-3.3**: Agent discovery SHALL scale to 500+ advertised agents
- **NFR-3.4**: Memory synchronization SHALL scale to 10,000+ memory entries

**Acceptance Criteria**:
- [ ] Load test: 100 concurrent agents executing tasks simultaneously
- [ ] Load test: 1000 messages/sec sustained for 10 minutes
- [ ] Load test: Discovery query with 500 agents returns within 3s
- [ ] Load test: Memory sync with 10,000 entries completes within 5s

**Testing**: Load testing with `artillery`, `k6`

---

### NFR-4: Maintainability

**ID**: NFR-4
**Priority**: Medium
**Status**: Design Constraint

**Description**: Codebase must remain maintainable despite added complexity.

**Requirements**:

- **NFR-4.1**: A2A integration code SHALL follow SOLID principles
- **NFR-4.2**: Code coverage SHALL be ≥ 90% for A2A components
- **NFR-4.3**: API documentation SHALL be generated from TypeScript types
- **NFR-4.4**: Integration SHALL NOT increase cyclomatic complexity of existing modules
- **NFR-4.5**: A2A components SHALL be independently testable (dependency injection)

**Acceptance Criteria**:
- [ ] Code review: SOLID principles verified
- [ ] Coverage report: ≥ 90% coverage for `src/a2a/*`
- [ ] Documentation: API docs auto-generated with `typedoc`
- [ ] Static analysis: No increase in complexity metrics (SonarQube)

**Testing**: Code review, static analysis, coverage reports

---

### NFR-5: Security

**ID**: NFR-5
**Priority**: High
**Status**: Design Constraint

**Description**: Cross-platform communication must be secure.

**Requirements**:

- **NFR-5.1**: All A2A messages SHALL be authenticated (agent identity verified)
- **NFR-5.2**: All A2A messages SHALL be encrypted in transit (TLS 1.3)
- **NFR-5.3**: Agent authorization SHALL enforce capability-based access control
- **NFR-5.4**: Message payloads SHALL be validated against JSON schemas
- **NFR-5.5**: System SHALL prevent replay attacks (message nonces)

**Acceptance Criteria**:
- [ ] Security audit: All messages authenticated with JWT or equivalent
- [ ] Security audit: TLS 1.3 enforced for HTTP/WebSocket transports
- [ ] Penetration test: Unauthorized agent denied access
- [ ] Penetration test: Invalid message schema rejected
- [ ] Penetration test: Replay attack detected and blocked

**Testing**: Security audit, penetration testing

---

## 3. Interface Requirements

### IR-1: A2A Message Formats

**ID**: IR-1
**Priority**: Critical
**Status**: Specification Defined

**Description**: All A2A messages SHALL conform to JSON schemas defined in A2A Protocol Specification v1.0.

**Message Types**:

#### IR-1.1: AgentAdvertisement

```typescript
interface AgentAdvertisement {
  agent: {
    id: string;
    name: string;
    platform: string;  // 'claude-flow', 'gemini', 'codex', 'cursor'
    version: string;
    status: 'available' | 'busy' | 'offline' | 'error';
    capabilities: {
      type: AgentType[];
      skills: string[];
      languages?: string[];
      frameworks?: string[];
      maxComplexity?: number;
    };
    resources: {
      cpu: { available: number; unit: 'percent' | 'cores' };
      memory: { available: number; unit: 'MB' | 'GB' };
      maxConcurrentTasks?: number;
    };
    contact: {
      transport: 'mcp' | 'http' | 'websocket';
      endpoint: string;
    };
  };
  timestamp: string;  // ISO 8601
}
```

**Mapping from Claude Flow**:
```typescript
function toA2AAgent(cfAgent: AgentState): AgentAdvertisement {
  return {
    agent: {
      id: cfAgent.id.id,
      name: cfAgent.name,
      platform: 'claude-flow',
      version: '2.5.0',
      status: mapStatus(cfAgent.status),  // active → available, busy → busy
      capabilities: {
        type: [cfAgent.type],
        skills: cfAgent.capabilities.skills,
        languages: cfAgent.capabilities.languages,
        frameworks: cfAgent.capabilities.frameworks,
        maxComplexity: cfAgent.capabilities.maxComplexity
      },
      resources: {
        cpu: {
          available: 100 - cfAgent.workload * 100,
          unit: 'percent'
        },
        memory: {
          available: cfAgent.metrics.memoryUsage,
          unit: 'MB'
        },
        maxConcurrentTasks: cfAgent.capabilities.resourceLimits?.maxConcurrentTasks
      },
      contact: {
        transport: 'mcp',
        endpoint: `mcp://localhost:${process.env.MCP_PORT || 3000}/agents/${cfAgent.id.id}`
      }
    },
    timestamp: new Date().toISOString()
  };
}
```

#### IR-1.2: TaskRequest

```typescript
interface TaskRequest {
  task: {
    id: string;
    description: string;
    type: 'research' | 'coding' | 'testing' | 'review' | 'analysis' | 'optimization';
    priority: 'low' | 'medium' | 'high' | 'critical';
    requiredCapabilities?: {
      skills?: string[];
      languages?: string[];
      frameworks?: string[];
    };
    context?: {
      files?: { path: string; content: string }[];
      environment?: Record<string, string>;
      memory?: Record<string, any>;
    };
    constraints?: {
      timeout?: number;  // milliseconds
      maxTokens?: number;
      costLimit?: number;  // USD
    };
  };
  sender: {
    agentId: string;
    platform: string;
  };
  timestamp: string;
}
```

**Mapping from Claude Flow**:
```typescript
function toA2ATaskRequest(cfTask: Task, sender: AgentState): TaskRequest {
  return {
    task: {
      id: cfTask.id.id,
      description: cfTask.description,
      type: mapTaskType(cfTask.type),
      priority: cfTask.priority.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
      requiredCapabilities: {
        skills: cfTask.requirements?.requiredCapabilities,
        languages: cfTask.requirements?.languages,
        frameworks: cfTask.requirements?.frameworks
      },
      context: {
        files: cfTask.context?.files?.map(f => ({
          path: f.path,
          content: f.content
        })),
        environment: cfTask.context?.environment,
        memory: cfTask.context?.memory
      },
      constraints: {
        timeout: cfTask.timeout,
        maxTokens: cfTask.maxTokens,
        costLimit: cfTask.budget
      }
    },
    sender: {
      agentId: sender.id.id,
      platform: 'claude-flow'
    },
    timestamp: new Date().toISOString()
  };
}
```

#### IR-1.3: TaskResponse

```typescript
interface TaskResponse {
  task: {
    id: string;
    status: 'completed' | 'failed' | 'timeout' | 'rejected';
    result?: {
      output: string;
      files?: { path: string; content: string }[];
      metrics?: {
        duration: number;  // milliseconds
        tokensUsed?: number;
        costUsd?: number;
      };
    };
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  };
  agent: {
    id: string;
    platform: string;
  };
  timestamp: string;
}
```

**Mapping from Claude Flow**:
```typescript
function toA2ATaskResponse(cfTask: Task, agent: AgentState): TaskResponse {
  return {
    task: {
      id: cfTask.id.id,
      status: mapTaskStatus(cfTask.status),
      result: cfTask.status === 'completed' ? {
        output: cfTask.result?.output || '',
        files: cfTask.result?.files,
        metrics: {
          duration: cfTask.metrics.completionTime - cfTask.metrics.startTime,
          tokensUsed: cfTask.metrics.tokensUsed,
          costUsd: cfTask.metrics.cost
        }
      } : undefined,
      error: cfTask.status === 'failed' ? {
        code: cfTask.error?.code || 'TASK_FAILED',
        message: cfTask.error?.message || 'Task execution failed',
        details: cfTask.error
      } : undefined
    },
    agent: {
      id: agent.id.id,
      platform: 'claude-flow'
    },
    timestamp: new Date().toISOString()
  };
}
```

#### IR-1.4: MemorySync

```typescript
interface MemorySync {
  memory: {
    namespace: string;
    operations: Array<{
      type: 'set' | 'delete' | 'update';
      key: string;
      value?: any;
      ttl?: number;  // seconds
      version?: number;  // for conflict resolution
    }>;
  };
  sender: {
    agentId: string;
    platform: string;
  };
  timestamp: string;
}
```

---

### IR-2: CLI Adapter Interface

**ID**: IR-2
**Priority**: High
**Status**: Partially Defined (Claude CLI implemented)

**Description**: All CLI adapters SHALL implement a common interface for consistency.

```typescript
interface ICLIAdapter {
  /**
   * Execute a prompt and return structured response
   */
  execute(prompt: string): Promise<CLIResponse>;

  /**
   * Stream responses for long-running tasks
   */
  stream(prompt: string): AsyncIterator<string>;

  /**
   * Check if CLI is available and properly configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get CLI version and capabilities
   */
  getInfo(): Promise<CLIInfo>;
}

interface CLIResponse {
  content: string;
  sessionId: string;
  modelUsed: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
  durationMs: number;
  costUsd: number;
}

interface CLIInfo {
  name: string;
  version: string;
  path: string;
  supportedModels: string[];
  features: {
    streaming: boolean;
    jsonOutput: boolean;
    sessionTracking: boolean;
  };
}
```

**Reference Implementation**: `src/cli-adapters/claude-cli.ts`

---

### IR-3: Transport Adapter Interface

**ID**: IR-3
**Priority**: Medium
**Status**: To Be Defined

**Description**: Transport mechanisms SHALL implement a common interface.

```typescript
interface ITransport {
  /**
   * Send message to remote agent
   */
  send(message: A2AMessage, recipient: string): Promise<void>;

  /**
   * Receive messages (subscribe to incoming)
   */
  receive(handler: (message: A2AMessage) => void): void;

  /**
   * Connect to transport
   */
  connect(endpoint: string): Promise<void>;

  /**
   * Disconnect from transport
   */
  disconnect(): Promise<void>;

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'disconnected' | 'error';
}
```

---

## 4. Data Requirements

### DR-1: Agent Type Mapping

**ID**: DR-1
**Priority**: Critical
**Status**: Defined

**Description**: Map Claude Flow agent types to A2A standard types.

| Claude Flow Type | A2A Type | Description |
|-----------------|----------|-------------|
| `coordinator` | `coordinator` | Orchestrates multi-agent workflows |
| `researcher` | `research` | Gathers information and analyzes data |
| `coder` | `coding` | Writes and modifies code |
| `analyst` | `analysis` | Analyzes code, data, or system behavior |
| `tester` | `testing` | Creates and executes tests |
| `reviewer` | `review` | Reviews code quality and security |
| `architect` | `architecture` | Designs system architecture |
| `optimizer` | `optimization` | Optimizes performance and efficiency |
| `debugger` | `debugging` | Identifies and fixes bugs |
| `documenter` | `documentation` | Creates documentation |
| `deployer` | `deployment` | Handles deployment and infrastructure |
| `monitor` | `monitoring` | Monitors system health and metrics |
| `security` | `security` | Performs security analysis and audits |
| `data-engineer` | `data-engineering` | Manages data pipelines and ETL |
| `ml-engineer` | `ml-engineering` | Develops ML models and pipelines |
| `devops` | `devops` | Manages CI/CD and infrastructure |

**Implementation**: `src/a2a/adapters/capability-mapper.ts`

---

### DR-2: Task Status Mapping

**ID**: DR-2
**Priority**: High
**Status**: Defined

**Description**: Map Claude Flow task states to A2A task statuses.

| Claude Flow Status | A2A Status | Description |
|-------------------|------------|-------------|
| `pending` | N/A | Not sent to remote (local only) |
| `assigned` | N/A | Not sent to remote (local only) |
| `in_progress` | N/A | In-flight, not completed yet |
| `completed` | `completed` | Task finished successfully |
| `failed` | `failed` | Task execution failed |
| `cancelled` | `rejected` | Task was cancelled/rejected |
| `blocked` | `rejected` | Task was blocked (map to rejected) |

**Note**: Only terminal states (`completed`, `failed`, `cancelled`, `blocked`) generate `TaskResponse` messages.

---

### DR-3: Memory Namespace Convention

**ID**: DR-3
**Priority**: Medium
**Status**: To Be Defined

**Description**: Define namespace conventions for cross-platform memory synchronization.

**Proposed Convention**:

```typescript
// Format: {platform}.{swarm-id}.{agent-id}.{key}
const namespaceFormat = '{platform}.{swarmId}.{agentId}.{key}';

// Examples:
const examples = [
  'claude-flow.swarm-abc123.agent-001.code-analysis',
  'gemini.swarm-abc123.agent-002.research-results',
  'codex.swarm-def456.agent-003.generated-code'
];
```

**Namespace Scopes**:
- **Platform**: `{platform}.*` - All memory for a platform
- **Swarm**: `{platform}.{swarmId}.*` - All memory for a swarm
- **Agent**: `{platform}.{swarmId}.{agentId}.*` - All memory for an agent
- **Key**: Full namespace - Specific memory entry

**Access Control**:
- Agents can READ any namespace
- Agents can WRITE only to their own namespace (`{platform}.{swarmId}.{agentId}.*`)
- Coordinators can WRITE to swarm namespace (`{platform}.{swarmId}.*`)

---

### DR-4: Event Type Mapping

**ID**: DR-4
**Priority**: Low
**Status**: To Be Defined

**Description**: Map Claude Flow events to A2A event types.

| Claude Flow Event | A2A Event | Payload |
|------------------|-----------|---------|
| `AGENT_SPAWNED` | `agent.created` | `AgentAdvertisement` |
| `AGENT_TERMINATED` | `agent.deleted` | `{ agentId, platform }` |
| `AGENT_STATUS_CHANGED` | `agent.status_changed` | `{ agentId, status }` |
| `TASK_ASSIGNED` | `task.assigned` | `TaskRequest` |
| `TASK_STARTED` | `task.started` | `{ taskId, agentId }` |
| `TASK_COMPLETED` | `task.completed` | `TaskResponse` |
| `TASK_FAILED` | `task.failed` | `TaskResponse` (with error) |
| `MEMORY_UPDATED` | `memory.updated` | `MemorySync` |
| `SWARM_CREATED` | `swarm.created` | `{ swarmId, topology }` |
| `SWARM_DISBANDED` | `swarm.disbanded` | `{ swarmId }` |

---

## 5. Integration Requirements

### IR-1: Integration Architecture

**ID**: IR-1
**Priority**: Critical
**Status**: Designed

**Description**: A2A integration SHALL use adapter pattern to minimize impact on existing codebase.

**Proposed File Structure**:

```
src/
├── a2a/                              # NEW: A2A integration layer
│   ├── protocol/
│   │   ├── message-translator.ts     # CF ↔ A2A message translation
│   │   ├── version-negotiator.ts     # Protocol version negotiation
│   │   ├── schema-validator.ts       # JSON schema validation
│   │   └── types.ts                  # A2A TypeScript types
│   ├── adapters/
│   │   ├── base-adapter.ts           # Abstract base class
│   │   ├── claude-flow-adapter.ts    # CF → A2A adapter
│   │   ├── cli-agent-adapter.ts      # CLI agents → A2A adapter
│   │   └── capability-mapper.ts      # Agent type/capability mapping
│   ├── registry/
│   │   ├── agent-advertiser.ts       # Publish local agents to A2A
│   │   ├── discovery-client.ts       # Discover remote agents
│   │   └── capability-index.ts       # In-memory capability index
│   ├── transport/
│   │   ├── base-transport.ts         # ITransport interface
│   │   ├── mcp-transport.ts          # MCP implementation
│   │   ├── http-transport.ts         # HTTP REST implementation
│   │   └── websocket-transport.ts    # WebSocket implementation
│   ├── coordination/
│   │   ├── task-router.ts            # Route tasks to local/remote agents
│   │   ├── load-balancer.ts          # Balance load across platforms
│   │   └── health-monitor.ts         # Monitor remote agent health
│   └── security/
│       ├── authenticator.ts          # Agent authentication (JWT)
│       ├── authorizer.ts             # Capability-based authorization
│       └── encryption.ts             # Message encryption utilities
├── cli-adapters/                     # EXISTING
│   ├── claude-cli.ts                 # ✅ Working (200 lines, 6/6 tests)
│   ├── gemini-cli.ts                 # TODO: Fix API auth
│   ├── codex-cli.ts                  # TODO: Fix base URL
│   └── cursor-cli.ts                 # TODO: Implement when CLI available
├── core/
│   ├── orchestrator.ts               # MODIFY: Add A2A routing
│   └── ...
├── agents/
│   ├── agent-manager.ts              # MODIFY: Add A2A advertisement
│   └── ...
├── swarm/
│   ├── coordinator.ts                # MODIFY: Add remote agent support
│   └── ...
└── memory/
    ├── distributed-memory.ts         # MODIFY: Add A2A memory sync
    └── ...
```

**Design Principles**:
- ✅ **Adapter Pattern**: New A2A code in `src/a2a/`, existing code minimally modified
- ✅ **Dependency Injection**: A2A adapters injected into core components (testable)
- ✅ **Interface Segregation**: Small, focused interfaces (ITransport, IAdapter)
- ✅ **Open/Closed**: Core components open for extension (via adapters), closed for modification

---

### IR-2: Integration Points

**ID**: IR-2
**Priority**: Critical
**Status**: Designed

**Description**: Define where A2A integration touches existing Claude Flow components.

#### Integration Point 1: Orchestrator

**File**: `src/core/orchestrator.ts`
**Change**: Add A2A task routing

```typescript
// BEFORE
class Orchestrator {
  async assignTask(task: Task): Promise<void> {
    const agent = this.selectBestAgent(task);
    await this.agentManager.assignTask(agent.id, task);
  }
}

// AFTER
class Orchestrator {
  constructor(
    private agentManager: IAgentManager,
    private a2aRouter: TaskRouter  // NEW: Injected dependency
  ) {}

  async assignTask(task: Task): Promise<void> {
    // NEW: Check if remote agent is better fit
    const bestAgent = await this.a2aRouter.findBestAgent(task);

    if (bestAgent.platform === 'claude-flow') {
      // Local agent - existing path
      await this.agentManager.assignTask(bestAgent.id, task);
    } else {
      // Remote agent - NEW A2A path
      await this.a2aRouter.routeToRemoteAgent(task, bestAgent);
    }
  }
}
```

**Testing Impact**: Add integration tests for remote task routing, maintain 100% existing test coverage.

---

#### Integration Point 2: Agent Manager

**File**: `src/agents/agent-manager.ts`
**Change**: Advertise agents to A2A registry

```typescript
// BEFORE
class AgentManager {
  async spawnAgent(config: AgentConfig): Promise<AgentState> {
    const agent = await this.createAgent(config);
    this.agents.set(agent.id, agent);
    this.eventEmitter.emit('AGENT_SPAWNED', agent);
    return agent;
  }
}

// AFTER
class AgentManager {
  constructor(
    private agentFactory: IAgentFactory,
    private a2aAdvertiser: AgentAdvertiser  // NEW: Injected dependency
  ) {}

  async spawnAgent(config: AgentConfig): Promise<AgentState> {
    const agent = await this.createAgent(config);
    this.agents.set(agent.id, agent);
    this.eventEmitter.emit('AGENT_SPAWNED', agent);

    // NEW: Advertise to A2A registry
    await this.a2aAdvertiser.advertise(agent);

    return agent;
  }
}
```

**Testing Impact**: Add tests for A2A advertisement, mock `AgentAdvertiser` in unit tests.

---

#### Integration Point 3: Memory Manager

**File**: `src/memory/distributed-memory.ts`
**Change**: Sync memory updates via A2A

```typescript
// BEFORE
class DistributedMemory {
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
    await this.eventEmitter.emit('MEMORY_UPDATED', { key, value });
  }
}

// AFTER
class DistributedMemory {
  constructor(
    private cache: ICache,
    private a2aMemorySync: MemorySynchronizer  // NEW: Injected dependency
  ) {}

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
    await this.eventEmitter.emit('MEMORY_UPDATED', { key, value });

    // NEW: Propagate to remote agents
    await this.a2aMemorySync.propagate({
      namespace: this.getNamespace(key),
      operations: [{ type: 'set', key, value, ttl }]
    });
  }
}
```

**Testing Impact**: Add tests for memory propagation, mock `MemorySynchronizer` in unit tests.

---

### IR-3: Backward Compatibility

**ID**: IR-3
**Priority**: High
**Status**: Design Requirement

**Description**: A2A integration SHALL NOT break existing Claude Flow functionality.

**Requirements**:

- **IR-3.1**: All existing unit tests SHALL pass without modification
- **IR-3.2**: All existing integration tests SHALL pass without modification
- **IR-3.3**: A2A features SHALL be opt-in (disabled by default)
- **IR-3.4**: Core components SHALL work without A2A dependencies (graceful degradation)
- **IR-3.5**: Configuration SHALL support A2A-disabled mode

**Configuration Example**:

```typescript
// config/a2a.config.ts
export interface A2AConfig {
  enabled: boolean;              // Default: false
  transport: 'mcp' | 'http' | 'websocket';
  registry: {
    enabled: boolean;            // Enable agent discovery
    advertiseInterval: number;   // ms between advertisements
  };
  memory: {
    syncEnabled: boolean;        // Enable memory synchronization
    syncInterval: number;        // ms between syncs
  };
}

// Usage in orchestrator
class Orchestrator {
  constructor(
    private agentManager: IAgentManager,
    private a2aRouter?: TaskRouter  // Optional dependency
  ) {}

  async assignTask(task: Task): Promise<void> {
    // Graceful degradation if A2A disabled
    if (this.a2aRouter && this.config.a2a.enabled) {
      const bestAgent = await this.a2aRouter.findBestAgent(task);
      if (bestAgent.platform !== 'claude-flow') {
        await this.a2aRouter.routeToRemoteAgent(task, bestAgent);
        return;
      }
    }

    // Existing local-only path
    const agent = this.selectBestAgent(task);
    await this.agentManager.assignTask(agent.id, task);
  }
}
```

**Testing Strategy**:
- ✅ Run full test suite with `A2A_ENABLED=false` → 100% pass
- ✅ Run full test suite with `A2A_ENABLED=true` → 100% pass + new A2A tests

---

## 6. Testing Requirements

### TR-1: Unit Testing

**ID**: TR-1
**Priority**: Critical
**Status**: Required

**Requirements**:

- **TR-1.1**: Code coverage ≥ 90% for all A2A components
- **TR-1.2**: All message translation functions SHALL have 100% coverage
- **TR-1.3**: All CLI adapters SHALL have real integration tests (NO MOCKS)
- **TR-1.4**: All transport implementations SHALL have unit tests with mock sockets

**Testing Framework**: Jest + ts-jest

**Example Test Structure**:

```typescript
// tests/a2a/protocol/message-translator.test.ts
describe('MessageTranslator', () => {
  describe('toA2AAgent', () => {
    it('should map all AgentState fields correctly', () => {
      const cfAgent: AgentState = { /* ... */ };
      const a2aAgent = toA2AAgent(cfAgent);

      expect(a2aAgent.agent.id).toBe(cfAgent.id.id);
      expect(a2aAgent.agent.name).toBe(cfAgent.name);
      expect(a2aAgent.agent.platform).toBe('claude-flow');
      // ... assert all fields
    });

    it('should handle missing optional fields', () => {
      const cfAgent: AgentState = { /* minimal required fields */ };
      const a2aAgent = toA2AAgent(cfAgent);

      expect(a2aAgent.agent.capabilities.languages).toBeUndefined();
    });
  });
});
```

---

### TR-2: Integration Testing

**ID**: TR-2
**Priority**: Critical
**Status**: Required

**Requirements**:

- **TR-2.1**: End-to-end tests SHALL execute tasks across 2+ platforms
- **TR-2.2**: Cross-platform discovery SHALL be tested with mock agents
- **TR-2.3**: Memory synchronization SHALL be tested with concurrent updates
- **TR-2.4**: Transport layer SHALL be tested with real network calls

**Example Integration Test**:

```typescript
// tests/integration/cross-platform-task.test.ts
describe('Cross-Platform Task Execution', () => {
  it('should route coding task to Claude, research to Gemini', async () => {
    // Setup
    const orchestrator = new Orchestrator();
    await orchestrator.init({ a2a: { enabled: true } });

    // Spawn local Claude agent
    const claudeAgent = await orchestrator.spawnAgent({
      type: 'coder',
      platform: 'claude-flow'
    });

    // Mock remote Gemini agent advertisement
    await mockGeminiAgent({
      id: 'gemini-001',
      type: 'researcher',
      capabilities: ['research', 'web-search']
    });

    // Execute coding task
    const codingTask = {
      type: 'coding',
      description: 'Implement binary search'
    };
    const codingResult = await orchestrator.executeTask(codingTask);

    // Assert: Routed to Claude agent
    expect(codingResult.agentId).toBe(claudeAgent.id);
    expect(codingResult.platform).toBe('claude-flow');

    // Execute research task
    const researchTask = {
      type: 'research',
      description: 'Research React hooks best practices'
    };
    const researchResult = await orchestrator.executeTask(researchTask);

    // Assert: Routed to Gemini agent
    expect(researchResult.agentId).toBe('gemini-001');
    expect(researchResult.platform).toBe('gemini');
  });
});
```

---

### TR-3: Performance Testing

**ID**: TR-3
**Priority**: High
**Status**: Required

**Requirements**:

- **TR-3.1**: Benchmark A2A message translation overhead (target: <5ms per message)
- **TR-3.2**: Benchmark cross-platform task execution vs local (target: <10% slower)
- **TR-3.3**: Benchmark agent discovery with 50+ agents (target: <2s)
- **TR-3.4**: Load test with 100 concurrent agents (target: maintain throughput)

**Example Performance Test**:

```typescript
// tests/performance/message-translation.perf.ts
describe('Message Translation Performance', () => {
  it('should translate 1000 messages in <5s', async () => {
    const agents = generateMockAgents(1000);

    const startTime = Date.now();
    for (const agent of agents) {
      toA2AAgent(agent);
    }
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000);  // <5s total
    expect(duration / agents.length).toBeLessThan(5);  // <5ms per message
  });
});
```

---

### TR-4: Security Testing

**ID**: TR-4
**Priority**: High
**Status**: Required

**Requirements**:

- **TR-4.1**: Penetration test: Attempt unauthorized agent access
- **TR-4.2**: Penetration test: Attempt message replay attack
- **TR-4.3**: Penetration test: Attempt to inject malicious message payloads
- **TR-4.4**: Security audit: Verify TLS configuration
- **TR-4.5**: Security audit: Verify JWT token validation

**Example Security Test**:

```typescript
// tests/security/authentication.test.ts
describe('Agent Authentication', () => {
  it('should reject unauthenticated agent', async () => {
    const transport = new MCPTransport();

    // Attempt to send message without authentication
    await expect(
      transport.send(
        { /* valid A2A message */ },
        'remote-agent-001',
        { authenticated: false }  // No auth token
      )
    ).rejects.toThrow('Unauthorized: Missing authentication token');
  });

  it('should reject expired token', async () => {
    const transport = new MCPTransport();
    const expiredToken = generateJWT({ exp: Date.now() - 3600000 });

    await expect(
      transport.send(
        { /* valid A2A message */ },
        'remote-agent-001',
        { token: expiredToken }
      )
    ).rejects.toThrow('Unauthorized: Token expired');
  });
});
```

---

### TR-5: Regression Testing

**ID**: TR-5
**Priority**: Critical
**Status**: Required

**Requirements**:

- **TR-5.1**: ALL existing Claude Flow tests SHALL pass with A2A integration
- **TR-5.2**: Performance benchmarks SHALL not regress by >5%
- **TR-5.3**: Automated regression suite SHALL run on every commit

**Implementation**: GitHub Actions CI/CD with regression test suite

```yaml
# .github/workflows/regression.yml
name: Regression Tests
on: [push, pull_request]

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run existing tests (A2A disabled)
        run: npm test
        env:
          A2A_ENABLED: false
      - name: Run existing tests (A2A enabled)
        run: npm test
        env:
          A2A_ENABLED: true
      - name: Run performance benchmarks
        run: npm run benchmark
      - name: Assert no regression
        run: node scripts/assert-no-regression.js
```

---

## 7. Security Requirements

### SR-1: Authentication

**ID**: SR-1
**Priority**: Critical
**Status**: To Be Implemented

**Description**: All A2A messages SHALL be authenticated to prevent impersonation.

**Requirements**:

- **SR-1.1**: Agents SHALL authenticate using JWT (JSON Web Tokens)
- **SR-1.2**: JWT tokens SHALL include agent ID, platform, and capabilities claims
- **SR-1.3**: JWT tokens SHALL expire after 1 hour (configurable)
- **SR-1.4**: Token refresh SHALL be supported for long-running agents
- **SR-1.5**: Public key infrastructure SHALL be used for token signing (RS256)

**JWT Claims Structure**:

```typescript
interface A2ATokenClaims {
  iss: string;        // Issuer (platform, e.g., 'claude-flow')
  sub: string;        // Subject (agent ID)
  aud: string;        // Audience (target platform or 'any')
  exp: number;        // Expiration (Unix timestamp)
  iat: number;        // Issued at (Unix timestamp)
  jti: string;        // JWT ID (unique token ID)
  capabilities: {
    type: AgentType[];
    skills: string[];
  };
}
```

**Implementation**: `src/a2a/security/authenticator.ts`

---

### SR-2: Authorization

**ID**: SR-2
**Priority**: High
**Status**: To Be Implemented

**Description**: Capability-based access control SHALL enforce what agents can do.

**Requirements**:

- **SR-2.1**: Agents SHALL only execute tasks matching their advertised capabilities
- **SR-2.2**: Agents SHALL only read memory from namespaces they have access to
- **SR-2.3**: Agents SHALL only write to their own memory namespace
- **SR-2.4**: Coordinators SHALL have elevated privileges for swarm-level operations
- **SR-2.5**: Authorization checks SHALL be enforced at transport layer

**Authorization Matrix**:

| Operation | Agent | Coordinator | Allowed |
|-----------|-------|------------|---------|
| Execute task (matching capability) | ✓ | ✓ | Yes |
| Execute task (mismatched capability) | ✗ | ✓ | Coordinator only |
| Read own memory | ✓ | ✓ | Yes |
| Read swarm memory | ✓ | ✓ | Yes |
| Read other agent memory | ✗ | ✓ | Coordinator only |
| Write own memory | ✓ | ✓ | Yes |
| Write swarm memory | ✗ | ✓ | Coordinator only |
| Write other agent memory | ✗ | ✗ | Never |

**Implementation**: `src/a2a/security/authorizer.ts`

---

### SR-3: Encryption

**ID**: SR-3
**Priority**: High
**Status**: To Be Implemented

**Description**: All A2A messages in transit SHALL be encrypted.

**Requirements**:

- **SR-3.1**: HTTP transport SHALL use TLS 1.3
- **SR-3.2**: WebSocket transport SHALL use WSS (WebSocket Secure)
- **SR-3.3**: MCP transport SHALL use encrypted channels
- **SR-3.4**: Message payloads > 1KB SHALL be compressed before encryption
- **SR-3.5**: Encryption keys SHALL be rotated every 30 days

**TLS Configuration**:

```typescript
// config/tls.config.ts
export const tlsConfig = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ],
  honorCipherOrder: true,
  requestCert: true,  // Mutual TLS
  rejectUnauthorized: true
};
```

---

### SR-4: Input Validation

**ID**: SR-4
**Priority**: Critical
**Status**: To Be Implemented

**Description**: All incoming A2A messages SHALL be validated against JSON schemas.

**Requirements**:

- **SR-4.1**: Messages SHALL be validated using JSON Schema Draft 2020-12
- **SR-4.2**: Invalid messages SHALL be rejected with descriptive error messages
- **SR-4.3**: Schema validation SHALL prevent injection attacks (XSS, SQL injection)
- **SR-4.4**: Maximum message size SHALL be enforced (default: 10MB)
- **SR-4.5**: Rate limiting SHALL prevent DoS attacks (default: 100 messages/minute/agent)

**Schema Validation Example**:

```typescript
// src/a2a/protocol/schema-validator.ts
import Ajv from 'ajv';
import { agentAdvertisementSchema } from './schemas/agent-advertisement.json';

const ajv = new Ajv({ strict: true, allErrors: true });

export function validateAgentAdvertisement(message: unknown): asserts message is AgentAdvertisement {
  const validate = ajv.compile(agentAdvertisementSchema);

  if (!validate(message)) {
    throw new ValidationError(
      'Invalid AgentAdvertisement',
      validate.errors || []
    );
  }
}
```

---

### SR-5: Audit Logging

**ID**: SR-5
**Priority**: Medium
**Status**: To Be Implemented

**Description**: All security-relevant events SHALL be logged for auditing.

**Requirements**:

- **SR-5.1**: Authentication attempts (success/failure) SHALL be logged
- **SR-5.2**: Authorization denials SHALL be logged
- **SR-5.3**: Message validation failures SHALL be logged
- **SR-5.4**: Suspicious activity (replay attacks, rate limit exceeded) SHALL be logged
- **SR-5.5**: Audit logs SHALL be tamper-proof (append-only, cryptographically signed)

**Audit Log Format**:

```typescript
interface AuditLogEntry {
  timestamp: string;
  eventType: 'auth' | 'authz' | 'validation' | 'security';
  severity: 'info' | 'warning' | 'critical';
  agentId: string;
  platform: string;
  action: string;
  result: 'success' | 'failure';
  details: {
    message?: string;
    error?: string;
    metadata?: any;
  };
  signature: string;  // HMAC-SHA256
}
```

---

## 8. Performance Requirements

### PR-1: Latency

**ID**: PR-1
**Priority**: Critical
**Status**: Design Constraint

**Requirements**:

- **PR-1.1**: Local task execution latency SHALL remain ≤ 340ms (existing baseline)
- **PR-1.2**: Cross-platform task execution latency SHALL be ≤ 50ms overhead (excluding remote execution time)
- **PR-1.3**: Message translation SHALL complete within 5ms per message
- **PR-1.4**: Agent discovery query SHALL complete within 2s for 50+ agents

**Measurement**: Use `performance.now()` for high-precision timing, track P50, P95, P99 percentiles.

---

### PR-2: Throughput

**ID**: PR-2
**Priority**: High
**Status**: Design Constraint

**Requirements**:

- **PR-2.1**: System SHALL handle ≥ 1000 A2A messages/second sustained
- **PR-2.2**: Agent spawning throughput SHALL remain ≥ 10 agents/second (existing: 340ms/agent)
- **PR-2.3**: Memory synchronization SHALL handle ≥ 500 updates/second

**Measurement**: Load testing with `k6`, monitor throughput under sustained load for 10 minutes.

---

### PR-3: Resource Utilization

**ID**: PR-3
**Priority**: Medium
**Status**: Design Constraint

**Requirements**:

- **PR-3.1**: A2A components SHALL use ≤ 50MB additional memory
- **PR-3.2**: A2A components SHALL use ≤ 10% additional CPU under normal load
- **PR-3.3**: Message translation SHALL allocate minimal temporary objects (avoid GC pressure)

**Measurement**: Use `process.memoryUsage()`, `v8.getHeapStatistics()`, profile with Chrome DevTools.

---

### PR-4: Scalability Targets

**ID**: PR-4
**Priority**: High
**Status**: Design Constraint

**Requirements**:

| Metric | Current (Local) | Target (A2A) |
|--------|----------------|--------------|
| Max concurrent agents | 100+ | 100+ |
| Max concurrent tasks | 50 | 50 |
| Messages/second | N/A | 1000+ |
| Agent discovery size | 100 | 500+ |
| Memory entries | 10,000+ | 10,000+ |
| Swarm coordination overhead | 5% | 10% |

---

## 9. Compliance Requirements

### CR-1: A2A Protocol Compliance

**ID**: CR-1
**Priority**: Critical
**Status**: Required

**Description**: Implementation SHALL comply with A2A Protocol Specification v1.0.

**Requirements**:

- **CR-1.1**: All message formats SHALL match JSON schemas in A2A spec
- **CR-1.2**: Protocol version negotiation SHALL support v1.0 (required) and v1.1 (optional)
- **CR-1.3**: Error codes SHALL match A2A standard error codes
- **CR-1.4**: Transport mechanisms SHALL follow A2A transport layer spec

**Verification**: Automated compliance tests against reference implementation (if available).

---

### CR-2: Engineering Principles Compliance

**ID**: CR-2
**Priority**: High
**Status**: Required

**Description**: Implementation SHALL follow engineering principles defined in CLI adapter work.

**Principles**:

- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **TDD**: Test-Driven Development (write tests first)
- **DRY**: Don't Repeat Yourself (extract patterns after seeing repetition)
- **YAGNI**: You Ain't Gonna Need It (only implement what's needed)
- **START SMALL**: Build minimal working solution, iterate
- **NO MOCKS** (where possible): Real integration tests
- **NO LEGACY**: Clean implementation, no backward compatibility cruft
- **NO COMPATIBILITY**: Fresh start without legacy constraints

**Verification**: Code review, architecture review, retrospective after each phase.

---

## 10. Dependencies

### Internal Dependencies

**D-1**: Working Claude CLI adapter
**Status**: ✅ Complete (`src/cli-adapters/claude-cli.ts`, 6/6 tests passing)

**D-2**: Claude Flow v2.5.0 architecture
**Status**: ✅ Stable (orchestrator, agent manager, memory manager)

**D-3**: A2A Protocol Specification v1.0
**Status**: ✅ Documented (`docs/architecture/a2a/01-specification.md`, `02-architecture.md`)

---

### External Dependencies

**D-4**: Gemini CLI functional
**Status**: ⏳ Blocked (API authentication errors)
**Mitigation**: Phase 3 can proceed with mock Gemini agents, fix later

**D-5**: Codex CLI functional
**Status**: ⏳ Blocked (wrong base URL)
**Mitigation**: Phase 3 can proceed with mock Codex agents, fix later

**D-6**: Cursor CLI installed
**Status**: ❌ Not available
**Mitigation**: Defer Cursor integration to future phase

---

### Technology Stack

**D-7**: Node.js ≥ 18.0
**D-8**: TypeScript ≥ 5.0
**D-9**: Jest ≥ 29.0 (testing)
**D-10**: Ajv ≥ 8.0 (JSON schema validation)
**D-11**: jsonwebtoken (JWT authentication)
**D-12**: ws (WebSocket library)

---

## 11. Acceptance Criteria

### Phase-Based Acceptance

#### Phase 1: Foundation (Week 1-2)

**AC-1.1**: Message translation functions exist and pass 100% unit tests
**AC-1.2**: JSON schema validation rejects invalid messages with descriptive errors
**AC-1.3**: Base adapter interfaces defined and documented
**AC-1.4**: Protocol version negotiation works (v1.0 ↔ v1.0, v1.0 ↔ v1.1)

---

#### Phase 2: Cross-Platform Discovery (Week 3)

**AC-2.1**: Local agent spawning triggers A2A advertisement within 500ms
**AC-2.2**: Remote agent advertisement appears in local registry within 2s
**AC-2.3**: Capability queries return accurate matches (100% precision, ≥95% recall)
**AC-2.4**: Discovery works with mock agents from 2+ platforms

---

#### Phase 3: CLI Platform Adapters (Week 4)

**AC-3.1**: Gemini CLI adapter follows same pattern as Claude CLI (200 lines, 6/6 tests)
**AC-3.2**: Codex CLI adapter follows same pattern as Claude CLI (200 lines, 6/6 tests)
**AC-3.3**: All CLI adapters pass real integration tests (NO MOCKS)
**AC-3.4**: Adapter selection is automatic based on agent type

---

#### Phase 4: Memory & Event Sync (Week 5)

**AC-4.1**: Local memory update propagates to remote agents within 2s
**AC-4.2**: Concurrent memory updates resolve correctly (no data loss)
**AC-4.3**: Memory namespace isolation works (no cross-swarm leakage)
**AC-4.4**: Event propagation works for agent and task lifecycle events

---

#### Phase 5: Security & Auth (Week 6)

**AC-5.1**: JWT authentication rejects unauthenticated agents (100% of attempts)
**AC-5.2**: JWT authentication rejects expired tokens (100% of attempts)
**AC-5.3**: Capability-based authorization enforces access control (0 false positives)
**AC-5.4**: TLS 1.3 enforced for HTTP/WebSocket transports
**AC-5.5**: Message validation prevents injection attacks (verified by penetration test)

---

#### Phase 6: Performance Optimization (Week 7)

**AC-6.1**: Cross-platform task execution overhead ≤ 10% (benchmark)
**AC-6.2**: Message translation latency ≤ 5ms per message (benchmark)
**AC-6.3**: Agent discovery with 50+ agents ≤ 2s (benchmark)
**AC-6.4**: Load test: 100 concurrent agents, 1000 messages/sec sustained for 10 min

---

### Final Acceptance Criteria

**FAC-1**: ALL functional requirements (FR-1 to FR-7) met
**FAC-2**: ALL non-functional requirements (NFR-1 to NFR-5) met
**FAC-3**: Code coverage ≥ 90% for A2A components
**FAC-4**: ALL existing Claude Flow tests pass (100%)
**FAC-5**: Integration tests demonstrate cross-platform coordination
**FAC-6**: Security audit passes (no critical/high vulnerabilities)
**FAC-7**: Performance benchmarks meet targets (no >5% regression)
**FAC-8**: Documentation complete (API docs, architecture, integration guide)

---

## Appendix A: Success Metrics

### Quantitative Metrics

| Metric | Baseline (Current) | Target (Post-Integration) | Measurement |
|--------|-------------------|---------------------------|-------------|
| **SWE-Bench Solve Rate** | 84.8% | ≥ 84% (allow 1% drop) | Benchmark suite |
| **Agent Spawn Time** | 340ms | ≤ 400ms | Performance tests |
| **Task Execution Speed** | 2.8-4.4x vs sequential | ≥ 2.5x | Parallel benchmarks |
| **Code Coverage** | ~80% | ≥ 90% | Jest coverage report |
| **Test Pass Rate** | 100% | 100% | CI/CD pipeline |
| **Cross-Platform Task Success** | N/A | ≥ 95% | Integration tests |
| **Message Translation Latency** | N/A | ≤ 5ms | Performance tests |
| **Agent Discovery Time** | N/A | ≤ 2s (50 agents) | Performance tests |

---

### Qualitative Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Code Maintainability** | High | High | SonarQube, code review |
| **Documentation Quality** | Good | Excellent | Peer review, user feedback |
| **Developer Experience** | Good | Excellent | Developer survey |
| **Integration Complexity** | N/A | Low | Architecture review |

---

## Appendix B: Risk Register

| Risk ID | Risk Description | Likelihood | Impact | Mitigation Strategy | Owner |
|---------|-----------------|------------|--------|---------------------|-------|
| **R-1** | Performance degradation from translation overhead | Medium | High | Lazy translation, caching, profiling | Tech Lead |
| **R-2** | Breaking existing functionality | Low | Critical | Regression tests, feature flags, gradual rollout | QA Lead |
| **R-3** | Memory sync conflicts (race conditions) | Medium | Medium | CRDT or last-write-wins, conflict detection | Backend Dev |
| **R-4** | Security vulnerabilities in cross-platform communication | Medium | Critical | Security audit, penetration testing, regular updates | Security Engineer |
| **R-5** | Gemini/Codex CLI remain broken | High | Medium | Use mock agents for testing, defer real integration | CLI Dev |
| **R-6** | Scope creep (adding unnecessary features) | Medium | Low | Strict adherence to YAGNI, backlog prioritization | Product Manager |
| **R-7** | Integration takes longer than estimated | Medium | Medium | Agile sprints, weekly reviews, adjust scope | Project Manager |
| **R-8** | Transport layer failures (network partitions) | Low | High | Circuit breakers, retry logic, graceful degradation | DevOps Engineer |
| **R-9** | A2A spec changes during implementation | Low | Medium | Version negotiation, backward compatibility layer | Architect |
| **R-10** | Team knowledge gaps in A2A protocol | Medium | Low | Training sessions, pairing, documentation | Tech Lead |

---

## Appendix C: Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-01 | Architecture Team | Initial draft based on integration analysis |

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Technical Lead** | _______________ | _______________ | ______ |
| **Product Manager** | _______________ | _______________ | ______ |
| **QA Lead** | _______________ | _______________ | ______ |
| **Security Engineer** | _______________ | _______________ | ______ |

---

**End of Document**
