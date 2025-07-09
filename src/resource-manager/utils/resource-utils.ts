/**
 * Utility functions for resource management
 */

import {
  IResourceMetrics,
  IResourceAllocation,
  IResourceThresholds,
  ResourcePressureLevel,
  ResourceType,
  IAgentResourceMetrics,
  IAgentResourceRequests
} from '../types';

/**
 * Resource calculation utilities
 */
export class ResourceUtils {
  /**
   * Calculate resource pressure level based on usage
   */
  static calculatePressureLevel(
    usage: number,
    thresholds: IResourceThresholds
  ): ResourcePressureLevel {
    if (usage >= thresholds.cpuUsage * 0.95) {
      return ResourcePressureLevel.CRITICAL;
    } else if (usage >= thresholds.cpuUsage * 0.85) {
      return ResourcePressureLevel.HIGH;
    } else if (usage >= thresholds.cpuUsage * 0.70) {
      return ResourcePressureLevel.MODERATE;
    } else {
      return ResourcePressureLevel.NORMAL;
    }
  }

  /**
   * Calculate combined resource score
   */
  static calculateResourceScore(metrics: IResourceMetrics): number {
    const cpuScore = metrics.cpu.usage / 100;
    const memoryScore = metrics.memory.usagePercentage / 100;
    const diskScore = metrics.disks.length > 0 
      ? metrics.disks.reduce((sum, disk) => sum + disk.usagePercentage, 0) / metrics.disks.length / 100
      : 0;
    const networkScore = metrics.network.length > 0
      ? metrics.network.reduce((sum, net) => sum + (net.bandwidthUtilization || 0), 0) / metrics.network.length / 100
      : 0;

    // Weighted average (CPU and memory are more important)
    return (cpuScore * 0.3 + memoryScore * 0.3 + diskScore * 0.2 + networkScore * 0.2) * 100;
  }

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Format percentage with precision
   */
  static formatPercentage(value: number, precision: number = 2): string {
    return `${value.toFixed(precision)}%`;
  }

  /**
   * Calculate resource efficiency
   */
  static calculateEfficiency(
    allocated: IAgentResourceRequests,
    used: IAgentResourceRequests
  ): number {
    const cpuEfficiency = allocated.cpuCores > 0 ? used.cpuCores / allocated.cpuCores : 1;
    const memoryEfficiency = allocated.memory > 0 ? used.memory / allocated.memory : 1;
    const diskEfficiency = allocated.diskSpace > 0 ? used.diskSpace / allocated.diskSpace : 1;
    const networkEfficiency = allocated.networkBandwidth > 0 ? used.networkBandwidth / allocated.networkBandwidth : 1;

    return (cpuEfficiency + memoryEfficiency + diskEfficiency + networkEfficiency) / 4 * 100;
  }

  /**
   * Check if resources are sufficient
   */
  static areResourcesSufficient(
    required: IAgentResourceRequests,
    available: IAgentResourceRequests
  ): boolean {
    return (
      available.cpuCores >= required.cpuCores &&
      available.memory >= required.memory &&
      available.diskSpace >= required.diskSpace &&
      available.networkBandwidth >= required.networkBandwidth
    );
  }

  /**
   * Calculate resource gap
   */
  static calculateResourceGap(
    required: IAgentResourceRequests,
    available: IAgentResourceRequests
  ): IAgentResourceRequests {
    return {
      cpuCores: Math.max(0, required.cpuCores - available.cpuCores),
      memory: Math.max(0, required.memory - available.memory),
      diskSpace: Math.max(0, required.diskSpace - available.diskSpace),
      networkBandwidth: Math.max(0, required.networkBandwidth - available.networkBandwidth)
    };
  }

  /**
   * Merge resource requests
   */
  static mergeResourceRequests(
    ...requests: IAgentResourceRequests[]
  ): IAgentResourceRequests {
    return requests.reduce((merged, request) => ({
      cpuCores: merged.cpuCores + request.cpuCores,
      memory: merged.memory + request.memory,
      diskSpace: merged.diskSpace + request.diskSpace,
      networkBandwidth: merged.networkBandwidth + request.networkBandwidth
    }), {
      cpuCores: 0,
      memory: 0,
      diskSpace: 0,
      networkBandwidth: 0
    });
  }

  /**
   * Scale resource requests
   */
  static scaleResourceRequests(
    requests: IAgentResourceRequests,
    factor: number
  ): IAgentResourceRequests {
    return {
      cpuCores: requests.cpuCores * factor,
      memory: requests.memory * factor,
      diskSpace: requests.diskSpace * factor,
      networkBandwidth: requests.networkBandwidth * factor
    };
  }

  /**
   * Calculate resource utilization percentage
   */
  static calculateUtilization(
    used: IAgentResourceRequests,
    total: IAgentResourceRequests
  ): {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  } {
    return {
      cpu: total.cpuCores > 0 ? (used.cpuCores / total.cpuCores) * 100 : 0,
      memory: total.memory > 0 ? (used.memory / total.memory) * 100 : 0,
      disk: total.diskSpace > 0 ? (used.diskSpace / total.diskSpace) * 100 : 0,
      network: total.networkBandwidth > 0 ? (used.networkBandwidth / total.networkBandwidth) * 100 : 0
    };
  }

