/**
 * A2A Capability Framework Tests
 *
 * Comprehensive test suite for the A2A capability framework including
 * detection, matching, adaptation, and learning components.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  A2ACapabilityFramework,
  AgentManifest,
  Capability,
  AgentPlatform,
  CapabilityCategory,
  CapabilityQuery
} from '../../src/a2a';

describe('A2A Capability Framework', () => {
  let framework: A2ACapabilityFramework;

  beforeEach(() => {
    framework = new A2ACapabilityFramework({
      enableAutoDiscovery: false,
      enableRuntimeProbing: false
    });
  });

  describe('Capability Detection', () => {
    it('should register agent manifest', async () => {
      const manifest: AgentManifest = {
        agentId: 'test-agent-1',
        name: 'Test Agent',
        description: 'A test agent for capability detection',
        platform: AgentPlatform.CLAUDE_FLOW,
        version: { major: 1, minor: 0, patch: 0 },
        capabilities: [
          {
            id: 'test-cap-1',
            name: 'code_generation',
            description: 'Generate code based on specifications',
            category: CapabilityCategory.GENERATION,
            tags: ['code', 'generation', 'programming'],
            version: { major: 1, minor: 0, patch: 0 },
            io: {
              input: [
                {
                  name: 'specification',
                  type: 'string',
                  description: 'Code specification',
                  required: true
                }
              ],
              output: {
                type: 'string',
                description: 'Generated code'
              }
            },
            reliability: 0.95,
            provider: {
              agentId: 'test-agent-1',
              platform: AgentPlatform.CLAUDE_FLOW
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await framework.registerAgent(manifest);

      const query: CapabilityQuery = {
        capabilityId: 'test-cap-1'
      };

      const matches = await framework.findCapabilities(query);
      expect(matches).toHaveLength(1);
      expect(matches[0].capability.id).toBe('test-cap-1');
    });

    it('should introspect agent capabilities', async () => {
      const capabilities = await framework.introspectAgent(
        'claude-flow-agent',
        AgentPlatform.CLAUDE_FLOW
      );

      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities[0]).toHaveProperty('id');
      expect(capabilities[0]).toHaveProperty('provider');
    });

    it('should build compatibility matrix', async () => {
      // Register multiple agents
      await registerTestAgents(framework);

      const matrix = framework.buildCompatibilityMatrix();

      expect(matrix.size).toBeGreaterThan(0);
      for (const [capId, compat] of matrix) {
        expect(compat).toHaveProperty('compatiblePlatforms');
        expect(compat).toHaveProperty('versionRanges');
      }
    });
  });

  describe('Semantic Capability Matching', () => {
    beforeEach(async () => {
      await registerTestAgents(framework);
    });

    it('should find capabilities by semantic search', async () => {
      const query: CapabilityQuery = {
        description: 'Generate TypeScript code for a REST API',
        minReliability: 0.8
      };

      const matches = await framework.findCapabilities(query);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].score).toBeGreaterThan(0.5);
      expect(matches[0].matchReasons.length).toBeGreaterThan(0);
    });

    it('should match by category', async () => {
      const query: CapabilityQuery = {
        category: CapabilityCategory.GENERATION
      };

      const matches = await framework.findCapabilities(query);

      expect(matches.length).toBeGreaterThan(0);
      matches.forEach(match => {
        expect(match.capability.category).toBe(CapabilityCategory.GENERATION);
      });
    });

    it('should match by tags', async () => {
      const query: CapabilityQuery = {
        tags: ['code', 'generation']
      };

      const matches = await framework.findCapabilities(query);

      expect(matches.length).toBeGreaterThan(0);
      matches.forEach(match => {
        const hasTag = match.capability.tags.some(
          tag => ['code', 'generation'].includes(tag)
        );
        expect(hasTag).toBe(true);
      });
    });

    it('should apply performance constraints', async () => {
      const query: CapabilityQuery = {
        category: CapabilityCategory.GENERATION,
        maxLatency: 500,
        minReliability: 0.9
      };

      const matches = await framework.findCapabilities(query);

      matches.forEach(match => {
        expect(match.capability.reliability).toBeGreaterThanOrEqual(0.9);
        if (match.capability.metrics?.averageLatency) {
          expect(match.capability.metrics.averageLatency).toBeLessThanOrEqual(500);
        }
      });
    });

    it('should select optimal capability', async () => {
      const match = await framework.selectOptimalCapability(
        'Generate a Python function to calculate Fibonacci numbers'
      );

      expect(match).toBeTruthy();
      if (match) {
        expect(match.capability).toHaveProperty('id');
        expect(match.score).toBeGreaterThan(0);
      }
    });
  });

  describe('Protocol Translation', () => {
    it('should detect feature gaps', async () => {
      await registerTestAgents(framework);

      const gaps = framework.detectFeatureGaps(
        'test-cap-1',
        AgentPlatform.OPENAI_SWARM
      );

      expect(Array.isArray(gaps)).toBe(true);
      // Some gaps expected when translating between platforms
    });

    it('should create adaptation strategy', async () => {
      await registerTestAgents(framework);

      const strategy = framework.createAdaptationStrategy(
        'test-cap-1',
        AgentPlatform.LANGCHAIN
      );

      expect(Array.isArray(strategy)).toBe(true);
      if (strategy.length > 0) {
        expect(strategy[0]).toHaveProperty('type');
        expect(strategy[0]).toHaveProperty('impact');
      }
    });

    it('should execute capability with adaptation', async () => {
      await registerTestAgents(framework);

      const result = await framework.executeCapability(
        'test-cap-1',
        { specification: 'Create a hello world function' }
      );

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Learning', () => {
    beforeEach(async () => {
      await registerTestAgents(framework);
    });

    it('should track capability performance', async () => {
      // Execute capability multiple times
      for (let i = 0; i < 5; i++) {
        await framework.executeCapability(
          'test-cap-1',
          { specification: 'Test spec' }
        );
      }

      const stats = framework.getCapabilityStats('test-cap-1');

      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should predict performance', async () => {
      // Execute to build history
      for (let i = 0; i < 3; i++) {
        await framework.executeCapability(
          'test-cap-1',
          { taskDescription: 'code generation task' }
        );
      }

      const comparison = await framework.compareCapabilities(
        'Generate code for a web server'
      );

      expect(comparison.length).toBeGreaterThan(0);
      expect(comparison[0]).toHaveProperty('predictedPerformance');
      expect(comparison[0]).toHaveProperty('recommendationScore');
    });

    it('should optimize routing based on performance', async () => {
      // Execute capabilities with different success rates
      await framework.executeCapability('test-cap-1', {});

      const match = await framework.selectOptimalCapability(
        'Generate TypeScript code'
      );

      expect(match).toBeTruthy();
      if (match) {
        // Should select based on learned patterns
        expect(match.estimatedPerformance).toBeTruthy();
      }
    });

    it('should adapt to new capabilities', async () => {
      const newManifest: AgentManifest = {
        agentId: 'new-agent',
        name: 'New Agent',
        description: 'A newly registered agent',
        platform: AgentPlatform.AUTOGEN,
        version: { major: 1, minor: 0, patch: 0 },
        capabilities: [
          {
            id: 'new-cap-1',
            name: 'advanced_generation',
            description: 'Advanced code generation',
            category: CapabilityCategory.GENERATION,
            tags: ['code', 'advanced', 'ai'],
            version: { major: 1, minor: 0, patch: 0 },
            io: {
              input: [],
              output: { type: 'string', description: 'Generated code' }
            },
            reliability: 0.98,
            provider: {
              agentId: 'new-agent',
              platform: AgentPlatform.AUTOGEN
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await framework.registerAgent(newManifest);

      // Should be discoverable immediately
      const query: CapabilityQuery = {
        capabilityId: 'new-cap-1'
      };

      const matches = await framework.findCapabilities(query);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', async () => {
      // 1. Register agents
      await registerTestAgents(framework);

      // 2. Find capabilities
      const matches = await framework.findCapabilities({
        description: 'Analyze and generate code',
        minReliability: 0.8
      });

      expect(matches.length).toBeGreaterThan(0);

      // 3. Select optimal capability
      const optimal = await framework.selectOptimalCapability(
        'Analyze code quality and suggest improvements'
      );

      expect(optimal).toBeTruthy();

      // 4. Execute capability
      if (optimal) {
        const result = await framework.executeCapability(
          optimal.capability.id,
          { code: 'function test() { return true; }' }
        );

        expect(result.success).toBe(true);

        // 5. Check performance tracking
        const stats = framework.getCapabilityStats(optimal.capability.id);
        expect(stats.totalExecutions).toBeGreaterThan(0);
      }
    });

    it('should handle cross-platform scenarios', async () => {
      // Register agents from different platforms
      await registerMultiPlatformAgents(framework);

      // Find capabilities across platforms
      const matches = await framework.findCapabilities({
        category: CapabilityCategory.COORDINATION
      });

      // Should find capabilities from multiple platforms
      const platforms = new Set(matches.map(m => m.capability.provider.platform));
      expect(platforms.size).toBeGreaterThan(1);
    });
  });
});

// Helper functions

async function registerTestAgents(framework: A2ACapabilityFramework) {
  const manifest: AgentManifest = {
    agentId: 'test-agent-1',
    name: 'Test Agent 1',
    description: 'Primary test agent',
    platform: AgentPlatform.CLAUDE_FLOW,
    version: { major: 1, minor: 0, patch: 0 },
    capabilities: [
      {
        id: 'test-cap-1',
        name: 'code_generation',
        description: 'Generate code based on specifications',
        category: CapabilityCategory.GENERATION,
        tags: ['code', 'generation'],
        version: { major: 1, minor: 0, patch: 0 },
        io: {
          input: [{
            name: 'specification',
            type: 'string',
            description: 'Code specification',
            required: true
          }],
          output: { type: 'string', description: 'Generated code' }
        },
        reliability: 0.95,
        metrics: {
          averageLatency: 200,
          throughput: 10,
          successRate: 0.95,
          errorRate: 0.05
        },
        provider: {
          agentId: 'test-agent-1',
          platform: AgentPlatform.CLAUDE_FLOW
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'test-cap-2',
        name: 'code_analysis',
        description: 'Analyze code quality and patterns',
        category: CapabilityCategory.ANALYSIS,
        tags: ['code', 'analysis', 'quality'],
        version: { major: 1, minor: 0, patch: 0 },
        io: {
          input: [{
            name: 'code',
            type: 'string',
            description: 'Code to analyze',
            required: true
          }],
          output: { type: 'object', description: 'Analysis results' }
        },
        reliability: 0.92,
        metrics: {
          averageLatency: 300,
          throughput: 8,
          successRate: 0.92,
          errorRate: 0.08
        },
        provider: {
          agentId: 'test-agent-1',
          platform: AgentPlatform.CLAUDE_FLOW
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await framework.registerAgent(manifest);
}

async function registerMultiPlatformAgents(framework: A2ACapabilityFramework) {
  // Claude Flow agent
  await registerTestAgents(framework);

  // OpenAI Swarm agent
  const swarmManifest: AgentManifest = {
    agentId: 'swarm-agent-1',
    name: 'Swarm Agent',
    description: 'OpenAI Swarm test agent',
    platform: AgentPlatform.OPENAI_SWARM,
    version: { major: 1, minor: 0, patch: 0 },
    capabilities: [
      {
        id: 'swarm-cap-1',
        name: 'coordination',
        description: 'Coordinate multiple agents',
        category: CapabilityCategory.COORDINATION,
        tags: ['coordination', 'orchestration'],
        version: { major: 1, minor: 0, patch: 0 },
        io: {
          input: [],
          output: { type: 'object', description: 'Coordination result' }
        },
        reliability: 0.90,
        provider: {
          agentId: 'swarm-agent-1',
          platform: AgentPlatform.OPENAI_SWARM
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await framework.registerAgent(swarmManifest);

  // LangChain agent
  const langchainManifest: AgentManifest = {
    agentId: 'langchain-agent-1',
    name: 'LangChain Agent',
    description: 'LangChain test agent',
    platform: AgentPlatform.LANGCHAIN,
    version: { major: 1, minor: 0, patch: 0 },
    capabilities: [
      {
        id: 'langchain-cap-1',
        name: 'chain_execution',
        description: 'Execute multi-step chains',
        category: CapabilityCategory.COORDINATION,
        tags: ['chains', 'sequential'],
        version: { major: 1, minor: 0, patch: 0 },
        io: {
          input: [],
          output: { type: 'object', description: 'Chain result' }
        },
        reliability: 0.88,
        provider: {
          agentId: 'langchain-agent-1',
          platform: AgentPlatform.LANGCHAIN
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await framework.registerAgent(langchainManifest);
}
