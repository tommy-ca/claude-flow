/**
 * A2A Memory Protocol Types
 * Version: 1.0.0
 *
 * Shared memory and cache coherence protocol for agent coordination
 */

import { AgentAddress, MessagePriority } from './core-messages.js';

// ============================================================================
// Memory Operations
// ============================================================================

/**
 * Memory operation types
 */
export enum MemoryOperationType {
  READ = 'memory.read',
  WRITE = 'memory.write',
  UPDATE = 'memory.update',
  DELETE = 'memory.delete',

  // Batch operations
  BATCH_READ = 'memory.batch.read',
  BATCH_WRITE = 'memory.batch.write',

  // Transactions
  TRANSACTION_BEGIN = 'memory.transaction.begin',
  TRANSACTION_COMMIT = 'memory.transaction.commit',
  TRANSACTION_ROLLBACK = 'memory.transaction.rollback',

  // Locks
  LOCK_ACQUIRE = 'memory.lock.acquire',
  LOCK_RELEASE = 'memory.lock.release',

  // Cache
  CACHE_INVALIDATE = 'memory.cache.invalidate',
  CACHE_SYNC = 'memory.cache.sync'
}

/**
 * Memory consistency models
 */
export enum ConsistencyModel {
  STRONG = 'strong',              // Linearizability
  SEQUENTIAL = 'sequential',      // Sequential consistency
  CAUSAL = 'causal',             // Causal consistency
  EVENTUAL = 'eventual',          // Eventual consistency
  WEAK = 'weak'                   // Weak consistency
}

/**
 * Isolation levels for transactions
 */
export enum IsolationLevel {
  SERIALIZABLE = 'serializable',
  REPEATABLE_READ = 'repeatable_read',
  READ_COMMITTED = 'read_committed',
  READ_UNCOMMITTED = 'read_uncommitted'
}

// ============================================================================
// Memory Read/Write Messages
// ============================================================================

/**
 * Memory read request
 */
export interface MemoryReadRequest {
  namespace: string;
  key: string;

  // Consistency options
  consistencyModel?: ConsistencyModel;
  readVersion?: number;          // Read specific version

  // Caching
  allowStale?: boolean;          // Allow stale reads
  maxStalenessMs?: number;       // Max acceptable staleness

  metadata?: Record<string, unknown>;
}

/**
 * Memory read response
 */
export interface MemoryReadResponse {
  namespace: string;
  key: string;

  found: boolean;
  value?: unknown;

  // Version info
  version: number;
  timestamp: number;

  // Cache info
  cachedAt?: number;
  expiresAt?: number;

  metadata?: Record<string, unknown>;
}

/**
 * Memory write request
 */
export interface MemoryWriteRequest {
  namespace: string;
  key: string;
  value: unknown;

  // Versioning
  expectedVersion?: number;      // Optimistic locking

  // Expiration
  ttl?: number;                  // Time-to-live in ms
  expiresAt?: number;            // Absolute expiration

  // Write options
  createOnly?: boolean;          // Fail if exists
  updateOnly?: boolean;          // Fail if not exists

  // Consistency
  consistencyModel?: ConsistencyModel;
  replicationFactor?: number;    // Number of replicas

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Memory write response
 */
export interface MemoryWriteResponse {
  namespace: string;
  key: string;

  success: boolean;
  version: number;
  timestamp: number;

  // Conflict info
  conflict?: boolean;
  conflictingVersion?: number;

  error?: MemoryError;
}

/**
 * Memory update request (partial update)
 */
export interface MemoryUpdateRequest {
  namespace: string;
  key: string;

  // Update operations
  operations: UpdateOperation[];

  // Versioning
  expectedVersion?: number;

  consistencyModel?: ConsistencyModel;

  metadata?: Record<string, unknown>;
}

/**
 * Update operation
 */
export interface UpdateOperation {
  op: 'set' | 'unset' | 'increment' | 'decrement' | 'append' | 'prepend' | 'merge';
  path: string;                  // JSON path
  value?: unknown;
}

/**
 * Memory delete request
 */
export interface MemoryDeleteRequest {
  namespace: string;
  key: string;

  // Versioning
  expectedVersion?: number;

  // Soft delete
  softDelete?: boolean;          // Mark as deleted but keep data

  metadata?: Record<string, unknown>;
}

/**
 * Memory delete response
 */
export interface MemoryDeleteResponse {
  namespace: string;
  key: string;

  success: boolean;
  deleted: boolean;              // False if already deleted

