/**
 * Resource Pressure Detection System
 * Monitors system resources and detects pressure conditions to prevent failures
 */

import { EventEmitter } from 'node:events';
import { IResourceMetrics, ResourceType } from '../types';
import { CircularBuffer } from '../utils/circular-buffer';
import { logger } from '../../utils/logger';

export interface PressureThresholds {
  // CPU pressure thresholds
  cpu: {
    normal: number; // 0-70%
    warning: number; // 70-85%
    critical: number; // 85-95%
    emergency: number; // 95%+
  };

  // Memory pressure thresholds
  memory: {
    normal: number; // 0-70%
    warning: number; // 70-85%
    critical: number; // 85-95%
    emergency: number; // 95%+
  };

  // Disk pressure thresholds
  disk: {
    normal: number; // 0-80%
    warning: number; // 80-90%
    critical: number; // 90-95%
    emergency: number; // 95%+
  };

  // Network pressure thresholds (utilization %)
  network: {
    normal: number; // 0-60%
    warning: number; // 60-80%
    critical: number; // 80-90%
    emergency: number; // 90%+
  };
}

export interface PressureLevel {
  level: 'normal' | 'warning' | 'critical' | 'emergency';
  value: number;
  threshold: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  prediction?: {
    timeToThreshold: number; // milliseconds
    confidence: number; // 0-1
  };
}

export interface PressureAlert {
  id: string;
  timestamp: number;
  type: ResourceType;
  level: PressureLevel['level'];
  message: string;
  currentValue: number;
  threshold: number;
  trend: PressureLevel['trend'];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoActions: string[];
}

export interface PressureAnalysis {
  timestamp: number;
  overall: PressureLevel;
  resources: {
    cpu: PressureLevel;
    memory: PressureLevel;
    disk: PressureLevel;
    network: PressureLevel;
  };
  predictions: {
    nextAlert?: {
      type: ResourceType;
      level: PressureLevel['level'];
      timeToAlert: number;
      confidence: number;
    };
    exhaustion?: {
      type: ResourceType;
      timeToExhaustion: number;
      confidence: number;
    };
  };
  mitigationActions: Array<{
    type: 'throttle' | 'scale' | 'cleanup' | 'redistribute';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
}

export class PressureDetector extends EventEmitter {
  private thresholds: PressureThresholds;
  private history: Map<ResourceType, CircularBuffer<number>>;
  private alertHistory: CircularBuffer<PressureAlert>;
  private isEnabled: boolean;
  private monitoringInterval?: NodeJS.Timeout;
  private lastAnalysis?: PressureAnalysis;
  private alertCooldown: Map<string, number>;
  private currentMetrics?: IResourceMetrics;

  constructor(thresholds?: Partial<PressureThresholds>) {
    super();

    this.thresholds = this.mergeThresholds(thresholds);
    this.history = new Map();
    this.alertHistory = new CircularBuffer(100);
    this.alertCooldown = new Map();
    this.isEnabled = false;

    // Initialize history buffers
    this.initializeHistoryBuffers();
  }

  /**
   * Initialize the pressure detector
   */
  async initialize(): Promise<void> {
    this.isEnabled = true;
    logger.info('Pressure detector initialized');
  }

  /**
   * Start monitoring with specified interval
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(async () => {
      await this.performPressureCheck();
    }, intervalMs);

    logger.info(`Pressure monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    logger.info('Pressure monitoring stopped');
  }

  /**
   * Update current metrics
   */
  updateMetrics(metrics: IResourceMetrics): void {
    this.currentMetrics = metrics;

    // Store in history
    this.history.get(ResourceType.CPU)?.add(metrics.cpu.usage);
    this.history.get(ResourceType.Memory)?.add(metrics.memory.usage);
    this.history.get(ResourceType.Disk)?.add(metrics.disk.usage);
    this.history.get(ResourceType.Network)?.add(metrics.network.usage);
  }

  /**
   * Analyze current pressure levels
   */
  async analyzePressure(): Promise<PressureAnalysis> {
    if (!this.currentMetrics) {
      throw new Error('No metrics available for pressure analysis');
    }

    const analysis: PressureAnalysis = {
      timestamp: Date.now(),
      overall: await this.calculateOverallPressure(),
      resources: {
        cpu: await this.calculateResourcePressure(ResourceType.CPU, this.currentMetrics.cpu.usage),
        memory: await this.calculateResourcePressure(
          ResourceType.Memory,
          this.currentMetrics.memory.usage
        ),
        disk: await this.calculateResourcePressure(
          ResourceType.Disk,
          this.currentMetrics.disk.usage
        ),
        network: await this.calculateResourcePressure(
          ResourceType.Network,
          this.currentMetrics.network.usage
        )
      },
      predictions: await this.generatePredictions(),
      mitigationActions: await this.generateMitigationActions()
    };

    this.lastAnalysis = analysis;
    return analysis;
  }

