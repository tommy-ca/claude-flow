# A2A Adapter Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Claude Flow Orchestration Layer                  │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Swarm      │  │   Neural     │  │   Memory     │             │
│  │ Coordination │  │   Training   │  │  Management  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             │ A2A Protocol
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                      Adapter Registry                              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Factory Pattern                                            │  │
│  │  - Create adapters by type                                 │  │
│  │  - Instance lifecycle management                           │  │
│  │  - Health monitoring                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Routing & Selection                                        │  │
│  │  - Capability-based routing                                │  │
│  │  - Operation-based routing                                 │  │
│  │  - Load balancing                                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼───────┐  ┌────────▼───────┐
│ Base Adapter   │  │  Base Adapter  │  │  Base Adapter  │
│   Interface    │  │   Interface    │  │   Interface    │
└───────┬────────┘  └────────┬───────┘  └────────┬───────┘
        │                    │                    │
┌───────▼────────┐  ┌────────▼───────┐  ┌────────▼───────┐
│ OpenAI Codex   │  │ Google Gemini  │  │    Cursor      │
│   Adapter      │  │    Adapter     │  │    Adapter     │
│                │  │                │  │                │
│ • Chat API     │  │ • Gen AI API   │  │ • Local IDE    │
│ • Streaming    │  │ • Multi-modal  │  │ • LSP          │
│ • Functions    │  │ • 1M context   │  │ • Inline edit  │
└───────┬────────┘  └────────┬───────┘  └────────┬───────┘
        │                    │                    │
┌───────▼────────┐  ┌────────▼───────┐  ┌────────▼───────┐
│ OpenAI API     │  │ Google AI API  │  │  Cursor IDE    │
└────────────────┘  └────────────────┘  └────────────────┘

        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼───────┐  ┌────────▼───────┐
│ Aider Adapter  │  │ Continue.dev   │  │ Cody Adapter   │
│                │  │   Adapter      │  │                │
│ • Git aware    │  │ • Extensions   │  │ • Code search  │
│ • CLI-based    │  │ • Slash cmds   │  │ • Semantic     │
│ • Auto-commit  │  │ • Context      │  │ • Intelligence │
└───────┬────────┘  └────────┬───────┘  └────────┬───────┘
        │                    │                    │
┌───────▼────────┐  ┌────────▼───────┐  ┌────────▼───────┐
│ Aider CLI      │  │ Continue.dev   │  │ Sourcegraph    │
│                │  │   Extension    │  │   Platform     │
└────────────────┘  └────────────────┘  └────────────────┘
```

## Core Components

### 1. Base Adapter (`base-adapter.ts`)

Abstract base class providing:
- Lifecycle management (initialize, shutdown, health checks)
- Protocol translation (A2A ↔ Native)
- Error handling and retry logic
- Metrics tracking
- Event emission

**Key Methods:**
```typescript
abstract class BaseAgentAdapter {
  // Lifecycle
  async initialize(config: AgentConfig): Promise<void>
  async shutdown(): Promise<void>
  async isHealthy(): Promise<boolean>

  // Core operations
  async sendMessage(message: A2AMessage): Promise<A2AResponse>
  async *streamResponse(message: A2AMessage): AsyncIterator<StreamChunk>

  // Protocol translation
  abstract translateRequest(a2aMsg: A2AMessage): any
  abstract translateResponse(nativeResp: any): A2AResponse
  translateError(error: any): A2AError

  // Monitoring
  getMetrics(): AdapterMetrics
  resetMetrics(): void
}
```

### 2. Adapter Registry (`adapter-registry.ts`)

Centralized management:
- Factory pattern for adapter creation
- Instance lifecycle management
- Capability-based routing
- Health monitoring
- Metrics aggregation

**Key Features:**
```typescript
class AdapterRegistry {
  // Creation
  async create(config: AdapterConfigUnion): Promise<string>
  async createMultiple(configs: AdapterConfigUnion[]): Promise<string[]>

  // Access
  get(id: string): IAgentBackendAdapter
  list(): Array<{ id: string; type: AdapterType; name: string }>

  // Query
  findByCapability(capability: AgentCapability): string[]
  findByOperation(operation: OperationType): string[]

  // Health
  async healthCheck(id?: string): Promise<Record<string, boolean>>
  getMetrics(id: string): AdapterMetrics
  getAllMetrics(): AdapterMetrics[]

