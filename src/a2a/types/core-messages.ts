/**
 * A2A Protocol Core Message Types
 * Version: 1.0.0
 *
 * Core TypeScript interfaces for Agent-to-Agent communication in Claude Flow
 */

// ============================================================================
// Base Types and Enums
// ============================================================================

/**
 * Protocol version using semantic versioning
 */
export type ProtocolVersion = `${number}.${number}.${number}`;

/**
 * Message types for A2A communication
 */
export enum MessageType {
  // Registration
  REGISTER = 'a2a.register',
  DEREGISTER = 'a2a.deregister',
  REGISTER_ACK = 'a2a.register.ack',

  // Capability
  CAPABILITY_ADVERTISE = 'a2a.capability.advertise',
  CAPABILITY_QUERY = 'a2a.capability.query',
  CAPABILITY_RESPONSE = 'a2a.capability.response',

  // Task Management
  TASK_REQUEST = 'a2a.task.request',
  TASK_RESPONSE = 'a2a.task.response',
  TASK_STATUS = 'a2a.task.status',
  TASK_CANCEL = 'a2a.task.cancel',

  // State Synchronization
  STATE_SYNC = 'a2a.state.sync',
  STATE_QUERY = 'a2a.state.query',
  STATE_UPDATE = 'a2a.state.update',

  // Events
  EVENT_NOTIFY = 'a2a.event.notify',
  EVENT_SUBSCRIBE = 'a2a.event.subscribe',
  EVENT_UNSUBSCRIBE = 'a2a.event.unsubscribe',

  // Heartbeat & Health
  HEARTBEAT = 'a2a.heartbeat',
  HEALTH_CHECK = 'a2a.health.check',
  HEALTH_RESPONSE = 'a2a.health.response',

  // Error
  ERROR = 'a2a.error',

  // Custom Extension Point
  CUSTOM = 'a2a.custom'
}

/**
 * Message priority levels for QoS
 */
export enum MessagePriority {
  CRITICAL = 0,   // System-critical messages (health, errors)
  HIGH = 1,       // Important task requests
  MEDIUM = 2,     // Standard operations
  LOW = 3,        // Background sync, notifications
  BULK = 4        // Batch operations, bulk data
}

/**
 * Agent states
 */
export enum AgentState {
  INITIALIZING = 'initializing',
  IDLE = 'idle',
  BUSY = 'busy',
  WAITING = 'waiting',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
  OFFLINE = 'offline'
}

/**
 * Task states
 */
export enum TaskState {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ============================================================================
// Transport Layer - Message Envelope
// ============================================================================

/**
 * Message envelope for all A2A communications
 * Provides routing, tracing, and QoS information
 */
export interface MessageEnvelope<T = unknown> {
  // Protocol metadata
  version: ProtocolVersion;
  type: MessageType | string;

  // Routing
  messageId: string;              // Unique message ID (UUID v4)
  correlationId?: string;         // For request/response correlation
  replyTo?: string;              // Return address for responses

  // Addressing
  from: AgentAddress;
  to: AgentAddress | AgentAddress[]; // Single or multicast

  // QoS and Priority
  priority: MessagePriority;
  ttl?: number;                   // Time-to-live in milliseconds
  expiresAt?: number;            // Unix timestamp

  // Tracing and Debugging
  timestamp: number;              // Unix timestamp in ms
  spanId?: string;               // Distributed tracing span ID
  traceId?: string;              // Distributed tracing trace ID
  parentSpanId?: string;         // Parent span for nested calls

  // Content
  payload: T;

  // Extension point for custom headers
  headers?: Record<string, unknown>;

  // Security
  signature?: string;            // Message signature for verification
  encryptedPayload?: boolean;    // Indicates if payload is encrypted
}

/**
 * Agent addressing scheme
 */
export interface AgentAddress {
  agentId: string;               // Unique agent identifier
  swarmId?: string;              // Swarm/group identifier
  nodeId?: string;               // Physical node/instance ID
  namespace?: string;            // Logical namespace/tenant
}

// ============================================================================
// Registration Messages
// ============================================================================

/**
 * Agent registration request
 */
export interface RegisterMessage {
  agent: AgentMetadata;
  capabilities: AgentCapability[];
  endpoints?: AgentEndpoint[];
}

/**
 * Agent metadata
 */
export interface AgentMetadata {
  agentId: string;
  agentType: string;             // e.g., 'coder', 'reviewer', 'researcher'
  name: string;
  version: string;
  description?: string;
  tags?: string[];

  // Resource limits
  maxConcurrentTasks?: number;
  maxMemoryMb?: number;

