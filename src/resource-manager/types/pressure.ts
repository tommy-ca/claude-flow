/**
 * Resource pressure detection interfaces
 */

import { IResourceMetrics, ResourcePressureLevel, ResourceType, IResourceAlert } from './metrics';

/**
 * Pressure detection configuration
 */
export interface IPressureDetectorConfig {
  /** Enable pressure detection */
  enabled: boolean;
  /** Detection interval in milliseconds */
  interval: number;
  /** Number of samples for moving average */
  windowSize: number;
  /** Pressure thresholds */
  thresholds: IPressureThresholds;
  /** Prediction settings */
  prediction: IPredictionSettings;
  /** Response actions */
  responseActions: IResponseAction[];
  /** Anomaly detection settings */
  anomalyDetection?: IAnomalyDetectionSettings;
}

/**
 * Pressure thresholds
 */
export interface IPressureThresholds {
  /** Normal to moderate threshold */
  moderate: IThresholdSet;
  /** Moderate to high threshold */
  high: IThresholdSet;
  /** High to critical threshold */
  critical: IThresholdSet;
  /** Custom thresholds by resource type */
  custom?: Record<ResourceType, IThresholdSet>;
}

/**
 * Threshold set
 */
export interface IThresholdSet {
  /** CPU usage percentage */
  cpu: number;
  /** Memory usage percentage */
  memory: number;
  /** Disk usage percentage */
  disk: number;
  /** Network utilization percentage */
  network: number;
  /** Combined score threshold */
  combined?: number;
}

/**
 * Prediction settings
 */
export interface IPredictionSettings {
  /** Enable predictive pressure detection */
  enabled: boolean;
  /** Prediction horizon in milliseconds */
  horizon: number;
  /** Prediction model type */
  model: PredictionModel;
  /** Model update interval */
  updateInterval: number;
  /** Minimum confidence for predictions */
  minConfidence: number;
}

/**
 * Prediction models
 */
export enum PredictionModel {
  /** Simple linear regression */
  LINEAR = 'linear',
  /** Exponential smoothing */
  EXPONENTIAL = 'exponential',
  /** ARIMA model */
  ARIMA = 'arima',
  /** Machine learning model */
  ML = 'ml',
  /** Hybrid model */
  HYBRID = 'hybrid'
}

/**
 * Response action
 */
export interface IResponseAction {
  /** Action name */
  name: string;
  /** Pressure level that triggers this action */
  triggerLevel: ResourcePressureLevel;
  /** Action type */
  type: ResponseActionType;
  /** Action parameters */
  params: Record<string, any>;
  /** Cool down period in ms */
  coolDown: number;
  /** Priority (higher executes first) */
  priority: number;
}

/**
 * Response action types
 */
export enum ResponseActionType {
  /** Send alert notification */
  ALERT = 'alert',
  /** Scale resources */
  SCALE = 'scale',
  /** Throttle operations */
  THROTTLE = 'throttle',
  /** Shed load */
  SHED_LOAD = 'shed-load',
  /** Migrate workload */
  MIGRATE = 'migrate',
  /** Execute custom script */
  CUSTOM = 'custom'
}

/**
 * Anomaly detection settings
 */
export interface IAnomalyDetectionSettings {
  /** Enable anomaly detection */
  enabled: boolean;
  /** Detection algorithm */
  algorithm: AnomalyAlgorithm;
  /** Sensitivity (0-1, higher is more sensitive) */
  sensitivity: number;
  /** Training period in milliseconds */
  trainingPeriod: number;
  /** Minimum data points for detection */
  minDataPoints: number;
}

/**
 * Anomaly detection algorithms
 */
export enum AnomalyAlgorithm {
  /** Statistical deviation */
  STATISTICAL = 'statistical',
  /** Isolation forest */
  ISOLATION_FOREST = 'isolation-forest',
  /** Local outlier factor */
  LOF = 'lof',
  /** One-class SVM */
  ONE_CLASS_SVM = 'one-class-svm',
  /** Ensemble method */
  ENSEMBLE = 'ensemble'
}

/**
 * Resource pressure detector interface
 */
export interface IResourcePressureDetector {
  /** Start pressure detection */
  start(): Promise<void>;

  /** Stop pressure detection */
  stop(): Promise<void>;

  /** Get current pressure level */
  getCurrentPressure(): IPressureStatus;

  /** Get pressure history */
  getPressureHistory(duration: number): IPressureStatus[];

  /** Predict future pressure */
  predictPressure(horizon: number): Promise<IPressurePrediction>;

