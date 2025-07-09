/**
 * Resource-Aware Swarm Coordinator
 * Extends the base swarm coordinator with intelligent resource-based agent deployment
 */

import { EventEmitter } from 'events';
import { SwarmCoordinator } from './coordinator';
import { Agent, SwarmTopology, ExecutionResult } from './types';
import {
  MCPResourceReport,
  ResourceAllocationRequest,
  ResourceAllocationResponse
} from '../mcp/resource-protocol';
import { ResourceManager } from '../resource-manager/core/resource-manager';
import { logger } from '../utils/logger';

export interface ResourceRequirements {
  cpu?: {
    cores?: number;
    minUsage?: number; // Minimum available CPU percentage
  };
  memory: {
    minimum: number; // Minimum memory in MB
    preferred?: number; // Preferred memory in MB
  };
  gpu?: {
    required: boolean;
    minMemory?: number; // Minimum GPU memory in MB
    count?: number; // Number of GPUs needed
  };
  network?: {
    minBandwidth?: number; // Minimum bandwidth in Mbps
    maxLatency?: number; // Maximum latency in ms
  };
  capabilities?: string[]; // Required server capabilities
}

export interface DeploymentConstraints {
  preferredServers?: string[]; // Preferred server IDs
  excludedServers?: string[]; // Servers to avoid
  locality?: 'same-server' | 'same-region' | 'distributed';
  maxCost?: number; // Maximum cost constraint
  timeConstraint?: number; // Maximum deployment time in seconds
}

export interface ResourceAwareDeployment {
  agentId: string;
  agentType: string;
  resourceRequirements: ResourceRequirements;
  constraints?: DeploymentConstraints;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface DeploymentResult {
  success: boolean;
  agentId: string;
  serverId?: string;
  allocatedResources?: {
    cpu?: { cores: number; reserved: number };
    memory: { allocated: number };
    gpu?: { devices: string[]; memory: number };
  };
  deploymentTime: number;
  reason?: string; // Reason if deployment failed
}

export class ResourceAwareCoordinator extends SwarmCoordinator {
  private resourceManager: ResourceManager;
  private deploymentHistory: Map<string, DeploymentResult>;
  private resourceEventEmitter: EventEmitter;
  private optimizationStrategies: Map<
    string,
    (deployment: ResourceAwareDeployment) => Promise<string | null>
  >;

  constructor(topology: SwarmTopology, resourceManager: ResourceManager) {
    super(topology);
    this.resourceManager = resourceManager;
    this.deploymentHistory = new Map();
    this.resourceEventEmitter = new EventEmitter();
    this.optimizationStrategies = new Map();

    this.initializeOptimizationStrategies();
    this.setupResourceEventHandlers();
  }

  /**
   * Initialize optimization strategies for different scenarios
   */
  private initializeOptimizationStrategies(): void {
    // Balanced strategy - distribute load evenly
    this.optimizationStrategies.set('balanced', async deployment => {
      const servers = await this.resourceManager.getHealthyServers();
      const serverLoads = await Promise.all(
        servers.map(async server => ({
          serverId: server.serverId,
          load: await this.calculateServerLoad(server)
        }))
      );

      // Sort by load and pick the least loaded server
      serverLoads.sort((a, b) => a.load - b.load);
      return serverLoads[0]?.serverId || null;
    });

    // Performance strategy - pick the most powerful server
    this.optimizationStrategies.set('performance', async deployment => {
      const servers = await this.resourceManager.getHealthyServers();
      const serverScores = await Promise.all(
        servers.map(async server => ({
          serverId: server.serverId,
          score: this.calculatePerformanceScore(server)
        }))
      );

      // Sort by performance score and pick the best
      serverScores.sort((a, b) => b.score - a.score);
      return serverScores[0]?.serverId || null;
    });

    // Efficiency strategy - minimize resource waste
    this.optimizationStrategies.set('efficiency', async deployment => {
      const servers = await this.resourceManager.getHealthyServers();
      let bestServer: string | null = null;
      let minWaste = Infinity;

      for (const server of servers) {
        const waste = this.calculateResourceWaste(server, deployment.resourceRequirements);
        if (waste < minWaste && waste >= 0) {
          minWaste = waste;
          bestServer = server.serverId;
        }
      }

      return bestServer;
    });

    // Locality strategy - keep related agents close
    this.optimizationStrategies.set('locality', async deployment => {
      if (deployment.constraints?.locality === 'same-server') {
        // Find server with most agents of the same type
        const agentDistribution = await this.getAgentDistribution();
        let maxCount = 0;
        let bestServer: string | null = null;

        for (const [serverId, agents] of agentDistribution) {
          const sameTypeCount = agents.filter(a => a.type === deployment.agentType).length;
          if (sameTypeCount > maxCount) {
            maxCount = sameTypeCount;
            bestServer = serverId;
          }
        }

        return bestServer;
      }

      // Default to balanced strategy
      return this.optimizationStrategies.get('balanced')!(deployment);
    });
  }

