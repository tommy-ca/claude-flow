# A2A Protocol Integration - Architecture Phase

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        A2A Multi-Platform Agent System                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│  Claude Flow  │            │     Codex     │            │  Gemini-CLI   │
│   Platform    │            │   Platform    │            │   Platform    │
│    (MCP)      │            │   (HTTP API)  │            │   (CLI/Proc)  │
└───────┬───────┘            └───────┬───────┘            └───────┬───────┘
        │                            │                            │
        │                            │                            │
        └────────────┬───────────────┴──────────────┬─────────────┘
                     │                              │
                     ▼                              ▼
            ┌─────────────────┐          ┌─────────────────┐
            │  A2A Protocol   │◄────────►│  Agent Adapter  │
            │     Layer       │          │    Framework    │
            └────────┬────────┘          └────────┬────────┘
                     │                            │
                     └────────────┬───────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                     ▼                         ▼
            ┌─────────────────┐      ┌─────────────────┐
            │     Shared      │      │   Integration   │
            │ Infrastructure  │◄────►│     Points      │
            └─────────────────┘      └─────────────────┘

## 1.1 CLI Adapter Layer Architecture

```
┌─────────────────────────────────────────────┐
│         A2A Coordinator                     │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   HTTP/WS           CLI/Process
   Adapters          Adapters
       │                │
   ┌───┴───┐        ┌───┴────────┐
   │ Codex │        │ codex-cli  │
   │ API   │        │ gemini-cli │
   │       │        │ cursor-cli │
   └───────┘        └────┬───────┘
                         │
              ┌──────────┴─────────────┐
              │                        │
              ▼                        ▼
    ┌──────────────────┐     ┌────────────────┐
    │  Process Manager │     │ Context Builder│
    │  - Spawn/Kill    │     │ - Stdin/File   │
    │  - Pool Mgmt     │     │ - Env Vars     │
    │  - Monitoring    │     │ - Serialization│
    └──────┬───────────┘     └────────┬───────┘
           │                          │
           └──────────┬───────────────┘
                      │
           ┌──────────▼──────────┐
           │  Stdio Protocol     │
           │  - NDJSON Parser    │
           │  - Stream Handler   │
           │  - Error Detection  │
           └─────────────────────┘
```

## 2. Component Architecture

### 2.1 A2A Protocol Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      A2A Protocol Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Message    │  │  Transport   │  │   Protocol   │         │
│  │   Format     │  │  Abstraction │  │  Versioning  │         │
│  │ Standardizer │  │              │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           │                                    │
│         ┌─────────────────┴─────────────────┐                  │
│         │                                   │                  │
│  ┌──────▼───────┐                  ┌────────▼────────┐         │
│  │   Security   │                  │  Message Router │         │
│  │      &       │◄────────────────►│       &         │         │
│  │     Auth     │                  │  Orchestrator   │         │
│  └──────────────┘                  └─────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.1.1 Message Format Standardizer

**Component**: `/src/a2a/protocol/message-formatter.ts`

**Responsibilities**:
- Validate incoming messages against JSON Schema
- Transform platform-specific messages to A2A format
- Serialize/deserialize messages
- Handle message versioning and migration

**Interface**:
```typescript
interface IMessageFormatter {
  // Validate message against schema
  validate(message: unknown, schema: JSONSchema): ValidationResult;

  // Transform platform message to A2A format
  toA2A<T extends A2AMessage>(
    message: PlatformMessage,
    platform: PlatformType
  ): T;

  // Transform A2A message to platform format
  fromA2A<T extends PlatformMessage>(
    message: A2AMessage,
    platform: PlatformType
  ): T;

  // Serialize message for transmission
  serialize(message: A2AMessage, format: 'json' | 'binary'): Buffer;

  // Deserialize received message
  deserialize(data: Buffer, format: 'json' | 'binary'): A2AMessage;

  // Migrate message between protocol versions
  migrate(message: A2AMessage, targetVersion: string): A2AMessage;
}
```

**Schema Registry**:
```typescript
class SchemaRegistry {
  private schemas: Map<string, JSONSchema>;

  register(messageType: string, version: string, schema: JSONSchema): void;
  get(messageType: string, version: string): JSONSchema | undefined;
  validate(message: A2AMessage): ValidationResult;
  getLatestVersion(messageType: string): string;
}
```

#### 2.1.2 Transport Abstraction

**Component**: `/src/a2a/protocol/transport/`

```
transport/
├── transport-interface.ts       # Abstract transport interface
├── http-transport.ts           # HTTP/REST implementation
├── websocket-transport.ts      # WebSocket implementation
├── grpc-transport.ts           # gRPC implementation
└── transport-factory.ts        # Factory for creating transports
```

**Transport Interface**:
```typescript
interface ITransport {
  // Send message to destination
  send(message: A2AMessage, destination: Destination): Promise<void>;

  // Receive message (pull-based)
  receive(timeout?: number): Promise<A2AMessage | null>;

  // Subscribe to messages (push-based)
  subscribe(
    filter: MessageFilter,
    handler: MessageHandler
  ): Subscription;

  // Connect to endpoint
  connect(endpoint: string, options?: ConnectOptions): Promise<void>;

  // Disconnect from endpoint
  disconnect(): Promise<void>;

  // Check connection status
  isConnected(): boolean;

  // Get transport capabilities
  getCapabilities(): TransportCapabilities;
}
```

**Transport Selection Logic**:
```typescript
class TransportSelector {
  selectTransport(
    requirements: TransportRequirements,
    available: TransportCapabilities[]
  ): ITransport {
    // Priority: performance > reliability > features
    // 1. Check required features (e.g., streaming, bidirectional)
    // 2. Evaluate performance characteristics
    // 3. Consider reliability requirements
    // 4. Fall back to most compatible option
  }
}
```

#### 2.1.3 Protocol Versioning

**Component**: `/src/a2a/protocol/versioning.ts`

**Version Negotiation Flow**:
```
Agent A                    Agent B
   │                          │
   │──── HELLO (versions) ────►
   │                          │
   │◄─── VERSION_ACK ─────────│
   │     (selected version)   │
   │                          │
   │──── Messages (v1.0) ────►│
   │                          │
```

