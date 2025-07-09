/**
 * Resource monitor interfaces for system monitoring
 */

import { 
  IResourceMetrics, 
  IResourceThresholds, 
  IResourceAlert,
  ResourceType 
} from './metrics';

/**
 * Resource monitor configuration
 */
export interface IResourceMonitorConfig {
  /** Monitoring interval in milliseconds */
  interval: number;
  /** Whether to enable monitoring */
  enabled: boolean;
  /** Resource thresholds for alerts */
  thresholds: IResourceThresholds;
  /** Number of samples to keep in history */
  historySamples: number;
  /** Whether to monitor process-level metrics */
  includeProcessMetrics: boolean;
  /** Specific processes to monitor (by name or PID) */
  targetProcesses?: string[] | number[];
  /** Alert handlers */
  alertHandlers?: IAlertHandler[];
  /** Metric exporters */
  exporters?: IMetricExporter[];
}

/**
 * Resource monitor interface
 */
export interface IResourceMonitor {
  /** Start monitoring */
  start(): Promise<void>;
  
  /** Stop monitoring */
  stop(): Promise<void>;
  
  /** Get current resource metrics */
  getCurrentMetrics(): Promise<IResourceMetrics>;
  
  /** Get historical metrics */
  getHistoricalMetrics(
    startTime?: Date, 
    endTime?: Date
  ): Promise<IResourceMetrics[]>;
  
  /** Get average metrics over a time period */
  getAverageMetrics(
    duration: number
  ): Promise<IResourceMetrics>;
  
  /** Subscribe to metric updates */
  subscribe(
    callback: MetricCallback
  ): () => void;
  
  /** Subscribe to alerts */
  subscribeToAlerts(
    callback: AlertCallback
  ): () => void;
  
  /** Update monitoring configuration */
  updateConfig(
    config: Partial<IResourceMonitorConfig>
  ): void;
  
  /** Get current configuration */
  getConfig(): IResourceMonitorConfig;
  
  /** Check if monitoring is active */
  isActive(): boolean;
  
  /** Force an immediate metric collection */
  collect(): Promise<IResourceMetrics>;
  
  /** Get alerts history */
  getAlertHistory(
    limit?: number
  ): IResourceAlert[];
  
  /** Clear alert history */
  clearAlertHistory(): void;
  
  /** Export metrics to file or stream */
  exportMetrics(
    format: ExportFormat,
    destination: string | NodeJS.WritableStream
  ): Promise<void>;
}

/**
 * Callback types
 */
export type MetricCallback = (metrics: IResourceMetrics) => void;
export type AlertCallback = (alert: IResourceAlert) => void;

/**
 * Alert handler interface
 */
export interface IAlertHandler {
  /** Handler name */
  name: string;
  
  /** Handle alert */
  handle(alert: IResourceAlert): Promise<void>;
  
  /** Check if handler can handle this alert */
  canHandle(alert: IResourceAlert): boolean;
}

/**
 * Metric exporter interface
 */
export interface IMetricExporter {
  /** Exporter name */
  name: string;
  
  /** Export metrics */
  export(metrics: IResourceMetrics): Promise<void>;
  
  /** Batch export metrics */
  exportBatch(metrics: IResourceMetrics[]): Promise<void>;
  
  /** Flush any buffered metrics */
  flush(): Promise<void>;
}

/**
 * Export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PROMETHEUS = 'prometheus',
  INFLUXDB = 'influxdb'
}

/**
 * Monitoring strategy interface
 */
export interface IMonitoringStrategy {
  /** Strategy name */
  name: string;
  
  /** Collect metrics using this strategy */
  collect(): Promise<Partial<IResourceMetrics>>;
  
  /** Check if strategy is available on this platform */
  isAvailable(): boolean;
  
  /** Get resource types this strategy monitors */
  getResourceTypes(): ResourceType[];
}

/**
 * Resource monitor factory interface
 */
export interface IResourceMonitorFactory {
  /** Create a resource monitor */
  create(
    config: IResourceMonitorConfig
  ): IResourceMonitor;
  
  /** Register a monitoring strategy */
  registerStrategy(
    strategy: IMonitoringStrategy
  ): void;
  
  /** Register an alert handler */
  registerAlertHandler(
    handler: IAlertHandler
  ): void;
  
  /** Register a metric exporter */
  registerExporter(
    exporter: IMetricExporter
  ): void;
}