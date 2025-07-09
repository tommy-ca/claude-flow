/**
 * Resource Management Dashboard
 * Real-time monitoring and telemetry dashboard for resource management
 */

import { EventEmitter } from 'node:events';
import { ResourceManager } from '../core/resource-manager';
import { PressureDetector, PressureAnalysis } from './pressure-detector';
import {
  AgentResourceManager,
  AgentResourceUsage,
  AgentHealthStatus
} from '../agents/agent-resource-manager';
import { IResourceMetrics } from '../types';
import { logger } from '../../utils/logger';

export interface DashboardConfig {
  refreshInterval: number;
  historyDuration: number;
  alertThresholds: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  features: {
    realTimeCharts: boolean;
    predictiveAnalytics: boolean;
    alertingSystem: boolean;
    autoRecommendations: boolean;
  };
}

export interface DashboardMetrics {
  timestamp: number;
  system: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    uptime: number;
  };
  cluster: {
    totalServers: number;
    healthyServers: number;
    degradedServers: number;
    offlineServers: number;
    averageUtilization: {
      cpu: number;
      memory: number;
    };
  };
  agents: {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    unhealthyAgents: number;
    scalingEvents: number;
    averageResponseTime: number;
  };
  pressure: {
    level: 'normal' | 'warning' | 'critical' | 'emergency';
    score: number;
    alerts: number;
    predictions: Array<{
      type: string;
      timeToAlert: number;
      confidence: number;
    }>;
  };
}

export interface DashboardAlert {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: 'system' | 'agent' | 'pressure' | 'prediction';
  acknowledged: boolean;
  autoActions: string[];
  recommendations: string[];
}

export interface DashboardStats {
  uptime: number;
  totalAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number;
  successRate: number;
  resourceEfficiency: number;
  costSavings: number;
  performanceGains: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }>;
}

export class ResourceDashboard extends EventEmitter {
  private config: DashboardConfig;
  private resourceManager: ResourceManager;
  private pressureDetector: PressureDetector;
  private agentManager: AgentResourceManager;
  private metrics: DashboardMetrics;
  private alerts: DashboardAlert[];
  private stats: DashboardStats;
  private refreshInterval?: NodeJS.Timeout;
  private chartData: Map<string, ChartData>;
  private isActive: boolean;

  constructor(
    resourceManager: ResourceManager,
    pressureDetector: PressureDetector,
    agentManager: AgentResourceManager,
    config?: Partial<DashboardConfig>
  ) {
    super();

    this.resourceManager = resourceManager;
    this.pressureDetector = pressureDetector;
    this.agentManager = agentManager;
    this.config = this.mergeConfig(config);
    this.alerts = [];
    this.chartData = new Map();
    this.isActive = false;

    this.metrics = this.initializeMetrics();
    this.stats = this.initializeStats();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the dashboard
   */
  async initialize(): Promise<void> {
    this.isActive = true;

    // Start data collection
    this.startDataCollection();

    // Initialize chart data
    await this.initializeChartData();

    logger.info('Resource Dashboard initialized');
  }

  /**
   * Start the dashboard
   */
  async start(): Promise<void> {
    if (!this.isActive) {
      await this.initialize();
    }

    this.refreshInterval = setInterval(async () => {
      await this.refreshData();
    }, this.config.refreshInterval);

    logger.info(`Resource Dashboard started (refresh: ${this.config.refreshInterval}ms)`);
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }

    this.isActive = false;
    logger.info('Resource Dashboard stopped');
  }

