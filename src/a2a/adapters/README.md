# A2A Adapter System Documentation

## Overview

The A2A (Agent-to-Agent) Adapter System provides a unified interface for integrating Claude Flow with multiple coding agent backends. This enables seamless coordination between different AI coding assistants while maintaining a consistent protocol.

## Supported Platforms

| Platform | Type | Capabilities | Status |
|----------|------|--------------|--------|
| **OpenAI Codex** | API | Code generation, chat, function calling | ✅ Production |
| **Google Gemini** | API | Code generation, multi-modal, research | ✅ Production |
| **Cursor** | IDE | Inline editing, LSP, workspace awareness | ✅ Production |
| **Aider** | CLI | Git-aware editing, autonomous execution | ✅ Production |
| **Continue.dev** | Extension | IDE integration, context providers | ✅ Production |
| **Sourcegraph Cody** | Service | Code search, semantic search, intelligence | ✅ Production |

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────┐
│           Claude Flow Orchestration             │
└──────────────────┬──────────────────────────────┘
                   │
                   │ A2A Protocol
                   │
┌──────────────────▼──────────────────────────────┐
│            Adapter Registry                     │
│  - Factory pattern                              │
│  - Instance management                          │
│  - Health monitoring                            │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
┌──────▼─────┐ ┌──▼──────┐ ┌──▼─────────┐
│  Codex     │ │ Gemini  │ │  Cursor    │
│  Adapter   │ │ Adapter │ │  Adapter   │
└────────────┘ └─────────┘ └────────────┘
       │           │           │
┌──────▼─────┐ ┌──▼──────┐ ┌──▼─────────┐
│  OpenAI    │ │ Google  │ │  Cursor    │
│  API       │ │ AI API  │ │  IDE       │
└────────────┘ └─────────┘ └────────────┘
```

### Base Adapter Interface

All adapters implement the `IAgentBackendAdapter` interface:

```typescript
interface IAgentBackendAdapter {
  // Lifecycle
  initialize(config: AgentConfig): Promise<void>;
  shutdown(): Promise<void>;
  isHealthy(): Promise<boolean>;

  // Core operations
  sendMessage(message: A2AMessage): Promise<A2AResponse>;
  streamResponse(message: A2AMessage): AsyncIterator<StreamChunk>;

  // Capabilities
  getCapabilities(): AgentCapabilities;
  supportsOperation(op: OperationType): boolean;

  // Protocol translation
  translateRequest(a2aMsg: A2AMessage): any;
  translateResponse(nativeResp: any, requestId: string): A2AResponse;
  translateError(error: any): A2AError;
}
```

## Usage Guide

### Quick Start

```typescript
import {
  AdapterRegistry,
  createOpenAIConfig,
  createGeminiConfig
} from './adapters/adapter-registry';

// Get registry instance
const registry = AdapterRegistry.getInstance();

// Create adapters
const openaiId = await registry.create(createOpenAIConfig({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo'
}));

const geminiId = await registry.create(createGeminiConfig({
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: 'gemini-1.5-pro'
}));

// Use adapters
const openai = registry.get(openaiId);
const response = await openai.sendMessage({
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
});

console.log(response.payload.content);
```

### Advanced Usage

#### Parallel Execution Across Multiple Adapters

```typescript
// Create multiple adapters
const adapters = await registry.createMultiple([
  createOpenAIConfig({ model: 'gpt-4' }),
  createGeminiConfig({ model: 'gemini-pro' }),
  createCodyConfig({ accessToken: process.env.SOURCEGRAPH_TOKEN })
]);

// Execute same task in parallel
const message: A2AMessage = {
  id: 'msg_parallel',
  type: 'request',
  operation: 'code.review',
  payload: {
    filePath: 'src/components/TodoList.tsx',
    content: '...'
  },
  metadata: {
    timestamp: Date.now(),
    source: 'orchestrator'
  }
};

const results = await Promise.all(
  adapters.map(id => registry.get(id).sendMessage(message))
);

// Compare results
results.forEach((result, index) => {
  console.log(`Adapter ${index} review:`, result.payload);
});
```

#### Streaming Responses

```typescript
const adapter = registry.get(adapterId);

