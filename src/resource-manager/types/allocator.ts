/**
 * Resource allocator interfaces for managing resource distribution
 */

import {
  IResourceMetrics,
  IResourceAllocationRequest,
  IResourceAllocationResponse,
  ResourcePressureLevel
} from './metrics';

/**
 * Resource allocation strategy
 */
export enum AllocationStrategy {
  /** First-fit allocation */
  FIRST_FIT = 'first-fit',
  /** Best-fit allocation */
  BEST_FIT = 'best-fit',
  /** Worst-fit allocation */
  WORST_FIT = 'worst-fit',
  /** Priority-based allocation */
  PRIORITY = 'priority',
  /** Fair share allocation */
  FAIR_SHARE = 'fair-share',
  /** Dynamic allocation based on usage patterns */
  DYNAMIC = 'dynamic',
  /** Machine learning based allocation */
  ML_OPTIMIZED = 'ml-optimized'
}

/**
 * Resource allocation configuration
 */
export interface IResourceAllocatorConfig {
  /** Allocation strategy to use */
  strategy: AllocationStrategy;
  /** Maximum CPU cores that can be allocated */
  maxCpuCores: number;
  /** Maximum memory in bytes that can be allocated */
  maxMemory: number;
  /** Maximum disk space in bytes that can be allocated */
  maxDiskSpace: number;
  /** Maximum network bandwidth in bytes/sec */
  maxNetworkBandwidth: number;
  /** Over-provisioning factor (1.0 = no over-provisioning) */
  overProvisioningFactor: number;
  /** Whether to allow resource sharing between allocations */
  allowSharing: boolean;
  /** Minimum allocation unit sizes */
  minimumUnits: {
    cpuCores: number;
    memory: number;
    diskSpace: number;
    networkBandwidth: number;
  };
  /** Resource reclaim settings */
  reclaimSettings: IResourceReclaimSettings;
}

/**
 * Resource reclaim settings
 */
export interface IResourceReclaimSettings {
  /** Enable automatic reclaiming of unused resources */
  enabled: boolean;
  /** Time in ms before reclaiming unused resources */
  idleTimeout: number;
  /** Minimum usage percentage to consider resource as used */
  usageThreshold: number;
  /** Grace period in ms before forceful reclaim */
  gracePeriod: number;
}

/**
 * Resource allocator interface
 */
export interface IResourceAllocator {
  /** Allocate resources based on request */
  allocate(
    request: IResourceAllocationRequest
  ): Promise<IResourceAllocationResponse>;
  
  /** Deallocate resources */
  deallocate(
    allocationId: string
  ): Promise<boolean>;
  
  /** Update an existing allocation */
  updateAllocation(
    allocationId: string,
    request: Partial<IResourceAllocationRequest>
  ): Promise<IResourceAllocationResponse>;
  
  /** Get current allocations */
  getAllocations(): IResourceAllocation[];
  
  /** Get allocation by ID */
  getAllocation(
    allocationId: string
  ): IResourceAllocation | undefined;
  
  /** Get allocations for a specific requester */
  getAllocationsByRequester(
    requesterId: string
  ): IResourceAllocation[];
  
  /** Get available resources */
  getAvailableResources(): IAvailableResources;
  
  /** Get resource utilization */
  getUtilization(): IResourceUtilization;
  
  /** Check if resources can be allocated */
  canAllocate(
    request: IResourceAllocationRequest
  ): boolean;
  
  /** Predict if resources will be available at a future time */
  predictAvailability(
    request: IResourceAllocationRequest,
    futureTime: Date
  ): Promise<boolean>;
  
  /** Optimize current allocations */
  optimize(): Promise<IOptimizationResult>;
  
  /** Set allocation strategy */
  setStrategy(
    strategy: AllocationStrategy
  ): void;
  
  /** Update configuration */
  updateConfig(
    config: Partial<IResourceAllocatorConfig>
  ): void;
  
  /** Get current configuration */
  getConfig(): IResourceAllocatorConfig;
  
  /** Export allocation state */
  exportState(): IAllocatorState;
  
  /** Import allocation state */
  importState(
    state: IAllocatorState
  ): Promise<void>;
}

/**
 * Resource allocation record
 */
