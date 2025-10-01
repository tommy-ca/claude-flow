# A2A Protocol Integration - Interface Contracts and API Specifications

## 1. Core Type Definitions

### 1.1 Base Types

```typescript
// Platform identification
type PlatformType = 'claude-flow' | 'codex' | 'gemini-cli' | 'opencode' | string;

// Unique identifiers
type AgentId = string; // UUID v4
type TaskId = string; // UUID v4
type MessageId = string; // UUID v4
type SessionId = string; // UUID v4

// Agent status enumeration
enum AgentStatus {
  INITIALIZING = 'initializing',
  SPAWNING = 'spawning',
  ACTIVE = 'active',
  IDLE = 'idle',
  BUSY = 'busy',
  PAUSED = 'paused',
  TERMINATING = 'terminating',
  TERMINATED = 'terminated',
  ERROR = 'error',
}

// Task status enumeration
enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Priority levels
enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
```

### 1.2 Message Types

```typescript
// Base message interface
interface A2AMessage {
  $schema: string;
  type: string;
  version: string;
  messageId: MessageId;
  timestamp: string; // ISO 8601
  source: MessageSource;
  target: MessageTarget;
  correlation?: CorrelationData;
}

interface MessageSource {
  agentId: AgentId;
  platform: PlatformType;
  component?: string;
  sessionId?: SessionId;
}

interface MessageTarget {
  agentId?: AgentId;
  agentIds?: AgentId[];
  platform?: PlatformType;
  broadcast?: boolean;
  filter?: MessageFilter;
}

interface CorrelationData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

interface MessageFilter {
  eventTypes?: string[];
  platforms?: PlatformType[];
  agentIds?: AgentId[];
  severity?: string[];
  customFilters?: Record<string, unknown>;
}
```

### 1.3 Agent Types

```typescript
// Agent configuration
interface AgentConfig {
  name: string;
  type: string;
  platform: PlatformType;
  capabilities: Capability[];
  resources?: ResourceRequirements;
  metadata?: Record<string, unknown>;
}

// Agent information
interface AgentInfo {
  id: AgentId;
  name: string;
  platform: PlatformType;
  version: string;
  status: AgentStatus;
  capabilities: Capability[];
  resources: ResourceStatus;
  endpoints: AgentEndpoints;
  metadata: AgentMetadata;
}

// Agent capability
interface Capability {
  id: string;
  type: 'core' | 'specialized' | 'platform' | 'integration';
  name: string;
  description: string;
  version: string;
  status: 'available' | 'limited' | 'unavailable';
  parameters: CapabilityParameters;
  constraints: CapabilityConstraints;
  quality?: QualityMetrics;
  dependencies?: CapabilityDependency[];
}

interface CapabilityParameters {
  required: ParameterDefinition[];
  optional?: ParameterDefinition[];
}

interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  validation?: ValidationRules;
  default?: unknown;
}

interface ValidationRules {
  pattern?: string; // regex
  min?: number;
  max?: number;
  enum?: unknown[];
  custom?: string; // custom validation function name
}

interface CapabilityConstraints {
  maxConcurrent?: number;
  maxDuration?: number; // seconds
  maxTokens?: number;
  rateLimits?: RateLimits;
}

interface RateLimits {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

interface QualityMetrics {
  accuracy?: number; // 0-1
  reliability?: number; // 0-1
  averageResponseTime?: number; // seconds
}

interface CapabilityDependency {
  capabilityId: string;
  required: boolean;
  minVersion?: string;
}

// Agent endpoints
interface AgentEndpoints {
  http?: string;
  websocket?: string;
  grpc?: string;
}

// Agent metadata
interface AgentMetadata {
  created: string; // ISO 8601
  lastActive: string; // ISO 8601
  owner?: string;
  tags?: string[];
  labels?: Record<string, string>;
}
```

### 1.4 Task Types

```typescript
// Task definition
interface Task {
  id: TaskId;
  type: string;
  priority: Priority;
  description: string;
  parameters: Record<string, unknown>;
  constraints: TaskConstraints;
  context?: TaskContext;
}

interface TaskConstraints {
  maxDuration?: number; // seconds
  maxTokens?: number;
  deadline?: string; // ISO 8601
  requiresCapabilities?: string[];
}

interface TaskContext {
  projectId?: string;
  previousTasks?: TaskId[];
  sharedMemoryKeys?: string[];
  metadata?: Record<string, unknown>;
}

// Task result
interface TaskResult {
  taskId: TaskId;
  status: TaskStatus;
  completedAt?: string; // ISO 8601
  executionTime?: number; // seconds
  tokensUsed?: number;
  data?: unknown;
  artifacts?: Artifact[];
  metrics?: TaskMetrics;
  error?: TaskError;
  nextActions?: RecommendedAction[];
}

interface Artifact {
  id: string;
  type: string;
  format: string;
  url?: string;
  data?: unknown;
  size?: number;
  checksum?: string;
}

interface TaskMetrics {
  accuracy?: number;
  coverage?: number;
  relevance?: number;
  custom?: Record<string, number>;
}

interface TaskError {
  code: string;
  type: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  suggestedActions?: RecommendedAction[];
}

interface RecommendedAction {
  type: 'retry' | 'fallback' | 'recommendation';
  description: string;
  suggestedAgent?: AgentId;
  parameters?: Record<string, unknown>;
}
```