  /**
   * Get current pressure status
   */
  getCurrentPressure(): PressureAnalysis | undefined {
    return this.lastAnalysis;
  }

  /**
   * Check if system is under pressure
   */
  isUnderPressure(): boolean {
    if (!this.lastAnalysis) return false;

    return (
      this.lastAnalysis.overall.level !== 'normal' ||
      Object.values(this.lastAnalysis.resources).some(r => r.level !== 'normal')
    );
  }

  /**
   * Get pressure alert history
   */
  getAlertHistory(limit?: number): PressureAlert[] {
    const alerts = this.alertHistory.toArray();
    return limit ? alerts.slice(-limit) : alerts;
  }

  /**
   * Update pressure thresholds
   */
  updateThresholds(newThresholds: Partial<PressureThresholds>): void {
    this.thresholds = this.mergeThresholds(newThresholds);
    logger.info('Pressure thresholds updated');
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PressureThresholds {
    return { ...this.thresholds };
  }

  /**
   * Perform pressure check
   */
  private async performPressureCheck(): Promise<void> {
    if (!this.isEnabled || !this.currentMetrics) return;

    try {
      const analysis = await this.analyzePressure();

      // Check for alerts
      await this.checkForAlerts(analysis);

      // Emit analysis event
      this.emit('pressure-analysis', analysis);
    } catch (error) {
      logger.error('Pressure check failed:', error);
    }
  }

  /**
   * Check for pressure alerts
   */
  private async checkForAlerts(analysis: PressureAnalysis): Promise<void> {
    const resources = [
      { type: ResourceType.CPU, pressure: analysis.resources.cpu },
      { type: ResourceType.Memory, pressure: analysis.resources.memory },
      { type: ResourceType.Disk, pressure: analysis.resources.disk },
      { type: ResourceType.Network, pressure: analysis.resources.network }
    ];

    for (const { type, pressure } of resources) {
      if (pressure.level !== 'normal') {
        await this.generateAlert(type, pressure);
      }
    }
  }

  /**
   * Generate pressure alert
   */
  private async generateAlert(type: ResourceType, pressure: PressureLevel): Promise<void> {
    const alertKey = `${type}-${pressure.level}`;
    const now = Date.now();

    // Check cooldown (prevent spam)
    const lastAlert = this.alertCooldown.get(alertKey);
    if (lastAlert && now - lastAlert < 30000) {
      // 30 second cooldown
      return;
    }

    const alert: PressureAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      type,
      level: pressure.level,
      message: this.generateAlertMessage(type, pressure),
      currentValue: pressure.value,
      threshold: pressure.threshold,
      trend: pressure.trend,
      recommendations: this.generateRecommendations(type, pressure),
      severity: this.mapLevelToSeverity(pressure.level),
      autoActions: this.generateAutoActions(type, pressure)
    };

    // Store alert
    this.alertHistory.add(alert);
    this.alertCooldown.set(alertKey, now);

    // Emit alert event
    this.emit('pressure-alert', alert);

    logger.warn(`Pressure alert: ${alert.message}`);
  }

  /**
   * Calculate overall pressure level
   */
  private async calculateOverallPressure(): Promise<PressureLevel> {
    if (!this.currentMetrics) {
      throw new Error('No metrics available');
    }

    const metrics = this.currentMetrics;
    const pressures = [
      await this.calculateResourcePressure(ResourceType.CPU, metrics.cpu.usage),
      await this.calculateResourcePressure(ResourceType.Memory, metrics.memory.usage),
      await this.calculateResourcePressure(ResourceType.Disk, metrics.disk.usage),
      await this.calculateResourcePressure(ResourceType.Network, metrics.network.usage)
    ];

    // Find highest pressure level
    const levelPriority = { normal: 0, warning: 1, critical: 2, emergency: 3 };
    const highestPressure = pressures.reduce((highest, current) =>
      levelPriority[current.level] > levelPriority[highest.level] ? current : highest
    );

    return {
      level: highestPressure.level,
      value: Math.max(...pressures.map(p => p.value)),
      threshold: highestPressure.threshold,
      trend: this.calculateTrend(pressures.map(p => p.value))
    };
  }

