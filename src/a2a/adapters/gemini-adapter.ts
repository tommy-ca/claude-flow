/**
 * Google Gemini Adapter
 * Integrates Google's Gemini AI models for research and code generation
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
// Gemini-Specific Types
// ============================================================================

export interface GeminiConfig extends AgentConfig {
  type: 'google';
  apiKey: string;
  model: string;
  baseUrl?: string;
  safetySettings?: SafetySetting[];
  generationConfig?: GenerationConfig;
}

interface SafetySetting {
  category: string;
  threshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH';
}

interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  safetySettings?: SafetySetting[];
  generationConfig?: GenerationConfig;
  tools?: any[];
}

interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
    citationMetadata?: any;
  }>;
  promptFeedback?: {
    safetyRatings: any[];
    blockReason?: string;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ============================================================================
// Gemini Adapter Implementation
// ============================================================================

export class GeminiAdapter extends BaseAgentAdapter {
  private apiKey!: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private model!: string;
  private safetySettings: SafetySetting[];
  private generationConfig?: GenerationConfig;
  private conversationHistory: Map<string, GeminiContent[]> = new Map();

  constructor() {
    super();
    // Default safety settings - allow most content for code generation
    this.safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ];
  }

  // ========================================
  // Lifecycle
  // ========================================

  protected async doInitialize(): Promise<void> {
    const config = this.config as GeminiConfig;

    if (!config.apiKey) {
      throw new AdapterError(
        'GEMINI-CFG-001',
        'Google AI API key is required',
        ErrorCategory.CONFIGURATION
      );
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-pro';
    this.baseUrl = config.baseUrl || this.baseUrl;

    if (config.safetySettings) {
      this.safetySettings = config.safetySettings;
    }

    if (config.generationConfig) {
      this.generationConfig = config.generationConfig;
    }

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
    const response = await fetch(
      `${this.baseUrl}/models?key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new AdapterError(
        'GEMINI-AUTH-001',
        'Failed to authenticate with Google AI API',
        ErrorCategory.AUTHENTICATION
      );
    }
  }

  // ========================================
  // Capabilities
  // ========================================

  getCapabilities(): AgentCapabilities {
    const isProVision = this.model.includes('vision');
    const isPro = this.model.includes('pro');

    const capabilities: AgentCapability[] = [
      AgentCapability.CODE_GENERATION,
      AgentCapability.CODE_EDITING,
      AgentCapability.CODE_REVIEW,
      AgentCapability.CODE_EXPLANATION,
      AgentCapability.TEST_GENERATION,
      AgentCapability.CHAT_INTERFACE,
      AgentCapability.STREAMING_RESPONSE,
      AgentCapability.MULTI_FILE_CONTEXT
    ];

    if (isProVision) {
      capabilities.push(AgentCapability.MULTI_MODAL);
    }

    return {
      supported: capabilities,
      operations: [
        'code.generate',
        'code.edit',
        'code.review',
        'code.explain',
        'code.test',
        'chat.send',
        'context.gather'
      ],
      limitations: {
        maxContextSize: this.getContextWindow(),
        maxTokens: this.getMaxOutputTokens(),
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerDay: isPro ? 1500 : 50
        }
      },
      metadata: {
        version: '1.0.0',
        model: this.model,
        provider: 'google'
      }
    };
  }

  private getContextWindow(): number {
    const contextWindows: Record<string, number> = {
      'gemini-pro': 32768,
      'gemini-pro-vision': 16384,
      'gemini-1.5-pro': 1048576,
      'gemini-1.5-flash': 1048576
    };
    return contextWindows[this.model] || 32768;
  }

  private getMaxOutputTokens(): number {
    return this.generationConfig?.maxOutputTokens || 8192;
  }

  // ========================================
  // Request Execution
  // ========================================

  protected async executeRequest(nativeRequest: GeminiRequest, message: A2AMessage): Promise<any> {
    return this.retryWithBackoff(async () => {
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nativeRequest)
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return response.json();
    });
  }

  protected async *executeStreamRequest(
    nativeRequest: GeminiRequest,
    message: A2AMessage
  ): AsyncIterator<StreamChunk> {
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nativeRequest)
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

            try {
              const chunk = JSON.parse(data);

              if (chunk.candidates && chunk.candidates[0]) {
                const candidate = chunk.candidates[0];
                const text = candidate.content?.parts?.[0]?.text;

                if (text) {
                  yield {
                    id: message.id,
                    type: 'delta',
                    data: {
                      content: text,
                      role: 'model'
                    },
                    metadata: {
                      finishReason: candidate.finishReason,
                      safetyRatings: candidate.safetyRatings
                    }
                  };
                }

                if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                  yield {
                    id: message.id,
                    type: 'error',
                    data: {
                      code: 'GEMINI-SAFETY-001',
                      message: `Content generation stopped: ${candidate.finishReason}`,
                      finishReason: candidate.finishReason
                    }
                  };
                  return;
                }
              }
            } catch (error) {
              // Skip invalid JSON
            }
          }
        }
      }

      yield {
        id: message.id,
        type: 'complete',
        data: null
      };
    } finally {
      reader.releaseLock();
    }
  }

  // ========================================
  // Protocol Translation
  // ========================================

  translateRequest(a2aMsg: A2AMessage): GeminiRequest {
    const config = this.config as GeminiConfig;
    const contents = this.buildContents(a2aMsg);

    const request: GeminiRequest = {
      contents,
      safetySettings: this.safetySettings,
      generationConfig: {
        temperature: a2aMsg.metadata.temperature ?? this.generationConfig?.temperature ?? 0.7,
        maxOutputTokens: a2aMsg.metadata.maxTokens ?? this.generationConfig?.maxOutputTokens,
        topP: this.generationConfig?.topP,
        topK: this.generationConfig?.topK,
        stopSequences: this.generationConfig?.stopSequences
      }
    };

    return request;
  }

  translateResponse(nativeResp: GeminiResponse, requestId: string): A2AResponse {
    // Check for prompt blocking
    if (nativeResp.promptFeedback?.blockReason) {
      throw new AdapterError(
        'GEMINI-SAFETY-001',
        `Content blocked: ${nativeResp.promptFeedback.blockReason}`,
        ErrorCategory.SECURITY,
        false,
        { safetyRatings: nativeResp.promptFeedback.safetyRatings }
      );
    }

    const candidate = nativeResp.candidates[0];
    if (!candidate) {
      throw new AdapterError(
        'GEMINI-RESP-001',
        'No response candidate generated',
        ErrorCategory.SYSTEM
      );
    }

    // Check finish reason
    if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      throw new AdapterError(
        'GEMINI-SAFETY-002',
        `Content generation stopped: ${candidate.finishReason}`,
        ErrorCategory.SECURITY,
        false,
        { finishReason: candidate.finishReason, safetyRatings: candidate.safetyRatings }
      );
    }

    const content = candidate.content;
    const text = content.parts.map(p => p.text).join('');

    // Store in conversation history if needed
    if (this.config.options?.maintainHistory) {
      const history = this.conversationHistory.get(requestId) || [];
      history.push(content);
      this.conversationHistory.set(requestId, history);
    }

    return {
      id: `gemini_${Date.now()}`,
      messageId: requestId,
      status: 'success',
      payload: {
        content: text,
        role: content.role,
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings,
        citationMetadata: candidate.citationMetadata
      },
      metadata: {
        timestamp: Date.now(),
        duration: 0,
        tokensUsed: nativeResp.usageMetadata ? {
          prompt: nativeResp.usageMetadata.promptTokenCount,
          completion: nativeResp.usageMetadata.candidatesTokenCount,
          total: nativeResp.usageMetadata.totalTokenCount
        } : undefined,
        model: this.model
      }
    };
  }

  translateError(error: any): A2AError {
    if (error instanceof AdapterError) {
      return error.toA2AError();
    }

    // Gemini-specific error handling
    if (error.status) {
      switch (error.status) {
        case 400:
          return {
            code: 'GEMINI-VAL-001',
            message: error.message || 'Invalid request',
            category: ErrorCategory.VALIDATION,
            retryable: false
          };
        case 403:
          return {
            code: 'GEMINI-AUTH-001',
            message: 'Invalid API key or permissions',
            category: ErrorCategory.AUTHENTICATION,
            retryable: false
          };
        case 429:
          return {
            code: 'GEMINI-RL-001',
            message: 'Rate limit exceeded',
            category: ErrorCategory.RATE_LIMIT,
            retryable: true
          };
        case 500:
        case 503:
          return {
            code: 'GEMINI-SYS-001',
            message: 'Google AI service error',
            category: ErrorCategory.SYSTEM,
            retryable: true
          };
      }
    }

    return super.translateError(error);
  }

  // ========================================
  // Helper Methods
  // ========================================

  private buildContents(a2aMsg: A2AMessage): GeminiContent[] {
    const contents: GeminiContent[] = [];

    // Add conversation history if maintained
    const conversationId = a2aMsg.context?.conversationId || a2aMsg.id;
    const history = this.conversationHistory.get(conversationId) || [];
    contents.push(...history);

    // Build user message with context
    const userParts: GeminiPart[] = [];

    // Add system instructions as part of user message
    const systemPrompt = this.getSystemPrompt(a2aMsg.operation);
    if (systemPrompt) {
      userParts.push({ text: `${systemPrompt}\n\n` });
    }

    // Add file context
    if (a2aMsg.context?.fileContext) {
      const contextText = this.formatFileContext(a2aMsg.context.fileContext);
      userParts.push({ text: `File Context:\n${contextText}\n\n` });
    }

    // Add git context
    if (a2aMsg.context?.gitContext) {
      const gitText = this.formatGitContext(a2aMsg.context.gitContext);
      userParts.push({ text: `Git Context:\n${gitText}\n\n` });
    }

    // Add main payload
    const mainText = this.formatPayload(a2aMsg.payload);
    userParts.push({ text: mainText });

    contents.push({
      role: 'user',
      parts: userParts
    });

    return contents;
  }

  private getSystemPrompt(operation: OperationType): string {
    const prompts: Record<string, string> = {
      'code.generate': 'You are an expert software engineer. Generate clean, efficient, well-documented code with proper error handling and best practices.',
      'code.edit': 'You are an expert code editor. Make precise, minimal changes while maintaining code quality and style.',
      'code.review': 'You are an expert code reviewer. Analyze code for bugs, security issues, performance problems, and suggest improvements.',
      'code.refactor': 'You are an expert at refactoring. Improve code structure, readability, and maintainability while preserving functionality.',
      'code.explain': 'You are an expert at explaining code. Provide clear, comprehensive explanations of how code works and why it was written that way.',
      'code.test': 'You are an expert at writing tests. Create comprehensive, maintainable test suites with good coverage and edge case handling.'
    };

    return prompts[operation] || 'You are a helpful coding assistant with expertise in software development.';
  }

  private formatFileContext(fileContext: any[]): string {
    return fileContext
      .map(file => {
        let content = `File: ${file.path}`;
        if (file.language) content += ` (${file.language})`;
        if (file.relevance) content += ` [Relevance: ${(file.relevance * 100).toFixed(0)}%]`;
        content += '\n```\n';
        if (file.content) {
          content += file.content;
        }
        content += '\n```';
        return content;
      })
      .join('\n\n');
  }

  private formatGitContext(gitContext: any): string {
    let text = `Branch: ${gitContext.branch}\n`;
    if (gitContext.commit) text += `Commit: ${gitContext.commit}\n`;
    if (gitContext.repository) text += `Repository: ${gitContext.repository}\n`;
    if (gitContext.uncommittedChanges) text += `Status: Uncommitted changes present\n`;
    if (gitContext.changedFiles?.length) {
      text += `Changed Files:\n${gitContext.changedFiles.map((f: string) => `  - ${f}`).join('\n')}`;
    }
    return text;
  }

  private formatPayload(payload: any): string {
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload.prompt) {
      return payload.prompt;
    }
    if (payload.instruction) {
      return payload.instruction;
    }
    return JSON.stringify(payload, null, 2);
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
      code: errorData.error?.code,
      details: errorData.error?.details
    };
  }
}

// ============================================================================
// Configuration Examples
// ============================================================================

export const GEMINI_CONFIG_EXAMPLES = {
  pro: {
    type: 'google' as const,
    name: 'gemini-pro',
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    model: 'gemini-pro',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  },
  proVision: {
    type: 'google' as const,
    name: 'gemini-pro-vision',
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    model: 'gemini-pro-vision',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  },
  flash: {
    type: 'google' as const,
    name: 'gemini-1.5-flash',
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  }
};
