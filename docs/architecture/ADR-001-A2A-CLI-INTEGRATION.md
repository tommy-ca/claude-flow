# ADR-001: A2A CLI Integration Architecture

**Status**: Proposed
**Date**: 2025-10-01
**Deciders**: Architecture Team
**Related Documents**:
- [A2A CLI Gap Analysis](./A2A-CLI-GAP-ANALYSIS.md)
- [A2A CLI Adapter Architecture](./A2A-CLI-ADAPTER-ARCHITECTURE.md)
- [A2A CLI Agents Research](./A2A-CLI-AGENTS-RESEARCH.md)

---

## Context and Problem Statement

Claude Flow currently uses a message-based A2A (Agent-to-Agent) protocol for internal agent communication. We need to extend this system to integrate with external CLI-based AI agent tools (codex-cli, cursor-agent, gemini-cli) while maintaining the existing architecture and enabling seamless communication between internal and external agents.

**Key Challenges**:
1. Process lifecycle management for external CLI tools
2. Protocol translation between A2A messages and CLI-specific formats
3. Context passing strategies for different data sizes and CLI requirements
4. Session management and process reuse (critical for Cursor Agent)
5. Real-time streaming output parsing and error handling
6. MCP (Model Context Protocol) integration decision

**Quality Attributes Required**:
- **Performance**: Minimize spawn overhead, enable process reuse
- **Reliability**: Handle process failures, implement retry logic
- **Scalability**: Support multiple concurrent CLI processes
- **Extensibility**: Easy to add new CLI adapters
- **Maintainability**: Clean separation of concerns, testable design

---

## Decision Drivers

1. **Compatibility**: All three target CLIs (codex-cli, cursor-agent, gemini-cli) must be supported
2. **Performance**: Reduce latency (target: 80% reduction via session reuse for Cursor)
3. **Existing Infrastructure**: Leverage current A2A message infrastructure (90% complete)
4. **MCP Support**: All three CLIs support MCP, creating integration opportunity
5. **Developer Experience**: Simple, consistent API for adding new CLI adapters
6. **Error Recovery**: Robust handling of CLI process failures
7. **Resource Management**: Efficient process pooling and cleanup

---

## Considered Options

### Option 1: Direct CLI Integration (Recommended)

**Description**: Build dedicated adapter layer that spawns/manages CLI processes directly, with protocol translation between A2A messages and CLI-specific formats.

**Architecture Components**:
```
┌─────────────────────────────────────────────────────┐
│           A2A Message Infrastructure                 │
│  (Existing - 90% Complete)                          │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         CLI Adapter Layer (New)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │   Codex     │  │   Cursor    │  │   Gemini    ││
│  │  Adapter    │  │   Adapter   │  │   Adapter   ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│       Core Infrastructure (New)                      │
│  - Process Manager                                   │
│  - Protocol Translator                               │
│  - Context Manager                                   │
│  - Session Manager                                   │
└─────────────────────────────────────────────────────┘
```

**Pros**:
- Full control over process lifecycle
- Optimized for each CLI's specific behavior
- No dependency on MCP server infrastructure
- Lower latency (direct process communication)
- Easier debugging (direct stdout/stderr access)

**Cons**:
- Need to implement process management from scratch
- Must handle CLI-specific quirks individually
- More code to maintain (368 hours critical path)

**Effort**: 1072 hours (6-8 months, 2 developers)

---

### Option 2: MCP-Only Integration

**Description**: Use MCP as the exclusive transport layer, converting all A2A messages to MCP protocol and communicating with CLIs only via MCP.

**Architecture Components**:
```
┌─────────────────────────────────────────────────────┐
│           A2A Message Infrastructure                 │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         A2A-to-MCP Translator                        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│            MCP Server Layer                          │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    [Codex]     [Cursor]     [Gemini]
    (MCP mode)  (MCP mode)   (MCP mode)
```

**Pros**:
- Standardized protocol across all CLIs
- Leverage existing MCP tooling/ecosystem
- Future-proof (MCP gaining adoption)
- Less CLI-specific code

