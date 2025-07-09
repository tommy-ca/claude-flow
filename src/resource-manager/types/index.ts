/**
 * Resource Manager Types
 *
 * Central export point for all resource management type definitions
 */

// Core metrics types
export * from './metrics';

// Monitoring types
export * from './monitor';

// Allocation types
export * from './allocator';

// Agent resource management types
export * from './agent';

// Pressure detection types
export * from './pressure';

// Integration types
export * from './integration';

// Factory types
export * from './factory';

/**
 * Main resource manager interface
 */
export interface IResourceManager {
  /** Resource monitor instance */
  monitor: IResourceMonitor;

  /** Resource allocator instance */
  allocator: IResourceAllocator;

  /** Pressure detector instance */
  pressureDetector: IResourcePressureDetector;

  /** Start resource management */
  start(): Promise<void>;

  /** Stop resource management */
  stop(): Promise<void>;

  /** Create agent resource manager */
  createAgentManager(config: IAgentResourceConfig): IAgentResourceManager;

  /** Get agent manager by ID */
  getAgentManager(agentId: string): IAgentResourceManager | undefined;

  /** Remove agent manager */
  removeAgentManager(agentId: string): boolean;

  /** Get all agent managers */
  getAgentManagers(): Map<string, IAgentResourceManager>;

  /** Get system health report */
  getHealthReport(): Promise<ISystemHealthReport>;

  /** Export system state */
  exportState(): Promise<ISystemState>;

  /** Import system state */
  importState(state: ISystemState): Promise<void>;

  /** Register event listener */
  on(event: ResourceManagerEvent, callback: ResourceManagerCallback): () => void;

  /** Get configuration */
  getConfig(): IResourceManagerConfig;

  /** Update configuration */
  updateConfig(config: Partial<IResourceManagerConfig>): void;
}

/**
 * Resource manager configuration
 */
export interface IResourceManagerConfig {
  /** Monitor configuration */
  monitor: IResourceMonitorConfig;

  /** Allocator configuration */
  allocator: IResourceAllocatorConfig;

  /** Pressure detector configuration */
  pressureDetector: IPressureDetectorConfig;

  /** Default agent configuration */
  defaultAgentConfig?: Partial<IAgentResourceConfig>;

  /** System limits */
  systemLimits: ISystemLimits;

  /** Feature flags */
  features: IFeatureFlags;
}

/**
 * System limits
 */
export interface ISystemLimits {
  /** Maximum number of agents */
  maxAgents: number;

  /** Maximum total CPU allocation */
  maxTotalCpu: number;

  /** Maximum total memory allocation */
  maxTotalMemory: number;

  /** Maximum total disk allocation */
  maxTotalDisk: number;

  /** Maximum total network allocation */
  maxTotalNetwork: number;
}

/**
 * Feature flags
 */
export interface IFeatureFlags {
  /** Enable auto-scaling */
  autoScaling: boolean;

  /** Enable predictive allocation */
  predictiveAllocation: boolean;

  /** Enable anomaly detection */
  anomalyDetection: boolean;

  /** Enable resource sharing */
  resourceSharing: boolean;

  /** Enable performance optimization */
  performanceOptimization: boolean;
}

/**
 * System health report
 */
export interface ISystemHealthReport {
  /** Report timestamp */
  timestamp: Date;

  /** Overall system health */
  overallHealth: HealthState;

  /** Component health statuses */
  components: {
    monitor: ComponentHealth;
    allocator: ComponentHealth;
    pressureDetector: ComponentHealth;
    agents: Map<string, IAgentHealthStatus>;
  };

  /** Current resource metrics */
  metrics: IResourceMetrics;

  /** Current allocations */
  allocations: IResourceUtilization;

  /** Current pressure status */
  pressure: IPressureStatus;

  /** Active alerts */
  alerts: IResourceAlert[];

  /** Recommendations */
  recommendations: string[];
}

/**
 * System state for export/import
 */
export interface ISystemState {
  /** State version */
  version: string;

  /** Export timestamp */
  timestamp: Date;

  /** Configuration */
  config: IResourceManagerConfig;

  /** Allocator state */
  allocatorState: IAllocatorState;

  /** Agent configurations */
  agentConfigs: IAgentResourceConfig[];

