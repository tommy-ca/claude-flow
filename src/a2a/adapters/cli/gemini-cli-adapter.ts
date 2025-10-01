/**
 * Gemini CLI Adapter for Google Gemini
 *
 * Integrates with Google's Gemini CLI for multi-modal AI capabilities with streaming support.
 * Command structure: `gemini-cli --model gemini-pro --prompt "description" [options]`
 *
 * @module gemini-cli-adapter
 */

import { ChildProcess, spawn } from 'child_process';
import {
  CLIAdapter,
  CLIAdapterConfig,
  ContextStrategy,
  A2AMessage,
  A2AResponse,
  CLIOutput,
  CLIError
} from './base-cli-adapter';

/**
 * Configuration for Gemini CLI
 */
export interface GeminiCLIConfig extends CLIAdapterConfig {
  /** Google API key */
  apiKey: string;

  /** Gemini model (default: "gemini-pro") */
  model?: string;

  /** Enable multi-modal features (images, video) */
  multiModal?: boolean;

  /** Safety settings */
  safetySettings?: {
    harmCategory: string;
    threshold: string;
  }[];

  /** Generation config */
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };

  /** Enable streaming responses */
  stream?: boolean;
}

/**
 * Adapter for Google Gemini CLI
 *
 * Command structure:
 * ```bash
 * gemini-cli \
 *   --model gemini-pro \
 *   --prompt "Explain this code" \
 *   --stream \
 *   --output-format json
 * ```
 *
 * @example
 * ```typescript
 * const adapter = new GeminiCLIAdapter({
 *   apiKey: process.env.GOOGLE_API_KEY!,
 *   command: 'gemini-cli',
 *   model: 'gemini-pro',
 *   stream: true,
 *   generationConfig: {
 *     temperature: 0.7,
 *     maxOutputTokens: 2048
 *   }
 * });
 *
 * const response = await adapter.executeSync({
 *   role: 'user',
 *   content: 'Explain how async/await works in JavaScript'
 * });
 *
 * console.log(response.content);
 * console.log('Tokens used:', response.metadata?.usage);
 * await adapter.cleanup();
 * ```
 */
export class GeminiCLIAdapter extends CLIAdapter {
  private geminiConfig: Required<GeminiCLIConfig>;

