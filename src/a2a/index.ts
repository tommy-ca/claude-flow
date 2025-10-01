/**
 * A2A Capability Framework - Main Entry Point
 *
 * Integrates capability detection, semantic matching, protocol adaptation,
 * and performance learning for intelligent agent-to-agent protocol integration.
 */

export * from './capabilities/schema';
export * from './capabilities/detector';
export * from './matching/semantic-matcher';
export * from './adaptation/protocol-translator';
export * from './learning/performance-learner';

import { CapabilityDetector } from './capabilities/detector';
import { SemanticCapabilityMatcher } from './matching/semantic-matcher';
import { ProtocolTranslator } from './adaptation/protocol-translator';
import { PerformanceLearner } from './learning/performance-learner';
import {
  AgentManifest,
  Capability,
  CapabilityQuery,
  CapabilityMatch,
  AgentPlatform,
  CapabilityDiscoveryConfig
} from './capabilities/schema';

/**
 * A2A Capability Framework - Unified Interface
 */
export class A2ACapabilityFramework {
  private detector: CapabilityDetector;
  private matcher: SemanticCapabilityMatcher;
  private translator: ProtocolTranslator;
  private learner: PerformanceLearner;

  private capabilities: Map<string, Capability> = new Map();
  private manifests: Map<string, AgentManifest> = new Map();

  constructor(config?: Partial<CapabilityDiscoveryConfig>) {
    this.detector = new CapabilityDetector(config);
    this.matcher = new SemanticCapabilityMatcher();
    this.translator = new ProtocolTranslator();
    this.learner = new PerformanceLearner();
  }

  /**
   * Initialize the framework
   */
  async initialize(discoveryEndpoints?: string[]): Promise<void> {
    // Discover agents
    const manifests = await this.detector.discoverAgents(discoveryEndpoints);

    // Store manifests and capabilities
    for (const manifest of manifests) {
      this.manifests.set(manifest.agentId, manifest);

      for (const capability of manifest.capabilities) {
        this.capabilities.set(capability.id, capability);
      }
    }
  }

  /**
   * Register a new agent
   */
  async registerAgent(manifest: AgentManifest): Promise<void> {
    this.manifests.set(manifest.agentId, manifest);

    for (const capability of manifest.capabilities) {
      this.capabilities.set(capability.id, capability);

      // Adapt to new capability
      const taskTypes = this.inferTaskTypes(capability);
      await this.learner.adaptToNewCapability(capability, taskTypes);
    }
  }

  /**
   * Find capabilities matching a query
   */
  async findCapabilities(query: CapabilityQuery): Promise<CapabilityMatch[]> {
    const capabilities = Array.from(this.capabilities.values());
    const matches = await this.matcher.findMatches(query, capabilities);

    // Enhance matches with learning insights
    for (const match of matches) {
      const taskType = this.inferTaskType(query);
      if (taskType) {
        const prediction = await this.learner.predictPerformance(
          taskType,
          match.capability.id
        );
        match.estimatedPerformance = {
          ...match.estimatedPerformance,
          averageLatency: prediction.expectedLatency,
          successRate: prediction.expectedSuccess
        };
      }
    }

    return matches;
  }

  /**
   * Select optimal capability for a task
   */
  async selectOptimalCapability(
    taskDescription: string,
    constraints?: CapabilityQuery
  ): Promise<CapabilityMatch | null> {
    // Map task to capabilities
    const capabilities = Array.from(this.capabilities.values());
    const mapping = await this.matcher.mapTaskToCapabilities(
      taskDescription,
      capabilities
    );

    // Use performance-based routing
    const taskType = this.categorizeTask(taskDescription);
    const routingDecision = await this.learner.optimizeRouting(
      taskType,
      mapping.primaryCapabilities.map(m => m.capability)
    );

    // Find the match for selected capability
    return mapping.primaryCapabilities.find(
      m => m.capability.id === routingDecision.selectedCapability.id
    ) || null;
  }

