/**
 * Minimal Claude CLI Adapter
 *
 * Principles Applied:
 * - SOLID: Single Responsibility (execute Claude CLI commands)
 * - YAGNI: Only what we need right now
 * - NO LEGACY: Clean implementation, no compatibility
 * - START SMALL: Minimal working code
 */

import { spawn, execSync } from 'child_process';

/**
 * Configuration for ClaudeCLI
 */
export interface ClaudeConfig {
  model?: string;
  timeout?: number;
  maxTokens?: number;
}

/**
 * Response from Claude
 */
export interface ClaudeResponse {
  content: string;
  sessionId: string;
  modelUsed: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
  durationMs: number;
  costUsd: number;
}

/**
 * Minimal Claude CLI Adapter
 *
 * SOLID Principles:
 * - S: Single Responsibility - only execute CLI commands
 * - O: Open/Closed - can extend for streaming later
 * - L: Liskov Substitution - no inheritance, no problem
 * - I: Interface Segregation - minimal interface
 * - D: Dependency Inversion - depends on abstractions (config interface)
 */
export class ClaudeCLI {
  private config: Required<ClaudeConfig>;
  private claudePath: string;

  constructor(config: ClaudeConfig = {}) {
    this.config = {
      model: config.model || 'sonnet',
      timeout: config.timeout || 60000,
      maxTokens: config.maxTokens || 4096
    };

    // Find Claude CLI path - check common locations
    this.claudePath = this.findClaudePath();
  }

  private findClaudePath(): string {
    const possiblePaths = [
      process.env.HOME + '/.claude/local/claude',
      '/usr/local/bin/claude',
      '/usr/bin/claude',
      'claude' // Fallback to PATH
    ];

    for (const path of possiblePaths) {
      try {
        execSync(`test -x ${path}`, { stdio: 'ignore' });
        return path;
      } catch {
        continue;
      }
    }

    // Last resort: try 'which claude'
    try {
      return execSync('which claude', { encoding: 'utf-8' }).trim();
    } catch {
      return 'claude'; // Hope it's in PATH
    }
  }

  /**
   * Execute a prompt using Claude CLI
   *
   * Uses: claude -p --output-format json
   */
  async execute(prompt: string): Promise<ClaudeResponse> {
    return new Promise((resolve, reject) => {
      const args = [
        '-p',
        '--output-format', 'json',
        '--model', this.config.model
      ];

      const child = spawn(this.claudePath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Send prompt via stdin
      child.stdin.write(prompt);
      child.stdin.end();

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
          reject(new Error(`Claude CLI failed (exit ${code}): ${stderr || stdout}`));
          return;
        }

        try {
          const response = JSON.parse(stdout);

          // Extract model info from modelUsage
          const models = Object.keys(response.modelUsage || {});
          const modelUsed = models[0] || this.config.model;
          const modelStats = response.modelUsage?.[modelUsed] || {};

          resolve({
            content: response.result || response.response || '',
            sessionId: response.session_id || response.uuid,
            modelUsed,
            usage: {
              inputTokens: modelStats.inputTokens || response.usage?.input_tokens || 0,
              outputTokens: modelStats.outputTokens || response.usage?.output_tokens || 0,
              totalTokens: (modelStats.inputTokens || 0) + (modelStats.outputTokens || 0),
              cacheCreationTokens: modelStats.cacheCreationInputTokens,
              cacheReadTokens: modelStats.cacheReadInputTokens
            },
            durationMs: response.duration_ms || 0,
            costUsd: response.total_cost_usd || modelStats.costUSD || 0
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}\nOutput: ${stdout}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn process: ${error.message}`));
      });
    });
  }

  /**
   * Stream responses from Claude CLI
   *
   * Uses: claude -p --output-format stream-json --include-partial-messages
   */
  async *stream(prompt: string): AsyncIterator<string> {
    const child = spawn(this.claudePath, [
      '-p',
      '--verbose',
      '--output-format', 'stream-json',
      '--include-partial-messages',
      '--model', this.config.model
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send prompt via stdin
    child.stdin.write(prompt);
    child.stdin.end();

    let buffer = '';

    // Process stdout line by line (NDJSON format)
    for await (const chunk of child.stdout) {
      buffer += chunk.toString();

      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          // Yield content from delta messages
          if (data.type === 'text_delta') {
            yield data.text || '';
          } else if (data.type === 'result' && data.result) {
            // Final result
            yield data.result;
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        if (data.type === 'text_delta' && data.text) {
          yield data.text;
        } else if (data.type === 'result' && data.result) {
          yield data.result;
        }
      } catch {
        // Ignore parse errors in final buffer
      }
    }
  }
}