for await (const chunk of adapter.streamResponse(message)) {
  if (chunk.type === 'delta') {
    process.stdout.write(chunk.data.content);
  } else if (chunk.type === 'complete') {
    console.log('\nComplete!');
  }
}
```

#### Capability-Based Routing

```typescript
// Find adapters with specific capability
const searchCapableAdapters = registry.findByCapability(
  AgentCapability.CODE_SEARCH
);

// Use the best one
const codySub = registry.get(searchCapableAdapters[0]);
const searchResults = await codySub.sendMessage({
  id: 'search_1',
  type: 'request',
  operation: 'search.code',
  payload: {
    query: 'function handleSubmit'
  },
  metadata: {
    timestamp: Date.now(),
    source: 'user'
  }
});
```

## Platform-Specific Guides

### OpenAI Codex

**Best for:** General code generation, chat-based interactions, function calling

```typescript
import { CodexAdapter, CODEX_CONFIG_EXAMPLES } from './adapters/codex-adapter';

const config = CODEX_CONFIG_EXAMPLES.gpt4Turbo;
const adapterId = await registry.create(config);
```

**Features:**
- Supports GPT-4, GPT-4 Turbo, GPT-3.5
- Function calling for structured operations
- Streaming responses
- Large context windows (up to 128K tokens)

**Configuration:**
```typescript
{
  type: 'openai',
  name: 'my-codex',
  apiKey: 'sk-...',
  model: 'gpt-4-turbo',
  organization: 'org-...',  // Optional
  maxTokens: 4096,
  temperature: 0.7
}
```

### Google Gemini

**Best for:** Research, multi-modal tasks, long context

```typescript
import { GeminiAdapter, GEMINI_CONFIG_EXAMPLES } from './adapters/gemini-adapter';

const config = GEMINI_CONFIG_EXAMPLES.flash;
const adapterId = await registry.create(config);
```

**Features:**
- Up to 1M token context window
- Multi-modal support (Pro Vision)
- Safety settings
- Streaming responses

**Configuration:**
```typescript
{
  type: 'google',
  name: 'my-gemini',
  apiKey: 'AIza...',
  model: 'gemini-1.5-pro',
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8192
  }
}
```

### Cursor

**Best for:** Inline editing, LSP integration, IDE workflows

```typescript
import { CursorAdapter, CURSOR_CONFIG_EXAMPLES } from './adapters/cursor-adapter';

const config = CURSOR_CONFIG_EXAMPLES.withServer;
const adapterId = await registry.create(config);
```

**Features:**
- Inline editing with ghost text, diff, or replace modes
- LSP diagnostics
- File context gathering
- Workspace awareness

**Configuration:**
```typescript
{
  type: 'cursor',
  name: 'my-cursor',
  workspaceRoot: '/path/to/project',
  cursorPath: '/Applications/Cursor.app/Contents/MacOS/Cursor',
  serverPort: 3456,
  enableLSP: true,
  inlineEditingMode: 'diff'
}
```

### Aider

**Best for:** Git-aware editing, autonomous execution, CLI workflows

```typescript
import { AiderAdapter, AIDER_CONFIG_EXAMPLES } from './adapters/aider-adapter';

const config = AIDER_CONFIG_EXAMPLES.autoCommit;
const adapterId = await registry.create(config);
```

**Features:**
- Git integration (commit, diff, undo)
- Autonomous code editing
- Multiple edit formats
- Streaming output

**Configuration:**
```typescript
{
  type: 'aider',
  name: 'my-aider',
  workspaceRoot: '/path/to/git/repo',
  aiderPath: 'aider',  // or full path
  model: 'gpt-4',
  autoCommit: true,
  editFormat: 'diff',
  stream: true
}
```

### Continue.dev

**Best for:** IDE extensions, slash commands, context providers

```typescript
import { ContinueAdapter, CONTINUE_CONFIG_EXAMPLES } from './adapters/continue-adapter';

const config = CONTINUE_CONFIG_EXAMPLES.custom;
const adapterId = await registry.create(config);
```

**Features:**
- Slash commands (/edit, /review, /test)
- Context providers (file, terminal, problems)
- Custom commands
- IDE integration

**Configuration:**
```typescript
{
  type: 'continue',
  name: 'my-continue',
  workspaceRoot: '/path/to/project',
  serverUrl: 'http://localhost:65432',
  model: 'gpt-4',
  contextProviders: ['file', 'terminal', 'problems'],
  customCommands: {
    '/docs': 'Generate documentation',
    '/optimize': 'Optimize for performance'
  }
}
```

### Sourcegraph Cody

**Best for:** Code search, semantic search, code intelligence

```typescript
import { CodyAdapter, CODY_CONFIG_EXAMPLES } from './adapters/cody-adapter';

