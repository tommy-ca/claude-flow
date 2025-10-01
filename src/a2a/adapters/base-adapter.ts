/**
 * Base Adapter Interface for A2A Protocol
 * Provides unified interface for multiple coding agent backends
 */

import { EventEmitter } from 'events';

// ============================================================================
// Core Types
// ============================================================================

export interface A2AMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'error';
  operation: OperationType;
  payload: any;
  requiredCapabilities?: AgentCapability[];
  metadata: MessageMetadata;
  context?: ExecutionContext;
}

export interface A2AResponse {
  id: string;
  messageId: string;
  status: 'success' | 'error' | 'partial';
  payload: any;
  metadata: ResponseMetadata;
  error?: A2AError;
}

export interface StreamChunk {
  id: string;
  type: 'delta' | 'complete' | 'error';
  data: any;
  metadata?: Record<string, any>;
}

export interface MessageMetadata {
  timestamp: number;
  source: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
  retryPolicy?: RetryPolicy;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface ResponseMetadata {
  timestamp: number;
  duration: number;
  tokensUsed?: TokenUsage;
  model?: string;
  cached?: boolean;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ExecutionContext {
  sessionId?: string;
  conversationId?: string;
  workspaceRoot?: string;
  fileContext?: FileContext[];
  gitContext?: GitContext;
  environmentVars?: Record<string, string>;
}

export interface FileContext {
  path: string;
  content?: string;
  language?: string;
  startLine?: number;
  endLine?: number;
  relevance?: number;
}

export interface GitContext {
  branch: string;
  commit?: string;
  repository?: string;
  changedFiles?: string[];
  uncommittedChanges?: boolean;
}

// ============================================================================
// Capabilities & Operations
// ============================================================================

export type OperationType =
  | 'code.generate'
  | 'code.edit'
  | 'code.review'
  | 'code.refactor'
  | 'code.explain'
  | 'code.test'
  | 'file.read'
  | 'file.write'
  | 'file.edit'
  | 'file.search'
  | 'git.commit'
  | 'git.diff'
  | 'git.status'
  | 'terminal.execute'
  | 'search.code'
  | 'search.semantic'
  | 'chat.send'
  | 'task.orchestrate'
  | 'context.gather';

export enum AgentCapability {
  // Code operations
  CODE_GENERATION = 'code.generation',
  CODE_EDITING = 'code.editing',
  CODE_REVIEW = 'code.review',
  CODE_REFACTORING = 'code.refactoring',
  CODE_EXPLANATION = 'code.explanation',
  TEST_GENERATION = 'test.generation',

  // File operations
  FILE_READING = 'file.reading',
  FILE_WRITING = 'file.writing',
  FILE_EDITING = 'file.editing',
  FILE_SEARCH = 'file.search',

  // Git operations
  GIT_OPERATIONS = 'git.operations',
  GIT_AWARE = 'git.aware',

  // Terminal & execution
  TERMINAL_EXECUTION = 'terminal.execution',
  COMMAND_EXECUTION = 'command.execution',

  // Search capabilities
  CODE_SEARCH = 'search.code',
  SEMANTIC_SEARCH = 'search.semantic',

  // Communication
  CHAT_INTERFACE = 'chat.interface',
  STREAMING_RESPONSE = 'streaming.response',
  FUNCTION_CALLING = 'function.calling',

  // Context awareness
  WORKSPACE_AWARENESS = 'workspace.awareness',
  LSP_INTEGRATION = 'lsp.integration',
  MULTI_FILE_CONTEXT = 'multi.file.context',

  // Advanced features
  MULTI_MODAL = 'multi.modal',
  INLINE_EDITING = 'inline.editing',
  AUTONOMOUS_EXECUTION = 'autonomous.execution'
}

export interface AgentCapabilities {
  supported: AgentCapability[];
  operations: OperationType[];
  limitations?: {
    maxContextSize?: number;
    maxTokens?: number;
    rateLimit?: RateLimit;
    fileTypes?: string[];
  };
  metadata?: {
    version?: string;
    model?: string;
    provider?: string;
  };
}

export interface RateLimit {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  requestsPerDay?: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface AgentConfig {
  type: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  authentication?: AuthConfig;
  options?: Record<string, any>;
}

export interface AuthConfig {
  type: 'api_key' | 'oauth' | 'local' | 'extension';
  credentials?: Record<string, string>;
  refreshToken?: string;
  expiresAt?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors: string[];
}

// ============================================================================
// Error Handling
// ============================================================================

export interface A2AError {
  code: string;
  message: string;
  category: ErrorCategory;
  retryable: boolean;
  details?: any;
  originalError?: any;
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  SYSTEM = 'system',
  SECURITY = 'security',
  CONFIGURATION = 'configuration',
  UNSUPPORTED = 'unsupported'
}

export class AdapterError extends Error {
  constructor(
    public code: string,
    message: string,
    public category: ErrorCategory,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'AdapterError';
  }

  toA2AError(): A2AError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      retryable: this.retryable,
      details: this.details,
      originalError: this
    };
  }
}

// ============================================================================
// Base Adapter Interface
// ============================================================================

export interface IAgentBackendAdapter {
  // Lifecycle management
  initialize(config: AgentConfig): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;
  isHealthy(): Promise<boolean>;

