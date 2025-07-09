/**
 * Resource Memory Manager
 * Manages persistent storage and retrieval of resource metrics and history
 */

import { EventEmitter } from 'events';
import { MCPResourceReport } from '../mcp/resource-protocol';
import { AdvancedMemoryManager } from './advanced-memory-manager';
import { logger } from '../utils/logger';

export interface ResourceMetrics {
  timestamp: number;
  serverId: string;
  cpu: {
    usage: number;
    cores: number;
    loadAverage?: number[];
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    cached?: number;
    swapUsed?: number;
    swapTotal?: number;
  };
  gpu?: Array<{
    id: string;
    name: string;
    memory: { used: number; total: number };
    utilization: number;
    temperature?: number;
    powerUsage?: number;
  }>;
  network: {
    latency: number;
    bandwidth: number;
    packetsIn?: number;
    packetsOut?: number;
    bytesIn?: number;
    bytesOut?: number;
  };
  disk?: {
    used: number;
    total: number;
    available: number;
    iops?: number;
    readSpeed?: number;
    writeSpeed?: number;
  };
  custom?: Record<string, number>;
}

export interface ResourceEvent {
  id: string;
  timestamp: number;
  type: 'alert' | 'optimization' | 'deployment' | 'failure' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  serverId?: string;
  message: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: number;
}

export interface ResourcePrediction {
  timestamp: number;
  serverId: string;
  horizon: '1h' | '6h' | '24h' | '7d';
  predictions: Record<
    string,
    {
      value: number;
      confidence: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }
  >;
  algorithm: string;
  accuracy?: number;
}

export interface ResourceMemoryEntry {
  timestamp: number;
  serverId: string;
  metrics: ResourceMetrics;
  events: ResourceEvent[];
  predictions?: ResourcePrediction[];
  annotations?: Array<{
    timestamp: number;
    user: string;
    note: string;
    type: 'info' | 'warning' | 'action';
  }>;
}

export interface ResourceQuery {
  serverId?: string;
  serverIds?: string[];
  startTime?: number;
  endTime?: number;
  metrics?: string[];
  eventTypes?: string[];
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
  offset?: number;
  aggregation?: 'none' | 'avg' | 'max' | 'min' | 'sum';
  interval?: number; // Aggregation interval in milliseconds
}

export interface ResourceSummary {
  serverId: string;
  period: { start: number; end: number };
  metrics: {
    cpu: { avg: number; max: number; min: number };
    memory: { avg: number; max: number; min: number };
    network: { avgLatency: number; maxLatency: number };
    uptime: number; // Percentage
  };
  events: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  trends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
}

export class ResourceMemoryManager extends EventEmitter {
  private memoryManager: AdvancedMemoryManager;
  private metricsCache: Map<string, ResourceMemoryEntry[]>;
  private eventCache: Map<string, ResourceEvent>;
  private predictionCache: Map<string, ResourcePrediction>;
  private retentionPeriod: number;
  private cleanupInterval?: NodeJS.Timeout;
  private indexingEnabled: boolean;

  constructor(
    memoryManager: AdvancedMemoryManager,
    retentionPeriod: number = 30 * 24 * 60 * 60 * 1000, // 30 days
    indexingEnabled: boolean = true
  ) {
    super();
    this.memoryManager = memoryManager;
    this.metricsCache = new Map();
    this.eventCache = new Map();
    this.predictionCache = new Map();
    this.retentionPeriod = retentionPeriod;
    this.indexingEnabled = indexingEnabled;
  }

  /**
   * Initialize resource memory manager
   */
  async initialize(): Promise<void> {
    await this.memoryManager.initialize();

    // Load cached data
    await this.loadCaches();

    // Set up cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      24 * 60 * 60 * 1000 // Daily cleanup
    );

