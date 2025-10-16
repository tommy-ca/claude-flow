# Claude Flow Architecture Analysis: Requirements for External CLI Agent Integration

**Document Version:** 1.0
**Date:** 2025-10-01
**Purpose:** Analyze Claude Flow's internal architecture to define requirements for integrating external CLI-based coding agents

## Table of Contents
1. [Current Architecture Summary](#1-current-architecture-summary)
2. [Process Management Requirements](#2-process-management-requirements)
3. [Communication Requirements](#3-communication-requirements)
4. [Integration Points](#4-integration-points)
5. [Concrete Code Examples](#5-concrete-code-examples)
6. [Requirements for CLI Integration](#6-requirements-for-cli-integration)
7. [Gap Analysis](#7-gap-analysis)

---

## 1. Current Architecture Summary

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Flow System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ MCP Server  │────▶│ Orchestrator │────▶│ Swarm Coord  │    │
│  │ (stdio/http)│     │              │     │              │    │
│  └─────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                     │           │
│         │                    ▼                     ▼           │
│         │            ┌──────────────┐     ┌──────────────┐    │
│         └───────────▶│    Memory    │     │   Agents     │    │
│                      │   Manager    │     │   Manager    │    │
│                      └──────────────┘     └──────────────┘    │
│                              │                     │           │
│                              │                     ▼           │
│                      ┌──────────────┐     ┌──────────────┐    │
│                      │   EventBus   │────▶│  Process     │    │
│                      │              │     │  Manager     │    │
│                      └──────────────┘     └──────────────┘    │
│                              │                     │           │
│                              ▼                     ▼           │
│                      ┌──────────────┐     ┌──────────────┐    │
│                      │   Messaging  │     │  Terminal    │    │
│                      │   Router     │     │  Manager     │    │
│                      └──────────────┘     └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Components

**MCP Server** (`/src/mcp/server.ts`)
- Entry point for external requests
- Handles tool registration and execution
- Manages sessions and authentication
- Transports: stdio, HTTP

**Orchestrator** (`/src/core/orchestrator.ts`)
- Central coordination component
- Session lifecycle management
- Task assignment and routing
- Resource allocation

**Agent Manager** (`/src/agents/agent-manager.ts`)
- Agent lifecycle (create, start, stop, restart)
- Health monitoring and heartbeats
- Agent pooling and auto-scaling
- Template-based agent creation

**Swarm Coordinator** (`/src/coordination/swarm-coordinator.ts`)
- Multi-agent task distribution
- Objective decomposition
- Background worker management
- Work stealing and load balancing

**Process Manager** (`/src/cli/commands/start/process-manager.ts`)
- System process lifecycle
- Component initialization order
- Dependency management
- Health status aggregation

**Message Router** (`/src/coordination/messaging.ts`)
- Inter-agent message passing
- Request-response patterns
- Broadcast capabilities
- Queue management

### 1.3 Data Flow Patterns

**Agent Spawning Flow:**
```
MCP Tool Request → Orchestrator → Agent Manager → Spawn Process → Terminal/Deno Runtime
```

**Task Execution Flow:**
```
Task Created → Swarm Coordinator → Agent Selection → Agent Assignment → Execution
```

**Communication Flow:**
```
Agent A → Message Router → Queue → Handler → Agent B
```

---

## 2. Process Management Requirements

### 2.1 Current Process Spawning Pattern

**Location:** `/src/agents/agent-manager.ts:1392-1426`

```typescript
private async spawnAgentProcess(agent: AgentState): Promise<ChildProcess> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AGENT_ID: agent.id.id,
    AGENT_TYPE: agent.type,
    AGENT_NAME: agent.name,
    WORKING_DIR: agent.environment.workingDirectory,
    LOG_DIR: agent.environment.logDirectory,
  };

  const args = [
    'run',
    '--allow-all',
    agent.environment.availableTools[0] || './agents/generic-agent.ts',
    '--config',
    JSON.stringify(agent.config),
  ];

  const childProcess = spawn(agent.environment.runtime, args, {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: agent.environment.workingDirectory,
  });

  // Handle process events
  childProcess.on('exit', (code: number | null) => {
    this.handleProcessExit(agent.id.id, code);
  });

  childProcess.on('error', (error: Error) => {
    this.handleProcessError(agent.id.id, error);
  });

  return childProcess;
}
```

### 2.2 Process Interface Requirements

```typescript
interface ProcessSpawnPattern {
  // Runtime selection
  runtime: 'deno' | 'node' | 'claude' | 'browser' | 'external-cli';

  // Command structure
  command: string;              // e.g., 'aider', 'cursor-cli', 'roo-cline'
  args: string[];              // CLI arguments

  // Environment
  cwd: string;                 // Working directory
  env: Record<string, string>; // Environment variables

  // I/O configuration
  stdio: 'pipe' | 'inherit' | 'ignore' | ['pipe', 'pipe', 'pipe'];

  // Process lifecycle
  onExit: (code: number | null) => void;
  onError: (error: Error) => void;

  // Health monitoring
  heartbeatInterval?: number;
  timeout?: number;
}
```

### 2.3 IPC Mechanism

**Current:** Stdio pipes (`['pipe', 'pipe', 'pipe']`)
- stdin: Send commands/context to agent
- stdout: Receive agent output
- stderr: Receive error messages

**Requirements for CLI Agents:**
1. **Bidirectional communication** via stdin/stdout
2. **Structured message format** (JSON-RPC 2.0 or similar)
3. **Session persistence** across multiple invocations
4. **Context passing** (file paths, project state, git info)

---

## 3. Communication Requirements

### 3.1 Message Format

**Location:** `/src/coordination/messaging.ts:56-101`

```typescript
interface Message {
  id: string;
  type: 'agent-message' | 'agent-request' | 'broadcast';
  payload: unknown;
  timestamp: Date;
  priority: number;
  expiry?: Date;
}

// Send message
async send(from: string, to: string, payload: unknown): Promise<void>

// Request-response pattern
async sendWithResponse<T>(
  from: string,
  to: string,
  payload: unknown,
  timeoutMs?: number
): Promise<T>

// Broadcast to all agents
async broadcast(from: string, payload: unknown): Promise<void>
```

### 3.2 Communication Channels

**Location:** `/src/hive-mind/core/Communication.ts:19-47`

```typescript
interface CommunicationChannel {
  name: string;
  description: string;
  type: 'public' | 'private';
  subscribers: string[];
  createdAt: Date;
}

// Default channels:
- 'system': System-wide notifications
- 'coordination': Task coordination
- 'consensus': Consensus voting
- 'monitoring': Performance monitoring
- 'coordinators', 'researchers', 'coders', 'analysts': Type-specific
```

### 3.3 Message Queue Pattern

**Location:** `/src/coordination/messaging.ts:11-20`

```typescript
interface MessageQueue {
  messages: Message[];
  handlers: Map<string, (message: Message) => void>;
}

private queues = new Map<string, MessageQueue>(); // agentId -> queue
```

**Processing:**
- Messages added to agent-specific queues
- Handlers registered per agent
- Async processing with timeout
- Cleanup of expired messages

---

## 4. Integration Points

### 4.1 Agent Template System

**Location:** `/src/agents/agent-manager.ts:224-823`

Agents are created from templates with predefined capabilities:

```typescript
interface AgentTemplate {
  name: string;
  type: AgentType;
  capabilities: AgentCapabilities;
  config: Partial<AgentConfig>;
  environment: Partial<AgentEnvironment>;
  startupScript?: string;
  dependencies?: string[];
}

// Built-in templates:
- 'researcher': Research and information gathering
- 'coder': Code generation and modification
- 'analyst': Data analysis
- 'tester': Testing and validation
- 'reviewer': Code review
- 'system-architect': Architecture design
```

**Extension Point:** Add new template for external CLI agents:

```typescript
this.templates.set('external-cli-agent', {
  name: 'External CLI Agent',
  type: 'coder',
  capabilities: {
    codeGeneration: true,
    codeReview: true,
    testing: true,
    terminalAccess: true,
    fileSystem: true,
    // ... CLI-specific capabilities
  },
  environment: {
    runtime: 'external-cli',
    workingDirectory: './workspace',
    // CLI-specific config
  },
  startupScript: './integrations/cli-agent-wrapper.ts',
});
```

### 4.2 Tool Registry (MCP Integration)

**Location:** `/src/mcp/tools.ts:59-98`

```typescript
register(tool: MCPTool, capability?: ToolCapability): void {
  if (this.tools.has(tool.name)) {
    throw new MCPError(`Tool already registered: ${tool.name}`);
  }

  this.validateTool(tool);
  this.tools.set(tool.name, tool);
  this.registerCapability(tool.name, capability);
  this.metrics.set(tool.name, defaultMetrics);
}

async executeTool(name: string, input: unknown, context?: any): Promise<unknown> {
  const tool = this.tools.get(name);
  this.validateInput(tool, input);
  await this.checkToolCapabilities(name, context);

  const result = await tool.handler(input, context);
  // Update metrics
  return result;
}
```

**Tool Format:**
```typescript
interface MCPTool {
  name: string;                    // Format: "namespace/name"
  description: string;
  inputSchema: JSONSchema;
  handler: (input: unknown, context?: MCPContext) => Promise<unknown>;
}
```

### 4.3 Session Management

**Location:** `/src/core/orchestrator.ts:68-136`

```typescript
class SessionManager {
  async createSession(profile: AgentProfile): Promise<AgentSession> {
    // Create terminal
    const terminalId = await this.terminalManager.spawnTerminal(profile);

    // Create memory bank
    const memoryBankId = await this.memoryManager.createBank(profile.id);

    const session: AgentSession = {
      id: generateId(),
      agentId: profile.id,
      terminalId,
      memoryBankId,
      startTime: new Date(),
      status: 'active',
      lastActivity: new Date(),
    };

    this.sessions.set(session.id, session);
    await this.persistSessions();

    return session;
  }
}
```

**Key Requirements:**
1. Terminal for I/O
2. Memory bank for context persistence
3. Session state tracking
4. Automatic persistence

---

## 5. Concrete Code Examples

### 5.1 Agent Creation Flow

**From:** `/src/agents/agent-manager.ts:862-951`

```typescript
async createAgent(
  templateName: string,
  overrides: {
    name?: string;
    config?: Partial<AgentConfig>;
    environment?: Partial<AgentEnvironment>;
  } = {}
): Promise<string> {
  // 1. Check capacity
  if (this.agents.size >= this.config.maxAgents) {
    throw new Error('Maximum agent limit reached');
  }

  // 2. Load template
  const template = this.templates.get(templateName);
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }

  // 3. Generate agent state
  const agentId = generateId('agent');
  const agent: AgentState = {
    id: { id: agentId, swarmId: 'default', type: template.type, instance: 1 },
    name: overrides.name || `${template.name}-${agentId.slice(-8)}`,
    type: template.type,
    status: 'initializing',
    capabilities: { ...template.capabilities },
    metrics: this.createDefaultMetrics(),
    workload: 0,
    health: 1.0,
    config: { ...template.config, ...overrides.config },
    environment: { ...template.environment, ...overrides.environment },
    // ... more fields
  };

  // 4. Store agent
  this.agents.set(agentId, agent);
  this.healthChecks.set(agentId, this.createDefaultHealth(agentId));

  // 5. Persist to memory
  await this.memory.store(`agent:${agentId}`, agent, {
    type: 'agent-state',
    tags: [agent.type, 'active'],
    partition: 'state',
  });

  this.emit('agent:created', { agent });
  return agentId;
}
```

### 5.2 Task Assignment Flow

**From:** `/src/coordination/swarm-coordinator.ts:377-410`

```typescript
async assignTask(taskId: string, agentId: string): Promise<void> {
  const task = this.tasks.get(taskId);
  const agent = this.agents.get(agentId);

  if (!task || !agent) {
    throw new Error('Task or agent not found');
  }

  if (agent.status !== 'idle') {
    throw new Error('Agent is not available');
  }

  // Check circuit breaker
  if (this.circuitBreaker && !this.circuitBreaker.canExecute(agentId)) {
    throw new Error('Agent circuit breaker is open');
  }

  task.assignedTo = agentId;
  task.status = 'running';
  task.startedAt = new Date();

  agent.status = 'busy';
  agent.currentTask = task;

  if (this.monitor) {
    this.monitor.taskStarted(agentId, taskId, task.description);
  }

  this.emit('task:assigned', { task, agent });

  // Execute task in background
  this.executeTask(task, agent);
}
```

### 5.3 MCP Tool Execution

**From:** `/src/mcp/tools.ts:139-201`

```typescript
async executeTool(name: string, input: unknown, context?: any): Promise<unknown> {
  const tool = this.tools.get(name);
  if (!tool) {
    throw new MCPError(`Tool not found: ${name}`);
  }

  const startTime = Date.now();
  const metrics = this.metrics.get(name);

  try {
    // 1. Validate input
    this.validateInput(tool, input);

    // 2. Check capabilities and permissions
    await this.checkToolCapabilities(name, context);

    // 3. Execute handler
    const result = await tool.handler(input, context);

    // 4. Update metrics
    if (metrics) {
      const executionTime = Date.now() - startTime;
      metrics.totalInvocations++;
      metrics.successfulInvocations++;
      metrics.totalExecutionTime += executionTime;
      metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalInvocations;
      metrics.lastInvoked = new Date();
    }

    this.emit('toolExecuted', { name, success: true, executionTime });
    return result;
  } catch (error) {
    // Update failure metrics
    this.emit('toolExecuted', { name, success: false, error });
    throw error;
  }
}
```

---

## 6. Requirements for CLI Integration

### 6.1 Process Spawning Requirements

**External CLI agents must support:**

1. **Command-line invocation pattern:**
   ```bash
   <cli-tool> --mode agent --session-id <id> --workspace <path> [options]
   ```

2. **Environment variables:**
   ```typescript
   {
     AGENT_ID: string;           // Unique agent identifier
     AGENT_TYPE: string;         // Agent type (coder, reviewer, etc.)
     AGENT_NAME: string;         // Human-readable name
     WORKING_DIR: string;        // Workspace root
     SESSION_ID: string;         // Session identifier
     SWARM_ID: string;          // Swarm identifier
     MEMORY_ENDPOINT: string;   // Memory service URL/path
     EVENT_BUS_ENDPOINT: string;// Event bus URL/path
   }
   ```

3. **Stdio protocol:**
   - **stdin:** Receive JSON-RPC 2.0 requests
   - **stdout:** Send JSON-RPC 2.0 responses (one per line)
   - **stderr:** Send log messages (structured JSON recommended)

4. **Process lifecycle:**
   - Launch with `spawn()` from Node.js
   - Graceful shutdown on SIGTERM
   - Force kill on SIGKILL after timeout
   - Exit code 0 = success, non-zero = failure

### 6.2 IPC Requirements

**Message Protocol:** JSON-RPC 2.0

**Request format:**
```typescript
interface RPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown> | unknown[];
}
```

**Response format:**
```typescript
interface RPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
```

**Required methods:**

1. **initialize**
   ```typescript
   Request: { method: 'initialize', params: {
     workingDirectory: string,
     projectInfo: { git, language, framework },
     capabilities: string[],
     config: Record<string, unknown>
   }}
   Response: { result: { ready: true, capabilities: string[] }}
   ```

2. **executeTask**
   ```typescript
   Request: { method: 'executeTask', params: {
     taskId: string,
     type: TaskType,
     description: string,
     context: { files, dependencies },
     requirements: TaskRequirements
   }}
   Response: { result: { success: boolean, output: string, changes: FileChange[] }}
   ```

3. **heartbeat**
   ```typescript
   Request: { method: 'heartbeat', params: {} }
   Response: { result: { status: 'active', metrics: AgentMetrics }}
   ```

4. **shutdown**
   ```typescript
   Request: { method: 'shutdown', params: {} }
   Response: { result: { success: true }}
   ```

### 6.3 Context Passing Requirements

**CLI agents need access to:**

1. **File context:**
   - Working directory path
   - Relevant file paths
   - File contents (on-demand via memory system)
   - Git repository info (branch, status, diff)

2. **Project context:**
   - Language/framework detection
   - Dependency information
   - Build system details
   - Test framework

3. **Task context:**
   - Task description and goals
   - Dependencies on other tasks
   - Required capabilities
   - Quality requirements
   - Timeout constraints

4. **Memory context:**
   - Previous task results
   - Agent's own history
   - Shared swarm memory
   - User preferences

**Implementation via Memory Manager:**
```typescript
// CLI agent reads context
const context = await memoryManager.retrieve(`task:${taskId}:context`);

// CLI agent writes results
await memoryManager.store(`task:${taskId}:result`, result, {
  type: 'task-result',
  tags: ['completed', taskType],
  partition: 'results'
});
```

### 6.4 Session Management Requirements

**Session lifecycle:**

1. **Creation:**
   - Spawn CLI process
   - Initialize with project context
   - Register with agent manager
   - Create memory bank

2. **Maintenance:**
   - Periodic heartbeats (default: 10s)
   - Health monitoring
   - Resource usage tracking
   - Automatic recovery on failure

3. **Persistence:**
   - Session state saved to disk
   - Restore on restart
   - Handle crashes gracefully

4. **Termination:**
   - Graceful shutdown (SIGTERM)
   - Cleanup resources
   - Archive session data
   - Update metrics

### 6.5 Error Handling Requirements

**CLI agents must:**

1. **Report structured errors:**
   ```typescript
   {
     code: number,      // Standard error codes
     message: string,   // Human-readable
     severity: 'low' | 'medium' | 'high' | 'critical',
     context: Record<string, unknown>,
     recoverable: boolean
   }
   ```

2. **Support retry logic:**
   - Exponential backoff
   - Max retry attempts (default: 3)
   - Retry on specific error codes
   - Circuit breaker integration

3. **Handle timeouts:**
   - Task-level timeout
   - Operation-level timeout
   - Graceful degradation
   - Partial results on timeout

---

## 7. Gap Analysis

### 7.1 What's Missing from Current Implementation

#### 7.1.1 External Runtime Support

**Current State:**
- Only supports internal runtimes: `'deno' | 'node' | 'claude' | 'browser'`
- All agents spawned as Deno scripts

**Gap:**
- No mechanism to invoke arbitrary CLI tools
- No adapter pattern for external processes
- No protocol negotiation

**Required:**
- Add `'external-cli'` runtime type
- Create CLI adapter/wrapper
- Implement protocol translation layer

#### 7.1.2 Structured IPC Protocol

**Current State:**
- Uses generic stdio pipes
- No standardized message format
- Limited error handling

**Gap:**
- No JSON-RPC or equivalent protocol
- No request-response correlation
- No streaming support for long-running tasks

**Required:**
- Implement JSON-RPC 2.0 client
- Add message correlation (request ID tracking)
- Support async responses
- Handle backpressure

#### 7.1.3 CLI Agent Templates

**Current State:**
- 9 built-in agent templates (researcher, coder, analyst, etc.)
- All templates assume Deno runtime

**Gap:**
- No templates for external CLI agents
- No capability negotiation
- No version compatibility checking

**Required:**
- Create external CLI agent templates
- Add capability discovery mechanism
- Implement version negotiation
- Support multiple CLI backends (Aider, Cursor, Roo-Cline, etc.)

#### 7.1.4 Context Serialization

**Current State:**
- Context passed as environment variables
- Config passed as JSON string in args

**Gap:**
- No structured context format
- Limited context size (env var limits)
- No incremental context updates

**Required:**
- Define context schema
- Implement context serialization/deserialization
- Use memory system for large context
- Support context diffs

#### 7.1.5 Session Persistence for External Processes

**Current State:**
- Session persistence exists for internal agents
- Assumes process restart = new agent

**Gap:**
- No session restoration for external CLI
- No state migration between invocations
- Lost context on crash

**Required:**
- Persist CLI agent state
- Restore state on reconnection
- Handle partial failures
- Support session migration

### 7.2 What Needs to be Refactored

#### 7.2.1 Agent Manager (`agent-manager.ts`)

**Current Issues:**
- Hardcoded Deno runtime spawning
- Assumes specific script structure
- Direct ChildProcess management

**Refactoring Plan:**

```typescript
// Add runtime abstraction
interface IAgentRuntime {
  spawn(agent: AgentState): Promise<AgentProcess>;
  terminate(process: AgentProcess): Promise<void>;
  sendMessage(process: AgentProcess, message: Message): Promise<void>;
  onMessage(process: AgentProcess, handler: MessageHandler): void;
}

// Implementations
class DenoRuntime implements IAgentRuntime { /* existing logic */ }
class ExternalCLIRuntime implements IAgentRuntime { /* new */ }

// Agent Manager uses runtime factory
class AgentManager {
  private runtimeFactory: Map<RuntimeType, IAgentRuntime>;

  async spawnAgentProcess(agent: AgentState): Promise<AgentProcess> {
    const runtime = this.runtimeFactory.get(agent.environment.runtime);
    return await runtime.spawn(agent);
  }
}
```

#### 7.2.2 Process Manager (`process-manager.ts`)

**Current Issues:**
- Specific to internal components
- No external process management
- Limited process monitoring

**Refactoring Plan:**

```typescript
// Add external process type
enum ProcessType {
  EVENT_BUS = 'event-bus',
  ORCHESTRATOR = 'orchestrator',
  // ... existing types
  EXTERNAL_CLI_AGENT = 'external-cli-agent',  // NEW
}

// Add process adapter interface
interface IProcessAdapter {
  start(config: ProcessConfig): Promise<ProcessInfo>;
  stop(processId: string): Promise<void>;
  getStatus(processId: string): ProcessStatus;
  sendCommand(processId: string, command: unknown): Promise<unknown>;
}
```

#### 7.2.3 Message Router (`messaging.ts`)

**Current Issues:**
- In-memory queues only
- No external process routing
- Assumes all agents are internal

**Refactoring Plan:**

```typescript
// Add transport abstraction
interface IMessageTransport {
  send(destination: string, message: Message): Promise<void>;
  receive(handler: MessageHandler): void;
  close(): Promise<void>;
}

// Implementations
class InMemoryTransport implements IMessageTransport { /* existing */ }
class StdioTransport implements IMessageTransport { /* for CLI agents */ }
class HttpTransport implements IMessageTransport { /* for remote agents */ }

// Message Router uses transport factory
class MessageRouter {
  private transports: Map<string, IMessageTransport>;

  async sendMessage(from: string, to: string, message: Message): Promise<void> {
    const transport = this.getTransportForAgent(to);
    await transport.send(to, message);
  }
}
```

### 7.3 What New Components are Needed

#### 7.3.1 CLI Agent Adapter (`/src/adapters/cli-agent-adapter.ts`)

```typescript
/**
 * Adapter for external CLI-based coding agents
 * Manages process lifecycle, IPC, and protocol translation
 */
export class CLIAgentAdapter implements IAgentRuntime {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, PendingRequest>();

  async spawn(agent: AgentState): Promise<AgentProcess> {
    // Spawn CLI process with stdio pipes
    this.process = spawn(agent.environment.cli.command,
      this.buildArgs(agent),
      this.buildEnv(agent)
    );

    // Set up IPC handlers
    this.setupStdioHandlers();

    // Initialize agent
    await this.rpcCall('initialize', this.buildInitParams(agent));

    return { id: agent.id.id, pid: this.process.pid };
  }

  async sendMessage(process: AgentProcess, message: Message): Promise<void> {
    await this.rpcCall('receiveMessage', { message });
  }

  private async rpcCall(method: string, params: unknown): Promise<unknown> {
    const id = ++this.requestId;
    const request = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, timeout: setTimeout(...) });
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  private setupStdioHandlers(): void {
    let buffer = '';
    this.process.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (line.trim()) {
          this.handleResponse(JSON.parse(line));
        }
      }
    });
  }

  private handleResponse(response: RPCResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(response.error.message));
      } else {
        pending.resolve(response.result);
      }
    }
  }
}
```

#### 7.3.2 CLI Agent Registry (`/src/adapters/cli-agent-registry.ts`)

```typescript
/**
 * Registry of available CLI agents with capability metadata
 */
export class CLIAgentRegistry {
  private agents = new Map<string, CLIAgentDescriptor>();

  register(descriptor: CLIAgentDescriptor): void {
    this.validateDescriptor(descriptor);
    this.agents.set(descriptor.name, descriptor);
  }

  async detectAvailableAgents(): Promise<CLIAgentDescriptor[]> {
    const detected: CLIAgentDescriptor[] = [];

    // Check for Aider
    if (await this.isCommandAvailable('aider')) {
      detected.push(AIDER_DESCRIPTOR);
    }

    // Check for Cursor CLI
    if (await this.isCommandAvailable('cursor')) {
      detected.push(CURSOR_DESCRIPTOR);
    }

    // Check for Roo-Cline
    if (await this.isCommandAvailable('roo-cline')) {
      detected.push(ROO_CLINE_DESCRIPTOR);
    }

    return detected;
  }

  findBestAgent(requirements: TaskRequirements): CLIAgentDescriptor | null {
    const candidates = Array.from(this.agents.values()).filter(agent =>
      this.meetsRequirements(agent, requirements)
    );

    return this.rankAgents(candidates, requirements)[0] || null;
  }
}

interface CLIAgentDescriptor {
  name: string;
  version: string;
  command: string;
  capabilities: string[];
  supportedLanguages: string[];
  supportedProtocol: 'jsonrpc' | 'custom';
  configSchema: JSONSchema;
}
```

#### 7.3.3 Context Builder (`/src/context/context-builder.ts`)

```typescript
/**
 * Builds structured context for CLI agents
 */
export class ContextBuilder {
  async buildTaskContext(task: Task, agent: AgentState): Promise<AgentContext> {
    const fileContext = await this.buildFileContext(task);
    const projectContext = await this.buildProjectContext();
    const memoryContext = await this.buildMemoryContext(agent.id);

    return {
      task: {
        id: task.id,
        type: task.type,
        description: task.description,
        requirements: task.requirements,
      },
      files: fileContext,
      project: projectContext,
      memory: memoryContext,
      environment: {
        workingDirectory: agent.environment.workingDirectory,
        gitInfo: await this.getGitInfo(),
        language: projectContext.language,
        framework: projectContext.framework,
      },
    };
  }

  private async buildFileContext(task: Task): Promise<FileContext[]> {
    // Extract relevant files from task requirements
    // Read file contents
    // Generate file tree
    // Detect dependencies
  }

  private async buildProjectContext(): Promise<ProjectContext> {
    // Detect language/framework
    // Parse package.json / requirements.txt / etc.
    // Identify build system
    // Detect test framework
  }

  private async buildMemoryContext(agentId: AgentId): Promise<MemoryContext> {
    // Fetch agent's memory bank
    // Retrieve recent task history
    // Get relevant shared memory
  }
}
```

#### 7.3.4 Protocol Translator (`/src/adapters/protocol-translator.ts`)

```typescript
/**
 * Translates between Claude Flow's internal messages and CLI agent protocols
 */
export class ProtocolTranslator {
  constructor(private protocol: 'jsonrpc' | 'custom') {}

  translateTaskToRPC(task: Task, context: AgentContext): RPCRequest {
    return {
      jsonrpc: '2.0',
      id: generateId(),
      method: 'executeTask',
      params: {
        taskId: task.id,
        type: task.type,
        description: task.description,
        context,
        requirements: task.requirements,
      },
    };
  }

  translateRPCToResult(response: RPCResponse): TaskResult {
    if (response.error) {
      return {
        success: false,
        error: {
          code: response.error.code,
          message: response.error.message,
          data: response.error.data,
        },
      };
    }

    return {
      success: true,
      output: response.result.output,
      changes: response.result.changes,
      metrics: response.result.metrics,
    };
  }
}
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Create runtime abstraction interface
2. Implement CLI agent adapter
3. Add JSON-RPC 2.0 client
4. Create protocol translator

### Phase 2: Integration (Week 3-4)
1. Refactor agent manager for runtime factory
2. Add CLI agent templates
3. Implement context builder
4. Create CLI agent registry

### Phase 3: Testing (Week 5-6)
1. Integrate Aider as pilot
2. Add Cursor CLI support
3. Test multi-agent coordination
4. Performance benchmarking

### Phase 4: Production (Week 7-8)
1. Add error handling and recovery
2. Implement session persistence
3. Add monitoring and metrics
4. Documentation and examples

---

## 9. Conclusion

### Key Findings

1. **Claude Flow has a solid architecture** for internal agent management but lacks external process integration
2. **Process spawning is flexible** but hardcoded for Deno runtime
3. **Communication infrastructure exists** but needs protocol standardization
4. **Memory and coordination systems** can be reused with minimal changes

### Critical Requirements

To integrate external CLI agents, Claude Flow needs:

1. **Runtime abstraction layer** - Decouple from Deno-specific code
2. **JSON-RPC 2.0 protocol** - Standardize IPC with CLI agents
3. **Context serialization** - Pass rich context to external tools
4. **Session persistence** - Handle CLI agent crashes/restarts
5. **Capability negotiation** - Discover and match agent capabilities

### Recommended Next Steps

1. **Create proof-of-concept** with Aider integration
2. **Implement core adapters** (CLIAgentAdapter, ProtocolTranslator)
3. **Refactor AgentManager** to use runtime factory
4. **Add CLI agent templates** to agent registry
5. **Test coordination** between internal and external agents
6. **Document integration patterns** for new CLI agents

### Success Criteria

Integration is successful when:
- ✅ External CLI agents can be spawned alongside internal agents
- ✅ CLI agents receive structured context and tasks
- ✅ CLI agents can communicate via standardized protocol
- ✅ Multi-agent workflows work with mixed agent types
- ✅ Session state persists across CLI agent restarts
- ✅ Performance is comparable to internal agents

---

**Document Maintenance:**
- Update architecture diagrams when components change
- Add new CLI agents to registry as they're integrated
- Keep code examples in sync with implementation
- Document lessons learned from pilot integrations
