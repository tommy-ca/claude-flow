/**
 * Cursor Agent CLI Adapter
 *
 * Integrates with Cursor AI's command-line agent for IDE-like operations with LSP support.
 * Command structure: `cursor-agent --project /path --task "description" [options]`
 *
 * @module cursor-agent-adapter
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
 * Configuration for Cursor Agent
 */
export interface CursorAgentConfig extends CLIAdapterConfig {
  /** Cursor API key or session token */
  apiKey: string;

  /** Project root directory */
  projectRoot: string;

  /** Language server protocol support */
  enableLSP?: boolean;

  /** File context to include */
  fileContext?: string[];

  /** Cursor-specific features */
  features?: {
    /** Enable AI pair programming */
    pairProgramming?: boolean;

    /** Enable code suggestions */
    suggestions?: boolean;

    /** Enable refactoring tools */
    refactoring?: boolean;
  };

  /** Output format (json | ndjson | text) */
  outputFormat?: 'json' | 'ndjson' | 'text';
}

/**
 * Adapter for Cursor Agent CLI
 *
 * Command structure:
 * ```bash
 * cursor-agent \
 *   --project /path/to/project \
 *   --task "refactor function" \
 *   --context file1.ts file2.ts \
 *   --output-format json \
 *   --lsp
 * ```
 *
 * @example
 * ```typescript
 * const adapter = new CursorAgentAdapter({
 *   apiKey: process.env.CURSOR_API_KEY!,
 *   command: 'cursor-agent',
 *   projectRoot: '/path/to/project',
 *   enableLSP: true,
 *   fileContext: ['src/main.ts', 'src/utils.ts'],
 *   outputFormat: 'json'
 * });
 *
 * const response = await adapter.executeSync({
 *   role: 'user',
 *   content: 'Refactor the main function to use async/await'
 * });
 *
 * console.log(response.content);
 * console.log('Files changed:', response.metadata?.fileChanges);
 * await adapter.cleanup();
 * ```
 */
export class CursorAgentAdapter extends CLIAdapter {
  private cursorConfig: Required<CursorAgentConfig>;
  private sessionId?: string;

  constructor(config: CursorAgentConfig) {
    super({
      ...config,
      command: config.command || 'cursor-agent',
      workingDirectory: config.projectRoot,
      reuseProcesses: true, // Cursor benefits from session reuse
      environment: {
        CURSOR_API_KEY: config.apiKey,
        ...config.environment
      }
    });

    this.cursorConfig = {
      ...config,
      command: config.command || 'cursor-agent',
      enableLSP: config.enableLSP !== false,
      fileContext: config.fileContext || [],
      outputFormat: config.outputFormat || 'json',
      features: {
        pairProgramming: true,
        suggestions: true,
        refactoring: true,
        ...config.features
      }
    };
  }

  protected getCommand(): string {
    return this.cursorConfig.command;
  }

  protected getArgs(message: A2AMessage): string[] {
    const args = [
      '--project', this.cursorConfig.projectRoot,
      '--output-format', this.cursorConfig.outputFormat
    ];

    // Enable LSP if configured
    if (this.cursorConfig.enableLSP) {
      args.push('--lsp');
    }

    // Add session ID for reuse
    if (this.sessionId) {
      args.push('--session', this.sessionId);
    }

    // Add file context
    if (this.cursorConfig.fileContext.length > 0) {
      args.push('--context', ...this.cursorConfig.fileContext);
    }

    // Add features
    if (this.cursorConfig.features.pairProgramming) {
      args.push('--pair-programming');
    }
    if (this.cursorConfig.features.suggestions) {
      args.push('--suggestions');
    }
    if (this.cursorConfig.features.refactoring) {
      args.push('--refactoring');
    }

    // Add task (short tasks via args, long via stdin)
    if (message.content.length < 500) {
      args.push('--task', message.content);
    }

    return args;
  }

  protected selectContextStrategy(message: A2AMessage): ContextStrategy {
    // Cursor works best with file-based context
    const contextSize = message.content.length;

    if (contextSize > 50 * 1024) {
      // Large context: use working directory with file references
      return ContextStrategy.WORKING_DIR;
    } else if (contextSize > 10 * 1024) {
      // Medium context: use temp file
      return ContextStrategy.TEMP_FILE;
    } else {
      // Small context: use stdin
      return ContextStrategy.STDIN;
    }
  }

  protected formatInput(message: A2AMessage, strategy: ContextStrategy): string {
    const input = {
      task: message.content,
      context: message.metadata?.context || {},
      files: this.cursorConfig.fileContext,
      sessionId: this.sessionId
    };

    if (strategy === ContextStrategy.TEMP_FILE && message.metadata?.tempFile) {
      // Return file path in special format
      return `@file:${message.metadata.tempFile}`;
    }

    return JSON.stringify(input);
  }