### 1.5 Memory Types

```typescript
// Memory entry
interface MemoryEntry {
  namespace: string;
  key: string;
  value: MemoryValue;
  metadata: MemoryMetadata;
  access: AccessControl;
  lifecycle: LifecycleConfig;
  synchronization: SynchronizationConfig;
}

interface MemoryValue {
  type: 'json' | 'binary' | 'text';
  data: unknown;
  encoding?: string;
}

interface MemoryMetadata {
  version: number;
  created: string; // ISO 8601
  modified: string; // ISO 8601
  createdBy: AgentId;
  modifiedBy: AgentId;
  accessCount: number;
  size: number; // bytes
  checksum?: string;
}

interface AccessControl {
  visibility: 'public' | 'private' | 'restricted';
  permissions: Permissions;
}

interface Permissions {
  read: AgentId[] | ['*'];
  write: AgentId[];
  delete: AgentId[];
}

interface LifecycleConfig {
  ttl?: number; // seconds
  persistent: boolean;
  expiresAt?: string; // ISO 8601
}

interface SynchronizationConfig {
  strategy: 'immediate' | 'eventual' | 'manual';
  conflictResolution: 'last-write-wins' | 'merge' | 'manual';
  replication?: ReplicationConfig;
}

interface ReplicationConfig {
  enabled: boolean;
  minReplicas: number;
  platforms: PlatformType[];
}

// Memory query
interface MemoryQuery {
  namespace?: string;
  pattern?: string; // glob pattern
  filter?: MemoryFilter;
  sort?: MemorySortOptions;
  limit?: number;
  offset?: number;
}

interface MemoryFilter {
  createdAfter?: string; // ISO 8601
  createdBefore?: string; // ISO 8601
  modifiedBy?: AgentId;
  tags?: string[];
  minSize?: number;
  maxSize?: number;
}

interface MemorySortOptions {
  by: 'created' | 'modified' | 'size' | 'accessCount';
  order: 'asc' | 'desc';
}
```

### 1.6 Event Types

```typescript
// Event definition
interface Event {
  id: string;
  type: string;
  timestamp: string; // ISO 8601
  source: MessageSource;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  category: 'lifecycle' | 'task' | 'memory' | 'system' | 'custom';
  data: unknown;
  correlation?: CorrelationData;
  metadata?: EventMetadata;
}

interface EventMetadata {
  tags?: string[];
  labels?: Record<string, string>;
  retryCount?: number;
  deliveryAttempts?: number;
}

// Event subscription
interface EventSubscription {
  id: string;
  subscriberId: AgentId;
  filter: MessageFilter;
  delivery: DeliveryConfig;
  status: 'active' | 'paused' | 'cancelled';
}

interface DeliveryConfig {
  mode: 'push' | 'pull';
  endpoint?: string;
  protocol?: 'http' | 'websocket' | 'grpc';
  batching?: BatchConfig;
  retry?: RetryConfig;
}

interface BatchConfig {
  enabled: boolean;
  maxSize: number;
  maxWait: number; // milliseconds
}

interface RetryConfig {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  initialDelay: number; // milliseconds
  maxDelay?: number; // milliseconds
}
```

### 1.7 Resource Types

```typescript
// Resource requirements
interface ResourceRequirements {
  cpu?: ResourceSpec;
  memory?: ResourceSpec;
  tokens?: ResourceSpec;
  storage?: ResourceSpec;
}

interface ResourceSpec {
  min?: number;
  max?: number;
  preferred?: number;
  unit: string;
}

// Resource status
interface ResourceStatus {
  cpu: ResourceUsage;
  memory: ResourceUsage;
  tokens: ResourceUsage;
  storage?: ResourceUsage;
}

interface ResourceUsage {
  available: number;
  used: number;
  total: number;
  unit: string;
  percentage?: number;
}

// Resource allocation
interface ResourceAllocation {
  id: string;
  agentId: AgentId;
  resources: ResourceRequirements;
  allocatedAt: string; // ISO 8601
  expiresAt?: string; // ISO 8601
}

// Resource quota
interface ResourceQuota {
  cpu: number;
  memory: number;
  tokens: number;
  storage?: number;
}
```

## 2. Protocol Layer Interfaces

### 2.1 Message Formatter

