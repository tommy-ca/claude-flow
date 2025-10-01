/**
 * Codex CLI Adapter for OpenAI Codex
 *
 * Integrates with OpenAI's CLI for code generation and completion tasks.
 * Command structure: `openai api chat.completions.create -m gpt-4 [options]`
 *
 * @module codex-cli-adapter
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
 * Configuration specific to Codex CLI
 */
export interface CodexCLIConfig extends CLIAdapterConfig {
  /** OpenAI API key */
  apiKey: string;

  /** Model to use (default: "gpt-4") */
  model?: string;

  /** Temperature setting (0-2) */
  temperature?: number;

  /** Maximum tokens in response */
  maxTokens?: number;

  /** System prompt */
  systemPrompt?: string;

  /** Whether to use JSON mode */
  jsonMode?: boolean;
}

/**
 * Adapter for OpenAI CLI (codex-cli)
 *
 * Command structure:
 * ```bash
 * openai api chat.completions.create \
 *   -m gpt-4 \
 *   -g system "You are a coding assistant" \
 *   -g user "Write a function to sort an array"
 * ```
 *
 * @example
 * ```typescript
 * const adapter = new CodexCLIAdapter({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   command: 'openai',
 *   model: 'gpt-4',
 *   temperature: 0.7,
 *   systemPrompt: 'You are an expert TypeScript developer.'
 * });
 *
 * const response = await adapter.executeSync({
 *   role: 'user',
 *   content: 'Write a function to calculate fibonacci numbers'
 * });
 *
 * console.log(response.content);
 * await adapter.cleanup();
 * ```
 */
export class CodexCLIAdapter extends CLIAdapter {
  private codexConfig: Required<CodexCLIConfig>;

  constructor(config: CodexCLIConfig) {
    super({
      ...config,
      command: config.command || 'openai',
      environment: {
        OPENAI_API_KEY: config.apiKey,
        ...config.environment
      }
    });

    this.codexConfig = {
      ...config,
      command: config.command || 'openai',
      model: config.model || 'gpt-4',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 2048,
      systemPrompt: config.systemPrompt || 'You are a helpful coding assistant.',
      jsonMode: config.jsonMode ?? false
    };
  }

  protected getCommand(): string {
    return this.codexConfig.command;
  }

  protected getArgs(message: A2AMessage): string[] {
    const args = [
      'api',
      'chat.completions.create',
      '-m', this.codexConfig.model,
      '--temperature', this.codexConfig.temperature.toString(),
      '--max-tokens', this.codexConfig.maxTokens.toString()
    ];

    // Add system prompt
    args.push('-g', 'system', this.codexConfig.systemPrompt);

    // Add JSON mode if enabled
    if (this.codexConfig.jsonMode) {
      args.push('--response-format', 'json_object');
    }

    // Add user message (will be sent via stdin for long content)
    if (message.content.length < 1000) {
      args.push('-g', 'user', message.content);
    }

    return args;
  }

  protected selectContextStrategy(message: A2AMessage): ContextStrategy {
    // Use stdin for messages > 1000 chars to avoid argument length limits
    if (message.content.length > 1000) {
      return ContextStrategy.STDIN;
    }

    // Use args for short messages
    return ContextStrategy.ARGS;
  }

  protected formatInput(message: A2AMessage, strategy: ContextStrategy): string {
    if (strategy === ContextStrategy.STDIN) {
      // Send as JSON for stdin
      return JSON.stringify({
        model: this.codexConfig.model,
        messages: [
          { role: 'system', content: this.codexConfig.systemPrompt },
          { role: 'user', content: message.content }
        ],
        temperature: this.codexConfig.temperature,
        max_tokens: this.codexConfig.maxTokens,
        ...(this.codexConfig.jsonMode && { response_format: { type: 'json_object' } })
      });
    }

    return message.content;
  }

  protected parseOutput(output: CLIOutput): A2AResponse {
    try {
      // OpenAI CLI returns JSON
      const parsed = JSON.parse(output.stdout);

      return {
        id: parsed.id || `codex-${Date.now()}`,
        role: 'assistant',
        content: parsed.choices?.[0]?.message?.content || '',
        metadata: {
          model: parsed.model,
          usage: parsed.usage,
          finishReason: parsed.choices?.[0]?.finish_reason,
          executionTime: output.executionTime,
          pid: output.pid
        }
      };
    } catch (error) {
      // Check if it's a streaming response (multiple JSON objects)
      const lines = output.stdout.trim().split('\n');
      if (lines.length > 1) {
        try {
          // Accumulate content from multiple lines
          let content = '';
          let lastParsed: any = null;

          for (const line of lines) {
            if (line.trim()) {
              const parsed = JSON.parse(line);
              if (parsed.choices?.[0]?.message?.content) {
                content += parsed.choices[0].message.content;
              }
              lastParsed = parsed;
            }
          }

          return {
            id: lastParsed?.id || `codex-${Date.now()}`,
            role: 'assistant',
            content,
            metadata: {
              model: lastParsed?.model,
              usage: lastParsed?.usage,
              finishReason: lastParsed?.choices?.[0]?.finish_reason,
              executionTime: output.executionTime,
              pid: output.pid
            }
          };
        } catch {
          // Fall through to error
        }
      }

      throw new CLIError(
        `Failed to parse Codex output: ${(error as Error).message}`,
        'PARSE_ERROR',
        output.exitCode,
        output.stderr
      );
    }
  }

  protected getEnvironment(): Record<string, string> {
    return {
      OPENAI_API_KEY: this.codexConfig.apiKey
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
}

/**
 * Factory function for creating Codex CLI adapter
 *
 * @param config - Configuration options
 * @returns Configured Codex CLI adapter
 *
 * @example
 * ```typescript
 * const adapter = createCodexAdapter({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4-turbo-preview'
 * });
 * ```
 */
export function createCodexAdapter(config: CodexCLIConfig): CodexCLIAdapter {
  return new CodexCLIAdapter(config);
}
