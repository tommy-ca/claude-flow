/**
 * OpenAI Codex Adapter
 * Integrates OpenAI's GPT models for code generation and chat
 */

import {
  BaseAgentAdapter,
  A2AMessage,
  A2AResponse,
  StreamChunk,
  AgentCapabilities,
  AgentCapability,
  OperationType,
  AgentConfig,
  AdapterError,
  ErrorCategory,
  A2AError,
  TokenUsage
} from './base-adapter';

// ============================================================================
// OpenAI-Specific Types
// ============================================================================

export interface OpenAIConfig extends AgentConfig {
  type: 'openai';
  apiKey: string;
  model: string;
  organization?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
}

interface OpenAIFunction {
  name: string;
  description: string;
  parameters: any;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  functions?: OpenAIFunction[];
  function_call?: 'auto' | 'none' | { name: string };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  n?: number;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Codex Adapter Implementation
// ============================================================================

export class CodexAdapter extends BaseAgentAdapter {
  private apiKey!: string;
  private baseUrl: string = 'https://api.openai.com/v1';
  private model!: string;
  private organization?: string;
  private conversationHistory: Map<string, OpenAIMessage[]> = new Map();

  // ========================================
  // Lifecycle
  // ========================================

  protected async doInitialize(): Promise<void> {
    const config = this.config as OpenAIConfig;

    if (!config.apiKey) {
      throw new AdapterError(
        'CODEX-CFG-001',
        'OpenAI API key is required',
        ErrorCategory.CONFIGURATION
      );
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4';
    this.organization = config.organization;
    this.baseUrl = config.baseUrl || this.baseUrl;

    // Test connection
    await this.testConnection();
  }

  protected async doShutdown(): Promise<void> {
    this.conversationHistory.clear();
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      await this.testConnection();
      return true;
    } catch {
      return false;
    }
  }

  private async testConnection(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new AdapterError(
        'CODEX-AUTH-001',
        'Failed to authenticate with OpenAI API',
        ErrorCategory.AUTHENTICATION
      );
    }
  }

  // ========================================
  // Capabilities
  // ========================================