**Cons**:
- Requires MCP server infrastructure (overhead)
- Additional protocol translation layer (latency)
- Less control over CLI-specific optimizations
- Cursor session reuse may be harder to implement
- MCP maturity/stability concerns

**Effort**: ~800 hours (but less flexible)

---

### Option 3: Hybrid Approach

**Description**: Use direct CLI integration as primary method, with MCP as fallback/extension mechanism.

**Architecture Components**:
```
┌─────────────────────────────────────────────────────┐
│           A2A Message Infrastructure                 │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  CLI Adapter     │    │  MCP Adapter     │
│  (Primary)       │    │  (Extensions)    │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
    [Direct CLI]            [MCP Server]
```

**Pros**:
- Best of both worlds (performance + extensibility)
- Can leverage MCP for advanced features (tools, resources)
- Gradual migration path if MCP matures
- Optimized primary path for core operations

**Cons**:
- Most complex implementation
- Need to maintain both integration paths
- Increased testing surface

**Effort**: 1200 hours (7-9 months, 2 developers)

---

## Decision Outcome

**Chosen Option**: **Option 1 - Direct CLI Integration**

**Rationale**:

1. **Performance Requirements**: Session reuse for Cursor Agent requires direct process control (80% latency reduction target)
2. **Existing Infrastructure**: 90% of A2A message infrastructure already complete - build on this strength
3. **Maturity**: Direct CLI integration is proven, MCP ecosystem still maturing
4. **Control**: Need fine-grained control over context passing strategies (STDIN/TEMP_FILE/WORKING_DIR)
5. **Debugging**: Direct stdout/stderr access critical for troubleshooting
6. **Incremental Path**: Can add MCP support later if needed (not blocked by this decision)

**Implementation Strategy**: 4-phase rollout over 6-8 months

---

## Consequences

### Positive

1. **Performance**: Optimal latency via direct process communication
2. **Flexibility**: Full control over CLI-specific optimizations
3. **Simplicity**: No additional MCP server infrastructure required
4. **Debugging**: Direct access to CLI stdout/stderr
5. **Resource Control**: Fine-grained process pooling and lifecycle management

### Negative

1. **Development Effort**: 1072 hours total implementation time
2. **Maintenance**: Need to handle CLI-specific quirks in adapters
3. **Future Migration**: If MCP becomes standard, may need refactoring
4. **Code Volume**: More code than pure MCP approach

### Neutral

1. **MCP Support**: Can add as extension later without major refactoring
2. **Testing**: Need comprehensive process management tests
3. **Documentation**: Requires detailed CLI adapter documentation

---

## Technical Design

### Core Interfaces

