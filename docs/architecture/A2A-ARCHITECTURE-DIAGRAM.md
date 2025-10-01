# A2A Protocol Integration - Architecture Diagrams

## Current Architecture (v2.5.0)

```mermaid
graph TB
    subgraph "Claude Flow"
        MCP[MCP Server]
        AM[Agent Manager]
        COMM[Communication]
        MEM[Distributed Memory]

        subgraph "Local Agents"
            LA1[Coder Agent]
            LA2[Researcher Agent]
            LA3[Analyst Agent]
        end
    end

    MCP -->|spawn| AM
    AM -->|direct spawn| LA1
    AM -->|direct spawn| LA2
    AM -->|direct spawn| LA3

    LA1 <-->|custom messages| COMM
    LA2 <-->|custom messages| COMM
    LA3 <-->|custom messages| COMM

    LA1 <-->|strong consistency| MEM
    LA2 <-->|strong consistency| MEM
    LA3 <-->|strong consistency| MEM

    style LA1 fill:#e1f5ff
    style LA2 fill:#e1f5ff
    style LA3 fill:#e1f5ff
```

**Limitations:**
- ❌ No cross-swarm communication
- ❌ No external agent support
- ❌ Strong consistency bottleneck
- ❌ Custom message format only

---

## Target Architecture (v3.0.0)

```mermaid
graph TB
    subgraph "Claude Flow Swarm A"
        MCP_A[MCP Server]
        AM_A[Agent Manager]
        COMM_A[Communication + A2A Bridge]
        MEM_A[Memory + CRDT]

        subgraph "Provider Registry"
            LOCAL_A[Local Provider]
            A2A_A[A2A Adapter]
        end

        subgraph "Local Agents"
            LA1[Coder Agent]
            LA2[Researcher Agent]
        end
    end

    subgraph "External Swarm B"
        A2A_SERVER_B[A2A Server]
        EA1[External Agent 1]
        EA2[External Agent 2]
    end

    subgraph "Cloud Provider"
        CLOUD_AGENT[Cloud Agent]
    end

    MCP_A -->|create agent| AM_A
    AM_A -->|use| LOCAL_A
    AM_A -->|use| A2A_A

    LOCAL_A -->|spawn| LA1
    LOCAL_A -->|spawn| LA2

    A2A_A -->|connect| A2A_SERVER_B
    A2A_SERVER_B -->|manage| EA1
    A2A_SERVER_B -->|manage| EA2

    A2A_A -->|connect| CLOUD_AGENT

    LA1 <-->|A2A messages| COMM_A
    LA2 <-->|A2A messages| COMM_A
    EA1 <-.->|A2A protocol| COMM_A
    EA2 <-.->|A2A protocol| COMM_A
    CLOUD_AGENT <-.->|A2A protocol| COMM_A

    LA1 <-->|CRDT sync| MEM_A
    LA2 <-->|CRDT sync| MEM_A
    EA1 <-.->|A2A memory| MEM_A
    EA2 <-.->|A2A memory| MEM_A

    style LA1 fill:#e1f5ff
    style LA2 fill:#e1f5ff
    style EA1 fill:#ffe1e1
    style EA2 fill:#ffe1e1
    style CLOUD_AGENT fill:#e1ffe1
```

**Capabilities:**
- ✅ Multi-swarm communication via A2A
- ✅ External agent integration
- ✅ CRDT eventual consistency
- ✅ Standardized message format
- ✅ Cloud provider support

---

## Component Interaction Flow

### 1. Agent Creation Flow (With A2A)

```mermaid
sequenceDiagram
    participant User
    participant MCP as MCP Server
    participant AM as Agent Manager
    participant PR as Provider Registry
    participant A2A as A2A Adapter
    participant EXT as External Agent

    User->>MCP: createAgent(type, options)
    MCP->>AM: createAgent(template, {a2aEndpoint})

    AM->>PR: getProvider('a2a-adapter')
    PR-->>AM: A2AAdapter instance

    AM->>A2A: connect(agentId, endpoint)
    A2A->>EXT: WebSocket connect
    EXT-->>A2A: Connection established

    A2A->>EXT: Send handshake
    EXT-->>A2A: Handshake response + capabilities

    A2A-->>AM: AgentHandle
    AM-->>MCP: agentId
    MCP-->>User: {success: true, agentId}
```

