/**
 * Agent Resource Manager
 * Manages resources for individual agents with auto-scaling and health monitoring
 */

import { EventEmitter } from 'node:events';
import { IResourceMetrics, ResourceType } from '../types';
import { PressureDetector, PressureAlert } from '../monitors/pressure-detector';
import { CircularBuffer } from '../utils/circular-buffer';
import { logger } from '../../utils/logger';

export interface AgentResourceConfig {
  agentId: string;
  type: string;
  qosClass: 'Guaranteed' | 'Burstable' | 'BestEffort';
  resources: {
    cpu: {
      minimum: number; // Minimum CPU cores
      maximum: number; // Maximum CPU cores
      target: number; // Target CPU utilization %
    };
    memory: {
      minimum: number; // Minimum memory in MB
      maximum: number; // Maximum memory in MB
      target: number; // Target memory utilization %
    };
    priority: number; // Resource priority (1-10)
  };
  scaling: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    scaleUpThreshold: number; // CPU/Memory % to scale up
    scaleDownThreshold: number; // CPU/Memory % to scale down
    scaleUpCooldown: number; // Cooldown in ms
    scaleDownCooldown: number; // Cooldown in ms
  };
  healthCheck: {
    enabled: boolean;
    interval: number; // Health check interval in ms
    timeout: number; // Health check timeout in ms
    retries: number; // Number of retries before marking unhealthy
  };
}

export interface AgentResourceUsage {
  agentId: string;
  timestamp: number;
  cpu: {
    used: number; // CPU cores used
    utilization: number; // CPU utilization %
    limit: number; // CPU limit
  };
  memory: {
    used: number; // Memory used in MB
    utilization: number; // Memory utilization %
    limit: number; // Memory limit in MB
  };
  replicas: {
    current: number; // Current number of replicas
    desired: number; // Desired number of replicas
    healthy: number; // Number of healthy replicas
  };
  status: 'healthy' | 'degraded' | 'unhealthy' | 'scaling';
}

export interface AgentHealthStatus {
  agentId: string;
  timestamp: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    type: 'cpu' | 'memory' | 'response_time' | 'error_rate';
    status: 'pass' | 'fail';
    value: number;
    threshold: number;
    message: string;
  }>;
  lastHealthyTime: number;
  consecutiveFailures: number;
}

export interface ScalingEvent {
  id: string;
  agentId: string;
  timestamp: number;
  type: 'scale_up' | 'scale_down';
  trigger: string;
  fromReplicas: number;
  toReplicas: number;
  reason: string;
  duration: number;
  success: boolean;
  error?: string;
}

export interface AgentResourceRecommendation {
  agentId: string;
  timestamp: number;
  type: 'resource_adjustment' | 'scaling_policy' | 'qos_change';
  current: Partial<AgentResourceConfig>;
  recommended: Partial<AgentResourceConfig>;
  impact: {
    performance: 'positive' | 'negative' | 'neutral';
    cost: 'increase' | 'decrease' | 'neutral';
    stability: 'improve' | 'degrade' | 'neutral';
  };
  confidence: number;
  reasoning: string[];
}

export class AgentResourceManager extends EventEmitter {
  private agents: Map<string, AgentResourceConfig>;
  private usage: Map<string, AgentResourceUsage>;
  private healthStatus: Map<string, AgentHealthStatus>;
  private usageHistory: Map<string, CircularBuffer<AgentResourceUsage>>;
  private scalingHistory: Map<string, CircularBuffer<ScalingEvent>>;
  private pressureDetector: PressureDetector;
  private monitoringInterval?: NodeJS.Timeout;
  private lastScalingAction: Map<string, { type: string; timestamp: number }>;
  private isEnabled: boolean;

  constructor(pressureDetector: PressureDetector) {
    super();
    this.agents = new Map();
    this.usage = new Map();
    this.healthStatus = new Map();
    this.usageHistory = new Map();
    this.scalingHistory = new Map();
    this.lastScalingAction = new Map();
    this.pressureDetector = pressureDetector;
    this.isEnabled = false;

    // Listen to pressure alerts
    this.pressureDetector.on('pressure-alert', this.handlePressureAlert.bind(this));
  }

