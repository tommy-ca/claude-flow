/**
 * Agent-specific resource management interfaces
 */

import {
  IResourceMetrics,
  IResourceAllocationRequest,
  IResourceAllocationResponse,
  ResourcePressureLevel,
  IProcessMetrics
} from './metrics';
import { IResourceAllocation } from './allocator';

/**
 * Agent resource configuration
 */
export interface IAgentResourceConfig {
  /** Agent ID */
  agentId: string;
  /** Agent type/role */
  agentType: AgentType;
  /** Resource limits for this agent */
  limits: IAgentResourceLimits;
  /** Resource requests (desired resources) */
  requests: IAgentResourceRequests;
  /** Auto-scaling configuration */
  autoScaling?: IAgentAutoScalingConfig;
  /** Quality of Service class */
  qosClass: QoSClass;
  /** Resource sharing policy */
  sharingPolicy: ResourceSharingPolicy;
  /** Performance objectives */
  performanceObjectives?: IPerformanceObjectives;
}

/**
 * Agent types
 */
export enum AgentType {
  /** Coordinator agent */
  COORDINATOR = 'coordinator',
  /** Worker/executor agent */
  WORKER = 'worker',
  /** Analyzer agent */
  ANALYZER = 'analyzer',
  /** Monitor agent */
  MONITOR = 'monitor',
  /** Optimizer agent */
  OPTIMIZER = 'optimizer',
  /** Custom agent type */
  CUSTOM = 'custom'
}

/**
 * Quality of Service classes
 */
export enum QoSClass {
  /** Guaranteed resources */
  GUARANTEED = 'guaranteed',
  /** Burstable resources */
  BURSTABLE = 'burstable',
  /** Best effort resources */
  BEST_EFFORT = 'best-effort'
}

/**
 * Resource sharing policies
 */
export enum ResourceSharingPolicy {
  /** No sharing allowed */
  EXCLUSIVE = 'exclusive',
  /** Share with same priority agents */
  SHARED = 'shared',
  /** Preemptible by higher priority */
  PREEMPTIBLE = 'preemptible'
}

/**
 * Agent resource limits
 */
export interface IAgentResourceLimits {
  /** Maximum CPU cores */
  maxCpuCores: number;
  /** Maximum memory in bytes */
  maxMemory: number;
  /** Maximum disk space in bytes */
  maxDiskSpace: number;
  /** Maximum network bandwidth in bytes/sec */
  maxNetworkBandwidth: number;
  /** Maximum number of file descriptors */
  maxFileDescriptors?: number;
  /** Maximum number of threads */
  maxThreads?: number;
}

/**
 * Agent resource requests
 */
export interface IAgentResourceRequests {
  /** Requested CPU cores */
  cpuCores: number;
  /** Requested memory in bytes */
  memory: number;
  /** Requested disk space in bytes */
  diskSpace: number;
  /** Requested network bandwidth in bytes/sec */
  networkBandwidth: number;
}

/**
 * Agent auto-scaling configuration
 */
export interface IAgentAutoScalingConfig {
  /** Enable auto-scaling */
  enabled: boolean;
  /** Minimum resources */
  minResources: IAgentResourceRequests;
  /** Maximum resources */
  maxResources: IAgentResourceRequests;
  /** Scale up threshold (resource usage percentage) */
  scaleUpThreshold: number;
  /** Scale down threshold (resource usage percentage) */
  scaleDownThreshold: number;
  /** Cool down period in ms between scaling actions */
  coolDownPeriod: number;
  /** Scaling step size (percentage) */
  scalingStep: number;
  /** Custom scaling rules */
  customRules?: IScalingRule[];
}

/**
 * Scaling rule
 */
export interface IScalingRule {
  /** Rule name */
  name: string;
  /** Metric to monitor */
  metric: string;
  /** Comparison operator */
  operator: ComparisonOperator;
  /** Threshold value */
  threshold: number;
  /** Scaling action */
  action: ScalingAction;
  /** Scaling amount */
  amount: number;
}

/**
 * Comparison operators
 */
export enum ComparisonOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  EQUAL = '=',
  NOT_EQUAL = '!='
}

/**
 * Scaling actions
 */
export enum ScalingAction {
  SCALE_UP = 'scale-up',
  SCALE_DOWN = 'scale-down',
  SCALE_TO = 'scale-to'
}

/**
 * Performance objectives
 */
export interface IPerformanceObjectives {
  /** Target response time in ms */
  targetResponseTime?: number;
  /** Target throughput (operations/sec) */
  targetThroughput?: number;
  /** Maximum acceptable error rate (percentage) */
  maxErrorRate?: number;
  /** SLA compliance target (percentage) */
  slaTarget?: number;
}

/**
 * Agent resource manager interface
 */
export interface IAgentResourceManager {
  /** Get agent ID */
  getAgentId(): string;

  /** Request resources for agent */
  requestResources(
    request?: Partial<IResourceAllocationRequest>
  ): Promise<IResourceAllocationResponse>;

  /** Release resources */
  releaseResources(): Promise<boolean>;

  /** Update resource configuration */
  updateConfig(config: Partial<IAgentResourceConfig>): void;