**Negotiation Interface**:
```typescript
interface IVersionNegotiator {
  // Advertise supported versions
  getSupportedVersions(): string[];

  // Negotiate version with peer
  negotiate(
    ourVersions: string[],
    theirVersions: string[]
  ): string | null;

  // Check version compatibility
  isCompatible(version1: string, version2: string): boolean;

  // Get migration path between versions
  getMigrationPath(from: string, to: string): VersionMigration[];
}
```

**Version Compatibility Matrix**:
```typescript
const COMPATIBILITY_MATRIX: Record<string, string[]> = {
  '1.0.0': ['1.0.0'],
  '1.1.0': ['1.0.0', '1.1.0'],
  '2.0.0': ['1.1.0', '2.0.0'], // Breaking changes
};
```

#### 2.1.4 Security and Authentication

**Component**: `/src/a2a/protocol/security/`

```
security/
├── authenticator.ts           # Authentication logic
├── authorizer.ts             # Authorization logic
├── token-manager.ts          # Token lifecycle management
├── crypto-utils.ts           # Cryptographic utilities
└── audit-logger.ts           # Security audit logging
```

**Authentication Flow**:
```
Agent                      A2A Registry                 Target Agent
  │                             │                            │
  │──── Auth Request ──────────►│                            │
  │     (credentials)           │                            │
  │                             │                            │
  │◄─── Auth Token ─────────────│                            │
  │     (JWT)                   │                            │
  │                             │                            │
  │──── Message (token) ────────┼───────────────────────────►│
  │                             │                            │
  │                             │◄─── Validate Token ────────│
  │                             │                            │
  │                             │──── Token Valid ──────────►│
  │                             │                            │
  │◄─── Response ───────────────┼────────────────────────────│
```

**Security Interface**:
```typescript
interface ISecurityManager {
  // Authenticate agent
  authenticate(credentials: Credentials): Promise<AuthToken>;

  // Validate authentication token
  validateToken(token: string): Promise<TokenValidation>;

  // Authorize operation
  authorize(
    subject: AgentId,
    resource: ResourceIdentifier,
    action: Action
  ): Promise<AuthorizationDecision>;

  // Sign message
  signMessage(message: A2AMessage, privateKey: CryptoKey): Promise<string>;

  // Verify message signature
  verifySignature(
    message: A2AMessage,
    signature: string,
    publicKey: CryptoKey
  ): Promise<boolean>;

  // Encrypt message
  encryptMessage(message: A2AMessage, publicKey: CryptoKey): Promise<Buffer>;

  // Decrypt message
  decryptMessage(encrypted: Buffer, privateKey: CryptoKey): Promise<A2AMessage>;

  // Audit log
  audit(event: SecurityEvent): Promise<void>;
}
```

#### 2.1.5 Message Router and Orchestrator

**Component**: `/src/a2a/protocol/router.ts`

**Routing Architecture**:
```
                          ┌──────────────┐
                          │    Message   │
                          │    Router    │
                          └──────┬───────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
    ┌───────────────┐    ┌───────────────┐   ┌───────────────┐
    │   Platform    │    │   Platform    │   │   Platform    │
    │   Router 1    │    │   Router 2    │   │   Router 3    │
    │ (Claude Flow) │    │   (Codex)     │   │  (Gemini)     │
    └───────┬───────┘    └───────┬───────┘   └───────┬───────┘
            │                    │                    │
            ▼                    ▼                    ▼
    ┌───────────────┐    ┌───────────────┐   ┌───────────────┐
    │    Agent      │    │    Agent      │   │    Agent      │
    │   Registry    │    │   Registry    │   │   Registry    │
    └───────────────┘    └───────────────┘   └───────────────┘
```

**Router Interface**:
```typescript
interface IMessageRouter {
  // Route message to destination
  route(message: A2AMessage): Promise<RouteResult>;

  // Register routing rule
  registerRoute(rule: RoutingRule): void;

  // Find route for destination
  findRoute(destination: Destination): Route | null;

  // Handle routing failure
  handleRoutingFailure(
    message: A2AMessage,
    error: RoutingError
  ): Promise<void>;

  // Get routing metrics
  getMetrics(): RoutingMetrics;
}
```

**Routing Strategies**:
```typescript
enum RoutingStrategy {
  DIRECT = 'direct',           // Direct to target agent
  BROADCAST = 'broadcast',     // Broadcast to all matching
  ROUND_ROBIN = 'round-robin', // Load balance across agents
  PRIORITY = 'priority',       // Route by priority
  FAILOVER = 'failover',       // Route with fallback
}
```

### 2.2 Agent Adapter Framework

```
┌─────────────────────────────────────────────────────────────────┐
│                   Agent Adapter Framework                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             Abstract Agent Interface                      │  │
│  │  (Defines standard operations all adapters implement)    │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         │                 │                 │                  │
│  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐          │
│  │   Claude    │   │    Codex    │   │   Gemini    │          │
│  │    Flow     │   │   Adapter   │   │   Adapter   │          │
│  │   Adapter   │   │             │   │             │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Capability Mapping & Translation               │  │
│  │  (Maps platform capabilities to A2A standard)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Lifecycle Management Hooks                   │  │
│  │  (Handles agent lifecycle events across platforms)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2.1 Abstract Agent Interface

**Component**: `/src/a2a/adapters/agent-interface.ts`

**Interface Definition**:
```typescript
interface IAgent {
  // Agent identification
  readonly id: AgentId;
  readonly name: string;
  readonly platform: PlatformType;
  readonly version: string;

  // Lifecycle management
  spawn(config: AgentConfig): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  terminate(): Promise<void>;
  getStatus(): Promise<AgentStatus>;

  // Capability management
  getCapabilities(): Promise<Capability[]>;
  advertiseCapability(capability: Capability): Promise<void>;
  revokeCapability(capabilityId: string): Promise<void>;