  constructor(config: GeminiCLIConfig) {
    super({
      ...config,
      command: config.command || 'gemini-cli',
      environment: {
        GOOGLE_API_KEY: config.apiKey,
        ...config.environment
      }
    });

    this.geminiConfig = {
      ...config,
      command: config.command || 'gemini-cli',
      model: config.model || 'gemini-pro',
      multiModal: config.multiModal || false,
      stream: config.stream ?? true,
      safetySettings: config.safetySettings || [],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
        ...config.generationConfig
      }
    };
  }

  protected getCommand(): string {
    return this.geminiConfig.command;
  }

  protected getArgs(message: A2AMessage): string[] {
    const args = [
      '--model', this.geminiConfig.model,
      '--output-format', 'json'
    ];

    // Enable streaming for real-time feedback
    if (this.geminiConfig.stream) {
      args.push('--stream');
    }

    // Add generation config
    const genConfig = this.geminiConfig.generationConfig;
    args.push('--temperature', genConfig.temperature!.toString());
    args.push('--top-p', genConfig.topP!.toString());
    args.push('--top-k', genConfig.topK!.toString());
    args.push('--max-tokens', genConfig.maxOutputTokens!.toString());

    // Add safety settings
    for (const setting of this.geminiConfig.safetySettings) {
      args.push('--safety', `${setting.harmCategory}:${setting.threshold}`);
    }

    // Multi-modal support
    if (this.geminiConfig.multiModal && message.metadata?.attachments) {
      for (const attachment of message.metadata.attachments) {
        args.push('--file', attachment.path);
      }
    }

    // Short prompts can go in args, long ones in stdin
    if (message.content.length < 1000) {
      args.push('--prompt', message.content);
    }

    return args;
  }

  protected selectContextStrategy(message: A2AMessage): ContextStrategy {
    // Gemini has excellent stdin support
    if (message.metadata?.attachments?.length > 0) {
      // Use hybrid for multi-modal: files via args, text via stdin
      return ContextStrategy.HYBRID;
    }

    // Use stdin for large prompts
    if (message.content.length > 1000) {
      return ContextStrategy.STDIN;
    }

    return ContextStrategy.ARGS;
  }

  protected formatInput(message: A2AMessage, strategy: ContextStrategy): string {
    const input = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: message.content }
          ]
        }
      ]
    };

    // Add multi-modal parts
    if (message.metadata?.attachments) {
      for (const attachment of message.metadata.attachments) {
        input.contents[0].parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64Data
          }
        } as any);
      }
    }

    return JSON.stringify(input);
  }

  protected parseOutput(output: CLIOutput): A2AResponse {
    try {
      // Gemini CLI streams JSON lines
      const lines = output.stdout.trim().split('\n');
      let fullContent = '';
      let metadata: any = {
        model: this.geminiConfig.model,
        executionTime: output.executionTime,
        pid: output.pid
      };

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line);

          // Accumulate content from streaming chunks
          if (parsed.candidates?.[0]?.content?.parts) {
            for (const part of parsed.candidates[0].content.parts) {
              if (part.text) {
                fullContent += part.text;
              }
            }
          }

          // Capture metadata from final chunk
          if (parsed.usageMetadata) {
            metadata.usage = parsed.usageMetadata;
          }
          if (parsed.candidates?.[0]?.finishReason) {
            metadata.finishReason = parsed.candidates[0].finishReason;
          }
          if (parsed.candidates?.[0]?.safetyRatings) {
            metadata.safetyRatings = parsed.candidates[0].safetyRatings;
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }

      return {
        id: `gemini-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        metadata
      };
    } catch (error) {
      // Try parsing as single JSON object
      try {
        const parsed = JSON.parse(output.stdout);

        return {
          id: `gemini-${Date.now()}`,
          role: 'assistant',
          content: parsed.response || parsed.text || '',
          metadata: {
            model: parsed.model || this.geminiConfig.model,
            usage: parsed.usageMetadata,
            executionTime: output.executionTime,
            pid: output.pid
          }
        };
      } catch {
        throw new CLIError(
          `Failed to parse Gemini output: ${(error as Error).message}`,
          'PARSE_ERROR',
          output.exitCode,
          output.stderr
        );
      }
    }
  }

  protected getEnvironment(): Record<string, string> {
    return {
      GOOGLE_API_KEY: this.geminiConfig.apiKey
    };
  }

  protected async spawnProcess(args: string[]): Promise<ChildProcess> {
    return spawn(this.getCommand(), args, {
      env: this.buildEnvironment(this.getEnvironment()),
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: this.config.shell
    });
  }

  /**
   * Override receive to handle streaming JSON lines
   */
  protected async *receive(process: ChildProcess): AsyncIterator<string> {
    const stdout = process.stdout;
    if (!stdout) {
      throw new CLIError('Process stdout not available', 'NO_STDOUT');
    }

    let buffer = '';

    // Use async iterator for stdout
    for await (const chunk of stdout) {
      buffer += chunk.toString('utf-8');

      // Split by newlines and yield complete JSON objects
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          yield line;
          this.emit('chunk', line, 'stdout');
        }
      }
    }

    // Yield remaining buffer
    if (buffer.trim()) {
      yield buffer;
    }
  }
}

/**
 * Factory function for creating Gemini CLI adapter
 *
 * @param config - Configuration options
 * @returns Configured Gemini CLI adapter
 *
 * @example
 * ```typescript
 * const adapter = createGeminiAdapter({
 *   apiKey: process.env.GOOGLE_API_KEY!,
 *   model: 'gemini-pro',
 *   stream: true
 * });
 * ```
 */
export function createGeminiAdapter(config: GeminiCLIConfig): GeminiCLIAdapter {
  return new GeminiCLIAdapter(config);
}