  /**
   * Get current dashboard metrics
   */
  getMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }

  /**
   * Get dashboard statistics
   */
  getStats(): DashboardStats {
    return { ...this.stats };
  }

  /**
   * Get active alerts
   */
  getAlerts(limit?: number): DashboardAlert[] {
    const alerts = this.alerts.filter(alert => !alert.acknowledged);
    return limit ? alerts.slice(-limit) : alerts;
  }

  /**
   * Get all alerts including acknowledged ones
   */
  getAllAlerts(limit?: number): DashboardAlert[] {
    return limit ? this.alerts.slice(-limit) : [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert-acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get chart data for visualization
   */
  getChartData(chartType: string): ChartData | undefined {
    return this.chartData.get(chartType);
  }

  /**
   * Get available chart types
   */
  getAvailableCharts(): string[] {
    return Array.from(this.chartData.keys());
  }

  /**
   * Get system overview
   */
  getSystemOverview(): any {
    return {
      timestamp: Date.now(),
      health: this.calculateSystemHealth(),
      performance: this.calculateSystemPerformance(),
      capacity: this.calculateSystemCapacity(),
      trends: this.calculateSystemTrends(),
      recommendations: this.getSystemRecommendations()
    };
  }

  /**
   * Get agent overview
   */
  getAgentOverview(): any {
    const agentUsages = this.agentManager.getAllAgentsUsage();

    return {
      timestamp: Date.now(),
      summary: {
        total: agentUsages.length,
        healthy: agentUsages.filter(a => a.status === 'healthy').length,
        degraded: agentUsages.filter(a => a.status === 'degraded').length,
        unhealthy: agentUsages.filter(a => a.status === 'unhealthy').length,
        scaling: agentUsages.filter(a => a.status === 'scaling').length
      },
      resourceUsage: {
        cpu: this.calculateAgentResourceUsage(agentUsages, 'cpu'),
        memory: this.calculateAgentResourceUsage(agentUsages, 'memory')
      },
      topAgents: this.getTopResourceConsumers(agentUsages, 5)
    };
  }

  /**
   * Get pressure overview
   */
  getPressureOverview(): any {
    const currentPressure = this.pressureDetector.getCurrentPressure();
    const alertHistory = this.pressureDetector.getAlertHistory(10);

    return {
      timestamp: Date.now(),
      current: currentPressure,
      alerts: alertHistory,
      predictions: currentPressure?.predictions || {},
      mitigations: currentPressure?.mitigationActions || []
    };
  }

  /**
   * Export dashboard data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      timestamp: Date.now(),
      metrics: this.metrics,
      stats: this.stats,
      alerts: this.alerts,
      system: this.getSystemOverview(),
      agents: this.getAgentOverview(),
      pressure: this.getPressureOverview()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DashboardConfig>): void {
    this.config = this.mergeConfig(newConfig);

    // Restart if refresh interval changed
    if (this.refreshInterval) {
      this.stop();
      this.start();
    }

    this.emit('config-updated', this.config);
  }

  /**
   * Refresh dashboard data
   */
  private async refreshData(): Promise<void> {
    try {
      // Update metrics
      await this.updateMetrics();

      // Update stats
      await this.updateStats();

      // Update chart data
      await this.updateChartData();

      // Check for new alerts
      await this.checkForAlerts();

      // Emit update event
      this.emit('data-updated', {
        metrics: this.metrics,
        stats: this.stats,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Dashboard data refresh failed:', error);
    }
  }

  /**
   * Update metrics
   */
  private async updateMetrics(): Promise<void> {
    // Get cluster utilization
    const clusterUtil = await this.resourceManager.getClusterUtilization();
    const serverStatus = await this.resourceManager.getAllServerStatus();
    const agentUsages = this.agentManager.getAllAgentsUsage();
    const pressureAnalysis = this.pressureDetector.getCurrentPressure();

    this.metrics = {
      timestamp: Date.now(),
      system: {
        cpu: clusterUtil.cpu || 0,
        memory: clusterUtil.memory || 0,
        disk: 0, // Would be calculated from server data
        network: 0, // Would be calculated from server data
        uptime: process.uptime() * 1000
      },
      cluster: {
        totalServers: serverStatus.length,
        healthyServers: serverStatus.filter(s => s.status === 'healthy').length,
        degradedServers: serverStatus.filter(s => s.status === 'degraded').length,
        offlineServers: serverStatus.filter(s => s.status === 'offline').length,
        averageUtilization: {
          cpu: clusterUtil.cpu || 0,
          memory: clusterUtil.memory || 0
        }
      },
      agents: {
        totalAgents: agentUsages.length,
        healthyAgents: agentUsages.filter(a => a.status === 'healthy').length,
        degradedAgents: agentUsages.filter(a => a.status === 'degraded').length,
        unhealthyAgents: agentUsages.filter(a => a.status === 'unhealthy').length,
        scalingEvents: 0, // Would be calculated from scaling history
        averageResponseTime: 0 // Would be calculated from agent metrics
      },
      pressure: {
        level: pressureAnalysis?.overall.level || 'normal',
        score: pressureAnalysis?.overall.value || 0,
        alerts: this.pressureDetector.getAlertHistory(100).length,
        predictions: pressureAnalysis?.predictions.nextAlert
          ? [
              {
                type: pressureAnalysis.predictions.nextAlert.type,
                timeToAlert: pressureAnalysis.predictions.nextAlert.timeToAlert,
                confidence: pressureAnalysis.predictions.nextAlert.confidence
              }
            ]
          : []
      }
    };
  }

  /**
   * Update statistics
   */
  private async updateStats(): Promise<void> {
    const uptime = process.uptime() * 1000;
    const totalAlerts = this.alerts.length;
    const resolvedAlerts = this.alerts.filter(a => a.acknowledged).length;

    this.stats = {
      uptime,
      totalAlerts,
      resolvedAlerts,
      averageResponseTime: 0, // Would be calculated from actual metrics
      successRate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 100,
      resourceEfficiency: this.calculateResourceEfficiency(),
      costSavings: 0, // Would be calculated from optimization results
      performanceGains: 0 // Would be calculated from optimization results
    };
  }

  /**
   * Update chart data
   */
  private async updateChartData(): Promise<void> {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();

    // CPU utilization chart
    this.updateChart('cpu-utilization', timeLabel, this.metrics.system.cpu);

    // Memory utilization chart
    this.updateChart('memory-utilization', timeLabel, this.metrics.system.memory);

    // Agent health chart
    this.updateChart('agent-health', timeLabel, this.metrics.agents.healthyAgents);

    // Pressure level chart
    this.updateChart('pressure-level', timeLabel, this.metrics.pressure.score);
  }

  /**
   * Update specific chart
   */
  private updateChart(chartType: string, label: string, value: number): void {
    const chart = this.chartData.get(chartType);
    if (!chart) return;

    const maxPoints = 50; // Keep last 50 data points

    // Add new data point
    chart.labels.push(label);
    chart.datasets[0].data.push(value);

    // Remove old data points
    if (chart.labels.length > maxPoints) {
      chart.labels.shift();
      chart.datasets[0].data.shift();
    }

    this.chartData.set(chartType, chart);
  }

  /**
   * Check for new alerts
   */
  private async checkForAlerts(): Promise<void> {
    // Check system alerts
    if (this.metrics.system.cpu > this.config.alertThresholds.cpu) {
      this.addAlert(
        'critical',
        'High CPU Usage',
        `System CPU usage is ${this.metrics.system.cpu.toFixed(1)}%`,
        'system'
      );
    }

    if (this.metrics.system.memory > this.config.alertThresholds.memory) {
      this.addAlert(
        'critical',
        'High Memory Usage',
        `System memory usage is ${this.metrics.system.memory.toFixed(1)}%`,
        'system'
      );
    }

    // Check agent alerts
    const unhealthyAgents = this.metrics.agents.unhealthyAgents;
    if (unhealthyAgents > 0) {
      this.addAlert(
        'warning',
        'Unhealthy Agents',
        `${unhealthyAgents} agents are unhealthy`,
        'agent'
      );
    }

    // Check pressure alerts
    if (this.metrics.pressure.level === 'critical' || this.metrics.pressure.level === 'emergency') {
      this.addAlert(
        'critical',
        'System Pressure',
        `System pressure level is ${this.metrics.pressure.level}`,
        'pressure'
      );
    }
  }

  /**
   * Add alert
   */
  private addAlert(
    level: DashboardAlert['level'],
    title: string,
    message: string,
    source: DashboardAlert['source']
  ): void {
    const alert: DashboardAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      title,
      message,
      source,
      acknowledged: false,
      autoActions: [],
      recommendations: []
    };

    this.alerts.push(alert);
    this.emit('new-alert', alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to pressure alerts
    this.pressureDetector.on('pressure-alert', alert => {
      this.addAlert('warning', 'Pressure Alert', alert.message, 'pressure');
    });

    // Listen to agent scaling events
    this.agentManager.on('agent-scaled-up', event => {
      this.addAlert(
        'info',
        'Agent Scaled Up',
        `Agent ${event.agentId} scaled up to ${event.toReplicas} replicas`,
        'agent'
      );
    });

    this.agentManager.on('agent-scaled-down', event => {
      this.addAlert(
        'info',
        'Agent Scaled Down',
        `Agent ${event.agentId} scaled down to ${event.toReplicas} replicas`,
        'agent'
      );
    });

    // Listen to resource manager events
    this.resourceManager.on('server-offline', server => {
      this.addAlert('error', 'Server Offline', `Server ${server.serverId} went offline`, 'system');
    });

    this.resourceManager.on('server-recovery', server => {
      this.addAlert('info', 'Server Recovery', `Server ${server.serverId} recovered`, 'system');
    });
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): DashboardMetrics {
    return {
      timestamp: Date.now(),
      system: { cpu: 0, memory: 0, disk: 0, network: 0, uptime: 0 },
      cluster: {
        totalServers: 0,
        healthyServers: 0,
        degradedServers: 0,
        offlineServers: 0,
        averageUtilization: { cpu: 0, memory: 0 }
      },
      agents: {
        totalAgents: 0,
        healthyAgents: 0,
        degradedAgents: 0,
        unhealthyAgents: 0,
        scalingEvents: 0,
        averageResponseTime: 0
      },
      pressure: { level: 'normal', score: 0, alerts: 0, predictions: [] }
    };
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): DashboardStats {
    return {
      uptime: 0,
      totalAlerts: 0,
      resolvedAlerts: 0,
      averageResponseTime: 0,
      successRate: 100,
      resourceEfficiency: 0,
      costSavings: 0,
      performanceGains: 0
    };
  }

  /**
   * Start data collection
   */
  private startDataCollection(): void {
    // This would start collecting metrics from various sources
    logger.info('Started dashboard data collection');
  }

  /**
   * Initialize chart data
   */
  private async initializeChartData(): Promise<void> {
    const charts = ['cpu-utilization', 'memory-utilization', 'agent-health', 'pressure-level'];

    for (const chartType of charts) {
      this.chartData.set(chartType, {
        labels: [],
        datasets: [
          {
            label: this.getChartLabel(chartType),
            data: [],
            borderColor: this.getChartColor(chartType),
            backgroundColor: this.getChartColor(chartType, 0.1),
            tension: 0.4
          }
        ]
      });
    }
  }

  /**
   * Get chart label
   */
  private getChartLabel(chartType: string): string {
    const labels: Record<string, string> = {
      'cpu-utilization': 'CPU Usage (%)',
      'memory-utilization': 'Memory Usage (%)',
      'agent-health': 'Healthy Agents',
      'pressure-level': 'Pressure Score'
    };
    return labels[chartType] || chartType;
  }

  /**
   * Get chart color
   */
  private getChartColor(chartType: string, alpha: number = 1): string {
    const colors: Record<string, string> = {
      'cpu-utilization': `rgba(255, 99, 132, ${alpha})`,
      'memory-utilization': `rgba(54, 162, 235, ${alpha})`,
      'agent-health': `rgba(75, 192, 192, ${alpha})`,
      'pressure-level': `rgba(255, 206, 86, ${alpha})`
    };
    return colors[chartType] || `rgba(153, 102, 255, ${alpha})`;
  }

  /**
   * Calculate system health
   */
  private calculateSystemHealth(): number {
    const cpuHealth = Math.max(0, 100 - this.metrics.system.cpu);
    const memoryHealth = Math.max(0, 100 - this.metrics.system.memory);
    const agentHealth =
      (this.metrics.agents.healthyAgents / Math.max(1, this.metrics.agents.totalAgents)) * 100;

    return (cpuHealth + memoryHealth + agentHealth) / 3;
  }

  /**
   * Calculate system performance
   */
  private calculateSystemPerformance(): number {
    // Simple performance calculation based on resource utilization
    const utilization = (this.metrics.system.cpu + this.metrics.system.memory) / 2;
    return Math.max(0, 100 - utilization);
  }

  /**
   * Calculate system capacity
   */
  private calculateSystemCapacity(): number {
    const freeCapacity = 100 - (this.metrics.system.cpu + this.metrics.system.memory) / 2;
    return Math.max(0, freeCapacity);
  }

  /**
   * Calculate system trends
   */
  private calculateSystemTrends(): any {
    // This would analyze historical data to determine trends
    return {
      cpu: 'stable',
      memory: 'stable',
      agents: 'stable',
      pressure: 'stable'
    };
  }

  /**
   * Get system recommendations
   */
  private getSystemRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.system.cpu > 80) {
      recommendations.push('Consider adding more CPU capacity');
    }

    if (this.metrics.system.memory > 80) {
      recommendations.push('Consider adding more memory capacity');
    }

    if (this.metrics.agents.unhealthyAgents > 0) {
      recommendations.push('Review unhealthy agents and their resource allocation');
    }

    return recommendations;
  }

  /**
   * Calculate agent resource usage
   */
  private calculateAgentResourceUsage(
    agentUsages: AgentResourceUsage[],
    type: 'cpu' | 'memory'
  ): any {
    if (agentUsages.length === 0) return { average: 0, max: 0, min: 0 };

    const values = agentUsages.map(a => a[type].utilization);

    return {
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      max: Math.max(...values),
      min: Math.min(...values)
    };
  }

  /**
   * Get top resource consumers
   */
  private getTopResourceConsumers(agentUsages: AgentResourceUsage[], limit: number): any[] {
    return agentUsages
      .sort(
        (a, b) =>
          b.cpu.utilization + b.memory.utilization - (a.cpu.utilization + a.memory.utilization)
      )
      .slice(0, limit)
      .map(agent => ({
        agentId: agent.agentId,
        cpu: agent.cpu.utilization,
        memory: agent.memory.utilization,
        status: agent.status
      }));
  }

  /**
   * Calculate resource efficiency
   */
  private calculateResourceEfficiency(): number {
    const totalUtilization = this.metrics.system.cpu + this.metrics.system.memory;
    const maxUtilization = 200; // 100% CPU + 100% Memory

    return (totalUtilization / maxUtilization) * 100;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion - would be more sophisticated in production
    const headers = Object.keys(data).join(',');
    const values = Object.values(data)
      .map(val => (typeof val === 'object' ? JSON.stringify(val) : val))
      .join(',');

    return `${headers}\n${values}`;
  }

  /**
   * Merge configuration
   */
  private mergeConfig(config?: Partial<DashboardConfig>): DashboardConfig {
    const defaults: DashboardConfig = {
      refreshInterval: 5000,
      historyDuration: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        cpu: 80,
        memory: 80,
        disk: 85,
        network: 75
      },
      features: {
        realTimeCharts: true,
        predictiveAnalytics: true,
        alertingSystem: true,
        autoRecommendations: true
      }
    };

    if (!config) return defaults;

    return {
      ...defaults,
      ...config,
      alertThresholds: { ...defaults.alertThresholds, ...config.alertThresholds },
      features: { ...defaults.features, ...config.features }
    };
  }

  /**
   * Shutdown the dashboard
   */
  async shutdown(): Promise<void> {
    this.stop();
    this.removeAllListeners();
    logger.info('Resource Dashboard shutdown');
  }
}
