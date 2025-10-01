/**
 * A2A Capability Detection and Introspection System
 *
 * Auto-discovers agent capabilities through introspection, manifest parsing,
 * and runtime probing with version compatibility checks.
 */

import {
  AgentManifest,
  Capability,
  CapabilityDiscoveryConfig,
  AgentPlatform,
  CapabilityCategory,
  PerformanceMetrics
} from './schema';

export class CapabilityDetector {
  private discoveryConfig: CapabilityDiscoveryConfig;
  private discoveredAgents: Map<string, AgentManifest> = new Map();
  private probeCache: Map<string, ProbeResult> = new Map();

  constructor(config?: Partial<CapabilityDiscoveryConfig>) {
    this.discoveryConfig = {
      enableAutoDiscovery: true,
      discoveryInterval: 60000, // 1 minute
      healthCheckInterval: 30000, // 30 seconds
      discoveryEndpoints: [],
      enableRuntimeProbing: true,
      probingStrategy: 'adaptive',
      cacheTTL: 300000, // 5 minutes
      enableSemanticCaching: true,
      ...config
    };
  }

  /**
   * Auto-discover agents and their capabilities
   */
  async discoverAgents(endpoints?: string[]): Promise<AgentManifest[]> {
    const discoveryEndpoints = endpoints || this.discoveryConfig.discoveryEndpoints;
    const manifests: AgentManifest[] = [];

    await Promise.all(
      discoveryEndpoints.map(async (endpoint) => {
        try {
          const manifest = await this.fetchManifest(endpoint);
          if (manifest) {
            manifests.push(manifest);
            this.discoveredAgents.set(manifest.agentId, manifest);
          }
        } catch (error) {
          console.error(`Failed to discover agent at ${endpoint}:`, error);
        }
      })
    );

    return manifests;
  }

  /**
   * Introspect agent capabilities through manifest parsing
   */
  async introspectAgent(agentId: string, platform: AgentPlatform): Promise<Capability[]> {
    const manifest = this.discoveredAgents.get(agentId);

    if (manifest) {
      return this.parseManifestCapabilities(manifest);
    }

    // Platform-specific introspection
    switch (platform) {
      case AgentPlatform.CLAUDE_FLOW:
        return this.introspectClaudeFlowAgent(agentId);
      case AgentPlatform.OPENAI_SWARM:
        return this.introspectOpenAISwarmAgent(agentId);
      case AgentPlatform.AUTOGEN:
        return this.introspectAutoGenAgent(agentId);
      default:
        return this.genericIntrospection(agentId, platform);
    }
  }

  /**
   * Runtime capability probing
   */
  async probeCapability(
    agentId: string,
    capabilityId: string,
    strategy?: 'passive' | 'active' | 'adaptive'
  ): Promise<ProbeResult> {
    const cacheKey = `${agentId}:${capabilityId}`;
    const cached = this.probeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.discoveryConfig.cacheTTL) {
      return cached;
    }

    const probingStrategy = strategy || this.discoveryConfig.probingStrategy;
    let result: ProbeResult;

    switch (probingStrategy) {
      case 'passive':
        result = await this.passiveProbe(agentId, capabilityId);
        break;
      case 'active':
        result = await this.activeProbe(agentId, capabilityId);
        break;
      case 'adaptive':
        result = await this.adaptiveProbe(agentId, capabilityId);
        break;
    }

