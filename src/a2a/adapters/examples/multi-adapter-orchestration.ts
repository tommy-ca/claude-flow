/**
 * Multi-Adapter Orchestration Example
 * Demonstrates coordinating multiple adapters for complex tasks
 */

import {
  AdapterRegistry,
  createOpenAIConfig,
  createGeminiConfig,
  createCodyConfig,
  A2AMessage,
  AgentCapability
} from '../index';

// ============================================================================
// Example 1: Parallel Code Review
// ============================================================================

async function parallelCodeReview() {
  console.log('=== Parallel Code Review ===\n');

  const registry = AdapterRegistry.getInstance();

  // Create multiple adapters for diverse perspectives
  const reviewers = await registry.createMultiple([
    createOpenAIConfig({
      name: 'gpt4-reviewer',
      model: 'gpt-4-turbo'
    }),
    createGeminiConfig({
      name: 'gemini-reviewer',
      model: 'gemini-1.5-pro'
    })
  ]);

  const codeToReview = `
function processUserData(data) {
  const users = data.filter(u => u.active);
  for (let i = 0; i < users.length; i++) {
    if (users[i].email) {
      sendEmail(users[i].email, 'Welcome!');
    }
  }
  return users;
}
  `;

  const reviewMessage: A2AMessage = {
    id: 'review_1',
    type: 'request',
    operation: 'code.review',
    payload: {
      code: codeToReview,
      language: 'javascript',
      focusAreas: ['performance', 'security', 'best-practices']
    },
    metadata: {
      timestamp: Date.now(),
      source: 'orchestrator'
    }
  };

  // Get reviews from all adapters in parallel
  const reviews = await Promise.all(
    reviewers.map(async (id, index) => {
      const adapter = registry.get(id);
      const response = await adapter.sendMessage(reviewMessage);
      return {
        reviewer: index === 0 ? 'GPT-4' : 'Gemini',
        feedback: response.payload.content
      };
    })
  );

  // Display results
  reviews.forEach(({ reviewer, feedback }) => {
    console.log(`\n${reviewer} Review:`);
    console.log(feedback);
    console.log('\n' + '='.repeat(80));
  });

  // Cleanup
  await registry.destroyAll();
}

// ============================================================================
// Example 2: Capability-Based Task Routing
// ============================================================================

async function capabilityBasedRouting() {
  console.log('\n=== Capability-Based Task Routing ===\n');

  const registry = AdapterRegistry.getInstance();

  // Create diverse set of adapters
  await registry.createMultiple([
    createOpenAIConfig({ name: 'codex' }),
    createCodyConfig({
      name: 'cody',
      accessToken: process.env.SOURCEGRAPH_TOKEN || 'demo'
    })
  ]);

  // Task 1: Code Search (requires CODE_SEARCH capability)
  const searchAdapters = registry.findByCapability(AgentCapability.CODE_SEARCH);
  if (searchAdapters.length > 0) {
    console.log('Executing code search with Cody...');
    const adapter = registry.get(searchAdapters[0]);

    const searchMessage: A2AMessage = {
      id: 'search_1',
      type: 'request',
      operation: 'search.code',
      payload: {
        query: 'function handleUserAuth'
      },
      metadata: {
        timestamp: Date.now(),
        source: 'orchestrator'
      }
    };

    const searchResult = await adapter.sendMessage(searchMessage);
    console.log('Search results:', searchResult.payload);
  }

  // Task 2: Code Generation (multiple adapters support this)
  const genAdapters = registry.findByCapability(AgentCapability.CODE_GENERATION);
  console.log(`\n${genAdapters.length} adapters support code generation`);

  const genMessage: A2AMessage = {
    id: 'gen_1',
    type: 'request',
    operation: 'code.generate',
    payload: {
      prompt: 'Create a React hook for debouncing input'
    },
    metadata: {
      timestamp: Date.now(),
      source: 'orchestrator'
    }
  };

  // Use first available generator
  const generator = registry.get(genAdapters[0]);
  const generated = await generator.sendMessage(genMessage);
  console.log('\nGenerated code:', generated.payload.content);

  await registry.destroyAll();
}

// ============================================================================
// Example 3: Fallback Strategy
// ============================================================================

async function fallbackStrategy() {
  console.log('\n=== Fallback Strategy ===\n');

  const registry = AdapterRegistry.getInstance();

  // Create primary and fallback adapters
  const primary = await registry.create(
    createOpenAIConfig({
      name: 'primary',
      model: 'gpt-4-turbo'
    })
  );

  const fallback = await registry.create(
    createGeminiConfig({
      name: 'fallback',
      model: 'gemini-pro'
    })
  );

  const message: A2AMessage = {
    id: 'task_1',
    type: 'request',
    operation: 'code.generate',
    payload: {
      prompt: 'Create a TypeScript interface for a user profile'
    },
    metadata: {
      timestamp: Date.now(),
      source: 'orchestrator'
    }
  };

  async function executeWithFallback(
    primaryId: string,
    fallbackId: string,
    msg: A2AMessage
  ) {
    try {
      console.log('Trying primary adapter...');
      const adapter = registry.get(primaryId);
      return await adapter.sendMessage(msg);
    } catch (error) {
      console.log('Primary failed, using fallback...');
      const fallbackAdapter = registry.get(fallbackId);
      return await fallbackAdapter.sendMessage(msg);
    }
  }

  const result = await executeWithFallback(primary, fallback, message);
  console.log('Result:', result.payload.content);

  await registry.destroyAll();
}

