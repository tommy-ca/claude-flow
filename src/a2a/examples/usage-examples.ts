/**
 * A2A Capability Framework - Usage Examples
 *
 * Demonstrates how to use the A2A capability framework for various
 * agent-to-agent integration scenarios.
 */

import {
  A2ACapabilityFramework,
  AgentManifest,
  AgentPlatform,
  CapabilityCategory,
  CapabilityQuery
} from '../index';

/**
 * Example 1: Basic Setup and Discovery
 */
async function basicSetup() {
  // Initialize the framework
  const framework = new A2ACapabilityFramework({
    enableAutoDiscovery: true,
    discoveryInterval: 60000,
    enableRuntimeProbing: true
  });

  // Discover agents from endpoints
  await framework.initialize([
    'http://localhost:3000/agents',
    'http://localhost:3001/agents'
  ]);

  console.log('Framework initialized with auto-discovery');
}

/**
 * Example 2: Manual Agent Registration
 */
async function registerAgent() {
  const framework = new A2ACapabilityFramework();

  const manifest: AgentManifest = {
    agentId: 'my-custom-agent',
    name: 'Custom Code Generator',
    description: 'Specialized agent for generating TypeScript code',
    platform: AgentPlatform.CLAUDE_FLOW,
    version: { major: 1, minor: 0, patch: 0 },
    capabilities: [
      {
        id: 'typescript-generation',
        name: 'generate_typescript',
        description: 'Generate TypeScript code with type safety',
        category: CapabilityCategory.GENERATION,
        tags: ['typescript', 'code', 'generation', 'type-safe'],
        version: { major: 1, minor: 0, patch: 0 },
        io: {
          input: [
            {
              name: 'specification',
              type: 'string',
              description: 'Code specification in natural language',
              required: true
            },
            {
              name: 'strict',
              type: 'boolean',
              description: 'Enable strict type checking',
              required: false,
              default: true
            }
          ],
          output: {
            type: 'object',
            description: 'Generated TypeScript code with types',
            schema: {
              code: 'string',
              types: 'string[]',
              dependencies: 'string[]'
            }
          }
        },
        reliability: 0.96,
        metrics: {
          averageLatency: 150,
          throughput: 15,
          successRate: 0.96,
          errorRate: 0.04
        },
        constraints: {
          maxConcurrency: 5,
          timeout: 30000,
          rateLimit: {
            requests: 100,
            window: 60000
          }
        },
        provider: {
          agentId: 'my-custom-agent',
          platform: AgentPlatform.CLAUDE_FLOW,
          endpoint: 'http://localhost:3000/capabilities/typescript-generation'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await framework.registerAgent(manifest);
  console.log('Agent registered successfully');
}

/**
 * Example 3: Semantic Capability Search
 */
async function semanticSearch() {
  const framework = new A2ACapabilityFramework();
  await setupExampleAgents(framework);

  // Search by natural language description
  const query: CapabilityQuery = {
    description: 'I need to analyze code quality and suggest refactoring improvements',
    minReliability: 0.9,
    maxLatency: 500
  };

  const matches = await framework.findCapabilities(query);

  console.log(`Found ${matches.length} matching capabilities:`);
  matches.forEach((match, index) => {
    console.log(`\n${index + 1}. ${match.capability.name}`);
    console.log(`   Score: ${(match.score * 100).toFixed(1)}%`);
    console.log(`   Platform: ${match.capability.provider.platform}`);
    console.log(`   Reliability: ${(match.capability.reliability * 100).toFixed(1)}%`);

    if (match.adaptationRequired) {
      console.log(`   ⚠️ Adaptation required`);
    }

    console.log(`   Match reasons:`);
    match.matchReasons.forEach(reason => {
      console.log(`   - ${reason.type}: ${reason.details} (${(reason.score * 100).toFixed(1)}%)`);
    });
  });
}

/**
 * Example 4: Optimal Agent Selection
 */
async function optimalSelection() {
  const framework = new A2ACapabilityFramework();
  await setupExampleAgents(framework);

  // Let the framework select the best capability
  const match = await framework.selectOptimalCapability(
    'Generate a REST API with authentication and CRUD operations',
    {
      minReliability: 0.85,
      maxLatency: 1000
    }
  );

  if (match) {
    console.log('Optimal capability selected:');
    console.log(`Name: ${match.capability.name}`);
    console.log(`Platform: ${match.capability.provider.platform}`);
    console.log(`Confidence: ${(match.score * 100).toFixed(1)}%`);
    console.log(`Estimated latency: ${match.estimatedPerformance?.averageLatency}ms`);
  } else {
    console.log('No suitable capability found');
  }
}

/**
 * Example 5: Cross-Platform Execution
 */
async function crossPlatformExecution() {
  const framework = new A2ACapabilityFramework();
  await setupExampleAgents(framework);

  // Find and execute capability from different platform
  const match = await framework.selectOptimalCapability(
    'Coordinate multiple agents to build a full-stack application'
  );

  if (match) {
    console.log(`Executing on platform: ${match.capability.provider.platform}`);

    // Execute with automatic protocol translation
    const result = await framework.executeCapability(
      match.capability.id,
      {
        taskDescription: 'Build a task management app',
        requirements: {
          frontend: 'React',
          backend: 'Node.js',
          database: 'PostgreSQL'
        }
      }
    );

    console.log('Execution result:', result);

    // Check performance stats
    const stats = framework.getCapabilityStats(match.capability.id);
    console.log('\nPerformance stats:');
    console.log(`Total executions: ${stats.totalExecutions}`);
    console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`Average latency: ${stats.averageLatency.toFixed(0)}ms`);
  }
}

/**
 * Example 6: Performance-Based Routing
 */
async function performanceBasedRouting() {
  const framework = new A2ACapabilityFramework();
  await setupExampleAgents(framework);

  // Execute same task multiple times to build performance history
  console.log('Building performance history...');

  for (let i = 0; i < 10; i++) {
    const match = await framework.selectOptimalCapability(
      'Generate Python code for data processing'
    );

    if (match) {
      await framework.executeCapability(match.capability.id, {
        task: `Data processing task ${i + 1}`
      });
    }
  }

  // Compare capabilities based on learned performance
  const comparison = await framework.compareCapabilities(
    'Generate Python code for data processing'
  );

  console.log('\nCapability comparison (ranked by performance):');
  comparison.forEach((comp, index) => {
    console.log(`\n${index + 1}. ${comp.capability.name}`);
    console.log(`   Recommendation score: ${(comp.recommendationScore * 100).toFixed(1)}%`);
    console.log(`   Historical executions: ${comp.historicalStats.totalExecutions}`);
    console.log(`   Success rate: ${(comp.historicalStats.successRate * 100).toFixed(1)}%`);
    console.log(`   Predicted latency: ${comp.predictedPerformance.expectedLatency.toFixed(0)}ms`);
    console.log(`   Confidence: ${(comp.predictedPerformance.confidence * 100).toFixed(1)}%`);

    if (comp.historicalStats.recentTrend) {
      console.log(`   Trend: ${comp.historicalStats.recentTrend}`);
    }
  });
}

/**
 * Example 7: Adaptation Strategy Analysis
 */
async function analyzeAdaptation() {
  const framework = new A2ACapabilityFramework();
  await setupExampleAgents(framework);

  // Get a Claude Flow capability
  const matches = await framework.findCapabilities({
    name: 'code_generation',
    requiredPlatforms: [AgentPlatform.CLAUDE_FLOW]
  });

  if (matches.length > 0) {
    const capability = matches[0].capability;

    // Check adaptation requirements for different platforms
    const platforms = [
      AgentPlatform.OPENAI_SWARM,
      AgentPlatform.LANGCHAIN,
      AgentPlatform.AUTOGEN
    ];

    for (const platform of platforms) {
      console.log(`\nAdaptation to ${platform}:`);

      // Detect feature gaps
      const gaps = framework.detectFeatureGaps(capability.id, platform);
      if (gaps.length > 0) {
        console.log('Feature gaps detected:');
        gaps.forEach(gap => {
          console.log(`  - ${gap.feature} (${gap.severity})`);
          if (gap.polyfillAvailable) {
            console.log(`    ✓ Polyfill available`);
          } else if (gap.workaround) {
            console.log(`    → Workaround: ${gap.workaround}`);
          } else {
            console.log(`    ✗ No solution available`);
          }
        });
      } else {
        console.log('No feature gaps - full compatibility');
      }

      // Get adaptation strategy
      const strategies = framework.createAdaptationStrategy(capability.id, platform);
      if (strategies.length > 0) {
        console.log('Adaptation strategies:');
        strategies.forEach(strategy => {
          console.log(`  - ${strategy.type}: ${strategy.description}`);
          console.log(`    Impact: ${strategy.impact}`);
        });
      }
    }
  }
}

/**
 * Example 8: Learning and Adaptation
 */
async function learningExample() {
  const framework = new A2ACapabilityFramework();
  await setupExampleAgents(framework);

  // Simulate learning over time
  console.log('Training the framework with various tasks...\n');

  const tasks = [
    'Generate API endpoints',
    'Analyze code complexity',
    'Refactor legacy code',
    'Generate unit tests',
    'Optimize database queries'
  ];

  for (const task of tasks) {
    console.log(`Task: ${task}`);

    const match = await framework.selectOptimalCapability(task);

    if (match) {
      const result = await framework.executeCapability(match.capability.id, { task });

      const stats = framework.getCapabilityStats(match.capability.id);
      console.log(`  Selected: ${match.capability.name}`);
      console.log(`  Executions: ${stats.totalExecutions}`);
      console.log(`  Success rate: ${(stats.successRate * 100).toFixed(1)}%\n`);
    }
  }

  // Now the framework has learned patterns
  console.log('Framework has learned from execution history');
  console.log('Future selections will be optimized based on this data');
}

/**
 * Example 9: Compatibility Matrix
 */
async function compatibilityMatrix() {
  const framework = new A2ACapabilityFramework();
  await setupExampleAgents(framework);

  const matrix = framework.buildCompatibilityMatrix();

  console.log('Capability Compatibility Matrix:\n');

  for (const [capId, compat] of matrix) {
    console.log(`Capability: ${capId}`);

    console.log('  Compatible platforms:');
    for (const [platform, isCompatible] of compat.compatiblePlatforms) {
      const status = isCompatible ? '✓' : '✗';
      console.log(`    ${status} ${platform}`);
    }

    if (compat.versionRanges.size > 0) {
      console.log('  Version compatibility:');
      for (const [depId, range] of compat.versionRanges) {
        console.log(`    ${depId}: ${range.min.major}.${range.min.minor}.${range.min.patch} - ${range.max.major}.${range.max.minor}.${range.max.patch}`);
      }
    }

    console.log();
  }
}

/**
 * Helper function to set up example agents
 */
async function setupExampleAgents(framework: A2ACapabilityFramework) {
  // Register multiple example agents with various capabilities
  // This would typically be done through auto-discovery or manual registration
  // For examples, we'll use simplified manifests

  const manifests: AgentManifest[] = [
    {
      agentId: 'code-gen-agent',
      name: 'Code Generator',
      description: 'Specialized code generation agent',
      platform: AgentPlatform.CLAUDE_FLOW,
      version: { major: 1, minor: 0, patch: 0 },
      capabilities: [
        {
          id: 'code-gen-1',
          name: 'code_generation',
          description: 'Generate code in multiple languages',
          category: CapabilityCategory.GENERATION,
          tags: ['code', 'generation', 'programming'],
          version: { major: 1, minor: 0, patch: 0 },
          io: {
            input: [],
            output: { type: 'string', description: 'Generated code' }
          },
          reliability: 0.95,
          provider: {
            agentId: 'code-gen-agent',
            platform: AgentPlatform.CLAUDE_FLOW
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const manifest of manifests) {
    await framework.registerAgent(manifest);
  }
}

// Run examples
async function runExamples() {
  console.log('=== A2A Capability Framework Examples ===\n');

  try {
    console.log('\n--- Example 1: Basic Setup ---');
    await basicSetup();

    console.log('\n--- Example 2: Agent Registration ---');
    await registerAgent();

    console.log('\n--- Example 3: Semantic Search ---');
    await semanticSearch();

    console.log('\n--- Example 4: Optimal Selection ---');
    await optimalSelection();

    console.log('\n--- Example 5: Cross-Platform Execution ---');
    await crossPlatformExecution();

    console.log('\n--- Example 6: Performance-Based Routing ---');
    await performanceBasedRouting();

    console.log('\n--- Example 7: Adaptation Analysis ---');
    await analyzeAdaptation();

    console.log('\n--- Example 8: Learning Example ---');
    await learningExample();

    console.log('\n--- Example 9: Compatibility Matrix ---');
    await compatibilityMatrix();

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export examples for use
export {
  basicSetup,
  registerAgent,
  semanticSearch,
  optimalSelection,
  crossPlatformExecution,
  performanceBasedRouting,
  analyzeAdaptation,
  learningExample,
  compatibilityMatrix,
  runExamples
};