  // Task execution
  executeTask(task: Task): Promise<TaskResult>;
  cancelTask(taskId: TaskId): Promise<void>;
  getTaskStatus(taskId: TaskId): Promise<TaskStatus>;

  // Communication
  sendMessage(message: A2AMessage, destination: AgentId): Promise<void>;
  receiveMessage(timeout?: number): Promise<A2AMessage | null>;
  subscribe(filter: MessageFilter, handler: MessageHandler): Subscription;

  // Memory access
  readMemory(key: string, namespace?: string): Promise<MemoryEntry | null>;
  writeMemory(key: string, value: unknown, namespace?: string): Promise<void>;
  deleteMemory(key: string, namespace?: string): Promise<void>;

  // Event handling
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data: unknown): void;

  // Metrics and monitoring
  getMetrics(): Promise<AgentMetrics>;
}
```

**Agent Base Class**:
```typescript
abstract class AgentBase implements IAgent {
  protected config: AgentConfig;
  protected status: AgentStatus;
  protected eventEmitter: EventEmitter;

  constructor(config: AgentConfig) {
    this.config = config;
    this.status = AgentStatus.INITIALIZING;
    this.eventEmitter = new EventEmitter();
  }

  // Common lifecycle implementations
  async spawn(config: AgentConfig): Promise<void> {
    this.status = AgentStatus.SPAWNING;
    await this.doSpawn(config);
    this.status = AgentStatus.ACTIVE;
    this.emit('spawned', { id: this.id });
  }

  // Platform-specific implementations must override
  protected abstract doSpawn(config: AgentConfig): Promise<void>;
  protected abstract doExecuteTask(task: Task): Promise<TaskResult>;
  protected abstract doGetCapabilities(): Promise<Capability[]>;
}
```

#### 2.2.2 Platform-Specific Adapters

**Claude Flow Adapter**: `/src/a2a/adapters/claude-flow-adapter.ts`

```typescript
class ClaudeFlowAdapter extends AgentBase {
  private mcpClient: MCPClient;
  private hooksManager: HooksManager;

  protected async doSpawn(config: AgentConfig): Promise<void> {
    // Use existing claude-flow infrastructure
    await this.mcpClient.call('agent_spawn', {
      type: config.type,
      name: config.name,
      capabilities: config.capabilities,
    });

    // Setup hooks for A2A coordination
    await this.hooksManager.register('pre-task', this.handlePreTask.bind(this));
    await this.hooksManager.register('post-task', this.handlePostTask.bind(this));
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    // Translate A2A task to claude-flow format
    const claudeTask = this.translateTask(task);

    // Execute via MCP
    const result = await this.mcpClient.call('task_orchestrate', {
      task: claudeTask.description,
      strategy: claudeTask.strategy,
    });

    // Translate result back to A2A format
    return this.translateResult(result);
  }

  private translateTask(task: Task): ClaudeFlowTask {
    // Map A2A task to claude-flow task structure
    return {
      description: task.description,
      strategy: this.mapStrategy(task.constraints),
      priority: task.priority,
    };
  }
}
```

**Codex Adapter**: `/src/a2a/adapters/codex-adapter.ts`

```typescript
class CodexAdapter extends AgentBase {
  private codexClient: CodexClient;

  protected async doSpawn(config: AgentConfig): Promise<void> {
    // Use Codex agent creation API
    const response = await this.codexClient.createAgent({
      name: config.name,
      type: this.mapAgentType(config.type),
      capabilities: this.mapCapabilities(config.capabilities),
    });

    this.id = response.agentId;
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    // Execute task via Codex API
    const response = await this.codexClient.executeTask(this.id, {
      taskType: task.type,
      parameters: task.parameters,
      constraints: this.mapConstraints(task.constraints),
    });

    return this.translateCodexResult(response);
  }

  private mapAgentType(a2aType: string): string {
    // Map A2A agent types to Codex types
    const typeMap: Record<string, string> = {
      'researcher': 'research-agent',
      'coder': 'code-generation-agent',
      'tester': 'test-automation-agent',
    };
    return typeMap[a2aType] || a2aType;
  }
}
```

**Gemini-CLI Adapter**: `/src/a2a/adapters/gemini-adapter.ts`

```typescript
class GeminiAdapter extends AgentBase {
  private geminiClient: GeminiClient;
  private contextManager: ContextManager;

  protected async doSpawn(config: AgentConfig): Promise<void> {
    // Initialize Gemini agent
    await this.geminiClient.initialize({
      model: this.selectModel(config.capabilities),
      systemInstructions: this.buildSystemInstructions(config),
    });

    // Setup context for A2A operations
    this.contextManager.setContext({
      agentId: this.id,
      platform: 'gemini-cli',
      capabilities: config.capabilities,
    });
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    // Build prompt from task
    const prompt = this.buildPrompt(task);

    // Execute via Gemini
    const response = await this.geminiClient.generateContent({
      prompt,
      generationConfig: this.mapGenerationConfig(task.constraints),
    });

    // Extract structured result
    return this.parseGeminiResponse(response);
  }

  private buildPrompt(task: Task): string {
    // Convert A2A task to Gemini prompt
    return `
      Task Type: ${task.type}
      Description: ${task.description}
      Parameters: ${JSON.stringify(task.parameters)}

      Please execute this task and provide results in the following format:
      {
        "status": "success | failed",
        "data": {...},
        "metrics": {...}
      }
    `;
  }
}
```

#### 2.2.3 Capability Mapping and Translation

**Component**: `/src/a2a/adapters/capability-mapper.ts`

**Capability Translation Architecture**:
```
A2A Standard Capability
         │
         │ Platform Detection
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Platform A   Platform B
Capability   Capability
    │         │
    │ Execution
    │
    ▼
Platform-Specific
    Result
    │
    │ Translation
    │
    ▼
A2A Standard Result
```

**Mapper Interface**:
```typescript
interface ICapabilityMapper {
  // Map A2A capability to platform capability
  toPlatformCapability(
    capability: Capability,
    platform: PlatformType
  ): PlatformCapability;

  // Map platform capability to A2A capability
  toA2ACapability(
    platformCapability: PlatformCapability,
    platform: PlatformType
  ): Capability;

