/**
 * Convenience factory function for creating resource managers
 */

import { ResourceManagerFactory } from './resource-manager-factory';
import { ResourceManager } from '../core/resource-manager';
import {
  IResourceManagerConfig,
  IResourceMonitorConfig,
  IResourceAllocatorConfig,
  IPressureDetectorConfig
} from '../types';

/**
 * Create a resource manager with default or custom configuration
 */
export function createResourceManager(config?: Partial<IResourceManagerConfig>): ResourceManager {
  const factory = new ResourceManagerFactory();

  const defaultMonitorConfig: IResourceMonitorConfig = {
    interval: 5000,
    enabled: true,
    thresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90,
      networkUtilization: 75
    },
    historySamples: 100,
    includeProcessMetrics: true,
    alertHandlers: [],
    exporters: []
  };

  const defaultAllocatorConfig: IResourceAllocatorConfig = {
    strategy: 'priority' as any,
    maxCpuCores: 8,
    maxMemory: 16 * 1024 * 1024 * 1024,
    maxDiskSpace: 100 * 1024 * 1024 * 1024,
    maxNetworkBandwidth: 1000 * 1024 * 1024,
    overProvisioningFactor: 1.2,
    allowSharing: true,
    minimumUnits: {
      cpuCores: 0.1,
      memory: 128 * 1024 * 1024,
      diskSpace: 1024 * 1024 * 1024,
      networkBandwidth: 10 * 1024 * 1024
    },
    reclaimSettings: {
      enabled: true,
      idleTimeout: 300000,
      usageThreshold: 10,
      gracePeriod: 60000
    }
  };

  const defaultPressureDetectorConfig: IPressureDetectorConfig = {
    enabled: true,
    interval: 10000,
    windowSize: 10,
    thresholds: {
      moderate: { cpu: 70, memory: 75, disk: 80, network: 70 },
      high: { cpu: 85, memory: 90, disk: 95, network: 85 },
      critical: { cpu: 95, memory: 98, disk: 99, network: 95 }
    },
    prediction: {
      enabled: true,
      horizon: 300000,
      model: 'linear' as any,
      updateInterval: 60000,
      minConfidence: 0.7
    },
    responseActions: []
  };

  return factory.createResourceManager(
    { ...defaultMonitorConfig, ...config?.monitor },
    { ...defaultAllocatorConfig, ...config?.allocator },
    { ...defaultPressureDetectorConfig, ...config?.pressureDetector }
  );
}

/**
 * Create a resource manager with minimal configuration for testing
 */
export function createTestResourceManager(): ResourceManager {
  return createResourceManager({
    monitor: {
      interval: 1000,
      enabled: true,
      thresholds: {
        cpuUsage: 90,
        memoryUsage: 90,
        diskUsage: 95,
        networkUtilization: 90
      },
      historySamples: 10,
      includeProcessMetrics: false
    },
    allocator: {
      strategy: 'priority' as any,
      maxCpuCores: 2,
      maxMemory: 4 * 1024 * 1024 * 1024,
      maxDiskSpace: 20 * 1024 * 1024 * 1024,
      maxNetworkBandwidth: 100 * 1024 * 1024,
      overProvisioningFactor: 1.0,
      allowSharing: true
    },
    pressureDetector: {
      enabled: false
    }
  });
}

/**
 * Create a resource manager optimized for high-performance scenarios
 */
export function createHighPerformanceResourceManager(): ResourceManager {
  return createResourceManager({
    monitor: {
      interval: 1000, // More frequent monitoring
      enabled: true,
      thresholds: {
        cpuUsage: 70,
        memoryUsage: 75,
        diskUsage: 80,
        networkUtilization: 70
      },
      historySamples: 200,
      includeProcessMetrics: true
    },
    allocator: {
      strategy: 'ml-optimized' as any,
      maxCpuCores: 32,
      maxMemory: 128 * 1024 * 1024 * 1024,
      maxDiskSpace: 1000 * 1024 * 1024 * 1024,
      maxNetworkBandwidth: 10000 * 1024 * 1024,
      overProvisioningFactor: 1.5,
      allowSharing: true
    },
    pressureDetector: {
      enabled: true,
      interval: 5000,
      windowSize: 20,
      prediction: {
        enabled: true,
        horizon: 600000, // 10 minutes
        model: 'ml' as any,
        updateInterval: 30000,
        minConfidence: 0.8
      }
    }
  });
}

/**
 * Create a resource manager for development/debugging
 */
export function createDevelopmentResourceManager(): ResourceManager {
  return createResourceManager({
    monitor: {
      interval: 2000,
      enabled: true,
      thresholds: {
        cpuUsage: 95,
        memoryUsage: 95,
        diskUsage: 98,
        networkUtilization: 95
      },
      historySamples: 50,
      includeProcessMetrics: true
    },
    allocator: {
      strategy: 'best-fit' as any,
      maxCpuCores: 4,
      maxMemory: 8 * 1024 * 1024 * 1024,
      maxDiskSpace: 50 * 1024 * 1024 * 1024,
      maxNetworkBandwidth: 500 * 1024 * 1024,
      overProvisioningFactor: 1.1,
      allowSharing: true
    },
    pressureDetector: {
      enabled: true,
      interval: 15000,
      windowSize: 5,
      prediction: {
        enabled: false
      }
    }
  });
}
