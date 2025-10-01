/**
 * CLI Adapters for Agent-to-Agent Communication
 *
 * Production-ready adapters for integrating CLI-based coding agents (Codex, Cursor, Gemini)
 * into Claude Flow's Agent-to-Agent communication system.
 *
 * @module a2a/adapters/cli
 */

// Base adapter and types
export {
  CLIAdapter,
  CLIAdapterConfig,
  ContextStrategy,
  ProcessState,
  CLIOutput,
  CLIError,
  A2AMessage,
  A2AResponse
} from './base-cli-adapter';

// Codex CLI adapter
export {
  CodexCLIAdapter,
  CodexCLIConfig,
  createCodexAdapter
} from './codex-cli-adapter';

// Cursor Agent adapter
export {
  CursorAgentAdapter,
  CursorAgentConfig,
  createCursorAdapter
} from './cursor-agent-adapter';

// Gemini CLI adapter
export {
  GeminiCLIAdapter,
  GeminiCLIConfig,
  createGeminiAdapter
} from './gemini-cli-adapter';

// Registry
export {
  CLIAdapterRegistry,
  CLIAgentDescriptor,
  globalRegistry,
  createAdapter,
  detectAvailableAgents,
  findBestAdapter
} from './registry';

// Context builder
export {
  ContextBuilder,
  FileContext,
  ProjectContext,
  GitInfo,
  TaskContext,
  AgentContext,
  createContextBuilder
} from './context-builder';

// Protocol translator
export {
  ProtocolTranslator,
  CodexRequest,
  CodexResponse,
  CursorRequest,
  CursorResponse,
  CursorStreamEvent,
  GeminiRequest,
  GeminiStreamChunk,
  createProtocolTranslator
} from './protocol-translator';

/**
 * Quick start examples
 *
 * @example Basic usage with auto-detection
 * ```typescript
 * import { detectAvailableAgents, createAdapter } from './cli';
 *
 * // Detect available CLIs
 * const available = await detectAvailableAgents();
 * console.log('Available:', available.map(a => a.name));
 *
 * // Create adapter
 * const adapter = createAdapter('codex', {
 *   apiKey: process.env.OPENAI_API_KEY
 * });
 *
 * // Execute task
 * const response = await adapter.executeSync({
 *   role: 'user',
 *   content: 'Write a function to calculate fibonacci'
 * });
 *
 * console.log(response.content);
 * await adapter.cleanup();
 * ```
 *
 * @example Using specific adapter
 * ```typescript
 * import { createCodexAdapter } from './cli';
 *
 * const adapter = createCodexAdapter({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4-turbo',
 *   temperature: 0.7,
 *   systemPrompt: 'You are an expert TypeScript developer'
 * });
 *
 * const response = await adapter.executeSync({
 *   role: 'user',
 *   content: 'Refactor this code to use async/await'
 * });
 * ```
 *
 * @example With context building
 * ```typescript
 * import { createCursorAdapter, createContextBuilder } from './cli';
 *
 * const adapter = createCursorAdapter({
 *   apiKey: process.env.CURSOR_API_KEY,
 *   projectRoot: process.cwd(),
 *   enableLSP: true
 * });
 *
 * const contextBuilder = createContextBuilder(process.cwd());
 * const context = await contextBuilder.buildTaskContext({
 *   id: 'task-1',
 *   type: 'refactor',
 *   description: 'Refactor authentication module',
 *   relatedFiles: ['src/auth.ts', 'src/middleware/auth.ts']
 * });
 *
 * const response = await adapter.executeSync({
 *   role: 'user',
 *   content: 'Refactor to use dependency injection',
 *   metadata: { context }
 * });
 * ```
 *
 * @example Streaming responses
 * ```typescript
 * import { createGeminiAdapter } from './cli';
 *
 * const adapter = createGeminiAdapter({
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   model: 'gemini-pro',
 *   stream: true
 * });
 *
 * const iterator = await adapter.execute({
 *   role: 'user',
 *   content: 'Explain async/await in detail'
 * });
 *
 * for await (const response of iterator) {
 *   process.stdout.write(response.content);
 * }
 * ```
 *
 * @example Finding best adapter
 * ```typescript
 * import { findBestAdapter, createAdapter } from './cli';
 *
 * const best = findBestAdapter({
 *   capabilities: ['code-generation', 'refactoring'],
 *   languages: ['typescript'],
 *   preferredModel: 'gpt-4'
 * });
 *
 * if (best) {
 *   const adapter = createAdapter(best.name, {
 *     apiKey: process.env.API_KEY
 *   });
 *
 *   // Use adapter...
 * }
 * ```
 */