// ============================================================================
// Example 4: Streaming with Progress Tracking
// ============================================================================

async function streamingWithProgress() {
  console.log('\n=== Streaming with Progress ===\n');

  const registry = AdapterRegistry.getInstance();

  const adapterId = await registry.create(
    createOpenAIConfig({
      name: 'streamer',
      model: 'gpt-4-turbo'
    })
  );

  const adapter = registry.get(adapterId);

  const message: A2AMessage = {
    id: 'stream_1',
    type: 'request',
    operation: 'code.generate',
    payload: {
      prompt: 'Write a comprehensive explanation of async/await in JavaScript'
    },
    metadata: {
      timestamp: Date.now(),
      source: 'orchestrator',
      streaming: true
    }
  };

  let chunkCount = 0;
  let totalContent = '';

  console.log('Streaming response:');
  console.log('-'.repeat(80));

  for await (const chunk of adapter.streamResponse(message)) {
    if (chunk.type === 'delta') {
      const content = chunk.data.content || '';
      process.stdout.write(content);
      totalContent += content;
      chunkCount++;
    } else if (chunk.type === 'complete') {
      console.log('\n' + '-'.repeat(80));
      console.log(`\nReceived ${chunkCount} chunks`);
      console.log(`Total length: ${totalContent.length} characters`);
    }
  }

  await registry.destroyAll();
}

// ============================================================================
// Example 5: Metrics and Monitoring
// ============================================================================

async function metricsAndMonitoring() {
  console.log('\n=== Metrics and Monitoring ===\n');

  const registry = AdapterRegistry.getInstance();

  // Create multiple adapters
  const adapters = await registry.createMultiple([
    createOpenAIConfig({ name: 'codex-1' }),
    createGeminiConfig({ name: 'gemini-1' })
  ]);

  // Execute some tasks
  const message: A2AMessage = {
    id: 'metrics_test',
    type: 'request',
    operation: 'code.generate',
    payload: {
      prompt: 'Hello world function'
    },
    metadata: {
      timestamp: Date.now(),
      source: 'test'
    }
  };

  for (const id of adapters) {
    const adapter = registry.get(id);
    await adapter.sendMessage(message);
  }

  // Gather metrics
  const allMetrics = registry.getAllMetrics();

  console.log('Adapter Metrics:');
  allMetrics.forEach(metrics => {
    console.log(`\n${metrics.name}:`);
    console.log(`  Total Requests: ${metrics.totalRequests}`);
    console.log(`  Success Rate: ${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)}%`);
    console.log(`  Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
    console.log(`  Tokens Used: ${metrics.tokensUsed}`);
    console.log(`  Uptime: ${(metrics.uptime / 1000).toFixed(2)}s`);
  });

  // Health check
  console.log('\nHealth Status:');
  const health = await registry.healthCheck();
  Object.entries(health).forEach(([id, healthy]) => {
    console.log(`  ${id}: ${healthy ? '✓ Healthy' : '✗ Unhealthy'}`);
  });

  // Registry stats
  const stats = registry.getStats();
  console.log('\nRegistry Stats:');
  console.log(`  Total Instances: ${stats.totalInstances}`);
  console.log('  By Type:', stats.byType);

  await registry.destroyAll();
}

// ============================================================================
// Example 6: Context-Rich Requests
// ============================================================================

async function contextRichRequests() {
  console.log('\n=== Context-Rich Requests ===\n');

  const registry = AdapterRegistry.getInstance();

  const adapterId = await registry.create(
    createOpenAIConfig({
      name: 'context-aware',
      model: 'gpt-4-turbo'
    })
  );

  const adapter = registry.get(adapterId);

  // Provide rich context
  const message: A2AMessage = {
    id: 'context_1',
    type: 'request',
    operation: 'code.review',
    payload: {
      filePath: 'src/components/UserProfile.tsx'
    },
    context: {
      workspaceRoot: '/home/user/project',
      fileContext: [
        {
          path: 'src/components/UserProfile.tsx',
          content: 'const UserProfile = ({ user }) => { return <div>{user.name}</div>; };',
          language: 'typescript',
          relevance: 1.0
        },
        {
          path: 'src/types/User.ts',
          content: 'interface User { name: string; email: string; }',
          language: 'typescript',
          relevance: 0.8
        }
      ],
      gitContext: {
        branch: 'feature/user-profile',
        commit: 'abc123',
        uncommittedChanges: true,
        changedFiles: ['src/components/UserProfile.tsx']
      },
      environmentVars: {
        NODE_ENV: 'development'
      }
    },
    metadata: {
      timestamp: Date.now(),
      source: 'orchestrator',
      priority: 'high'
    }
  };

  const response = await adapter.sendMessage(message);
  console.log('Context-aware review:', response.payload.content);

  await registry.destroyAll();
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    // Run all examples
    // await parallelCodeReview();
    // await capabilityBasedRouting();
    // await fallbackStrategy();
    // await streamingWithProgress();
    await metricsAndMonitoring();
    // await contextRichRequests();

    console.log('\n✓ All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  parallelCodeReview,
  capabilityBasedRouting,
  fallbackStrategy,
  streamingWithProgress,
  metricsAndMonitoring,
  contextRichRequests
};
