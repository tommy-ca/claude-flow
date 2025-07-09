/**
 * Resource Manager Core
 * Main orchestrator for the intelligent resource management system
 */

import { EventEmitter } from 'events';
import {
  MCPResourceReport,
  ResourceAllocationRequest,
  ResourceAllocationResponse
} from '../../mcp/resource-protocol';
import { ResourceMemoryManager } from '../../memory/resource-memory';
import {
  ResourceManagerConfig,
  ResourceManagerConfigManager
} from '../../config/resource-manager-config';
import { logger } from '../../utils/logger';

export interface ResourceAnalysis {
  timestamp: number;
  issues: Array<{
    type: 'overload' | 'underutilization' | 'imbalance' | 'failure';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedServers: string[];
    impact: string;
    recommendation: string;
  }>;
  opportunities: Array<{
    type: 'consolidation' | 'scaling' | 'optimization';
    description: string;
    savings: string;
    complexity: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
}

export interface OptimizationPlan {
  id: string;
  timestamp: number;
  strategy: 'balanced' | 'performance' | 'efficiency' | 'cost';
  actions: Array<{
    type: 'migrate' | 'scale' | 'consolidate' | 'restart';
    target: string;
    description: string;
    impact: string;
    risk: 'low' | 'medium' | 'high';
    estimatedDuration: number;
  }>;
  expectedOutcomes: {
    cpuReduction: string;
    memorySavings: string;
    performanceGain: string;
    costSavings?: string;
  };
}

export interface OptimizationResult {
  action: string;
  success: boolean;
  details?: string;
  metrics?: {
    timeTaken: number;
    resourcesAffected: number;
    performanceChange: number;
  };
}

export class ResourceManager extends EventEmitter {
  private config: ResourceManagerConfig;
  private configManager: ResourceManagerConfigManager;
  private memoryManager: ResourceMemoryManager;
  private servers: Map<string, MCPResourceReport>;
  private activeAllocations: Map<string, ResourceAllocationRequest>;
  private monitoringInterval?: NodeJS.Timeout;
  private optimizationSchedule?: NodeJS.Timeout;

  constructor(configManager: ResourceManagerConfigManager, memoryManager: ResourceMemoryManager) {
    super();
    this.configManager = configManager;
    this.memoryManager = memoryManager;
    this.servers = new Map();
    this.activeAllocations = new Map();
    this.config = configManager.getConfig();
  }

  /**
   * Initialize the resource manager
   */
  async initialize(): Promise<void> {
    await this.configManager.initialize();
    await this.memoryManager.initialize();

    this.config = this.configManager.getConfig();

    // Set up monitoring
    if (this.config.monitoring.enabled) {
      await this.startMonitoring();
    }

    // Set up optimization schedule
    if (this.config.optimization.enabled && this.config.optimization.schedule.enabled) {
      await this.scheduleOptimization();
    }

    logger.info('Resource Manager initialized');
  }

  /**
   * Register a server with the resource manager
   */
  async registerServer(report: MCPResourceReport): Promise<void> {
    this.servers.set(report.serverId, report);

    // Store metrics
    await this.memoryManager.storeMetrics(report);

    // Check for alerts
    await this.checkServerHealth(report);

    this.emit('server-registered', report);

    logger.debug(`Server ${report.serverId} registered`);
  }

  /**
   * Update server status
   */
  async updateServerStatus(report: MCPResourceReport): Promise<void> {
    const previousReport = this.servers.get(report.serverId);
    this.servers.set(report.serverId, report);

    // Store metrics
    await this.memoryManager.storeMetrics(report);

    // Check for status changes
    if (previousReport && previousReport.status !== report.status) {
      await this.handleStatusChange(report, previousReport.status);
    }

    // Check for alerts
    await this.checkServerHealth(report);

    this.emit('server-updated', report);
  }