  // Extended metadata
  metadata?: Record<string, unknown>;
}

/**
 * Agent capability definition
 */
export interface AgentCapability {
  name: string;
  version: string;
  description?: string;

  // Capability constraints
  inputSchema?: object;          // JSON Schema for inputs
  outputSchema?: object;         // JSON Schema for outputs

  // Performance characteristics
  averageLatencyMs?: number;
  maxLatencyMs?: number;
  successRate?: number;          // 0.0 to 1.0

  // Dependencies
  requires?: string[];           // Required capabilities

  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent network endpoints
 */
export interface AgentEndpoint {
  protocol: 'http' | 'https' | 'ws' | 'wss' | 'grpc' | 'ipc';
  address: string;
  port?: number;
  path?: string;
}

/**
 * Registration acknowledgment
 */
export interface RegisterAckMessage {
  agentId: string;
  success: boolean;
  assignedAddress?: AgentAddress;
  registryEndpoint?: string;
  error?: ErrorDetail;
}

/**
 * Deregistration request
 */
export interface DeregisterMessage {
  agentId: string;
  reason?: string;
  gracefulShutdown?: boolean;
}

// ============================================================================
// Capability Messages
// ============================================================================

/**
 * Capability advertisement (broadcast)
 */
export interface CapabilityAdvertiseMessage {
  agentId: string;
  capabilities: AgentCapability[];
  state: AgentState;
  availableSlots?: number;       // Available task slots
}

/**
 * Capability query request
 */
export interface CapabilityQueryMessage {
  requiredCapabilities?: string[];
  tags?: string[];
  minSuccessRate?: number;
  maxLatencyMs?: number;
  filters?: CapabilityFilter[];
}

/**
 * Capability filter
 */
export interface CapabilityFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

/**
 * Capability query response
 */
export interface CapabilityResponseMessage {
  agents: AgentCapabilityInfo[];
  totalCount: number;
}

/**
 * Agent capability information
 */
export interface AgentCapabilityInfo {
  agent: AgentMetadata;
  capabilities: AgentCapability[];
  state: AgentState;
  currentLoad: number;           // 0.0 to 1.0
  availableSlots: number;
  lastHeartbeat: number;         // Unix timestamp
}

// ============================================================================
// Task Messages
// ============================================================================

/**
 * Task request
 */
export interface TaskRequestMessage {
  taskId: string;
  taskType: string;
  description: string;

  // Task requirements
  requiredCapabilities: string[];
  priority: MessagePriority;

  // Task data
  input: unknown;
  context?: TaskContext;

  // Constraints
  timeoutMs?: number;
  maxRetries?: number;

  // Callbacks
  progressCallback?: boolean;    // Request progress updates

  metadata?: Record<string, unknown>;
}

/**
 * Task context
 */
export interface TaskContext {
  sessionId?: string;
  userId?: string;
  parentTaskId?: string;
  workflowId?: string;

  // Shared resources
  memoryNamespace?: string;
  sharedState?: Record<string, unknown>;

  // Environment
  environment?: 'development' | 'staging' | 'production';

  metadata?: Record<string, unknown>;
}

/**
 * Task response
 */
export interface TaskResponseMessage {
  taskId: string;
  status: TaskState;

  // Results
  output?: unknown;
  error?: ErrorDetail;

  // Execution info
  executedBy: string;            // Agent ID
  startedAt: number;
  completedAt?: number;
  durationMs?: number;

  // Resources used
  resourceUsage?: ResourceUsage;

  metadata?: Record<string, unknown>;
}

/**
 * Task status update
 */
export interface TaskStatusMessage {
  taskId: string;
  status: TaskState;
  progress?: number;             // 0.0 to 1.0
  message?: string;
  estimatedCompletionMs?: number;

  partialResults?: unknown;

  metadata?: Record<string, unknown>;
}

/**
 * Task cancellation
 */
export interface TaskCancelMessage {
  taskId: string;
  reason?: string;
  force?: boolean;               // Force immediate cancellation
}

/**
 * Resource usage information
 */
export interface ResourceUsage {
  cpuMs?: number;
  memoryBytes?: number;
  diskIoBytes?: number;
  networkIoBytes?: number;

  // API usage
  apiCalls?: number;
  tokensUsed?: number;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// State Synchronization Messages
// ============================================================================

/**
 * State synchronization message
 */
export interface StateSyncMessage {
  agentId: string;
  namespace: string;

  syncType: 'full' | 'incremental' | 'delta';
  sequenceNumber: number;        // Monotonically increasing

  state: StateData;