  /**
   * Execute a capability with adaptation
   */
  async executeCapability(
    capabilityId: string,
    request: any,
    targetPlatform?: AgentPlatform
  ): Promise<any> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability ${capabilityId} not found`);
    }

    const startTime = Date.now();
    let success = false;
    let result: any;

    try {
      // Translate request if needed
      if (targetPlatform && capability.provider.platform !== targetPlatform) {
        request = await this.translator.translateRequest(
          request,
          capability.provider.platform,
          targetPlatform
        );
      }

      // Execute the capability (implementation would call actual agent)
      result = await this.performExecution(capability, request);
      success = true;

      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      // Track performance
      const latency = Date.now() - startTime;
      const taskType = this.categorizeRequest(request);

      await this.learner.trackPerformance(
        taskType,
        capabilityId,
        {
          averageLatency: latency,
          successRate: success ? 1 : 0
        },
        success
      );
    }
  }

  /**
   * Get capability statistics
   */
  getCapabilityStats(capabilityId: string, taskType?: string) {
    return this.learner.getPerformanceStats(capabilityId, taskType);
  }

  /**
   * Compare capabilities for a task
   */
  async compareCapabilities(
    taskDescription: string,
    capabilityIds?: string[]
  ) {
    const taskType = this.categorizeTask(taskDescription);
    const capabilities = capabilityIds
      ? capabilityIds.map(id => this.capabilities.get(id)!).filter(Boolean)
      : Array.from(this.capabilities.values());

    return this.learner.compareCapabilities(taskType, capabilities);
  }

  /**
   * Introspect an agent's capabilities
   */
  async introspectAgent(agentId: string, platform: AgentPlatform) {
    const capabilities = await this.detector.introspectAgent(agentId, platform);

    // Store discovered capabilities
    for (const capability of capabilities) {
      this.capabilities.set(capability.id, capability);
    }

    return capabilities;
  }

  /**
   * Build compatibility matrix
   */
  buildCompatibilityMatrix() {
    const capabilities = Array.from(this.capabilities.values());
    return this.detector.buildCompatibilityMatrix(capabilities);
  }

  /**
   * Detect feature gaps
   */
  detectFeatureGaps(capabilityId: string, targetPlatform: AgentPlatform) {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability ${capabilityId} not found`);
    }

    return this.translator.detectFeatureGaps(capability, targetPlatform);
  }

  /**
   * Create adaptation strategy
   */
  createAdaptationStrategy(capabilityId: string, targetPlatform: AgentPlatform) {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability ${capabilityId} not found`);
    }

    return this.translator.createAdaptationStrategy(capability, targetPlatform);
  }

  /**
   * Perform actual capability execution
   */
  private async performExecution(capability: Capability, request: any): Promise<any> {
    // In production, this would call the actual agent
    // For now, return mock result
    return {
      success: true,
      result: 'Mock execution result',
      capabilityId: capability.id
    };
  }

  /**
   * Infer task types from capability
   */
  private inferTaskTypes(capability: Capability): string[] {
    const taskTypes: string[] = [];

    // Use category as primary task type
    taskTypes.push(capability.category);

    // Use tags as additional task types
    taskTypes.push(...capability.tags);

    return taskTypes;
  }

  /**
   * Infer task type from query
   */
  private inferTaskType(query: CapabilityQuery): string | undefined {
    if (query.category) {
      return query.category;
    }

    if (query.description) {
      return this.categorizeTask(query.description);
    }

    return undefined;
  }

  /**
   * Categorize task from description
   */
  private categorizeTask(description: string): string {
    const lower = description.toLowerCase();

    if (lower.includes('analyze') || lower.includes('analysis')) {
      return 'analysis';
    }
    if (lower.includes('generate') || lower.includes('create')) {
      return 'generation';
    }
    if (lower.includes('search') || lower.includes('find')) {
      return 'search';
    }
    if (lower.includes('transform') || lower.includes('convert')) {
      return 'transformation';
    }
    if (lower.includes('coordinate') || lower.includes('orchestrate')) {
      return 'coordination';
    }

    return 'general';
  }

  /**
   * Categorize request
   */
  private categorizeRequest(request: any): string {
    // Simple categorization based on request structure
    if (request.taskDescription) {
      return this.categorizeTask(request.taskDescription);
    }

    return 'general';
  }
}

export default A2ACapabilityFramework;