  /**
   * Initialize the agent resource manager
   */
  async initialize(): Promise<void> {
    this.isEnabled = true;
    logger.info('Agent Resource Manager initialized');
  }

  /**
   * Register an agent
   */
  async registerAgent(config: AgentResourceConfig): Promise<void> {
    this.agents.set(config.agentId, config);

    // Initialize usage tracking
    this.usage.set(config.agentId, {
      agentId: config.agentId,
      timestamp: Date.now(),
      cpu: { used: 0, utilization: 0, limit: config.resources.cpu.maximum },
      memory: { used: 0, utilization: 0, limit: config.resources.memory.maximum },
      replicas: { current: 1, desired: 1, healthy: 1 },
      status: 'healthy'
    });

    // Initialize health status
    this.healthStatus.set(config.agentId, {
      agentId: config.agentId,
      timestamp: Date.now(),
      status: 'healthy',
      checks: [],
      lastHealthyTime: Date.now(),
      consecutiveFailures: 0
    });

    // Initialize history buffers
    this.usageHistory.set(config.agentId, new CircularBuffer(1000));
    this.scalingHistory.set(config.agentId, new CircularBuffer(100));

    // Start monitoring if enabled
    if (config.healthCheck.enabled) {
      this.startAgentMonitoring(config.agentId);
    }

    this.emit('agent-registered', config);
    logger.info(`Agent ${config.agentId} registered with resource manager`);
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    this.agents.delete(agentId);
    this.usage.delete(agentId);
    this.healthStatus.delete(agentId);
    this.usageHistory.delete(agentId);
    this.scalingHistory.delete(agentId);
    this.lastScalingAction.delete(agentId);

    this.emit('agent-unregistered', agentId);
    logger.info(`Agent ${agentId} unregistered from resource manager`);
  }

  /**
   * Update agent resource usage
   */
  async updateAgentUsage(agentId: string, metrics: IResourceMetrics): Promise<void> {
    const config = this.agents.get(agentId);
    if (!config) {
      throw new Error(`Agent ${agentId} not registered`);
    }

    const usage: AgentResourceUsage = {
      agentId,
      timestamp: Date.now(),
      cpu: {
        used: metrics.cpu.cores,
        utilization: metrics.cpu.usage,
        limit: config.resources.cpu.maximum
      },
      memory: {
        used: metrics.memory.used,
        utilization: metrics.memory.usage,
        limit: config.resources.memory.maximum
      },
      replicas: this.usage.get(agentId)?.replicas || { current: 1, desired: 1, healthy: 1 },
      status: this.determineAgentStatus(metrics, config)
    };

    this.usage.set(agentId, usage);
    this.usageHistory.get(agentId)?.add(usage);

    // Check if scaling is needed
    if (config.scaling.enabled) {
      await this.checkScalingNeeds(agentId, usage);
    }

    this.emit('agent-usage-updated', usage);
  }

  /**
   * Get agent resource usage
   */
  getAgentUsage(agentId: string): AgentResourceUsage | undefined {
    return this.usage.get(agentId);
  }

  /**
   * Get all agents usage
   */
  getAllAgentsUsage(): AgentResourceUsage[] {
    return Array.from(this.usage.values());
  }

  /**
   * Get agent health status
   */
  getAgentHealth(agentId: string): AgentHealthStatus | undefined {
    return this.healthStatus.get(agentId);
  }

  /**
   * Get agent usage history
   */
  getAgentUsageHistory(agentId: string, limit?: number): AgentResourceUsage[] {
    const history = this.usageHistory.get(agentId);
    if (!history) return [];

    const data = history.toArray();
    return limit ? data.slice(-limit) : data;
  }

  /**
   * Get agent scaling history
   */
  getAgentScalingHistory(agentId: string, limit?: number): ScalingEvent[] {
    const history = this.scalingHistory.get(agentId);
    if (!history) return [];

    const data = history.toArray();
    return limit ? data.slice(-limit) : data;
  }