```typescript
interface IMessageFormatter {
  /**
   * Validate message against JSON Schema
   */
  validate(message: unknown, schema: JSONSchema): ValidationResult;

  /**
   * Transform platform-specific message to A2A format
   */
  toA2A<T extends A2AMessage>(
    message: PlatformMessage,
    platform: PlatformType
  ): T;

  /**
   * Transform A2A message to platform-specific format
   */
  fromA2A<T extends PlatformMessage>(
    message: A2AMessage,
    platform: PlatformType
  ): T;

  /**
   * Serialize message for transmission
   */
  serialize(message: A2AMessage, format: 'json' | 'binary'): Buffer;

  /**
   * Deserialize received message
   */
  deserialize(data: Buffer, format: 'json' | 'binary'): A2AMessage;

  /**
   * Migrate message between protocol versions
   */
  migrate(message: A2AMessage, targetVersion: string): A2AMessage;
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
}

type PlatformMessage = Record<string, unknown>;
type JSONSchema = Record<string, unknown>;
```

### 2.2 Transport Interface

```typescript
interface ITransport {
  /**
   * Send message to destination
   */
  send(message: A2AMessage, destination: Destination): Promise<void>;

  /**
   * Receive message (pull-based)
   */
  receive(timeout?: number): Promise<A2AMessage | null>;

  /**
   * Subscribe to messages (push-based)
   */
  subscribe(
    filter: MessageFilter,
    handler: MessageHandler
  ): Subscription;

  /**
   * Connect to endpoint
   */
  connect(endpoint: string, options?: ConnectOptions): Promise<void>;

  /**
   * Disconnect from endpoint
   */
  disconnect(): Promise<void>;

  /**
   * Check connection status
   */
  isConnected(): boolean;

  /**
   * Get transport capabilities
   */
  getCapabilities(): TransportCapabilities;
}

interface Destination {
  endpoint: string;
  platform?: PlatformType;
  agentId?: AgentId;
}

type MessageHandler = (message: A2AMessage) => Promise<void> | void;

interface Subscription {
  id: string;
  unsubscribe(): Promise<void>;
}

interface ConnectOptions {
  timeout?: number;
  retries?: number;
  authentication?: AuthenticationConfig;
}

interface AuthenticationConfig {
  type: 'bearer' | 'api-key' | 'oauth2' | 'mtls';
  credentials: Record<string, string>;
}

interface TransportCapabilities {
  protocol: string;
  version: string;
  features: TransportFeature[];
  maxMessageSize: number;
  compression?: string[];
}

type TransportFeature =
  | 'streaming'
  | 'bidirectional'
  | 'multiplexing'
  | 'encryption'
  | 'compression';
```

### 2.3 Version Negotiator

```typescript
interface IVersionNegotiator {
  /**
   * Get list of supported protocol versions
   */
  getSupportedVersions(): string[];

  /**
   * Negotiate protocol version with peer
   */
  negotiate(
    ourVersions: string[],
    theirVersions: string[]
  ): string | null;

  /**
   * Check if two versions are compatible
   */
  isCompatible(version1: string, version2: string): boolean;

  /**
   * Get migration path between versions
   */
  getMigrationPath(from: string, to: string): VersionMigration[];
}

interface VersionMigration {
  fromVersion: string;
  toVersion: string;
  transformer: (message: A2AMessage) => A2AMessage;
  breaking: boolean;
}
```

### 2.4 Security Manager

```typescript
interface ISecurityManager {
  /**
   * Authenticate agent with credentials
   */
  authenticate(credentials: Credentials): Promise<AuthToken>;

  /**
   * Validate authentication token
   */
  validateToken(token: string): Promise<TokenValidation>;

  /**
   * Refresh authentication token
   */
  refreshToken(token: string): Promise<AuthToken>;

  /**
   * Authorize operation on resource
   */
  authorize(
    subject: AgentId,
    resource: ResourceIdentifier,
    action: Action
  ): Promise<AuthorizationDecision>;

  /**
   * Sign message with private key
   */
  signMessage(message: A2AMessage, privateKey: CryptoKey): Promise<string>;

  /**
   * Verify message signature with public key
   */
  verifySignature(
    message: A2AMessage,
    signature: string,
    publicKey: CryptoKey
  ): Promise<boolean>;

  /**
   * Encrypt message with public key
   */
  encryptMessage(message: A2AMessage, publicKey: CryptoKey): Promise<Buffer>;

  /**
   * Decrypt message with private key
   */
  decryptMessage(encrypted: Buffer, privateKey: CryptoKey): Promise<A2AMessage>;

  /**
   * Log security audit event
   */
  audit(event: SecurityEvent): Promise<void>;
}

interface Credentials {
  type: 'username-password' | 'api-key' | 'certificate';
  data: Record<string, string>;
}

interface AuthToken {
  token: string;
  type: 'bearer' | 'jwt';
  expiresAt: string; // ISO 8601
  refreshToken?: string;
}

interface TokenValidation {
  valid: boolean;
  agentId?: AgentId;
  expiresAt?: string;
  error?: string;
}

interface ResourceIdentifier {
  type: 'agent' | 'task' | 'memory' | 'capability';
  id: string;
  namespace?: string;
}

type Action = 'read' | 'write' | 'execute' | 'delete';

interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  conditions?: Record<string, unknown>;
}

interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'encryption' | 'audit';
  timestamp: string;
  agentId?: AgentId;
  action: string;
  result: 'success' | 'failure';
  details?: unknown;
}

type CryptoKey = unknown; // Platform-specific crypto key type
```