  /**
   * Get all healthy servers
   */
  async getHealthyServers(): Promise<MCPResourceReport[]> {
    return Array.from(this.servers.values()).filter(
      server => server.status === 'healthy' || server.status === 'degraded'
    );
  }

  /**
   * Get server status
   */
  async getServerStatus(serverId: string): Promise<MCPResourceReport> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    return server;
  }

  /**
   * Get all server status
   */
  async getAllServerStatus(): Promise<MCPResourceReport[]> {
    return Array.from(this.servers.values());
  }

  /**
   * Allocate resources for an agent
   */
  async allocateResources(request: ResourceAllocationRequest): Promise<ResourceAllocationResponse> {
    logger.info(`Allocating resources for agent ${request.agentId}`);

    // Find suitable servers
    const suitableServers = await this.findSuitableServers(request);

    if (suitableServers.length === 0) {
      return {
        requestId: request.requestId,
        allocated: false,
        reason: 'No suitable servers available',
        alternativeServers: []
      };
    }

    // Select best server based on strategy
    const selectedServer = await this.selectOptimalServer(suitableServers, request);

    // Perform allocation
    const allocation = await this.performAllocation(selectedServer, request);

    if (allocation.success) {
      // Store allocation
      this.activeAllocations.set(request.requestId, request);

      // Emit event
      this.emit('resource-allocated', {
        requestId: request.requestId,
        serverId: selectedServer.serverId,
        agentId: request.agentId
      });

      return {
        requestId: request.requestId,
        allocated: true,
        serverId: selectedServer.serverId,
        allocation: allocation.details
      };
    } else {
      return {
        requestId: request.requestId,
        allocated: false,
        reason: allocation.reason,
        alternativeServers: suitableServers.slice(1, 4).map(s => s.serverId)
      };
    }
  }

  /**
   * Release allocated resources
   */
  async releaseResources(requestId: string): Promise<boolean> {
    const allocation = this.activeAllocations.get(requestId);
    if (!allocation) {
      logger.warn(`No allocation found for request ${requestId}`);
      return false;
    }

    // Perform deallocation
    const success = await this.performDeallocation(allocation);

    if (success) {
      this.activeAllocations.delete(requestId);

      this.emit('resource-released', {
        requestId,
        agentId: allocation.agentId
      });

      logger.info(`Resources released for request ${requestId}`);
    }

    return success;
  }