  /**
   * Scale agent up
   */
  async scaleAgentUp(agentId: string, reason: string): Promise<boolean> {
    const config = this.agents.get(agentId);
    const usage = this.usage.get(agentId);

    if (!config || !usage) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (usage.replicas.current >= config.scaling.maxReplicas) {
      logger.warn(`Agent ${agentId} already at maximum replicas`);
      return false;
    }

    // Check cooldown
    const lastAction = this.lastScalingAction.get(agentId);
    if (
      lastAction &&
      lastAction.type === 'scale_up' &&
      Date.now() - lastAction.timestamp < config.scaling.scaleUpCooldown
    ) {
      logger.debug(`Agent ${agentId} scale up in cooldown`);
      return false;
    }

    const startTime = Date.now();
    const fromReplicas = usage.replicas.current;
    const toReplicas = Math.min(fromReplicas + 1, config.scaling.maxReplicas);

    try {
      // Perform scaling
      await this.performScaling(agentId, toReplicas);

      // Update usage
      usage.replicas.current = toReplicas;
      usage.replicas.desired = toReplicas;
      usage.status = 'scaling';
      this.usage.set(agentId, usage);

      // Record scaling event
      const scalingEvent: ScalingEvent = {
        id: `scale-up-${agentId}-${Date.now()}`,
        agentId,
        timestamp: Date.now(),
        type: 'scale_up',
        trigger: 'manual',
        fromReplicas,
        toReplicas,
        reason,
        duration: Date.now() - startTime,
        success: true
      };

      this.scalingHistory.get(agentId)?.add(scalingEvent);
      this.lastScalingAction.set(agentId, { type: 'scale_up', timestamp: Date.now() });

      this.emit('agent-scaled-up', scalingEvent);
      logger.info(`Agent ${agentId} scaled up from ${fromReplicas} to ${toReplicas} replicas`);
      return true;
    } catch (error) {
      const scalingEvent: ScalingEvent = {
        id: `scale-up-${agentId}-${Date.now()}`,
        agentId,
        timestamp: Date.now(),
        type: 'scale_up',
        trigger: 'manual',
        fromReplicas,
        toReplicas,
        reason,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.scalingHistory.get(agentId)?.add(scalingEvent);
      this.emit('agent-scaling-failed', scalingEvent);
      logger.error(`Agent ${agentId} scale up failed:`, error);
      return false;
    }
  }

  /**
   * Scale agent down
   */
  async scaleAgentDown(agentId: string, reason: string): Promise<boolean> {
    const config = this.agents.get(agentId);
    const usage = this.usage.get(agentId);

    if (!config || !usage) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (usage.replicas.current <= config.scaling.minReplicas) {
      logger.warn(`Agent ${agentId} already at minimum replicas`);
      return false;
    }

    // Check cooldown
    const lastAction = this.lastScalingAction.get(agentId);
    if (
      lastAction &&
      lastAction.type === 'scale_down' &&
      Date.now() - lastAction.timestamp < config.scaling.scaleDownCooldown
    ) {
      logger.debug(`Agent ${agentId} scale down in cooldown`);
      return false;
    }

    const startTime = Date.now();
    const fromReplicas = usage.replicas.current;
    const toReplicas = Math.max(fromReplicas - 1, config.scaling.minReplicas);

    try {
      // Perform scaling
      await this.performScaling(agentId, toReplicas);

      // Update usage
      usage.replicas.current = toReplicas;
      usage.replicas.desired = toReplicas;
      usage.status = 'scaling';
      this.usage.set(agentId, usage);

      // Record scaling event
      const scalingEvent: ScalingEvent = {
        id: `scale-down-${agentId}-${Date.now()}`,
        agentId,
        timestamp: Date.now(),
        type: 'scale_down',
        trigger: 'manual',
        fromReplicas,
        toReplicas,
        reason,
        duration: Date.now() - startTime,
        success: true
      };

      this.scalingHistory.get(agentId)?.add(scalingEvent);
      this.lastScalingAction.set(agentId, { type: 'scale_down', timestamp: Date.now() });

      this.emit('agent-scaled-down', scalingEvent);
      logger.info(`Agent ${agentId} scaled down from ${fromReplicas} to ${toReplicas} replicas`);
      return true;
    } catch (error) {
      const scalingEvent: ScalingEvent = {
        id: `scale-down-${agentId}-${Date.now()}`,
        agentId,
        timestamp: Date.now(),
        type: 'scale_down',
        trigger: 'manual',
        fromReplicas,
        toReplicas,
        reason,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.scalingHistory.get(agentId)?.add(scalingEvent);
      this.emit('agent-scaling-failed', scalingEvent);
      logger.error(`Agent ${agentId} scale down failed:`, error);
      return false;
    }
  }

  /**
   * Generate resource recommendations
   */
  async generateRecommendations(agentId: string): Promise<AgentResourceRecommendation[]> {
    const config = this.agents.get(agentId);
    const usage = this.usage.get(agentId);
    const history = this.usageHistory.get(agentId);

    if (!config || !usage || !history) {
      throw new Error(`Agent ${agentId} not found or insufficient data`);
    }

    const recommendations: AgentResourceRecommendation[] = [];
    const historicalData = history.toArray();

    // Analyze resource utilization patterns
    const avgCpuUtilization = this.calculateAverage(historicalData.map(h => h.cpu.utilization));
    const avgMemoryUtilization = this.calculateAverage(
      historicalData.map(h => h.memory.utilization)
    );

    // CPU recommendations
    if (avgCpuUtilization > 80) {
      recommendations.push({
        agentId,
        timestamp: Date.now(),
        type: 'resource_adjustment',
        current: { resources: { cpu: config.resources.cpu } },
        recommended: {
          resources: {
            cpu: {
              ...config.resources.cpu,
              maximum: Math.min(config.resources.cpu.maximum * 1.5, 16)
            }
          }
        },
        impact: {
          performance: 'positive',
          cost: 'increase',
          stability: 'improve'
        },
        confidence: 0.8,
        reasoning: [
          `Average CPU utilization is ${avgCpuUtilization.toFixed(1)}% (target: ${config.resources.cpu.target}%)`,
          'Increasing CPU limits will improve performance and reduce latency',
          'Cost increase expected due to higher resource allocation'
        ]
      });
    } else if (avgCpuUtilization < 30) {
      recommendations.push({
        agentId,
        timestamp: Date.now(),
        type: 'resource_adjustment',
        current: { resources: { cpu: config.resources.cpu } },
        recommended: {
          resources: {
            cpu: {
              ...config.resources.cpu,
              maximum: Math.max(config.resources.cpu.maximum * 0.8, config.resources.cpu.minimum)
            }
          }
        },
        impact: {
          performance: 'neutral',
          cost: 'decrease',
          stability: 'neutral'
        },
        confidence: 0.7,
        reasoning: [
          `Average CPU utilization is ${avgCpuUtilization.toFixed(1)}% (target: ${config.resources.cpu.target}%)`,
          'Reducing CPU limits will save costs without impacting performance',
          'Monitor performance after reduction to ensure stability'
        ]
      });
    }

    // Memory recommendations
    if (avgMemoryUtilization > 85) {
      recommendations.push({
        agentId,
        timestamp: Date.now(),
        type: 'resource_adjustment',
        current: { resources: { memory: config.resources.memory } },
        recommended: {
          resources: {
            memory: {
              ...config.resources.memory,
              maximum: Math.min(config.resources.memory.maximum * 1.3, 32768)
            }
          }
        },
        impact: {
          performance: 'positive',
          cost: 'increase',
          stability: 'improve'
        },
        confidence: 0.9,
        reasoning: [
          `Average memory utilization is ${avgMemoryUtilization.toFixed(1)}% (target: ${config.resources.memory.target}%)`,
          'Increasing memory limits will prevent OOM errors and improve stability',
          'High memory usage may lead to performance degradation'
        ]
      });
    }

    // Scaling policy recommendations
    const scalingEvents = this.scalingHistory.get(agentId)?.toArray() || [];
    const recentScalingEvents = scalingEvents.filter(
      e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000
    );

    if (recentScalingEvents.length > 10) {
      recommendations.push({
        agentId,
        timestamp: Date.now(),
        type: 'scaling_policy',
        current: { scaling: config.scaling },
        recommended: {
          scaling: {
            ...config.scaling,
            scaleUpThreshold: Math.min(config.scaling.scaleUpThreshold + 10, 90),
            scaleDownThreshold: Math.max(config.scaling.scaleDownThreshold - 5, 20)
          }
        },
        impact: {
          performance: 'neutral',
          cost: 'neutral',
          stability: 'improve'
        },
        confidence: 0.6,
        reasoning: [
          `${recentScalingEvents.length} scaling events in the last 24 hours`,
          'Adjusting thresholds to reduce scaling frequency',
          'This will improve stability and reduce resource churn'
        ]
      });
    }

    // QoS class recommendations
    if (config.qosClass === 'BestEffort' && avgCpuUtilization > 70 && avgMemoryUtilization > 70) {
      recommendations.push({
        agentId,
        timestamp: Date.now(),
        type: 'qos_change',
        current: { qosClass: config.qosClass },
        recommended: { qosClass: 'Burstable' },
        impact: {
          performance: 'positive',
          cost: 'increase',
          stability: 'improve'
        },
        confidence: 0.8,
        reasoning: [
          'High resource utilization suggests this agent would benefit from guaranteed resources',
          'Upgrading to Burstable QoS will provide better performance guarantees',
          'Cost increase expected due to resource reservation'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Apply resource recommendation
   */
  async applyRecommendation(agentId: string, recommendationId: string): Promise<boolean> {
    // Implementation would apply the specific recommendation
    // This is a placeholder for the actual implementation
    logger.info(`Applied recommendation ${recommendationId} for agent ${agentId}`);
    return true;
  }

  /**
   * Check if scaling is needed
   */
  private async checkScalingNeeds(agentId: string, usage: AgentResourceUsage): Promise<void> {
    const config = this.agents.get(agentId);
    if (!config || !config.scaling.enabled) return;

    const avgUtilization = (usage.cpu.utilization + usage.memory.utilization) / 2;

    // Check scale up conditions
    if (
      avgUtilization > config.scaling.scaleUpThreshold &&
      usage.replicas.current < config.scaling.maxReplicas
    ) {
      await this.scaleAgentUp(agentId, `High resource utilization: ${avgUtilization.toFixed(1)}%`);
    }

    // Check scale down conditions
    if (
      avgUtilization < config.scaling.scaleDownThreshold &&
      usage.replicas.current > config.scaling.minReplicas
    ) {
      await this.scaleAgentDown(agentId, `Low resource utilization: ${avgUtilization.toFixed(1)}%`);
    }
  }

  /**
   * Determine agent status
   */
  private determineAgentStatus(
    metrics: IResourceMetrics,
    config: AgentResourceConfig
  ): AgentResourceUsage['status'] {
    const cpuUtilization = metrics.cpu.usage;
    const memoryUtilization = metrics.memory.usage;

    if (cpuUtilization > 95 || memoryUtilization > 95) {
      return 'unhealthy';
    }

    if (cpuUtilization > 85 || memoryUtilization > 85) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Perform actual scaling
   */
  private async performScaling(agentId: string, replicas: number): Promise<void> {
    // This would interface with the actual container orchestration system
    // For now, we simulate the scaling operation
    logger.info(`Scaling agent ${agentId} to ${replicas} replicas`);

    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Start monitoring for an agent
   */
  private startAgentMonitoring(agentId: string): void {
    const config = this.agents.get(agentId);
    if (!config) return;

    // This would start health checking for the agent
    // For now, we just log that monitoring started
    logger.info(`Started monitoring for agent ${agentId}`);
  }

  /**
   * Handle pressure alerts
   */
  private async handlePressureAlert(alert: PressureAlert): Promise<void> {
    // React to system pressure by scaling down or throttling agents
    if (alert.level === 'emergency' || alert.level === 'critical') {
      // Find agents that can be scaled down
      const scalableAgents = Array.from(this.agents.entries())
        .filter(([_, config]) => config.scaling.enabled)
        .map(([agentId, config]) => ({
          agentId,
          config,
          usage: this.usage.get(agentId)
        }))
        .filter(
          ({ usage, config }) => usage && usage.replicas.current > config.scaling.minReplicas
        );

      // Scale down lowest priority agents first
      scalableAgents
        .sort((a, b) => a.config.resources.priority - b.config.resources.priority)
        .slice(0, 3) // Scale down up to 3 agents
        .forEach(({ agentId }) => {
          this.scaleAgentDown(agentId, `Emergency scaling due to ${alert.type} pressure`);
        });
    }
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Shutdown the agent resource manager
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.isEnabled = false;
    this.removeAllListeners();
    logger.info('Agent Resource Manager shutdown');
  }
}