  // Core operations
  sendMessage(message: A2AMessage): Promise<A2AResponse>;
  streamResponse(message: A2AMessage): AsyncIterator<StreamChunk>;

  // Capabilities
  getCapabilities(): AgentCapabilities;
  supportsOperation(op: OperationType): boolean;
  supportsCapability(cap: AgentCapability): boolean;

  // Protocol translation
  translateRequest(a2aMsg: A2AMessage): any;
  translateResponse(nativeResp: any, requestId: string): A2AResponse;
  translateError(error: any): A2AError;

  // Configuration
  getConfig(): AgentConfig;
  updateConfig(config: Partial<AgentConfig>): Promise<void>;

  // Monitoring
  getMetrics(): AdapterMetrics;
  resetMetrics(): void;
}

export interface AdapterMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  tokensUsed: number;
  errors: { code: string; count: number }[];
  uptime: number;
  lastRequestAt?: number;
}

// ============================================================================
// Abstract Base Adapter
// ============================================================================

export abstract class BaseAgentAdapter extends EventEmitter implements IAgentBackendAdapter {
  protected config!: AgentConfig;
  protected initialized: boolean = false;
  protected metrics: AdapterMetrics;
  protected initializationTime: number = 0;

  constructor() {
    super();
    this.metrics = this.createDefaultMetrics();
  }

  // ========================================
  // Lifecycle Management
  // ========================================