  /** Get current configuration */
  getConfig(): IAgentResourceConfig;

  /** Get current resource allocation */
  getCurrentAllocation(): IResourceAllocation | undefined;

  /** Get resource usage metrics */
  getUsageMetrics(): Promise<IAgentResourceMetrics>;

  /** Get performance metrics */
  getPerformanceMetrics(): Promise<IAgentPerformanceMetrics>;

  /** Check if resources are sufficient */
  areResourcesSufficient(): boolean;

  /** Request resource adjustment based on load */
  requestAdjustment(load: IAgentLoad): Promise<IResourceAllocationResponse>;

  /** Enable/disable auto-scaling */
  setAutoScaling(enabled: boolean): void;

  /** Manually scale resources */
  scaleResources(factor: number): Promise<IResourceAllocationResponse>;

  /** Get resource history */
  getResourceHistory(duration: number): IAgentResourceHistory[];

  /** Subscribe to resource events */
  subscribe(event: AgentResourceEvent, callback: AgentResourceCallback): () => void;

  /** Get health status */
  getHealthStatus(): IAgentHealthStatus;
}

/**
 * Agent resource metrics
 */
export interface IAgentResourceMetrics {
  /** Agent ID */
  agentId: string;
  /** Timestamp */
  timestamp: Date;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Disk usage in bytes */
  diskUsage: number;
  /** Network usage in bytes/sec */
  networkUsage: number;
  /** Process metrics */
  processMetrics?: IProcessMetrics;
  /** Resource efficiency score (0-100) */
  efficiencyScore: number;
  /** Resource pressure level */
  pressureLevel: ResourcePressureLevel;
}

/**
 * Agent performance metrics
 */
export interface IAgentPerformanceMetrics {
  /** Agent ID */
  agentId: string;
  /** Timestamp */
  timestamp: Date;
  /** Average response time in ms */
  avgResponseTime: number;
  /** Throughput (operations/sec) */
  throughput: number;
  /** Error rate percentage */
  errorRate: number;
  /** Queue length */
  queueLength: number;
  /** Active tasks */
  activeTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Failed tasks */
  failedTasks: number;
  /** SLA compliance percentage */
  slaCompliance: number;
}

/**
 * Agent load information
 */
export interface IAgentLoad {
  /** Current load factor (0-1) */
  current: number;
  /** Predicted future load */
  predicted: number;
  /** Load trend (increasing/decreasing/stable) */
  trend: LoadTrend;
  /** Time window for prediction in ms */
  predictionWindow: number;
}

/**
 * Load trends
 */
export enum LoadTrend {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

/**
 * Agent resource history entry
 */
export interface IAgentResourceHistory {
  /** Timestamp */
  timestamp: Date;
  /** Allocated resources */
  allocated: IAgentResourceRequests;
  /** Used resources */
  used: IAgentResourceRequests;
  /** Performance metrics at this time */
  performance: IAgentPerformanceMetrics;
  /** Events that occurred */
  events: AgentResourceEventData[];
}

/**
 * Agent resource events
 */
export enum AgentResourceEvent {
  /** Resources allocated */
  ALLOCATED = 'allocated',
  /** Resources released */
  RELEASED = 'released',
  /** Resources scaled */
  SCALED = 'scaled',
  /** Resource pressure detected */
  PRESSURE_DETECTED = 'pressure-detected',
  /** Resource limit reached */
  LIMIT_REACHED = 'limit-reached',
  /** Performance degraded */
  PERFORMANCE_DEGRADED = 'performance-degraded',
  /** Health status changed */
  HEALTH_CHANGED = 'health-changed'
}

/**
 * Agent resource event data
 */
export interface IAgentResourceEventData {
  /** Event type */
  event: AgentResourceEvent;
  /** Event timestamp */
  timestamp: Date;
  /** Event data */
  data: any;
  /** Event severity */
  severity: EventSeverity;
}

/**
 * Event severity levels
 */
export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Agent resource callback
 */
export type AgentResourceCallback = (event: IAgentResourceEventData) => void;

/**
 * Agent health status
 */
export interface IAgentHealthStatus {
  /** Overall health state */
  state: HealthState;
  /** Health score (0-100) */
  score: number;
  /** Individual component health */
  components: {
    cpu: ComponentHealth;
    memory: ComponentHealth;
    disk: ComponentHealth;
    network: ComponentHealth;
    performance: ComponentHealth;
  };
  /** Health issues detected */
  issues: IHealthIssue[];
  /** Last health check timestamp */
  lastCheck: Date;
}

/**
 * Health states
 */
export enum HealthState {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical'
}

/**
 * Component health
 */
export interface ComponentHealth {
  /** Component state */
  state: HealthState;
  /** Health percentage */
  percentage: number;
  /** Issues detected */
  issues: string[];
}

/**
 * Health issue
 */
export interface IHealthIssue {
  /** Issue ID */
  id: string;
  /** Issue severity */
  severity: EventSeverity;
  /** Issue description */
  description: string;
  /** Affected component */
  component: string;
  /** Suggested remediation */
  remediation?: string;
  /** Time detected */
  detectedAt: Date;
}