### 2.5 Message Router

```typescript
interface IMessageRouter {
  /**
   * Route message to destination
   */
  route(message: A2AMessage): Promise<RouteResult>;

  /**
   * Register routing rule
   */
  registerRoute(rule: RoutingRule): void;

  /**
   * Remove routing rule
   */
  removeRoute(ruleId: string): void;

  /**
   * Find route for destination
   */
  findRoute(destination: Destination): Route | null;

  /**
   * Handle routing failure
   */
  handleRoutingFailure(
    message: A2AMessage,
    error: RoutingError
  ): Promise<void>;

  /**
   * Get routing metrics
   */
  getMetrics(): RoutingMetrics;
}

interface RouteResult {
  success: boolean;
  route?: Route;
  error?: RoutingError;
  latency: number; // milliseconds
}

interface RoutingRule {
  id: string;
  priority: number;
  condition: RoutingCondition;
  action: RoutingAction;
}

interface RoutingCondition {
  messageType?: string;
  sourcePlatform?: PlatformType;
  targetPlatform?: PlatformType;
  custom?: (message: A2AMessage) => boolean;
}

interface RoutingAction {
  strategy: RoutingStrategy;
  destination: Destination | Destination[];
  fallback?: Destination;
}

enum RoutingStrategy {
  DIRECT = 'direct',
  BROADCAST = 'broadcast',
  ROUND_ROBIN = 'round-robin',
  PRIORITY = 'priority',
  FAILOVER = 'failover',
}

interface Route {
  id: string;
  destination: Destination;
  transport: ITransport;
  metrics: RouteMetrics;
}

interface RouteMetrics {
  messagesSent: number;
  messagesReceived: number;
  failures: number;
  averageLatency: number;
}

interface RoutingError extends Error {
  code: string;
  recoverable: boolean;
  route?: Route;
}

interface RoutingMetrics {
  totalMessages: number;
  successfulRoutes: number;
  failedRoutes: number;
  averageLatency: number;
  routesByPlatform: Record<PlatformType, number>;
}
```

## 3. Agent Adapter Framework Interfaces

### 3.1 Agent Interface

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

type EventHandler = (data: unknown) => void | Promise<void>;

interface AgentMetrics {
  uptime: number; // seconds
  tasksCompleted: number;
  tasksFailed: number;
  messagesProcessed: number;
  averageTaskDuration: number; // seconds
  resourceUsage: ResourceStatus;
  errors: ErrorSummary[];
}

interface ErrorSummary {
  type: string;
  count: number;
  lastOccurrence: string; // ISO 8601
}
```

### 3.2 Capability Mapper

```typescript
interface ICapabilityMapper {
  /**
   * Map A2A capability to platform-specific capability
   */
  toPlatformCapability(
    capability: Capability,
    platform: PlatformType
  ): PlatformCapability;

  /**
   * Map platform capability to A2A standard capability
   */
  toA2ACapability(
    platformCapability: PlatformCapability,
    platform: PlatformType
  ): Capability;

  /**
   * Check if platform supports capability
   */
  isSupported(
    capability: Capability,
    platform: PlatformType
  ): boolean;

  /**
   * Find equivalent capability on different platform
   */
  findEquivalent(
    capability: Capability,
    targetPlatform: PlatformType
  ): Capability | null;

  /**
   * Calculate compatibility score between capabilities
   */
  getCompatibilityScore(
    cap1: Capability,
    cap2: Capability
  ): number;

  /**
   * Translate parameters for platform
   */
  translateParameters(
    parameters: Record<string, unknown>,
    fromPlatform: PlatformType,
    toPlatform: PlatformType,
    capabilityId: string
  ): Record<string, unknown>;

  /**
   * Translate result from platform
   */
  translateResult(
    result: unknown,
    fromPlatform: PlatformType,
    toPlatform: PlatformType,
    capabilityId: string
  ): unknown;
}

interface PlatformCapability {
  id: string;
  name: string;
  platform: PlatformType;
  config: Record<string, unknown>;
}
```

### 3.3 Lifecycle Manager

```typescript
interface ILifecycleManager {
  /**
   * Register lifecycle hook
   */
  registerHook(
    event: LifecycleEvent,
    hook: LifecycleHook
  ): void;

  /**
   * Remove lifecycle hook
   */
  removeHook(
    event: LifecycleEvent,
    hook: LifecycleHook
  ): void;

  /**
   * Execute hooks for event
   */
  executeHooks(
    event: LifecycleEvent,
    context: LifecycleContext
  ): Promise<void>;

  /**
   * Get agent lifecycle state
   */
  getLifecycleState(agentId: AgentId): LifecycleState;

  /**
   * Transition agent to new state
   */
  transition(
    agentId: AgentId,
    toState: AgentStatus
  ): Promise<void>;
}

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