  /**
   * Calculate resource pressure level
   */
  private async calculateResourcePressure(
    type: ResourceType,
    value: number
  ): Promise<PressureLevel> {
    const thresholds = this.getResourceThresholds(type);

    let level: PressureLevel['level'];
    let threshold: number;

    if (value >= thresholds.emergency) {
      level = 'emergency';
      threshold = thresholds.emergency;
    } else if (value >= thresholds.critical) {
      level = 'critical';
      threshold = thresholds.critical;
    } else if (value >= thresholds.warning) {
      level = 'warning';
      threshold = thresholds.warning;
    } else {
      level = 'normal';
      threshold = thresholds.normal;
    }

    const trend = this.calculateResourceTrend(type);
    const prediction = await this.predictResourceExhaustion(type, value, trend);

    return {
      level,
      value,
      threshold,
      trend,
      prediction
    };
  }

  /**
   * Calculate resource trend
   */
  private calculateResourceTrend(type: ResourceType): PressureLevel['trend'] {
    const history = this.history.get(type);
    if (!history || history.size() < 3) return 'stable';

    const values = history.toArray();
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);

    if (recent.length < 3 || older.length < 3) return 'stable';

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const threshold = 2; // 2% change threshold

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate general trend from values
   */
  private calculateTrend(values: number[]): PressureLevel['trend'] {
    if (values.length < 2) return 'stable';

    const sum = values.reduce((sum, val, index) => sum + val * (index + 1), 0);
    const weightedSum = values.reduce((sum, val, index) => sum + (index + 1), 0);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    const trend = sum / weightedSum - avg;

    if (trend > 2) return 'increasing';
    if (trend < -2) return 'decreasing';
    return 'stable';
  }

  /**
   * Predict resource exhaustion
   */
  private async predictResourceExhaustion(
    type: ResourceType,
    currentValue: number,
    trend: PressureLevel['trend']
  ): Promise<PressureLevel['prediction']> {
    if (trend !== 'increasing') return undefined;

    const history = this.history.get(type);
    if (!history || history.size() < 5) return undefined;

    const values = history.toArray();
    const timeInterval = 5000; // 5 second intervals

    // Simple linear regression for prediction
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    if (slope <= 0) return undefined;

    const thresholds = this.getResourceThresholds(type);
    const timeToWarning = ((thresholds.warning - currentValue) / slope) * timeInterval;
    const timeToEmergency = ((thresholds.emergency - currentValue) / slope) * timeInterval;

    const targetTime = timeToWarning > 0 ? timeToWarning : timeToEmergency;
    const confidence = Math.min(0.9, Math.max(0.1, 1 - Math.abs(slope) / 10));

    return {
      timeToThreshold: targetTime,
      confidence
    };
  }

  /**
   * Generate predictions
   */
  private async generatePredictions(): Promise<PressureAnalysis['predictions']> {
    if (!this.currentMetrics) return {};

    const predictions: PressureAnalysis['predictions'] = {};

    // Find next likely alert
    const resources = [
      { type: ResourceType.CPU, value: this.currentMetrics.cpu.usage },
      { type: ResourceType.Memory, value: this.currentMetrics.memory.usage },
      { type: ResourceType.Disk, value: this.currentMetrics.disk.usage },
      { type: ResourceType.Network, value: this.currentMetrics.network.usage }
    ];

    let nextAlert: PressureAnalysis['predictions']['nextAlert'];
    let shortestTime = Infinity;

    for (const { type, value } of resources) {
      const trend = this.calculateResourceTrend(type);
      const prediction = await this.predictResourceExhaustion(type, value, trend);

      if (prediction && prediction.timeToThreshold < shortestTime) {
        shortestTime = prediction.timeToThreshold;
        const thresholds = this.getResourceThresholds(type);

        let level: PressureLevel['level'] = 'warning';
        if (value >= thresholds.critical) level = 'emergency';
        else if (value >= thresholds.warning) level = 'critical';

        nextAlert = {
          type,
          level,
          timeToAlert: prediction.timeToThreshold,
          confidence: prediction.confidence
        };
      }
    }

    if (nextAlert) {
      predictions.nextAlert = nextAlert;
    }

    return predictions;
  }