const config = CODY_CONFIG_EXAMPLES.enterprise;
const adapterId = await registry.create(config);
```

**Features:**
- Code search across repositories
- Semantic code understanding
- Reference finding
- Code explanation

**Configuration:**
```typescript
{
  type: 'sourcegraph',
  name: 'my-cody',
  accessToken: 'sgp_...',
  serverEndpoint: 'https://sourcegraph.com/.api/graphql',
  workspaceRoot: '/path/to/project',
  enableCodeSearch: true,
  searchContextSize: 10
}
```

## Protocol Specification

### A2A Message Format

```typescript
interface A2AMessage {
  id: string;                           // Unique message ID
  type: 'request' | 'response' | 'notification' | 'error';
  operation: OperationType;             // Operation to perform
  payload: any;                         // Operation-specific data
  requiredCapabilities?: AgentCapability[];
  metadata: MessageMetadata;
  context?: ExecutionContext;           // Optional context
}
```

### Supported Operations

| Operation | Description | Supported Adapters |
|-----------|-------------|-------------------|
| `code.generate` | Generate new code | All |
| `code.edit` | Edit existing code | All |
| `code.review` | Review code quality | All |
| `code.refactor` | Refactor code | Codex, Gemini, Aider, Continue |
| `code.explain` | Explain code | All |
| `code.test` | Generate tests | Codex, Gemini |
| `file.read` | Read file content | Cursor |
| `file.write` | Write file content | Cursor, Aider |
| `file.edit` | Edit file | Cursor, Aider, Continue |
| `file.search` | Search files | Cursor |
| `git.commit` | Commit changes | Aider |
| `git.diff` | Show diff | Aider |
| `git.status` | Show status | Aider |
| `search.code` | Search code | Cody |
| `search.semantic` | Semantic search | Cody |
| `chat.send` | Chat message | Codex, Gemini, Continue, Cody |
| `terminal.execute` | Execute command | Aider, Continue |
| `context.gather` | Gather context | Cursor, Continue, Cody |

### Error Codes

| Code Pattern | Category | Example | Retryable |
|--------------|----------|---------|-----------|
| `{ADAPTER}-AUTH-xxx` | Authentication | `CODEX-AUTH-001` | No |
| `{ADAPTER}-RL-xxx` | Rate Limit | `GEMINI-RL-001` | Yes |
| `{ADAPTER}-NET-xxx` | Network | `CURSOR-NET-001` | Yes |
| `{ADAPTER}-VAL-xxx` | Validation | `CODY-VAL-001` | No |
| `{ADAPTER}-TIMEOUT-xxx` | Timeout | `AIDER-TIMEOUT-001` | Yes |
| `{ADAPTER}-SYS-xxx` | System | `CONTINUE-SYS-001` | Sometimes |

## Testing

### Unit Tests

```typescript
import { CodexAdapter } from './codex-adapter';
import { MockAdapter } from '../testing/mock-adapter';

describe('CodexAdapter', () => {
  let adapter: CodexAdapter;

  beforeEach(async () => {
    adapter = new CodexAdapter();
    await adapter.initialize({
      type: 'openai',
      name: 'test',
      apiKey: 'test-key',
      model: 'gpt-4'
    });
  });

  it('should translate A2A message to OpenAI format', () => {
    const a2aMsg: A2AMessage = {
      id: 'test',
      type: 'request',
      operation: 'code.generate',
      payload: { prompt: 'Hello world' },
      metadata: { timestamp: Date.now(), source: 'test' }
    };

    const openaiRequest = adapter.translateRequest(a2aMsg);
    expect(openaiRequest.model).toBe('gpt-4');
    expect(openaiRequest.messages).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Adapter Integration', () => {
  it('should execute code generation across multiple adapters', async () => {
    const registry = AdapterRegistry.getInstance();

    const adapters = await registry.createMultiple([
      createOpenAIConfig(),
      createGeminiConfig()
    ]);

    const message: A2AMessage = {
      id: 'test',
      type: 'request',
      operation: 'code.generate',
      payload: { prompt: 'Create a function to add two numbers' },
      metadata: { timestamp: Date.now(), source: 'test' }
    };

    const results = await Promise.all(
      adapters.map(id => registry.get(id).sendMessage(message))
    );

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.status).toBe('success');
      expect(result.payload.content).toBeDefined();
    });
  });
});
```

### Mock Adapter

```typescript
import { MockAdapter } from '../testing/mock-adapter';