  /**
   * Generate resource allocation ID
   */
  static generateAllocationId(requesterId: string, timestamp: Date = new Date()): string {
    const timestampStr = timestamp.toISOString().replace(/[-:.]/g, '');
    const randomSuffix = Math.random().toString(36).substr(2, 6);
    return `${requesterId}-${timestampStr}-${randomSuffix}`;
  }

  /**
   * Validate resource configuration
   */
  static validateResourceConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate CPU
    if (typeof config.cpuCores !== 'number' || config.cpuCores < 0) {
      errors.push('CPU cores must be a non-negative number');
    }

    // Validate memory
    if (typeof config.memory !== 'number' || config.memory < 0) {
      errors.push('Memory must be a non-negative number');
    }

    // Validate disk space
    if (typeof config.diskSpace !== 'number' || config.diskSpace < 0) {
      errors.push('Disk space must be a non-negative number');
    }

    // Validate network bandwidth
    if (typeof config.networkBandwidth !== 'number' || config.networkBandwidth < 0) {
      errors.push('Network bandwidth must be a non-negative number');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(values: number[], windowSize: number): number[] {
    if (values.length < windowSize) {
      return values;
    }

    const result: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const sum = values.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / windowSize);
    }

    return result;
  }

  /**
   * Calculate resource trend
   */
  static calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) {
      return 'stable';
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const threshold = 0.05; // 5% threshold
    const percentageChange = (secondAvg - firstAvg) / firstAvg;

    if (percentageChange > threshold) {
      return 'increasing';
    } else if (percentageChange < -threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Predict future resource usage using linear regression
   */
  static predictLinear(values: number[], horizon: number): number[] {
    if (values.length < 2) {
      return Array(horizon).fill(values[0] || 0);
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict future values
    const predictions: number[] = [];
    for (let i = 0; i < horizon; i++) {
      const futureX = n + i;
      const prediction = slope * futureX + intercept;
      predictions.push(Math.max(0, prediction)); // Ensure non-negative
    }

    return predictions;
  }

  /**
   * Calculate resource cost (placeholder for future cost calculation)
   */
  static calculateCost(
    resources: IAgentResourceRequests,
    duration: number,
    pricing: {
      cpuPerHour: number;
      memoryPerGBHour: number;
      diskPerGBHour: number;
      networkPerGBHour: number;
    }
  ): number {
    const hours = duration / (1000 * 60 * 60);
    const memoryGB = resources.memory / (1024 * 1024 * 1024);
    const diskGB = resources.diskSpace / (1024 * 1024 * 1024);
    const networkGB = resources.networkBandwidth / (1024 * 1024 * 1024);

    return (
      resources.cpuCores * pricing.cpuPerHour * hours +
      memoryGB * pricing.memoryPerGBHour * hours +
      diskGB * pricing.diskPerGBHour * hours +
      networkGB * pricing.networkPerGBHour * hours
    );
  }

  /**
   * Deep clone resource object
   */
  static cloneResource<T>(resource: T): T {
    return JSON.parse(JSON.stringify(resource));
  }

  /**
   * Compare resource objects
   */
  static compareResources(a: IAgentResourceRequests, b: IAgentResourceRequests): boolean {
    return (
      a.cpuCores === b.cpuCores &&
      a.memory === b.memory &&
      a.diskSpace === b.diskSpace &&
      a.networkBandwidth === b.networkBandwidth
    );
  }

  /**
   * Get resource type from metric name
   */
  static getResourceType(metricName: string): ResourceType {
    if (metricName.includes('cpu')) return ResourceType.CPU;
    if (metricName.includes('memory')) return ResourceType.MEMORY;
    if (metricName.includes('disk')) return ResourceType.DISK;
    if (metricName.includes('network')) return ResourceType.NETWORK;
    if (metricName.includes('process')) return ResourceType.PROCESS;
    return ResourceType.CPU; // Default
  }

  /**
   * Convert duration to human readable format
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Calculate resource health score
   */
  static calculateHealthScore(metrics: IResourceMetrics): number {
    const scores: number[] = [];

    // CPU health (inverted - lower usage is better)
    scores.push(Math.max(0, 100 - metrics.cpu.usage));

    // Memory health
    scores.push(Math.max(0, 100 - metrics.memory.usagePercentage));

    // Disk health
    if (metrics.disks.length > 0) {
      const avgDiskUsage = metrics.disks.reduce((sum, disk) => sum + disk.usagePercentage, 0) / metrics.disks.length;
      scores.push(Math.max(0, 100 - avgDiskUsage));
    }

    // Network health
    if (metrics.network.length > 0) {
      const avgNetworkUsage = metrics.network.reduce((sum, net) => sum + (net.bandwidthUtilization || 0), 0) / metrics.network.length;
      scores.push(Math.max(0, 100 - avgNetworkUsage));
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
}