type LifecycleHook = (context: LifecycleContext) => Promise<void> | void;

interface LifecycleContext {
  agentId: AgentId;
  agent: IAgent;
  event: LifecycleEvent;
  fromStatus?: AgentStatus;
  toStatus?: AgentStatus;
  error?: Error;
  metadata?: Record<string, unknown>;
}

interface LifecycleState {
  agentId: AgentId;
  status: AgentStatus;
  transitions: StateTransition[];
  lastTransition: string; // ISO 8601
}

interface StateTransition {
  from: AgentStatus;
  to: AgentStatus;
  timestamp: string; // ISO 8601
  reason?: string;
}
```

## 4. Shared Infrastructure Interfaces

### 4.1 Memory Manager

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
  subscribe(
    pattern: string,
    handler: MemoryChangeHandler
  ): Subscription;

  // Transaction support
  beginTransaction(): Transaction;
  commit(transaction: Transaction): Promise<void>;
  rollback(transaction: Transaction): Promise<void>;

  // Namespace management
  createNamespace(namespace: string, config: NamespaceConfig): Promise<void>;
  deleteNamespace(namespace: string): Promise<void>;
  listNamespaces(): Promise<string[]>;

  // Maintenance
  compact(namespace: string): Promise<void>;
  snapshot(namespace: string): Promise<Snapshot>;
  restore(snapshot: Snapshot): Promise<void>;
  getMetrics(): Promise<MemoryMetrics>;
}

type MemoryChangeHandler = (
  change: MemoryChange
) => Promise<void> | void;

interface MemoryChange {
  type: 'create' | 'update' | 'delete';
  namespace: string;
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: string;
  modifiedBy: AgentId;
}

interface Transaction {
  id: string;
  operations: MemoryOperation[];
  status: 'pending' | 'committed' | 'rolled-back';
}

interface MemoryOperation {
  type: 'create' | 'update' | 'delete';
  namespace: string;
  key: string;
  value?: unknown;
}

interface NamespaceConfig {
  persistent: boolean;
  defaultTTL?: number;
  maxSize?: number;
  syncStrategy?: 'immediate' | 'eventual' | 'manual';
}

interface Snapshot {
  id: string;
  namespace: string;
  timestamp: string;
  entries: MemoryEntry[];
  checksum: string;
}

interface MemoryMetrics {
  totalEntries: number;
  totalSize: number; // bytes
  entriesByNamespace: Record<string, number>;
  syncOperations: number;
  conflicts: number;
  averageReadLatency: number; // milliseconds
  averageWriteLatency: number; // milliseconds
}
```

### 4.2 Event Bus

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
  acknowledge(eventId: string): Promise<void>;

  // Monitoring
  getMetrics(): Promise<EventBusMetrics>;
}

type EventHandler = (event: Event) => Promise<void> | void;

interface SubscriptionOptions {
  deliveryMode?: 'push' | 'pull';
  batchSize?: number;
  maxRetries?: number;
  deadLetterTopic?: string;
}

interface TopicConfig {
  persistent: boolean;
  retention?: number; // seconds
  maxSize?: number; // bytes
  partitions?: number;
}

interface EventBusMetrics {
  totalEvents: number;
  eventsPublished: number;
  eventsDelivered: number;
  eventsFailed: number;
  averageDeliveryLatency: number; // milliseconds
  topicMetrics: Record<string, TopicMetrics>;
}

interface TopicMetrics {
  messageCount: number;
  subscribers: number;
  throughput: number; // messages/second
  size: number; // bytes
}
```

### 4.3 Service Registry

```typescript
interface IServiceRegistry {
  // Agent registration
  register(agent: AgentRegistration): Promise<void>;
  deregister(agentId: AgentId): Promise<void>;
  update(
    agentId: AgentId,
    updates: Partial<AgentRegistration>
  ): Promise<void>;

  // Discovery
  find(query: AgentQuery): Promise<AgentInfo[]>;
  findByCapability(capability: string): Promise<AgentInfo[]>;
  findByPlatform(platform: PlatformType): Promise<AgentInfo[]>;
  get(agentId: AgentId): Promise<AgentInfo | null>;

  // Health management
  heartbeat(agentId: AgentId): Promise<void>;
  getHealth(agentId: AgentId): Promise<HealthStatus>;
  setHealth(agentId: AgentId, health: HealthStatus): Promise<void>;

  // Watching
  watch(
    query: AgentQuery,
    handler: RegistryChangeHandler
  ): Subscription;

  // Metrics
  getMetrics(): Promise<RegistryMetrics>;
}

interface AgentRegistration {
  id: AgentId;
  name: string;
  platform: PlatformType;
  version: string;
  capabilities: Capability[];
  endpoints: AgentEndpoints;
  resources: ResourceStatus;
  metadata?: Record<string, unknown>;
}

interface AgentQuery {
  capabilities?: string[] | CapabilityQuery;
  platform?: PlatformType | PlatformType[];
  status?: AgentStatus | AgentStatus[];
  resources?: ResourceQuery;
  location?: LocationQuery;
  metadata?: Record<string, unknown>;
}

