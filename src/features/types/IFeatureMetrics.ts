/**
 * Feature metrics interface for telemetry and performance tracking
 * Provides comprehensive metrics collection and analysis capabilities
 */
export interface IFeatureMetrics {
  /**
   * Record a metric value
   * @param metric The metric to record
   */
  record(metric: IMetric): void;

  /**
   * Record multiple metrics at once
   * @param metrics Array of metrics to record
   */
  recordBatch(metrics: IMetric[]): void;

  /**
   * Increment a counter metric
   * @param name Metric name
   * @param value Increment value (default: 1)
   * @param tags Optional tags
   */
  increment(name: string, value?: number, tags?: IMetricTags): void;

  /**
   * Decrement a counter metric
   * @param name Metric name
   * @param value Decrement value (default: 1)
   * @param tags Optional tags
   */
  decrement(name: string, value?: number, tags?: IMetricTags): void;

  /**
   * Set a gauge metric
   * @param name Metric name
   * @param value Gauge value
   * @param tags Optional tags
   */
  gauge(name: string, value: number, tags?: IMetricTags): void;

  /**
   * Record a timing metric
   * @param name Metric name
   * @param duration Duration in milliseconds
   * @param tags Optional tags
   */
  timing(name: string, duration: number, tags?: IMetricTags): void;

  /**
   * Start a timer for a metric
   * @param name Metric name
   * @returns Timer object
   */
  startTimer(name: string): IMetricTimer;

  /**
   * Record a histogram metric
   * @param name Metric name
   * @param value Value to record
   * @param tags Optional tags
   */
  histogram(name: string, value: number, tags?: IMetricTags): void;

  /**
   * Get current metric values
   * @param query Query parameters
   * @returns Matching metrics
   */
  query(query: IMetricQuery): IMetricResult[];

  /**
   * Get aggregated metrics
   * @param query Aggregation query
   * @returns Aggregated results
   */
  aggregate(query: IAggregationQuery): IAggregatedMetrics;

  /**
   * Get metric summary
   * @param metricName Metric name
   * @param timeRange Time range for summary
   * @returns Metric summary
   */
  getSummary(metricName: string, timeRange?: ITimeRange): IMetricSummary;

  /**
   * Get all metrics for a feature
   * @param featureId Feature ID
   * @returns Feature metrics
   */
  getFeatureMetrics(featureId: string): IFeatureMetricsSummary;

  /**
   * Export metrics
   * @param options Export options
   * @returns Exported metrics
   */
  export(options: IMetricExportOptions): Promise<IMetricExportResult>;

  /**
   * Clear metrics
   * @param before Clear metrics before this date
   * @returns Number of metrics cleared
   */
  clear(before?: Date): Promise<number>;

  /**
   * Subscribe to metric updates
   * @param callback Function to call when metrics are recorded
   * @returns Unsubscribe function
   */
  subscribe(callback: (metric: IMetric) => void): () => void;

  /**
   * Get metrics configuration
   * @returns Current configuration
   */
  getConfig(): IMetricsConfig;

  /**
   * Update metrics configuration
   * @param config New configuration
   */
  setConfig(config: Partial<IMetricsConfig>): void;
}

/**
 * Base metric interface
 */
export interface IMetric {
  /**
   * Metric name
   */
  name: string;

  /**
   * Metric value
   */
  value: number;

  /**
   * Metric type
   */
  type: MetricType;

  /**
   * Timestamp
   */
  timestamp: Date;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Metric tags
   */
  tags?: IMetricTags;

  /**
   * Metric unit
   */
  unit?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  TIMING = 'timing',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Metric tags for categorization
 */
export interface IMetricTags {
  [key: string]: string | number | boolean;
}

/**
 * Metric timer
 */
export interface IMetricTimer {
  /**
   * Stop the timer and record the metric
   * @param tags Optional tags
   * @returns Duration in milliseconds
   */
  stop(tags?: IMetricTags): number;

  /**
   * Get elapsed time without stopping
   * @returns Elapsed time in milliseconds
   */
  elapsed(): number;

  /**
   * Cancel the timer without recording
   */
  cancel(): void;
}

/**
 * Metric query parameters
 */
export interface IMetricQuery {
  /**
   * Metric names to filter by
   */
  names?: string[];

  /**
   * Feature IDs to filter by
   */
  featureIds?: string[];

  /**
   * Metric types to filter by
   */
  types?: MetricType[];

  /**
   * Time range
   */
  timeRange?: ITimeRange;

  /**
   * Tags to filter by
   */
  tags?: IMetricTags;

  /**
   * Maximum number of results
   */
  limit?: number;

  /**
   * Sort order
   */
  sort?: 'asc' | 'desc';
}

/**
 * Time range
 */
export interface ITimeRange {
  /**
   * Start time
   */
  start: Date;

  /**
   * End time
   */
  end: Date;
}

/**
 * Metric result
 */
export interface IMetricResult {
  /**
   * The metric
   */
  metric: IMetric;