  /** Historical data */
  history?: {
    metrics: IResourceMetrics[];
    pressure: IPressureStatus[];
    alerts: IResourceAlert[];
  };

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Resource manager events
 */
export enum ResourceManagerEvent {
  /** System started */
  STARTED = 'started',

  /** System stopped */
  STOPPED = 'stopped',

  /** Agent added */
  AGENT_ADDED = 'agent-added',

  /** Agent removed */
  AGENT_REMOVED = 'agent-removed',

  /** Resource allocated */
  RESOURCE_ALLOCATED = 'resource-allocated',

  /** Resource deallocated */
  RESOURCE_DEALLOCATED = 'resource-deallocated',

  /** Pressure changed */
  PRESSURE_CHANGED = 'pressure-changed',

  /** Alert raised */
  ALERT_RAISED = 'alert-raised',

  /** Health changed */
  HEALTH_CHANGED = 'health-changed',

  /** Configuration updated */
  CONFIG_UPDATED = 'config-updated'
}

/**
 * Resource manager callback
 */
export type ResourceManagerCallback = (event: IResourceManagerEvent) => void;

/**
 * Resource manager event data
 */
export interface IResourceManagerEvent {
  /** Event type */
  type: ResourceManagerEvent;

  /** Event timestamp */
  timestamp: Date;

  /** Event data */
  data: any;
}

// Import types needed for main interface
import type { IResourceMonitor, IResourceMonitorConfig } from './monitor';

import type {
  IResourceAllocator,
  IResourceAllocatorConfig,
  IAllocatorState,
  IResourceUtilization
} from './allocator';

import type {
  IResourcePressureDetector,
  IPressureDetectorConfig,
  IPressureStatus
} from './pressure';

import type {
  IAgentResourceManager,
  IAgentResourceConfig,
  IAgentHealthStatus,
  HealthState,
  ComponentHealth
} from './agent';

import type { IResourceMetrics, IResourceAlert } from './metrics';

// Additional system resource types for core detection
export type SystemResourceType = 'cpu' | 'memory' | 'disk' | 'network' | 'gpu' | 'custom';

export type SystemResourceStatus = 'available' | 'allocated' | 'reserved' | 'exhausted' | 'error';

export type SystemResourcePriority = 'critical' | 'high' | 'medium' | 'low';

export interface SystemResource {
  id: string;
  type: SystemResourceType;
  name: string;
  capacity: number;
  available: number;
  allocated: number;
  unit: string;
  status: SystemResourceStatus;
  metadata?: Record<string, any>;
  lastUpdated: Date;
}

// CPU Resource
export interface SystemCPUResource extends SystemResource {
  type: 'cpu';
  cores: number;
  threads: number;
  usage: number;
  temperature?: number;
  frequency: {
    current: number;
    min: number;
    max: number;
  };
  loadAverage?: {
    '1m': number;
    '5m': number;
    '15m': number;
  };
}

// Memory Resource
export interface SystemMemoryResource extends SystemResource {
  type: 'memory';
  total: number;
  free: number;
  used: number;
  cached?: number;
  buffers?: number;
  swapTotal?: number;
  swapUsed?: number;
  swapFree?: number;
}

// Disk Resource
export interface SystemDiskResource extends SystemResource {
  type: 'disk';
  path: string;
  filesystem: string;
  total: number;
  free: number;
  used: number;
  mount: string;
  readSpeed?: number;
  writeSpeed?: number;
  iops?: {
    read: number;
    write: number;
  };
}

// Network Resource
export interface SystemNetworkResource extends SystemResource {
  type: 'network';
  interface: string;
  ip4?: string;
  ip6?: string;
  mac?: string;
  speed?: number;
  duplex?: string;
  mtu?: number;
  rx: {
    bytes: number;
    packets: number;
    errors: number;
    dropped: number;
  };
  tx: {
    bytes: number;
    packets: number;
    errors: number;
    dropped: number;
  };
}

// GPU Resource
export interface SystemGPUResource extends SystemResource {
  type: 'gpu';
  vendor: string;
  model: string;
  vram: {
    total: number;
    used: number;
    free: number;
  };
  temperature?: number;
  fanSpeed?: number;
  powerDraw?: number;
  utilization: {
    gpu: number;
    memory: number;
  };
}

// Union type for all system resources
export type AnySystemResource =
  | SystemCPUResource
  | SystemMemoryResource
  | SystemDiskResource
  | SystemNetworkResource
  | SystemGPUResource;