    logger.info('Resource memory manager initialized');
  }

  /**
   * Store resource metrics
   */
  async storeMetrics(report: MCPResourceReport): Promise<void> {
    const entry: ResourceMemoryEntry = {
      timestamp: report.timestamp,
      serverId: report.serverId,
      metrics: this.convertReportToMetrics(report),
      events: []
    };

    // Store in memory
    const key = `metrics:${report.serverId}:${report.timestamp}`;
    await this.memoryManager.store(key, entry);

    // Update cache
    this.updateMetricsCache(report.serverId, entry);

    // Emit event
    this.emit('metrics-stored', entry);

    logger.debug(
      `Stored metrics for server ${report.serverId} at ${new Date(report.timestamp).toISOString()}`
    );
  }

  /**
   * Store resource event
   */
  async storeEvent(event: ResourceEvent): Promise<void> {
    const key = `event:${event.id}`;
    await this.memoryManager.store(key, event);

    // Update cache
    this.eventCache.set(event.id, event);

    // Index by server and timestamp if enabled
    if (this.indexingEnabled && event.serverId) {
      const indexKey = `event_index:${event.serverId}:${event.timestamp}`;
      await this.memoryManager.store(indexKey, event.id);
    }

    // Emit event
    this.emit('event-stored', event);

    logger.debug(`Stored event ${event.id} for server ${event.serverId}`);
  }

  /**
   * Store resource prediction
   */
  async storePrediction(prediction: ResourcePrediction): Promise<void> {
    const key = `prediction:${prediction.serverId}:${prediction.horizon}:${prediction.timestamp}`;
    await this.memoryManager.store(key, prediction);

    // Update cache
    this.predictionCache.set(key, prediction);

    // Emit event
    this.emit('prediction-stored', prediction);

    logger.debug(`Stored prediction for server ${prediction.serverId} (${prediction.horizon})`);
  }

  /**
   * Query resource metrics
   */
  async queryMetrics(query: ResourceQuery): Promise<ResourceMemoryEntry[]> {
    const {
      serverId,
      serverIds,
      startTime,
      endTime,
      metrics,
      limit = 1000,
      offset = 0,
      aggregation = 'none',
      interval
    } = query;

    let results: ResourceMemoryEntry[] = [];

    // Determine servers to query
    const targetServers = serverId ? [serverId] : serverIds || (await this.getAllServerIds());

    // Query each server
    for (const server of targetServers) {
      const serverResults = await this.queryServerMetrics(server, {
        startTime,
        endTime,
        metrics,
        limit,
        offset
      });

      results.push(...serverResults);
    }

    // Sort by timestamp
    results.sort((a, b) => a.timestamp - b.timestamp);

    // Apply aggregation if requested
    if (aggregation !== 'none' && interval) {
      results = this.aggregateMetrics(results, aggregation, interval);
    }

    // Apply limit
    if (limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Query resource events
   */
  async queryEvents(query: ResourceQuery): Promise<ResourceEvent[]> {
    const {
      serverId,
      serverIds,
      startTime,
      endTime,
      eventTypes,
      minSeverity,
      limit = 1000,
      offset = 0
    } = query;

    let results: ResourceEvent[] = [];

    // Query from cache first
    const cachedEvents = Array.from(this.eventCache.values());

    // Filter cached events
    results = cachedEvents.filter(event => {
      // Server filter
      if (serverId && event.serverId !== serverId) return false;
      if (serverIds && (!event.serverId || !serverIds.includes(event.serverId))) return false;

      // Time filter
      if (startTime && event.timestamp < startTime) return false;
      if (endTime && event.timestamp > endTime) return false;

      // Event type filter
      if (eventTypes && !eventTypes.includes(event.type)) return false;

      // Severity filter
      if (minSeverity) {
        const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        if (severityOrder[event.severity] < severityOrder[minSeverity]) return false;
      }

      return true;
    });

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    if (offset > 0) {
      results = results.slice(offset);
    }

    if (limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Query resource predictions
   */
  async queryPredictions(
    query: ResourceQuery & {
      horizon?: '1h' | '6h' | '24h' | '7d';
      algorithm?: string;
    }
  ): Promise<ResourcePrediction[]> {
    const { serverId, serverIds, startTime, endTime, horizon, algorithm, limit = 100 } = query;

    let results: ResourcePrediction[] = [];

    // Query from cache
    const cachedPredictions = Array.from(this.predictionCache.values());

    // Filter predictions
    results = cachedPredictions.filter(prediction => {
      // Server filter
      if (serverId && prediction.serverId !== serverId) return false;
      if (serverIds && !serverIds.includes(prediction.serverId)) return false;

      // Time filter
      if (startTime && prediction.timestamp < startTime) return false;
      if (endTime && prediction.timestamp > endTime) return false;

      // Horizon filter
      if (horizon && prediction.horizon !== horizon) return false;

      // Algorithm filter
      if (algorithm && prediction.algorithm !== algorithm) return false;

      return true;
    });

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Get resource summary for a server
   */
  async getResourceSummary(
    serverId: string,
    startTime: number,
    endTime: number
  ): Promise<ResourceSummary> {
    // Query metrics
    const metrics = await this.queryMetrics({
      serverId,
      startTime,
      endTime,
      limit: 10000 // Large limit to get all data
    });

    // Query events
    const events = await this.queryEvents({
      serverId,
      startTime,
      endTime,
      limit: 10000
    });

    // Calculate summary
    const summary: ResourceSummary = {
      serverId,
      period: { start: startTime, end: endTime },
      metrics: this.calculateMetricsSummary(metrics),
      events: this.calculateEventsSummary(events),
      trends: this.calculateTrends(metrics)
    };

    return summary;
  }

  /**
   * Get server health history
   */
  async getServerHealthHistory(
    serverId: string,
    duration: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<Array<{ timestamp: number; status: string; metrics: any }>> {
    const endTime = Date.now();
    const startTime = endTime - duration;

    const metrics = await this.queryMetrics({
      serverId,
      startTime,
      endTime,
      limit: 1000
    });

    return metrics.map(entry => ({
      timestamp: entry.timestamp,
      status: this.determineHealthStatus(entry.metrics),
      metrics: {
        cpu: entry.metrics.cpu.usage,
        memory: (entry.metrics.memory.used / entry.metrics.memory.total) * 100,
        network: entry.metrics.network.latency
      }
    }));
  }

  /**
   * Get cluster overview
   */
  async getClusterOverview(
    duration: number = 60 * 60 * 1000 // 1 hour
  ): Promise<{
    totalServers: number;
    healthyServers: number;
    alerts: number;
    averageUtilization: Record<string, number>;
    trends: Record<string, 'up' | 'down' | 'stable'>;
  }> {
    const endTime = Date.now();
    const startTime = endTime - duration;

    const allServers = await this.getAllServerIds();
    const recentMetrics = await this.queryMetrics({
      startTime,
      endTime,
      limit: 5000
    });

    const recentEvents = await this.queryEvents({
      startTime,
      endTime,
      eventTypes: ['alert'],
      limit: 1000
    });

    // Calculate cluster metrics
    const healthyServers = new Set(
      recentMetrics
        .filter(m => this.determineHealthStatus(m.metrics) === 'healthy')
        .map(m => m.serverId)
    ).size;

    const averageUtilization = this.calculateClusterUtilization(recentMetrics);
    const trends = this.calculateClusterTrends(recentMetrics);

    return {
      totalServers: allServers.length,
      healthyServers,
      alerts: recentEvents.length,
      averageUtilization,
      trends
    };
  }

  /**
   * Add annotation to resource data
   */
  async addAnnotation(
    serverId: string,
    timestamp: number,
    annotation: {
      user: string;
      note: string;
      type: 'info' | 'warning' | 'action';
    }
  ): Promise<void> {
    const key = `annotation:${serverId}:${timestamp}:${Date.now()}`;
    await this.memoryManager.store(key, annotation);

    logger.debug(`Added annotation for server ${serverId} at ${new Date(timestamp).toISOString()}`);
  }

  /**
   * Get annotations for a time range
   */
  async getAnnotations(
    serverId: string,
    startTime: number,
    endTime: number
  ): Promise<Array<{ timestamp: number; user: string; note: string; type: string }>> {
    // This would query annotations from storage
    // For now, return empty array
    return [];
  }

  /**
   * Clean up old data
   */
  private async cleanup(): Promise<void> {
    const cutoffTime = Date.now() - this.retentionPeriod;

    logger.info(`Starting resource memory cleanup (cutoff: ${new Date(cutoffTime).toISOString()})`);

    try {
      // Clean up metrics cache
      for (const [serverId, entries] of this.metricsCache.entries()) {
        const filtered = entries.filter(entry => entry.timestamp > cutoffTime);
        this.metricsCache.set(serverId, filtered);
      }

      // Clean up event cache
      for (const [eventId, event] of this.eventCache.entries()) {
        if (event.timestamp < cutoffTime) {
          this.eventCache.delete(eventId);
        }
      }

      // Clean up prediction cache
      for (const [key, prediction] of this.predictionCache.entries()) {
        if (prediction.timestamp < cutoffTime) {
          this.predictionCache.delete(key);
        }
      }

      // Clean up storage
      await this.memoryManager.cleanup();

      logger.info('Resource memory cleanup completed');
    } catch (error) {
      logger.error('Resource memory cleanup failed:', error);
    }
  }

  /**
   * Convert MCPResourceReport to ResourceMetrics
   */
  private convertReportToMetrics(report: MCPResourceReport): ResourceMetrics {
    return {
      timestamp: report.timestamp,
      serverId: report.serverId,
      cpu: report.resources.cpu,
      memory: report.resources.memory,
      gpu: report.resources.gpu,
      network: report.resources.network,
      disk: report.resources.disk
    };
  }

  /**
   * Update metrics cache
   */
  private updateMetricsCache(serverId: string, entry: ResourceMemoryEntry): void {
    if (!this.metricsCache.has(serverId)) {
      this.metricsCache.set(serverId, []);
    }

    const entries = this.metricsCache.get(serverId)!;
    entries.push(entry);

    // Keep only recent entries in cache
    const maxCacheSize = 1000;
    if (entries.length > maxCacheSize) {
      entries.sort((a, b) => b.timestamp - a.timestamp);
      entries.splice(maxCacheSize);
    }
  }

  /**
   * Load caches from storage
   */
  private async loadCaches(): Promise<void> {
    // Load recent metrics
    const recentTime = Date.now() - 60 * 60 * 1000; // Last hour
    const serverIds = await this.getAllServerIds();

    for (const serverId of serverIds) {
      const entries = await this.queryServerMetrics(serverId, {
        startTime: recentTime,
        limit: 100
      });

      this.metricsCache.set(serverId, entries);
    }

    // Load recent events
    const recentEvents = await this.queryEvents({
      startTime: recentTime,
      limit: 1000
    });

    for (const event of recentEvents) {
      this.eventCache.set(event.id, event);
    }

    logger.debug('Resource memory caches loaded');
  }

  /**
   * Query server metrics from storage
   */
  private async queryServerMetrics(
    serverId: string,
    query: {
      startTime?: number;
      endTime?: number;
      metrics?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<ResourceMemoryEntry[]> {
    // Check cache first
    const cached = this.metricsCache.get(serverId);
    if (cached) {
      return cached.filter(entry => {
        if (query.startTime && entry.timestamp < query.startTime) return false;
        if (query.endTime && entry.timestamp > query.endTime) return false;
        return true;
      });
    }

    // Query from storage
    const pattern = `metrics:${serverId}:*`;
    const keys = await this.memoryManager.scan(pattern);

    const results: ResourceMemoryEntry[] = [];
    for (const key of keys) {
      const entry = await this.memoryManager.retrieve(key);
      if (entry) {
        results.push(entry as ResourceMemoryEntry);
      }
    }

    return results;
  }

  /**
   * Get all server IDs
   */
  private async getAllServerIds(): Promise<string[]> {
    const pattern = 'metrics:*';
    const keys = await this.memoryManager.scan(pattern);

    const serverIds = new Set<string>();
    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        serverIds.add(parts[1]);
      }
    }

    return Array.from(serverIds);
  }

  /**
   * Aggregate metrics
   */
  private aggregateMetrics(
    entries: ResourceMemoryEntry[],
    aggregation: 'avg' | 'max' | 'min' | 'sum',
    interval: number
  ): ResourceMemoryEntry[] {
    const buckets = new Map<number, ResourceMemoryEntry[]>();

    // Group entries by time interval
    for (const entry of entries) {
      const bucketTime = Math.floor(entry.timestamp / interval) * interval;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)!.push(entry);
    }

    // Aggregate each bucket
    const aggregated: ResourceMemoryEntry[] = [];
    for (const [bucketTime, bucketEntries] of buckets.entries()) {
      const aggregatedEntry = this.aggregateBucket(bucketEntries, aggregation);
      aggregatedEntry.timestamp = bucketTime;
      aggregated.push(aggregatedEntry);
    }

    return aggregated;
  }

  /**
   * Aggregate a bucket of entries
   */
  private aggregateBucket(
    entries: ResourceMemoryEntry[],
    aggregation: 'avg' | 'max' | 'min' | 'sum'
  ): ResourceMemoryEntry {
    if (entries.length === 0) {
      throw new Error('Cannot aggregate empty bucket');
    }

    if (entries.length === 1) {
      return entries[0];
    }

    // Create base entry
    const base = entries[0];
    const aggregated: ResourceMemoryEntry = {
      timestamp: base.timestamp,
      serverId: base.serverId,
      metrics: {
        timestamp: base.metrics.timestamp,
        serverId: base.metrics.serverId,
        cpu: { usage: 0, cores: base.metrics.cpu.cores },
        memory: { used: 0, total: base.metrics.memory.total, available: 0 },
        network: { latency: 0, bandwidth: base.metrics.network.bandwidth }
      },
      events: []
    };

    // Aggregate CPU
    const cpuValues = entries.map(e => e.metrics.cpu.usage);
    aggregated.metrics.cpu.usage = this.applyAggregation(cpuValues, aggregation);

    // Aggregate Memory
    const memoryUsedValues = entries.map(e => e.metrics.memory.used);
    const memoryAvailableValues = entries.map(e => e.metrics.memory.available);
    aggregated.metrics.memory.used = this.applyAggregation(memoryUsedValues, aggregation);
    aggregated.metrics.memory.available = this.applyAggregation(memoryAvailableValues, aggregation);

    // Aggregate Network
    const latencyValues = entries.map(e => e.metrics.network.latency);
    aggregated.metrics.network.latency = this.applyAggregation(latencyValues, aggregation);

    // Combine events
    const allEvents = entries.flatMap(e => e.events);
    aggregated.events = Array.from(new Set(allEvents));

    return aggregated;
  }

  /**
   * Apply aggregation function to values
   */
  private applyAggregation(values: number[], aggregation: 'avg' | 'max' | 'min' | 'sum'): number {
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      default:
        return values[0];
    }
  }

  /**
   * Calculate metrics summary
   */
  private calculateMetricsSummary(metrics: ResourceMemoryEntry[]): ResourceSummary['metrics'] {
    if (metrics.length === 0) {
      return {
        cpu: { avg: 0, max: 0, min: 0 },
        memory: { avg: 0, max: 0, min: 0 },
        network: { avgLatency: 0, maxLatency: 0 },
        uptime: 0
      };
    }

    const cpuValues = metrics.map(m => m.metrics.cpu.usage);
    const memoryValues = metrics.map(m => (m.metrics.memory.used / m.metrics.memory.total) * 100);
    const latencyValues = metrics.map(m => m.metrics.network.latency);

    return {
      cpu: {
        avg: this.applyAggregation(cpuValues, 'avg'),
        max: this.applyAggregation(cpuValues, 'max'),
        min: this.applyAggregation(cpuValues, 'min')
      },
      memory: {
        avg: this.applyAggregation(memoryValues, 'avg'),
        max: this.applyAggregation(memoryValues, 'max'),
        min: this.applyAggregation(memoryValues, 'min')
      },
      network: {
        avgLatency: this.applyAggregation(latencyValues, 'avg'),
        maxLatency: this.applyAggregation(latencyValues, 'max')
      },
      uptime: (metrics.length / (metrics.length || 1)) * 100 // Simplified uptime calculation
    };
  }

  /**
   * Calculate events summary
   */
  private calculateEventsSummary(events: ResourceEvent[]): ResourceSummary['events'] {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    }

    return {
      total: events.length,
      byType,
      bySeverity
    };
  }

  /**
   * Calculate trends
   */
  private calculateTrends(
    metrics: ResourceMemoryEntry[]
  ): Record<string, 'increasing' | 'decreasing' | 'stable'> {
    if (metrics.length < 2) {
      return {};
    }

    const trends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};

    // Calculate CPU trend
    const cpuValues = metrics.map(m => m.metrics.cpu.usage);
    trends.cpu = this.calculateTrend(cpuValues);

    // Calculate Memory trend
    const memoryValues = metrics.map(m => (m.metrics.memory.used / m.metrics.memory.total) * 100);
    trends.memory = this.calculateTrend(memoryValues);

    // Calculate Network trend
    const latencyValues = metrics.map(m => m.metrics.network.latency);
    trends.network = this.calculateTrend(latencyValues);

    return trends;
  }

  /**
   * Calculate trend for a series of values
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate cluster utilization
   */
  private calculateClusterUtilization(metrics: ResourceMemoryEntry[]): Record<string, number> {
    if (metrics.length === 0) {
      return {};
    }

    const cpuValues = metrics.map(m => m.metrics.cpu.usage);
    const memoryValues = metrics.map(m => (m.metrics.memory.used / m.metrics.memory.total) * 100);

    return {
      cpu: this.applyAggregation(cpuValues, 'avg'),
      memory: this.applyAggregation(memoryValues, 'avg')
    };
  }

  /**
   * Calculate cluster trends
   */
  private calculateClusterTrends(
    metrics: ResourceMemoryEntry[]
  ): Record<string, 'up' | 'down' | 'stable'> {
    const trends = this.calculateTrends(metrics);

    return {
      cpu: trends.cpu === 'increasing' ? 'up' : trends.cpu === 'decreasing' ? 'down' : 'stable',
      memory:
        trends.memory === 'increasing' ? 'up' : trends.memory === 'decreasing' ? 'down' : 'stable',
      network:
        trends.network === 'increasing' ? 'up' : trends.network === 'decreasing' ? 'down' : 'stable'
    };
  }

  /**
   * Determine health status from metrics
   */
  private determineHealthStatus(metrics: ResourceMetrics): string {
    const cpuUsage = metrics.cpu.usage;
    const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;

    if (cpuUsage > 90 || memoryUsage > 95) return 'critical';
    if (cpuUsage > 80 || memoryUsage > 85) return 'degraded';
    return 'healthy';
  }

  /**
   * Shutdown the resource memory manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.memoryManager.shutdown();

    logger.info('Resource memory manager shutdown');
  }
}