  // Check if platform supports capability
  isSupported(
    capability: Capability,
    platform: PlatformType
  ): boolean;

  // Find equivalent capabilities across platforms
  findEquivalent(
    capability: Capability,
    targetPlatform: PlatformType
  ): Capability | null;

  // Get capability compatibility score
  getCompatibilityScore(
    cap1: Capability,
    cap2: Capability
  ): number;
}
```

**Capability Registry**:
```typescript
class CapabilityRegistry {
  private mappings: Map<string, CapabilityMapping>;

  registerMapping(mapping: CapabilityMapping): void {
    this.mappings.set(mapping.a2aCapabilityId, mapping);
  }

  getMapping(
    capabilityId: string,
    platform: PlatformType
  ): PlatformCapabilityMapping | null {
    const mapping = this.mappings.get(capabilityId);
    return mapping?.platforms[platform] || null;
  }
}

interface CapabilityMapping {
  a2aCapabilityId: string;
  description: string;
  platforms: {
    [platform: string]: PlatformCapabilityMapping;
  };
}

interface PlatformCapabilityMapping {
  platformCapabilityId: string;
  parameterMapping: Record<string, string>;
  resultMapping: Record<string, string>;
  translator: CapabilityTranslator;
}
```

**Example Capability Mappings**:
```typescript
const RESEARCH_CAPABILITY_MAPPING: CapabilityMapping = {
  a2aCapabilityId: 'research',
  description: 'Research and information gathering',
  platforms: {
    'claude-flow': {
      platformCapabilityId: 'researcher',
      parameterMapping: {
        'query': 'description',
        'depth': 'strategy',
        'maxResults': 'constraints.maxResults',
      },
      resultMapping: {
        'findings': 'data.findings',
        'sources': 'data.citations',
      },
      translator: new ClaudeFlowResearchTranslator(),
    },
    'codex': {
      platformCapabilityId: 'research-agent',
      parameterMapping: {
        'query': 'searchQuery',
        'depth': 'analysisDepth',
        'maxResults': 'resultLimit',
      },
      resultMapping: {
        'findings': 'results.content',
        'sources': 'results.references',
      },
      translator: new CodexResearchTranslator(),
    },
    'gemini': {
      platformCapabilityId: 'information-gathering',
      parameterMapping: {
        'query': 'prompt',
        'depth': 'generationConfig.temperature',
        'maxResults': 'generationConfig.candidateCount',
      },
      resultMapping: {
        'findings': 'response.text',
        'sources': 'response.citations',
      },
      translator: new GeminiResearchTranslator(),
    },
  },
};
```

#### 2.2.4 Lifecycle Management Hooks

**Component**: `/src/a2a/adapters/lifecycle-manager.ts`

**Lifecycle Events**:
```typescript
enum LifecycleEvent {
  BEFORE_SPAWN = 'before-spawn',
  AFTER_SPAWN = 'after-spawn',
  BEFORE_PAUSE = 'before-pause',
  AFTER_PAUSE = 'after-pause',
  BEFORE_RESUME = 'before-resume',
  AFTER_RESUME = 'after-resume',
  BEFORE_TERMINATE = 'before-terminate',
  AFTER_TERMINATE = 'after-terminate',
  STATUS_CHANGED = 'status-changed',
  ERROR = 'error',
}
```

**Lifecycle Manager Interface**:
```typescript
interface ILifecycleManager {
  // Register lifecycle hook
  registerHook(
    event: LifecycleEvent,
    hook: LifecycleHook
  ): void;

  // Execute hooks for event
  executeHooks(
    event: LifecycleEvent,
    context: LifecycleContext
  ): Promise<void>;

  // Get agent lifecycle state
  getLifecycleState(agentId: AgentId): LifecycleState;

  // Transition agent to new state
  transition(
    agentId: AgentId,
    toState: AgentStatus
  ): Promise<void>;
}
```

**Example Lifecycle Hooks**:
```typescript
// Hook to register agent with A2A registry after spawn
const registerWithRegistry: LifecycleHook = async (context) => {
  if (context.event === LifecycleEvent.AFTER_SPAWN) {
    await a2aRegistry.registerAgent({
      id: context.agentId,
      platform: context.platform,
      capabilities: context.capabilities,
      endpoints: context.endpoints,
    });
  }
};

// Hook to sync memory before pause
const syncMemoryBeforePause: LifecycleHook = async (context) => {
  if (context.event === LifecycleEvent.BEFORE_PAUSE) {
    await memoryManager.syncAgentMemory(context.agentId);
  }
};

// Hook to restore context on resume
const restoreContextOnResume: LifecycleHook = async (context) => {
  if (context.event === LifecycleEvent.AFTER_RESUME) {
    const state = await stateManager.getAgentState(context.agentId);
    await context.agent.restoreState(state);
  }
};
```

### 2.3 Shared Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                     Shared Infrastructure                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │  Unified Memory    │◄───────►│    Event Bus       │         │
│  │    Protocol        │         │                    │         │
│  └─────────┬──────────┘         └──────────┬─────────┘         │
│            │                               │                    │
│            │                               │                    │
│  ┌─────────▼──────────┐         ┌──────────▼─────────┐         │
│  │  Service Registry  │◄───────►│    Resource        │         │
│  │    & Discovery     │         │   Coordination     │         │
│  └────────────────────┘         └────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3.1 Unified Memory Protocol

**Component**: `/src/a2a/infrastructure/memory/`

**Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│                  Memory Architecture                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Memory Access Layer (API)              │   │
│  └────────────┬────────────────────────────────────┘   │
│               │                                         │
│  ┌────────────┴────────────────────────────────────┐   │
│  │       Memory Synchronization Engine             │   │
│  │  - Conflict Resolution                          │   │
│  │  - Replication Management                       │   │
│  │  - Consistency Enforcement                      │   │
│  └────────────┬────────────────────────────────────┘   │
│               │                                         │
│  ┌────────────┴────────────────────────────────────┐   │
│  │          Storage Backend Abstraction            │   │
│  └────┬──────────────┬──────────────┬──────────────┘   │
│       │              │              │                   │
│  ┌────▼────┐    ┌────▼────┐   ┌────▼────┐             │
│  │ Memory  │    │  Redis  │   │  File   │             │
│  │ (Fast)  │    │ (Shared)│   │ (Persist)│            │
│  └─────────┘    └─────────┘   └─────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Memory Interface**:
```typescript
interface IMemoryManager {
  // CRUD operations
  create(entry: MemoryEntry): Promise<void>;
  read(key: string, namespace: string): Promise<MemoryEntry | null>;
  update(key: string, namespace: string, value: unknown): Promise<void>;
  delete(key: string, namespace: string): Promise<void>;