  async initialize(config: AgentConfig): Promise<void> {
    if (this.initialized) {
      throw new AdapterError(
        'A2A-INIT-001',
        'Adapter already initialized',
        ErrorCategory.CONFIGURATION
      );
    }

    this.config = this.validateConfig(config);
    await this.doInitialize();
    this.initialized = true;
    this.initializationTime = Date.now();
    this.emit('initialized', { adapter: this.config.name });
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.doShutdown();
    this.initialized = false;
    this.emit('shutdown', { adapter: this.config.name });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }
    return this.doHealthCheck();
  }

  // ========================================
  // Core Operations
  // ========================================

  async sendMessage(message: A2AMessage): Promise<A2AResponse> {
    this.ensureInitialized();
    this.validateMessage(message);

    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const nativeRequest = this.translateRequest(message);
      const nativeResponse = await this.executeRequest(nativeRequest, message);
      const a2aResponse = this.translateResponse(nativeResponse, message.id);

      this.metrics.successfulRequests++;
      this.updateLatency(Date.now() - startTime);
      this.metrics.lastRequestAt = Date.now();

      if (a2aResponse.metadata.tokensUsed) {
        this.metrics.tokensUsed += a2aResponse.metadata.tokensUsed.total;
      }

      this.emit('response', { message, response: a2aResponse });
      return a2aResponse;
    } catch (error: any) {
      this.metrics.failedRequests++;
      const a2aError = this.translateError(error);
      this.trackError(a2aError.code);
      this.emit('error', { message, error: a2aError });

      throw new AdapterError(
        a2aError.code,
        a2aError.message,
        a2aError.category,
        a2aError.retryable,
        a2aError.details
      );
    }
  }

  async *streamResponse(message: A2AMessage): AsyncIterator<StreamChunk> {
    this.ensureInitialized();
    this.validateMessage(message);

    if (!this.supportsCapability(AgentCapability.STREAMING_RESPONSE)) {
      throw new AdapterError(
        'A2A-CAP-001',
        'Streaming not supported by this adapter',
        ErrorCategory.UNSUPPORTED
      );
    }

    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const nativeRequest = this.translateRequest(message);
      const stream = this.executeStreamRequest(nativeRequest, message);

      for await (const chunk of stream) {
        yield chunk;
      }

      this.metrics.successfulRequests++;
      this.updateLatency(Date.now() - startTime);
      this.metrics.lastRequestAt = Date.now();
    } catch (error: any) {
      this.metrics.failedRequests++;
      const a2aError = this.translateError(error);
      this.trackError(a2aError.code);

      yield {
        id: message.id,
        type: 'error',
        data: a2aError
      };
    }
  }

  // ========================================
  // Capabilities
  // ========================================

  abstract getCapabilities(): AgentCapabilities;

  supportsOperation(op: OperationType): boolean {
    return this.getCapabilities().operations.includes(op);
  }

  supportsCapability(cap: AgentCapability): boolean {
    return this.getCapabilities().supported.includes(cap);
  }

  // ========================================
  // Protocol Translation (Abstract)
  // ========================================

  abstract translateRequest(a2aMsg: A2AMessage): any;
  abstract translateResponse(nativeResp: any, requestId: string): A2AResponse;

  translateError(error: any): A2AError {
    if (error instanceof AdapterError) {
      return error.toA2AError();
    }

    return {
      code: 'A2A-UNK-001',
      message: error.message || 'Unknown error',
      category: ErrorCategory.SYSTEM,
      retryable: false,
      originalError: error
    };
  }

  // ========================================
  // Configuration
  // ========================================

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  async updateConfig(config: Partial<AgentConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.doConfigUpdate();
    this.emit('configUpdated', { config: this.config });
  }

  // ========================================
  // Monitoring
  // ========================================

  getMetrics(): AdapterMetrics {
    return {
      ...this.metrics,
      uptime: this.initialized ? Date.now() - this.initializationTime : 0
    };
  }

  resetMetrics(): void {
    this.metrics = this.createDefaultMetrics();
    this.emit('metricsReset');
  }

  // ========================================
  // Protected Abstract Methods
  // ========================================

  protected abstract doInitialize(): Promise<void>;
  protected abstract doShutdown(): Promise<void>;
  protected abstract doHealthCheck(): Promise<boolean>;
  protected abstract executeRequest(nativeRequest: any, message: A2AMessage): Promise<any>;
  protected abstract executeStreamRequest(nativeRequest: any, message: A2AMessage): AsyncIterator<StreamChunk>;

  protected async doConfigUpdate(): Promise<void> {
    // Override if needed
  }

  // ========================================
  // Protected Helper Methods
  // ========================================

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new AdapterError(
        'A2A-INIT-002',
        'Adapter not initialized',
        ErrorCategory.CONFIGURATION
      );
    }
  }

  protected validateConfig(config: AgentConfig): AgentConfig {
    if (!config.type) {
      throw new AdapterError(
        'A2A-CFG-001',
        'Adapter type is required',
        ErrorCategory.CONFIGURATION
      );
    }
    if (!config.name) {
      throw new AdapterError(
        'A2A-CFG-002',
        'Adapter name is required',
        ErrorCategory.CONFIGURATION
      );
    }
    return config;
  }

  protected validateMessage(message: A2AMessage): void {
    if (!message.id) {
      throw new AdapterError(
        'A2A-MSG-001',
        'Message ID is required',
        ErrorCategory.VALIDATION
      );
    }
    if (!message.operation) {
      throw new AdapterError(
        'A2A-MSG-002',
        'Message operation is required',
        ErrorCategory.VALIDATION
      );
    }
    if (!this.supportsOperation(message.operation)) {
      throw new AdapterError(
        'A2A-MSG-003',
        `Operation ${message.operation} not supported`,
        ErrorCategory.UNSUPPORTED
      );
    }
  }

  protected createDefaultMetrics(): AdapterMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      tokensUsed: 0,
      errors: [],
      uptime: 0
    };
  }

  protected updateLatency(latency: number): void {
    const total = this.metrics.totalRequests;
    const currentAvg = this.metrics.averageLatency;
    this.metrics.averageLatency = (currentAvg * (total - 1) + latency) / total;
  }

  protected trackError(code: string): void {
    const existing = this.metrics.errors.find(e => e.code === code);
    if (existing) {
      existing.count++;
    } else {
      this.metrics.errors.push({ code, count: 1 });
    }
  }

  protected getDefaultRetryPolicy(): RetryPolicy {
    return {
      maxRetries: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 10000,
      retryableErrors: ['RATE_LIMIT', 'NETWORK', 'TIMEOUT']
    };
  }

  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    policy?: RetryPolicy
  ): Promise<T> {
    const retryPolicy = policy || this.config.retryPolicy || this.getDefaultRetryPolicy();
    let lastError: any;
    let backoff = retryPolicy.backoffMs;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const a2aError = this.translateError(error);

        if (attempt === retryPolicy.maxRetries || !a2aError.retryable) {
          throw error;
        }

        await this.sleep(Math.min(backoff, retryPolicy.maxBackoffMs));
        backoff *= retryPolicy.backoffMultiplier;
      }
    }

    throw lastError;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isRetryableError(error: A2AError): boolean {
  return error.retryable && [
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT
  ].includes(error.category);
}
