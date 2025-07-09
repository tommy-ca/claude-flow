/**
 * Resource metrics types for system monitoring
 */

/**
 * CPU metrics interface
 */
export interface ICpuMetrics {
  /** CPU usage percentage (0-100) */
  usage: number;
  /** Number of CPU cores */
  cores: number;
  /** Load average (1, 5, 15 minutes) */
  loadAverage: [number, number, number];
  /** CPU temperature in Celsius (if available) */
  temperature?: number;
  /** Per-core usage percentages */
  perCoreUsage?: number[];
  /** System CPU time percentage */
  systemTime: number;
  /** User CPU time percentage */
  userTime: number;
  /** Idle CPU time percentage */
  idleTime: number;
}

/**
 * Memory metrics interface
 */
export interface IMemoryMetrics {
  /** Total memory in bytes */
  total: number;
  /** Used memory in bytes */
  used: number;
  /** Free memory in bytes */
  free: number;
  /** Available memory in bytes (includes buffers/cache) */
  available: number;
  /** Memory usage percentage */
  usagePercentage: number;
  /** Swap total in bytes */
  swapTotal: number;
  /** Swap used in bytes */
  swapUsed: number;
  /** Swap free in bytes */
  swapFree: number;
  /** Memory pressure indicator (0-1) */
  pressure: number;
}

/**
 * Disk metrics interface
 */
export interface IDiskMetrics {
  /** Mount point or drive letter */
  mountPoint: string;
  /** Total disk space in bytes */
  total: number;
  /** Used disk space in bytes */
  used: number;
  /** Free disk space in bytes */
  free: number;
  /** Disk usage percentage */
  usagePercentage: number;
  /** Read operations per second */
  readOps?: number;
  /** Write operations per second */
  writeOps?: number;
  /** Read bytes per second */
  readBytes?: number;
  /** Write bytes per second */
  writeBytes?: number;
  /** I/O utilization percentage */
  ioUtilization?: number;
}

/**
 * Network metrics interface
 */
export interface INetworkMetrics {
  /** Network interface name */
  interface: string;
  /** Bytes received per second */
  rxBytes: number;
  /** Bytes transmitted per second */
  txBytes: number;
  /** Packets received per second */
  rxPackets: number;
  /** Packets transmitted per second */
  txPackets: number;
  /** Network errors count */
  errors: number;
  /** Network drops count */
  drops: number;
  /** Network latency in milliseconds */
  latency?: number;
  /** Bandwidth utilization percentage */
  bandwidthUtilization?: number;
}

/**
 * Process-specific metrics
 */
export interface IProcessMetrics {
  /** Process ID */
  pid: number;
  /** Process name */
  name: string;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Number of threads */
  threads: number;
  /** Process uptime in seconds */
  uptime: number;
  /** File descriptors count */
  fileDescriptors?: number;
  /** Process priority */
  priority?: number;
}

/**
 * Aggregated resource metrics
 */
export interface IResourceMetrics {
  /** Timestamp of metrics collection */
  timestamp: Date;
  /** CPU metrics */
  cpu: ICpuMetrics;
  /** Memory metrics */
  memory: IMemoryMetrics;
  /** Disk metrics (multiple disks) */
  disks: IDiskMetrics[];
  /** Network metrics (multiple interfaces) */
  network: INetworkMetrics[];
  /** Process-specific metrics */
  processes?: IProcessMetrics[];
  /** Overall system health score (0-100) */
  healthScore: number;
  /** Resource pressure level */
  pressureLevel: ResourcePressureLevel;
}

/**
 * Resource pressure levels
 */
export enum ResourcePressureLevel {
  /** System resources are healthy */
  NORMAL = 'normal',
  /** Resources are under moderate pressure */
  MODERATE = 'moderate',
  /** Resources are under high pressure */
  HIGH = 'high',
  /** Resources are critically low */
  CRITICAL = 'critical'
}

/**
 * Resource allocation request
 */
export interface IResourceAllocationRequest {
  /** Unique request ID */
  requestId: string;
  /** Agent or component ID requesting resources */
  requesterId: string;
  /** CPU cores requested */
  cpuCores?: number;
  /** Memory in bytes requested */
  memory?: number;
  /** Disk space in bytes requested */
  diskSpace?: number;
  /** Network bandwidth in bytes/sec requested */
  networkBandwidth?: number;
  /** Priority level (0-10, higher is more important) */
  priority: number;
  /** Duration in milliseconds (0 for permanent) */
  duration?: number;
  /** Minimum acceptable resources */
  minimumRequirements?: Partial<IResourceAllocationRequest>;
}

/**
 * Resource allocation response
 */
export interface IResourceAllocationResponse {
  /** Request ID this response is for */
  requestId: string;
  /** Whether allocation was successful */
  success: boolean;
  /** Allocated resources */
  allocated?: {
    cpuCores: number;
    memory: number;
    diskSpace: number;
    networkBandwidth: number;
  };
  /** Reason for failure if unsuccessful */
  reason?: string;
  /** Allocation ID for tracking */
  allocationId?: string;
  /** Expiration time for the allocation */
  expiresAt?: Date;
}

/**
 * Resource threshold configuration
 */
export interface IResourceThresholds {
  /** CPU usage threshold percentage */
  cpuUsage: number;
  /** Memory usage threshold percentage */
  memoryUsage: number;
  /** Disk usage threshold percentage */
  diskUsage: number;
  /** Network utilization threshold percentage */
  networkUtilization: number;
  /** Custom thresholds for specific metrics */
  custom?: Record<string, number>;
}

/**
 * Resource alert
 */
export interface IResourceAlert {
  /** Alert ID */
  id: string;
  /** Alert timestamp */
  timestamp: Date;
  /** Alert severity */
  severity: AlertSeverity;
  /** Resource type that triggered the alert */
  resourceType: ResourceType;
  /** Current metric value */
  currentValue: number;
  /** Threshold that was exceeded */
  threshold: number;
  /** Alert message */
  message: string;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Resource types
 */
export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  GPU = 'gpu',
  PROCESS = 'process'
}