```typescript
/**
 * Base CLI Adapter Interface
 * All CLI-specific adapters must implement this
 */
interface CLIAdapter {
  // Process lifecycle
  spawn(config: CLISpawnConfig): Promise<CLIProcess>;
  terminate(process: CLIProcess): Promise<void>;

  // Communication
  execute(message: A2AMessage): Promise<AsyncIterator<A2AResponse>>;
  sendInput(process: CLIProcess, input: CLIInput): Promise<void>;

  // Session management
  createSession(config: SessionConfig): Promise<CLISession>;
  reuseSession(sessionId: string, message: A2AMessage): Promise<AsyncIterator<A2AResponse>>;

  // Health & monitoring
  healthCheck(process: CLIProcess): Promise<HealthStatus>;
  getMetrics(): CLIMetrics;
}

/**
 * Process Manager
 * Handles CLI process lifecycle, pooling, cleanup
 */
interface CLIProcessManager {
  // Process pool management
  spawn(config: CLISpawnConfig): Promise<CLIProcess>;
  getPooledProcess(cliType: string): Promise<CLIProcess>;
  releaseProcess(process: CLIProcess): Promise<void>;
  terminateAll(): Promise<void>;

  // Health monitoring
  monitorHealth(process: CLIProcess): void;
  handleCrash(process: CLIProcess, error: Error): Promise<void>;

  // Resource management
  getActiveProcessCount(): number;
  cleanupIdle(maxIdleTime: number): Promise<number>;
}

/**
 * Protocol Translator
 * Converts between A2A messages and CLI-specific formats
 */
interface CLIProtocolTranslator {
  // Input translation
  translateInput(message: MessageEnvelope, cliType: CLIType): CLIInput;
  formatContext(context: TaskContext, strategy: ContextStrategy): string;

  // Output translation
  translateOutput(cliOutput: CLIOutput, cliType: CLIType): MessageEnvelope;
  parseStream(stream: ReadableStream, format: OutputFormat): AsyncIterator<A2AResponse>;

  // Error handling
  translateError(cliError: CLIError): A2AError;
}

/**
 * Context Manager
 * Handles context passing strategies
 */
interface CLIContextManager {
  // Strategy selection
  selectStrategy(context: TaskContext, cli: CLIConfig): ContextStrategy;

  // Context serialization
  serializeToStdin(context: TaskContext): string;
  serializeToFile(context: TaskContext): Promise<string>; // Returns file path
  serializeToWorkingDir(context: TaskContext): Promise<string>; // Returns dir path
  serializeToEnv(context: TaskContext): Record<string, string>;

  // Cleanup
  cleanupTempFiles(): Promise<void>;
}

/**
 * Session Manager
 * Manages long-running CLI sessions (critical for Cursor)
 */
interface CLISessionManager {
  // Session lifecycle
  createSession(config: SessionConfig): Promise<CLISession>;
  getSession(sessionId: string): Promise<CLISession | null>;
  closeSession(sessionId: string): Promise<void>;

  // State management
  saveState(session: CLISession): Promise<void>;
  restoreState(sessionId: string): Promise<CLISession>;

  // Health
  keepAlive(sessionId: string): Promise<void>;
  validateSession(sessionId: string): Promise<boolean>;
}
```

### Context Passing Strategies

```typescript
enum ContextStrategy {
  STDIN = 'stdin',           // < 10KB: Direct pipe
  TEMP_FILE = 'temp_file',   // 10KB - 1MB: Temp file
  WORKING_DIR = 'working_dir', // > 1MB: Working directory
  ENVIRONMENT = 'environment', // Small metadata
  ARGS = 'args',              // Command arguments
  HYBRID = 'hybrid'           // Combination
}

/**
 * Strategy Selection Logic
 */
function selectContextStrategy(
  context: TaskContext,
  cli: CLIConfig
): ContextStrategy {
  const size = estimateSize(context);

  if (size < 10 * 1024) {
    return ContextStrategy.STDIN;
  } else if (size < 1024 * 1024) {
    return ContextStrategy.TEMP_FILE;
  } else {
    return ContextStrategy.WORKING_DIR;
  }
}
```

### CLI-Specific Adapters

#### Codex Adapter
```typescript
class CodexCLIAdapter implements CLIAdapter {
  async execute(message: A2AMessage): Promise<AsyncIterator<A2AResponse>> {
    // Use STDIN for context (Codex preference)
    const input = this.formatContextForStdin(message.context);

    // Spawn with --pipe mode
    const process = await this.spawn({
      command: 'codex-cli',
      args: ['--pipe', '--format', 'json'],
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Write to stdin
    await this.sendInput(process, input);

    // Parse JSON output
    return this.parseJsonStream(process.stdout);
  }
}
```

#### Cursor Adapter
```typescript
class CursorCLIAdapter implements CLIAdapter {
  private sessions: Map<string, CLISession> = new Map();

  async createSession(config: SessionConfig): Promise<CLISession> {
    // Spawn Cursor in persistent mode
    const process = await this.spawn({
      command: 'cursor-agent',
      args: ['--ndjson-rpc'],
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Initialize LSP workspace
    await this.sendJsonRpc(process, {
      method: 'initialize',
      params: { workspaceRoot: config.workspaceRoot }
    });

    const session = {
      id: generateId(),
      process,
      state: { initialized: true },
      lastUsed: Date.now()
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async reuseSession(
    sessionId: string,
    message: A2AMessage
  ): Promise<AsyncIterator<A2AResponse>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Send new message to existing process
    await this.sendJsonRpc(session.process, {
      method: 'textDocument/didChange',
      params: this.formatContext(message.context)
    });

    return this.parseNdjsonStream(session.process.stdout);
  }
}
```