  getCapabilities(): AgentCapabilities {
    return {
      supported: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.CODE_REVIEW,
        AgentCapability.CODE_REFACTORING,
        AgentCapability.CODE_EXPLANATION,
        AgentCapability.TEST_GENERATION,
        AgentCapability.CHAT_INTERFACE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.FUNCTION_CALLING,
        AgentCapability.MULTI_FILE_CONTEXT
      ],
      operations: [
        'code.generate',
        'code.edit',
        'code.review',
        'code.refactor',
        'code.explain',
        'code.test',
        'chat.send',
        'context.gather'
      ],
      limitations: {
        maxContextSize: this.getContextWindow(),
        maxTokens: this.config.options?.maxTokens || 4096,
        rateLimit: {
          requestsPerMinute: 3500,
          tokensPerMinute: 90000
        }
      },
      metadata: {
        version: '1.0.0',
        model: this.model,
        provider: 'openai'
      }
    };
  }

  private getContextWindow(): number {
    const contextWindows: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-3.5-turbo': 16385,
      'gpt-3.5-turbo-16k': 16385
    };
    return contextWindows[this.model] || 8192;
  }

  // ========================================
  // Request Execution
  // ========================================

  protected async executeRequest(nativeRequest: OpenAIChatRequest, message: A2AMessage): Promise<any> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(nativeRequest)
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return response.json();
    });
  }

  protected async *executeStreamRequest(
    nativeRequest: OpenAIChatRequest,
    message: A2AMessage
  ): AsyncIterator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...nativeRequest, stream: true })
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield {
                id: message.id,
                type: 'complete',
                data: null
              };
              return;
            }

            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices[0]?.delta;

              if (delta?.content) {
                yield {
                  id: message.id,
                  type: 'delta',
                  data: {
                    content: delta.content,
                    role: delta.role
                  },
                  metadata: {
                    model: chunk.model,
                    finishReason: chunk.choices[0]?.finish_reason
                  }
                };
              }
            } catch (error) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ========================================
  // Protocol Translation
  // ========================================

  translateRequest(a2aMsg: A2AMessage): OpenAIChatRequest {
    const config = this.config as OpenAIConfig;
    const messages = this.buildMessages(a2aMsg);
    const functions = this.buildFunctions(a2aMsg);

    const request: OpenAIChatRequest = {
      model: this.model,
      messages,
      temperature: a2aMsg.metadata.temperature ?? config.temperature ?? 0.7,
      max_tokens: a2aMsg.metadata.maxTokens ?? config.maxTokens,
      stream: a2aMsg.metadata.streaming ?? false
    };

    if (functions.length > 0) {
      request.functions = functions;
      request.function_call = 'auto';
    }

    return request;
  }

  translateResponse(nativeResp: OpenAIChatResponse, requestId: string): A2AResponse {
    const choice = nativeResp.choices[0];
    const message = choice.message;

    // Store in conversation history if needed
    if (this.config.options?.maintainHistory) {
      const history = this.conversationHistory.get(requestId) || [];
      history.push(message);
      this.conversationHistory.set(requestId, history);
    }

    return {
      id: nativeResp.id,
      messageId: requestId,
      status: 'success',
      payload: {
        content: message.content,
        role: message.role,
        functionCall: message.function_call,
        finishReason: choice.finish_reason
      },
      metadata: {
        timestamp: Date.now(),
        duration: 0,
        tokensUsed: this.convertTokenUsage(nativeResp.usage),
        model: nativeResp.model
      }
    };
  }

  translateError(error: any): A2AError {
    if (error instanceof AdapterError) {
      return error.toA2AError();
    }

    // OpenAI-specific error handling
    if (error.status) {
      switch (error.status) {
        case 401:
          return {
            code: 'CODEX-AUTH-001',
            message: 'Invalid API key',
            category: ErrorCategory.AUTHENTICATION,
            retryable: false
          };
        case 429:
          return {
            code: 'CODEX-RL-001',
            message: 'Rate limit exceeded',
            category: ErrorCategory.RATE_LIMIT,
            retryable: true
          };
        case 500:
        case 502:
        case 503:
          return {
            code: 'CODEX-SYS-001',
            message: 'OpenAI service error',
            category: ErrorCategory.SYSTEM,
            retryable: true
          };
        case 400:
          return {
            code: 'CODEX-VAL-001',
            message: error.message || 'Invalid request',
            category: ErrorCategory.VALIDATION,
            retryable: false
          };
      }
    }

    return super.translateError(error);
  }

  // ========================================
  // Helper Methods
  // ========================================

  private buildMessages(a2aMsg: A2AMessage): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // System message for operation context
    const systemPrompt = this.getSystemPrompt(a2aMsg.operation);
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add file context if available
    if (a2aMsg.context?.fileContext) {
      const contextContent = this.formatFileContext(a2aMsg.context.fileContext);
      messages.push({
        role: 'system',
        content: `File Context:\n${contextContent}`
      });
    }

    // Add conversation history if maintained
    const conversationId = a2aMsg.context?.conversationId || a2aMsg.id;
    const history = this.conversationHistory.get(conversationId) || [];
    messages.push(...history);

    // Add user message
    messages.push({
      role: 'user',
      content: this.formatUserMessage(a2aMsg)
    });

    return messages;
  }

  private buildFunctions(a2aMsg: A2AMessage): OpenAIFunction[] {
    const functions: OpenAIFunction[] = [];

    // Add operation-specific functions
    switch (a2aMsg.operation) {
      case 'code.edit':
        functions.push({
          name: 'edit_code',
          description: 'Edit code with specified changes',
          parameters: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path to file' },
              changes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    start_line: { type: 'number' },
                    end_line: { type: 'number' },
                    new_content: { type: 'string' }
                  }
                }
              }
            },
            required: ['file_path', 'changes']
          }
        });
        break;

      case 'file.write':
        functions.push({
          name: 'write_file',
          description: 'Write content to a file',
          parameters: {
            type: 'object',
            properties: {
              file_path: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['file_path', 'content']
          }
        });
        break;
    }

    return functions;
  }

  private getSystemPrompt(operation: OperationType): string {
    const prompts: Record<string, string> = {
      'code.generate': 'You are an expert software engineer. Generate clean, efficient, and well-documented code.',
      'code.edit': 'You are an expert code editor. Make precise, minimal changes to achieve the desired outcome.',
      'code.review': 'You are an expert code reviewer. Provide constructive feedback on code quality, bugs, and improvements.',
      'code.refactor': 'You are an expert at refactoring. Improve code structure while maintaining functionality.',
      'code.explain': 'You are an expert at explaining code. Provide clear, comprehensive explanations.',
      'code.test': 'You are an expert at writing tests. Create comprehensive, maintainable test suites.'
    };

    return prompts[operation] || 'You are a helpful coding assistant.';
  }

  private formatFileContext(fileContext: any[]): string {
    return fileContext
      .map(file => {
        let content = `\n// File: ${file.path}`;
        if (file.language) content += ` (${file.language})`;
        content += '\n';
        if (file.content) {
          content += file.content;
        }
        return content;
      })
      .join('\n\n');
  }

  private formatUserMessage(a2aMsg: A2AMessage): string {
    let message = '';

    // Add git context if available
    if (a2aMsg.context?.gitContext) {
      const git = a2aMsg.context.gitContext;
      message += `Git Context:\n`;
      message += `- Branch: ${git.branch}\n`;
      if (git.commit) message += `- Commit: ${git.commit}\n`;
      if (git.uncommittedChanges) message += `- Uncommitted changes present\n`;
      message += '\n';
    }

    // Add main payload
    if (typeof a2aMsg.payload === 'string') {
      message += a2aMsg.payload;
    } else if (a2aMsg.payload.prompt) {
      message += a2aMsg.payload.prompt;
    } else {
      message += JSON.stringify(a2aMsg.payload, null, 2);
    }

    return message;
  }

  private convertTokenUsage(usage: any): TokenUsage {
    return {
      prompt: usage.prompt_tokens,
      completion: usage.completion_tokens,
      total: usage.total_tokens
    };
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    return headers;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    throw {
      status: response.status,
      message: errorData.error?.message || errorData.message || 'Unknown error',
      type: errorData.error?.type,
      code: errorData.error?.code
    };
  }
}

// ============================================================================
// Configuration Examples
// ============================================================================

export const CODEX_CONFIG_EXAMPLES = {
  gpt4: {
    type: 'openai' as const,
    name: 'gpt4-codex',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048
  },
  gpt4Turbo: {
    type: 'openai' as const,
    name: 'gpt4-turbo-codex',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 4096
  },
  gpt35: {
    type: 'openai' as const,
    name: 'gpt35-codex',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048
  }
};