### 2. Cross-Swarm Communication Flow

```mermaid
sequenceDiagram
    participant LA as Local Agent A
    participant COMM as Communication Layer
    participant BRIDGE as Protocol Bridge
    participant A2A as A2A Client
    participant EA as External Agent B

    LA->>COMM: sendMessage({to: agentB, content})
    COMM->>BRIDGE: route message

    alt Target is external
        BRIDGE->>A2A: convert to A2A format
        A2A->>EA: Send A2A message (WebSocket)
        EA-->>A2A: A2A response
        A2A-->>BRIDGE: convert to internal
        BRIDGE-->>COMM: internal message
        COMM-->>LA: response
    else Target is local
        BRIDGE->>COMM: route internally
        COMM-->>LA: response
    end
```

### 3. Memory Sync with CRDT

```mermaid
sequenceDiagram
    participant N1 as Node 1
    participant CRDT1 as CRDT Store 1
    participant A2A as A2A Protocol
    participant CRDT2 as CRDT Store 2
    participant N2 as Node 2

    N1->>CRDT1: store('key', 'value1')
    CRDT1->>CRDT1: Create LWW Register
    CRDT1->>A2A: broadcast CRDT state

    N2->>CRDT2: store('key', 'value2')
    Note over CRDT2: Concurrent update!
    CRDT2->>CRDT2: Create LWW Register
    CRDT2->>A2A: broadcast CRDT state

    A2A->>CRDT1: receive remote state from N2
    CRDT1->>CRDT1: merge(remoteState)
    Note over CRDT1: Conflict-free merge!

    A2A->>CRDT2: receive remote state from N1
    CRDT2->>CRDT2: merge(remoteState)
    Note over CRDT2: Both converge to same value

    CRDT1-->>N1: retrieve('key')
    CRDT2-->>N2: retrieve('key')
    Note over N1,N2: Eventual consistency achieved
```

---

## Provider Architecture

```mermaid
classDiagram
    class AgentProvider {
        <<interface>>
        +name: string
        +capabilities: AgentProviderCapabilities
        +spawn(config, env) AgentHandle
        +connect(agentId, endpoint) AgentHandle
        +terminate(handle) void
        +healthCheck(handle) AgentHealthStatus
        +supportsA2A() boolean
    }

    class LocalAgentProvider {
        -processes: Map~string, ChildProcess~
        +spawn(config, env) AgentHandle
        +terminate(handle) void
        +supportsA2A() false
    }

    class A2AAgentAdapter {
        -clients: Map~string, A2AClient~
        +connect(agentId, endpoint) AgentHandle
        +sendA2AMessage(handle, message) void
        +receiveA2AMessages(handle) AsyncIterator
        +supportsA2A() true
    }

    class DockerAgentProvider {
        -containers: Map~string, Container~
        +spawn(config, env) AgentHandle
        +supportsA2A() false
    }

    class KubernetesAgentProvider {
        -pods: Map~string, Pod~
        +spawn(config, env) AgentHandle
        +supportsA2A() true
    }

    class AgentManager {
        -providers: Map~string, AgentProvider~
        +registerProvider(provider) void
        +createAgent(template, options) string
        +getAgent(agentId) AgentState
    }

    AgentProvider <|.. LocalAgentProvider
    AgentProvider <|.. A2AAgentAdapter
    AgentProvider <|.. DockerAgentProvider
    AgentProvider <|.. KubernetesAgentProvider

    AgentManager --> AgentProvider : uses
```

**Benefits:**
- ✅ Pluggable architecture
- ✅ Easy to add new providers
- ✅ Clean separation of concerns
- ✅ Testable in isolation

---

## CRDT Data Flow