  // Query operations
  list(namespace: string, pattern?: string): Promise<MemoryEntry[]>;
  search(query: MemoryQuery): Promise<MemoryEntry[]>;

  // Synchronization
  sync(entry: MemoryEntry, targets: PlatformType[]): Promise<void>;
  subscribe(pattern: string, handler: MemoryChangeHandler): Subscription;

  // Transaction support
  beginTransaction(): Transaction;
  commit(transaction: Transaction): Promise<void>;
  rollback(transaction: Transaction): Promise<void>;

  // Namespace management
  createNamespace(namespace: string, config: NamespaceConfig): Promise<void>;
  deleteNamespace(namespace: string): Promise<void>;

  // Maintenance
  compact(namespace: string): Promise<void>;
  snapshot(namespace: string): Promise<Snapshot>;
  restore(snapshot: Snapshot): Promise<void>;
}
```

**Synchronization Engine**:
```typescript
class MemorySyncEngine {
  private replicationManager: ReplicationManager;
  private conflictResolver: ConflictResolver;

  async sync(entry: MemoryEntry, targets: PlatformType[]): Promise<void> {
    // 1. Prepare sync operation
    const syncOp: SyncOperation = {
      entry,
      targets,
      timestamp: Date.now(),
      version: entry.metadata.version + 1,
    };

    // 2. Send to all targets
    const results = await Promise.allSettled(
      targets.map(target => this.syncToTarget(syncOp, target))
    );

    // 3. Handle failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      await this.handleSyncFailures(syncOp, failures);
    }

    // 4. Update replication status
    await this.replicationManager.updateStatus(entry.namespace, entry.key, {
      synced: results.filter(r => r.status === 'fulfilled').length,
      failed: failures.length,
      timestamp: Date.now(),
    });
  }

  async resolveConflict(
    local: MemoryEntry,
    remote: MemoryEntry
  ): Promise<MemoryEntry> {
    const strategy = local.synchronization.conflictResolution;

    switch (strategy) {
      case 'last-write-wins':
        return local.metadata.modified > remote.metadata.modified
          ? local
          : remote;

      case 'merge':
        return this.conflictResolver.merge(local, remote);

      case 'manual':
        throw new ConflictRequiresManualResolution(local, remote);

      default:
        return local;
    }
  }
}
```

#### 2.3.2 Event Bus

**Component**: `/src/a2a/infrastructure/event-bus/`

**Event Bus Architecture**:
```
┌──────────────────────────────────────────────────────────┐
│                      Event Bus                            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Publishers                        Subscribers            │
│     │                                  ▲                  │
│     │                                  │                  │
│     ▼                                  │                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Event Channel Manager                 │    │
│  │  - Topic Management                             │    │
│  │  - Subscription Management                       │    │
│  │  - Message Filtering                            │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────┴────────────────────────────────────┐    │
│  │           Event Distribution Layer               │    │
│  │  - Fanout                                       │    │
│  │  - Direct                                       │    │
│  │  - Topic-based                                  │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────┴────────────────────────────────────┐    │
│  │          Message Queue / Buffer                  │    │
│  │  - Persistence                                  │    │
│  │  - Ordering                                     │    │
│  │  - Delivery Guarantees                          │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Event Bus Interface**:
```typescript
interface IEventBus {
  // Publishing
  publish(event: Event): Promise<void>;
  publishBatch(events: Event[]): Promise<void>;

  // Subscription
  subscribe(
    filter: EventFilter,
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Subscription;

  unsubscribe(subscription: Subscription): Promise<void>;

  // Topic management
  createTopic(topic: string, config: TopicConfig): Promise<void>;
  deleteTopic(topic: string): Promise<void>;
  listTopics(): Promise<string[]>;

  // Message retrieval (pull-based)
  poll(topic: string, count?: number): Promise<Event[]>;

  // Monitoring
  getMetrics(): Promise<EventBusMetrics>;
}
```

**Event Distribution Strategies**:
```typescript
class EventDistributor {
  async distribute(event: Event, subscriptions: Subscription[]): Promise<void> {
    const strategy = this.selectStrategy(event, subscriptions);

    switch (strategy) {
      case DistributionStrategy.FANOUT:
        // Deliver to all subscribers
        await Promise.all(
          subscriptions.map(sub => this.deliver(event, sub))
        );
        break;

      case DistributionStrategy.DIRECT:
        // Deliver to specific subscriber
        const target = this.findTarget(event, subscriptions);
        if (target) {
          await this.deliver(event, target);
        }
        break;

      case DistributionStrategy.ROUND_ROBIN:
        // Load balance across subscribers
        const next = this.selectNext(subscriptions);
        await this.deliver(event, next);
        break;
    }
  }
}
```

#### 2.3.3 Service Registry and Discovery

**Component**: `/src/a2a/infrastructure/registry/`

**Registry Architecture**:
```
┌──────────────────────────────────────────────────────────┐
│                  Service Registry                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Agent Catalog                         │    │
│  │  - Agent Metadata                               │    │
│  │  - Capability Index                             │    │
│  │  - Health Status                                │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐    │
│  │          Discovery Service                       │    │
│  │  - Query Interface                              │    │
│  │  - Capability Matching                          │    │
│  │  - Load Balancing                               │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐    │
│  │         Health Monitoring                        │    │
│  │  - Heartbeat Tracking                           │    │
│  │  - Failure Detection                            │    │
│  │  - Auto-Deregistration                          │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Registry Interface**:
```typescript
interface IServiceRegistry {
  // Agent registration
  register(agent: AgentRegistration): Promise<void>;
  deregister(agentId: AgentId): Promise<void>;
  update(agentId: AgentId, updates: Partial<AgentRegistration>): Promise<void>;

