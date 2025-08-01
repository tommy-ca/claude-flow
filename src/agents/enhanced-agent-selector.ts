/**
 * Enhanced Agent Selector - Reliable agent selection with comprehensive error handling
 * 
 * This module provides robust agent selection capabilities with multiple fallback strategies,
 * comprehensive error handling, and integration with both the agent loader and registry systems.
 */

import { agentLoader, type AgentDefinition } from './agent-loader.js';
import { SpecsDrivenAgentSelector, type AgentMatch } from './specs-driven-agent-selector.js';
import type { AgentRegistry } from './agent-registry.js';
import type { ILogger } from '../core/logger.js';

export interface AgentSelectionCriteria {
  capability: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  preferredAgents?: string[];
  excludeAgents?: string[];
  maxCandidates?: number;
  minConfidence?: number;
  fallbackStrategy?: 'strict' | 'flexible' | 'any';
  timeout?: number;
}

export interface AgentSelectionResult {
  success: boolean;
  selectedAgent: string | null;
  confidence: number;
  alternatives: string[];
  selectionReason: string;
  fallbackUsed: boolean;
  errorMessage?: string;
  executionTime: number;
}

export interface AgentAvailabilityInfo {
  agentName: string;
  available: boolean;
  workload: number;
  lastActive: Date | null;
  capabilities: string[];
  healthScore: number;
}

/**
 * Enhanced agent selector with comprehensive error handling and fallback strategies
 */
export class EnhancedAgentSelector {
  private logger: ILogger;
  private registry: AgentRegistry | null = null;
  private cache = new Map<string, AgentSelectionResult>();
  private cacheExpiry = 60000; // 1 minute
  private selectionStats = {
    totalSelections: 0,
    successfulSelections: 0,
    fallbacksUsed: 0,
    averageSelectionTime: 0
  };

  // Core capability to agent mappings with fallbacks
  private static readonly ENHANCED_CAPABILITY_MAP: Record<string, { primary: string[], fallback: string[] }> = {
    // Core development capabilities
    'code-generation': {
      primary: ['coder', 'sparc-coder', 'backend-dev'],
      fallback: ['implementer-sparc-coder', 'mobile-dev']
    },
    'code-review': {
      primary: ['reviewer', 'code-analyzer'],
      fallback: ['coder', 'sparc-coder']
    },
    'testing': {
      primary: ['tester', 'tdd-london-swarm'],
      fallback: ['production-validator', 'reviewer']
    },
    'analysis': {
      primary: ['analyst', 'performance-analyzer'],
      fallback: ['researcher', 'code-analyzer']
    },
    'architecture': {
      primary: ['system-architect', 'architecture'],
      fallback: ['architect', 'planner']
    },
    'research': {
      primary: ['researcher'],
      fallback: ['analyst', 'planner']
    },
    'planning': {
      primary: ['planner', 'task-orchestrator'],
      fallback: ['coordinator', 'sparc-coordinator']
    },
    'coordination': {
      primary: ['task-orchestrator', 'sparc-coordinator'],
      fallback: ['hierarchical-coordinator', 'mesh-coordinator']
    },
    
    // SPARC methodology capabilities
    'specification': {
      primary: ['specification'],
      fallback: ['researcher', 'planner']
    },
    'pseudocode': {
      primary: ['pseudocode'],
      fallback: ['architect', 'coder']
    },
    'refinement': {
      primary: ['refinement'],
      fallback: ['reviewer', 'analyst']
    },
    
    // GitHub and DevOps capabilities
    'github-management': {
      primary: ['github-modes', 'pr-manager'],
      fallback: ['workflow-automation', 'issue-tracker']
    },
    'ci-cd': {
      primary: ['ops-cicd-github', 'workflow-automation'],
      fallback: ['github-modes', 'release-manager']
    },
    
    // Specialized capabilities
    'documentation': {
      primary: ['api-docs'],
      fallback: ['specification', 'reviewer']
    },
    'mobile-development': {
      primary: ['mobile-dev', 'spec-mobile-react-native'],
      fallback: ['coder', 'backend-dev']
    },
    'api-development': {
      primary: ['backend-dev', 'dev-backend-api'],
      fallback: ['coder', 'api-docs']
    },
    'performance-optimization': {
      primary: ['performance-analyzer', 'analyst'],
      fallback: ['code-analyzer', 'reviewer']
    },
    'machine-learning': {
      primary: ['data-ml-model'],
      fallback: ['analyst', 'researcher']
    }
  };

