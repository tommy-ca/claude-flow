/**
 * A2A Service Discovery Types
 * Version: 1.0.0
 *
 * Agent registry, capability discovery, and load balancing
 */

import { AgentAddress, AgentCapability, AgentMetadata, AgentState, HealthMetrics } from './core-messages.js';

// ============================================================================
// Service Registry
// ============================================================================

/**
 * Service registry operations
 */
export enum RegistryOperation {
  REGISTER = 'registry.register',
  DEREGISTER = 'registry.deregister',
  UPDATE = 'registry.update',
  QUERY = 'registry.query',
  WATCH = 'registry.watch',
  UNWATCH = 'registry.unwatch'
}

/**
 * Agent registry entry
 */
export interface AgentRegistryEntry {
  // Identity
  address: AgentAddress;
  metadata: AgentMetadata;

  // Capabilities
  capabilities: AgentCapability[];

  // State
  state: AgentState;
  health: HealthStatus;

  // Registration info
  registeredAt: number;
  lastHeartbeat: number;
  lastUpdated: number;

  // Availability
  availableSlots: number;
  currentLoad: number;           // 0.0 to 1.0

  // Performance metrics
  metrics?: PerformanceMetrics;

  // Load balancing metadata
  weight?: number;               // Routing weight
  priority?: number;             // Selection priority

  // Extension point
  attributes?: Record<string, unknown>;
}

/**
 * Health status
 */
export interface HealthStatus {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

  lastCheckAt: number;

  checks?: HealthCheck[];

  message?: string;
}

/**
 * Health check detail
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';

  observedValue?: unknown;
  threshold?: unknown;

  message?: string;

  checkedAt: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  // Latency (milliseconds)
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;

  // Throughput
  requestsPerSecond: number;
  tasksCompleted: number;

  // Reliability
  successRate: number;           // 0.0 to 1.0
  errorRate: number;             // 0.0 to 1.0

  // Resource utilization
  cpuUtilization?: number;       // 0.0 to 1.0
  memoryUtilization?: number;    // 0.0 to 1.0

  // Time window
  windowStartAt: number;
  windowEndAt: number;

  // Custom metrics
  custom?: Record<string, number>;
}

// ============================================================================
// Registry Queries
// ============================================================================

/**
 * Registry query request
 */
export interface RegistryQueryRequest {
  // Filter criteria
  filters?: RegistryFilter[];

  // Capability requirements
  requiredCapabilities?: string[];

  // State filters
  states?: AgentState[];
  healthStatuses?: ('healthy' | 'degraded' | 'unhealthy')[];

  // Load filters
  minAvailableSlots?: number;
  maxLoad?: number;              // 0.0 to 1.0

  // Performance requirements
  maxLatencyMs?: number;
  minSuccessRate?: number;       // 0.0 to 1.0

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';

  metadata?: Record<string, unknown>;
}

/**
 * Registry filter
 */
export interface RegistryFilter {
  field: string;                 // Supports dot notation
  operator: FilterOperator;
  value: unknown;
}

/**
 * Filter operators
 */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  MATCHES = 'matches',           // Regex
  EXISTS = 'exists'
}

/**
 * Sort fields
 */
export enum SortField {
  REGISTERED_AT = 'registeredAt',
  LAST_HEARTBEAT = 'lastHeartbeat',
  CURRENT_LOAD = 'currentLoad',
  AVAILABLE_SLOTS = 'availableSlots',
  AVG_LATENCY = 'metrics.avgLatency',
  SUCCESS_RATE = 'metrics.successRate',
  PRIORITY = 'priority',
  WEIGHT = 'weight'
}

/**
 * Registry query response
 */
export interface RegistryQueryResponse {
  entries: AgentRegistryEntry[];

  // Pagination
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;

  // Query metadata
  executedAt: number;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Registry Watch
// ============================================================================

/**
 * Registry watch request
 */
export interface RegistryWatchRequest {
  watchId?: string;              // Optional client-provided ID

  // Watch filters (same as query)
  filters?: RegistryFilter[];

  // Event types to watch
  eventTypes: RegistryEventType[];

  metadata?: Record<string, unknown>;
}

/**
 * Registry event types
 */
export enum RegistryEventType {
  AGENT_REGISTERED = 'agent_registered',
  AGENT_DEREGISTERED = 'agent_deregistered',
  AGENT_UPDATED = 'agent_updated',
  AGENT_HEALTH_CHANGED = 'agent_health_changed',
  AGENT_STATE_CHANGED = 'agent_state_changed'
}

/**
 * Registry watch response
 */
export interface RegistryWatchResponse {
  watchId: string;

  active: boolean;

  metadata?: Record<string, unknown>;
}

/**
 * Registry event notification
 */
export interface RegistryEventNotification {
  watchId: string;

  eventType: RegistryEventType;

  entry: AgentRegistryEntry;

  // For update events
  previousEntry?: Partial<AgentRegistryEntry>;

  timestamp: number;

  metadata?: Record<string, unknown>;
}

/**
 * Registry unwatch request
 */
export interface RegistryUnwatchRequest {
  watchId: string;
}

// ============================================================================
// Load Balancing
// ============================================================================

/**
 * Load balancing strategies
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  WEIGHTED = 'weighted',
  RANDOM = 'random',
  CONSISTENT_HASH = 'consistent_hash',
  LATENCY_BASED = 'latency_based',
  CAPABILITY_MATCH = 'capability_match',
  CUSTOM = 'custom'
}

/**
 * Agent selection request
 */
export interface AgentSelectionRequest {
  // Selection criteria
  requiredCapabilities: string[];