  // Discovery
  find(query: AgentQuery): Promise<AgentInfo[]>;
  findByCapability(capability: string): Promise<AgentInfo[]>;
  findByPlatform(platform: PlatformType): Promise<AgentInfo[]>;

  // Health management
  heartbeat(agentId: AgentId): Promise<void>;
  getHealth(agentId: AgentId): Promise<HealthStatus>;

  // Watching
  watch(query: AgentQuery, handler: RegistryChangeHandler): Subscription;
}
```

**Discovery Query DSL**:
```typescript
// Example queries
const query1: AgentQuery = {
  capabilities: ['research', 'analysis'],
  platform: 'any',
  status: 'available',
  minReliability: 0.95,
};

const query2: AgentQuery = {
  capabilities: {
    all: ['coding', 'testing'],
    any: ['python', 'typescript'],
  },
  resources: {
    cpu: { min: 50 },
    memory: { min: 2048 },
  },
  location: {
    region: 'us-west',
    latency: { max: 100 },
  },
};
```

#### 2.3.4 Resource Coordination

**Component**: `/src/a2a/infrastructure/resources/`

**Resource Coordinator Architecture**:
```
┌──────────────────────────────────────────────────────────┐
│                 Resource Coordinator                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │          Resource Pool Manager                   │    │
│  │  - CPU/Memory/Token Pools                       │    │
│  │  - Allocation Tracking                          │    │
│  │  - Quota Management                             │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐    │
│  │         Allocation Strategy                      │    │
│  │  - Fair Share                                   │    │
│  │  - Priority-based                               │    │
│  │  - Demand-based                                 │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐    │
│  │        Conflict Resolution                       │    │
│  │  - Deadlock Detection                           │    │
│  │  - Resource Preemption                          │    │
│  │  - Backpressure Management                      │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Resource Coordinator Interface**:
```typescript
interface IResourceCoordinator {
  // Resource allocation
  allocate(
    agentId: AgentId,
    requirements: ResourceRequirements
  ): Promise<ResourceAllocation>;

  release(allocation: ResourceAllocation): Promise<void>;

  // Resource queries
  getAvailable(resourceType: ResourceType): Promise<number>;
  getUsage(agentId?: AgentId): Promise<ResourceUsage>;

  // Quota management
  setQuota(agentId: AgentId, quota: ResourceQuota): Promise<void>;
  getQuota(agentId: AgentId): Promise<ResourceQuota>;

  // Monitoring
  subscribe(handler: ResourceEventHandler): Subscription;
  getMetrics(): Promise<ResourceMetrics>;
}
```

**Resource Allocation Strategy**:
```typescript
class FairShareAllocator implements AllocationStrategy {
  async allocate(
    request: AllocationRequest,
    available: ResourcePool
  ): Promise<ResourceAllocation> {
    // Calculate fair share
    const activeAgents = await this.getActiveAgents();
    const fairShare = available.total / activeAgents.length;

    // Check if request exceeds fair share
    if (request.amount > fairShare) {
      // Check if burst capacity available
      if (available.current >= request.amount) {
        // Allow burst but track for future adjustments
        return this.allocateBurst(request, available);
      } else {
        // Queue request or reject
        throw new InsufficientResourcesError(request, available);
      }
    }

    // Allocate within fair share
    return this.allocateNormal(request, available);
  }
}
```

### 2.4 Integration Points

#### 2.4.1 MCP Server Extensions

**Component**: `/src/a2a/integrations/mcp/`

**New MCP Tools for A2A**:
```typescript
// A2A Agent Discovery
mcp__claude-flow__a2a_discover_agents
mcp__claude-flow__a2a_advertise_capability
mcp__claude-flow__a2a_request_task

// A2A Memory Operations
mcp__claude-flow__a2a_memory_sync
mcp__claude-flow__a2a_memory_subscribe

// A2A Event Operations
mcp__claude-flow__a2a_publish_event
mcp__claude-flow__a2a_subscribe_events

// A2A Platform Integration
mcp__claude-flow__a2a_connect_platform
mcp__claude-flow__a2a_platform_status
```

**MCP Tool Implementation Example**:
```typescript
// A2A Agent Discovery Tool
{
  name: 'mcp__claude-flow__a2a_discover_agents',
  description: 'Discover agents across A2A-compatible platforms',
  parameters: {
    type: 'object',
    properties: {
      capabilities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Required capabilities',
      },
      platforms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Target platforms (empty = all)',
      },
      filters: {
        type: 'object',
        description: 'Additional filters',
      },
    },
  },
  handler: async (params) => {
    const query: AgentQuery = {
      capabilities: params.capabilities,
      platforms: params.platforms || ['all'],
      ...params.filters,
    };

    const agents = await serviceRegistry.find(query);

    return {
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        capabilities: agent.capabilities,
        status: agent.status,
        endpoints: agent.endpoints,
      })),
      count: agents.length,
    };
  },
}
```

#### 2.4.2 Hook System Enhancements

**Component**: `/src/a2a/integrations/hooks/`

**New A2A Hooks**:
```typescript
// Before A2A message send
'a2a:pre-send': async (context) => {
  // Validate message format
  await messageValidator.validate(context.message);

  // Add authentication
  context.message.auth = await authManager.getToken();

  // Add tracing
  context.message.trace = tracing.currentSpan();
};

// After A2A message receive
'a2a:post-receive': async (context) => {
  // Verify signature
  await securityManager.verifySignature(context.message);

  // Update metrics
  await metricsCollector.recordMessage(context.message);

  // Store in memory if needed
  if (context.message.type === 'memory.sync') {
    await memoryManager.sync(context.message.memory);
  }
};

// On agent discovery
'a2a:agent-discovered': async (context) => {
  // Cache agent info
  await agentCache.set(context.agent.id, context.agent);

  // Establish connection
  await connectionManager.connect(context.agent);

  // Sync capabilities
  await capabilitySync.sync(context.agent);
};

// On cross-platform task delegation
'a2a:task-delegated': async (context) => {
  // Track delegation
  await taskTracker.recordDelegation(context.task, context.targetAgent);

  // Setup callback
  await callbackManager.register(context.task.id, context.callback);

  // Monitor progress
  await progressMonitor.watch(context.task.id);
};
```

