/**
 * Resource Monitor
 * Real-time monitoring with configurable intervals and event emission
 */

import { EventEmitter } from 'node:events';
import {
  Resource,
  ResourceMetrics,
  ResourceMonitorConfig,
  ResourceEvent,
  ResourceEventType,
  CPUResource,
  MemoryResource,
  DiskResource,
  NetworkResource,
  GPUResource
} from '../types';
import { resourceDetector } from './resource-detector';
import { createCircularBuffer, CircularBufferImpl } from '../utils/circular-buffer';
import { nanoid } from 'nanoid';

export class ResourceMonitor extends EventEmitter {
  private config: ResourceMonitorConfig;
  private monitoringInterval: NodeJS.Timer | null = null;
  private metricsHistory: Map<string, CircularBufferImpl<ResourceMetrics>>;
  private lastResources: Map<string, Resource>;
  private isMonitoring: boolean = false;
  private startTime: Date;

  constructor(detector: any, config?: ResourceMonitorConfig) {
    super();
    this.config = config || {
      interval: 5000,
      enabled: true,
      enableCPU: true,
      enableMemory: true,
      enableDisk: true,
      enableNetwork: true,
      enableGPU: true,
      historySize: 100,
      alertThresholds: {
        cpu: 80,
        memory: 80,
        disk: 85
      }
    };
    this.metricsHistory = new Map();
    this.lastResources = new Map();
    this.startTime = new Date();
  }

  /**
   * Initialize resource monitoring
   */
  async initialize(): Promise<void> {
    await resourceDetector.initialize();
    this.emit('monitor-initialized');
  }

  /**
   * Start resource monitoring
   */
  async start(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Resource monitoring is already running');
    }

    // Initialize resource detector
    await resourceDetector.initialize();

    // Start monitoring
    this.isMonitoring = true;
    this.emit('monitoring:started', { timestamp: new Date() });

    // Initial detection
    await this.collectMetrics();

