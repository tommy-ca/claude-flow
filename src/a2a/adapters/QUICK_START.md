# A2A Adapters - Quick Start Guide

Get started with A2A adapters in 5 minutes!

## Installation

```bash
# No additional dependencies needed - everything is TypeScript
cd src/a2a/adapters
```

## Basic Usage (3 Steps)

### Step 1: Import and Setup

```typescript
import {
  AdapterRegistry,
  createOpenAIConfig,
  createGeminiConfig,
  A2AMessage
} from './adapters';

const registry = AdapterRegistry.getInstance();
```

### Step 2: Create an Adapter

```typescript
// Option A: OpenAI
const openaiId = await registry.create(createOpenAIConfig({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo'
}));

// Option B: Gemini
const geminiId = await registry.create(createGeminiConfig({
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: 'gemini-pro'
}));

// Get the adapter
const adapter = registry.get(openaiId);
```

### Step 3: Send a Message

```typescript
const message: A2AMessage = {
  id: 'msg_1',
  type: 'request',
  operation: 'code.generate',
  payload: {
    prompt: 'Create a React component for a todo list'
  },
  metadata: {
    timestamp: Date.now(),
    source: 'user'
  }
};

const response = await adapter.sendMessage(message);
console.log(response.payload.content);
```

## Configuration

### Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Google Gemini
export GOOGLE_AI_API_KEY="AIza..."

# Sourcegraph Cody
export SOURCEGRAPH_TOKEN="sgp_..."
```

### Quick Configs

```typescript
// OpenAI GPT-4
createOpenAIConfig({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 4096
})

// Google Gemini
createGeminiConfig({
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: 'gemini-1.5-pro'
})

// Cursor IDE
createCursorConfig({
  workspaceRoot: process.cwd(),
  enableLSP: true,
  inlineEditingMode: 'diff'
})

// Aider CLI
createAiderConfig({
  workspaceRoot: process.cwd(),
  model: 'gpt-4',
  autoCommit: false
})

// Continue.dev
createContinueConfig({
  workspaceRoot: process.cwd(),
  serverUrl: 'http://localhost:65432'
})

// Sourcegraph Cody
createCodyConfig({
  accessToken: process.env.SOURCEGRAPH_TOKEN,
  enableCodeSearch: true
})
```

## Common Operations

### Generate Code

```typescript
await adapter.sendMessage({
  id: 'gen_1',
  type: 'request',
  operation: 'code.generate',
  payload: {
    prompt: 'Create a function to validate email addresses'
  },
  metadata: { timestamp: Date.now(), source: 'user' }
});
```

### Edit Code

```typescript
await adapter.sendMessage({
  id: 'edit_1',
  type: 'request',
  operation: 'code.edit',
  payload: {
    filePath: 'src/utils.ts',
    instruction: 'Add error handling to the validateEmail function'
  },
  metadata: { timestamp: Date.now(), source: 'user' }
});
```

### Review Code

```typescript
await adapter.sendMessage({
  id: 'review_1',
  type: 'request',
  operation: 'code.review',
  payload: {
    code: '...',
    focusAreas: ['security', 'performance']
  },
  metadata: { timestamp: Date.now(), source: 'user' }
});
```

### Search Code (Cody only)

```typescript
await adapter.sendMessage({
  id: 'search_1',
  type: 'request',
  operation: 'search.code',
  payload: {
    query: 'authentication middleware'
  },
  metadata: { timestamp: Date.now(), source: 'user' }
});
```

## Streaming Responses

```typescript
const message: A2AMessage = {
  id: 'stream_1',
  type: 'request',
  operation: 'code.generate',
  payload: { prompt: 'Explain async/await in JavaScript' },
  metadata: {
    timestamp: Date.now(),
    source: 'user',
    streaming: true  // Enable streaming
  }
};

for await (const chunk of adapter.streamResponse(message)) {
  if (chunk.type === 'delta') {
    process.stdout.write(chunk.data.content);
  } else if (chunk.type === 'complete') {
    console.log('\nDone!');
  }
}
```

## Multiple Adapters

### Parallel Execution

```typescript
// Create multiple adapters
const adapters = await registry.createMultiple([
  createOpenAIConfig({ model: 'gpt-4' }),
  createGeminiConfig({ model: 'gemini-pro' })
]);

// Execute in parallel
const results = await Promise.all(
  adapters.map(id => registry.get(id).sendMessage(message))
);

// Compare results
results.forEach((result, i) => {
  console.log(`Result ${i}:`, result.payload.content);
});
```

### Capability-Based Selection

```typescript
// Find adapters with specific capability
const searchCapable = registry.findByCapability(
  AgentCapability.CODE_SEARCH
);