  error?: MemoryError;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch read request
 */
export interface BatchReadRequest {
  namespace: string;
  keys: string[];

  consistencyModel?: ConsistencyModel;
  allowStale?: boolean;

  metadata?: Record<string, unknown>;
}

/**
 * Batch read response
 */
export interface BatchReadResponse {
  namespace: string;

  results: MemoryReadResponse[];

  // Summary
  totalRequested: number;
  totalFound: number;

  metadata?: Record<string, unknown>;
}

/**
 * Batch write request
 */
export interface BatchWriteRequest {
  namespace: string;

  writes: Array<{
    key: string;
    value: unknown;
    ttl?: number;
    expectedVersion?: number;
  }>;

  // Atomicity
  atomic?: boolean;              // All or nothing

  consistencyModel?: ConsistencyModel;

  metadata?: Record<string, unknown>;
}

/**
 * Batch write response
 */
export interface BatchWriteResponse {
  namespace: string;

  results: MemoryWriteResponse[];

  // Summary
  totalRequested: number;
  totalSucceeded: number;
  totalFailed: number;

  // Rollback info (if atomic)
  rolledBack?: boolean;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Transactions
// ============================================================================

/**
 * Transaction begin request
 */
export interface TransactionBeginRequest {
  transactionId?: string;        // Optional client-provided ID

  isolationLevel: IsolationLevel;

  // Transaction options
  timeoutMs?: number;
  readOnly?: boolean;

  // Scope
  namespaces?: string[];         // Limit transaction scope

  metadata?: Record<string, unknown>;
}

/**
 * Transaction begin response
 */
export interface TransactionBeginResponse {
  transactionId: string;

  startedAt: number;
  expiresAt?: number;

  metadata?: Record<string, unknown>;
}

/**
 * Transaction operation
 */
export interface TransactionOperation {
  transactionId: string;

  operation: MemoryOperationType;

  // Operation-specific data
  data: MemoryReadRequest | MemoryWriteRequest | MemoryUpdateRequest | MemoryDeleteRequest;
}

/**
 * Transaction commit request
 */
export interface TransactionCommitRequest {
  transactionId: string;

  metadata?: Record<string, unknown>;
}

/**
 * Transaction commit response
 */
export interface TransactionCommitResponse {
  transactionId: string;

  success: boolean;
  committed: boolean;

  // Results
  operations: number;
  affectedKeys: string[];

  error?: MemoryError;
}

/**
 * Transaction rollback request
 */
export interface TransactionRollbackRequest {
  transactionId: string;

  reason?: string;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Locking
// ============================================================================

/**
 * Lock types
 */
export enum LockType {
  SHARED = 'shared',             // Read lock
  EXCLUSIVE = 'exclusive'        // Write lock
}

/**
 * Lock acquire request
 */
export interface LockAcquireRequest {
  namespace: string;
  key: string;

  lockType: LockType;

  // Lock options
  timeoutMs?: number;            // How long to wait for lock
  leaseDurationMs?: number;      // How long to hold lock

  // Ownership
  ownerId: string;               // Agent ID

  metadata?: Record<string, unknown>;
}

/**
 * Lock acquire response
 */
export interface LockAcquireResponse {
  namespace: string;
  key: string;

  acquired: boolean;
  lockId?: string;

  expiresAt?: number;

  // If not acquired
  currentOwner?: string;
  estimatedWaitMs?: number;

  error?: MemoryError;
}

/**
 * Lock release request
 */
export interface LockReleaseRequest {
  lockId: string;

  ownerId: string;               // Must match lock owner

  metadata?: Record<string, unknown>;
}

/**
 * Lock release response
 */
export interface LockReleaseResponse {
  lockId: string;

  released: boolean;

  error?: MemoryError;
}

// ============================================================================
// Cache Coherence
// ============================================================================

/**
 * Cache invalidation request
 */
export interface CacheInvalidateRequest {
  namespace: string;

  // Invalidation scope
  keys?: string[];               // Specific keys
  pattern?: string;              // Key pattern (glob)

  // Broadcasting
  broadcast?: boolean;           // Invalidate on all agents

  metadata?: Record<string, unknown>;
}

/**
 * Cache invalidation response
 */
export interface CacheInvalidateResponse {
  namespace: string;

  invalidated: number;           // Number of entries invalidated

  affectedKeys?: string[];

  metadata?: Record<string, unknown>;
}

/**
 * Cache synchronization request
 */
export interface CacheSyncRequest {
  namespace: string;

  // Sync scope
  keys?: string[];
  since?: number;                // Timestamp