  /**
   * Calculated values
   */
  calculated?: {
    rate?: number;
    percentChange?: number;
  };
}

/**
 * Aggregation query
 */
export interface IAggregationQuery {
  /**
   * Metric name
   */
  name: string;

  /**
   * Aggregation function
   */
  function: AggregationFunction;

  /**
   * Time range
   */
  timeRange?: ITimeRange;

  /**
   * Group by tags
   */
  groupBy?: string[];

  /**
   * Time bucket for time-series aggregation
   */
  timeBucket?: TimeBucket;

  /**
   * Filter tags
   */
  tags?: IMetricTags;
}

/**
 * Aggregation functions
 */
export enum AggregationFunction {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  RATE = 'rate',
  PERCENTILE = 'percentile'
}

/**
 * Time buckets for aggregation
 */
export type TimeBucket = '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '1d' | '7d' | '30d';

/**
 * Aggregated metrics result
 */
export interface IAggregatedMetrics {
  /**
   * Query that produced these results
   */
  query: IAggregationQuery;

  /**
   * Aggregated values
   */
  values: IAggregatedValue[];

  /**
   * Total count of metrics aggregated
   */
  totalCount: number;

  /**
   * Time range of aggregation
   */
  timeRange: ITimeRange;
}

/**
 * Aggregated value
 */
export interface IAggregatedValue {
  /**
   * Aggregated value
   */
  value: number;

  /**
   * Time bucket (if time-series)
   */
  timestamp?: Date;

  /**
   * Group tags (if grouped)
   */
  tags?: IMetricTags;

  /**
   * Number of metrics in this aggregation
   */
  count: number;
}

/**
 * Metric summary
 */
export interface IMetricSummary {
  /**
   * Metric name
   */
  name: string;

  /**
   * Summary statistics
   */
  stats: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    stdDev: number;
    percentiles: {
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };

  /**
   * Time range of summary
   */
  timeRange: ITimeRange;

  /**
   * Last value
   */
  lastValue: number;

  /**
   * Last update timestamp
   */
  lastUpdate: Date;

  /**
   * Rate of change
   */
  ratePerMinute?: number;
}

/**
 * Feature metrics summary
 */
export interface IFeatureMetricsSummary {
  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Operation counts
   */
  operations: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
  };

  /**
   * Resource usage
   */
  resources: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkIO?: number;
  };

  /**
   * Error metrics
   */
  errors: {
    total: number;
    byType: Record<string, number>;
    errorRate: number;
  };

  /**
   * Performance metrics
   */
  performance: {
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
  };

  /**
   * Time range
   */
  timeRange: ITimeRange;
}

/**
 * Metric export options
 */
export interface IMetricExportOptions {
  /**
   * Export format
   */
  format: 'json' | 'csv' | 'prometheus' | 'graphite';

  /**
   * Time range to export
   */
  timeRange?: ITimeRange;

  /**
   * Feature IDs to filter by
   */
  featureIds?: string[];

  /**
   * Metric names to filter by
   */
  metricNames?: string[];

  /**
   * Whether to include aggregations
   */
  includeAggregations?: boolean;

  /**
   * Aggregation interval
   */
  aggregationInterval?: TimeBucket;
}

/**
 * Metric export result
 */
export interface IMetricExportResult {
  /**
   * Exported data
   */
  data: string | Buffer;

  /**
   * Export format
   */
  format: string;

  /**
   * Number of metrics exported
   */
  metricCount: number;

  /**
   * Export metadata
   */
  metadata: {
    exportTime: Date;
    timeRange?: ITimeRange;
    features: string[];
  };
}

/**
 * Metrics configuration
 */
export interface IMetricsConfig {
  /**
   * Whether metrics collection is enabled
   */
  enabled: boolean;

  /**
   * Metrics retention period in days
   */
  retentionDays: number;

  /**
   * Maximum metrics to keep in memory
   */
  maxMetrics: number;

  /**
   * Default tags to add to all metrics
   */
  defaultTags?: IMetricTags;

  /**
   * Metrics backends
   */
  backends?: IMetricsBackend[];

  /**
   * Aggregation settings
   */
  aggregation?: {
    enabled: boolean;
    intervals: TimeBucket[];
    retentionMultiplier: number;
  };

  /**
   * Performance settings
   */
  performance?: {
    batchSize: number;
    flushInterval: number;
    compressionEnabled: boolean;
  };
}

/**
 * Metrics backend configuration
 */
export interface IMetricsBackend {
  /**
   * Backend type
   */
  type: 'memory' | 'file' | 'http' | 'statsd' | 'prometheus' | 'custom';

  /**
   * Backend-specific configuration
   */
  config: any;

  /**
   * Whether the backend is enabled
   */
  enabled: boolean;

  /**
   * Metrics filter for this backend
   */
  filter?: {
    types?: MetricType[];
    names?: string[];
    tags?: IMetricTags;
  };
}