if (searchCapable.length > 0) {
  const adapter = registry.get(searchCapable[0]);
  // Use for search operations
}
```

## Error Handling

```typescript
try {
  const response = await adapter.sendMessage(message);
  console.log('Success:', response.payload);
} catch (error) {
  if (error instanceof AdapterError) {
    console.error('Error:', error.code, error.message);

    if (error.retryable) {
      // Retry logic
      await sleep(1000);
      return adapter.sendMessage(message);
    }
  }
}
```

## Health Monitoring

```typescript
// Check health
const healthy = await adapter.isHealthy();
console.log('Healthy:', healthy);

// Get metrics
const metrics = adapter.getMetrics();
console.log('Requests:', metrics.totalRequests);
console.log('Success rate:',
  metrics.successfulRequests / metrics.totalRequests * 100, '%');
console.log('Avg latency:', metrics.averageLatency, 'ms');
console.log('Tokens used:', metrics.tokensUsed);
```

## Cleanup

```typescript
// Destroy single adapter
await registry.destroy(adapterId);

// Destroy all adapters
await registry.destroyAll();
```

## Testing

```typescript
import { createInitializedMock, createMockMessage } from './adapters';

// Create mock adapter
const mock = await createInitializedMock({
  delay: 100,  // Simulate 100ms latency
  failureRate: 0.1  // 10% failure rate
});

// Set expected response
mock.setResponse({
  id: 'mock_1',
  messageId: 'test',
  status: 'success',
  payload: { content: 'Mock response' },
  metadata: { timestamp: Date.now(), duration: 100 }
});

// Test
const result = await mock.sendMessage(message);
expect(result.payload.content).toBe('Mock response');

// Check call history
console.log('Called', mock.getCallCount(), 'times');
```

## Complete Example

```typescript
import {
  AdapterRegistry,
  createOpenAIConfig,
  A2AMessage
} from './adapters';

async function main() {
  // Setup
  const registry = AdapterRegistry.getInstance();

  // Create adapter
  const adapterId = await registry.create(createOpenAIConfig({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo'
  }));

  const adapter = registry.get(adapterId);

  // Send message
  const message: A2AMessage = {
    id: 'example_1',
    type: 'request',
    operation: 'code.generate',
    payload: {
      prompt: 'Create a TypeScript function to debounce input'
    },
    metadata: {
      timestamp: Date.now(),
      source: 'example'
    }
  };

  try {
    const response = await adapter.sendMessage(message);
    console.log('Generated code:');
    console.log(response.payload.content);

    // Get metrics
    const metrics = adapter.getMetrics();
    console.log('\nMetrics:');
    console.log('- Latency:', metrics.averageLatency, 'ms');
    console.log('- Tokens:', metrics.tokensUsed);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cleanup
    await registry.destroy(adapterId);
  }
}

main();
```

## Next Steps

1. **Read the full docs**: See `README.md` for comprehensive guide
2. **Explore examples**: Check `examples/multi-adapter-orchestration.ts`
3. **Learn architecture**: Read `ARCHITECTURE.md` for system design
4. **Add your own**: Extend `BaseAgentAdapter` for custom platforms

## Platform-Specific Tips

### OpenAI (Codex)
- Best for general code generation
- Use GPT-4 Turbo for best results
- Enable function calling for structured outputs

### Google Gemini
- Best for research and long context tasks
- Gemini 1.5 Pro has 1M token context
- Use Gemini Flash for faster responses

### Cursor
- Best for inline IDE editing
- Requires Cursor IDE installed
- Use diff mode for best review experience

### Aider
- Best for Git workflows
- Requires git repository
- Use auto-commit for rapid iteration

### Continue.dev
- Best for IDE extension workflows
- Requires Continue extension installed
- Use slash commands for quick actions

### Sourcegraph Cody
- Best for code search and intelligence
- Requires Sourcegraph account
- Great for understanding large codebases

## Common Issues

### "Adapter not initialized"
```typescript
// Make sure to await initialization
await adapter.initialize(config);
```

### "Rate limit exceeded"
```typescript
// Implement backoff
try {
  await adapter.sendMessage(message);
} catch (error) {
  if (error.code === 'CODEX-RL-001') {
    await sleep(60000);  // Wait 1 minute
    return adapter.sendMessage(message);
  }
}
```

### "Operation not supported"
```typescript
// Check capabilities first
if (adapter.supportsOperation('search.code')) {
  await adapter.sendMessage(searchMessage);
}
```

## Support

- Documentation: `README.md`, `ARCHITECTURE.md`
- Examples: `examples/multi-adapter-orchestration.ts`
- Testing: `testing/mock-adapter.ts`
- Issues: GitHub Issues

## License

Part of Claude Flow - see main LICENSE file