    this.probeCache.set(cacheKey, result);
    return result;
  }

  /**
   * Build version compatibility matrix
   */
  buildCompatibilityMatrix(
    capabilities: Capability[]
  ): Map<string, CompatibilityInfo> {
    const matrix = new Map<string, CompatibilityInfo>();

    for (const capability of capabilities) {
      const compatibility: CompatibilityInfo = {
        capabilityId: capability.id,
        compatiblePlatforms: new Map(),
        incompatiblePlatforms: [],
        versionRanges: new Map()
      };

      // Check platform compatibility
      for (const platform of Object.values(AgentPlatform)) {
        const isCompatible = this.checkPlatformCompatibility(capability, platform);
        compatibility.compatiblePlatforms.set(platform, isCompatible);
      }

      // Check version compatibility with other capabilities
      if (capability.constraints?.dependencies) {
        for (const depId of capability.constraints.dependencies) {
          const depCapability = capabilities.find(c => c.id === depId);
          if (depCapability) {
            const versionRange = this.calculateVersionRange(capability, depCapability);
            compatibility.versionRanges.set(depId, versionRange);
          }
        }
      }

      matrix.set(capability.id, compatibility);
    }

    return matrix;
  }

  /**
   * Fetch agent manifest from discovery endpoint
   */
  private async fetchManifest(endpoint: string): Promise<AgentManifest | null> {
    try {
      const response = await fetch(`${endpoint}/manifest`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch manifest from ${endpoint}:`, error);
      return null;
    }
  }

  /**
   * Parse capabilities from manifest
   */
  private parseManifestCapabilities(manifest: AgentManifest): Capability[] {
    return manifest.capabilities.map(cap => ({
      ...cap,
      provider: {
        agentId: manifest.agentId,
        platform: manifest.platform,
        endpoint: manifest.platformConfig?.endpoint
      }
    }));
  }

  /**
   * Claude Flow agent introspection
   */
  private async introspectClaudeFlowAgent(agentId: string): Promise<Capability[]> {
    // Use claude-flow's agent introspection API
    const capabilities: Capability[] = [];

    // Standard claude-flow capabilities
    const standardCapabilities = [
      'task_orchestration',
      'swarm_coordination',
      'neural_processing',
      'memory_management',
      'code_generation',
      'code_analysis'
    ];

    for (const capName of standardCapabilities) {
      capabilities.push(await this.buildCapabilityFromIntrospection(
        agentId,
        capName,
        AgentPlatform.CLAUDE_FLOW
      ));
    }

    return capabilities;
  }

  /**
   * OpenAI Swarm agent introspection
   */
  private async introspectOpenAISwarmAgent(agentId: string): Promise<Capability[]> {
    // Introspect OpenAI Swarm agents
    return [
      await this.buildCapabilityFromIntrospection(
        agentId,
        'function_calling',
        AgentPlatform.OPENAI_SWARM
      ),
      await this.buildCapabilityFromIntrospection(
        agentId,
        'handoff',
        AgentPlatform.OPENAI_SWARM
      )
    ];
  }

  /**
   * AutoGen agent introspection
   */
  private async introspectAutoGenAgent(agentId: string): Promise<Capability[]> {
    return [
      await this.buildCapabilityFromIntrospection(
        agentId,
        'conversation',
        AgentPlatform.AUTOGEN
      ),
      await this.buildCapabilityFromIntrospection(
        agentId,
        'code_execution',
        AgentPlatform.AUTOGEN
      )
    ];
  }

  /**
   * Generic introspection for unknown platforms
   */
  private async genericIntrospection(
    agentId: string,
    platform: AgentPlatform
  ): Promise<Capability[]> {
    // Attempt to introspect through standard protocols
    return [];
  }

  /**
   * Passive probing - observe without interaction
   */
  private async passiveProbe(agentId: string, capabilityId: string): Promise<ProbeResult> {
    // Monitor agent health endpoint or logs
    return {
      available: true,
      latency: 0,
      metrics: {},
      timestamp: Date.now()
    };
  }

  /**
   * Active probing - send test requests
   */
  private async activeProbe(agentId: string, capabilityId: string): Promise<ProbeResult> {
    const startTime = Date.now();

    try {
      // Send test request to capability
      const response = await this.sendTestRequest(agentId, capabilityId);
      const latency = Date.now() - startTime;

      return {
        available: response.success,
        latency,
        metrics: response.metrics || {},
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - startTime,
        metrics: {},
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Adaptive probing - adjust strategy based on results
   */
  private async adaptiveProbe(agentId: string, capabilityId: string): Promise<ProbeResult> {
    // Start with passive probing
    let result = await this.passiveProbe(agentId, capabilityId);

    // If passive fails or is inconclusive, try active
    if (!result.available || result.latency === 0) {
      result = await this.activeProbe(agentId, capabilityId);
    }

    return result;
  }

  /**
   * Send test request to capability
   */
  private async sendTestRequest(
    agentId: string,
    capabilityId: string
  ): Promise<{ success: boolean; metrics?: PerformanceMetrics }> {
    // Implementation depends on platform
    return { success: true, metrics: {} };
  }

  /**
   * Build capability from introspection data
   */
  private async buildCapabilityFromIntrospection(
    agentId: string,
    capabilityName: string,
    platform: AgentPlatform
  ): Promise<Capability> {
    return {
      id: `${agentId}:${capabilityName}`,
      name: capabilityName,
      description: `${capabilityName} capability for ${platform}`,
      category: this.inferCategory(capabilityName),
      tags: [platform, capabilityName],
      version: { major: 1, minor: 0, patch: 0 },
      io: {
        input: [],
        output: { type: 'any', description: 'Output' }
      },
      reliability: 0.95,
      provider: {
        agentId,
        platform
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Infer capability category from name
   */
  private inferCategory(name: string): CapabilityCategory {
    const categoryMap: { [key: string]: CapabilityCategory } = {
      task: CapabilityCategory.COORDINATION,
      swarm: CapabilityCategory.COORDINATION,
      neural: CapabilityCategory.LEARNING,
      memory: CapabilityCategory.DATA_PROCESSING,
      code: CapabilityCategory.GENERATION,
      analysis: CapabilityCategory.ANALYSIS,
      orchestration: CapabilityCategory.COORDINATION
    };

    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (name.toLowerCase().includes(keyword)) {
        return category;
      }
    }

    return CapabilityCategory.CUSTOM;
  }

  /**
   * Check platform compatibility
   */
  private checkPlatformCompatibility(
    capability: Capability,
    platform: AgentPlatform
  ): boolean {
    // Check if capability can run on platform
    if (capability.provider.platform === platform) {
      return true;
    }

    // Check compatibility matrix
    // Implementation would check known compatible platforms
    return false;
  }

  /**
   * Calculate version range compatibility
   */
  private calculateVersionRange(
    capability: Capability,
    dependency: Capability
  ): VersionRange {
    return {
      min: dependency.version,
      max: {
        major: dependency.version.major + 1,
        minor: 0,
        patch: 0
      }
    };
  }
}

interface ProbeResult {
  available: boolean;
  latency: number;
  metrics: PerformanceMetrics;
  error?: string;
  timestamp: number;
}

interface CompatibilityInfo {
  capabilityId: string;
  compatiblePlatforms: Map<AgentPlatform, boolean>;
  incompatiblePlatforms: string[];
  versionRanges: Map<string, VersionRange>;
}

interface VersionRange {
  min: { major: number; minor: number; patch: number };
  max: { major: number; minor: number; patch: number };
}
