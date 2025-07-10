import { FeatureState } from './IFeature';

/**
 * Transparency layer interface for logging, monitoring, and observability
 * Provides full visibility into feature system operations
 */
export interface ITransparencyLayer {
  /**
   * Log a feature operation
   * @param operation The operation details
   */
  logOperation(operation: IFeatureOperation): void;

  /**
   * Log a feature state change
   * @param stateChange The state change details
   */
  logStateChange(stateChange: IFeatureStateChange): void;

  /**
   * Log a configuration change
   * @param configChange The configuration change details
   */
  logConfigChange(configChange: IFeatureConfigChange): void;

  /**
   * Log an error
   * @param error The error details
   */
  logError(error: IFeatureError): void;

  /**
   * Log a performance metric
   * @param metric The performance metric
   */
  logMetric(metric: IFeatureMetric): void;

  /**
   * Query operation logs
   * @param query The query parameters
   * @returns Matching operations
   */
  queryOperations(query: ILogQuery): Promise<IFeatureOperation[]>;

  /**
   * Query state change logs
   * @param query The query parameters
   * @returns Matching state changes
   */
  queryStateChanges(query: ILogQuery): Promise<IFeatureStateChange[]>;

  /**
   * Query error logs
   * @param query The query parameters
   * @returns Matching errors
   */
  queryErrors(query: ILogQuery): Promise<IFeatureError[]>;

  /**
   * Query performance metrics
   * @param query The query parameters
   * @returns Matching metrics
   */
  queryMetrics(query: IMetricQuery): Promise<IFeatureMetric[]>;

  /**
   * Get current system snapshot
   * @returns Current state of all features
   */
  getSnapshot(): ISystemSnapshot;

  /**
   * Subscribe to real-time events
   * @param eventType The type of events to subscribe to
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  subscribe(eventType: TransparencyEventType, callback: (event: ITransparencyEvent) => void): () => void;

  /**
   * Export logs for analysis
   * @param options Export options
   * @returns Exported data
   */
  exportLogs(options: IExportOptions): Promise<IExportResult>;

  /**
   * Clear old logs
   * @param before Clear logs before this date
   * @returns Number of logs cleared
   */
  clearLogs(before: Date): Promise<number>;

  /**
   * Get transparency configuration
   * @returns Current configuration
   */
  getConfig(): ITransparencyConfig;

  /**
   * Update transparency configuration
   * @param config New configuration
   */
  setConfig(config: Partial<ITransparencyConfig>): void;
}

/**
 * Feature operation log
 */
export interface IFeatureOperation {
  /**
   * Unique operation ID
   */
  id: string;

  /**
   * Timestamp of the operation
   */
  timestamp: Date;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Operation type
   */
  operation: OperationType;

  /**
   * Operation parameters
   */
  params?: any;

  /**
   * Operation result
   */
  result?: any;

  /**
   * Operation duration in milliseconds
   */
  duration?: number;

  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * User or system that initiated the operation
   */
  initiator?: string;

  /**
   * Additional context
   */
  context?: Record<string, any>;
}

/**
 * Feature state change log
 */
export interface IFeatureStateChange {
  /**
   * Unique change ID
   */
  id: string;

  /**
   * Timestamp of the change
   */
  timestamp: Date;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Previous state
   */
  previousState: FeatureState;

  /**
   * New state
   */
  newState: FeatureState;

  /**
   * Reason for the change
   */
  reason?: string;

  /**
   * Who initiated the change
   */
  initiator?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Feature configuration change log
 */
export interface IFeatureConfigChange {
  /**
   * Unique change ID
   */
  id: string;

  /**
   * Timestamp of the change
   */
  timestamp: Date;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Previous configuration
   */
  previousConfig: any;

  /**
   * New configuration
   */
  newConfig: any;

  /**
   * Changed fields
   */
  changedFields: string[];

  /**
   * Who initiated the change
   */
  initiator?: string;

  /**
   * Change validation result
   */
  validated: boolean;

  /**
   * Validation errors if any
   */
  validationErrors?: string[];
}

/**
 * Feature error log
 */
export interface IFeatureError {
  /**
   * Unique error ID
   */
  id: string;

  /**
   * Timestamp of the error
   */
  timestamp: Date;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Error type
   */
  type: ErrorType;

  /**
   * Error message
   */
  message: string;

  /**
   * Error stack trace
   */
  stack?: string;

  /**
   * Operation that caused the error
   */
  operation?: OperationType;

  /**
   * Error severity
   */
  severity: ErrorSeverity;

  /**
   * Whether the error was handled
   */
  handled: boolean;

  /**
   * Recovery actions taken
   */
  recoveryActions?: string[];