    // Set up interval monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.emit('monitoring:error', error);
      }
    }, this.config.interval);
  }

  /**
   * Stop resource monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.emit('monitoring:stopped', {
      timestamp: new Date(),
      duration: Date.now() - this.startTime.getTime()
    });
  }

  /**
   * Collect resource metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date();
    const resources: Resource[] = [];

    // Collect enabled resource types
    if (this.config.enableCPU) {
      const cpu = await resourceDetector.detectCPU();
      resources.push(cpu);
      this.processResource(cpu, timestamp);
    }

    if (this.config.enableMemory) {
      const memory = await resourceDetector.detectMemory();
      resources.push(memory);
      this.processResource(memory, timestamp);
    }

    if (this.config.enableDisk) {
      const disks = await resourceDetector.detectDisks();
      resources.push(...disks);
      disks.forEach(disk => this.processResource(disk, timestamp));
    }

    if (this.config.enableNetwork) {
      const networks = await resourceDetector.detectNetworks();
      resources.push(...networks);
      networks.forEach(network => this.processResource(network, timestamp));
    }

    if (this.config.enableGPU) {
      const gpus = await resourceDetector.detectGPUs();
      resources.push(...gpus);
      gpus.forEach(gpu => this.processResource(gpu, timestamp));
    }

    // Emit collected resources
    this.emit('resources:collected', { resources, timestamp });
  }

  /**
   * Process individual resource
   */
  private processResource(resource: Resource, timestamp: Date): void {
    // Store resource
    this.lastResources.set(resource.id, resource);

    // Create metrics
    const metrics: ResourceMetrics = this.createMetrics(resource, timestamp);

    // Store metrics in history
    if (!this.metricsHistory.has(resource.id)) {
      this.metricsHistory.set(
        resource.id,
        createCircularBuffer<ResourceMetrics>(
          this.config.historySize
        ) as CircularBufferImpl<ResourceMetrics>
      );
    }

    const history = this.metricsHistory.get(resource.id)!;
    history.push(metrics);

    // Check thresholds
    this.checkThresholds(resource, metrics);

    // Emit metrics
    this.emit('metrics:collected', { resource, metrics });
  }

  /**
   * Create metrics from resource
   */
  private createMetrics(resource: Resource, timestamp: Date): ResourceMetrics {
    const metrics: ResourceMetrics = {
      resourceId: resource.id,
      timestamp,
      usage: 0,
      available: resource.available,
      temperature: undefined,
      performance: undefined,
      errors: undefined,
      custom: {}
    };

    switch (resource.type) {
      case 'cpu':
        const cpu = resource as CPUResource;
        metrics.usage = cpu.usage;
        metrics.temperature = cpu.temperature;
        metrics.performance = (cpu.frequency.current / cpu.frequency.max) * 100;
        metrics.custom = {
          loadAverage: cpu.loadAverage,
          cores: cpu.cores,
          threads: cpu.threads
        };
        break;

      case 'memory':
        const memory = resource as MemoryResource;
        metrics.usage = (memory.used / memory.total) * 100;
        metrics.custom = {
          cached: memory.cached,
          buffers: memory.buffers,
          swapUsage: memory.swapTotal ? (memory.swapUsed! / memory.swapTotal) * 100 : 0
        };
        break;

      case 'disk':
        const disk = resource as DiskResource;
        metrics.usage = (disk.used / disk.total) * 100;
        metrics.performance = disk.readSpeed || 0 + (disk.writeSpeed || 0);
        metrics.custom = {
          readSpeed: disk.readSpeed,
          writeSpeed: disk.writeSpeed,
          iops: disk.iops
        };
        break;

      case 'network':
        const network = resource as NetworkResource;
        metrics.usage = 0; // Network usage is more complex
        metrics.errors = network.rx.errors + network.tx.errors;
        metrics.custom = {
          rx: network.rx,
          tx: network.tx,
          speed: network.speed
        };
        break;

      case 'gpu':
        const gpu = resource as GPUResource;
        metrics.usage = gpu.utilization.gpu;
        metrics.temperature = gpu.temperature;
        metrics.performance = gpu.utilization.memory;
        metrics.custom = {
          vramUsage: (gpu.vram.used / gpu.vram.total) * 100,
          fanSpeed: gpu.fanSpeed,
          powerDraw: gpu.powerDraw
        };
        break;
    }

    return metrics;
  }

  /**
   * Check resource thresholds
   */
  private checkThresholds(resource: Resource, metrics: ResourceMetrics): void {
    if (!this.config.alertThresholds) return;

    const thresholds = this.config.alertThresholds;
    let exceeded = false;
    let thresholdType = '';
    let thresholdValue = 0;

    switch (resource.type) {
      case 'cpu':
        if (thresholds.cpu && metrics.usage > thresholds.cpu) {
          exceeded = true;
          thresholdType = 'CPU usage';
          thresholdValue = thresholds.cpu;
        }
        break;

      case 'memory':
        if (thresholds.memory && metrics.usage > thresholds.memory) {
          exceeded = true;
          thresholdType = 'Memory usage';
          thresholdValue = thresholds.memory;
        }
        break;

      case 'disk':
        if (thresholds.disk && metrics.usage > thresholds.disk) {
          exceeded = true;
          thresholdType = 'Disk usage';
          thresholdValue = thresholds.disk;
        }
        break;
    }

    if (exceeded) {
      const event: ResourceEvent = {
        id: nanoid(),
        type: 'threshold_exceeded',
        resourceId: resource.id,
        resourceType: resource.type,
        timestamp: new Date(),
        data: {
          thresholdType,
          thresholdValue,
          currentValue: metrics.usage,
          resource: resource.name
        },
        severity: metrics.usage > thresholdValue + 10 ? 'critical' : 'warning'
      };

      this.emit('threshold:exceeded', event);
      this.emit('resource:event', event);
    }
  }

  /**
   * Get current resources
   */
  getCurrentResources(): Resource[] {
    return Array.from(this.lastResources.values());
  }

  /**
   * Get resource by ID
   */
  getResource(resourceId: string): Resource | undefined {
    return this.lastResources.get(resourceId);
  }

  /**
   * Get resource metrics history
   */
  getMetricsHistory(resourceId: string): ResourceMetrics[] {
    const history = this.metricsHistory.get(resourceId);
    return history ? history.toArray() : [];
  }

  /**
   * Get all metrics history
   */
  getAllMetricsHistory(): Map<string, ResourceMetrics[]> {
    const allHistory = new Map<string, ResourceMetrics[]>();

    this.metricsHistory.forEach((buffer, resourceId) => {
      allHistory.set(resourceId, buffer.toArray());
    });

    return allHistory;
  }

  /**
   * Get resource summary
   */
  getResourceSummary(): any {
    const resources = this.getCurrentResources();
    const summary: any = {
      timestamp: new Date(),
      totalResources: resources.length,
      resourcesByType: {},
      resourcesByStatus: {},
      averageUsage: {}
    };

    // Group by type
    resources.forEach(resource => {
      if (!summary.resourcesByType[resource.type]) {
        summary.resourcesByType[resource.type] = 0;
      }
      summary.resourcesByType[resource.type]++;

      if (!summary.resourcesByStatus[resource.status]) {
        summary.resourcesByStatus[resource.status] = 0;
      }
      summary.resourcesByStatus[resource.status]++;
    });

    // Calculate average usage by type
    const usageByType: Record<string, number[]> = {};

    this.metricsHistory.forEach((buffer, resourceId) => {
      const resource = this.lastResources.get(resourceId);
      if (!resource) return;

      const latestMetric = buffer.latest();
      if (!latestMetric) return;

      if (!usageByType[resource.type]) {
        usageByType[resource.type] = [];
      }
      usageByType[resource.type].push(latestMetric.usage);
    });

    Object.entries(usageByType).forEach(([type, usages]) => {
      summary.averageUsage[type] = usages.reduce((a, b) => a + b, 0) / usages.length;
    });

    return summary;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ResourceMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart monitoring if interval changed
    if (config.interval && this.isMonitoring) {
      this.stop();
      this.start();
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.metricsHistory.forEach(buffer => buffer.clear());
    this.emit('history:cleared', { timestamp: new Date() });
  }

  /**
   * Get monitoring status
   */
  getStatus(): any {
    return {
      isMonitoring: this.isMonitoring,
      startTime: this.startTime,
      uptime: this.isMonitoring ? Date.now() - this.startTime.getTime() : 0,
      config: this.config,
      resourceCount: this.lastResources.size,
      historySize: this.metricsHistory.size
    };
  }

  /**
   * Get resource metrics
   */
  async getResourceMetrics(): Promise<any> {
    const cpu = await resourceDetector.detectCPU();
    const memory = await resourceDetector.detectMemory();
    const disks = await resourceDetector.detectDisks();
    const networks = await resourceDetector.detectNetworks();

    return {
      cpu: {
        cores: cpu.cores,
        usage: cpu.usage,
        temperature: cpu.temperature
      },
      memory: {
        total: memory.total,
        used: memory.used,
        usage: (memory.used / memory.total) * 100
      },
      disk: {
        total: disks.reduce((sum, disk) => sum + disk.total, 0),
        used: disks.reduce((sum, disk) => sum + disk.used, 0),
        usage:
          disks.length > 0
            ? (disks.reduce((sum, disk) => sum + disk.used, 0) /
                disks.reduce((sum, disk) => sum + disk.total, 0)) *
              100
            : 0
      },
      network: {
        usage: networks.length > 0 ? networks[0].speed || 0 : 0
      }
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (!this.isMonitoring) {
      this.start();
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.stop();
  }

  /**
   * Shutdown the monitor
   */
  async shutdown(): Promise<void> {
    this.stop();
    this.removeAllListeners();
  }
}