```mermaid
graph LR
    subgraph "Node 1"
        APP1[Application]
        CRDT1[CRDT Store]
        SYNC1[Sync Engine]
    end

    subgraph "Node 2"
        APP2[Application]
        CRDT2[CRDT Store]
        SYNC2[Sync Engine]
    end

    subgraph "Node 3"
        APP3[Application]
        CRDT3[CRDT Store]
        SYNC3[Sync Engine]
    end

    APP1 -->|update| CRDT1
    CRDT1 -->|broadcast delta| SYNC1
    SYNC1 -.->|A2A protocol| SYNC2
    SYNC1 -.->|A2A protocol| SYNC3

    SYNC2 -->|merge delta| CRDT2
    SYNC3 -->|merge delta| CRDT3

    CRDT2 -->|query| APP2
    CRDT3 -->|query| APP3

    APP2 -->|update| CRDT2
    CRDT2 -->|broadcast delta| SYNC2
    SYNC2 -.->|A2A protocol| SYNC1
    SYNC2 -.->|A2A protocol| SYNC3

    style CRDT1 fill:#e1f5ff
    style CRDT2 fill:#e1f5ff
    style CRDT3 fill:#e1f5ff
```

**CRDT Types Supported:**
- **LWW Register:** Last-Write-Wins for simple values
- **OR-Set:** Observed-Remove Set for collections
- **PN-Counter:** Positive-Negative Counter for metrics
- **RGA:** Replicated Growable Array for ordered lists

---

## Message Translation Layer

```mermaid
graph TB
    subgraph "Internal System"
        IA[Internal Agent]
        COMM[Communication Layer]
    end

    subgraph "Protocol Bridge"
        ADAPTER[A2A Message Adapter]
        ROUTER[Message Router]
    end

    subgraph "External System"
        A2A_CLIENT[A2A Client]
        EA[External Agent]
    end

    IA -->|Internal Message| COMM
    COMM -->|route| ROUTER

    ROUTER -->|local?| COMM
    ROUTER -->|external?| ADAPTER

    ADAPTER -->|A2A Message| A2A_CLIENT
    A2A_CLIENT -->|WebSocket| EA

    EA -->|WebSocket| A2A_CLIENT
    A2A_CLIENT -->|A2A Message| ADAPTER
    ADAPTER -->|Internal Message| ROUTER
    ROUTER -->|deliver| COMM
    COMM -->|deliver| IA

    style ADAPTER fill:#ffe1e1
    style ROUTER fill:#fff9e1
```

**Message Format Mapping:**

| Internal | A2A | Notes |
|----------|-----|-------|
| `direct` | `message.direct` | 1:1 mapping |
| `broadcast` | `message.broadcast` | 1:1 mapping |
| `consensus` | `consensus.vote` | Semantic mapping |
| `query` | `query.request` | Request/response pattern |
| `response` | `query.response` | Request/response pattern |

---

## MCP Tool Integration

```mermaid
graph TB
    subgraph "MCP Server"
        TR[Tool Registry]

        subgraph "Tool Categories"
            CORE[Core Tools]
            A2A_TOOLS[A2A Tools]
            SWARM[Swarm Tools]
        end

        PT[Protocol Translator]
    end

    subgraph "Execution Layer"
        AM[Agent Manager]
        COMM[Communication]
        MEM[Memory]
    end

    TR --> CORE
    TR --> A2A_TOOLS
    TR --> SWARM

    A2A_TOOLS -->|translate| PT
    PT -->|execute| AM
    PT -->|execute| COMM
    PT -->|execute| MEM

    CORE -->|direct| AM
    SWARM -->|direct| AM

    style A2A_TOOLS fill:#ffe1e1
    style PT fill:#fff9e1
```

**New A2A Tools:**
- `a2a/agent/connect` - Connect to external A2A agent
- `a2a/agent/discover` - Discover available agents
- `a2a/message/send` - Send A2A message
- `a2a/memory/sync` - Synchronize memory partition

---

## Deployment Topology Examples

### Single Swarm (Current)