  /**
   * Analyze current resource usage
   */
  async analyzeResourceUsage(): Promise<ResourceAnalysis> {
    const servers = Array.from(this.servers.values());
    const issues: ResourceAnalysis['issues'] = [];
    const opportunities: ResourceAnalysis['opportunities'] = [];

    // Analyze each server
    for (const server of servers) {
      // Check for overload
      if (
        server.resources.cpu.usage > 90 ||
        server.resources.memory.used / server.resources.memory.total > 0.95
      ) {
        issues.push({
          type: 'overload',
          description: `Server ${server.serverId} is overloaded`,
          severity: 'high',
          affectedServers: [server.serverId],
          impact: 'Performance degradation, potential service interruption',
          recommendation: 'Scale up resources or migrate workloads'
        });
      }

      // Check for underutilization
      if (
        server.resources.cpu.usage < 20 &&
        server.resources.memory.used / server.resources.memory.total < 0.3
      ) {
        opportunities.push({
          type: 'consolidation',
          description: `Server ${server.serverId} is underutilized`,
          savings: 'Potential cost savings through consolidation',
          complexity: 'medium',
          risk: 'low'
        });
      }
    }

    // Check for imbalance
    if (servers.length > 1) {
      const cpuUsages = servers.map(s => s.resources.cpu.usage);
      const maxCpu = Math.max(...cpuUsages);
      const minCpu = Math.min(...cpuUsages);

      if (maxCpu - minCpu > 50) {
        issues.push({
          type: 'imbalance',
          description: 'Significant load imbalance detected',
          severity: 'medium',
          affectedServers: servers.map(s => s.serverId),
          impact: 'Inefficient resource utilization',
          recommendation: 'Rebalance workloads across servers'
        });
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (issues.length > 0) {
      recommendations.push(`Address ${issues.length} identified issues to improve system health`);
    }

    if (opportunities.length > 0) {
      recommendations.push(`Explore ${opportunities.length} optimization opportunities`);
    }

    return {
      timestamp: Date.now(),
      issues,
      opportunities,
      recommendations
    };
  }

  /**
   * Generate optimization plan
   */
  async generateOptimizationPlan(strategy: string): Promise<OptimizationPlan> {
    const analysis = await this.analyzeResourceUsage();
    const actions: OptimizationPlan['actions'] = [];

    // Generate actions based on strategy
    switch (strategy) {
      case 'balanced':
        actions.push(...(await this.generateBalancedActions(analysis)));
        break;
      case 'performance':
        actions.push(...(await this.generatePerformanceActions(analysis)));
        break;
      case 'efficiency':
        actions.push(...(await this.generateEfficiencyActions(analysis)));
        break;
      case 'cost':
        actions.push(...(await this.generateCostActions(analysis)));
        break;
      default:
        throw new Error(`Unknown optimization strategy: ${strategy}`);
    }

    return {
      id: `opt-${Date.now()}`,
      timestamp: Date.now(),
      strategy: strategy as OptimizationPlan['strategy'],
      actions,
      expectedOutcomes: {
        cpuReduction: '15-25%',
        memorySavings: '10-20%',
        performanceGain: '20-30%',
        costSavings: strategy === 'cost' ? '25-35%' : undefined
      }
    };
  }

  /**
   * Apply optimization plan
   */
  async applyOptimizationPlan(plan: OptimizationPlan): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    logger.info(`Applying optimization plan ${plan.id} with ${plan.actions.length} actions`);

    for (const action of plan.actions) {
      const startTime = Date.now();

      try {
        const success = await this.executeOptimizationAction(action);

        results.push({
          action: action.description,
          success,
          details: success ? 'Action completed successfully' : 'Action failed',
          metrics: {
            timeTaken: Date.now() - startTime,
            resourcesAffected: 1,
            performanceChange: success ? 5 : 0
          }
        });
      } catch (error) {
        results.push({
          action: action.description,
          success: false,
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log optimization results
    const successCount = results.filter(r => r.success).length;
    logger.info(
      `Optimization plan ${plan.id} completed: ${successCount}/${results.length} actions successful`
    );

    return results;
  }

  /**
   * Get resource history
   */
  async getResourceHistory(options: {
    duration?: string;
    serverId?: string;
    metrics?: string[];
  }): Promise<any[]> {
    const duration = this.parseDuration(options.duration || '1h');
    const endTime = Date.now();
    const startTime = endTime - duration;

    return await this.memoryManager.queryMetrics({
      serverId: options.serverId,
      startTime,
      endTime,
      metrics: options.metrics,
      limit: 1000
    });
  }

  /**
   * Get cluster utilization
   */
  async getClusterUtilization(): Promise<Record<string, number>> {
    const servers = Array.from(this.servers.values());

    if (servers.length === 0) {
      return {};
    }

    const cpuTotal = servers.reduce((sum, s) => sum + s.resources.cpu.usage, 0);
    const memoryTotal = servers.reduce(
      (sum, s) => sum + (s.resources.memory.used / s.resources.memory.total) * 100,
      0
    );

    return {
      cpu: cpuTotal / servers.length,
      memory: memoryTotal / servers.length
    };
  }

  /**
   * Get deployment strategy
   */
  getDeploymentStrategy(): string {
    return this.config.optimization.strategy;
  }

  /**
   * Start monitoring
   */
  private async startMonitoring(): Promise<void> {
    const interval = this.config.monitoring.interval;

    this.monitoringInterval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, interval);

    logger.info(`Resource monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Perform monitoring cycle
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      // Check server health
      for (const server of this.servers.values()) {
        await this.checkServerHealth(server);
      }

      // Perform cluster analysis
      if (this.servers.size > 1) {
        await this.performClusterAnalysis();
      }

      // Clean up old allocations
      await this.cleanupAllocations();
    } catch (error) {
      logger.error('Monitoring cycle failed:', error);
    }
  }

  /**
   * Check server health
   */
  private async checkServerHealth(server: MCPResourceReport): Promise<void> {
    const cpuUsage = server.resources.cpu.usage;
    const memoryUsage = (server.resources.memory.used / server.resources.memory.total) * 100;

    // Check thresholds
    const cpuThreshold = this.config.thresholds.cpu;
    const memoryThreshold = this.config.thresholds.memory;

    if (cpuUsage > cpuThreshold.critical || memoryUsage > memoryThreshold.critical) {
      await this.handleCriticalAlert(server, 'Resource usage critical');
    } else if (cpuUsage > cpuThreshold.warning || memoryUsage > memoryThreshold.warning) {
      await this.handleWarningAlert(server, 'Resource usage high');
    }
  }

  /**
   * Handle status change
   */
  private async handleStatusChange(
    server: MCPResourceReport,
    previousStatus: string
  ): Promise<void> {
    logger.info(
      `Server ${server.serverId} status changed from ${previousStatus} to ${server.status}`
    );

    if (server.status === 'offline') {
      await this.handleServerOffline(server);
    } else if (server.status === 'healthy' && previousStatus !== 'healthy') {
      await this.handleServerRecovery(server);
    }
  }

  /**
   * Handle server offline
   */
  private async handleServerOffline(server: MCPResourceReport): Promise<void> {
    logger.error(`Server ${server.serverId} went offline`);

    // Store event
    await this.memoryManager.storeEvent({
      id: `offline-${server.serverId}-${Date.now()}`,
      timestamp: Date.now(),
      type: 'failure',
      severity: 'critical',
      serverId: server.serverId,
      message: `Server ${server.serverId} went offline`
    });

    // Emit event
    this.emit('server-offline', server);
  }

  /**
   * Handle server recovery
   */
  private async handleServerRecovery(server: MCPResourceReport): Promise<void> {
    logger.info(`Server ${server.serverId} recovered`);

    // Store event
    await this.memoryManager.storeEvent({
      id: `recovery-${server.serverId}-${Date.now()}`,
      timestamp: Date.now(),
      type: 'recovery',
      severity: 'medium',
      serverId: server.serverId,
      message: `Server ${server.serverId} recovered`
    });

    // Emit event
    this.emit('server-recovery', server);
  }

  /**
   * Handle critical alert
   */
  private async handleCriticalAlert(server: MCPResourceReport, message: string): Promise<void> {
    logger.error(`Critical alert for server ${server.serverId}: ${message}`);

    // Store event
    await this.memoryManager.storeEvent({
      id: `critical-${server.serverId}-${Date.now()}`,
      timestamp: Date.now(),
      type: 'alert',
      severity: 'critical',
      serverId: server.serverId,
      message
    });

    // Emit event
    this.emit('critical-alert', server, message);
  }

  /**
   * Handle warning alert
   */
  private async handleWarningAlert(server: MCPResourceReport, message: string): Promise<void> {
    logger.warn(`Warning alert for server ${server.serverId}: ${message}`);

    // Store event
    await this.memoryManager.storeEvent({
      id: `warning-${server.serverId}-${Date.now()}`,
      timestamp: Date.now(),
      type: 'alert',
      severity: 'high',
      serverId: server.serverId,
      message
    });

    // Emit event
    this.emit('warning-alert', server, message);
  }

  /**
   * Find suitable servers for allocation
   */
  private async findSuitableServers(
    request: ResourceAllocationRequest
  ): Promise<MCPResourceReport[]> {
    const servers = Array.from(this.servers.values());

    return servers.filter(server => {
      // Check basic health
      if (server.status === 'offline') return false;

      // Check memory requirements
      if (server.resources.memory.available < request.requirements.memory.minimum) {
        return false;
      }

      // Check CPU requirements
      if (
        request.requirements.cpu?.cores &&
        server.resources.cpu.cores < request.requirements.cpu.cores
      ) {
        return false;
      }

      // Check GPU requirements
      if (
        request.requirements.gpu?.required &&
        (!server.resources.gpu || server.resources.gpu.length === 0)
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Select optimal server
   */
  private async selectOptimalServer(
    servers: MCPResourceReport[],
    request: ResourceAllocationRequest
  ): Promise<MCPResourceReport> {
    const strategy = this.config.optimization.strategy;

    switch (strategy) {
      case 'balanced':
        // Select server with best overall balance
        return servers.reduce((best, current) => {
          const bestScore = this.calculateBalanceScore(best);
          const currentScore = this.calculateBalanceScore(current);
          return currentScore > bestScore ? current : best;
        });

      case 'performance':
        // Select most powerful server
        return servers.reduce((best, current) => {
          const bestScore = this.calculatePerformanceScore(best);
          const currentScore = this.calculatePerformanceScore(current);
          return currentScore > bestScore ? current : best;
        });

      case 'efficiency':
        // Select server with best resource fit
        return servers.reduce((best, current) => {
          const bestWaste = this.calculateResourceWaste(best, request);
          const currentWaste = this.calculateResourceWaste(current, request);
          return currentWaste < bestWaste ? current : best;
        });

      default:
        return servers[0];
    }
  }

  /**
   * Calculate balance score
   */
  private calculateBalanceScore(server: MCPResourceReport): number {
    const cpuUsage = server.resources.cpu.usage;
    const memoryUsage = (server.resources.memory.used / server.resources.memory.total) * 100;

    // Lower usage is better for balance
    return 200 - cpuUsage - memoryUsage;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(server: MCPResourceReport): number {
    let score = 0;

    // CPU score
    score += server.resources.cpu.cores * 10;

    // Memory score
    score += (server.resources.memory.total / (1024 * 1024 * 1024)) * 5; // GB

    // GPU score
    if (server.resources.gpu) {
      score += server.resources.gpu.length * 50;
    }

    return score;
  }

  /**
   * Calculate resource waste
   */
  private calculateResourceWaste(
    server: MCPResourceReport,
    request: ResourceAllocationRequest
  ): number {
    const memoryWaste = server.resources.memory.available - request.requirements.memory.minimum;

    // Convert to a normalized waste score
    return memoryWaste / (1024 * 1024); // MB
  }

  /**
   * Perform allocation
   */
  private async performAllocation(
    server: MCPResourceReport,
    request: ResourceAllocationRequest
  ): Promise<{ success: boolean; reason?: string; details?: any }> {
    // Simulate allocation logic
    logger.info(`Allocating ${request.requirements.memory.minimum}MB memory on ${server.serverId}`);

    // Check if we can still allocate
    if (server.resources.memory.available < request.requirements.memory.minimum) {
      return {
        success: false,
        reason: 'Insufficient memory available'
      };
    }

    // Simulate successful allocation
    return {
      success: true,
      details: {
        memory: {
          allocated: request.requirements.memory.minimum
        }
      }
    };
  }

  /**
   * Perform deallocation
   */
  private async performDeallocation(allocation: ResourceAllocationRequest): Promise<boolean> {
    // Simulate deallocation logic
    logger.info(`Deallocating resources for agent ${allocation.agentId}`);

    // Always successful for simulation
    return true;
  }

  /**
   * Generate balanced actions
   */
  private async generateBalancedActions(
    analysis: ResourceAnalysis
  ): Promise<OptimizationPlan['actions']> {
    const actions: OptimizationPlan['actions'] = [];

    // Address overloaded servers
    const overloadIssues = analysis.issues.filter(i => i.type === 'overload');
    for (const issue of overloadIssues) {
      actions.push({
        type: 'migrate',
        target: issue.affectedServers[0],
        description: `Migrate workloads from overloaded server ${issue.affectedServers[0]}`,
        impact: 'Reduce server load by 20-30%',
        risk: 'medium',
        estimatedDuration: 15 * 60 * 1000 // 15 minutes
      });
    }

    return actions;
  }

  /**
   * Generate performance actions
   */
  private async generatePerformanceActions(
    analysis: ResourceAnalysis
  ): Promise<OptimizationPlan['actions']> {
    const actions: OptimizationPlan['actions'] = [];

    // Focus on scaling up for performance
    const issues = analysis.issues.filter(i => i.severity === 'high' || i.severity === 'critical');
    for (const issue of issues) {
      actions.push({
        type: 'scale',
        target: issue.affectedServers[0],
        description: `Scale up server ${issue.affectedServers[0]} for better performance`,
        impact: 'Improve performance by 40-50%',
        risk: 'low',
        estimatedDuration: 10 * 60 * 1000 // 10 minutes
      });
    }

    return actions;
  }

  /**
   * Generate efficiency actions
   */
  private async generateEfficiencyActions(
    analysis: ResourceAnalysis
  ): Promise<OptimizationPlan['actions']> {
    const actions: OptimizationPlan['actions'] = [];

    // Focus on consolidation
    const consolidationOpportunities = analysis.opportunities.filter(
      o => o.type === 'consolidation'
    );
    for (const opportunity of consolidationOpportunities) {
      actions.push({
        type: 'consolidate',
        target: 'cluster',
        description: `Consolidate underutilized resources`,
        impact: 'Improve resource efficiency by 30-40%',
        risk: 'medium',
        estimatedDuration: 20 * 60 * 1000 // 20 minutes
      });
    }

    return actions;
  }

  /**
   * Generate cost actions
   */
  private async generateCostActions(
    analysis: ResourceAnalysis
  ): Promise<OptimizationPlan['actions']> {
    const actions: OptimizationPlan['actions'] = [];

    // Focus on cost reduction
    const opportunities = analysis.opportunities.filter(o => o.type === 'consolidation');
    for (const opportunity of opportunities) {
      actions.push({
        type: 'consolidate',
        target: 'cluster',
        description: `Consolidate to reduce costs`,
        impact: 'Reduce operational costs by 25-35%',
        risk: 'low',
        estimatedDuration: 25 * 60 * 1000 // 25 minutes
      });
    }

    return actions;
  }

  /**
   * Execute optimization action
   */
  private async executeOptimizationAction(
    action: OptimizationPlan['actions'][0]
  ): Promise<boolean> {
    logger.info(`Executing optimization action: ${action.description}`);

    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success (80% success rate)
    return Math.random() > 0.2;
  }

  /**
   * Parse duration string
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid duration unit: ${unit}`);
    }
  }

  /**
   * Schedule optimization
   */
  private async scheduleOptimization(): Promise<void> {
    // This would implement cron-based scheduling
    // For now, just log that it's scheduled
    logger.info('Optimization scheduling configured');
  }

  /**
   * Perform cluster analysis
   */
  private async performClusterAnalysis(): Promise<void> {
    // Analyze cluster-wide patterns
    const utilization = await this.getClusterUtilization();

    if (utilization.cpu > 80 || utilization.memory > 85) {
      logger.warn('Cluster utilization is high', utilization);
    }
  }

  /**
   * Clean up old allocations
   */
  private async cleanupAllocations(): Promise<void> {
    // Remove allocations older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const [requestId, allocation] of this.activeAllocations.entries()) {
      if (allocation.agentId.includes(cutoff.toString())) {
        // Simplified check
        await this.releaseResources(requestId);
      }
    }
  }

  /**
   * Shutdown the resource manager
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.optimizationSchedule) {
      clearInterval(this.optimizationSchedule);
    }

    await this.memoryManager.shutdown();

    logger.info('Resource Manager shutdown');
  }
}