const mock = new MockAdapter();
await mock.initialize({ type: 'mock', name: 'test' });

// Set expected response
mock.setResponse({
  id: 'mock_1',
  messageId: 'test',
  status: 'success',
  payload: { content: 'Mocked response' },
  metadata: { timestamp: Date.now(), duration: 0 }
});

const response = await mock.sendMessage(message);
expect(response.payload.content).toBe('Mocked response');
```

## Performance Considerations

### Rate Limiting

Each adapter implements rate limiting according to the provider's limits:

- **OpenAI**: 3,500 RPM, 90,000 TPM
- **Gemini**: 60 RPM (Pro), 1,500 RPD
- **Cody**: 60 RPM
- **Local adapters**: No limits

### Caching

Adapters support response caching:

```typescript
const config = createOpenAIConfig({
  options: {
    enableCache: true,
    cacheTTL: 3600000  // 1 hour
  }
});
```

### Connection Pooling

For high-throughput scenarios:

```typescript
const registry = AdapterRegistry.getInstance();

// Create pool of adapters
const pool = await Promise.all(
  Array(5).fill(null).map(() =>
    registry.create(createOpenAIConfig())
  )
);

// Round-robin usage
let current = 0;
function getNextAdapter() {
  const adapter = registry.get(pool[current]);
  current = (current + 1) % pool.length;
  return adapter;
}
```

## Error Handling

### Retry Logic

All adapters implement exponential backoff:

```typescript
{
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 10000,
    retryableErrors: ['RATE_LIMIT', 'NETWORK', 'TIMEOUT']
  }
}
```

### Error Recovery

```typescript
try {
  const response = await adapter.sendMessage(message);
} catch (error) {
  if (error instanceof AdapterError) {
    if (error.retryable) {
      // Retry with exponential backoff
      await sleep(1000);
      return adapter.sendMessage(message);
    } else {
      // Switch to fallback adapter
      const fallback = registry.get(fallbackId);
      return fallback.sendMessage(message);
    }
  }
  throw error;
}
```

## Monitoring & Observability

### Metrics

```typescript
const metrics = adapter.getMetrics();
console.log({
  totalRequests: metrics.totalRequests,
  successRate: metrics.successfulRequests / metrics.totalRequests,
  averageLatency: metrics.averageLatency,
  tokensUsed: metrics.tokensUsed,
  errors: metrics.errors
});
```

### Health Checks

```typescript
// Check all adapters
const health = await registry.healthCheck();
console.log(health);  // { 'adapter_1': true, 'adapter_2': false }

// Auto-cleanup unhealthy adapters
for (const [id, healthy] of Object.entries(health)) {
  if (!healthy) {
    await registry.destroy(id);
  }
}
```

### Logging

All adapters emit events:

```typescript
adapter.on('initialized', ({ adapter }) => {
  console.log(`Adapter ${adapter} initialized`);
});

adapter.on('response', ({ message, response }) => {
  console.log(`Response received for ${message.id}`);
});

adapter.on('error', ({ message, error }) => {
  console.error(`Error for ${message.id}:`, error);
});
```

## Best Practices

1. **Use the registry**: Always create adapters through the registry for proper lifecycle management
2. **Handle errors**: Implement proper error handling and fallback strategies
3. **Monitor health**: Regularly check adapter health and clean up inactive instances
4. **Choose the right adapter**: Match capabilities to your use case
5. **Respect rate limits**: Implement backoff and consider connection pooling
6. **Context is key**: Provide rich context for better results
7. **Stream when possible**: Use streaming for better UX in interactive scenarios
8. **Test thoroughly**: Use mock adapters and integration tests

## Contributing

To add a new adapter:

1. Extend `BaseAgentAdapter`
2. Implement all required methods
3. Add to `AdapterRegistry`
4. Create configuration helper
5. Write tests
6. Update documentation

See `base-adapter.ts` for the full interface.

## License

Part of the Claude Flow project - see main LICENSE file.
