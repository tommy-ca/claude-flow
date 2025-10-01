# A2A Protocol Integration - Comprehensive Test Plan

**Document Version**: 1.0.0
**Date**: 2025-10-01
**Status**: Draft
**Owner**: Claude Flow QA Team

---

## Executive Summary

This document defines the comprehensive testing strategy for A2A (Agent-to-Agent) Protocol integration into Claude Flow. The test plan covers all compliance levels, ensuring robust validation of the protocol implementation across unit, integration, end-to-end, performance, and security testing dimensions.

### Test Coverage Goals

| Test Category | Target Coverage | Test Count | Estimated Effort |
|---------------|----------------|------------|------------------|
| Unit Tests | >85% | 330+ tests | 75-105 hours |
| Integration Tests | >80% | 90+ tests | 50-70 hours |
| End-to-End Tests | All scenarios | 20+ scenarios | 30-40 hours |
| Performance Tests | All benchmarks | 10+ benchmarks | 35-50 hours |
| Security Tests | 100% critical paths | 55+ tests | 25-35 hours |
| **TOTAL** | **-** | **505+ tests** | **215-300 hours** |

### Success Criteria

- ✅ All compliance levels (1-4) fully validated
- ✅ >85% code coverage for A2A components
- ✅ Zero critical security vulnerabilities
- ✅ Performance targets met (P99 latency <500ms)
- ✅ Interoperability confirmed with 3+ platforms
- ✅ 100% backwards compatibility maintained

---

## Table of Contents

