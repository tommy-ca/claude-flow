/**
 * Protocol Translator for CLI Adapters
 *
 * Translates between A2A message format and CLI-specific formats (Codex, Cursor, Gemini).
 * Handles bidirectional conversion and streaming response parsing.
 *
 * @module protocol-translator
 */

import { A2AMessage, A2AResponse } from './base-cli-adapter';
import { AgentContext } from './context-builder';

/**
 * Codex-specific request format (OpenAI API)
 */
export interface CodexRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

/**
 * Codex-specific response format
 */
export interface CodexResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Cursor-specific request format
 */
export interface CursorRequest {
  task: string;
  context: {
    files?: string[];
    projectRoot: string;
    sessionId?: string;
  };
  features?: {
    lsp?: boolean;
    suggestions?: boolean;
    refactoring?: boolean;
  };
}

/**
 * Cursor-specific response format (JSON)
 */
export interface CursorResponse {
  id: string;
  sessionId?: string;
  response: string;
  fileChanges?: Array<{
    file: string;
    action: string;
    changes?: any;
  }>;
  suggestions?: string[];
  lsp?: any;
}

/**
 * Cursor streaming event (NDJSON)
 */
export interface CursorStreamEvent {
  type: 'system_init' | 'delta' | 'tool_call' | 'result' | 'file_change' | 'error';
  timestamp?: number;
  sessionId?: string;
  content?: string;
  tool?: string;
  args?: any;
  status?: string;
  summary?: string;
  file?: string;
  action?: string;
  changes?: any;
  message?: string;
  details?: any;
}

/**
 * Gemini-specific request format
 */