  // Conflict resolution
  vectorClock?: VectorClock;
  lamportTimestamp?: number;
}

/**
 * State data
 */
export interface StateData {
  entries: StateEntry[];
  checksum?: string;             // For integrity verification
}

/**
 * Individual state entry
 */
export interface StateEntry {
  key: string;
  value: unknown;
  version: number;
  timestamp: number;

  // Metadata
  ttl?: number;                  // Time-to-live in ms
  tags?: string[];

  metadata?: Record<string, unknown>;
}

/**
 * Vector clock for distributed state
 */
export type VectorClock = Record<string, number>;

/**
 * State query request
 */
export interface StateQueryMessage {
  namespace: string;
  keys?: string[];               // Specific keys or all
  since?: number;                // Timestamp for incremental sync
  filters?: StateFilter[];
}

/**
 * State filter
 */
export interface StateFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: unknown;
}

/**
 * State update notification
 */
export interface StateUpdateMessage {
  namespace: string;
  updates: StateEntry[];
  deletes?: string[];            // Keys to delete

  // Causality tracking
  vectorClock?: VectorClock;
  precedingVersion?: number;
}

// ============================================================================
// Event Messages
// ============================================================================

/**
 * Event notification
 */
export interface EventNotifyMessage {
  eventType: string;
  eventId: string;

  source: AgentAddress;

  timestamp: number;

  data: unknown;

  // Event metadata
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  category?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Event subscription request
 */
export interface EventSubscribeMessage {
  subscriptionId?: string;       // Optional client-provided ID

  eventTypes: string[];          // Event type patterns (supports wildcards)

  filters?: EventFilter[];

  // Delivery options
  batchSize?: number;            // Batch events together
  batchTimeoutMs?: number;       // Max time to wait for batch

  metadata?: Record<string, unknown>;
}

/**
 * Event filter
 */
export interface EventFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
  value: unknown;
}

/**
 * Event unsubscribe request
 */
export interface EventUnsubscribeMessage {
  subscriptionId: string;
}

// ============================================================================
// Health and Heartbeat Messages
// ============================================================================

/**
 * Heartbeat message
 */
export interface HeartbeatMessage {
  agentId: string;
  state: AgentState;

  // Load information
  currentLoad: number;           // 0.0 to 1.0
  activeTasks: number;
  queuedTasks: number;
  availableSlots: number;

  // Health metrics
  uptime: number;                // Seconds
  lastTaskCompletedAt?: number;  // Unix timestamp

  metrics?: HealthMetrics;
}

/**
 * Health metrics
 */
export interface HealthMetrics {
  cpuUsage?: number;             // 0.0 to 1.0
  memoryUsage?: number;          // 0.0 to 1.0

  // Performance
  avgResponseTimeMs?: number;
  p95ResponseTimeMs?: number;
  p99ResponseTimeMs?: number;

  // Reliability
  successRate?: number;          // 0.0 to 1.0
  errorRate?: number;            // 0.0 to 1.0

  // Custom metrics
  custom?: Record<string, number>;
}

/**
 * Health check request
 */
export interface HealthCheckMessage {
  checkType?: 'liveness' | 'readiness' | 'full';
  includeMetrics?: boolean;
}

/**
 * Health check response
 */
export interface HealthResponseMessage {
  agentId: string;
  healthy: boolean;
  state: AgentState;

  checks?: HealthCheck[];

  metrics?: HealthMetrics;

  message?: string;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;

  observedValue?: unknown;
  observedUnit?: string;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Error message
 */
export interface ErrorMessage {
  errorCode: string;
  errorType: ErrorType;
  message: string;

  details?: ErrorDetail;

  // Context
  originalMessageId?: string;
  failedOperation?: string;

  // Recovery
  retryable?: boolean;
  retryAfterMs?: number;

  metadata?: Record<string, unknown>;
}

/**
 * Error types
 */
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  INTERNAL = 'internal',
  UNAVAILABLE = 'unavailable',
  UNIMPLEMENTED = 'unimplemented'
}

/**
 * Error detail
 */
export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;

  stack?: string;
  cause?: ErrorDetail;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Custom Extension Messages
// ============================================================================

/**
 * Custom message for extensions
 */
export interface CustomMessage {
  customType: string;            // Namespaced custom type
  version: string;

  data: unknown;

  schema?: string;               // URI to JSON Schema

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isMessageEnvelope(obj: unknown): obj is MessageEnvelope {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'version' in obj &&
    'type' in obj &&
    'messageId' in obj &&
    'from' in obj &&
    'to' in obj &&
    'priority' in obj &&
    'timestamp' in obj &&
    'payload' in obj
  );
}

export function isErrorMessage(payload: unknown): payload is ErrorMessage {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'errorCode' in payload &&
    'errorType' in payload &&
    'message' in payload
  );
}