  /**
   * Generate mitigation actions
   */
  private async generateMitigationActions(): Promise<PressureAnalysis['mitigationActions']> {
    if (!this.lastAnalysis) return [];

    const actions: PressureAnalysis['mitigationActions'] = [];

    // Check each resource for mitigation needs
    const resources = [
      { type: ResourceType.CPU, pressure: this.lastAnalysis.resources.cpu },
      { type: ResourceType.Memory, pressure: this.lastAnalysis.resources.memory },
      { type: ResourceType.Disk, pressure: this.lastAnalysis.resources.disk },
      { type: ResourceType.Network, pressure: this.lastAnalysis.resources.network }
    ];

    for (const { type, pressure } of resources) {
      if (pressure.level === 'emergency') {
        actions.push({
          type: 'throttle',
          urgency: 'critical',
          description: `Emergency throttling for ${type} resources`,
          impact: 'Immediate performance reduction but system stability maintained',
          riskLevel: 'low'
        });
      } else if (pressure.level === 'critical') {
        actions.push({
          type: 'scale',
          urgency: 'high',
          description: `Scale up ${type} resources`,
          impact: 'Additional resources allocated to prevent exhaustion',
          riskLevel: 'medium'
        });
      } else if (pressure.level === 'warning') {
        actions.push({
          type: 'cleanup',
          urgency: 'medium',
          description: `Clean up unused ${type} resources`,
          impact: 'Free up resources without performance impact',
          riskLevel: 'low'
        });
      }
    }

    return actions;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(type: ResourceType, pressure: PressureLevel): string {
    const percentage = Math.round(pressure.value);
    const trend =
      pressure.trend === 'increasing'
        ? ' and increasing'
        : pressure.trend === 'decreasing'
          ? ' but decreasing'
          : '';

    return `${type} pressure is ${pressure.level} (${percentage}%${trend})`;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(type: ResourceType, pressure: PressureLevel): string[] {
    const recommendations: string[] = [];

    switch (pressure.level) {
      case 'emergency':
        recommendations.push(`Immediately reduce ${type} load`);
        recommendations.push('Consider emergency scaling');
        recommendations.push('Enable aggressive resource cleanup');
        break;

      case 'critical':
        recommendations.push(`Scale up ${type} resources`);
        recommendations.push('Review resource allocation policies');
        recommendations.push('Consider load balancing improvements');
        break;

      case 'warning':
        recommendations.push(`Monitor ${type} usage closely`);
        recommendations.push('Review resource optimization opportunities');
        recommendations.push('Consider proactive scaling');
        break;
    }

    if (pressure.trend === 'increasing') {
      recommendations.push('Address increasing trend before it becomes critical');
    }

    return recommendations;
  }

  /**
   * Generate auto actions
   */
  private generateAutoActions(type: ResourceType, pressure: PressureLevel): string[] {
    const actions: string[] = [];

    if (pressure.level === 'emergency') {
      actions.push('enable-emergency-throttling');
      actions.push('trigger-resource-cleanup');
      actions.push('alert-administrators');
    } else if (pressure.level === 'critical') {
      actions.push('initiate-auto-scaling');
      actions.push('optimize-resource-allocation');
    } else if (pressure.level === 'warning') {
      actions.push('schedule-resource-cleanup');
      actions.push('prepare-scaling-resources');
    }

    return actions;
  }

  /**
   * Map pressure level to severity
   */
  private mapLevelToSeverity(level: PressureLevel['level']): PressureAlert['severity'] {
    switch (level) {
      case 'emergency':
        return 'critical';
      case 'critical':
        return 'high';
      case 'warning':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Get resource thresholds
   */
  private getResourceThresholds(type: ResourceType): PressureThresholds[keyof PressureThresholds] {
    switch (type) {
      case ResourceType.CPU:
        return this.thresholds.cpu;
      case ResourceType.Memory:
        return this.thresholds.memory;
      case ResourceType.Disk:
        return this.thresholds.disk;
      case ResourceType.Network:
        return this.thresholds.network;
      default:
        return this.thresholds.cpu;
    }
  }

  /**
   * Merge thresholds with defaults
   */
  private mergeThresholds(thresholds?: Partial<PressureThresholds>): PressureThresholds {
    const defaults: PressureThresholds = {
      cpu: { normal: 70, warning: 85, critical: 95, emergency: 98 },
      memory: { normal: 70, warning: 85, critical: 95, emergency: 98 },
      disk: { normal: 80, warning: 90, critical: 95, emergency: 98 },
      network: { normal: 60, warning: 80, critical: 90, emergency: 95 }
    };

    if (!thresholds) return defaults;

    return {
      cpu: { ...defaults.cpu, ...thresholds.cpu },
      memory: { ...defaults.memory, ...thresholds.memory },
      disk: { ...defaults.disk, ...thresholds.disk },
      network: { ...defaults.network, ...thresholds.network }
    };
  }

  /**
   * Initialize history buffers
   */
  private initializeHistoryBuffers(): void {
    this.history.set(ResourceType.CPU, new CircularBuffer(100));
    this.history.set(ResourceType.Memory, new CircularBuffer(100));
    this.history.set(ResourceType.Disk, new CircularBuffer(100));
    this.history.set(ResourceType.Network, new CircularBuffer(100));
  }

  /**
   * Shutdown the pressure detector
   */
  async shutdown(): Promise<void> {
    this.stopMonitoring();
    this.isEnabled = false;
    this.removeAllListeners();
    logger.info('Pressure detector shutdown');
  }
}