  protected parseOutput(output: CLIOutput): A2AResponse {
    try {
      // Handle NDJSON format (streaming)
      if (this.cursorConfig.outputFormat === 'ndjson') {
        return this.parseNDJSON(output);
      }

      // Handle standard JSON format
      const parsed = JSON.parse(output.stdout);

      // Extract session ID for reuse
      if (parsed.sessionId) {
        this.sessionId = parsed.sessionId;
      }

      return {
        id: parsed.id || `cursor-${Date.now()}`,
        role: 'assistant',
        content: parsed.response || parsed.output || '',
        metadata: {
          sessionId: parsed.sessionId,
          fileChanges: parsed.fileChanges || [],
          suggestions: parsed.suggestions || [],
          lspData: parsed.lsp || null,
          executionTime: output.executionTime,
          pid: output.pid
        }
      };
    } catch (error) {
      // Fallback: treat as plain text response
      return {
        id: `cursor-${Date.now()}`,
        role: 'assistant',
        content: output.stdout,
        metadata: {
          parseError: true,
          rawOutput: output.stdout,
          executionTime: output.executionTime,
          pid: output.pid
        }
      };
    }
  }

  /**
   * Parse NDJSON (newline-delimited JSON) streaming format
   */
  private parseNDJSON(output: CLIOutput): A2AResponse {
    const lines = output.stdout.trim().split('\n');
    let content = '';
    let metadata: Record<string, any> = {};
    let lastEvent: any = null;

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line);
        lastEvent = event;

        // Handle different event types
        switch (event.type) {
          case 'system_init':
            if (event.sessionId) {
              this.sessionId = event.sessionId;
              metadata.sessionId = event.sessionId;
            }
            break;

          case 'delta':
            content += event.content || '';
            break;

          case 'tool_call':
            metadata.toolCalls = metadata.toolCalls || [];
            metadata.toolCalls.push({
              tool: event.tool,
              args: event.args
            });
            break;

          case 'result':
            metadata.status = event.status;
            metadata.summary = event.summary;
            break;

          case 'file_change':
            metadata.fileChanges = metadata.fileChanges || [];
            metadata.fileChanges.push({
              file: event.file,
              action: event.action,
              changes: event.changes
            });
            break;

          case 'error':
            throw new CLIError(
              event.message || 'Cursor agent error',
              'CURSOR_ERROR',
              output.exitCode,
              event.details
            );
        }
      } catch (parseError) {
        // Skip invalid JSON lines
        continue;
      }
    }

    return {
      id: lastEvent?.id || `cursor-${Date.now()}`,
      role: 'assistant',
      content,
      metadata: {
        ...metadata,
        executionTime: output.executionTime,
        pid: output.pid
      }
    };
  }

  protected getEnvironment(): Record<string, string> {
    return {
      CURSOR_API_KEY: this.cursorConfig.apiKey,
      CURSOR_PROJECT_ROOT: this.cursorConfig.projectRoot
    };
  }

  protected async spawnProcess(args: string[]): Promise<ChildProcess> {
    const process = spawn(this.getCommand(), args, {
      env: this.buildEnvironment(this.getEnvironment()),
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: this.config.shell
    });

    // Cursor may take longer to start due to LSP initialization
    if (this.cursorConfig.enableLSP) {
      await this.waitForReady(process, 5000);
    }

    return process;
  }

  /**
   * Wait for Cursor agent to be ready (LSP initialization)
   */
  private async waitForReady(process: ChildProcess, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new CLIError('Cursor agent startup timeout', 'STARTUP_TIMEOUT'));
      }, timeout);

      // Look for ready signal in stderr
      const dataHandler = (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.includes('Ready') || text.includes('Listening') || text.includes('initialized')) {
          clearTimeout(timeoutHandle);
          process.stderr?.removeListener('data', dataHandler);
          resolve();
        }
      };

      process.stderr?.on('data', dataHandler);

      // Also resolve if process becomes ready quickly
      setTimeout(() => {
        clearTimeout(timeoutHandle);
        process.stderr?.removeListener('data', dataHandler);
        resolve();
      }, 1000);
    });
  }

  /**
   * Cleanup Cursor session
   */
  public async cleanup(): Promise<void> {
    if (this.sessionId) {
      // Send cleanup command
      try {
        const cleanupProcess = spawn(this.getCommand(), [
          '--session', this.sessionId,
          '--cleanup'
        ], {
          env: this.buildEnvironment(this.getEnvironment()),
          cwd: this.config.workingDirectory
        });

        await this.terminate(cleanupProcess);
      } catch {
        // Ignore cleanup errors
      }
    }

    await super.cleanup();
  }
}

/**
 * Factory function for creating Cursor Agent adapter
 *
 * @param config - Configuration options
 * @returns Configured Cursor Agent adapter
 *
 * @example
 * ```typescript
 * const adapter = createCursorAdapter({
 *   apiKey: process.env.CURSOR_API_KEY!,
 *   projectRoot: process.cwd(),
 *   enableLSP: true
 * });
 * ```
 */
export function createCursorAdapter(config: CursorAgentConfig): CursorAgentAdapter {
  return new CursorAgentAdapter(config);
}