#### Gemini Adapter
```typescript
class GeminiCLIAdapter implements CLIAdapter {
  async execute(message: A2AMessage): Promise<AsyncIterator<A2AResponse>> {
    // Use temp file for larger contexts (Gemini preference)
    const contextFile = await this.writeTempFile(message.context);

    // Spawn with streaming enabled
    const process = await this.spawn({
      command: 'gemini-cli',
      args: [
        'chat',
        '--context-file', contextFile,
        '--stream',
        '--format', 'json'
      ],
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Parse streaming JSON chunks
    return this.parseStreamingJson(process.stdout);
  }

  private async parseStreamingJson(
    stream: ReadableStream
  ): AsyncIterator<A2AResponse> {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();

      // Gemini sends multiple JSON objects per chunk
      const objects = this.extractJsonObjects(buffer);

      for (const obj of objects) {
        if (obj.type === 'content') {
          yield this.translateToA2A(obj);
        }
      }

      buffer = objects.remainder;
    }
  }
}
```

---

## Implementation Roadmap

### Phase 0: Prerequisites (1 week, 40h)
**Goal**: Validate assumptions and finalize design

- [ ] Research validation with actual CLI testing
- [ ] Architecture design review
- [ ] Interface definitions finalized
- [ ] Test strategy documented

### Phase 1: Core Infrastructure (3 weeks, 200h)
**Goal**: Build foundation for all CLI adapters

**Components**:
1. **Process Manager** (80h)
   - Spawn/terminate processes
   - Process pooling (min/max pool sizes)
   - Health monitoring
   - Crash recovery

2. **Protocol Translator** (80h)
   - A2A → CLI input translation
   - CLI output → A2A translation
   - Stream parsing (JSON/NDJSON/TEXT)
   - Error mapping

3. **Context Manager** (40h)
   - Strategy selection logic
   - STDIN serialization
   - Temp file creation/cleanup
   - Working dir management

**Success Criteria**:
- Process pool can maintain 5-10 concurrent processes
- Stream parsing handles 100KB/s output
- Context strategies tested with 1KB, 100KB, 10MB payloads

### Phase 2: CLI Adapters - MVP (4 weeks, 232h)
**Goal**: Get all three CLIs working end-to-end

**Adapters**:
1. **Codex Adapter** (56h)
   - Basic spawn/execute
   - STDIN context passing
   - JSON output parsing
   - Error handling

2. **Cursor Adapter** (96h)
   - Session management (critical!)
   - NDJSON-RPC protocol
   - Process reuse
   - LSP integration

3. **Gemini Adapter** (80h)
   - Streaming chunks
   - TEMP_FILE context
   - Multi-JSON parsing
   - Multimodal support

**Success Criteria**:
- Each CLI can execute simple task (e.g., "write hello world")
- Cursor session reuse reduces latency by 80%
- All CLIs handle 10KB context correctly

### Phase 3: Production Readiness (3 weeks, 400h)
**Goal**: Production-quality implementation

**Enhancements**:
1. **Session Manager** (120h)
   - Session lifecycle management
   - State persistence
   - Keep-alive mechanisms
   - Session validation

2. **Advanced Features** (120h)
   - Retry logic with exponential backoff
   - Circuit breakers
   - Rate limiting per CLI
   - Timeout management

3. **Performance Optimization** (80h)
   - Process pool tuning
   - Buffer size optimization
   - Memory leak prevention
   - CPU throttling

4. **Testing** (80h)
   - Integration tests (all CLIs)
   - Load tests (concurrent processes)
   - Failure scenario tests
   - Performance benchmarks

**Success Criteria**:
- 99% uptime in 24-hour load test
- Handle 50 concurrent CLI processes
- Recovery from all failure scenarios tested
- < 100ms overhead per CLI invocation

### Phase 4: Monitoring & Observability (2 weeks, 200h)
**Goal**: Production monitoring and debugging

1. **Metrics** (80h)
   - Process spawn/terminate events
   - Session lifecycle tracking
   - Latency percentiles (p50/p95/p99)
   - Error rates per CLI
   - Resource usage (CPU/memory)