#### 2.4.3 Configuration Management

**Component**: `/src/a2a/integrations/config/`

**A2A Configuration Schema**:
```typescript
interface A2AConfig {
  // Protocol settings
  protocol: {
    version: string;
    fallbackVersions: string[];
    negotiationTimeout: number;
  };

  // Platform integrations
  platforms: {
    [platform: string]: PlatformConfig;
  };

  // Transport settings
  transport: {
    preferred: 'http' | 'websocket' | 'grpc';
    http: HttpTransportConfig;
    websocket: WebSocketTransportConfig;
    grpc: GrpcTransportConfig;
  };

  // Memory settings
  memory: {
    backend: 'memory' | 'redis' | 'file';
    syncStrategy: 'immediate' | 'eventual';
    conflictResolution: 'last-write-wins' | 'merge' | 'manual';
    ttl: number;
  };

  // Event bus settings
  eventBus: {
    backend: 'memory' | 'redis' | 'rabbitmq';
    deliveryGuarantee: 'at-most-once' | 'at-least-once' | 'exactly-once';
    batchSize: number;
  };

  // Registry settings
  registry: {
    backend: 'memory' | 'etcd' | 'consul';
    heartbeatInterval: number;
    healthCheckTimeout: number;
  };

  // Security settings
  security: {
    authentication: {
      method: 'api-key' | 'oauth2' | 'bearer' | 'mtls';
      tokenExpiry: number;
    };
    encryption: {
      enabled: boolean;
      algorithm: string;
    };
    signing: {
      enabled: boolean;
      algorithm: string;
    };
  };

  // Resource limits
  resources: {
    maxConcurrentAgents: number;
    maxMessagesPerSecond: number;
    maxMemorySize: number;
  };
}
```

**Configuration Example**:
```typescript
const a2aConfig: A2AConfig = {
  protocol: {
    version: '1.0.0',
    fallbackVersions: ['0.9.0'],
    negotiationTimeout: 5000,
  },

  platforms: {
    'claude-flow': {
      enabled: true,
      adapter: 'ClaudeFlowAdapter',
      endpoints: {
        mcp: 'npx claude-flow@alpha mcp start',
      },
      authentication: {
        method: 'bearer',
      },
    },
    'codex': {
      enabled: true,
      adapter: 'CodexAdapter',
      endpoints: {
        api: 'https://api.codex.microsoft.com',
      },
      authentication: {
        method: 'oauth2',
        credentials: {
          clientId: process.env.CODEX_CLIENT_ID,
          clientSecret: process.env.CODEX_CLIENT_SECRET,
        },
      },
    },
    'gemini': {
      enabled: true,
      adapter: 'GeminiAdapter',
      endpoints: {
        api: 'https://generativelanguage.googleapis.com',
      },
      authentication: {
        method: 'api-key',
        credentials: {
          apiKey: process.env.GEMINI_API_KEY,
        },
      },
    },
  },

  transport: {
    preferred: 'websocket',
    http: {
      port: 8080,
      timeout: 30000,
    },
    websocket: {
      port: 8081,
      pingInterval: 30000,
    },
    grpc: {
      port: 50051,
      maxMessageSize: 4194304,
    },
  },

  memory: {
    backend: 'redis',
    syncStrategy: 'eventual',
    conflictResolution: 'last-write-wins',
    ttl: 3600,
  },

  eventBus: {
    backend: 'redis',
    deliveryGuarantee: 'at-least-once',
    batchSize: 100,
  },

  registry: {
    backend: 'memory',
    heartbeatInterval: 30000,
    healthCheckTimeout: 5000,
  },

  security: {
    authentication: {
      method: 'bearer',
      tokenExpiry: 3600,
    },
    encryption: {
      enabled: true,
      algorithm: 'AES-256-GCM',
    },
    signing: {
      enabled: true,
      algorithm: 'RS256',
    },
  },

  resources: {
    maxConcurrentAgents: 100,
    maxMessagesPerSecond: 1000,
    maxMemorySize: 1073741824, // 1GB
  },
};
```

#### 2.4.4 Monitoring and Observability

**Component**: `/src/a2a/integrations/observability/`

**Observability Architecture**:
```
┌──────────────────────────────────────────────────────────┐
│                   Observability Stack                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Distributed Tracing                   │    │
│  │  (OpenTelemetry)                                │    │
│  │  - Trace message flow across platforms          │    │
│  │  - Track latency and bottlenecks               │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐    │
│  │             Metrics Collection                   │    │
│  │  (Prometheus format)                            │    │
│  │  - Message throughput                           │    │
│  │  - Resource utilization                         │    │
│  │  - Error rates                                  │    │
│  └────────────┬────────────────────────────────────┘    │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐    │
│  │            Structured Logging                    │    │
│  │  (JSON logs)                                    │    │
│  │  - Correlation IDs                              │    │
│  │  - Context enrichment                           │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Key Metrics**:
```typescript
const A2A_METRICS = {
  // Message metrics
  messages_sent_total: Counter,
  messages_received_total: Counter,
  message_latency_seconds: Histogram,
  message_size_bytes: Histogram,

  // Agent metrics
  agents_registered_total: Gauge,
  agents_active_total: Gauge,
  agent_tasks_completed_total: Counter,
  agent_tasks_failed_total: Counter,

  // Platform metrics
  platform_availability: Gauge,
  platform_message_throughput: Gauge,
  platform_error_rate: Gauge,

  // Resource metrics
  memory_usage_bytes: Gauge,
  memory_sync_operations_total: Counter,
  memory_conflicts_total: Counter,

  // Event bus metrics
  events_published_total: Counter,
  events_delivered_total: Counter,
  event_delivery_latency_seconds: Histogram,
};
```

## 3. Sequence Diagrams

### 3.1 Cross-Platform Task Execution

```
Claude Flow Agent    A2A Protocol Layer    Codex Platform    Codex Agent
      │                     │                     │               │
      │─── Discover ───────►│                     │               │
      │    (capability:     │                     │               │
      │     "coding")       │                     │               │
      │                     │                     │               │
      │                     │─── Query Registry ─►│               │
      │                     │                     │               │
      │                     │◄── Agent Info ──────│               │
      │                     │                     │               │
      │◄── Agent Found ─────│                     │               │
      │    (codex-agent-1)  │                     │               │
      │                     │                     │               │
      │─── Task Request ───►│                     │               │
      │    (write function) │                     │               │
      │                     │                     │               │
      │                     │─── Translate & ────►│               │
      │                     │    Send             │               │
      │                     │                     │               │
      │                     │                     │─── Execute ──►│
      │                     │                     │               │
      │                     │                     │◄── Result ────│
      │                     │                     │               │
      │                     │◄── Translate & ─────│               │
      │                     │    Receive          │               │
      │                     │                     │               │
      │◄── Task Result ─────│                     │               │
      │                     │                     │               │
