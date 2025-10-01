/**
 * Minimal Codex CLI Adapter
 *
 * Principles Applied:
 * - SOLID: Single Responsibility (execute OpenAI CLI commands)
 * - YAGNI: Only what we need right now
 * - NO LEGACY: Clean implementation, no compatibility
 * - START SMALL: Minimal working code
 */

import { spawn } from 'child_process';

/**
 * Configuration for CodexCLI
 */
export interface CodexConfig {
  apiKey: string;
  model: string;
  timeout?: number;
}

/**
 * Response from Codex
 */
export interface CodexResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Minimal Codex CLI Adapter
 *
 * SOLID Principles:
 * - S: Single Responsibility - only execute CLI commands
 * - O: Open/Closed - can extend for streaming later
 * - L: Liskov Substitution - no inheritance, no problem
 * - I: Interface Segregation - minimal interface
 * - D: Dependency Inversion - depends on abstractions (config interface)
 */
export class CodexCLI {
  private config: Required<CodexConfig>;

  constructor(config: CodexConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000
    };
  }

  /**
   * Execute a prompt using OpenAI CLI
   *
   * Uses: openai api chat.completions.create
   */
  async execute(prompt: string): Promise<CodexResponse> {
    return new Promise((resolve, reject) => {
      const args = [
        'api',
        'chat.completions.create',
        '-m', this.config.model,
        '-g', 'user', prompt
      ];

      const child = spawn('openai', args, {
        env: {
          ...process.env,
          OPENAI_API_KEY: this.config.apiKey
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      child.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(new Error(`OpenAI CLI failed: ${stderr || stdout}`));
          return;
        }

        try {
          const response = JSON.parse(stdout);

          resolve({
            content: response.choices[0].message.content,
            model: response.model,
            usage: response.usage ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens
            } : undefined
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn process: ${error.message}`));
      });
    });
  }
}