export interface IResourceAllocation {
  /** Allocation ID */
  id: string;
  /** Request ID that created this allocation */
  requestId: string;
  /** Requester ID */
  requesterId: string;
  /** Allocated resources */
  resources: {
    cpuCores: number;
    memory: number;
    diskSpace: number;
    networkBandwidth: number;
  };
  /** Allocation priority */
  priority: number;
  /** Allocation timestamp */
  allocatedAt: Date;
  /** Expiration time (if temporary) */
  expiresAt?: Date;
  /** Last usage update */
  lastUsageUpdate: Date;
  /** Current usage statistics */
  usage: IResourceUsage;
  /** Allocation state */
  state: AllocationState;
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Allocation states
 */
export enum AllocationState {
  /** Allocation is active */
  ACTIVE = 'active',
  /** Allocation is suspended */
  SUSPENDED = 'suspended',
  /** Allocation is being reclaimed */
  RECLAIMING = 'reclaiming',
  /** Allocation is expired */
  EXPIRED = 'expired'
}

/**
 * Resource usage statistics
 */
export interface IResourceUsage {
  /** CPU usage percentage of allocated */
  cpuUsagePercent: number;
  /** Memory usage percentage of allocated */
  memoryUsagePercent: number;
  /** Disk usage percentage of allocated */
  diskUsagePercent: number;
  /** Network usage percentage of allocated */
  networkUsagePercent: number;
  /** Time since last activity */
  idleTime: number;
}

/**
 * Available resources
 */
export interface IAvailableResources {
  /** Available CPU cores */
  cpuCores: number;
  /** Available memory in bytes */
  memory: number;
  /** Available disk space in bytes */
  diskSpace: number;
  /** Available network bandwidth in bytes/sec */
  networkBandwidth: number;
  /** Timestamp of calculation */
  timestamp: Date;
}

/**
 * Resource utilization
 */
export interface IResourceUtilization {
  /** Total allocated CPU cores */
  allocatedCpuCores: number;
  /** Total allocated memory */
  allocatedMemory: number;
  /** Total allocated disk space */
  allocatedDiskSpace: number;
  /** Total allocated network bandwidth */
  allocatedNetworkBandwidth: number;
  /** CPU utilization percentage */
  cpuUtilization: number;
  /** Memory utilization percentage */
  memoryUtilization: number;
  /** Disk utilization percentage */
  diskUtilization: number;
  /** Network utilization percentage */
  networkUtilization: number;
  /** Number of active allocations */
  activeAllocations: number;
  /** Resource pressure level */
  pressureLevel: ResourcePressureLevel;
}

/**
 * Optimization result
 */
export interface IOptimizationResult {
  /** Whether optimization was performed */
  optimized: boolean;
  /** Number of allocations moved */
  allocationsMoved: number;
  /** Resources freed by optimization */
  resourcesFreed: {
    cpuCores: number;
    memory: number;
    diskSpace: number;
    networkBandwidth: number;
  };
  /** Optimization actions taken */
  actions: IOptimizationAction[];
  /** New utilization after optimization */
  newUtilization: IResourceUtilization;
}

/**
 * Optimization action
 */
export interface IOptimizationAction {
  /** Action type */
  type: OptimizationActionType;
  /** Allocation ID affected */
  allocationId: string;
  /** Description of action */
  description: string;
  /** Resources affected */
  resourcesAffected: Partial<IAvailableResources>;
}

/**
 * Optimization action types
 */
export enum OptimizationActionType {
  /** Moved allocation to different resources */
  MOVE = 'move',
  /** Resized allocation */
  RESIZE = 'resize',
  /** Reclaimed unused resources */
  RECLAIM = 'reclaim',
  /** Consolidated fragmented resources */
  CONSOLIDATE = 'consolidate'
}

/**
 * Allocator state for export/import
 */
export interface IAllocatorState {
  /** State version */
  version: string;
  /** Export timestamp */
  timestamp: Date;
  /** Current allocations */
  allocations: IResourceAllocation[];
  /** Configuration */
  config: IResourceAllocatorConfig;
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Allocation strategy interface
 */
export interface IAllocationStrategy {
  /** Strategy name */
  name: AllocationStrategy;
  
  /** Find allocation for request */
  findAllocation(
    request: IResourceAllocationRequest,
    available: IAvailableResources,
    currentAllocations: IResourceAllocation[]
  ): IResourceAllocationResponse;
  
  /** Optimize existing allocations */
  optimize(
    allocations: IResourceAllocation[],
    totalResources: IAvailableResources
  ): IOptimizationAction[];
  
  /** Calculate priority score for request */
  calculatePriority(
    request: IResourceAllocationRequest,
    currentMetrics: IResourceMetrics
  ): number;
}