  /**
   * Additional error context
   */
  context?: Record<string, any>;
}

/**
 * Feature performance metric
 */
export interface IFeatureMetric {
  /**
   * Unique metric ID
   */
  id: string;

  /**
   * Timestamp of the metric
   */
  timestamp: Date;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Metric name
   */
  name: string;

  /**
   * Metric value
   */
  value: number;

  /**
   * Metric unit
   */
  unit?: string;

  /**
   * Metric type
   */
  type: MetricType;

  /**
   * Tags for categorization
   */
  tags?: Record<string, string>;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * System snapshot
 */
export interface ISystemSnapshot {
  /**
   * Snapshot timestamp
   */
  timestamp: Date;

  /**
   * Feature states
   */
  features: Map<string, {
    state: FeatureState;
    enabled: boolean;
    config: any;
    health: 'healthy' | 'degraded' | 'unhealthy';
  }>;

  /**
   * System metrics
   */
  metrics: {
    totalFeatures: number;
    enabledFeatures: number;
    errorCount: number;
    operationCount: number;
    averageOperationTime: number;
  };

  /**
   * Recent errors
   */
  recentErrors: IFeatureError[];

  /**
   * System health
   */
  health: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Log query parameters
 */
export interface ILogQuery {
  /**
   * Filter by feature IDs
   */
  featureIds?: string[];

  /**
   * Start timestamp
   */
  startTime?: Date;

  /**
   * End timestamp
   */
  endTime?: Date;

  /**
   * Maximum number of results
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;

  /**
   * Sort field
   */
  sortBy?: string;

  /**
   * Sort order
   */
  sortOrder?: 'asc' | 'desc';

  /**
   * Additional filters
   */
  filters?: Record<string, any>;
}

/**
 * Metric query parameters
 */
export interface IMetricQuery extends ILogQuery {
  /**
   * Metric names to filter by
   */
  metricNames?: string[];

  /**
   * Aggregation function
   */
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';

  /**
   * Group by fields
   */
  groupBy?: string[];

  /**
   * Time bucket for aggregation
   */
  timeBucket?: '1m' | '5m' | '15m' | '1h' | '1d';
}

/**
 * Export options
 */
export interface IExportOptions {
  /**
   * Export format
   */
  format: 'json' | 'csv' | 'html' | 'markdown';

  /**
   * Types of logs to export
   */
  includeTypes: Array<'operations' | 'stateChanges' | 'errors' | 'metrics'>;

  /**
   * Start timestamp
   */
  startTime?: Date;

  /**
   * End timestamp
   */
  endTime?: Date;

  /**
   * Feature IDs to filter by
   */
  featureIds?: string[];

  /**
   * Include system snapshot
   */
  includeSnapshot?: boolean;
}

/**
 * Export result
 */
export interface IExportResult {
  /**
   * Exported data
   */
  data: string | Buffer;

  /**
   * Export format
   */
  format: string;

  /**
   * Number of records exported
   */
  recordCount: number;

  /**
   * Export metadata
   */
  metadata: {
    exportTime: Date;
    startTime?: Date;
    endTime?: Date;
    features: string[];
  };
}

/**
 * Transparency configuration
 */
export interface ITransparencyConfig {
  /**
   * Whether to enable logging
   */
  enabled: boolean;

  /**
   * Log level
   */
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Maximum logs to keep
   */
  maxLogs: number;

  /**
   * Log retention period in days
   */
  retentionDays: number;

  /**
   * Whether to log sensitive data
   */
  logSensitiveData: boolean;

  /**
   * Performance tracking interval in milliseconds
   */
  metricsInterval: number;

  /**
   * Real-time event buffer size
   */
  eventBufferSize: number;

  /**
   * Export directory
   */
  exportDirectory: string;
}

/**
 * Transparency event types
 */
export enum TransparencyEventType {
  OPERATION = 'operation',
  STATE_CHANGE = 'stateChange',
  CONFIG_CHANGE = 'configChange',
  ERROR = 'error',
  METRIC = 'metric',
  HEALTH_CHANGE = 'healthChange'
}

/**
 * Transparency event
 */
export interface ITransparencyEvent {
  type: TransparencyEventType;
  data: any;
  timestamp: Date;
}

/**
 * Operation types
 */
export enum OperationType {
  INITIALIZE = 'initialize',
  ENABLE = 'enable',
  DISABLE = 'disable',
  CONFIGURE = 'configure',
  EXECUTE = 'execute',
  VALIDATE = 'validate',
  HEALTH_CHECK = 'healthCheck',
  DESTROY = 'destroy'
}

/**
 * Error types
 */
export enum ErrorType {
  INITIALIZATION = 'initialization',
  CONFIGURATION = 'configuration',
  DEPENDENCY = 'dependency',
  EXECUTION = 'execution',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}