1. [Testing Philosophy and Approach](#1-testing-philosophy-and-approach)
2. [Unit Testing Strategy](#2-unit-testing-strategy)
3. [Integration Testing Strategy](#3-integration-testing-strategy)
4. [End-to-End Testing Strategy](#4-end-to-end-testing-strategy)
5. [Performance Testing Strategy](#5-performance-testing-strategy)
6. [Interoperability Testing](#6-interoperability-testing)
7. [Security Testing](#7-security-testing)
8. [Test Data Management](#8-test-data-management)
9. [Test Automation](#9-test-automation)
10. [Test Execution Schedule](#10-test-execution-schedule)
11. [Tools and Frameworks](#11-tools-and-frameworks)

---

## 1. Testing Philosophy and Approach

### 1.1 Test Pyramid Structure

```
         /\
        /E2E\      <- 20 scenarios (5% effort)
       /------\
      /Interop \   <- 90 tests (25% effort)
     /----------\
    /   Unit     \ <- 330+ tests (40% effort)
   /--------------\
      + Performance (15% effort)
      + Security (15% effort)
```

### 1.2 Testing Principles

**Test-First Development**:
- Write tests before implementation (TDD)
- Each feature requires test specification first
- Minimum 85% coverage before code review

**Test Isolation**:
- Tests must be independent
- No shared state between tests
- Use mocks for external dependencies

**Test Quality**:
- Tests must be maintainable
- Clear naming conventions
- Comprehensive assertions
- Fast execution (<100ms per unit test)

### 1.3 Testing Levels

**Level 1: Unit Testing**
- Individual components in isolation
- Mock all external dependencies
- Target: >85% code coverage

**Level 2: Integration Testing**
- Component interactions
- Real dependencies within subsystems
- Target: >80% integration coverage

**Level 3: End-to-End Testing**
- Complete user workflows
- Real external systems
- Target: 100% critical path coverage

**Level 4: Performance Testing**
- Load, stress, and scalability tests
- Performance benchmarking
- Target: Meet all SLA requirements

**Level 5: Security Testing**
- Vulnerability scanning
- Penetration testing
- Target: Zero critical vulnerabilities

### 1.4 CI/CD Integration Strategy

**Continuous Testing Pipeline**:

```
┌─────────────┐
│ Code Commit │
└──────┬──────┘
       │
       v
┌─────────────┐
│ Unit Tests  │ ← Fast feedback (2-3 min)
└──────┬──────┘
       │
       v
┌─────────────┐
│ Lint/Format │
└──────┬──────┘
       │
       v
┌─────────────┐
│ Integration │ ← Medium feedback (5-10 min)
└──────┬──────┘
       │
       v
┌─────────────┐
│ E2E Tests   │ ← Slower feedback (15-20 min)
└──────┬──────┘
       │
       v
┌─────────────┐
│ Security    │ ← Daily/Weekly
└──────┬──────┘
       │
       v
┌─────────────┐
│ Performance │ ← Weekly/On-Demand
└─────────────┘
```

---

## 2. Unit Testing Strategy

### 2.1 Protocol Layer Tests (150 tests, 30-40 hours)

#### 2.1.1 Message Envelope Tests (40 tests)

**File**: `/tests/a2a/protocol/message-envelope.test.ts`

**Test Scenarios**:

```typescript
describe('MessageEnvelope', () => {
  describe('Message Creation', () => {
    it('should create valid message with all required fields');
    it('should generate unique message IDs');
    it('should validate protocol version');
    it('should support message priorities');
    it('should handle TTL expiration');
    it('should support multicast addressing');
    it('should include correlation IDs for request tracking');
    it('should support custom headers');
  });

  describe('Message Validation', () => {
    it('should reject messages missing required fields');
    it('should validate timestamp format');
    it('should validate agent addresses');
    it('should validate message types');
    it('should enforce maximum message size (1MB)');
    it('should validate priority values');
  });

  describe('Message Serialization', () => {
    it('should serialize to valid JSON');
    it('should deserialize from JSON');
    it('should handle UTF-8 encoding');
    it('should preserve payload types');
  });
});
```

**Test Data**:
```typescript
const validMessage = {
  version: '1.0.0',
  type: MessageType.TASK_REQUEST,
  messageId: 'msg-123',
  from: { agentId: 'agent-1', platform: 'claude-flow' },
  to: { agentId: 'agent-2', platform: 'codex' },
  priority: MessagePriority.HIGH,
  timestamp: 1696175000000,
  payload: { task: 'analyze code' }
};
```

**Expected Results**:
- All validation rules enforced
- Invalid messages rejected with specific error codes
- Performance: <1ms per validation

#### 2.1.2 Transport Layer Tests (50 tests)

**File**: `/tests/a2a/protocol/transport/http-transport.test.ts`

**Test Scenarios**:

```typescript
describe('HTTPTransport', () => {
  describe('Connection Management', () => {
    it('should establish HTTP connection');
    it('should use connection pooling');
    it('should handle connection timeout');
    it('should retry on transient failures');
    it('should implement exponential backoff');
    it('should respect max retry limit');
  });

  describe('Message Transmission', () => {
    it('should send POST request with message payload');
    it('should include authentication headers');
    it('should handle large messages (chunking)');
    it('should compress messages when enabled');
    it('should measure transmission latency');
  });

  describe('Error Handling', () => {
    it('should handle network errors');
    it('should handle HTTP error codes (400, 500)');
    it('should implement circuit breaker');
    it('should fallback to secondary endpoints');
  });
});
```

**WebSocket Transport Tests** (25 tests):

```typescript
describe('WebSocketTransport', () => {
  it('should establish WebSocket connection');
  it('should maintain persistent connection');
  it('should handle connection drop and reconnect');
  it('should support bidirectional messaging');
  it('should implement heartbeat/ping-pong');
  it('should handle backpressure');
});
```

**Expected Results**:
- Connection success rate: >99%
- Retry mechanism functional
- Circuit breaker activates after threshold
- Performance: Connection establishment <100ms

#### 2.1.3 Protocol Versioning Tests (20 tests)

**File**: `/tests/a2a/protocol/versioning.test.ts`

**Test Scenarios**:

```typescript
describe('VersionNegotiation', () => {
  it('should negotiate compatible versions');
  it('should reject incompatible versions');
  it('should select highest common version');
  it('should support version fallback');
  it('should migrate messages between versions');
  it('should maintain compatibility matrix');
});
```

**Test Data**:
```typescript
const versionScenarios = [
  { our: ['1.0', '1.1'], their: ['1.0'], expected: '1.0' },
  { our: ['1.1'], their: ['1.0'], expected: null }, // incompatible
  { our: ['1.0', '1.1', '1.2'], their: ['1.1', '1.2'], expected: '1.2' }
];
```

**Expected Results**:
- Correct version selected in all scenarios
- Incompatibility detected properly
- Migration paths executed correctly

#### 2.1.4 Error Handling Tests (40 tests)

**File**: `/tests/a2a/protocol/error-handling.test.ts`

**Test Scenarios**:

```typescript
describe('ErrorHandling', () => {
  describe('Error Response Format', () => {
    it('should create standard A2A error response');
    it('should include error code, type, message, details');
    it('should preserve correlation IDs in errors');
    it('should include recovery suggestions');
  });

  describe('Standard Error Codes', () => {
    it('should use JSON-RPC error codes (-32700 to -32603)');
    it('should use A2A error codes (1001-1099)');
    it('should provide descriptive error messages');
  });

  describe('Error Recovery', () => {
    it('should distinguish recoverable vs non-recoverable errors');
    it('should suggest retry strategies');
    it('should implement error metrics collection');
  });
});
```

**Expected Results**:
- All error codes defined and documented
- Error responses conform to spec
- Recovery suggestions appropriate

---

### 2.2 Security Tests (80 tests, 20-30 hours)

#### 2.2.1 Authentication Tests (30 tests)

**File**: `/tests/a2a/security/authentication.test.ts`

**Test Scenarios**:

```typescript
describe('Authentication', () => {
  describe('JWT Bearer Tokens', () => {
    it('should generate valid JWT tokens');
    it('should include agent ID in token claims');
    it('should include capabilities in token claims');
    it('should set appropriate expiration (1h default)');
    it('should validate token signature');
    it('should reject expired tokens');
    it('should reject tokens with invalid signatures');
    it('should implement token refresh mechanism');
  });

  describe('OAuth 2.0', () => {
    it('should initiate OAuth flow');
    it('should exchange authorization code for token');
    it('should validate OAuth tokens');
    it('should refresh OAuth tokens before expiry');
  });

  describe('API Key Authentication', () => {
    it('should validate API key format');
    it('should lookup agent by API key');
    it('should rate limit failed authentication attempts');
    it('should implement account lockout after failures');
  });

  describe('mTLS Certificate Authentication', () => {
    it('should validate client certificates');
    it('should verify certificate chain');
    it('should check certificate expiration');
    it('should validate certificate revocation');
  });
});
```

**Test Data**:
```typescript
const validToken = {
  sub: 'agent-123',
  capabilities: ['code_analysis', 'review'],
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000)
};
```

**Expected Results**:
- 100% authentication success for valid credentials
- 0% false positives for invalid credentials
- Token refresh functional before expiry
- Rate limiting active after threshold

#### 2.2.2 Authorization Tests (25 tests)

**File**: `/tests/a2a/security/authorization.test.ts`

**Test Scenarios**:

```typescript
describe('Authorization', () => {
  describe('Capability-Based Access Control', () => {
    it('should authorize agent with correct capability');
    it('should deny agent without required capability');
    it('should support capability wildcards');
    it('should enforce capability versions');
  });

  describe('Role-Based Access Control', () => {
    it('should authorize by role assignment');
    it('should support role hierarchies');
    it('should combine role and capability checks');
  });

  describe('Resource Permissions', () => {
    it('should check read permission');
    it('should check write permission');
    it('should check execute permission');
    it('should check delete permission');
  });

  describe('Audit Logging', () => {
    it('should log all authorization decisions');
    it('should log authorization failures with context');
    it('should include agent ID, resource, action');
  });
});
```

**Expected Results**:
- Authorization decisions accurate
- Audit logs complete
- No unauthorized access possible

#### 2.2.3 Message Security Tests (25 tests)

**File**: `/tests/a2a/security/message-security.test.ts`

**Test Scenarios**:

```typescript
describe('MessageSecurity', () => {
  describe('Digital Signatures', () => {
    it('should sign message with private key');
    it('should verify signature with public key');
    it('should detect tampered messages');
    it('should support RSA and ECDSA algorithms');
  });

  describe('End-to-End Encryption', () => {
    it('should encrypt message payload');
    it('should decrypt with recipient private key');
    it('should maintain message metadata unencrypted');
    it('should support key rotation');
  });

  describe('Replay Attack Prevention', () => {
    it('should reject duplicate nonces');
    it('should enforce timestamp validation (5min window)');
    it('should maintain nonce cache');
  });
});
```

**Expected Results**:
- Signature verification: 100% accuracy
- Tampered messages detected
- Replay attacks prevented
- Encryption/decryption functional

---

### 2.3 Memory Protocol Tests (100 tests, 25-35 hours)

#### 2.3.1 CRDT Operations Tests (60 tests)

**File**: `/tests/a2a/memory/crdt.test.ts`

**Test Scenarios**:

```typescript
describe('CRDT Operations', () => {
  describe('LWW-Element-Set', () => {
    it('should add elements with timestamp');
    it('should remove elements with timestamp');
    it('should merge concurrent additions');
    it('should resolve conflicts with last-write-wins');
    it('should handle network partition and merge');
  });

  describe('OR-Set (Observed-Remove)', () => {
    it('should add elements with unique tags');
    it('should remove elements by tag');
    it('should merge additions from different replicas');
    it('should preserve concurrent adds during remove');
  });

  describe('G-Counter (Grow-only Counter)', () => {
    it('should increment counter');
    it('should merge counters from replicas');
    it('should maintain monotonic growth');
  });

  describe('PN-Counter (Positive-Negative Counter)', () => {
    it('should increment counter');
    it('should decrement counter');
    it('should merge positive and negative deltas');
  });

  describe('Vector Clocks', () => {
    it('should increment on local update');
    it('should merge from remote clocks');
    it('should detect concurrent updates');
    it('should determine happens-before relationship');
  });
});
```

**Test Data**:
```typescript
// Concurrent update scenario
const scenario1 = {
  agent1: { key: 'users', operation: 'add', value: 'alice', timestamp: 1000 },
  agent2: { key: 'users', operation: 'add', value: 'bob', timestamp: 1001 }
};

// Conflict scenario
const scenario2 = {
  agent1: { key: 'counter', operation: 'set', value: 10, timestamp: 1000 },
  agent2: { key: 'counter', operation: 'set', value: 20, timestamp: 999 }
};
```

**Expected Results**:
- Eventual consistency achieved
- No data loss during merge
- Conflicts resolved per CRDT rules
- Performance: <10ms per operation

#### 2.3.2 Consistency Models Tests (20 tests)

**File**: `/tests/a2a/memory/consistency.test.ts`

**Test Scenarios**:

```typescript
describe('ConsistencyModels', () => {
  describe('Strong Consistency', () => {
    it('should enforce read-your-writes');
    it('should enforce linearizability');
    it('should block on quorum write');
  });

  describe('Eventual Consistency', () => {
    it('should allow stale reads');
    it('should converge to same state');
    it('should propagate asynchronously');
  });

  describe('Causal Consistency', () => {
    it('should respect happens-before relationships');
    it('should allow concurrent operations');
  });
});
```

**Expected Results**:
- Consistency guarantees upheld
- Performance trade-offs measured
- Configurable per operation

#### 2.3.3 Transaction Support Tests (20 tests)

**File**: `/tests/a2a/memory/transactions.test.ts`

**Test Scenarios**:

```typescript
describe('Transactions', () => {
  it('should begin transaction');
  it('should commit transaction');
  it('should rollback transaction on failure');
  it('should support ACID properties');
  it('should handle concurrent transactions');
  it('should detect and resolve deadlocks');
});
```

**Expected Results**:
- ACID properties maintained
- Rollback functional
- Deadlock detection working

---

## 3. Integration Testing Strategy

### 3.1 Agent Integration Tests (50 tests, 20-30 hours)

#### 3.1.1 Agent Registration Tests (15 tests)

**File**: `/tests/a2a/integration/agent-registration.test.ts`

**Test Scenarios**:

```typescript
describe('Agent Registration Integration', () => {
  it('should register Claude Flow agent with A2A registry');
  it('should advertise agent capabilities');
  it('should update registration on capability change');
  it('should deregister on agent termination');
  it('should maintain heartbeat to registry');
  it('should auto-deregister on TTL expiry');
});
```

**Setup**:
```bash
# Start registry service
docker-compose up service-registry

# Start Claude Flow with A2A
npx claude-flow a2a serve --port 3000
```

**Expected Results**:
- Agent appears in registry within 1s
- Capabilities correctly advertised
- Heartbeat maintains registration
- Deregistration on shutdown

#### 3.1.2 Message Routing Tests (20 tests)

**File**: `/tests/a2a/integration/message-routing.test.ts`

**Test Scenarios**:

```typescript
describe('Message Routing Integration', () => {
  it('should route message from Claude Flow to Codex agent');
  it('should route message from Gemini to Claude Flow agent');
  it('should handle multicast to multiple platforms');
  it('should implement priority queuing');
  it('should retry on delivery failure');
  it('should fallback to alternative agent on failure');
});
```

**Test Data**:
```typescript
const routingScenario = {
  from: { agentId: 'cf-agent-1', platform: 'claude-flow' },
  to: { agentId: 'codex-agent-1', platform: 'codex' },
  payload: { task: 'analyze security vulnerabilities' }
};
```

**Expected Results**:
- Messages routed correctly
- Delivery confirmed
- Latency <100ms (local network)

#### 3.1.3 Task Delegation Tests (15 tests)

**File**: `/tests/a2a/integration/task-delegation.test.ts`

**Test Scenarios**:

```typescript
describe('Task Delegation Integration', () => {
  it('should delegate task to remote agent');
  it('should receive task result');
  it('should handle task timeout');
  it('should cancel remote task');
  it('should track task progress');
  it('should handle task failure with retry');
});
```

**Expected Results**:
- Task executed on remote agent
- Result returned correctly
- Timeout handling functional
- Cancel propagates to remote agent

---

### 3.2 Platform Integration Tests (40 tests, 30-40 hours)

#### 3.2.1 Codex Integration Tests (15 tests)

**File**: `/tests/a2a/integration/platforms/codex.test.ts`

**Test Scenarios**:

```typescript
describe('Codex Platform Integration', () => {
  describe('Agent Lifecycle', () => {
    it('should spawn Codex agent via A2A');
    it('should pause Codex agent');
    it('should resume Codex agent');
    it('should terminate Codex agent');
  });

  describe('Task Execution', () => {
    it('should execute code analysis task on Codex');
    it('should retrieve task results');
    it('should handle Codex API errors');
    it('should translate A2A tasks to Codex format');
  });

  describe('Capability Mapping', () => {
    it('should map A2A capabilities to Codex capabilities');
    it('should translate task parameters');
    it('should parse Codex results to A2A format');
  });
});
```

**Setup**:
```bash
# Mock Codex server
node tests/mocks/codex-server.js --port 4001

# Run tests
npm run test:integration:codex
```

**Expected Results**:
- Codex agent spawned successfully
- Tasks execute correctly
- Results parsed and returned
- Error handling graceful

#### 3.2.2 Gemini-CLI Integration Tests (12 tests)

**File**: `/tests/a2a/integration/platforms/gemini.test.ts`

**Test Scenarios**:

```typescript
describe('Gemini-CLI Platform Integration', () => {
  it('should spawn Gemini agent via A2A');
  it('should execute research task with streaming');
  it('should parse structured output');
  it('should handle rate limiting');
  it('should translate prompts from A2A tasks');
});
```

**Expected Results**:
- Gemini agent spawned
- Streaming responses handled
- Rate limiting respected
- Structured output parsed

#### 3.2.3 OpenCode Integration Tests (13 tests)

**File**: `/tests/a2a/integration/platforms/opencode.test.ts`

**Test Scenarios**:

```typescript
describe('OpenCode Platform Integration', () => {
  it('should spawn OpenCode agent via A2A');
  it('should execute plugin-based task');
  it('should subscribe to OpenCode events');
  it('should handle event-driven communication');
});
```

**Expected Results**:
- OpenCode agent spawned
- Plugin tasks executed
- Events propagated correctly

---

## 4. End-to-End Testing Strategy

### 4.1 Cross-Platform Collaboration (20 scenarios, 30-40 hours)

#### 4.1.1 Multi-Agent Workflow Test

**File**: `/tests/a2a/e2e/multi-agent-workflow.test.ts`

**Scenario**: Research → Code → Review workflow across platforms

**Test Flow**:
```
1. Claude Flow Researcher agent starts
2. Discovers Codex Coder agent via A2A
3. Delegates coding task to Codex
4. Codex executes task, returns code
5. Claude Flow spawns Reviewer agent
6. Reviewer validates code
7. Results aggregated and returned
```

**Test Code**:
```typescript
describe('Multi-Agent Workflow E2E', () => {
  it('should complete full research-code-review workflow', async () => {
    // 1. Start research
    const researchTask = {
      type: 'research',
      query: 'best practices for API security'
    };

    const researcher = await claudeFlow.spawnAgent('researcher');
    const researchResult = await researcher.executeTask(researchTask);

    // 2. Discover coder
    const coders = await a2a.discoverAgents({
      capability: 'code_generation',
      platform: 'codex'
    });

    expect(coders.length).toBeGreaterThan(0);

    // 3. Delegate to Codex
    const codeTask = {
      type: 'code_generation',
      requirements: researchResult.summary
    };

    const code = await a2a.delegateTask(coders[0].id, codeTask);

    // 4. Review code
    const reviewer = await claudeFlow.spawnAgent('reviewer');
    const review = await reviewer.executeTask({
      type: 'code_review',
      code: code.result
    });

    expect(review.approved).toBe(true);
  }, 60000); // 60s timeout
});
```

**Expected Results**:
- Workflow completes successfully
- All agents collaborate correctly
- Final output valid
- Total time: <30s

#### 4.1.2 Memory Sharing Scenario

**File**: `/tests/a2a/e2e/memory-sharing.test.ts`

**Scenario**: Agent A (Claude Flow) writes to shared memory, Agent B (Gemini) reads

**Test Flow**:
```
1. Agent A writes knowledge to shared namespace
2. Memory syncs via A2A protocol
3. Agent B (different platform) reads from shared namespace
4. Verify data consistency
5. Agent B writes update
6. Agent A reads update
7. Verify bidirectional sync
```

**Test Code**:
```typescript
describe('Cross-Platform Memory Sharing E2E', () => {
  it('should sync memory between Claude Flow and Gemini agents', async () => {
    const namespace = 'shared/knowledge';

    // Agent A writes
    await claudeFlowAgent.writeMemory(namespace, 'api-patterns', {
      patterns: ['REST', 'GraphQL', 'gRPC'],
      best: 'REST for public APIs'
    });

    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Agent B reads
    const data = await geminiAgent.readMemory(namespace, 'api-patterns');

    expect(data).toEqual({
      patterns: ['REST', 'GraphQL', 'gRPC'],
      best: 'REST for public APIs'
    });

    // Verify consistency model
    expect(data.version).toBeDefined();
  });
});
```

**Expected Results**:
- Data synced within 2s
- No data loss
- Consistency maintained

#### 4.1.3 Event Subscription Scenario

**File**: `/tests/a2a/e2e/event-subscription.test.ts`

**Scenario**: Agent subscribes to events from all platforms

**Test Flow**:
```
1. Agent subscribes to "task:completed" events
2. Tasks execute on Claude Flow, Codex, Gemini
3. Agent receives all events
4. Verify event ordering
5. Verify no event loss
```

**Expected Results**:
- All events received
- Event order preserved per agent
- No duplicates

---

## 5. Performance Testing Strategy

### 5.1 Latency Benchmarks (10 benchmarks, 10-15 hours)

#### 5.1.1 Message Latency Test

**File**: `/tests/a2a/performance/message-latency.test.ts`

**Test Configuration**:
```typescript
const config = {
  messageCount: 10000,
  concurrentSenders: 10,
  messageSize: '1KB',
  scenarios: ['local', 'cross-platform']
};
```

**Test Code**:
```typescript
describe('Message Latency Benchmarks', () => {
  it('should measure P50, P95, P99 latency for local messages', async () => {
    const latencies: number[] = [];

    for (let i = 0; i < 10000; i++) {
      const start = performance.now();

      await messageHandler.send({
        from: 'agent-1',
        to: 'agent-2',
        payload: generatePayload(1024)
      });

      latencies.push(performance.now() - start);
    }

    const sorted = latencies.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    expect(p50).toBeLessThan(50); // <50ms
    expect(p95).toBeLessThan(200); // <200ms
    expect(p99).toBeLessThan(500); // <500ms
  });
});
```

**Performance Targets**:
| Metric | Local Network | Cross-Platform |
|--------|---------------|----------------|
| P50 | <50ms | <100ms |
| P95 | <200ms | <300ms |
| P99 | <500ms | <500ms |

**Acceptance Criteria**:
- P99 latency <500ms
- No timeouts
- Consistent performance across runs

#### 5.1.2 Throughput Test

**File**: `/tests/a2a/performance/throughput.test.ts`

**Test Configuration**:
```typescript
const config = {
  duration: 60000, // 1 minute
  concurrentAgents: 10,
  messagesPerAgent: 1000
};
```

**Performance Targets**:
- Single agent: >1000 msg/sec
- 10 agents: >5000 msg/sec aggregate
- 100 agents: >20000 msg/sec aggregate

**Metrics to Collect**:
- Messages sent/received per second
- CPU utilization
- Memory usage
- Network bandwidth

#### 5.1.3 Memory Sync Performance

**File**: `/tests/a2a/performance/memory-sync.test.ts`

**Test Scenarios**:
```typescript
describe('Memory Sync Performance', () => {
  it('should sync 1000 entries within 1 second', async () => {
    const agent1 = new A2AMemoryManager({ agentId: 'agent-1' });
    const agent2 = new A2AMemoryManager({ agentId: 'agent-2' });

    // Write 1000 entries
    for (let i = 0; i < 1000; i++) {
      await agent1.set(`key-${i}`, `value-${i}`, 'lww-set');
    }

    // Measure sync time
    const start = performance.now();
    await agent2.sync('agent-1');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000); // <1s

    // Verify all entries synced
    for (let i = 0; i < 1000; i++) {
      const value = await agent2.get(`key-${i}`);
      expect(value).toBe(`value-${i}`);
    }
  });
});
```

**Performance Targets**:
- Strong consistency: <1s for 1000 entries
- Eventual consistency: <5s for 10000 entries
- No data loss

---

### 5.2 Scalability Tests (5 benchmarks, 15-20 hours)

#### 5.2.1 Agent Scalability Test

**File**: `/tests/a2a/performance/agent-scalability.test.ts`

**Test Scenarios**:
```typescript
describe('Agent Scalability', () => {
  it('should support 1,000 concurrent agents', async () => {
    const agents = [];

    // Spawn 1000 agents
    for (let i = 0; i < 1000; i++) {
      agents.push(await agentManager.createAgent('coder', {
        a2aEnabled: true
      }));
    }

    // Verify all registered
    const registered = await discoveryService.queryAll();
    expect(registered.length).toBeGreaterThanOrEqual(1000);

    // Verify system health
    const metrics = await system.getMetrics();
    expect(metrics.cpuUsage).toBeLessThan(80); // <80% CPU
    expect(metrics.memoryUsage).toBeLessThan(4096); // <4GB RAM
  });

  it('should maintain performance with 10,000 agents', async () => {
    // Spawn 10,000 agents
    // Measure degradation
    // Verify acceptable performance
  });
});
```

**Scalability Targets**:
| Agent Count | Response Time | CPU Usage | Memory Usage |
|-------------|---------------|-----------|--------------|
| 1,000 | <100ms | <50% | <2GB |
| 10,000 | <200ms | <80% | <8GB |
| 100,000 | Graceful degradation | Monitor | Monitor |

**Metrics to Monitor**:
- Response time degradation
- Resource utilization
- Error rate increase
- Message queue depth

---

## 6. Interoperability Testing

### 6.1 Platform Interoperability Matrix

| Test Scenario | Codex | Gemini-CLI | OpenCode | AutoGen | LangChain |
|---------------|-------|------------|----------|---------|-----------|
| Basic Messaging | ✅ | ✅ | ✅ | ✅ | ✅ |
| Memory Sync | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Discovery | ✅ | ✅ | ✅ | ✅ | ✅ |
| Event Subscription | ✅ | ✅ | ✅ | ✅ | ✅ |
| Complex Workflows | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ |

**Legend**: ✅ Full support | ⚠️ Partial support | ❌ Not supported

### 6.2 Codex Interoperability Tests (15 tests)

**File**: `/tests/a2a/interop/codex.test.ts`

**Test Scenarios**:
```typescript
describe('Codex Interoperability', () => {
  beforeAll(async () => {
    // Start Codex server
    await startCodexServer({ port: 4001, a2aMode: true });
    // Start Claude Flow
    await startClaudeFlow({ port: 3000, a2aEnabled: true });
  });

  it('should discover Codex agents from Claude Flow', async () => {
    const agents = await claudeFlow.discoverAgents({
      platform: 'codex',
      capability: 'code_analysis'
    });

    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0].platform).toBe('codex');
  });

  it('should delegate task from Claude Flow to Codex', async () => {
    const task = {
      type: 'code_analysis',
      code: 'function hello() { console.log("test"); }'
    };

    const result = await claudeFlow.delegateTask('codex-agent-1', task);

    expect(result.analysis).toBeDefined();
    expect(result.issues).toBeInstanceOf(Array);
  });

  it('should handle Codex errors gracefully', async () => {
    const invalidTask = {
      type: 'invalid_task_type'
    };

    await expect(
      claudeFlow.delegateTask('codex-agent-1', invalidTask)
    ).rejects.toThrow('Unsupported task type');
  });
});
```

**Expected Results**:
- All Codex agents discoverable
- Task delegation functional
- Results correctly parsed
- Errors handled gracefully

### 6.3 Gemini-CLI Interoperability Tests (12 tests)

**File**: `/tests/a2a/interop/gemini.test.ts`

**Test Scenarios**:
```typescript
describe('Gemini-CLI Interoperability', () => {
  it('should stream responses from Gemini agent', async () => {
    const task = {
      type: 'research',
      query: 'Latest AI frameworks for 2025'
    };

    const stream = await claudeFlow.delegateTaskStream('gemini-agent-1', task);

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle Gemini rate limiting', async () => {
    // Send 100 requests rapidly
    const promises = Array(100).fill(null).map(() =>
      claudeFlow.delegateTask('gemini-agent-1', { type: 'simple-query' })
    );

    const results = await Promise.allSettled(promises);

    // Some should succeed, some should be rate limited
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const rateLimited = results.filter(r =>
      r.status === 'rejected' && r.reason.code === 'RATE_LIMIT_EXCEEDED'
    );

    expect(succeeded.length).toBeGreaterThan(0);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

**Expected Results**:
- Streaming responses work
- Rate limiting detected and handled
- Structured output parsed

### 6.4 Cross-Platform Workflow Tests (10 tests)

**File**: `/tests/a2a/interop/cross-platform-workflow.test.ts`

**Test Scenario**: Complex workflow involving multiple platforms

**Workflow**:
```
Claude Flow (Researcher)
    ↓
Codex (Code Generator)
    ↓
Gemini (Documentation Writer)
    ↓
OpenCode (Deployment)
    ↓
Claude Flow (Validator)
```

**Test Code**:
```typescript
describe('Cross-Platform Workflow', () => {
  it('should complete full development pipeline across platforms', async () => {
    // 1. Research (Claude Flow)
    const research = await cfResearcher.executeTask({
      type: 'research',
      query: 'microservices patterns'
    });

    // 2. Code (Codex)
    const code = await codexCoder.executeTask({
      type: 'code_generation',
      spec: research.summary
    });

    // 3. Document (Gemini)
    const docs = await geminiWriter.executeTask({
      type: 'documentation',
      code: code.result
    });

    // 4. Deploy (OpenCode)
    const deployment = await opencodeDeployer.executeTask({
      type: 'deploy',
      code: code.result,
      docs: docs.result
    });

    // 5. Validate (Claude Flow)
    const validation = await cfValidator.executeTask({
      type: 'validate_deployment',
      deployment: deployment.result
    });

    expect(validation.success).toBe(true);
  }, 120000); // 2 min timeout
});
```

**Expected Results**:
- Workflow completes successfully
- Data passed correctly between platforms
- Error handling at each stage
- Total time: <2 minutes

---

## 7. Security Testing

### 7.1 Authentication Tests (30 tests, 15-20 hours)

#### 7.1.1 Brute Force Attack Simulation

**File**: `/tests/a2a/security/brute-force.test.ts`

**Test Scenarios**:
```typescript
describe('Brute Force Attack Prevention', () => {
  it('should rate limit failed authentication attempts', async () => {
    const attempts = [];

    // Attempt 20 failed logins
    for (let i = 0; i < 20; i++) {
      attempts.push(
        authProvider.authenticate('invalid-token-' + i)
          .catch(err => ({ error: err.message }))
      );
    }

    const results = await Promise.all(attempts);

    // First 10 should get "Invalid token"
    // Remaining should get "Rate limit exceeded"
    const invalidTokenErrors = results.filter(r =>
      r.error === 'Invalid token'
    );
    const rateLimitErrors = results.filter(r =>
      r.error.includes('Rate limit')
    );

    expect(invalidTokenErrors.length).toBeLessThanOrEqual(10);
    expect(rateLimitErrors.length).toBeGreaterThan(0);
  });

  it('should lock account after threshold failures', async () => {
    // Attempt 5 failed logins for same agent
    for (let i = 0; i < 5; i++) {
      await authProvider.authenticate('wrong-token')
        .catch(() => {});
    }

    // Next attempt should be locked
    await expect(
      authProvider.authenticate('correct-token')
    ).rejects.toThrow('Account locked');
  });
});
```

**Expected Results**:
- Rate limiting activates after 10 attempts
- Account locked after 5 failures
- Lockout duration: 15 minutes

#### 7.1.2 Token Security Tests

**File**: `/tests/a2a/security/token-security.test.ts`

**Test Scenarios**:
```typescript
describe('Token Security', () => {
  it('should reject tokens with invalid signatures', async () => {
    const token = await authProvider.generateToken('agent-1', []);
    const tamperedToken = token.slice(0, -10) + 'TAMPERED123';

    await expect(
      authProvider.authenticate(tamperedToken)
    ).rejects.toThrow('Invalid signature');
  });

  it('should enforce token expiration', async () => {
    const shortLivedProvider = new JWTAuthProvider({
      secret: 'test',
      expiresIn: '1s'
    });

    const token = await shortLivedProvider.generateToken('agent-1', []);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1500));

    await expect(
      shortLivedProvider.authenticate(token)
    ).rejects.toThrow('Token expired');
  });

  it('should support token refresh before expiry', async () => {
    const token = await authProvider.generateToken('agent-1', ['read']);

    // Refresh token
    const newToken = await authProvider.refreshToken(token);

    expect(newToken).not.toBe(token);

    // New token should be valid
    const identity = await authProvider.authenticate(newToken);
    expect(identity.agentId).toBe('agent-1');
  });
});
```

**Expected Results**:
- Tampered tokens rejected
- Expired tokens rejected
- Refresh mechanism functional

---

### 7.2 Authorization Tests (25 tests, 10-15 hours)

#### 7.2.1 Permission Boundary Tests

**File**: `/tests/a2a/security/authorization.test.ts`

**Test Scenarios**:
```typescript
describe('Authorization Boundary Tests', () => {
  it('should deny access to resource without permission', async () => {
    const agent = { id: 'agent-1', capabilities: ['read'] };

    await expect(
      authorizer.checkPermission(agent, 'resource-1', 'write')
    ).rejects.toThrow('Permission denied');
  });

  it('should allow access with correct capability', async () => {
    const agent = { id: 'agent-1', capabilities: ['code_analysis'] };

    const allowed = await authorizer.checkPermission(
      agent,
      'code-repo-1',
      'analyze'
    );

    expect(allowed).toBe(true);
  });

  it('should support wildcard capabilities', async () => {
    const agent = { id: 'admin', capabilities: ['*'] };

    const allowed = await authorizer.checkPermission(
      agent,
      'any-resource',
      'any-action'
    );

    expect(allowed).toBe(true);
  });
});
```

**Expected Results**:
- Unauthorized access denied
- Authorized access allowed
- Wildcard capabilities work

#### 7.2.2 Audit Logging Tests

**File**: `/tests/a2a/security/audit-logging.test.ts`

**Test Scenarios**:
```typescript
describe('Audit Logging', () => {
  it('should log all authorization decisions', async () => {
    await authorizer.checkPermission(agent, resource, action);

    const logs = await auditLogger.getLogs({ agentId: agent.id });

    expect(logs).toContainEqual(
      expect.objectContaining({
        agentId: agent.id,
        resource,
        action,
        decision: 'allowed' | 'denied',
        timestamp: expect.any(Number)
      })
    );
  });

  it('should log authorization failures with context', async () => {
    try {
      await authorizer.checkPermission(agent, resource, 'forbidden-action');
    } catch (err) {
      // Expected
    }

    const logs = await auditLogger.getLogs({ decision: 'denied' });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].reason).toBeDefined();
  });
});
```

**Expected Results**:
- All authorization decisions logged
- Logs include context
- Logs tamper-proof

---

## 8. Test Data Management

### 8.1 Test Data Generation

#### 8.1.1 Message Fixtures

**File**: `/tests/fixtures/messages.ts`

```typescript
export const messageFixtures = {
  validTaskRequest: {
    version: '1.0.0',
    type: MessageType.TASK_REQUEST,
    messageId: 'msg-001',
    from: { agentId: 'agent-1', platform: 'claude-flow' },
    to: { agentId: 'agent-2', platform: 'codex' },
    priority: MessagePriority.HIGH,
    timestamp: Date.now(),
    payload: {
      taskId: 'task-001',
      taskType: 'code_analysis',
      description: 'Analyze security vulnerabilities',
      requiredCapabilities: ['code_analysis'],
      priority: MessagePriority.HIGH,
      input: { codeUrl: 'https://github.com/example/repo' }
    }
  },

  invalidMessage: {
    // Missing required fields
    version: '1.0.0',
    type: MessageType.TASK_REQUEST,
    messageId: 'msg-002'
    // Missing: from, to, priority, timestamp, payload
  },

  // ... more fixtures
};
```

#### 8.1.2 Agent Fixtures

**File**: `/tests/fixtures/agents.ts`

```typescript
export const agentFixtures = {
  claudeFlowAgent: {
    id: 'cf-agent-1',
    name: 'Claude Flow Coder',
    version: '2.5.0',
    platform: 'claude-flow',
    capabilities: [
      {
        type: 'code_generation',
        subtypes: ['typescript', 'python'],
        version: '1.0.0',
        sla: {
          avg_response_time_ms: 200,
          availability: 99.5
        }
      }
    ],
    endpoints: [
      {
        protocol: 'https',
        url: 'https://localhost:3000',
        health_check: '/health'
      }
    ]
  },

  codexAgent: {
    id: 'codex-agent-1',
    name: 'Codex Analyzer',
    version: '1.0.0',
    platform: 'codex',
    capabilities: [
      {
        type: 'code_analysis',
        subtypes: ['security', 'performance'],
        version: '1.0.0'
      }
    ]
  },

  // ... more fixtures
};
```

### 8.2 Test Data Cleanup

**Strategy**: Clean up test data after each test suite

```typescript
afterAll(async () => {
  // Clean up agents
  await testAgents.forEach(async (agent) => {
    await agentManager.terminateAgent(agent.id);
  });

  // Clean up memory
  await memoryManager.clearNamespace('test/*');

  // Deregister from registry
  await discoveryService.deregisterAll({ test: true });

  // Close connections
  await transport.closeAll();
});
```

---

## 9. Test Automation

### 9.1 CI/CD Pipeline Integration

**File**: `.github/workflows/a2a-tests.yml`

```yaml
name: A2A Protocol Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:a2a:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:a2a:integration
        env:
          REDIS_URL: redis://localhost:6379

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: integration-results
          path: test-results/integration/

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start Claude Flow
        run: |
          npx claude-flow a2a serve --port 3000 &
          sleep 5

      - name: Start mock platforms
        run: |
          node tests/mocks/codex-server.js --port 4001 &
          node tests/mocks/gemini-server.js --port 4002 &
          sleep 3

      - name: Run E2E tests
        run: npm run test:a2a:e2e

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-screenshots
          path: test-results/e2e/screenshots/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:a2a:performance

      - name: Upload performance report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: test-results/performance/

  security-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v3

      - name: Run security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'

      - name: Run OWASP ZAP scan
        run: |
          docker run -v $(pwd):/zap/wrk/:rw \
            -t owasp/zap2docker-stable \
            zap-baseline.py \
            -t http://localhost:3000 \
            -r zap-report.html

      - name: Upload security report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: zap-report.html
```

### 9.2 Test Result Reporting

**Coverage Report Generation**:

```bash
# Generate coverage report
npm run test:a2a:coverage

# Output formats:
# - HTML: coverage/index.html
# - LCOV: coverage/lcov.info
# - JSON: coverage/coverage-final.json
```

**Performance Report Generation**:

```bash
# Run performance benchmarks
npm run test:a2a:performance

# Generate HTML report
npx lighthouse-ci upload \
  --serverBaseUrl=http://localhost:9001 \
  --uploadUrlMap=performance-results.json
```

---

## 10. Test Execution Schedule

### 10.1 Phase-by-Phase Testing

**Phase 1: Foundation (Weeks 1-3)**

| Week | Test Focus | Test Count | Status |
|------|-----------|------------|--------|
| Week 1 | Message protocol unit tests | 150 tests | ⏳ Pending |
| Week 2 | Transport layer unit tests | 80 tests | ⏳ Pending |
| Week 3 | Security unit tests | 50 tests | ⏳ Pending |

**Success Criteria**:
- All unit tests passing
- >85% code coverage
- Zero critical bugs

**Phase 2: Platform Integration (Weeks 4-6)**

| Week | Test Focus | Test Count | Status |
|------|-----------|------------|--------|
| Week 4 | Agent integration tests | 50 tests | ⏳ Pending |
| Week 5 | Codex platform tests | 15 tests | ⏳ Pending |
| Week 6 | Gemini, OpenCode tests | 25 tests | ⏳ Pending |

**Success Criteria**:
- All integration tests passing
- Platform adapters functional
- Inter-agent communication working

**Phase 3: Advanced Features (Weeks 7-9)**

| Week | Test Focus | Test Count | Status |
|------|-----------|------------|--------|
| Week 7 | Memory sync tests | 100 tests | ⏳ Pending |
| Week 8 | Event system tests | 40 tests | ⏳ Pending |
| Week 9 | Resource coordinator tests | 30 tests | ⏳ Pending |

**Success Criteria**:
- Memory sync functional
- Events propagating correctly
- Resource allocation working

**Phase 4: Production Readiness (Weeks 10-12)**

| Week | Test Focus | Test Count | Status |
|------|-----------|------------|--------|
| Week 10 | E2E tests | 20 scenarios | ⏳ Pending |
| Week 11 | Performance tests | 10 benchmarks | ⏳ Pending |
| Week 12 | Security audit & fixes | 55 tests | ⏳ Pending |

**Success Criteria**:
- All E2E scenarios passing
- Performance targets met
- Security audit passed

### 10.2 Continuous Testing Cadence

**Daily**:
- Unit tests on every commit
- Integration tests on every PR
- Code coverage reports

**Weekly**:
- Performance benchmarks
- Security scans
- Cross-platform interop tests

**Monthly**:
- Full regression suite
- Load testing
- Penetration testing

**Quarterly**:
- Comprehensive security audit
- Performance optimization review
- Test strategy review

---

## 11. Tools and Frameworks

### 11.1 Testing Frameworks

**Primary Framework**: Jest

```json
{
  "scripts": {
    "test:a2a": "jest --config=jest.a2a.config.js",
    "test:a2a:unit": "jest --config=jest.a2a.config.js --testPathPattern=unit",
    "test:a2a:integration": "jest --config=jest.a2a.config.js --testPathPattern=integration",
    "test:a2a:e2e": "jest --config=jest.a2a.config.js --testPathPattern=e2e",
    "test:a2a:coverage": "jest --config=jest.a2a.config.js --coverage"
  }
}
```

**Jest Configuration** (`jest.a2a.config.js`):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/a2a'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/a2a/**/*.ts',
    '!src/a2a/**/*.d.ts',
    '!src/a2a/**/index.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 4
};
```

### 11.2 Performance Testing Tools

**k6 for Load Testing**:

```javascript
// tests/a2a/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up
    { duration: '1m', target: 100 },   // Stay at 100
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const message = {
    jsonrpc: '2.0',
    method: 'task.assign',
    params: { task: 'test' },
    id: __VU + '-' + __ITER,
    from: 'load-test-agent',
    to: 'target-agent',
    conversation_id: 'load-test',
    timestamp: new Date().toISOString(),
    a2a_version: '1.0'
  };

  const res = http.post('http://localhost:3000/a2a', JSON.stringify(message), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Artillery for Scenario Testing**:

```yaml
# tests/a2a/performance/scenario.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Sustained load

scenarios:
  - name: Task delegation workflow
    flow:
      - post:
          url: '/a2a/discover'
          json:
            capability: 'code_analysis'
      - post:
          url: '/a2a/task'
          json:
            taskType: 'analysis'
            target: '{{ agentId }}'
```

### 11.3 Security Testing Tools

**OWASP ZAP Configuration**:

```bash
# Run ZAP baseline scan
docker run -v $(pwd):/zap/wrk/:rw \
  -t owasp/zap2docker-stable \
  zap-baseline.py \
  -t http://localhost:3000 \
  -c zap-config.conf \
  -r zap-report.html
```

**Trivy for Dependency Scanning**:

```bash
# Scan for vulnerabilities
trivy fs . --severity CRITICAL,HIGH --format json > trivy-report.json
```

### 11.4 Mocking and Test Utilities

**Platform Mock Servers**:

**File**: `/tests/mocks/codex-server.js`

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Mock Codex agent endpoint
app.post('/a2a', (req, res) => {
  const { method, params } = req.body;

  if (method === 'task.execute') {
    // Simulate Codex code analysis
    res.json({
      jsonrpc: '2.0',
      result: {
        analysis: {
          issues: [
            { type: 'security', severity: 'high', line: 42 }
          ],
          score: 85
        }
      },
      id: req.body.id
    });
  } else {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32601, message: 'Method not found' },
      id: req.body.id
    });
  }
});

const PORT = process.argv[3] || 4001;
app.listen(PORT, () => {
  console.log(`Mock Codex server running on port ${PORT}`);
});
```

### 11.5 Test Reporting Tools

**Jest HTML Reporter**:

```javascript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'A2A Protocol Test Report',
        outputPath: 'test-results/index.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
  ],
};
```

**Allure for Advanced Reporting**:

```bash
# Generate Allure report
npx allure generate test-results/allure-results --clean -o test-results/allure-report

# Serve report
npx allure serve test-results/allure-results
```

---

## 12. Appendices

### Appendix A: Test Command Reference

```bash
# Unit Tests
npm run test:a2a:unit                    # All unit tests
npm run test:a2a:unit:protocol           # Protocol layer only
npm run test:a2a:unit:security           # Security tests only
npm run test:a2a:unit:memory             # Memory tests only

# Integration Tests
npm run test:a2a:integration             # All integration tests
npm run test:a2a:integration:platforms   # Platform integration only
npm run test:a2a:integration:codex       # Codex integration only

# End-to-End Tests
npm run test:a2a:e2e                     # All E2E tests
npm run test:a2a:e2e:workflows           # Workflow tests only

# Performance Tests
npm run test:a2a:performance             # All performance tests
npm run test:a2a:performance:load        # Load tests only
npm run test:a2a:performance:stress      # Stress tests only

# Security Tests
npm run test:a2a:security                # All security tests
npm run test:a2a:security:auth           # Authentication tests only
npm run test:a2a:security:authz          # Authorization tests only

# Coverage
npm run test:a2a:coverage                # Generate coverage report
npm run test:a2a:coverage:view           # Open coverage report

# All Tests
npm run test:a2a:all                     # Run all A2A tests
```

### Appendix B: Test Data Locations

```
tests/
├── a2a/
│   ├── fixtures/
│   │   ├── messages.ts          # Message test data
│   │   ├── agents.ts            # Agent test data
│   │   ├── capabilities.ts      # Capability test data
│   │   └── scenarios.ts         # E2E scenario data
│   ├── mocks/
│   │   ├── codex-server.js      # Codex mock server
│   │   ├── gemini-server.js     # Gemini mock server
│   │   └── opencode-server.js   # OpenCode mock server
│   └── helpers/
│       ├── setup.ts             # Test setup utilities
│       ├── teardown.ts          # Test cleanup utilities
│       └── assertions.ts        # Custom assertions
```

### Appendix C: Performance Baseline

**Baseline Metrics** (measured on standardized hardware):

```
Hardware: 8 vCPU, 16GB RAM, SSD
Network: 1Gbps local network

Message Latency:
  P50: 35ms
  P95: 150ms
  P99: 380ms

Throughput:
  Single agent: 1250 msg/sec
  10 agents: 6500 msg/sec
  100 agents: 28000 msg/sec

Memory Sync:
  1000 entries: 750ms
  10000 entries: 3.2s

Agent Discovery:
  Time to discover: 2.1s
  Query response time: 45ms

Resource Usage:
  1000 agents: 1.8GB RAM, 35% CPU
  10000 agents: 6.2GB RAM, 72% CPU
```

---

## Document Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| QA Lead | TBD | ☐ Pending | |
| Tech Lead | TBD | ☐ Pending | |
| Security Lead | TBD | ☐ Pending | |
| Architecture Team | TBD | ☐ Pending | |

**Document Version**: 1.0.0
**Last Updated**: 2025-10-01
**Next Review**: 2025-11-01

---

**END OF DOCUMENT**