  // Cleanup
  async destroy(id: string): Promise<void>
  async destroyAll(): Promise<void>
}
```

## Adapter Implementations

### OpenAI Codex (`codex-adapter.ts`)

**Purpose:** GPT-based code generation and chat

**Features:**
- Multiple model support (GPT-4, GPT-4 Turbo, GPT-3.5)
- Function calling for structured operations
- Streaming responses
- Conversation history management
- Context window: 8K - 128K tokens

**Configuration:**
```typescript
{
  type: 'openai',
  apiKey: string,
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo',
  organization?: string,
  maxTokens?: number,
  temperature?: number
}
```

**Capabilities:**
- Code generation, editing, review, refactoring, explanation
- Test generation
- Chat interface
- Streaming
- Function calling

### Google Gemini (`gemini-adapter.ts`)

**Purpose:** Research and multi-modal code generation

**Features:**
- Up to 1M token context window
- Multi-modal support (Pro Vision)
- Configurable safety settings
- Streaming responses
- Citation metadata

**Configuration:**
```typescript
{
  type: 'google',
  apiKey: string,
  model: 'gemini-pro' | 'gemini-1.5-pro' | 'gemini-1.5-flash',
  safetySettings?: SafetySetting[],
  generationConfig?: {
    temperature?: number,
    maxOutputTokens?: number
  }
}
```

**Capabilities:**
- Code generation, editing, review, explanation
- Test generation
- Multi-modal processing
- Streaming
- Long context handling

### Cursor (`cursor-adapter.ts`)

**Purpose:** IDE integration and inline editing

**Features:**
- Inline editing (ghost text, diff, replace modes)
- LSP diagnostics integration
- File operations (read, write, edit, search)
- Context gathering
- Workspace awareness

**Configuration:**
```typescript
{
  type: 'cursor',
  workspaceRoot: string,
  cursorPath?: string,
  serverPort?: number,
  enableLSP?: boolean,
  inlineEditingMode?: 'ghost-text' | 'diff' | 'replace'
}
```

**Capabilities:**
- Code generation, editing, review
- Inline editing
- File operations
- LSP integration
- Workspace awareness
- Multi-file context

### Aider (`aider-adapter.ts`)

**Purpose:** Git-aware autonomous code editing

**Features:**
- Git integration (commit, diff, undo)
- Autonomous code editing
- Multiple edit formats (whole, diff, udiff)
- Streaming output
- Session file management

**Configuration:**
```typescript
{
  type: 'aider',
  workspaceRoot: string,
  aiderPath?: string,
  model?: string,
  autoCommit?: boolean,
  editFormat?: 'whole' | 'diff' | 'udiff',
  stream?: boolean
}
```

**Capabilities:**
- Code generation, editing, refactoring
- File editing
- Git operations
- Streaming
- Autonomous execution

### Continue.dev (`continue-adapter.ts`)

**Purpose:** IDE extension integration

**Features:**
- Slash commands (/edit, /review, /test, etc.)
- Context providers (file, terminal, problems)
- Custom command registration
- IDE-native integration
- Multi-model support

**Configuration:**
```typescript
{
  type: 'continue',
  workspaceRoot: string,
  serverUrl?: string,
  model?: string,
  contextProviders?: string[],
  customCommands?: Record<string, string>
}
```

**Capabilities:**
- Code generation, editing, review, refactoring, explanation
- Inline editing
- Chat interface
- Streaming
- Workspace awareness
- LSP integration
- Terminal execution

### Sourcegraph Cody (`cody-adapter.ts`)

**Purpose:** Code intelligence and semantic search

**Features:**
- Code search across repositories
- Semantic code understanding
- Reference finding
- Context gathering from search
- Code explanation

**Configuration:**
```typescript
{
  type: 'sourcegraph',
  accessToken: string,
  serverEndpoint?: string,
  workspaceRoot?: string,
  enableCodeSearch?: boolean,
  searchContextSize?: number
}
```

**Capabilities:**
- Code generation, editing, review, explanation
- Code search
- Semantic search
- Chat interface
- Streaming

## Protocol Specification

### A2A Message Format

```typescript
interface A2AMessage {
  id: string                    // Unique message ID
  type: 'request' | 'response' | 'notification' | 'error'
  operation: OperationType      // What to do
  payload: any                  // Operation-specific data
  requiredCapabilities?: AgentCapability[]
  metadata: {
    timestamp: number
    source: string
    priority?: 'low' | 'medium' | 'high' | 'critical'
    timeout?: number
    retryPolicy?: RetryPolicy
    streaming?: boolean
  }
  context?: {
    sessionId?: string
    conversationId?: string
    workspaceRoot?: string
    fileContext?: FileContext[]
    gitContext?: GitContext
    environmentVars?: Record<string, string>
  }
}
```

### A2A Response Format

```typescript
interface A2AResponse {
  id: string                    // Response ID
  messageId: string             // Original message ID
  status: 'success' | 'error' | 'partial'
  payload: any                  // Operation result
  metadata: {
    timestamp: number
    duration: number
    tokensUsed?: TokenUsage
    model?: string
    cached?: boolean
  }
  error?: A2AError
}
```

## Operation Types

| Operation | Description | Input | Output |
|-----------|-------------|-------|--------|
| `code.generate` | Generate new code | `{ prompt: string }` | `{ content: string, language?: string }` |
| `code.edit` | Edit existing code | `{ filePath: string, instruction: string }` | `{ content: string, changes: Edit[] }` |
| `code.review` | Review code | `{ code: string, focusAreas?: string[] }` | `{ feedback: string, issues: Issue[] }` |
| `code.refactor` | Refactor code | `{ code: string, goal: string }` | `{ refactored: string, explanation: string }` |
| `code.explain` | Explain code | `{ code: string }` | `{ explanation: string }` |
| `code.test` | Generate tests | `{ code: string, framework?: string }` | `{ tests: string }` |
| `file.read` | Read file | `{ filePath: string }` | `{ content: string }` |
| `file.write` | Write file | `{ filePath: string, content: string }` | `{ success: boolean }` |
| `file.edit` | Edit file | `{ filePath: string, edits: Edit[] }` | `{ success: boolean }` |
| `search.code` | Search code | `{ query: string }` | `{ results: SearchResult[] }` |
| `git.commit` | Git commit | `{ message: string }` | `{ commitHash: string }` |
| `chat.send` | Chat message | `{ message: string }` | `{ content: string }` |

## Error Handling

### Error Categories

```typescript
enum ErrorCategory {
  AUTHENTICATION    // Invalid credentials
  RATE_LIMIT       // Rate limit exceeded
  NETWORK          // Network errors
  VALIDATION       // Invalid input
  TIMEOUT          // Request timeout
  SYSTEM           // System errors
  SECURITY         // Security issues
  CONFIGURATION    // Config errors
  UNSUPPORTED      // Operation not supported
}
```

### Error Code Format

```
{ADAPTER}-{CATEGORY}-{NUMBER}