  constructor(logger: ILogger, registry?: AgentRegistry) {
    this.logger = logger;
    this.registry = registry || null;
  }

  /**
   * Select the best agent for a given capability with comprehensive error handling
   */
  async selectAgent(criteria: AgentSelectionCriteria): Promise<AgentSelectionResult> {
    const startTime = Date.now();
    
    try {
      this.selectionStats.totalSelections++;
      
      // Check cache first (unless strict mode)
      if (criteria.fallbackStrategy !== 'strict') {
        const cached = this.getCachedResult(criteria);
        if (cached) {
          return {
            ...cached,
            executionTime: Date.now() - startTime
          };
        }
      }

      // Strategy 1: Primary capability mapping
      let result = await this.selectFromPrimaryMapping(criteria);
      if (result.success) {
        this.selectionStats.successfulSelections++;
        this.cacheResult(criteria, result);
        return { ...result, executionTime: Date.now() - startTime };
      }

      // Strategy 2: Registry-based selection (if available)
      if (this.registry && criteria.fallbackStrategy !== 'strict') {
        result = await this.selectFromRegistry(criteria);
        if (result.success) {
          this.selectionStats.successfulSelections++;
          this.selectionStats.fallbacksUsed++;
          this.cacheResult(criteria, result);
          return { ...result, executionTime: Date.now() - startTime };
        }
      }

      // Strategy 3: Specs-driven selection
      if (criteria.fallbackStrategy === 'flexible' || criteria.fallbackStrategy === 'any') {
        result = await this.selectFromSpecsDriven(criteria);
        if (result.success) {
          this.selectionStats.successfulSelections++;
          this.selectionStats.fallbacksUsed++;
          this.cacheResult(criteria, result);
          return { ...result, executionTime: Date.now() - startTime };
        }
      }

      // Strategy 4: Fallback mapping
      if (criteria.fallbackStrategy === 'any') {
        result = await this.selectFromFallbackMapping(criteria);
        if (result.success) {
          this.selectionStats.successfulSelections++;
          this.selectionStats.fallbacksUsed++;
          this.cacheResult(criteria, result);
          return { ...result, executionTime: Date.now() - startTime };
        }
      }

      // Strategy 5: Last resort - any available agent
      if (criteria.fallbackStrategy === 'any') {
        result = await this.selectAnyAvailableAgent(criteria);
        if (result.success) {
          this.selectionStats.successfulSelections++;
          this.selectionStats.fallbacksUsed++;
          return { ...result, executionTime: Date.now() - startTime };
        }
      }

      // No agent found
      return {
        success: false,
        selectedAgent: null,
        confidence: 0,
        alternatives: [],
        selectionReason: `No suitable agent found for capability: ${criteria.capability}`,
        fallbackUsed: false,
        errorMessage: `Agent selection failed for capability '${criteria.capability}' with strategy '${criteria.fallbackStrategy || 'flexible'}'`,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('Agent selection failed with error', {
        capability: criteria.capability,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        selectedAgent: null,
        confidence: 0,
        alternatives: [],
        selectionReason: 'Selection failed due to error',
        fallbackUsed: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get multiple agent options for a capability
   */
  async getAgentOptions(criteria: AgentSelectionCriteria): Promise<AgentAvailabilityInfo[]> {
    const options: AgentAvailabilityInfo[] = [];
    
    try {
      // Get primary options
      const mapping = EnhancedAgentSelector.ENHANCED_CAPABILITY_MAP[criteria.capability];
      if (mapping) {
        for (const agentName of [...mapping.primary, ...mapping.fallback]) {
          if (await agentLoader.isValidAgentType(agentName)) {
            const agent = await agentLoader.getAgent(agentName);
            if (agent) {
              options.push({
                agentName,
                available: true,
                workload: 0, // Would be real data from registry
                lastActive: new Date(),
                capabilities: this.extractCapabilities(agent),
                healthScore: 1.0
              });
            }
          }
        }
      }

      // Add registry options if available
      if (this.registry) {
        try {
          const registryOptions = await this.registry.searchByCapabilities([criteria.capability]);
          for (const agent of registryOptions) {
            if (!options.find(opt => opt.agentName === agent.name)) {
              options.push({
                agentName: agent.name,
                available: agent.status === 'idle',
                workload: agent.workload,
                lastActive: agent.metrics.lastActivity,
                capabilities: [
                  ...agent.capabilities.languages,
                  ...agent.capabilities.frameworks,
                  ...agent.capabilities.domains,
                  ...agent.capabilities.tools
                ],
                healthScore: agent.health
              });
            }
          }
        } catch (error) {
          this.logger.warn('Failed to get registry options', { error });
        }
      }

      return options.sort((a, b) => b.healthScore - a.healthScore);
    } catch (error) {
      this.logger.error('Failed to get agent options', { error });
      return [];
    }
  }

  /**
   * Validate that an agent supports a capability
   */
  async validateAgentCapability(agentName: string, capability: string): Promise<boolean> {
    try {
      // Check if agent exists
      if (!(await agentLoader.isValidAgentType(agentName))) {
        return false;
      }

      // Check specs-driven validation
      const isValid = await SpecsDrivenAgentSelector.validateAgentCapability(agentName, capability);
      if (isValid) {
        return true;
      }

      // Check mapping validation
      const mapping = EnhancedAgentSelector.ENHANCED_CAPABILITY_MAP[capability];
      if (mapping) {
        return [...mapping.primary, ...mapping.fallback].includes(agentName);
      }

      // Check agent definition
      const agent = await agentLoader.getAgent(agentName);
      if (agent) {
        const capabilities = this.extractCapabilities(agent);
        return capabilities.some(cap => 
          cap.toLowerCase().includes(capability.toLowerCase()) ||
          capability.toLowerCase().includes(cap.toLowerCase())
        );
      }

      return false;
    } catch (error) {
      this.logger.error('Agent capability validation failed', { agentName, capability, error });
      return false;
    }
  }

  /**
   * Get selection statistics
   */
  getSelectionStats() {
    const successRate = this.selectionStats.totalSelections > 0 
      ? this.selectionStats.successfulSelections / this.selectionStats.totalSelections 
      : 0;
    
    const fallbackRate = this.selectionStats.totalSelections > 0
      ? this.selectionStats.fallbacksUsed / this.selectionStats.totalSelections
      : 0;

    return {
      ...this.selectionStats,
      successRate,
      fallbackRate,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear selection cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods

  private async selectFromPrimaryMapping(criteria: AgentSelectionCriteria): Promise<AgentSelectionResult> {
    const mapping = EnhancedAgentSelector.ENHANCED_CAPABILITY_MAP[criteria.capability];
    if (!mapping) {
      return this.createFailureResult('No primary mapping found');
    }

    // Try primary agents first
    for (const agentName of mapping.primary) {
      if (criteria.excludeAgents?.includes(agentName)) continue;
      
      if (await agentLoader.isValidAgentType(agentName)) {
        return {
          success: true,
          selectedAgent: agentName,
          confidence: 0.9,
          alternatives: mapping.primary.filter(a => a !== agentName).slice(0, 2),
          selectionReason: `Primary mapping for ${criteria.capability}`,
          fallbackUsed: false
        } as AgentSelectionResult;
      }
    }

    return this.createFailureResult('No primary agents available');
  }

  private async selectFromRegistry(criteria: AgentSelectionCriteria): Promise<AgentSelectionResult> {
    if (!this.registry) {
      return this.createFailureResult('Registry not available');
    }

    try {
      const bestAgent = await this.registry.findBestAgent(
        criteria.capability,
        [criteria.capability],
        criteria.preferredAgents?.[0]
      );

      if (bestAgent) {
        return {
          success: true,
          selectedAgent: bestAgent.name,
          confidence: 0.8,
          alternatives: [],
          selectionReason: `Registry selection for ${criteria.capability}`,
          fallbackUsed: true
        } as AgentSelectionResult;
      }
    } catch (error) {
      this.logger.warn('Registry selection failed', { error });
    }

    return this.createFailureResult('Registry selection failed');
  }

  private async selectFromSpecsDriven(criteria: AgentSelectionCriteria): Promise<AgentSelectionResult> {
    try {
      const bestAgent = await SpecsDrivenAgentSelector.findBestAgent(criteria.capability);
      if (bestAgent) {
        return {
          success: true,
          selectedAgent: bestAgent,
          confidence: 0.7,
          alternatives: [],
          selectionReason: `Specs-driven selection for ${criteria.capability}`,
          fallbackUsed: true
        } as AgentSelectionResult;
      }
    } catch (error) {
      this.logger.warn('Specs-driven selection failed', { error });
    }

    return this.createFailureResult('Specs-driven selection failed');
  }

  private async selectFromFallbackMapping(criteria: AgentSelectionCriteria): Promise<AgentSelectionResult> {
    const mapping = EnhancedAgentSelector.ENHANCED_CAPABILITY_MAP[criteria.capability];
    if (!mapping?.fallback?.length) {
      return this.createFailureResult('No fallback mapping available');
    }

    for (const agentName of mapping.fallback) {
      if (criteria.excludeAgents?.includes(agentName)) continue;
      
      if (await agentLoader.isValidAgentType(agentName)) {
        return {
          success: true,
          selectedAgent: agentName,
          confidence: 0.6,
          alternatives: mapping.fallback.filter(a => a !== agentName).slice(0, 2),
          selectionReason: `Fallback mapping for ${criteria.capability}`,
          fallbackUsed: true
        } as AgentSelectionResult;
      }
    }

    return this.createFailureResult('No fallback agents available');
  }

  private async selectAnyAvailableAgent(criteria: AgentSelectionCriteria): Promise<AgentSelectionResult> {
    try {
      const allAgents = await agentLoader.getAllAgents();
      const availableAgents = allAgents.filter(agent => 
        !criteria.excludeAgents?.includes(agent.name)
      );

      if (availableAgents.length > 0) {
        // Prefer agents with higher capability matches
        const scored = availableAgents.map(agent => ({
          agent,
          score: this.calculateCapabilityScore(agent, criteria.capability)
        }));

        scored.sort((a, b) => b.score - a.score);
        const bestAgent = scored[0].agent;

        return {
          success: true,
          selectedAgent: bestAgent.name,
          confidence: 0.3,
          alternatives: scored.slice(1, 3).map(s => s.agent.name),
          selectionReason: `Last resort selection - any available agent`,
          fallbackUsed: true
        } as AgentSelectionResult;
      }
    } catch (error) {
      this.logger.warn('Any available agent selection failed', { error });
    }

    return this.createFailureResult('No agents available');
  }

  private createFailureResult(reason: string): AgentSelectionResult {
    return {
      success: false,
      selectedAgent: null,
      confidence: 0,
      alternatives: [],
      selectionReason: reason,
      fallbackUsed: false,
      executionTime: 0
    };
  }

  private extractCapabilities(agent: AgentDefinition): string[] {
    const capabilities: string[] = [];

    if (Array.isArray(agent.capabilities)) {
      capabilities.push(...agent.capabilities);
    } else if (agent.capabilities && typeof agent.capabilities === 'object') {
      const caps = agent.capabilities as any;
      if (caps.allowed_tools) capabilities.push(...caps.allowed_tools);
      if (caps.domains) capabilities.push(...caps.domains);
    }

    if (agent.type) capabilities.push(agent.type);
    capabilities.push(agent.name);

    return [...new Set(capabilities)];
  }

  private calculateCapabilityScore(agent: AgentDefinition, capability: string): number {
    const capabilities = this.extractCapabilities(agent);
    const agentText = `${agent.name} ${agent.description} ${capabilities.join(' ')}`.toLowerCase();
    const capWords = capability.toLowerCase().split(/[_\s-]+/);
    
    let score = 0;
    for (const word of capWords) {
      if (word.length > 2 && agentText.includes(word)) {
        score++;
      }
    }

    return score / capWords.length;
  }

  private getCachedResult(criteria: AgentSelectionCriteria): AgentSelectionResult | null {
    const key = this.generateCacheKey(criteria);
    return this.cache.get(key) || null;
  }

  private cacheResult(criteria: AgentSelectionCriteria, result: AgentSelectionResult): void {
    const key = this.generateCacheKey(criteria);
    this.cache.set(key, result);

    // Clean old cache entries
    setTimeout(() => this.cache.delete(key), this.cacheExpiry);
  }

  private generateCacheKey(criteria: AgentSelectionCriteria): string {
    return JSON.stringify({
      capability: criteria.capability,
      preferredAgents: criteria.preferredAgents?.sort(),
      excludeAgents: criteria.excludeAgents?.sort(),
      fallbackStrategy: criteria.fallbackStrategy
    });
  }
}

/**
 * Factory function for creating enhanced agent selector
 */
export function createEnhancedAgentSelector(
  logger: ILogger,
  registry?: AgentRegistry
): EnhancedAgentSelector {
  return new EnhancedAgentSelector(logger, registry);
}