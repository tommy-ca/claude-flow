/**
 * Resource Manager Agent
 * Specialized agent for resource management and optimization tasks
 */

import { BaseAgent } from './base-agent';
import { ResourceManager } from '../../resource-manager/core/resource-manager';
import { MCPResourceReport } from '../../mcp/resource-protocol';
import { logger } from '../../utils/logger';

export interface ResourceTask {
  type: 'monitor' | 'optimize' | 'analyze' | 'predict' | 'alert';
  parameters: {
    target?: string; // Server ID or 'all'
    duration?: string; // For monitoring/analysis
    strategy?: string; // For optimization
    threshold?: number; // For alerts
    metrics?: string[]; // Specific metrics to focus on
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ResourceInsight {
  type: 'warning' | 'optimization' | 'prediction' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  serverId?: string;
  metric?: string;
  recommendation?: string;
  impact?: {
    performance: number; // -100 to 100
    cost: number; // -100 to 100
    reliability: number; // -100 to 100
  };
}

export interface ResourceAnalysis {
  timestamp: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  insights: ResourceInsight[];
  recommendations: string[];
  predictions: {
    nextHour: Record<string, number>;
    nextDay: Record<string, number>;
  };
}

export class ResourceManagerAgent extends BaseAgent {
  private resourceManager: ResourceManager;
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds: Record<string, number>;
  private lastAnalysis?: ResourceAnalysis;

  constructor(id: string, resourceManager: ResourceManager) {
    super(id, 'resource-manager');
    this.resourceManager = resourceManager;
    this.alertThresholds = {
      cpu: 80,
      memory: 85,
      gpu: 90,
      diskSpace: 90,
      networkLatency: 100 // ms
    };
  }

  /**
   * Initialize the resource manager agent
   */
  async initialize(): Promise<void> {
    await super.initialize();

    // Set up capabilities
    this.capabilities = [
      'resource-monitoring',
      'performance-optimization',
      'capacity-planning',
      'anomaly-detection',
      'predictive-analysis',
      'cost-optimization',
      'auto-scaling',
      'health-checking'
    ];

    // Initialize resource manager
    await this.resourceManager.initialize();

    // Set up monitoring
    await this.startContinuousMonitoring();

    logger.info(
      `Resource Manager Agent ${this.id} initialized with ${this.capabilities.length} capabilities`
    );
  }

  /**
   * Process a resource management task
   */
  async processTask(task: ResourceTask): Promise<any> {
    const startTime = Date.now();

    try {
      let result;

      switch (task.type) {
        case 'monitor':
          result = await this.handleMonitoringTask(task);
          break;
        case 'optimize':
          result = await this.handleOptimizationTask(task);
          break;
        case 'analyze':
          result = await this.handleAnalysisTask(task);
          break;
        case 'predict':
          result = await this.handlePredictionTask(task);
          break;
        case 'alert':
          result = await this.handleAlertTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const executionTime = Date.now() - startTime;

      // Log task completion
      await this.logTaskCompletion(task, result, executionTime);

      return result;
    } catch (error) {
      logger.error(`Resource Manager Agent ${this.id} failed to process task:`, error);
      throw error;
    }
  }

  /**
   * Handle monitoring task
   */
  private async handleMonitoringTask(task: ResourceTask): Promise<{
    servers: MCPResourceReport[];
    summary: any;
    alerts: ResourceInsight[];
  }> {
    const { target = 'all', duration = '1h' } = task.parameters;

    let servers: MCPResourceReport[];

    if (target === 'all') {
      servers = await this.resourceManager.getAllServerStatus();
    } else {
      const serverStatus = await this.resourceManager.getServerStatus(target);
      servers = [serverStatus];
    }

    // Generate alerts based on current status
    const alerts = this.generateAlerts(servers);

    // Create summary
    const summary = {
      totalServers: servers.length,
      healthyServers: servers.filter(s => s.status === 'healthy').length,
      degradedServers: servers.filter(s => s.status === 'degraded').length,
      overloadedServers: servers.filter(s => s.status === 'overloaded').length,
      offlineServers: servers.filter(s => s.status === 'offline').length,
      averageUtilization: this.calculateAverageUtilization(servers),
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length
    };

    return { servers, summary, alerts };
  }

  /**
   * Handle optimization task
   */
  private async handleOptimizationTask(task: ResourceTask): Promise<{
    analysis: any;
    plan: any;
    results?: any;
  }> {
    const { strategy = 'balanced', target = 'all' } = task.parameters;

    // Analyze current resource usage
    const analysis = await this.resourceManager.analyzeResourceUsage();

    // Generate optimization plan
    const plan = await this.resourceManager.generateOptimizationPlan(strategy);

    // Apply optimization if requested
    let results;
    if (task.priority === 'high' || task.priority === 'critical') {
      results = await this.resourceManager.applyOptimizationPlan(plan);
    }

    return { analysis, plan, results };
  }

  /**
   * Handle analysis task
   */
  private async handleAnalysisTask(task: ResourceTask): Promise<ResourceAnalysis> {
    const { duration = '1h', metrics = ['cpu', 'memory', 'network'] } = task.parameters;

    // Get historical data
    const history = await this.resourceManager.getResourceHistory({
      duration,
      metrics
    });

    // Analyze patterns and generate insights
    const insights = await this.analyzeResourcePatterns(history);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(insights);

    // Create predictions
    const predictions = await this.generatePredictions(history);

    // Determine overall health
    const overallHealth = this.assessOverallHealth(insights);

    const analysis: ResourceAnalysis = {
      timestamp: Date.now(),
      overallHealth,
      insights,
      recommendations,
      predictions
    };

    // Store analysis for future reference
    this.lastAnalysis = analysis;

    return analysis;
  }

  /**
   * Handle prediction task
   */
  private async handlePredictionTask(task: ResourceTask): Promise<{
    predictions: Record<string, any>;
    confidence: number;
    recommendations: string[];
  }> {
    const { duration = '24h', metrics = ['cpu', 'memory'] } = task.parameters;

    // Get historical data
    const history = await this.resourceManager.getResourceHistory({
      duration,
      metrics
    });

    // Generate predictions using machine learning models
    const predictions = await this.generateAdvancedPredictions(history, metrics);

    // Calculate confidence score
    const confidence = this.calculatePredictionConfidence(predictions, history);

    // Generate recommendations based on predictions
    const recommendations = this.generatePredictiveRecommendations(predictions);

    return { predictions, confidence, recommendations };
  }

  /**
   * Handle alert task
   */
  private async handleAlertTask(task: ResourceTask): Promise<{
    alerts: ResourceInsight[];
    actions: string[];
  }> {
    const { threshold, metrics = ['cpu', 'memory'] } = task.parameters;

    // Get current server status
    const servers = await this.resourceManager.getAllServerStatus();

    // Generate alerts based on thresholds
    const alerts = this.generateThresholdAlerts(servers, metrics, threshold);

    // Generate recommended actions
    const actions = this.generateAlertActions(alerts);

    return { alerts, actions };
  }

  /**
   * Start continuous monitoring
   */
  private async startContinuousMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Perform regular health checks
        await this.performHealthCheck();

        // Check for alerts
        await this.checkForAlerts();

        // Update predictions
        await this.updatePredictions();
      } catch (error) {
        logger.error('Continuous monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const servers = await this.resourceManager.getAllServerStatus();
    const unhealthyServers = servers.filter(s => s.status !== 'healthy');

    if (unhealthyServers.length > 0) {
      logger.warn(`Health check: ${unhealthyServers.length} unhealthy servers detected`);

      // Trigger automatic remediation if possible
      for (const server of unhealthyServers) {
        await this.attemptRemediation(server);
      }
    }
  }

  /**
   * Check for alerts
   */
  private async checkForAlerts(): Promise<void> {
    const servers = await this.resourceManager.getAllServerStatus();
    const alerts = this.generateAlerts(servers);

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');

    if (criticalAlerts.length > 0) {
      logger.error(`Critical alerts detected: ${criticalAlerts.length}`);

      // Send notifications
      await this.sendAlertNotifications(criticalAlerts);
    }
  }

  /**
   * Update predictions
   */
  private async updatePredictions(): Promise<void> {
    if (!this.lastAnalysis || Date.now() - this.lastAnalysis.timestamp > 300000) {
      // 5 minutes
      // Refresh analysis
      await this.handleAnalysisTask({
        type: 'analyze',
        parameters: { duration: '1h' },
        priority: 'normal'
      });
    }
  }

  /**
   * Generate alerts based on server status
   */
  private generateAlerts(servers: MCPResourceReport[]): ResourceInsight[] {
    const alerts: ResourceInsight[] = [];

    for (const server of servers) {
      const resources = server.resources;

      // CPU alerts
      if (resources.cpu.usage > this.alertThresholds.cpu) {
        alerts.push({
          type: 'warning',
          severity: resources.cpu.usage > 90 ? 'critical' : 'high',
          message: `High CPU usage on ${server.serverId}`,
          serverId: server.serverId,
          metric: 'cpu',
          recommendation: 'Consider scaling or load balancing',
          impact: {
            performance: -20,
            cost: 0,
            reliability: -15
          }
        });
      }

      // Memory alerts
      const memoryUsage = (resources.memory.used / resources.memory.total) * 100;
      if (memoryUsage > this.alertThresholds.memory) {
        alerts.push({
          type: 'warning',
          severity: memoryUsage > 95 ? 'critical' : 'high',
          message: `High memory usage on ${server.serverId}`,
          serverId: server.serverId,
          metric: 'memory',
          recommendation: 'Increase memory or optimize memory usage',
          impact: {
            performance: -25,
            cost: 0,
            reliability: -20
          }
        });
      }

      // GPU alerts
      if (resources.gpu) {
        for (const gpu of resources.gpu) {
          if (gpu.utilization > this.alertThresholds.gpu) {
            alerts.push({
              type: 'warning',
              severity: gpu.utilization > 95 ? 'critical' : 'high',
              message: `High GPU utilization on ${server.serverId}`,
              serverId: server.serverId,
              metric: 'gpu',
              recommendation: 'Consider GPU scaling or optimization',
              impact: {
                performance: -30,
                cost: 0,
                reliability: -10
              }
            });
          }
        }
      }

      // Network alerts
      if (resources.network.latency > this.alertThresholds.networkLatency) {
        alerts.push({
          type: 'warning',
          severity: resources.network.latency > 200 ? 'high' : 'medium',
          message: `High network latency on ${server.serverId}`,
          serverId: server.serverId,
          metric: 'network',
          recommendation: 'Check network configuration and connectivity',
          impact: {
            performance: -15,
            cost: 0,
            reliability: -25
          }
        });
      }
    }

    return alerts;
  }

  /**
   * Generate threshold-based alerts
   */
  private generateThresholdAlerts(
    servers: MCPResourceReport[],
    metrics: string[],
    threshold?: number
  ): ResourceInsight[] {
    const alerts: ResourceInsight[] = [];
    const customThreshold = threshold || 80;

    for (const server of servers) {
      for (const metric of metrics) {
        let value = 0;
        let maxValue = 100;

        switch (metric) {
          case 'cpu':
            value = server.resources.cpu.usage;
            break;
          case 'memory':
            value = (server.resources.memory.used / server.resources.memory.total) * 100;
            break;
          case 'gpu':
            if (server.resources.gpu) {
              value =
                server.resources.gpu.reduce((sum, gpu) => sum + gpu.utilization, 0) /
                server.resources.gpu.length;
            }
            break;
          case 'network':
            value = server.resources.network.latency;
            maxValue = 1000; // 1 second
            break;
        }

        if (value > customThreshold) {
          alerts.push({
            type: 'warning',
            severity: value > customThreshold * 1.2 ? 'high' : 'medium',
            message: `${metric.toUpperCase()} threshold exceeded on ${server.serverId}`,
            serverId: server.serverId,
            metric,
            recommendation: `Optimize ${metric} usage or increase capacity`,
            impact: {
              performance: -10,
              cost: 0,
              reliability: -5
            }
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Calculate average utilization across servers
   */
  private calculateAverageUtilization(servers: MCPResourceReport[]): Record<string, number> {
    if (servers.length === 0) return {};

    const totals = {
      cpu: 0,
      memory: 0,
      gpu: 0,
      network: 0
    };

    for (const server of servers) {
      totals.cpu += server.resources.cpu.usage;
      totals.memory += (server.resources.memory.used / server.resources.memory.total) * 100;

      if (server.resources.gpu) {
        totals.gpu +=
          server.resources.gpu.reduce((sum, gpu) => sum + gpu.utilization, 0) /
          server.resources.gpu.length;
      }

      totals.network += server.resources.network.latency;
    }

    return {
      cpu: totals.cpu / servers.length,
      memory: totals.memory / servers.length,
      gpu: totals.gpu / servers.length,
      network: totals.network / servers.length
    };
  }

  /**
   * Analyze resource patterns
   */
  private async analyzeResourcePatterns(history: any[]): Promise<ResourceInsight[]> {
    const insights: ResourceInsight[] = [];

    // Analyze trends
    const trends = this.analyzeTrends(history);

    // Detect anomalies
    const anomalies = this.detectAnomalies(history);

    // Generate insights from trends
    for (const [metric, trend] of Object.entries(trends)) {
      if (trend > 0.1) {
        // Increasing trend
        insights.push({
          type: 'warning',
          severity: 'medium',
          message: `${metric.toUpperCase()} usage is trending upward`,
          metric,
          recommendation: `Monitor ${metric} closely and plan for capacity increase`,
          impact: {
            performance: -5,
            cost: 10,
            reliability: -5
          }
        });
      }
    }

    // Generate insights from anomalies
    for (const anomaly of anomalies) {
      insights.push({
        type: 'anomaly',
        severity: 'high',
        message: `Anomaly detected in ${anomaly.metric}`,
        metric: anomaly.metric,
        recommendation: `Investigate cause of ${anomaly.metric} anomaly`,
        impact: {
          performance: -15,
          cost: 0,
          reliability: -20
        }
      });
    }

    return insights;
  }

  /**
   * Analyze trends in historical data
   */
  private analyzeTrends(history: any[]): Record<string, number> {
    const trends: Record<string, number> = {};

    if (history.length < 2) return trends;

    // Simple linear regression for each metric
    const metrics = Object.keys(history[0].metrics);

    for (const metric of metrics) {
      const values = history.map(h => h.metrics[metric]);
      const trend = this.calculateLinearTrend(values);
      trends[metric] = trend;
    }

    return trends;
  }

  /**
   * Calculate linear trend
   */
  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  /**
   * Detect anomalies in historical data
   */
  private detectAnomalies(
    history: any[]
  ): Array<{ metric: string; value: number; timestamp: number }> {
    const anomalies: Array<{ metric: string; value: number; timestamp: number }> = [];

    if (history.length < 10) return anomalies;

    const metrics = Object.keys(history[0].metrics);

    for (const metric of metrics) {
      const values = history.map(h => h.metrics[metric]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );

      // Detect outliers (values > 2 standard deviations from mean)
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (Math.abs(value - mean) > 2 * stdDev) {
          anomalies.push({
            metric,
            value,
            timestamp: history[i].timestamp
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Generate recommendations based on insights
   */
  private async generateRecommendations(insights: ResourceInsight[]): Promise<string[]> {
    const recommendations: string[] = [];

    // Group insights by type
    const warningInsights = insights.filter(i => i.type === 'warning');
    const anomalyInsights = insights.filter(i => i.type === 'anomaly');

    // Generate recommendations for warnings
    if (warningInsights.length > 0) {
      recommendations.push(
        `Address ${warningInsights.length} resource warnings to improve system performance`
      );
    }

    // Generate recommendations for anomalies
    if (anomalyInsights.length > 0) {
      recommendations.push(
        `Investigate ${anomalyInsights.length} detected anomalies to prevent potential issues`
      );
    }

    // Generate specific recommendations
    const cpuIssues = insights.filter(i => i.metric === 'cpu');
    if (cpuIssues.length > 0) {
      recommendations.push('Consider CPU optimization or scaling to address performance issues');
    }

    const memoryIssues = insights.filter(i => i.metric === 'memory');
    if (memoryIssues.length > 0) {
      recommendations.push('Monitor memory usage and consider memory optimization or expansion');
    }

    return recommendations;
  }

  /**
   * Generate predictions
   */
  private async generatePredictions(history: any[]): Promise<{
    nextHour: Record<string, number>;
    nextDay: Record<string, number>;
  }> {
    const predictions = {
      nextHour: {},
      nextDay: {}
    };

    if (history.length < 5) return predictions;

    const metrics = Object.keys(history[0].metrics);

    for (const metric of metrics) {
      const values = history.map(h => h.metrics[metric]);
      const trend = this.calculateLinearTrend(values);
      const lastValue = values[values.length - 1];

      // Simple linear prediction
      predictions.nextHour[metric] = Math.max(0, lastValue + trend * 12); // 12 intervals per hour
      predictions.nextDay[metric] = Math.max(0, lastValue + trend * 288); // 288 intervals per day
    }

    return predictions;
  }

  /**
   * Generate advanced predictions using ML models
   */
  private async generateAdvancedPredictions(
    history: any[],
    metrics: string[]
  ): Promise<Record<string, any>> {
    const predictions: Record<string, any> = {};

    // This is a simplified implementation
    // In production, you would use actual ML models
    for (const metric of metrics) {
      const values = history.map(h => h.metrics[metric]);
      const trend = this.calculateLinearTrend(values);
      const lastValue = values[values.length - 1];

      predictions[metric] = {
        next1h: Math.max(0, lastValue + trend * 12),
        next6h: Math.max(0, lastValue + trend * 72),
        next24h: Math.max(0, lastValue + trend * 288),
        confidence: this.calculateTrendConfidence(values, trend)
      };
    }

    return predictions;
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(predictions: Record<string, any>, history: any[]): number {
    // Simplified confidence calculation
    let totalConfidence = 0;
    let count = 0;

    for (const metric in predictions) {
      if (predictions[metric].confidence) {
        totalConfidence += predictions[metric].confidence;
        count++;
      }
    }

    return count > 0 ? totalConfidence / count : 0.5;
  }

  /**
   * Calculate trend confidence
   */
  private calculateTrendConfidence(values: number[], trend: number): number {
    if (values.length < 3) return 0.3;

    // Calculate R-squared to measure trend fit
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let ssTotal = 0;
    let ssRes = 0;

    for (let i = 0; i < n; i++) {
      const yPred = values[0] + trend * i;
      ssTotal += Math.pow(values[i] - yMean, 2);
      ssRes += Math.pow(values[i] - yPred, 2);
    }

    const rSquared = 1 - ssRes / ssTotal;
    return Math.max(0, Math.min(1, rSquared));
  }

  /**
   * Generate predictive recommendations
   */
  private generatePredictiveRecommendations(predictions: Record<string, any>): string[] {
    const recommendations: string[] = [];

    for (const [metric, prediction] of Object.entries(predictions)) {
      const next24h = prediction.next24h;
      const confidence = prediction.confidence;

      if (next24h > 80 && confidence > 0.7) {
        recommendations.push(
          `High ${metric} usage predicted (${next24h.toFixed(1)}%) - consider proactive scaling`
        );
      }

      if (next24h > 95 && confidence > 0.6) {
        recommendations.push(
          `Critical ${metric} usage predicted (${next24h.toFixed(1)}%) - immediate action required`
        );
      }
    }

    return recommendations;
  }

  /**
   * Generate alert actions
   */
  private generateAlertActions(alerts: ResourceInsight[]): string[] {
    const actions: string[] = [];

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');

    if (criticalAlerts.length > 0) {
      actions.push('Immediate escalation required for critical alerts');
      actions.push('Consider emergency scaling or load balancing');
    }

    if (highAlerts.length > 0) {
      actions.push('Schedule optimization for high-priority alerts');
      actions.push('Review resource allocation and usage patterns');
    }

    return actions;
  }

  /**
   * Assess overall system health
   */
  private assessOverallHealth(insights: ResourceInsight[]): ResourceAnalysis['overallHealth'] {
    const criticalCount = insights.filter(i => i.severity === 'critical').length;
    const highCount = insights.filter(i => i.severity === 'high').length;
    const mediumCount = insights.filter(i => i.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'poor';
    if (highCount > 0 || mediumCount > 3) return 'fair';
    if (mediumCount > 0) return 'good';

    return 'excellent';
  }

  /**
   * Attempt automatic remediation
   */
  private async attemptRemediation(server: MCPResourceReport): Promise<void> {
    logger.info(`Attempting remediation for server ${server.serverId}`);

    // Implement automatic remediation logic
    // This could include:
    // - Restarting services
    // - Clearing caches
    // - Scaling resources
    // - Load balancing

    // For now, just log the attempt
    logger.info(`Remediation attempted for server ${server.serverId}`);
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alerts: ResourceInsight[]): Promise<void> {
    // Implement notification system
    // This could send emails, Slack messages, etc.

    for (const alert of alerts) {
      logger.error(`ALERT: ${alert.message} (${alert.severity})`);
    }
  }

  /**
   * Log task completion
   */
  private async logTaskCompletion(
    task: ResourceTask,
    result: any,
    executionTime: number
  ): Promise<void> {
    const logEntry = {
      taskId: `${task.type}-${Date.now()}`,
      type: task.type,
      parameters: task.parameters,
      priority: task.priority,
      executionTime,
      result: {
        success: true,
        dataPoints: Array.isArray(result) ? result.length : 1,
        insights: result.insights?.length || 0,
        alerts: result.alerts?.length || 0
      },
      timestamp: new Date().toISOString()
    };

    logger.info(`Task completed: ${JSON.stringify(logEntry)}`);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    await super.cleanup();
  }
}
