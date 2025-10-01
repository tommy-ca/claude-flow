/**
 * A2A Adapters - Main Export File
 * Unified interface for multiple coding agent backends
 */

// Base adapter and types
export * from './base-adapter';

// Individual adapters
export { CodexAdapter, OpenAIConfig, CODEX_CONFIG_EXAMPLES } from './codex-adapter';
export { GeminiAdapter, GeminiConfig, GEMINI_CONFIG_EXAMPLES } from './gemini-adapter';
export { CursorAdapter, CursorConfig, CURSOR_CONFIG_EXAMPLES } from './cursor-adapter';
export { AiderAdapter, AiderConfig, AIDER_CONFIG_EXAMPLES } from './aider-adapter';
export { ContinueAdapter, ContinueConfig, CONTINUE_CONFIG_EXAMPLES } from './continue-adapter';
export { CodyAdapter, CodyConfig, CODY_CONFIG_EXAMPLES } from './cody-adapter';

// Registry and factory
export {
  AdapterRegistry,
  AdapterType,
  AdapterConfigUnion,
  getRegistry,
  createAdapter,
  getAdapter,
  destroyAdapter,
  createOpenAIConfig,
  createGeminiConfig,
  createCursorConfig,
  createAiderConfig,
  createContinueConfig,
  createCodyConfig
} from './adapter-registry';

// Testing utilities
export {
  MockAdapter,
  createMockAdapter,
  createInitializedMock,
  createMockResponse,
  createMockMessage,
  assertMock
} from './testing/mock-adapter';

// Re-export common types for convenience
export type {
  IAgentBackendAdapter,
  A2AMessage,
  A2AResponse,
  StreamChunk,
  AgentConfig,
  AgentCapabilities,
  AgentCapability,
  OperationType,
  AdapterError,
  ErrorCategory,
  A2AError,
  MessageMetadata,
  ResponseMetadata,
  ExecutionContext,
  FileContext,
  GitContext,
  TokenUsage
} from './base-adapter';