  /** Check for anomalies */
  detectAnomalies(metrics: IResourceMetrics): IAnomalyResult[];

  /** Subscribe to pressure changes */
  subscribe(callback: PressureCallback): () => void;

  /** Register response action */
  registerAction(action: IResponseAction): void;

  /** Update configuration */
  updateConfig(config: Partial<IPressureDetectorConfig>): void;

  /** Get configuration */
  getConfig(): IPressureDetectorConfig;

  /** Manually trigger pressure check */
  check(): Promise<IPressureStatus>;

  /** Get action history */
  getActionHistory(limit?: number): IActionHistoryEntry[];

  /** Export pressure data */
  exportData(format: ExportFormat): Promise<string>;
}

/**
 * Pressure status
 */
export interface IPressureStatus {
  /** Current pressure level */
  level: ResourcePressureLevel;
  /** Timestamp */
  timestamp: Date;
  /** Individual resource pressures */
  resources: {
    cpu: IPressureMetric;
    memory: IPressureMetric;
    disk: IPressureMetric;
    network: IPressureMetric;
  };
  /** Combined pressure score (0-100) */
  combinedScore: number;
  /** Pressure trend */
  trend: PressureTrend;
  /** Contributing factors */
  factors: IPressureFactor[];
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Pressure metric
 */
export interface IPressureMetric {
  /** Current value */
  value: number;
  /** Threshold for current level */
  threshold: number;
  /** Percentage of threshold */
  percentOfThreshold: number;
  /** Rate of change */
  rateOfChange: number;
  /** Is anomalous */
  isAnomalous: boolean;
}

/**
 * Pressure trends
 */
export enum PressureTrend {
  /** Pressure is increasing */
  INCREASING = 'increasing',
  /** Pressure is decreasing */
  DECREASING = 'decreasing',
  /** Pressure is stable */
  STABLE = 'stable',
  /** Pressure is fluctuating */
  FLUCTUATING = 'fluctuating'
}

/**
 * Pressure factor
 */
export interface IPressureFactor {
  /** Factor name */
  name: string;
  /** Resource type */
  resourceType: ResourceType;
  /** Impact score (0-100) */
  impact: number;
  /** Description */
  description: string;
}

/**
 * Pressure prediction
 */
export interface IPressurePrediction {
  /** Prediction timestamp */
  timestamp: Date;
  /** Prediction horizon */
  horizon: number;
  /** Predicted pressure levels */
  predictions: IPredictedPressure[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Model used */
  model: PredictionModel;
  /** Risk assessment */
  risk: IRiskAssessment;
}

/**
 * Predicted pressure
 */
export interface IPredictedPressure {
  /** Time of prediction */
  time: Date;
  /** Predicted level */
  level: ResourcePressureLevel;
  /** Predicted combined score */
  score: number;
  /** Confidence interval */
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * Risk assessment
 */
export interface IRiskAssessment {
  /** Risk level */
  level: RiskLevel;
  /** Risk score (0-100) */
  score: number;
  /** Risk factors */
  factors: string[];
  /** Mitigation strategies */
  mitigations: string[];
}

/**
 * Risk levels
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Anomaly result
 */
export interface IAnomalyResult {
  /** Anomaly ID */
  id: string;
  /** Detection timestamp */
  timestamp: Date;
  /** Resource type */
  resourceType: ResourceType;
  /** Anomaly score (0-1) */
  score: number;
  /** Anomaly type */
  type: AnomalyType;
  /** Description */
  description: string;
  /** Affected metrics */
  affectedMetrics: string[];
  /** Severity */
  severity: AnomalySeverity;
}

/**
 * Anomaly types
 */
export enum AnomalyType {
  /** Sudden spike */
  SPIKE = 'spike',
  /** Sudden drop */
  DROP = 'drop',
  /** Gradual increase */
  DRIFT = 'drift',
  /** Unusual pattern */
  PATTERN = 'pattern',
  /** Out of bounds */
  OUT_OF_BOUNDS = 'out-of-bounds'
}

/**
 * Anomaly severity
 */
export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Pressure callback
 */
export type PressureCallback = (status: IPressureStatus) => void;

/**
 * Action history entry
 */
export interface IActionHistoryEntry {
  /** Action ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Action executed */
  action: IResponseAction;
  /** Trigger pressure status */
  triggerStatus: IPressureStatus;
  /** Execution result */
  result: IActionResult;
}

/**
 * Action result
 */
export interface IActionResult {
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Action output */
  output?: any;
  /** Duration in ms */
  duration: number;
}

/**
 * Export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  YAML = 'yaml'
}