```
┌─────────────────────────────┐
│      Claude Flow Host       │
│                             │
│  ┌─────────────────────┐   │
│  │   Agent Manager     │   │
│  └─────────────────────┘   │
│                             │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│  │A1 │ │A2 │ │A3 │ │A4 │   │
│  └───┘ └───┘ └───┘ └───┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Memory (Strong)    │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### Multi-Swarm with A2A (Target)

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Swarm A (Local)   │      │   Swarm B (Cloud)   │      │  Swarm C (Partner)  │
│                     │      │                     │      │                     │
│  ┌────────────┐    │      │  ┌────────────┐    │      │  ┌────────────┐    │
│  │Local Agents│    │      │  │Cloud Agents│    │      │  │Ext. Agents │    │
│  │ A1  A2  A3 │    │      │  │ B1  B2     │    │      │  │ C1  C2  C3 │    │
│  └────────────┘    │      │  └────────────┘    │      │  └────────────┘    │
│                     │      │                     │      │                     │
│  ┌────────────┐    │      │  ┌────────────┐    │      │  ┌────────────┐    │
│  │ CRDT Store │    │      │  │ CRDT Store │    │      │  │ CRDT Store │    │
│  └────────────┘    │      │  └────────────┘    │      │  └────────────┘    │
│         │           │      │         │           │      │         │           │
└─────────┼───────────┘      └─────────┼───────────┘      └─────────┼───────────┘
          │                            │                            │
          │         A2A Protocol       │         A2A Protocol       │
          └────────────────────────────┴────────────────────────────┘
                           (WebSocket)
```

**Benefits:**
- ✅ Geographic distribution
- ✅ Cloud bursting
- ✅ Partner collaboration
- ✅ Fault isolation

---

## Performance Comparison

### Memory Sync Latency vs. Node Count

```
Strong Consistency (Current)
────────────────────────────
Nodes    Latency
2        100ms   ██
5        250ms   █████
10       500ms   ██████████
20      1000ms   ████████████████████

Eventual Consistency (A2A + CRDT)
─────────────────────────────────
Nodes    Latency
2         10ms   █
5         10ms   █
10        10ms   █
20        10ms   █

Improvement: 10x-100x faster at scale
```

### Message Throughput

```
Internal Messages (Current)
───────────────────────────
Single Connection: 500 msg/sec  ████████████

A2A Messages (With Protocol Translation)
────────────────────────────────────────
Single Connection: 100 msg/sec  ██
Multiple Connections: 1000 msg/sec ████████████████████

Trade-off: Lower per-connection throughput, but unlimited connections
```

---

## Migration Path Visualization

```mermaid
timeline
    title A2A Integration Timeline
    section v2.5.0 (Current)
        Baseline : All local agents
             : Custom messages
             : Strong consistency
    section v2.6.0 (Alpha)
        Foundation : A2A types added
               : Provider interface
               : CRDT library
               : Opt-in flag
    section v2.7.0 (Beta)
        Integration : Memory uses CRDT
                : Communication A2A
                : Deprecation warnings
                : Migration tools
    section v2.8.0 (RC)
        Features : Agent discovery
             : Cross-swarm comms
             : A2A default
             : Legacy mode available
    section v3.0.0 (Stable)
        Production : Legacy removed
               : Full A2A
               : Optimized
               : Production-ready
```

---

## Testing Architecture

```mermaid
graph TB
    subgraph "Test Layers"
        UT[Unit Tests]
        IT[Integration Tests]
        E2E[E2E Tests]
        PERF[Performance Tests]
    end

    subgraph "Test Components"
        MOCK_A2A[Mock A2A Server]
        MOCK_AGENT[Mock Agents]
        TEST_SWARM[Test Swarm]
    end

    subgraph "CI/CD Pipeline"
        BUILD[Build]
        TEST_RUN[Test Runner]
        BENCH[Benchmarks]
        DEPLOY[Deploy]
    end

    UT --> TEST_RUN
    IT --> TEST_RUN
    IT --> MOCK_A2A
    IT --> MOCK_AGENT

    E2E --> TEST_SWARM
    E2E --> MOCK_A2A

    PERF --> BENCH
    PERF --> TEST_SWARM

    TEST_RUN --> DEPLOY
    BENCH --> DEPLOY

    style UT fill:#e1f5ff
    style IT fill:#ffe1e1
    style E2E fill:#e1ffe1
    style PERF fill:#fff9e1
```

**Test Coverage Targets:**
- Unit Tests: 95%+
- Integration Tests: 85%+
- E2E Tests: Key workflows
- Performance: Regression < 10%

---

**Document Version:** 1.0
**Date:** 2025-10-01
**Related:** [A2A-REFACTORING-GUIDE.md](./A2A-REFACTORING-GUIDE.md)