```

### 3.2 Memory Synchronization

```
Agent A (Flow)    Memory Manager    Redis Backend    Agent B (Codex)
     │                 │                  │                │
     │─── Write ──────►│                  │                │
     │    (key: data)  │                  │                │
     │                 │                  │                │
     │                 │─── Store ───────►│                │
     │                 │                  │                │
     │                 │─── Sync Notify ─┼───────────────►│
     │                 │                  │                │
     │                 │                  │◄─── Read ──────│
     │                 │                  │                │
     │                 │                  │─── Data ──────►│
     │                 │                  │                │
     │─── Update ─────►│                  │                │
     │    (key: data2) │                  │                │
     │                 │                  │                │
     │                 │─── Update ──────►│                │
     │                 │                  │                │
     │                 │                  │◄─── Watch ─────│
     │                 │                  │                │
     │                 │                  │─── Changed ───►│
     │                 │                  │                │
```

### 3.3 Agent Discovery and Registration

```
New Agent    A2A Registry    Event Bus    Existing Agents
    │             │              │               │
    │─── Join ───►│              │               │
    │             │              │               │
    │             │─── Register ─►              │
    │             │    Agent     │               │
    │             │              │               │
    │             │─── Publish ──►              │
    │             │    AGENT_    │               │
    │             │    JOINED    │               │
    │             │              │               │
    │             │              │─── Notify ───►│
    │             │              │               │
    │             │              │◄── Request ───│
    │             │              │    Info       │
    │             │              │               │
    │◄── Welcome ─│              │               │
    │    (peers)  │              │               │
    │             │              │               │
    │────────────►│──────────────►──────────────►│
    │   Advertise Capabilities                   │
    │             │              │               │
```

## 4. Component Interactions

### 4.1 Message Flow

```
┌────────────┐      ┌─────────────┐      ┌─────────────┐
│   Agent A  │─────►│  A2A Proto  │─────►│  Transport  │
│  (Source)  │      │   Format    │      │             │
└────────────┘      └─────────────┘      └──────┬──────┘
                                                 │
                                                 ▼
                                         ┌────────────────┐
                                         │   Security     │
                                         │   (Sign/       │
                                         │    Encrypt)    │
                                         └───────┬────────┘
                                                 │
                                                 ▼
                                         ┌────────────────┐
                                         │    Router      │
                                         │                │
                                         └───────┬────────┘
                                                 │
                                                 ▼
                                         ┌────────────────┐
                                         │   Platform     │
                                         │   Adapter      │
                                         └───────┬────────┘
                                                 │
                                                 ▼
                                         ┌────────────────┐
                                         │   Agent B      │
                                         │  (Target)      │
                                         └────────────────┘
```

### 4.2 System Initialization

```
1. Load Configuration
   │
   ▼
2. Initialize Core Components
   ├── Protocol Layer
   ├── Shared Infrastructure
   │   ├── Memory Manager
   │   ├── Event Bus
   │   ├── Service Registry
   │   └── Resource Coordinator
   └── Security Manager
   │
   ▼
3. Initialize Platform Adapters
   ├── Claude Flow Adapter
   ├── Codex Adapter
   └── Gemini Adapter
   │
   ▼
4. Register MCP Tools
   │
   ▼
5. Setup Hooks
   │
   ▼
6. Start Services
   ├── HTTP Server
   ├── WebSocket Server
   ├── gRPC Server
   └── Health Check Endpoint
   │
   ▼
7. System Ready
```

## 5. Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        Deployment View                         │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Load Balancer / API Gateway              │    │
│  └───────────────────────┬──────────────────────────────┘    │
│                          │                                    │
│         ┌────────────────┼────────────────┐                  │
│         │                │                │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │  A2A Node 1 │  │  A2A Node 2 │  │  A2A Node 3 │          │
│  │             │  │             │  │             │          │
│  │  - Protocol │  │  - Protocol │  │  - Protocol │          │
│  │  - Adapters │  │  - Adapters │  │  - Adapters │          │
│  │  - Router   │  │  - Router   │  │  - Router   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                    │
│         ┌────────────────┴────────────────┐                  │
│         │                                 │                  │
│  ┌──────▼──────┐                  ┌───────▼────────┐         │
│  │    Redis    │                  │    Registry    │         │
│  │   Cluster   │                  │   (etcd)       │         │
│  │             │                  │                │         │
│  │  - Memory   │                  │  - Service     │         │
│  │  - Events   │                  │    Discovery   │         │
│  │  - Cache    │                  │  - Health      │         │
│  └─────────────┘                  └────────────────┘         │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

This architecture document provides comprehensive details for implementing the A2A protocol integration into claude-flow. The next phase would be creating detailed implementation plans and beginning the refinement phase with TDD.