2. **Logging** (60h)
   - Structured logging
   - CLI stdout/stderr capture
   - Debug mode with full context dumps
   - Performance traces

3. **Dashboards** (40h)
   - Real-time process monitoring
   - CLI performance comparison
   - Error rate alerts
   - Resource utilization graphs

4. **Documentation** (20h)
   - API documentation
   - CLI adapter developer guide
   - Troubleshooting guide
   - Performance tuning guide

**Success Criteria**:
- All metrics exported to monitoring system
- < 1 minute to diagnose failures from logs
- Dashboard shows real-time CLI health

---

## Risks and Mitigation

### Risk 1: CLI Process Instability
**Severity**: HIGH
**Impact**: Frequent crashes disrupt agent workflows
**Probability**: MEDIUM (CLIs are external dependencies)

**Mitigation**:
- Implement comprehensive process health monitoring
- Add automatic restart with exponential backoff
- Circuit breaker pattern to prevent cascade failures
- Fallback to alternative CLI if available
- Keep process pool size limited to prevent resource exhaustion

**Monitoring**: Track crash rate per CLI, alert if > 5% failure rate

---

### Risk 2: Cursor Session Reuse Complexity
**Severity**: HIGH
**Impact**: Session management bugs cause state corruption
**Probability**: HIGH (most complex adapter)

**Mitigation**:
- Start with simple session model (create → use → destroy)
- Add comprehensive session validation
- Implement session state snapshots
- Automatic session recreation if validation fails
- Extensive integration testing with real Cursor Agent

**Monitoring**: Track session lifetime, reuse count, validation failures

---

### Risk 3: Context Size Limits
**Severity**: MEDIUM
**Impact**: Large contexts fail or cause performance issues
**Probability**: MEDIUM (depends on user workloads)

**Mitigation**:
- Implement context size limits per strategy
- Automatic strategy selection based on size
- Context compression for large payloads
- Chunking strategy for extremely large contexts
- Clear error messages when limits exceeded

**Monitoring**: Track context size distribution, strategy usage

---

### Risk 4: CLI Version Compatibility
**Severity**: MEDIUM
**Impact**: Breaking changes in CLI updates
**Probability**: MEDIUM (CLIs under active development)

**Mitigation**:
- Version detection at adapter initialization
- Maintain compatibility matrix
- Adapter versioning strategy
- Graceful degradation for unsupported features
- CI tests against multiple CLI versions

**Monitoring**: Track CLI versions in production, alert on new versions

---

### Risk 5: Performance Overhead
**Severity**: MEDIUM
**Impact**: CLI integration adds unacceptable latency
**Probability**: LOW (mitigation via process reuse)

**Mitigation**:
- Process pooling to eliminate spawn overhead
- Session reuse for Cursor (80% latency reduction)
- Stream parsing (avoid buffering entire output)
- Optimize context serialization
- Performance benchmarks in CI

**Monitoring**: Track p95/p99 latency per CLI, compare to baseline

---

### Risk 6: Resource Leaks
**Severity**: HIGH
**Impact**: Memory/process leaks cause system instability
**Probability**: MEDIUM (process management is complex)

**Mitigation**:
- Comprehensive cleanup in error paths
- Process timeout enforcement
- Idle session cleanup
- Memory profiling in load tests
- Resource usage alerts

**Monitoring**: Track process count, memory usage, file descriptor count

---

### Risk 7: Stream Parsing Errors
**Severity**: MEDIUM
**Impact**: Output parsing failures lose CLI responses
**Probability**: MEDIUM (CLIs may output malformed JSON)

**Mitigation**:
- Robust parsing with error recovery
- Partial output handling
- Raw output capture for debugging
- CLI-specific quirks documentation
- Extensive testing with real CLI output

**Monitoring**: Track parsing error rate, capture malformed output samples

---

### Risk 8: Race Conditions
**Severity**: HIGH
**Impact**: Concurrent access causes state corruption
**Probability**: MEDIUM (multiple async operations)

