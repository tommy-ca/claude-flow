# CLI Adapters for A2A Communication

Production-ready TypeScript adapters for integrating CLI-based coding agents (Codex, Cursor, Gemini) into Claude Flow's Agent-to-Agent communication system.

## Features

- **Process Management**: Robust process lifecycle management with timeouts, retry logic, and resource monitoring
- **Streaming Support**: Real-time streaming responses for better user experience
- **Context Strategies**: Multiple strategies for passing context (stdin, temp files, environment, args)
- **Error Handling**: Comprehensive error handling with automatic recovery
- **Auto-Detection**: Automatic detection of installed CLI tools
- **Protocol Translation**: Seamless translation between A2A messages and CLI-specific formats
- **Session Reuse**: Connection pooling and session management for efficiency

## Supported CLIs

| CLI | Status | Capabilities |
|-----|--------|--------------|
| **OpenAI Codex** | ✅ Production | Code generation, completion, explanation, debugging |
| **Cursor Agent** | ✅ Production | LSP integration, multi-file editing, pair programming |
| **Gemini CLI** | ✅ Production | Multi-modal, large context (1M tokens), streaming |

## Installation

The adapters are part of Claude Flow and require the respective CLI tools to be installed:

```bash
# OpenAI Codex CLI
npm install -g @openai/codex
# OR
brew install codex

# Cursor Agent CLI
curl https://cursor.com/install -fsSL | bash

# Google Gemini CLI
npm install -g @google/gemini-cli
# OR
brew install gemini-cli
```

## Quick Start

### Auto-Detection

```typescript
import { detectAvailableAgents, createAdapter } from '@/a2a/adapters/cli';

// Detect available CLIs
const available = await detectAvailableAgents();
console.log('Available agents:', available.map(a => a.displayName));

// Create adapter for first available
if (available.length > 0) {
  const adapter = createAdapter(available[0].name, {
    apiKey: process.env.API_KEY
  });

  const response = await adapter.executeSync({
    role: 'user',
    content: 'Write a function to calculate fibonacci numbers'
  });

  console.log(response.content);
  await adapter.cleanup();
}
```

### Using Specific Adapters

#### OpenAI Codex

```typescript
import { createCodexAdapter } from '@/a2a/adapters/cli';

const adapter = createCodexAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo',
  temperature: 0.7,
  systemPrompt: 'You are an expert TypeScript developer.'
});

const response = await adapter.executeSync({
  role: 'user',
  content: 'Refactor this code to use modern ES6 features'
});

console.log(response.content);
await adapter.cleanup();
```

#### Cursor Agent

```typescript
import { createCursorAdapter } from '@/a2a/adapters/cli';

const adapter = createCursorAdapter({
  apiKey: process.env.CURSOR_API_KEY!,
  projectRoot: process.cwd(),
  enableLSP: true,
  fileContext: ['src/auth.ts', 'src/middleware/auth.ts'],
  outputFormat: 'json'
});

const response = await adapter.executeSync({
  role: 'user',
  content: 'Refactor authentication to use JWT tokens'
});

console.log('Files changed:', response.metadata?.fileChanges);
await adapter.cleanup();
```

#### Gemini CLI

```typescript
import { createGeminiAdapter } from '@/a2a/adapters/cli';

const adapter = createGeminiAdapter({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-pro',
  stream: true,
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048
  }
});

// Streaming response
const iterator = await adapter.execute({
  role: 'user',
  content: 'Explain how async/await works in JavaScript'
});

for await (const response of iterator) {
  process.stdout.write(response.content);
}

await adapter.cleanup();
```

## Advanced Usage

### Context Building

Build structured context for CLI agents:

```typescript
import { createContextBuilder, createCursorAdapter } from '@/a2a/adapters/cli';

const builder = createContextBuilder(process.cwd());

const context = await builder.buildTaskContext({
  id: 'task-1',
  type: 'refactor',
  description: 'Refactor authentication module',
  relatedFiles: ['src/auth.ts', 'src/middleware/auth.ts']
});

const adapter = createCursorAdapter({
  apiKey: process.env.CURSOR_API_KEY!,
  projectRoot: process.cwd()
});

const response = await adapter.executeSync({
  role: 'user',
  content: 'Use dependency injection pattern',
  metadata: { context }
});
```

### Protocol Translation

Manually translate between A2A and CLI formats:

```typescript
import { createProtocolTranslator } from '@/a2a/adapters/cli';

const translator = createProtocolTranslator();

// A2A to Codex
const codexReq = translator.a2aToCodex(message, {
  model: 'gpt-4',
  temperature: 0.7,
  systemPrompt: 'You are a coding assistant'
});

// Codex to A2A
const a2aResp = translator.codexToA2A(codexResponse);
```

### Finding Best Adapter

Automatically select the best adapter for your requirements:

```typescript
import { findBestAdapter, createAdapter } from '@/a2a/adapters/cli';

const best = findBestAdapter({
  capabilities: ['code-generation', 'refactoring', 'lsp-integration'],
  languages: ['typescript', 'javascript'],
  preferredModel: 'cursor'
});

if (best) {
  console.log(`Using ${best.displayName}`);

  const adapter = createAdapter(best.name, {
    apiKey: process.env.API_KEY,
    projectRoot: process.cwd()
  });

  // Use adapter...
}
```

### Registry Management

Manage custom adapters:

```typescript
import { CLIAdapterRegistry } from '@/a2a/adapters/cli';

const registry = new CLIAdapterRegistry();

// Register custom adapter
registry.register('my-cli', MyCustomAdapter, {
  name: 'my-cli',
  displayName: 'My Custom CLI',
  command: 'my-cli',
  capabilities: ['custom-feature'],
  supportedLanguages: ['python']
});

// Health check
const health = await registry.healthCheck('codex');
console.log('Codex health:', health);
```

## Configuration

### Environment Variables

```bash
# OpenAI Codex
OPENAI_API_KEY=sk-...

# Cursor Agent
CURSOR_API_KEY=...

# Gemini CLI
GOOGLE_API_KEY=...
```

### Context Strategies

The adapters automatically select the best strategy based on context size:

- **STDIN** (< 10KB): Fast, no file I/O
- **TEMP_FILE** (10KB - 1MB): Efficient for medium data
- **WORKING_DIR** (> 1MB): Best for large codebases
- **ENVIRONMENT**: Configuration and API keys
- **ARGS**: Simple parameters
- **HYBRID**: Combination for complex scenarios

### Retry Configuration

```typescript
const adapter = createCodexAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    retryableExitCodes: [1, 2, 143]
  }
});
```

### Resource Limits

```typescript
const adapter = createCodexAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 60000,           // 60 second timeout
  maxMemoryMB: 512,         // 512MB memory limit
  maxProcesses: 3,          // Max 3 concurrent processes
  reuseProcesses: true      // Enable process pooling
});
```

## Error Handling

All adapters provide comprehensive error handling:

```typescript
import { CLIError } from '@/a2a/adapters/cli';

try {
  const response = await adapter.executeSync(message);
} catch (error) {
  if (error instanceof CLIError) {
    console.error('Error code:', error.code);
    console.error('Exit code:', error.exitCode);
    console.error('stderr:', error.stderr);

    // Handle specific errors
    switch (error.code) {
      case 'TIMEOUT':
        // Increase timeout and retry
        break;
      case 'EXIT_CODE':
        // Handle non-zero exit
        break;
      case 'PARSE_ERROR':
        // Handle parsing failure
        break;
    }
  }
}
```

## Performance

- **Process Pooling**: Reuse processes for multiple requests
- **Streaming**: Real-time response streaming
- **Context Optimization**: Automatic strategy selection
- **Retry Logic**: Exponential backoff for transient errors
- **Resource Monitoring**: Memory and CPU limits

## Testing

Unit tests with mocks:

```typescript
import { CodexCLIAdapter } from '@/a2a/adapters/cli';

describe('CodexCLIAdapter', () => {
  it('should execute message', async () => {
    const adapter = new CodexCLIAdapter({
      apiKey: 'test-key'
    });

    // Mock spawnProcess
    jest.spyOn(adapter as any, 'spawnProcess').mockResolvedValue(mockProcess);

    const response = await adapter.executeSync({
      role: 'user',
      content: 'test'
    });

    expect(response.content).toBeDefined();
  });
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    A2A Message Router                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLI Adapter Manager                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ - Process Pool Management                                │  │
│  │ - Adapter Registry                                       │  │
│  │ - Session Management                                     │  │
│  │ - Resource Monitoring                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬────────────┬────────────┬──────────────────────────┘
             │            │            │
    ┌────────▼───┐  ┌────▼─────┐  ┌──▼──────────┐
    │  Codex CLI │  │  Cursor  │  │ Gemini CLI  │
    │  Adapter   │  │  Agent   │  │  Adapter    │
    │            │  │  Adapter │  │             │
    └────────┬───┘  └────┬─────┘  └──┬──────────┘
             │           │            │
    ┌────────▼───────────▼────────────▼──────────┐
    │         Process Executor Layer             │
    │  ┌──────────────────────────────────────┐  │
    │  │ - spawn()   - send()   - receive()   │  │
    │  │ - terminate() - monitor() - timeout()│  │
    │  └──────────────────────────────────────┘  │
    └────────┬──────────────────────────────────┘
             │
    ┌────────▼──────────┐
    │  Child Processes  │
    │  ┌──────────────┐ │
    │  │ stdin        │ │
    │  │ stdout       │ │
    │  │ stderr       │ │
    │  └──────────────┘ │
    └───────────────────┘
```

## Contributing

See examples in `/src/a2a/adapters/cli/examples/` for usage patterns.

## License

Part of Claude Flow project.