  // Task characteristics
  estimatedDurationMs?: number;
  priority?: number;

  // Load balancing
  strategy: LoadBalancingStrategy;

  // Constraints
  excludeAgents?: string[];      // Agent IDs to exclude
  preferredAgents?: string[];    // Preferred agent IDs

  // Affinity
  affinityKey?: string;          // For consistent hashing
  sessionId?: string;            // Session affinity

  // Requirements
  minAvailableSlots?: number;
  maxLoad?: number;
  maxLatencyMs?: number;
  minSuccessRate?: number;

  // Number of agents to select
  count?: number;                // Default: 1

  metadata?: Record<string, unknown>;
}

/**
 * Agent selection response
 */
export interface AgentSelectionResponse {
  selected: SelectedAgent[];

  // Alternatives if primary fails
  alternatives?: SelectedAgent[];

  // Selection metadata
  strategy: LoadBalancingStrategy;
  selectedAt: number;

  metadata?: Record<string, unknown>;
}

/**
 * Selected agent
 */
export interface SelectedAgent {
  entry: AgentRegistryEntry;

  // Selection rationale
  score?: number;                // Selection score
  reason?: string;

  // Reservation (optional)
  reservationId?: string;
  reservedUntil?: number;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Capability Discovery
// ============================================================================

/**
 * Capability search request
 */
export interface CapabilitySearchRequest {
  // Search criteria
  query?: string;                // Free-text search
  capabilities?: string[];       // Exact capability names
  tags?: string[];              // Capability tags

  // Filters
  filters?: CapabilitySearchFilter[];

  // Performance requirements
  maxLatencyMs?: number;
  minSuccessRate?: number;

  // Pagination
  limit?: number;
  offset?: number;

  metadata?: Record<string, unknown>;
}

/**
 * Capability search filter
 */
export interface CapabilitySearchFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Capability search response
 */
export interface CapabilitySearchResponse {
  results: CapabilitySearchResult[];

  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;

  metadata?: Record<string, unknown>;
}

/**
 * Capability search result
 */
export interface CapabilitySearchResult {
  capability: AgentCapability;

  // Providers
  providers: CapabilityProvider[];

  // Aggregate statistics
  totalProviders: number;
  avgLatency?: number;
  avgSuccessRate?: number;

  // Relevance (for text search)
  score?: number;

  metadata?: Record<string, unknown>;
}

/**
 * Capability provider
 */
export interface CapabilityProvider {
  agentId: string;
  address: AgentAddress;

  state: AgentState;
  health: HealthStatus;

  currentLoad: number;
  availableSlots: number;

  // Performance for this capability
  avgLatency?: number;
  successRate?: number;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Service Mesh / Topology
// ============================================================================

/**
 * Service topology
 */
export interface ServiceTopology {
  // Nodes
  agents: TopologyNode[];

  // Connections
  connections: TopologyConnection[];

  // Metadata
  topologyType: 'mesh' | 'hierarchical' | 'ring' | 'star' | 'hybrid';

  generatedAt: number;

  metadata?: Record<string, unknown>;
}

/**
 * Topology node
 */
export interface TopologyNode {
  agentId: string;
  address: AgentAddress;

  role?: string;                 // e.g., 'coordinator', 'worker'

  state: AgentState;
  health: HealthStatus;

  // Position/level in hierarchy
  level?: number;
  parent?: string;               // Parent agent ID

  metadata?: Record<string, unknown>;
}

/**
 * Topology connection
 */
export interface TopologyConnection {
  from: string;                  // Agent ID
  to: string;                    // Agent ID

  type: 'peer' | 'parent-child' | 'coordinator-worker';

  // Connection health
  latencyMs?: number;
  bandwidth?: number;            // Messages per second
  reliability?: number;          // 0.0 to 1.0

  lastActive: number;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Routing
// ============================================================================

/**
 * Route configuration
 */
export interface RouteConfig {
  routeId: string;

  // Match criteria
  match: RouteMatch;

  // Destination
  destination: RouteDestination;

  // Options
  priority?: number;
  weight?: number;

  // Timeout and retry
  timeoutMs?: number;
  retries?: number;

  metadata?: Record<string, unknown>;
}

/**
 * Route matching rules
 */
export interface RouteMatch {
  // Message matching
  messageTypes?: string[];       // Message type patterns

  // Capability matching
  capabilities?: string[];

  // Custom matchers
  headers?: Record<string, string>;

  // Predicate
  predicate?: string;            // Expression for matching
}

/**
 * Route destination
 */
export interface RouteDestination {
  type: 'agent' | 'capability' | 'load_balanced' | 'broadcast';

  // Direct agent
  agentId?: string;

  // Capability-based
  capability?: string;

  // Load balanced
  strategy?: LoadBalancingStrategy;

  // Broadcast
  agentIds?: string[];

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Circuit Breaker
// ============================================================================

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'closed',             // Normal operation
  OPEN = 'open',                 // Blocking requests
  HALF_OPEN = 'half_open'        // Testing recovery
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  agentId: string;

  state: CircuitState;

  // Statistics
  consecutiveFailures: number;
  failureRate: number;           // 0.0 to 1.0

  // State transitions
  lastStateChange: number;
  nextRetryAt?: number;

  // Configuration
  failureThreshold: number;
  recoveryTimeout: number;

  metadata?: Record<string, unknown>;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures to trigger open
  recoveryTimeoutMs: number;     // Time before half-open
  successThreshold: number;      // Successes to close from half-open

  windowSizeMs: number;          // Rolling window for failure rate

  metadata?: Record<string, unknown>;
}