Examples:
- CODEX-AUTH-001: OpenAI authentication failed
- GEMINI-RL-001: Google rate limit exceeded
- CURSOR-NET-001: Cursor connection failed
```

### Retry Policy

```typescript
interface RetryPolicy {
  maxRetries: number              // Max retry attempts
  backoffMs: number               // Initial backoff
  backoffMultiplier: number       // Backoff multiplier
  maxBackoffMs: number            // Max backoff
  retryableErrors: string[]       // Which categories to retry
}
```

## Performance Characteristics

| Adapter | Latency | Throughput | Context Window | Rate Limits |
|---------|---------|------------|----------------|-------------|
| Codex | 1-5s | High | 8K-128K | 3500 RPM |
| Gemini | 2-8s | Medium | 32K-1M | 60 RPM |
| Cursor | <100ms | High | 100K | Local |
| Aider | 5-30s | Low | 32K | Depends on model |
| Continue | <500ms | High | 100K | Depends on model |
| Cody | 1-3s | Medium | 100K | 60 RPM |

## Extension Points

### Custom Adapters

To add a new adapter:

1. **Extend BaseAgentAdapter**
```typescript
class MyAdapter extends BaseAgentAdapter {
  protected async doInitialize(): Promise<void> {
    // Setup connection
  }

  protected async executeRequest(req: any, msg: A2AMessage): Promise<any> {
    // Execute request
  }

  translateRequest(a2aMsg: A2AMessage): any {
    // Convert A2A → Native
  }

  translateResponse(nativeResp: any, requestId: string): A2AResponse {
    // Convert Native → A2A
  }

  getCapabilities(): AgentCapabilities {
    // Return capabilities
  }
}
```

2. **Register with Registry**
```typescript
registry.register({
  type: 'my-adapter',
  factory: (config) => new MyAdapter(),
  description: 'My custom adapter',
  capabilities: [...]
});
```

### Custom Operations

Define new operations:

```typescript
type MyOperationType = OperationType | 'custom.operation';

// Use in messages
const message: A2AMessage = {
  operation: 'custom.operation',
  // ...
};
```

## Testing Strategy

### Unit Tests
- Mock adapter responses
- Test protocol translation
- Validate error handling

### Integration Tests
- Test real API calls
- Validate end-to-end flows
- Test streaming

### Performance Tests
- Measure latency
- Test rate limiting
- Validate concurrency

## Security Considerations

1. **API Key Management**: Store keys securely, never commit
2. **Input Validation**: Validate all inputs before sending to adapters
3. **Output Sanitization**: Sanitize responses before using
4. **Rate Limiting**: Respect provider limits
5. **Error Handling**: Don't leak sensitive info in errors
6. **Audit Logging**: Log all adapter calls for auditing

## Future Enhancements

- [ ] Adapter caching layer
- [ ] Connection pooling
- [ ] Circuit breaker pattern
- [ ] Request deduplication
- [ ] Automatic failover
- [ ] Cost tracking per adapter
- [ ] A/B testing framework
- [ ] Adapter performance profiling