interface CapabilityQuery {
  all?: string[]; // Must have all
  any?: string[]; // Must have at least one
  none?: string[]; // Must not have any
}

interface ResourceQuery {
  cpu?: { min?: number; max?: number };
  memory?: { min?: number; max?: number };
  tokens?: { min?: number; max?: number };
}

interface LocationQuery {
  region?: string;
  latency?: { max?: number };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastHeartbeat: string; // ISO 8601
  checks: HealthCheck[];
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  timestamp: string; // ISO 8601
}

type RegistryChangeHandler = (
  change: RegistryChange
) => Promise<void> | void;

interface RegistryChange {
  type: 'registered' | 'deregistered' | 'updated';
  agent: AgentInfo;
  timestamp: string;
}

interface RegistryMetrics {
  totalAgents: number;
  agentsByPlatform: Record<PlatformType, number>;
  agentsByStatus: Record<AgentStatus, number>;
  averageHeartbeatLatency: number; // milliseconds
  healthCheckFailures: number;
}
```

### 4.4 Resource Coordinator

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
  getTotalResources(): Promise<ResourceStatus>;

  // Quota management
  setQuota(agentId: AgentId, quota: ResourceQuota): Promise<void>;
  getQuota(agentId: AgentId): Promise<ResourceQuota>;
  updateQuota(
    agentId: AgentId,
    updates: Partial<ResourceQuota>
  ): Promise<void>;

  // Monitoring
  subscribe(handler: ResourceEventHandler): Subscription;
  getMetrics(): Promise<ResourceMetrics>;
}

type ResourceType = 'cpu' | 'memory' | 'tokens' | 'storage';

type ResourceEventHandler = (
  event: ResourceEvent
) => Promise<void> | void;

interface ResourceEvent {
  type: 'allocated' | 'released' | 'exceeded' | 'available';
  agentId?: AgentId;
  resourceType: ResourceType;
  amount: number;
  timestamp: string;
}

interface ResourceMetrics {
  totalAllocations: number;
  activeAllocations: number;
  utilizationByType: Record<ResourceType, number>; // percentage
  allocationsByAgent: Record<AgentId, ResourceAllocation[]>;
  quotaExceeded: number;
  averageAllocationDuration: number; // seconds
}
```

## 5. Error Definitions

```typescript
// Base error class
class A2AError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: unknown,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'A2AError';
  }
}

// Protocol errors
class ProtocolVersionMismatchError extends A2AError {
  constructor(ourVersion: string, theirVersion: string) {
    super(
      'A2A_ERR_PROTOCOL_VERSION',
      `Protocol version mismatch: ${ourVersion} vs ${theirVersion}`,
      { ourVersion, theirVersion },
      true
    );
  }
}

class MessageValidationError extends A2AError {
  constructor(errors: ValidationError[]) {
    super(
      'A2A_ERR_MESSAGE_VALIDATION',
      'Message validation failed',
      { errors },
      false
    );
  }
}

// Agent errors
class AgentNotFoundError extends A2AError {
  constructor(agentId: AgentId) {
    super(
      'A2A_ERR_AGENT_NOT_FOUND',
      `Agent not found: ${agentId}`,
      { agentId },
      true
    );
  }
}

class CapabilityNotSupportedError extends A2AError {
  constructor(capability: string, platform: PlatformType) {
    super(
      'A2A_ERR_CAPABILITY_NOT_SUPPORTED',
      `Capability ${capability} not supported on ${platform}`,
      { capability, platform },
      false
    );
  }
}

// Resource errors
class InsufficientResourcesError extends A2AError {
  constructor(required: ResourceRequirements, available: ResourceStatus) {
    super(
      'A2A_ERR_INSUFFICIENT_RESOURCES',
      'Insufficient resources for allocation',
      { required, available },
      true
    );
  }
}

class QuotaExceededError extends A2AError {
  constructor(agentId: AgentId, quota: ResourceQuota) {
    super(
      'A2A_ERR_QUOTA_EXCEEDED',
      `Resource quota exceeded for agent ${agentId}`,
      { agentId, quota },
      false
    );
  }
}

// Memory errors
class MemoryConflictError extends A2AError {
  constructor(namespace: string, key: string) {
    super(
      'A2A_ERR_MEMORY_CONFLICT',
      `Memory conflict at ${namespace}/${key}`,
      { namespace, key },
      true
    );
  }
}

// Task errors
class TaskTimeoutError extends A2AError {
  constructor(taskId: TaskId, timeout: number) {
    super(
      'A2A_ERR_TASK_TIMEOUT',
      `Task ${taskId} timed out after ${timeout}s`,
      { taskId, timeout },
      true
    );
  }
}

// Transport errors
class TransportError extends A2AError {
  constructor(message: string, details?: unknown) {
    super(
      'A2A_ERR_TRANSPORT',
      message,
      details,
      true
    );
  }
}

// Authentication errors
class AuthenticationError extends A2AError {
  constructor(reason: string) {
    super(
      'A2A_ERR_AUTHENTICATION',
      `Authentication failed: ${reason}`,
      { reason },
      false
    );
  }
}

class AuthorizationError extends A2AError {
  constructor(
    agentId: AgentId,
    resource: ResourceIdentifier,
    action: Action
  ) {
    super(
      'A2A_ERR_AUTHORIZATION',
      `Agent ${agentId} not authorized for ${action} on ${resource.type}:${resource.id}`,
      { agentId, resource, action },
      false
    );
  }
}
```