  // Sync strategy
  strategy: 'pull' | 'push' | 'bidirectional';

  metadata?: Record<string, unknown>;
}

/**
 * Cache synchronization response
 */
export interface CacheSyncResponse {
  namespace: string;

  synchronized: number;

  entries?: CacheEntry[];

  metadata?: Record<string, unknown>;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  key: string;
  value: unknown;
  version: number;
  timestamp: number;

  cachedAt: number;
  expiresAt?: number;

  // Cache metadata
  hitCount?: number;
  lastAccessedAt?: number;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Namespace Management
// ============================================================================

/**
 * Namespace isolation levels
 */
export enum NamespaceIsolation {
  PRIVATE = 'private',           // Only owner can access
  SHARED = 'shared',             // Explicit sharing
  PUBLIC = 'public'              // Anyone can access
}

/**
 * Namespace configuration
 */
export interface NamespaceConfig {
  namespace: string;

  owner: AgentAddress;

  // Isolation and permissions
  isolation: NamespaceIsolation;
  permissions?: NamespacePermission[];

  // Resource limits
  maxKeys?: number;
  maxSizeBytes?: number;
  defaultTtl?: number;

  // Consistency
  consistencyModel?: ConsistencyModel;
  replicationFactor?: number;

  metadata?: Record<string, unknown>;
}

/**
 * Namespace permission
 */
export interface NamespacePermission {
  principal: string;             // Agent ID or role

  actions: MemoryAction[];

  // Resource constraints
  keyPattern?: string;           // Restrict to specific keys

  metadata?: Record<string, unknown>;
}

/**
 * Memory actions for permissions
 */
export enum MemoryAction {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  LIST = 'list',
  ADMIN = 'admin'                // Manage namespace itself
}

// ============================================================================
// Conflict Resolution
// ============================================================================

/**
 * Conflict resolution strategies
 */
export enum ConflictResolution {
  LAST_WRITE_WINS = 'last_write_wins',
  FIRST_WRITE_WINS = 'first_write_wins',
  CUSTOM = 'custom',             // Use custom resolver
  MANUAL = 'manual'              // Require manual resolution
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  namespace: string;
  key: string;

  conflictingVersions: ConflictVersion[];

  detectedAt: number;

  resolution?: ConflictResolution;

  metadata?: Record<string, unknown>;
}

/**
 * Conflicting version
 */
export interface ConflictVersion {
  version: number;
  value: unknown;
  timestamp: number;

  writtenBy: string;             // Agent ID

  vectorClock?: Record<string, number>;

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Memory-specific errors
 */
export interface MemoryError {
  code: MemoryErrorCode;
  message: string;

  namespace?: string;
  key?: string;

  details?: Record<string, unknown>;
}

/**
 * Memory error codes
 */
export enum MemoryErrorCode {
  // Access errors
  NAMESPACE_NOT_FOUND = 'namespace_not_found',
  KEY_NOT_FOUND = 'key_not_found',
  PERMISSION_DENIED = 'permission_denied',

  // Constraint violations
  VERSION_MISMATCH = 'version_mismatch',
  KEY_EXISTS = 'key_exists',
  KEY_NOT_EXISTS = 'key_not_exists',

  // Resource limits
  QUOTA_EXCEEDED = 'quota_exceeded',
  SIZE_LIMIT_EXCEEDED = 'size_limit_exceeded',

  // Locking
  LOCK_TIMEOUT = 'lock_timeout',
  LOCK_CONFLICT = 'lock_conflict',
  INVALID_LOCK = 'invalid_lock',

  // Transactions
  TRANSACTION_ABORTED = 'transaction_aborted',
  TRANSACTION_TIMEOUT = 'transaction_timeout',
  INVALID_TRANSACTION = 'invalid_transaction',

  // Consistency
  CONSISTENCY_VIOLATION = 'consistency_violation',
  REPLICATION_FAILURE = 'replication_failure',

  // General
  INTERNAL_ERROR = 'internal_error',
  UNAVAILABLE = 'unavailable'
}

// ============================================================================
// Versioning
// ============================================================================

/**
 * Version information
 */
export interface VersionInfo {
  version: number;
  timestamp: number;

  // Causality
  vectorClock?: Record<string, number>;
  lamportTimestamp?: number;

  // Lineage
  previousVersion?: number;

  // Metadata
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Version history
 */
export interface VersionHistory {
  namespace: string;
  key: string;

  versions: VersionInfo[];

  currentVersion: number;

  metadata?: Record<string, unknown>;
}