**Mitigation**:
- Proper async/await usage throughout
- Process/session locking mechanisms
- Queue operations per process/session
- Comprehensive concurrency tests
- Code review focus on race conditions

**Monitoring**: Track concurrent operation count, deadlock detection

---

## Success Criteria

### Phase 1 Success Criteria
- [ ] Process manager can spawn/terminate all 3 CLIs
- [ ] Process pool maintains 5-10 concurrent processes
- [ ] Protocol translator handles JSON/NDJSON/TEXT formats
- [ ] Context strategies tested with 1KB, 100KB, 10MB payloads
- [ ] 100% unit test coverage for core components

### Phase 2 Success Criteria
- [ ] All 3 CLIs can execute end-to-end tasks
- [ ] Codex: Execute "write hello world" in < 2s
- [ ] Cursor: Session reuse reduces latency by 80%
- [ ] Gemini: Handle streaming responses correctly
- [ ] Integration tests pass for all CLIs

### Phase 3 Success Criteria
- [ ] 99% uptime in 24-hour load test
- [ ] Handle 50 concurrent CLI processes
- [ ] < 100ms overhead per CLI invocation
- [ ] All failure scenarios tested and handled
- [ ] Performance benchmarks documented

### Phase 4 Success Criteria
- [ ] All metrics exported to monitoring system
- [ ] < 1 minute to diagnose failures from logs
- [ ] Dashboard shows real-time CLI health
- [ ] Complete API documentation published
- [ ] Production deployment successful

---

## Alternatives Considered But Rejected

### 1. Pure MCP Integration (Rejected)
**Reason**: Requires MCP server infrastructure, adds latency, less control over CLI-specific optimizations. Direct CLI integration provides better performance and flexibility.

### 2. Webhook-Based Communication (Rejected)
**Reason**: Requires network stack, adds latency, complicates error handling. Direct process communication is simpler and faster.

### 3. Shared Memory (Rejected)
**Reason**: Platform-specific, complex implementation, not supported by CLIs. STDIN/temp files are universal.

### 4. Single Adapter for All CLIs (Rejected)
**Reason**: CLIs have significantly different behaviors (Cursor sessions, Gemini streaming, Codex pipe mode). Dedicated adapters provide better optimization.

---

## Related Decisions

- **ADR-002**: Process Pool Configuration (pending)
- **ADR-003**: Context Serialization Format (pending)
- **ADR-004**: Error Handling Strategy (pending)
- **ADR-005**: Monitoring and Observability (pending)

---

## References

1. [A2A CLI Gap Analysis](./A2A-CLI-GAP-ANALYSIS.md) - Comprehensive gap analysis
2. [A2A CLI Adapter Architecture](./A2A-CLI-ADAPTER-ARCHITECTURE.md) - Detailed adapter design
3. [A2A CLI Agents Research](./A2A-CLI-AGENTS-RESEARCH.md) - CLI capabilities research
4. [Claude Flow A2A Requirements](./A2A-CLAUDE-FLOW-REQUIREMENTS.md) - Current A2A architecture
5. [MCP Specification](https://github.com/modelcontextprotocol/specification) - Model Context Protocol

---

## Approval

**Architecture Review**: [ ] Approved
**Technical Lead**: [ ] Approved
**Product Owner**: [ ] Approved
**Security Review**: [ ] Approved

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-01 | 1.0 | Initial ADR created | Architecture Team |

---

## Appendix: Decision Matrix

| Criteria | Weight | Direct CLI | MCP-Only | Hybrid |
|----------|--------|------------|----------|--------|
| Performance | 25% | 9/10 | 6/10 | 8/10 |
| Flexibility | 20% | 9/10 | 5/10 | 10/10 |
| Complexity | 15% | 7/10 | 8/10 | 4/10 |
| Maintenance | 15% | 6/10 | 7/10 | 5/10 |
| Extensibility | 15% | 7/10 | 9/10 | 9/10 |
| Risk | 10% | 7/10 | 6/10 | 5/10 |
| **Weighted Total** | - | **7.7** | **6.7** | **7.1** |

**Winner**: Direct CLI Integration (7.7/10)