export interface GeminiRequest {
  contents: Array<{
    role: string;
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

/**
 * Gemini-specific response format (streaming)
 */
export interface GeminiStreamChunk {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Protocol translator for converting between A2A and CLI formats
 *
 * @example
 * ```typescript
 * const translator = new ProtocolTranslator();
 *
 * // Convert A2A message to Codex request
 * const codexReq = translator.a2aToCodex(message, {
 *   model: 'gpt-4',
 *   temperature: 0.7
 * });
 *
 * // Convert Codex response back to A2A
 * const a2aResp = translator.codexToA2A(codexResponse);
 * ```
 */
export class ProtocolTranslator {
  /**
   * Convert A2A message to Codex request format
   */
  public a2aToCodex(
    message: A2AMessage,
    config: {
      model: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      jsonMode?: boolean;
    }
  ): CodexRequest {
    const messages: CodexRequest['messages'] = [];

    // Add system prompt if provided
    if (config.systemPrompt) {
      messages.push({
        role: 'system',
        content: config.systemPrompt
      });
    }

    // Add user message
    messages.push({
      role: message.role,
      content: message.content
    });

    const request: CodexRequest = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens
    };

    if (config.jsonMode) {
      request.response_format = { type: 'json_object' };
    }

    return request;
  }

  /**
   * Convert Codex response to A2A response format
   */
  public codexToA2A(response: CodexResponse): A2AResponse {
    const choice = response.choices[0];

    return {
      id: response.id,
      role: choice.message.role,
      content: choice.message.content,
      metadata: {
        model: response.model,
        usage: response.usage,
        finishReason: choice.finish_reason,
        timestamp: response.created * 1000
      }
    };
  }

  /**
   * Convert A2A message to Cursor request format
   */
  public a2aToCursor(
    message: A2AMessage,
    context: AgentContext
  ): CursorRequest {
    return {
      task: message.content,
      context: {
        files: context.files.map(f => f.path),
        projectRoot: context.project.root,
        sessionId: message.metadata?.sessionId
      },
      features: {
        lsp: true,
        suggestions: true,
        refactoring: true
      }
    };
  }

  /**
   * Convert Cursor response to A2A response format
   */
  public cursorToA2A(response: CursorResponse): A2AResponse {
    return {
      id: response.id,
      role: 'assistant',
      content: response.response,
      metadata: {
        sessionId: response.sessionId,
        fileChanges: response.fileChanges || [],
        suggestions: response.suggestions || [],
        lspData: response.lsp
      }
    };
  }

  /**
   * Convert Cursor streaming events to A2A responses
   */
  public async *cursorStreamToA2A(
    stream: AsyncIterator<string>
  ): AsyncIterator<A2AResponse> {
    let content = '';
    let metadata: Record<string, any> = {};
    let sessionId: string | undefined;

    for await (const line of stream) {
      if (!line.trim()) continue;

      try {
        const event: CursorStreamEvent = JSON.parse(line);

        switch (event.type) {
          case 'system_init':
            if (event.sessionId) {
              sessionId = event.sessionId;
              metadata.sessionId = event.sessionId;
            }
            break;

          case 'delta':
            if (event.content) {
              content += event.content;

              // Yield incremental response
              yield {
                id: `cursor-${Date.now()}`,
                role: 'assistant',
                content,
                metadata: { ...metadata, streaming: true }
              };
            }
            break;

          case 'tool_call':
            metadata.toolCalls = metadata.toolCalls || [];
            metadata.toolCalls.push({
              tool: event.tool,
              args: event.args
            });
            break;

          case 'file_change':
            metadata.fileChanges = metadata.fileChanges || [];
            metadata.fileChanges.push({
              file: event.file,
              action: event.action,
              changes: event.changes
            });
            break;

          case 'result':
            metadata.status = event.status;
            metadata.summary = event.summary;

            // Final response
            yield {
              id: `cursor-${Date.now()}`,
              role: 'assistant',
              content,
              metadata: { ...metadata, streaming: false }
            };
            break;

          case 'error':
            throw new Error(event.message || 'Cursor error');
        }
      } catch (error) {
        // Skip invalid JSON lines
        continue;
      }
    }
  }

  /**
   * Convert A2A message to Gemini request format
   */
  public a2aToGemini(
    message: A2AMessage,
    config: {
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
      safetySettings?: Array<{ category: string; threshold: string }>;
    }
  ): GeminiRequest {
    const parts: GeminiRequest['contents'][0]['parts'] = [
      { text: message.content }
    ];

    // Add multi-modal attachments if present
    if (message.metadata?.attachments) {
      for (const attachment of message.metadata.attachments) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64Data
          }
        });
      }
    }

    return {
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        temperature: config.temperature,
        topP: config.topP,
        topK: config.topK,
        maxOutputTokens: config.maxOutputTokens
      },
      safetySettings: config.safetySettings
    };
  }

  /**
   * Convert Gemini response to A2A response format
   */
  public geminiToA2A(chunks: GeminiStreamChunk[]): A2AResponse {
    let content = '';
    let metadata: Record<string, any> = {};

    for (const chunk of chunks) {
      // Accumulate text content
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) {
            content += part.text;
          }
        }
      }

      // Capture metadata from last chunk
      if (chunk.usageMetadata) {
        metadata.usage = chunk.usageMetadata;
      }
      if (chunk.candidates?.[0]?.finishReason) {
        metadata.finishReason = chunk.candidates[0].finishReason;
      }
      if (chunk.candidates?.[0]?.safetyRatings) {
        metadata.safetyRatings = chunk.candidates[0].safetyRatings;
      }
    }

    return {
      id: `gemini-${Date.now()}`,
      role: 'assistant',
      content,
      metadata
    };
  }

  /**
   * Convert Gemini streaming chunks to A2A responses
   */
  public async *geminiStreamToA2A(
    stream: AsyncIterator<string>
  ): AsyncIterator<A2AResponse> {
    let content = '';
    let metadata: Record<string, any> = {};

    for await (const line of stream) {
      if (!line.trim()) continue;

      try {
        const chunk: GeminiStreamChunk = JSON.parse(line);

        // Accumulate content
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.text) {
              content += part.text;

              // Yield incremental response
              yield {
                id: `gemini-${Date.now()}`,
                role: 'assistant',
                content,
                metadata: { ...metadata, streaming: true }
              };
            }
          }
        }

        // Update metadata
        if (chunk.usageMetadata) {
          metadata.usage = chunk.usageMetadata;
        }
        if (chunk.candidates?.[0]?.finishReason) {
          metadata.finishReason = chunk.candidates[0].finishReason;

          // Final response
          yield {
            id: `gemini-${Date.now()}`,
            role: 'assistant',
            content,
            metadata: { ...metadata, streaming: false }
          };
        }
        if (chunk.candidates?.[0]?.safetyRatings) {
          metadata.safetyRatings = chunk.candidates[0].safetyRatings;
        }
      } catch (error) {
        // Skip invalid JSON lines
        continue;
      }
    }
  }

  /**
   * Detect CLI type from response format
   */
  public detectCLIType(response: string): 'codex' | 'cursor' | 'gemini' | 'unknown' {
    try {
      const parsed = JSON.parse(response);

      // Codex: has 'choices' and 'usage'
      if (parsed.choices && parsed.usage) {
        return 'codex';
      }

      // Cursor: has 'sessionId' or 'fileChanges'
      if (parsed.sessionId || parsed.fileChanges) {
        return 'cursor';
      }

      // Gemini: has 'candidates' or 'usageMetadata'
      if (parsed.candidates || parsed.usageMetadata) {
        return 'gemini';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

/**
 * Create a protocol translator instance
 */
export function createProtocolTranslator(): ProtocolTranslator {
  return new ProtocolTranslator();
}