  /**
   * Setup event handlers for resource changes
   */
  private setupResourceEventHandlers(): void {
    this.resourceEventEmitter.on('server-overloaded', async (serverId: string) => {
      logger.warn(`Server ${serverId} is overloaded, initiating rebalancing`);
      await this.rebalanceAgents(serverId);
    });

    this.resourceEventEmitter.on('server-offline', async (serverId: string) => {
      logger.error(`Server ${serverId} went offline, migrating agents`);
      await this.migrateAgentsFromServer(serverId);
    });

    this.resourceEventEmitter.on('new-server-available', async (serverId: string) => {
      logger.info(`New server ${serverId} available, optimizing deployment`);
      await this.optimizeDeployment();
    });
  }

  /**
   * Deploy an agent with resource awareness
   */
  async deployAgent(
    agent: Agent,
    requirements?: ResourceRequirements,
    constraints?: DeploymentConstraints
  ): Promise<DeploymentResult> {
    const startTime = Date.now();

    const deployment: ResourceAwareDeployment = {
      agentId: agent.id,
      agentType: agent.type,
      resourceRequirements: requirements || this.getDefaultRequirements(agent.type),
      constraints,
      priority: this.determineAgentPriority(agent)
    };

    try {
      // Find optimal server based on requirements and constraints
      const optimalServerId = await this.findOptimalServer(deployment);

      if (!optimalServerId) {
        return {
          success: false,
          agentId: agent.id,
          deploymentTime: Date.now() - startTime,
          reason: 'No suitable server found for deployment'
        };
      }

      // Allocate resources on the selected server
      const allocation = await this.allocateResources(optimalServerId, deployment);

      if (!allocation.allocated) {
        return {
          success: false,
          agentId: agent.id,
          deploymentTime: Date.now() - startTime,
          reason: allocation.reason || 'Resource allocation failed'
        };
      }

      // Deploy the agent
      const result = await super.deployAgent(agent, { serverId: optimalServerId });

      const deploymentResult: DeploymentResult = {
        success: result.success,
        agentId: agent.id,
        serverId: optimalServerId,
        allocatedResources: allocation.allocation,
        deploymentTime: Date.now() - startTime,
        reason: result.success ? undefined : result.error
      };

      // Store deployment history
      this.deploymentHistory.set(agent.id, deploymentResult);

      // Emit deployment event
      this.resourceEventEmitter.emit('agent-deployed', deploymentResult);

      return deploymentResult;
    } catch (error) {
      logger.error(`Failed to deploy agent ${agent.id}:`, error);
      return {
        success: false,
        agentId: agent.id,
        deploymentTime: Date.now() - startTime,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deploy multiple agents with optimal resource distribution
   */
  async deployAgentSwarm(
    agents: Agent[],
    strategy: 'parallel' | 'sequential' | 'optimized' = 'optimized'
  ): Promise<DeploymentResult[]> {
    if (strategy === 'optimized') {
      // Sort agents by resource requirements and priority
      const sortedAgents = this.sortAgentsByResourceNeeds(agents);

      // Group agents that can share resources
      const agentGroups = this.groupAgentsByAffinity(sortedAgents);

      // Deploy groups in parallel, agents within groups optimally
      const results: DeploymentResult[] = [];

      for (const group of agentGroups) {
        const groupResults = await Promise.all(group.map(agent => this.deployAgent(agent)));
        results.push(...groupResults);
      }

      return results;
    }

    return super.deployAgentSwarm(agents, strategy as any);
  }

  /**
   * Find the optimal server for deployment
   */
  private async findOptimalServer(deployment: ResourceAwareDeployment): Promise<string | null> {
    // Apply constraints first
    let candidateServers = await this.resourceManager.getHealthyServers();

    if (deployment.constraints?.preferredServers) {
      candidateServers = candidateServers.filter(s =>
        deployment.constraints!.preferredServers!.includes(s.serverId)
      );
    }

    if (deployment.constraints?.excludedServers) {
      candidateServers = candidateServers.filter(
        s => !deployment.constraints!.excludedServers!.includes(s.serverId)
      );
    }

    // Filter by resource availability
    candidateServers = candidateServers.filter(server =>
      this.meetsResourceRequirements(server, deployment.resourceRequirements)
    );

    if (candidateServers.length === 0) {
      return null;
    }

    // Apply optimization strategy
    const strategy = this.resourceManager.getDeploymentStrategy();
    const strategyFunc =
      this.optimizationStrategies.get(strategy) || this.optimizationStrategies.get('balanced')!;

    return await strategyFunc(deployment);
  }

  /**
   * Check if a server meets resource requirements
   */
  private meetsResourceRequirements(
    server: MCPResourceReport,
    requirements: ResourceRequirements
  ): boolean {
    const resources = server.resources;

    // Check CPU requirements
    if (requirements.cpu) {
      if (requirements.cpu.cores && resources.cpu.cores < requirements.cpu.cores) {
        return false;
      }
      if (requirements.cpu.minUsage && resources.cpu.usage > 100 - requirements.cpu.minUsage) {
        return false;
      }
    }

    // Check memory requirements
    if (resources.memory.available < requirements.memory.minimum) {
      return false;
    }

    // Check GPU requirements
    if (requirements.gpu?.required) {
      if (!resources.gpu || resources.gpu.length === 0) {
        return false;
      }
      if (requirements.gpu.count && resources.gpu.length < requirements.gpu.count) {
        return false;
      }
      if (requirements.gpu.minMemory) {
        const hasEnoughGPUMemory = resources.gpu.some(
          gpu => gpu.memory.total - gpu.memory.used >= requirements.gpu!.minMemory!
        );
        if (!hasEnoughGPUMemory) {
          return false;
        }
      }
    }

    // Check network requirements
    if (requirements.network) {
      if (
        requirements.network.minBandwidth &&
        resources.network.bandwidth < requirements.network.minBandwidth
      ) {
        return false;
      }
      if (
        requirements.network.maxLatency &&
        resources.network.latency > requirements.network.maxLatency
      ) {
        return false;
      }
    }

    // Check capabilities
    if (requirements.capabilities) {
      const hasAllCapabilities = requirements.capabilities.every(cap =>
        resources.capabilities.includes(cap)
      );
      if (!hasAllCapabilities) {
        return false;
      }
    }

    return true;
  }

  /**
   * Allocate resources on a server
   */
  private async allocateResources(
    serverId: string,
    deployment: ResourceAwareDeployment
  ): Promise<ResourceAllocationResponse> {
    const request: ResourceAllocationRequest = {
      requestId: `${deployment.agentId}-${Date.now()}`,
      agentId: deployment.agentId,
      requirements: deployment.resourceRequirements,
      constraints: {
        preferredServers: [serverId],
        ...deployment.constraints
      },
      priority: deployment.priority || 'normal'
    };

    return await this.resourceManager.allocateResources(request);
  }

  /**
   * Calculate server load score (0-100)
   */
  private async calculateServerLoad(server: MCPResourceReport): Promise<number> {
    const cpuLoad = server.resources.cpu.usage;
    const memoryLoad = (server.resources.memory.used / server.resources.memory.total) * 100;

    let gpuLoad = 0;
    if (server.resources.gpu && server.resources.gpu.length > 0) {
      gpuLoad =
        server.resources.gpu.reduce((sum, gpu) => sum + gpu.utilization, 0) /
        server.resources.gpu.length;
    }

    // Weighted average
    return cpuLoad * 0.4 + memoryLoad * 0.4 + gpuLoad * 0.2;
  }

  /**
   * Calculate server performance score
   */
  private calculatePerformanceScore(server: MCPResourceReport): number {
    let score = 0;

    // CPU score (cores * available percentage)
    score += (server.resources.cpu.cores * (100 - server.resources.cpu.usage)) / 100;

    // Memory score (available memory in GB)
    score += (server.resources.memory.available / (1024 * 1024 * 1024)) * 10;

    // GPU score
    if (server.resources.gpu) {
      score += server.resources.gpu.length * 50;
    }

    // Network score (bandwidth in Gbps)
    score += (server.resources.network.bandwidth / 1000000000) * 5;

    // Capability score
    score += server.resources.capabilities.length * 2;

    return score;
  }

  /**
   * Calculate resource waste for efficiency optimization
   */
  private calculateResourceWaste(
    server: MCPResourceReport,
    requirements: ResourceRequirements
  ): number {
    if (!this.meetsResourceRequirements(server, requirements)) {
      return -1; // Cannot satisfy requirements
    }

    let waste = 0;

    // Memory waste
    const memoryWaste = server.resources.memory.available - requirements.memory.minimum;
    waste += memoryWaste / (1024 * 1024); // Convert to GB

    // CPU waste
    if (requirements.cpu?.cores) {
      const cpuWaste = server.resources.cpu.cores - requirements.cpu.cores;
      waste += cpuWaste * 10;
    }

    return waste;
  }

  /**
   * Get default resource requirements for an agent type
   */
  private getDefaultRequirements(agentType: string): ResourceRequirements {
    const defaults: Record<string, ResourceRequirements> = {
      coordinator: {
        memory: { minimum: 512, preferred: 1024 },
        cpu: { minUsage: 20 },
        capabilities: ['coordination', 'messaging']
      },
      researcher: {
        memory: { minimum: 1024, preferred: 2048 },
        cpu: { minUsage: 30 },
        network: { minBandwidth: 100 },
        capabilities: ['web-search', 'data-analysis']
      },
      coder: {
        memory: { minimum: 2048, preferred: 4096 },
        cpu: { cores: 2, minUsage: 40 },
        capabilities: ['code-execution', 'file-operations']
      },
      analyst: {
        memory: { minimum: 2048, preferred: 8192 },
        cpu: { cores: 4, minUsage: 50 },
        gpu: { required: false, minMemory: 4096 },
        capabilities: ['data-analysis', 'machine-learning']
      },
      tester: {
        memory: { minimum: 1024, preferred: 2048 },
        cpu: { cores: 2, minUsage: 30 },
        capabilities: ['code-execution', 'testing']
      }
    };

    return (
      defaults[agentType] || {
        memory: { minimum: 512, preferred: 1024 },
        cpu: { minUsage: 20 }
      }
    );
  }

  /**
   * Determine agent priority based on type and current system state
   */
  private determineAgentPriority(agent: Agent): 'low' | 'normal' | 'high' | 'critical' {
    if (agent.type === 'coordinator') {
      return 'high'; // Coordinators are always high priority
    }

    // Check if this agent type is scarce
    const agentCounts = this.getAgentTypeCounts();
    const count = agentCounts.get(agent.type) || 0;

    if (count === 0) {
      return 'high'; // First agent of a type is high priority
    } else if (count < 2) {
      return 'normal';
    }

    return 'low';
  }

  /**
   * Get agent type counts across the swarm
   */
  private getAgentTypeCounts(): Map<string, number> {
    const counts = new Map<string, number>();

    for (const agent of this.agents.values()) {
      const count = counts.get(agent.type) || 0;
      counts.set(agent.type, count + 1);
    }

    return counts;
  }

  /**
   * Get agent distribution across servers
   */
  private async getAgentDistribution(): Promise<Map<string, Agent[]>> {
    const distribution = new Map<string, Agent[]>();

    // This would be implemented with actual server-agent mapping
    // For now, return a placeholder
    for (const agent of this.agents.values()) {
      const serverId = 'default-server'; // Replace with actual mapping
      if (!distribution.has(serverId)) {
        distribution.set(serverId, []);
      }
      distribution.get(serverId)!.push(agent);
    }

    return distribution;
  }

  /**
   * Sort agents by resource needs for optimal deployment order
   */
  private sortAgentsByResourceNeeds(agents: Agent[]): Agent[] {
    return agents.sort((a, b) => {
      const reqA = this.getDefaultRequirements(a.type);
      const reqB = this.getDefaultRequirements(b.type);

      // Sort by memory requirements (descending)
      return reqB.memory.minimum - reqA.memory.minimum;
    });
  }

  /**
   * Group agents by affinity for co-location
   */
  private groupAgentsByAffinity(agents: Agent[]): Agent[][] {
    const groups: Agent[][] = [];
    const affinityMap = new Map<string, string[]>([
      ['coder', ['tester']],
      ['researcher', ['analyst']],
      ['coordinator', []]
    ]);

    const used = new Set<string>();

    for (const agent of agents) {
      if (used.has(agent.id)) continue;

      const group = [agent];
      used.add(agent.id);

      const affinities = affinityMap.get(agent.type) || [];

      for (const other of agents) {
        if (!used.has(other.id) && affinities.includes(other.type)) {
          group.push(other);
          used.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Rebalance agents from an overloaded server
   */
  private async rebalanceAgents(overloadedServerId: string): Promise<void> {
    logger.info(`Starting rebalancing from server ${overloadedServerId}`);

    // Get agents on the overloaded server
    const distribution = await this.getAgentDistribution();
    const agents = distribution.get(overloadedServerId) || [];

    if (agents.length === 0) return;

    // Sort agents by priority (low priority first for migration)
    agents.sort((a, b) => {
      const priorityA = this.determineAgentPriority(a);
      const priorityB = this.determineAgentPriority(b);
      const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };
      return priorityOrder[priorityA] - priorityOrder[priorityB];
    });

    // Migrate up to 30% of agents
    const migrateCount = Math.ceil(agents.length * 0.3);

    for (let i = 0; i < migrateCount; i++) {
      const agent = agents[i];
      await this.migrateAgent(agent.id, overloadedServerId);
    }
  }

  /**
   * Migrate agents from an offline server
   */
  private async migrateAgentsFromServer(offlineServerId: string): Promise<void> {
    logger.error(`Migrating all agents from offline server ${offlineServerId}`);

    const distribution = await this.getAgentDistribution();
    const agents = distribution.get(offlineServerId) || [];

    // Migrate all agents with high priority
    await Promise.all(
      agents.map(agent => this.migrateAgent(agent.id, offlineServerId, 'critical'))
    );
  }

  /**
   * Migrate a single agent to a new server
   */
  private async migrateAgent(
    agentId: string,
    fromServerId: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'high'
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    logger.info(`Migrating agent ${agentId} from server ${fromServerId}`);

    // Save agent state
    const state = await this.saveAgentState(agentId);

    // Remove from current server
    await this.removeAgent(agentId);

    // Redeploy with migration priority
    const requirements = this.getDefaultRequirements(agent.type);
    const result = await this.deployAgent(agent, requirements, {
      excludedServers: [fromServerId]
    });

    if (result.success && state) {
      // Restore agent state
      await this.restoreAgentState(agentId, state);
    }
  }

  /**
   * Optimize overall deployment across all servers
   */
  private async optimizeDeployment(): Promise<void> {
    logger.info('Starting deployment optimization');

    // Get current distribution and server states
    const distribution = await this.getAgentDistribution();
    const servers = await this.resourceManager.getHealthyServers();

    // Calculate ideal distribution
    const idealDistribution = this.calculateIdealDistribution(
      Array.from(this.agents.values()),
      servers
    );

    // Migrate agents to achieve ideal distribution
    // Implementation would involve complex optimization logic
  }

  /**
   * Calculate ideal agent distribution
   */
  private calculateIdealDistribution(
    agents: Agent[],
    servers: MCPResourceReport[]
  ): Map<string, Agent[]> {
    // Simplified implementation - would use more sophisticated algorithms
    const distribution = new Map<string, Agent[]>();

    // Initialize empty arrays for each server
    servers.forEach(server => distribution.set(server.serverId, []));

    // Distribute agents based on server capacity
    // This is a placeholder - real implementation would be more complex
    let serverIndex = 0;
    for (const agent of agents) {
      const serverId = servers[serverIndex].serverId;
      distribution.get(serverId)!.push(agent);
      serverIndex = (serverIndex + 1) % servers.length;
    }

    return distribution;
  }

  /**
   * Save agent state for migration
   */
  private async saveAgentState(agentId: string): Promise<any> {
    // Implementation would save agent's current state
    return { agentId, timestamp: Date.now() };
  }

  /**
   * Restore agent state after migration
   */
  private async restoreAgentState(agentId: string, state: any): Promise<void> {
    // Implementation would restore agent's state
    logger.info(`Restored state for agent ${agentId}`);
  }

  /**
   * Get deployment metrics
   */
  async getDeploymentMetrics(): Promise<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageDeploymentTime: number;
    resourceUtilization: Record<string, number>;
  }> {
    const deployments = Array.from(this.deploymentHistory.values());
    const successful = deployments.filter(d => d.success).length;
    const failed = deployments.length - successful;
    const avgTime =
      deployments.reduce((sum, d) => sum + d.deploymentTime, 0) / deployments.length || 0;

    const utilization = await this.resourceManager.getClusterUtilization();

    return {
      totalDeployments: deployments.length,
      successfulDeployments: successful,
      failedDeployments: failed,
      averageDeploymentTime: avgTime,
      resourceUtilization: utilization
    };
  }
}