## 6. CLI-Specific Types

### 6.1 Process Management Types

```typescript
// CLI Process Configuration
interface CLIProcessConfig {
  command: string;                    // CLI executable path
  args: string[];                     // Command arguments
  cwd: string;                        // Working directory
  env: Record<string, string>;        // Environment variables
  timeout: number;                    // Execution timeout (ms)
  maxMemory: number;                  // Memory limit (MB)
  shell: boolean;                     // Use shell execution
}

// CLI Communication Protocol
interface CLIProtocol {
  type: 'stdio' | 'http' | 'mcp';
  format: 'json' | 'ndjson' | 'text';
  streaming: boolean;
}

// Context Serialization
interface SerializedContext {
  strategy: 'stdin' | 'tempfile' | 'workingdir' | 'env' | 'args';
  format: 'json' | 'yaml' | 'text';
  data: string | Buffer;
  cleanup?: () => Promise<void>;
}

// CLI Session
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
  memory: Map<string, unknown>;
  workingDir: string;
  artifacts: string[];
  metrics: SessionMetrics;
}

interface SessionMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// Managed Process
interface ManagedProcess {
  id: string;
  pid: number;
  config: CLIProcessConfig;
  status: 'starting' | 'running' | 'idle' | 'terminating';
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
  kill: () => Promise<void>;
  metrics: ProcessMetrics;
}

interface ProcessMetrics {
  startTime: Date;
  lastActivity: Date;
  requestCount: number;
  errorCount: number;
  memoryUsage: number;
  cpuUsage: number;
}
```

### 6.2 CLI Adapter Interfaces

```typescript
// Process Manager Interface
interface ICLIProcessManager {
  /**
   * Initialize the process manager
   */
  initialize(): Promise<void>;

  /**
   * Acquire a process from the pool or spawn new
   */
  acquire(config: CLIProcessConfig): Promise<ManagedProcess>;

  /**
   * Release a process back to the pool
   */
  release(process: ManagedProcess): Promise<void>;

  /**
   * Get list of all managed processes
   */
  list(): ManagedProcess[];

  /**
   * Clean up idle processes
   */
  cleanup(): Promise<void>;

  /**
   * Shutdown all processes
   */
  shutdown(): Promise<void>;

  /**
   * Get process manager metrics
   */
  getMetrics(): ProcessManagerMetrics;
}

interface ProcessManagerMetrics {
  totalProcesses: number;
  activeProcesses: number;
  idleProcesses: number;
  totalSpawned: number;
  totalKilled: number;
  avgSpawnTime: number;
  avgIdleTime: number;
}

// Context Builder Interface
interface IContextBuilder {
  /**
   * Build context for CLI invocation
   */
  build(context: unknown): Promise<BuiltContext>;

  /**
   * Serialize context data
   */
  serialize(context: unknown): string | Buffer;

  /**
   * Choose best strategy for given context size
   */
  selectStrategy(contextSize: number): ContextStrategy;
}

interface BuiltContext {
  type: 'stdin' | 'tempfile' | 'workingdir' | 'env' | 'args';
  data?: string;
  path?: string;
  env?: Record<string, string>;
  args?: string[];
  cleanup: () => Promise<void>;
}

interface ContextStrategy {
  primary: 'stdin' | 'tempfile' | 'workingdir' | 'env' | 'args';
  fallback?: 'stdin' | 'tempfile' | 'workingdir';
  format: 'json' | 'yaml' | 'text';
  streaming: boolean;
  compression: boolean;
}

// CLI Adapter Base
interface ICLIAdapter extends IAgent {
  /**
   * CLI-specific properties
   */
  readonly cliCommand: string;
  readonly cliVersion: string;
  readonly processManager: ICLIProcessManager;
  readonly contextBuilder: IContextBuilder;

  /**
   * Validate CLI is available
   */
  validateCLI(): Promise<boolean>;

  /**
   * Get CLI capabilities via command
   */
  queryCLICapabilities(): Promise<Capability[]>;

  /**
   * Parse CLI output to standard format
   */
  parseOutput(output: string): TaskResult;

  /**
   * Handle CLI errors
   */
  handleCLIError(error: CLIError): Promise<void>;
}
```

### 6.3 CLI Error Types

