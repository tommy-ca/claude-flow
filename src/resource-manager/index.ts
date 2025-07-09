/**
 * Resource Manager - Main Export
 * 
 * Intelligent resource management and agent deployment system for claude-flow
 */

// Export all types
export * from './types';

// Export core components
export { ResourceManager } from './core/resource-manager';

// Export factory
export { ResourceManagerFactory } from './factory/resource-manager-factory';

// Export utilities
export { ResourceUtils } from './utils/resource-utils';

// Export version
export const VERSION = '1.0.0';

// Export default factory instance
export { createResourceManager } from './factory/create-resource-manager';

/**
 * Resource Manager Feature Flags
 */
export const FEATURES = {
  MONITORING: true,
  ALLOCATION: true,
  PRESSURE_DETECTION: true,
  AGENT_MANAGEMENT: true,
  AUTO_SCALING: true,
  PREDICTIVE_ANALYTICS: true,
  ANOMALY_DETECTION: true,
  MCP_INTEGRATION: true,
  SWARM_INTEGRATION: true,
  CLAUDE_FLOW_INTEGRATION: true
} as const;

/**
 * Resource Manager Constants
 */
export const CONSTANTS = {
  DEFAULT_MONITORING_INTERVAL: 5000,
  DEFAULT_PRESSURE_DETECTION_INTERVAL: 10000,
  DEFAULT_HISTORY_SAMPLES: 100,
  DEFAULT_PREDICTION_HORIZON: 300000, // 5 minutes
  
  // Resource thresholds
  DEFAULT_CPU_THRESHOLD: 80,
  DEFAULT_MEMORY_THRESHOLD: 85,
  DEFAULT_DISK_THRESHOLD: 90,
  DEFAULT_NETWORK_THRESHOLD: 75,
  
  // Allocation settings
  DEFAULT_OVER_PROVISIONING_FACTOR: 1.2,
  DEFAULT_MIN_CPU_CORES: 0.1,
  DEFAULT_MIN_MEMORY: 128 * 1024 * 1024, // 128MB
  DEFAULT_MIN_DISK: 1024 * 1024 * 1024, // 1GB
  DEFAULT_MIN_NETWORK: 10 * 1024 * 1024, // 10Mbps
  
  // Timing
  DEFAULT_IDLE_TIMEOUT: 300000, // 5 minutes
  DEFAULT_GRACE_PERIOD: 60000, // 1 minute
  DEFAULT_COOLDOWN_PERIOD: 120000, // 2 minutes
  
  // Limits
  MAX_AGENTS: 1000,
  MAX_ALLOCATIONS: 10000,
  MAX_HISTORY_ENTRIES: 1000,
  MAX_ALERT_HISTORY: 100
} as const;

/**
 * Quick start function for basic resource management
 */
export function quickStart(options?: {
  monitoringInterval?: number;
  enablePressureDetection?: boolean;
  enableAutoScaling?: boolean;
  maxAgents?: number;
}) {
  const factory = new ResourceManagerFactory();
  
  return factory.createResourceManager(
    // Monitor config
    {
      interval: options?.monitoringInterval || CONSTANTS.DEFAULT_MONITORING_INTERVAL,
      enabled: true,
      thresholds: {
        cpuUsage: CONSTANTS.DEFAULT_CPU_THRESHOLD,
        memoryUsage: CONSTANTS.DEFAULT_MEMORY_THRESHOLD,
        diskUsage: CONSTANTS.DEFAULT_DISK_THRESHOLD,
        networkUtilization: CONSTANTS.DEFAULT_NETWORK_THRESHOLD
      },
      historySamples: CONSTANTS.DEFAULT_HISTORY_SAMPLES,
      includeProcessMetrics: true,
      alertHandlers: [],
      exporters: []
    },
    // Allocator config
    {
      strategy: 'priority' as any,
      maxCpuCores: 8,
      maxMemory: 16 * 1024 * 1024 * 1024,
      maxDiskSpace: 100 * 1024 * 1024 * 1024,
      maxNetworkBandwidth: 1000 * 1024 * 1024,
      overProvisioningFactor: CONSTANTS.DEFAULT_OVER_PROVISIONING_FACTOR,
      allowSharing: true,
      minimumUnits: {
        cpuCores: CONSTANTS.DEFAULT_MIN_CPU_CORES,
        memory: CONSTANTS.DEFAULT_MIN_MEMORY,
        diskSpace: CONSTANTS.DEFAULT_MIN_DISK,
        networkBandwidth: CONSTANTS.DEFAULT_MIN_NETWORK
      },
      reclaimSettings: {
        enabled: true,
        idleTimeout: CONSTANTS.DEFAULT_IDLE_TIMEOUT,
        usageThreshold: 10,
        gracePeriod: CONSTANTS.DEFAULT_GRACE_PERIOD
      }
    },
    // Pressure detector config
    {
      enabled: options?.enablePressureDetection !== false,
      interval: CONSTANTS.DEFAULT_PRESSURE_DETECTION_INTERVAL,
      windowSize: 10,
      thresholds: {
        moderate: { cpu: 70, memory: 75, disk: 80, network: 70 },
        high: { cpu: 85, memory: 90, disk: 95, network: 85 },
        critical: { cpu: 95, memory: 98, disk: 99, network: 95 }
      },
      prediction: {
        enabled: true,
        horizon: CONSTANTS.DEFAULT_PREDICTION_HORIZON,
        model: 'linear' as any,
        updateInterval: 60000,
        minConfidence: 0.7
      },
      responseActions: []
    }
  );
}

/**
 * Resource Manager Info
 */
export const INFO = {
  name: 'claude-flow-resource-manager',
  version: VERSION,
  description: 'Intelligent resource management and agent deployment system',
  author: 'Claude Flow Team',
  license: 'MIT',
  repository: 'https://github.com/claude-flow/claude-flow',
  features: Object.keys(FEATURES).filter(key => FEATURES[key as keyof typeof FEATURES])
} as const;