```typescript
// Base CLI error
class CLIError extends A2AError {
  constructor(
    public code: CLIErrorCode,
    public message: string,
    public processId?: number,
    public command?: string,
    public details?: unknown
  ) {
    super(code, message, details, true);
    this.name = 'CLIError';
  }
}

// CLI error codes
enum CLIErrorCode {
  PROCESS_SPAWN_FAILED = 'CLI_ERR_SPAWN',
  PROCESS_TIMEOUT = 'CLI_ERR_TIMEOUT',
  PROCESS_CRASHED = 'CLI_ERR_CRASH',
  PROCESS_KILLED = 'CLI_ERR_KILLED',
  INVALID_OUTPUT = 'CLI_ERR_OUTPUT',
  RESOURCE_EXCEEDED = 'CLI_ERR_RESOURCE',
  CONTEXT_TOO_LARGE = 'CLI_ERR_CONTEXT_SIZE',
  CLI_NOT_FOUND = 'CLI_ERR_NOT_FOUND',
  CLI_VERSION_MISMATCH = 'CLI_ERR_VERSION',
}

// Specific error classes
class ProcessSpawnError extends CLIError {
  constructor(command: string, reason: string) {
    super(
      CLIErrorCode.PROCESS_SPAWN_FAILED,
      `Failed to spawn process: ${command}`,
      undefined,
      command,
      { reason }
    );
  }
}

class ProcessTimeoutError extends CLIError {
  constructor(processId: number, timeout: number, elapsed: number) {
    super(
      CLIErrorCode.PROCESS_TIMEOUT,
      `Process ${processId} exceeded ${timeout}ms timeout`,
      processId,
      undefined,
      { timeout, elapsed }
    );
  }
}

class ProcessCrashedError extends CLIError {
  constructor(processId: number, exitCode: number, signal?: string) {
    super(
      CLIErrorCode.PROCESS_CRASHED,
      `Process ${processId} crashed with code ${exitCode}`,
      processId,
      undefined,
      { exitCode, signal }
    );
  }
}

class InvalidOutputError extends CLIError {
  constructor(output: string, parseError: Error) {
    super(
      CLIErrorCode.INVALID_OUTPUT,
      'Failed to parse CLI output',
      undefined,
      undefined,
      { output, parseError: parseError.message }
    );
  }
}
```

### 6.4 CLI Message Extensions

```typescript
// CLI metadata in message source
interface MessageSourceCLI extends MessageSource {
  cliMetadata?: {
    executable: string;
    version: string;
    processId: number;
    sessionId: string;
    spawnedAt: string;
  };
}

// Context strategy in message
interface MessageContext {
  contextStrategy?: {
    primary: string;
    fallback?: string;
    format: string;
    streaming: boolean;
    compression: boolean;
  };
  contextData?: {
    inline?: unknown;
    reference?: string;
  };
}
```

## 7. Constants and Enumerations

```typescript
// Protocol constants
export const A2A_PROTOCOL_VERSION = '1.0.0';
export const A2A_SCHEMA_BASE_URL = 'https://a2a-protocol.org/schemas/v1';
export const DEFAULT_MESSAGE_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const DEFAULT_MEMORY_TTL = 3600; // 1 hour

// CLI-specific constants
export const DEFAULT_PROCESS_SPAWN_TIMEOUT = 10000; // 10 seconds
export const DEFAULT_PROCESS_IDLE_TIMEOUT = 300000; // 5 minutes
export const DEFAULT_PROCESS_KILL_TIMEOUT = 5000; // 5 seconds
export const DEFAULT_MAX_PROCESSES = 50;
export const DEFAULT_CONTEXT_SIZE_LIMIT = 1048576; // 1MB
export const CONTEXT_STRATEGY_STDIN_LIMIT = 1048576; // 1MB
export const CONTEXT_STRATEGY_ENV_LIMIT = 4096; // 4KB

// Message types
export const MESSAGE_TYPES = {
  AGENT_ADVERTISEMENT: 'agent.advertisement',
  TASK_REQUEST: 'task.request',
  TASK_RESPONSE: 'task.response',
  MEMORY_SYNC: 'memory.sync',
  EVENT_NOTIFICATION: 'event.notification',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
  CAPABILITY_QUERY: 'capability.query',
  CAPABILITY_RESPONSE: 'capability.response',
} as const;

// Platform types
export const PLATFORMS = {
  CLAUDE_FLOW: 'claude-flow',
  CODEX: 'codex',
  GEMINI_CLI: 'gemini-cli',
  OPENCODE: 'opencode',
} as const;

// Capability types
export const CAPABILITY_TYPES = {
  CORE: 'core',
  SPECIALIZED: 'specialized',
  PLATFORM: 'platform',
  INTEGRATION: 'integration',
} as const;

// Standard core capabilities
export const CORE_CAPABILITIES = {
  RESEARCH: 'research',
  CODING: 'coding',
  TESTING: 'testing',
  REVIEW: 'review',
  ANALYSIS: 'analysis',
  DOCUMENTATION: 'documentation',
} as const;
```

This comprehensive interface contract specification provides all the type definitions, interfaces, and API specifications needed to implement the A2A protocol integration into claude-flow.
