# CLI Adapter Architecture for Claude Flow A2A

## Document Metadata
- **Version**: 1.0.0
- **Date**: 2025-10-01
- **Status**: Design Specification
- **Authors**: System Architecture Team

---

## 1. Architecture Overview

### 1.1 Executive Summary

The CLI Adapter Architecture provides a robust framework for integrating command-line interface (CLI) based coding agents into Claude Flow's Agent-to-Agent (A2A) communication system. Unlike API-based agents that communicate via HTTP/WebSocket, CLI agents require process lifecycle management, stream handling, and shell integration.

### 1.2 Key Design Principles

1. **Process Isolation**: Each CLI agent runs in an isolated process with controlled resources
2. **Stream-First**: All communication is stream-based for real-time feedback
3. **Context-Aware**: Multiple strategies for passing code context efficiently
4. **Fault-Tolerant**: Graceful handling of process failures and timeouts
5. **Performance-Optimized**: Process pooling and connection reuse where applicable
6. **Security-Focused**: Safe shell escaping and environment isolation

### 1.3 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      A2A Message Router                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLI Adapter Manager                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ - Process Pool Management                                │  │
│  │ - Adapter Registry                                       │  │
│  │ - Session Management                                     │  │
│  │ - Resource Monitoring                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬────────────┬────────────┬──────────────────────────┘
             │            │            │
    ┌────────▼───┐  ┌────▼─────┐  ┌──▼──────────┐
    │  Codex CLI │  │  Cursor  │  │ Gemini CLI  │
    │  Adapter   │  │  Agent   │  │  Adapter    │
    │            │  │  Adapter │  │             │
    └────────┬───┘  └────┬─────┘  └──┬──────────┘
             │           │            │
    ┌────────▼───────────▼────────────▼──────────┐
    │         Process Executor Layer             │
    │  ┌──────────────────────────────────────┐  │
    │  │ - spawn()   - send()   - receive()   │  │
    │  │ - terminate() - monitor() - timeout()│  │
    │  └──────────────────────────────────────┘  │
    └────────┬──────────────────────────────────┘
             │
    ┌────────▼──────────┐
    │  Child Processes  │
    │  ┌──────────────┐ │
    │  │ stdin        │ │
    │  │ stdout       │ │
    │  │ stderr       │ │
    │  └──────────────┘ │
    └───────────────────┘
```

### 1.4 Data Flow Diagram

```
Request Flow:
┌──────┐    A2A Message    ┌──────────────┐
│Client│─────────────────▶│ CLI Adapter  │
└──────┘                   │   Manager    │
                           └──────┬───────┘
                                  │
                    1. Select/Create Adapter
                                  │
                           ┌──────▼───────┐
                           │Process Pool  │
                           │Get/Create    │
                           └──────┬───────┘
                                  │
                    2. Prepare Context (stdin/file/env)
                                  │
                           ┌──────▼───────┐
                           │  CLI Process │
                           │   Executor   │
                           └──────┬───────┘
                                  │
                    3. Send Input to stdin
                                  │
                    ┌─────────────▼─────────────┐
                    │   Child Process Space     │
                    │  ┌────────────────────┐   │
                    │  │ CLI Agent Running  │   │
                    │  └────────────────────┘   │
                    └─────────────┬─────────────┘
                                  │
                    4. Stream stdout/stderr
                                  │
                           ┌──────▼───────┐
                           │Stream Parser │
                           └──────┬───────┘
                                  │
                    5. Parse & Aggregate Output
                                  │
┌──────┐    A2A Response   ┌──────▼───────┐
│Client│◀──────────────────│ CLI Adapter  │
└──────┘                   │   Manager    │
                           └──────────────┘
```

### 1.5 Lifecycle State Machine

```
                    ┌──────────┐
                    │   IDLE   │◀────────┐
                    └────┬─────┘         │
                         │               │
              spawn()    │               │
                         ▼               │
                    ┌──────────┐         │
                    │SPAWNING  │         │
                    └────┬─────┘         │
                         │               │
           success       │               │
                         ▼               │
                    ┌──────────┐         │
              ┌────▶│  READY   │         │
              │     └────┬─────┘         │
              │          │               │
        reuse │   send() │               │
              │          ▼               │
              │     ┌──────────┐         │
              └─────│  ACTIVE  │         │
                    └────┬─────┘         │
                         │               │
                 done/   │   timeout/    │
                 exit 0  │   error       │
                         │               │
         ┌───────────────┼───────────────┤
         │               │               │
         ▼               ▼               │
    ┌──────────┐    ┌──────────┐        │
    │COMPLETED │    │  FAILED  │        │
    └────┬─────┘    └────┬─────┘        │
         │               │               │
         │  cleanup()    │               │
         └───────────────┴───────────────┘
```

---

## 2. Base CLI Adapter

### 2.1 Core Interface Definition

```typescript
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Base configuration for all CLI adapters
 */
export interface CLIAdapterConfig {
  /** Command to execute (e.g., "openai", "cursor", "gemini") */
  command: string;

  /** Base arguments always passed to command */
  baseArgs?: string[];

  /** Environment variables to set */
  environment?: Record<string, string>;

  /** Working directory for command execution */
  workingDirectory?: string;

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Maximum number of concurrent processes (default: 3) */
  maxProcesses?: number;

  /** Whether to reuse processes (default: false) */
  reuseProcesses?: boolean;

  /** Maximum memory per process in MB (default: 512) */
  maxMemoryMB?: number;

  /** Shell to use (default: false for direct execution) */
  shell?: boolean | string;

  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    retryableExitCodes: number[];
  };
}

/**
 * Context strategy determines how code context is passed to CLI
 */
export enum ContextStrategy {
  /** Pass via stdin (best for small contexts < 10KB) */
  STDIN = 'stdin',

  /** Write to temporary file and pass path (best for large contexts) */
  TEMP_FILE = 'temp_file',

  /** Set as environment variable (best for small key-value data) */
  ENVIRONMENT = 'environment',

  /** Pass as command-line arguments (best for simple parameters) */
  ARGS = 'args',

  /** Change working directory to context location */
  WORKING_DIR = 'working_dir',

  /** Combination of multiple strategies */
  HYBRID = 'hybrid'
}

/**
 * Process state tracking
 */
export enum ProcessState {
  IDLE = 'idle',
  SPAWNING = 'spawning',
  READY = 'ready',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Stream event types
 */
export interface StreamEvents {
  'start': () => void;
  'chunk': (chunk: string, stream: 'stdout' | 'stderr') => void;
  'complete': (output: CLIOutput) => void;
  'error': (error: CLIError) => void;
  'timeout': (pid: number) => void;
  'exit': (code: number, signal: string | null) => void;
}

/**
 * CLI execution output
 */
export interface CLIOutput {
  /** Combined stdout content */
  stdout: string;

  /** Combined stderr content */
  stderr: string;

  /** Exit code */
  exitCode: number;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Process ID */
  pid: number;

  /** Peak memory usage in bytes */
  peakMemory?: number;
}

/**
 * CLI execution error
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode?: number,
    public readonly stderr?: string,
    public readonly pid?: number
  ) {
    super(message);
    this.name = 'CLIError';
  }

  static fromTimeout(pid: number, timeout: number): CLIError {
    return new CLIError(
      `Process ${pid} timed out after ${timeout}ms`,
      'TIMEOUT',
      undefined,
      undefined,
      pid
    );
  }

  static fromExitCode(code: number, stderr: string, pid: number): CLIError {
    return new CLIError(
      `Process ${pid} exited with code ${code}`,
      'EXIT_CODE',
      code,
      stderr,
      pid
    );
  }

  static fromSpawnError(error: Error): CLIError {
    return new CLIError(
      `Failed to spawn process: ${error.message}`,
      'SPAWN_ERROR'
    );
  }
}

/**
 * Abstract base class for all CLI adapters
 */
export abstract class CLIAdapter extends EventEmitter {
  protected config: Required<CLIAdapterConfig>;
  protected state: ProcessState = ProcessState.IDLE;
  protected currentProcess?: ChildProcess;
  protected processPool: ChildProcess[] = [];

  constructor(config: CLIAdapterConfig) {
    super();

    // Set defaults
    this.config = {
      ...config,
      baseArgs: config.baseArgs || [],
      environment: config.environment || {},
      workingDirectory: config.workingDirectory || process.cwd(),
      timeout: config.timeout || 30000,
      maxProcesses: config.maxProcesses || 3,
      reuseProcesses: config.reuseProcesses || false,
      maxMemoryMB: config.maxMemoryMB || 512,
      shell: config.shell || false,
      retry: config.retry || {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableExitCodes: [1, 2, 143] // Common retry codes
      }
    };
  }

  // ========== Abstract Methods (Must be implemented by subclasses) ==========

  /**
   * Get the command to execute (e.g., "openai", "cursor")
   */
  protected abstract getCommand(): string;

  /**
   * Build command arguments for the given message
   */
  protected abstract getArgs(message: A2AMessage): string[];

  /**
   * Determine the best context strategy for this message
   */
  protected abstract selectContextStrategy(message: A2AMessage): ContextStrategy;

  /**
   * Format input according to the CLI's expected format
   */
  protected abstract formatInput(message: A2AMessage, strategy: ContextStrategy): string;

  /**
   * Parse CLI output into A2A response format
   */
  protected abstract parseOutput(output: CLIOutput): A2AResponse;

  /**
   * Get environment variables specific to this adapter
   */
  protected abstract getEnvironment(): Record<string, string>;

  // ========== Public API ==========

  /**
   * Execute a message and return streaming response
   */
  public async execute(message: A2AMessage): Promise<AsyncIterator<A2AResponse>> {
    const strategy = this.selectContextStrategy(message);
    const input = this.formatInput(message, strategy);
    const args = this.getArgs(message);

    return this.executeWithRetry(args, input, strategy);
  }

  /**
   * Execute synchronously and wait for complete response
   */
  public async executeSync(message: A2AMessage): Promise<A2AResponse> {
    const iterator = await this.execute(message);
    let lastResponse: A2AResponse | undefined;

    for await (const response of iterator) {
      lastResponse = response;
    }

    if (!lastResponse) {
      throw new CLIError('No response received', 'NO_RESPONSE');
    }

    return lastResponse;
  }

  /**
   * Cleanup resources and terminate all processes
   */
  public async cleanup(): Promise<void> {
    await this.terminateAll();
    this.processPool = [];
    this.currentProcess = undefined;
    this.state = ProcessState.IDLE;
  }

  // ========== Process Management ==========

  /**
   * Spawn a new CLI process
   */
  protected async spawn(args: string[]): Promise<ChildProcess> {
    this.state = ProcessState.SPAWNING;

    try {
      const process = await this.spawnProcess(args);

      this.setupProcessMonitoring(process);
      this.state = ProcessState.READY;

      return process;
    } catch (error) {
      this.state = ProcessState.FAILED;
      throw CLIError.fromSpawnError(error as Error);
    }
  }

  /**
   * Low-level process spawning
   */
  protected abstract spawnProcess(args: string[]): Promise<ChildProcess>;

  /**
   * Send input to process via stdin
   */
  protected async send(process: ChildProcess, input: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!process.stdin) {
        reject(new CLIError('Process stdin not available', 'NO_STDIN'));
        return;
      }

      process.stdin.write(input, (error) => {
        if (error) {
          reject(new CLIError(`Failed to write to stdin: ${error.message}`, 'STDIN_ERROR'));
        } else {
          process.stdin!.end();
          resolve();
        }
      });
    });
  }

  /**
   * Receive output from process as async iterator
   */
  protected async *receive(process: ChildProcess): AsyncIterator<string> {
    const stdout = process.stdout;
    const stderr = process.stderr;

    if (!stdout) {
      throw new CLIError('Process stdout not available', 'NO_STDOUT');
    }

    // Set up data listeners
    const chunks: string[] = [];
    let stdoutEnded = false;
    let stderrEnded = false;

    stdout.on('data', (chunk) => {
      const text = chunk.toString('utf-8');
      chunks.push(text);
      this.emit('chunk', text, 'stdout');
    });

    if (stderr) {
      stderr.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        this.emit('chunk', text, 'stderr');
      });
    }

    stdout.on('end', () => { stdoutEnded = true; });
    stderr?.on('end', () => { stderrEnded = true; });

    // Wait for process completion
    await new Promise<void>((resolve) => {
      process.on('exit', () => resolve());
    });

    // Yield all chunks
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  /**
   * Terminate a specific process
   */
  protected async terminate(process: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      if (!process.pid) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        // Force kill if graceful termination fails
        process.kill('SIGKILL');
        resolve();
      }, 5000);

      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Attempt graceful termination
      process.kill('SIGTERM');
    });
  }

  /**
   * Terminate all managed processes
   */
  protected async terminateAll(): Promise<void> {
    const terminationPromises = [
      ...this.processPool.map(p => this.terminate(p)),
      this.currentProcess ? this.terminate(this.currentProcess) : Promise.resolve()
    ];

    await Promise.all(terminationPromises);
  }

  /**
   * Setup monitoring for resource usage and timeouts
   */
  protected setupProcessMonitoring(process: ChildProcess): void {
    const startTime = Date.now();
    const timeout = this.config.timeout;

    // Timeout monitoring
    const timeoutHandle = setTimeout(() => {
      this.emit('timeout', process.pid);
      this.terminate(process);
    }, timeout);

    // Memory monitoring (if enabled)
    let memoryInterval: NodeJS.Timeout | undefined;
    if (this.config.maxMemoryMB) {
      memoryInterval = setInterval(async () => {
        const memory = await this.getProcessMemory(process.pid!);
        if (memory && memory > this.config.maxMemoryMB * 1024 * 1024) {
          this.emit('error', new CLIError(
            `Process ${process.pid} exceeded memory limit`,
            'MEMORY_LIMIT'
          ));
          this.terminate(process);
        }
      }, 1000);
    }

    // Cleanup on exit
    process.on('exit', (code, signal) => {
      clearTimeout(timeoutHandle);
      if (memoryInterval) clearInterval(memoryInterval);

      const executionTime = Date.now() - startTime;
      this.emit('exit', code || 0, signal);

      if (code !== 0) {
        this.state = ProcessState.FAILED;
      } else {
        this.state = ProcessState.COMPLETED;
      }
    });
  }

  /**
   * Get current memory usage of a process
   */
  protected async getProcessMemory(pid: number): Promise<number | null> {
    try {
      const { execSync } = require('child_process');
      const output = execSync(`ps -o rss= -p ${pid}`).toString().trim();
      return parseInt(output) * 1024; // Convert KB to bytes
    } catch {
      return null;
    }
  }

  // ========== Execution with Retry ==========

  protected async executeWithRetry(
    args: string[],
    input: string,
    strategy: ContextStrategy,
    attempt: number = 1
  ): Promise<AsyncIterator<A2AResponse>> {
    try {
      return await this.executeInternal(args, input, strategy);
    } catch (error) {
      const cliError = error as CLIError;

      // Check if we should retry
      if (
        attempt < this.config.retry.maxAttempts &&
        this.isRetryable(cliError)
      ) {
        const backoff = this.config.retry.backoffMs * attempt;
        await this.sleep(backoff);

        return this.executeWithRetry(args, input, strategy, attempt + 1);
      }

      throw error;
    }
  }

  protected isRetryable(error: CLIError): boolean {
    return (
      error.code === 'TIMEOUT' ||
      (error.exitCode !== undefined &&
        this.config.retry.retryableExitCodes.includes(error.exitCode))
    );
  }

  protected async executeInternal(
    args: string[],
    input: string,
    strategy: ContextStrategy
  ): Promise<AsyncIterator<A2AResponse>> {
    const process = await this.spawn(args);
    this.currentProcess = process;
    this.state = ProcessState.ACTIVE;

    // Handle different context strategies
    await this.applyContextStrategy(process, input, strategy);

    // Create async iterator for streaming response
    return this.createResponseIterator(process);
  }

  protected async applyContextStrategy(
    process: ChildProcess,
    input: string,
    strategy: ContextStrategy
  ): Promise<void> {
    switch (strategy) {
      case ContextStrategy.STDIN:
        await this.send(process, input);
        break;

      case ContextStrategy.TEMP_FILE:
        // Temp file path should be in input
        // Process will read the file
        break;

      case ContextStrategy.ENVIRONMENT:
      case ContextStrategy.WORKING_DIR:
      case ContextStrategy.ARGS:
        // Already applied during spawn
        break;

      case ContextStrategy.HYBRID:
        // Combination - stdin is still sent
        await this.send(process, input);
        break;
    }
  }

  protected async *createResponseIterator(
    process: ChildProcess
  ): AsyncIterator<A2AResponse> {
    const chunks: string[] = [];
    const errors: string[] = [];

    for await (const chunk of this.receive(process)) {
      chunks.push(chunk);

      // Try to parse partial response
      try {
        const partialOutput: CLIOutput = {
          stdout: chunks.join(''),
          stderr: errors.join(''),
          exitCode: -1,
          executionTime: 0,
          pid: process.pid!
        };

        yield this.parseOutput(partialOutput);
      } catch {
        // Parsing failed, wait for more data
      }
    }

    // Final response with complete output
    const finalOutput: CLIOutput = {
      stdout: chunks.join(''),
      stderr: errors.join(''),
      exitCode: await this.getExitCode(process),
      executionTime: 0, // Will be calculated
      pid: process.pid!
    };

    yield this.parseOutput(finalOutput);
  }

  protected async getExitCode(process: ChildProcess): Promise<number> {
    return new Promise((resolve) => {
      if (process.exitCode !== null) {
        resolve(process.exitCode);
      } else {
        process.on('exit', (code) => resolve(code || 0));
      }
    });
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2.2 Context Strategy Helpers

```typescript
/**
 * Utilities for handling different context strategies
 */
export class ContextStrategyHelper {
  /**
   * Determine optimal strategy based on context size
   */
  static selectOptimalStrategy(contextSize: number): ContextStrategy {
    if (contextSize < 10 * 1024) {
      return ContextStrategy.STDIN;
    } else if (contextSize < 1024 * 1024) {
      return ContextStrategy.TEMP_FILE;
    } else {
      return ContextStrategy.WORKING_DIR;
    }
  }

  /**
   * Create temporary file with context
   */
  static async createTempFile(content: string, prefix: string = 'context'): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
    const tempFile = path.join(tempDir, 'context.txt');

    await fs.writeFile(tempFile, content, 'utf-8');

    return tempFile;
  }

  /**
   * Cleanup temporary file
   */
  static async cleanupTempFile(filePath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      await fs.unlink(filePath);
      await fs.rmdir(path.dirname(filePath));
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Safely escape shell arguments
   */
  static escapeShellArg(arg: string): string {
    // Use proper shell escaping
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Build environment with safe values
   */
  static buildEnvironment(
    base: Record<string, string>,
    additions: Record<string, string>
  ): Record<string, string> {
    return {
      ...base,
      ...additions,
      // Ensure PATH is preserved
      PATH: process.env.PATH || ''
    };
  }
}
```

---

## 3. Specific CLI Adapters

### 3.1 Codex CLI Adapter

**Purpose**: Integrate with OpenAI Codex CLI for code generation tasks.

```typescript
import { spawn, ChildProcess } from 'child_process';

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
}

/**
 * Adapter for OpenAI CLI (codex-cli)
 *
 * Command structure:
 * openai api chat.completions.create \
 *   -m gpt-4 \
 *   -g system "You are a coding assistant" \
 *   -g user "Write a function to sort an array"
 */
export class CodexCLIAdapter extends CLIAdapter {
  private codexConfig: Required<CodexCLIConfig>;

  constructor(config: CodexCLIConfig) {
    super({
      ...config,
      command: 'openai',
      environment: {
        OPENAI_API_KEY: config.apiKey,
        ...config.environment
      }
    });

    this.codexConfig = {
      ...config,
      model: config.model || 'gpt-4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      systemPrompt: config.systemPrompt || 'You are a helpful coding assistant.'
    };
  }

  protected getCommand(): string {
    return 'openai';
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

    // Add user message (will be sent via stdin for long content)
    if (message.content.length < 1000) {
      args.push('-g', 'user', message.content);
    }

    return args;
  }

  protected selectContextStrategy(message: A2AMessage): ContextStrategy {
    // Use stdin for messages > 1000 chars
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
        max_tokens: this.codexConfig.maxTokens
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
        content: parsed.choices[0]?.message?.content || '',
        metadata: {
          model: parsed.model,
          usage: parsed.usage,
          finishReason: parsed.choices[0]?.finish_reason
        }
      };
    } catch (error) {
      throw new CLIError(
        `Failed to parse Codex output: ${error.message}`,
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
      env: ContextStrategyHelper.buildEnvironment(process.env as any, this.getEnvironment()),
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
}
```

### 3.2 Cursor Agent Adapter

**Purpose**: Integrate with Cursor AI's command-line agent for IDE-like operations.

```typescript
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
}

/**
 * Adapter for Cursor Agent CLI
 *
 * Command structure:
 * cursor-agent \
 *   --project /path/to/project \
 *   --task "refactor function" \
 *   --context file1.ts file2.ts \
 *   --lsp
 */
export class CursorAgentAdapter extends CLIAdapter {
  private cursorConfig: Required<CursorAgentConfig>;
  private sessionId?: string;

  constructor(config: CursorAgentConfig) {
    super({
      ...config,
      command: 'cursor-agent',
      workingDirectory: config.projectRoot,
      reuseProcesses: true, // Cursor benefits from session reuse
      environment: {
        CURSOR_API_KEY: config.apiKey,
        ...config.environment
      }
    });

    this.cursorConfig = {
      ...config,
      enableLSP: config.enableLSP !== false,
      fileContext: config.fileContext || [],
      features: {
        pairProgramming: true,
        suggestions: true,
        refactoring: true,
        ...config.features
      }
    };
  }

  protected getCommand(): string {
    return 'cursor-agent';
  }

  protected getArgs(message: A2AMessage): string[] {
    const args = [
      '--project', this.cursorConfig.projectRoot,
      '--format', 'json'
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

    if (strategy === ContextStrategy.TEMP_FILE) {
      // Return file path in special format
      return `@file:${message.metadata?.tempFile}`;
    }

    return JSON.stringify(input);
  }

  protected parseOutput(output: CLIOutput): A2AResponse {
    try {
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
          executionTime: output.executionTime
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
          rawOutput: output.stdout
        }
      };
    }
  }

  protected getEnvironment(): Record<string, string> {
    return {
      CURSOR_API_KEY: this.cursorConfig.apiKey,
      CURSOR_PROJECT_ROOT: this.cursorConfig.projectRoot
    };
  }

  protected async spawnProcess(args: string[]): Promise<ChildProcess> {
    const process = spawn(this.getCommand(), args, {
      env: ContextStrategyHelper.buildEnvironment(process.env as any, this.getEnvironment()),
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Cursor may take longer to start due to LSP initialization
    await this.waitForReady(process, 5000);

    return process;
  }

  private async waitForReady(process: ChildProcess, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new CLIError('Cursor agent startup timeout', 'STARTUP_TIMEOUT'));
      }, timeout);

      // Look for ready signal in stderr
      process.stderr?.on('data', (chunk) => {
        if (chunk.toString().includes('Ready') || chunk.toString().includes('Listening')) {
          clearTimeout(timeoutHandle);
          resolve();
        }
      });
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
        ]);

        await this.terminate(cleanupProcess);
      } catch {
        // Ignore cleanup errors
      }
    }

    await super.cleanup();
  }
}
```

### 3.3 Gemini CLI Adapter

**Purpose**: Integrate with Google's Gemini CLI for multi-modal AI capabilities.

```typescript
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
}

/**
 * Adapter for Google Gemini CLI
 *
 * Command structure:
 * gemini-cli \
 *   --model gemini-pro \
 *   --prompt "Explain this code" \
 *   --stream
 */
export class GeminiCLIAdapter extends CLIAdapter {
  private geminiConfig: Required<GeminiCLIConfig>;

  constructor(config: GeminiCLIConfig) {
    super({
      ...config,
      command: 'gemini-cli',
      environment: {
        GOOGLE_API_KEY: config.apiKey,
        ...config.environment
      }
    });

    this.geminiConfig = {
      ...config,
      model: config.model || 'gemini-pro',
      multiModal: config.multiModal || false,
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
    return 'gemini-cli';
  }

  protected getArgs(message: A2AMessage): string[] {
    const args = [
      '--model', this.geminiConfig.model,
      '--stream', // Always stream for real-time feedback
      '--format', 'json'
    ];

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

    return args;
  }

  protected selectContextStrategy(message: A2AMessage): ContextStrategy {
    // Gemini has excellent stdin support
    if (message.metadata?.attachments?.length > 0) {
      // Use hybrid for multi-modal: files via args, text via stdin
      return ContextStrategy.HYBRID;
    }

    return ContextStrategy.STDIN;
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
        });
      }
    }

    return JSON.stringify(input);
  }

  protected parseOutput(output: CLIOutput): A2AResponse {
    try {
      // Gemini CLI streams JSON lines
      const lines = output.stdout.trim().split('\n');
      let fullContent = '';
      let metadata: any = {};

      for (const line of lines) {
        if (!line.trim()) continue;

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
      }

      return {
        id: `gemini-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        metadata: {
          model: this.geminiConfig.model,
          ...metadata
        }
      };
    } catch (error) {
      throw new CLIError(
        `Failed to parse Gemini output: ${error.message}`,
        'PARSE_ERROR',
        output.exitCode,
        output.stderr
      );
    }
  }

  protected getEnvironment(): Record<string, string> {
    return {
      GOOGLE_API_KEY: this.geminiConfig.apiKey
    };
  }

  protected async spawnProcess(args: string[]): Promise<ChildProcess> {
    return spawn(this.getCommand(), args, {
      env: ContextStrategyHelper.buildEnvironment(process.env as any, this.getEnvironment()),
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe']
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
```

---

## 4. Context Strategies

### 4.1 Strategy Selection Decision Tree

```
Context Size & Type Decision Tree:

├── Is context < 10KB?
│   ├── Yes → Use STDIN
│   │   ✓ Fast, no file I/O
│   │   ✓ No cleanup needed
│   │   ✓ Works with all CLIs
│   │
│   └── No → Continue to next check
│
├── Is context 10KB - 1MB?
│   ├── Yes → Use TEMP_FILE
│   │   ✓ Efficient for medium data
│   │   ✓ Avoids stdin buffer limits
│   │   ✗ Requires file cleanup
│   │
│   └── No → Continue to next check
│
├── Is context > 1MB or multiple files?
│   ├── Yes → Use WORKING_DIR
│   │   ✓ Best for large codebases
│   │   ✓ CLI can navigate files
│   │   ✗ Requires directory setup
│   │
│   └── No → Continue to next check
│
├── Is context key-value config data?
│   ├── Yes → Use ENVIRONMENT
│   │   ✓ Standard for configuration
│   │   ✓ Inherited by child processes
│   │   ✗ Size limits (typically 32KB)
│   │
│   └── No → Continue to next check
│
├── Is context simple parameters?
│   ├── Yes → Use ARGS
│   │   ✓ Fastest, no I/O
│   │   ✓ Visible in process list
│   │   ✗ Argument length limits
│   │
│   └── No → Use HYBRID
│
└── HYBRID: Combination strategy
    ✓ Optimize each piece separately
    ✗ More complex implementation
```

### 4.2 Implementation Examples

#### 4.2.1 STDIN Strategy

```typescript
class STDINStrategy implements IContextStrategy {
  async apply(process: ChildProcess, context: string): Promise<void> {
    if (!process.stdin) {
      throw new CLIError('Process stdin not available', 'NO_STDIN');
    }

    // Write to stdin
    return new Promise((resolve, reject) => {
      process.stdin!.write(context, 'utf-8', (error) => {
        if (error) {
          reject(new CLIError(`Failed to write to stdin: ${error.message}`, 'STDIN_ERROR'));
        } else {
          process.stdin!.end();
          resolve();
        }
      });
    });
  }

  async cleanup(): Promise<void> {
    // No cleanup needed
  }
}
```

#### 4.2.2 TEMP_FILE Strategy

```typescript
class TempFileStrategy implements IContextStrategy {
  private tempFilePath?: string;

  async apply(process: ChildProcess, context: string): Promise<void> {
    // Create temporary file
    this.tempFilePath = await ContextStrategyHelper.createTempFile(context, 'context');

    // Pass file path via stdin or environment
    const message = JSON.stringify({
      type: 'file_reference',
      path: this.tempFilePath
    });

    if (process.stdin) {
      process.stdin.write(message);
      process.stdin.end();
    }
  }

  async cleanup(): Promise<void> {
    if (this.tempFilePath) {
      await ContextStrategyHelper.cleanupTempFile(this.tempFilePath);
    }
  }
}
```

#### 4.2.3 WORKING_DIR Strategy

```typescript
class WorkingDirStrategy implements IContextStrategy {
  private originalCwd: string;
  private contextDir?: string;

  async apply(process: ChildProcess, context: string): Promise<void> {
    this.originalCwd = process.cwd?.() || process.env.PWD || process.cwd();

    // Create context directory structure
    this.contextDir = await this.createContextDirectory(context);

    // Inform process of context directory via stdin
    const message = JSON.stringify({
      type: 'context_directory',
      path: this.contextDir
    });

    if (process.stdin) {
      process.stdin.write(message);
      process.stdin.end();
    }
  }

  private async createContextDirectory(context: string): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');

    const contextDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-'));

    // Parse context as file structure
    // Example context format:
    // {
    //   "files": {
    //     "src/main.ts": "content...",
    //     "src/utils.ts": "content..."
    //   }
    // }

    const contextData = JSON.parse(context);

    for (const [filePath, content] of Object.entries(contextData.files)) {
      const fullPath = path.join(contextDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }

    return contextDir;
  }

  async cleanup(): Promise<void> {
    if (this.contextDir) {
      const fs = require('fs').promises;
      await fs.rm(this.contextDir, { recursive: true, force: true });
    }
  }
}
```

#### 4.2.4 ENVIRONMENT Strategy

```typescript
class EnvironmentStrategy implements IContextStrategy {
  async apply(process: ChildProcess, context: string): Promise<void> {
    // Parse context as key-value pairs
    const envVars = JSON.parse(context);

    // Set environment variables (already done at spawn time)
    // This strategy primarily affects spawn configuration

    // Verify variables are set
    for (const key of Object.keys(envVars)) {
      if (!process.env?.[key]) {
        throw new CLIError(
          `Environment variable ${key} not set`,
          'ENV_VAR_MISSING'
        );
      }
    }
  }

  async cleanup(): Promise<void> {
    // Environment variables are cleaned up with process termination
  }
}
```

#### 4.2.5 HYBRID Strategy

```typescript
class HybridStrategy implements IContextStrategy {
  private strategies: IContextStrategy[] = [];

  async apply(process: ChildProcess, context: string): Promise<void> {
    // Parse hybrid context
    const hybridContext = JSON.parse(context);

    // Apply each strategy based on context type
    if (hybridContext.stdin) {
      const stdinStrategy = new STDINStrategy();
      await stdinStrategy.apply(process, hybridContext.stdin);
      this.strategies.push(stdinStrategy);
    }

    if (hybridContext.files) {
      const fileStrategy = new TempFileStrategy();
      await fileStrategy.apply(process, JSON.stringify(hybridContext.files));
      this.strategies.push(fileStrategy);
    }

    if (hybridContext.environment) {
      const envStrategy = new EnvironmentStrategy();
      await envStrategy.apply(process, JSON.stringify(hybridContext.environment));
      this.strategies.push(envStrategy);
    }
  }

  async cleanup(): Promise<void> {
    await Promise.all(this.strategies.map(s => s.cleanup()));
  }
}
```

### 4.3 Trade-offs Matrix

| Strategy | Size Limit | Speed | Complexity | Cleanup | Use Case |
|----------|-----------|-------|------------|---------|----------|
| **STDIN** | ~64KB | ⚡⚡⚡ | ⭐ | None | Small prompts, commands |
| **TEMP_FILE** | ~100MB | ⚡⚡ | ⭐⭐ | Required | Medium context, binary data |
| **WORKING_DIR** | Unlimited | ⚡ | ⭐⭐⭐ | Required | Large codebases, multi-file |
| **ENVIRONMENT** | ~32KB | ⚡⚡⚡ | ⭐ | None | Configuration, API keys |
| **ARGS** | ~128KB | ⚡⚡⚡ | ⭐ | None | Simple parameters |
| **HYBRID** | Variable | ⚡⚡ | ⭐⭐⭐⭐ | Partial | Complex multi-modal tasks |

---

## 5. Error Handling

### 5.1 Error Classification

```typescript
/**
 * Comprehensive error types for CLI adapters
 */
export enum CLIErrorType {
  // Spawn errors
  SPAWN_ERROR = 'spawn_error',
  COMMAND_NOT_FOUND = 'command_not_found',
  PERMISSION_DENIED = 'permission_denied',

  // Execution errors
  TIMEOUT = 'timeout',
  EXIT_CODE = 'exit_code',
  SIGNAL = 'signal',

  // Resource errors
  MEMORY_LIMIT = 'memory_limit',
  CPU_LIMIT = 'cpu_limit',
  DISK_SPACE = 'disk_space',

  // Communication errors
  STDIN_ERROR = 'stdin_error',
  STDOUT_ERROR = 'stdout_error',
  STDERR_ERROR = 'stderr_error',

  // Parsing errors
  PARSE_ERROR = 'parse_error',
  INVALID_JSON = 'invalid_json',
  UNEXPECTED_FORMAT = 'unexpected_format',

  // Context errors
  CONTEXT_TOO_LARGE = 'context_too_large',
  FILE_NOT_FOUND = 'file_not_found',

  // Network errors (for CLI tools that make network calls)
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  AUTH_ERROR = 'auth_error'
}

/**
 * Enhanced error class with recovery strategies
 */
export class EnhancedCLIError extends CLIError {
  constructor(
    message: string,
    public readonly type: CLIErrorType,
    public readonly recoveryStrategies: RecoveryStrategy[],
    exitCode?: number,
    stderr?: string,
    pid?: number
  ) {
    super(message, type, exitCode, stderr, pid);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.recoveryStrategies.some(s => s.type === 'retry');
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case CLIErrorType.COMMAND_NOT_FOUND:
        return `The CLI tool is not installed or not in PATH. Please install it first.`;

      case CLIErrorType.TIMEOUT:
        return `The operation timed out. Try increasing the timeout or simplifying the task.`;

      case CLIErrorType.MEMORY_LIMIT:
        return `The operation exceeded memory limits. Try reducing the context size.`;

      case CLIErrorType.AUTH_ERROR:
        return `Authentication failed. Please check your API key or credentials.`;

      case CLIErrorType.PARSE_ERROR:
        return `Failed to parse CLI output. The tool may have produced unexpected output.`;

      default:
        return `An error occurred: ${this.message}`;
    }
  }
}

/**
 * Recovery strategy definition
 */
export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'manual' | 'skip';
  description: string;
  action?: () => Promise<void>;
}
```

### 5.2 Error Handling Flow

```typescript
/**
 * Centralized error handler for CLI adapters
 */
export class CLIErrorHandler {
  /**
   * Handle error and attempt recovery
   */
  static async handleError(
    error: Error,
    context: ExecutionContext
  ): Promise<ErrorHandlingResult> {
    // Classify error
    const cliError = this.classifyError(error, context);

    // Determine recovery strategies
    const strategies = this.determineRecoveryStrategies(cliError, context);

    // Attempt recovery
    for (const strategy of strategies) {
      try {
        const result = await this.executeRecoveryStrategy(strategy, context);

        if (result.success) {
          return {
            recovered: true,
            strategy: strategy.type,
            result: result.data
          };
        }
      } catch (recoveryError) {
        // Continue to next strategy
        continue;
      }
    }

    // All recovery attempts failed
    return {
      recovered: false,
      error: cliError,
      userMessage: cliError.getUserMessage()
    };
  }

  /**
   * Classify generic error into specific CLI error type
   */
  private static classifyError(error: Error, context: ExecutionContext): EnhancedCLIError {
    // Check for common patterns
    if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
      return new EnhancedCLIError(
        error.message,
        CLIErrorType.COMMAND_NOT_FOUND,
        [
          {
            type: 'manual',
            description: 'Install the required CLI tool'
          }
        ]
      );
    }

    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return new EnhancedCLIError(
        error.message,
        CLIErrorType.PERMISSION_DENIED,
        [
          {
            type: 'manual',
            description: 'Grant execution permissions to the CLI tool'
          }
        ]
      );
    }

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new EnhancedCLIError(
        error.message,
        CLIErrorType.TIMEOUT,
        [
          {
            type: 'retry',
            description: 'Retry with increased timeout'
          },
          {
            type: 'fallback',
            description: 'Simplify the task and retry'
          }
        ]
      );
    }

    // Default to generic error
    return new EnhancedCLIError(
      error.message,
      CLIErrorType.EXIT_CODE,
      [
        {
          type: 'retry',
          description: 'Retry the operation'
        }
      ]
    );
  }

  /**
   * Determine appropriate recovery strategies
   */
  private static determineRecoveryStrategies(
    error: EnhancedCLIError,
    context: ExecutionContext
  ): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    // Retry strategy for transient errors
    if (
      error.type === CLIErrorType.TIMEOUT ||
      error.type === CLIErrorType.NETWORK_ERROR ||
      (error.exitCode && [1, 2, 143].includes(error.exitCode))
    ) {
      strategies.push({
        type: 'retry',
        description: 'Retry with exponential backoff',
        action: async () => {
          await this.sleep(context.retryAttempt * 1000);
        }
      });
    }

    // Fallback strategy for context size errors
    if (error.type === CLIErrorType.CONTEXT_TOO_LARGE) {
      strategies.push({
        type: 'fallback',
        description: 'Reduce context size and retry',
        action: async () => {
          context.reduceContextSize();
        }
      });
    }

    // Manual intervention for auth errors
    if (error.type === CLIErrorType.AUTH_ERROR) {
      strategies.push({
        type: 'manual',
        description: 'Check API credentials and retry'
      });
    }

    return strategies;
  }

  /**
   * Execute recovery strategy
   */
  private static async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    context: ExecutionContext
  ): Promise<{ success: boolean; data?: any }> {
    if (strategy.action) {
      await strategy.action();
    }

    switch (strategy.type) {
      case 'retry':
        // Retry logic handled by caller
        return { success: false };

      case 'fallback':
        // Fallback logic applied
        return { success: false };

      case 'manual':
      case 'skip':
        // Require manual intervention
        return { success: false };

      default:
        return { success: false };
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Execution context for error handling
 */
interface ExecutionContext {
  retryAttempt: number;
  maxRetries: number;
  contextSize: number;

  reduceContextSize(): void;
}

/**
 * Error handling result
 */
interface ErrorHandlingResult {
  recovered: boolean;
  strategy?: string;
  result?: any;
  error?: EnhancedCLIError;
  userMessage?: string;
}
```

### 5.3 Retry Logic

```typescript
/**
 * Configurable retry mechanism
 */
export class RetryManager {
  constructor(private config: RetryConfig) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await this.executeWithTimeout(operation, this.config.timeoutMs);
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (!this.shouldRetry(error as Error, attempt)) {
          throw error;
        }

        // Calculate backoff
        const backoff = this.calculateBackoff(attempt);

        console.log(
          `Attempt ${attempt}/${this.config.maxAttempts} failed: ${error.message}. ` +
          `Retrying in ${backoff}ms...`
        );

        await this.sleep(backoff);
      }
    }

    throw new CLIError(
      `Operation failed after ${this.config.maxAttempts} attempts: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED'
    );
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) {
      return false;
    }

    if (error instanceof EnhancedCLIError) {
      return error.isRetryable();
    }

    // Default: retry on transient errors
    return true;
  }

  private calculateBackoff(attempt: number): number {
    switch (this.config.backoffStrategy) {
      case 'linear':
        return this.config.backoffMs * attempt;

      case 'exponential':
        return this.config.backoffMs * Math.pow(2, attempt - 1);

      case 'fixed':
      default:
        return this.config.backoffMs;
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.timeoutPromise(timeoutMs)
    ]);
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new CLIError(`Operation timed out after ${ms}ms`, 'TIMEOUT'));
      }, ms);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  timeoutMs: number;
}
```

---

## 6. Performance Optimization

### 6.1 Process Pool Management

```typescript
/**
 * Process pool for efficient CLI execution
 */
export class ProcessPool {
  private pool: PooledProcess[] = [];
  private readonly maxSize: number;
  private readonly idleTimeout: number;

  constructor(
    private adapter: CLIAdapter,
    config: ProcessPoolConfig
  ) {
    this.maxSize = config.maxSize || 5;
    this.idleTimeout = config.idleTimeout || 60000; // 60 seconds
  }

  /**
   * Get or create a process from the pool
   */
  async acquire(): Promise<PooledProcess> {
    // Try to find an idle process
    const idle = this.pool.find(p => p.state === 'idle' && !p.isExpired());

    if (idle) {
      idle.state = 'active';
      idle.lastUsed = Date.now();
      return idle;
    }

    // Create new process if under limit
    if (this.pool.length < this.maxSize) {
      const process = await this.createProcess();
      this.pool.push(process);
      return process;
    }

    // Wait for a process to become available
    return this.waitForAvailable();
  }

  /**
   * Release a process back to the pool
   */
  release(process: PooledProcess): void {
    process.state = 'idle';
    process.lastUsed = Date.now();

    // Schedule cleanup if idle too long
    setTimeout(() => {
      if (process.state === 'idle' && process.isExpired()) {
        this.removeProcess(process);
      }
    }, this.idleTimeout);
  }

  /**
   * Create a new pooled process
   */
  private async createProcess(): Promise<PooledProcess> {
    const childProcess = await this.adapter['spawn']([]);

    return {
      id: `process-${Date.now()}-${Math.random()}`,
      process: childProcess,
      state: 'active',
      created: Date.now(),
      lastUsed: Date.now(),
      uses: 0,
      maxUses: 100, // Recycle after 100 uses

      isExpired(): boolean {
        const now = Date.now();
        return (
          this.uses >= this.maxUses ||
          now - this.lastUsed > 60000 // 60 seconds idle
        );
      }
    };
  }

  /**
   * Wait for an available process
   */
  private async waitForAvailable(): Promise<PooledProcess> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const idle = this.pool.find(p => p.state === 'idle');

        if (idle) {
          clearInterval(checkInterval);
          idle.state = 'active';
          idle.lastUsed = Date.now();
          resolve(idle);
        }
      }, 100);
    });
  }

  /**
   * Remove and terminate a process
   */
  private async removeProcess(process: PooledProcess): Promise<void> {
    this.pool = this.pool.filter(p => p.id !== process.id);
    await this.adapter['terminate'](process.process);
  }

  /**
   * Cleanup all processes
   */
  async cleanup(): Promise<void> {
    await Promise.all(this.pool.map(p => this.removeProcess(p)));
  }
}

interface ProcessPoolConfig {
  maxSize?: number;
  idleTimeout?: number;
}

interface PooledProcess {
  id: string;
  process: ChildProcess;
  state: 'idle' | 'active';
  created: number;
  lastUsed: number;
  uses: number;
  maxUses: number;

  isExpired(): boolean;
}
```

### 6.2 Connection Reuse

```typescript
/**
 * Session manager for long-lived CLI connections
 */
export class SessionManager {
  private sessions = new Map<string, CLISession>();
  private readonly maxSessionAge = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create a session
   */
  async getSession(
    adapter: CLIAdapter,
    sessionId?: string
  ): Promise<CLISession> {
    // Use existing session if available
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;

      if (!session.isExpired()) {
        session.lastAccess = Date.now();
        return session;
      }

      // Session expired, cleanup
      await this.destroySession(sessionId);
    }

    // Create new session
    const newSession = await this.createSession(adapter);
    this.sessions.set(newSession.id, newSession);

    return newSession;
  }

  /**
   * Create a new CLI session
   */
  private async createSession(adapter: CLIAdapter): Promise<CLISession> {
    const process = await adapter['spawn']([]);

    return {
      id: `session-${Date.now()}-${Math.random()}`,
      adapter,
      process,
      created: Date.now(),
      lastAccess: Date.now(),
      messageCount: 0,

      isExpired(): boolean {
        return Date.now() - this.lastAccess > 30 * 60 * 1000;
      }
    };
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      await session.adapter['terminate'](session.process);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpired(): Promise<void> {
    const expiredIds: string[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (session.isExpired()) {
        expiredIds.push(id);
      }
    }

    await Promise.all(expiredIds.map(id => this.destroySession(id)));
  }

  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    await Promise.all(
      Array.from(this.sessions.keys()).map(id => this.destroySession(id))
    );
  }
}

interface CLISession {
  id: string;
  adapter: CLIAdapter;
  process: ChildProcess;
  created: number;
  lastAccess: number;
  messageCount: number;

  isExpired(): boolean;
}
```

### 6.3 Caching Strategies

```typescript
/**
 * Response cache for CLI adapter results
 */
export class ResponseCache {
  private cache = new Map<string, CachedResponse>();
  private readonly maxSize = 1000;
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached response
   */
  get(key: string): A2AResponse | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check expiration
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    cached.hits++;
    return cached.response;
  }

  /**
   * Store response in cache
   */
  set(key: string, response: A2AResponse): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Generate cache key from message
   */
  static generateKey(message: A2AMessage): string {
    const crypto = require('crypto');

    const keyData = {
      content: message.content,
      agent: message.metadata?.agent,
      model: message.metadata?.model
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Evict least recently used entry
   */
  private evictOldest(): void {
    let oldest: [string, CachedResponse] | null = null;

    for (const entry of this.cache.entries()) {
      if (!oldest || entry[1].timestamp < oldest[1].timestamp) {
        oldest = entry;
      }
    }

    if (oldest) {
      this.cache.delete(oldest[0]);
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalHits = 0;

    for (const cached of this.cache.values()) {
      totalHits += cached.hits;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      hitRate: totalHits / (this.cache.size || 1)
    };
  }
}

interface CachedResponse {
  response: A2AResponse;
  timestamp: number;
  hits: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  totalHits: number;
  hitRate: number;
}
```

### 6.4 Resource Management

```typescript
/**
 * Resource monitor and limiter
 */
export class ResourceManager {
  private activeProcesses = new Map<number, ProcessResources>();

  /**
   * Register a process for monitoring
   */
  register(pid: number, limits: ResourceLimits): void {
    this.activeProcesses.set(pid, {
      pid,
      limits,
      startTime: Date.now(),
      peakMemory: 0,
      cpuTime: 0
    });

    // Start monitoring
    this.monitorProcess(pid);
  }

  /**
   * Unregister a process
   */
  unregister(pid: number): ProcessResources | undefined {
    const resources = this.activeProcesses.get(pid);
    this.activeProcesses.delete(pid);
    return resources;
  }

  /**
   * Monitor process resources
   */
  private async monitorProcess(pid: number): Promise<void> {
    const interval = setInterval(async () => {
      const resources = this.activeProcesses.get(pid);

      if (!resources) {
        clearInterval(interval);
        return;
      }

      try {
        const stats = await this.getProcessStats(pid);

        // Update peak memory
        if (stats.memory > resources.peakMemory) {
          resources.peakMemory = stats.memory;
        }

        // Update CPU time
        resources.cpuTime = stats.cpuTime;

        // Check limits
        if (stats.memory > resources.limits.maxMemoryMB * 1024 * 1024) {
          throw new CLIError(
            `Process ${pid} exceeded memory limit`,
            'MEMORY_LIMIT'
          );
        }

        if (Date.now() - resources.startTime > resources.limits.maxDurationMs) {
          throw new CLIError(
            `Process ${pid} exceeded time limit`,
            'TIME_LIMIT'
          );
        }
      } catch (error) {
        clearInterval(interval);
        // Process terminated or error occurred
      }
    }, 1000); // Check every second
  }

  /**
   * Get process statistics
   */
  private async getProcessStats(pid: number): Promise<ProcessStats> {
    const { execSync } = require('child_process');

    try {
      // Get memory (RSS) in KB
      const rss = execSync(`ps -o rss= -p ${pid}`).toString().trim();
      const memory = parseInt(rss) * 1024; // Convert to bytes

      // Get CPU time in seconds
      const time = execSync(`ps -o time= -p ${pid}`).toString().trim();
      const [hours, minutes, seconds] = time.split(':').map(Number);
      const cpuTime = (hours * 3600 + minutes * 60 + seconds) * 1000; // Convert to ms

      return { memory, cpuTime };
    } catch {
      throw new Error('Process not found');
    }
  }

  /**
   * Get aggregate resource usage
   */
  getAggregateUsage(): AggregateResources {
    let totalMemory = 0;
    let totalCpuTime = 0;
    let processCount = 0;

    for (const resources of this.activeProcesses.values()) {
      totalMemory += resources.peakMemory;
      totalCpuTime += resources.cpuTime;
      processCount++;
    }

    return {
      totalMemory,
      totalCpuTime,
      processCount,
      avgMemory: processCount > 0 ? totalMemory / processCount : 0
    };
  }
}

interface ResourceLimits {
  maxMemoryMB: number;
  maxDurationMs: number;
}

interface ProcessResources {
  pid: number;
  limits: ResourceLimits;
  startTime: number;
  peakMemory: number;
  cpuTime: number;
}

interface ProcessStats {
  memory: number;
  cpuTime: number;
}

interface AggregateResources {
  totalMemory: number;
  totalCpuTime: number;
  processCount: number;
  avgMemory: number;
}
```

---

## 7. Testing Strategy

### 7.1 Unit Testing CLI Adapters

```typescript
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

/**
 * Mock child process for testing
 */
class MockChildProcess extends EventEmitter {
  stdin = new MockWritableStream();
  stdout = new MockReadableStream();
  stderr = new MockReadableStream();
  pid = 12345;
  exitCode: number | null = null;

  kill(signal?: string): boolean {
    this.exitCode = signal === 'SIGKILL' ? 137 : 143;
    this.emit('exit', this.exitCode, signal);
    return true;
  }
}

class MockWritableStream extends EventEmitter {
  write(data: string, callback?: (error?: Error) => void): boolean {
    setImmediate(() => callback?.());
    return true;
  }

  end(callback?: () => void): void {
    setImmediate(() => callback?.());
  }
}

class MockReadableStream extends EventEmitter {
  push(data: string): void {
    this.emit('data', Buffer.from(data));
  }

  endStream(): void {
    this.emit('end');
  }
}

describe('CLIAdapter', () => {
  let adapter: CodexCLIAdapter;
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    adapter = new CodexCLIAdapter({
      apiKey: 'test-key',
      command: 'openai'
    });

    mockProcess = new MockChildProcess();

    // Mock spawn to return our mock process
    jest.spyOn(adapter as any, 'spawnProcess').mockResolvedValue(mockProcess);
  });

  afterEach(async () => {
    await adapter.cleanup();
    jest.restoreAllMocks();
  });

  describe('execute()', () => {
    it('should execute message and return response', async () => {
      const message: A2AMessage = {
        id: 'test-1',
        role: 'user',
        content: 'Write a hello world function'
      };

      // Simulate CLI response
      setTimeout(() => {
        mockProcess.stdout.push(JSON.stringify({
          id: 'response-1',
          choices: [{
            message: {
              content: 'function hello() { console.log("Hello World"); }'
            },
            finish_reason: 'stop'
          }],
          usage: { total_tokens: 100 }
        }));
        mockProcess.stdout.endStream();
        mockProcess.emit('exit', 0, null);
      }, 10);

      const response = await adapter.executeSync(message);

      expect(response.content).toContain('function hello()');
      expect(response.metadata?.usage).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      adapter = new CodexCLIAdapter({
        apiKey: 'test-key',
        command: 'openai',
        timeout: 100 // 100ms timeout
      });

      const message: A2AMessage = {
        id: 'test-2',
        role: 'user',
        content: 'Long running task'
      };

      // Don't send response, simulate hanging process

      await expect(adapter.executeSync(message)).rejects.toThrow('timeout');
    });

    it('should handle non-zero exit codes', async () => {
      const message: A2AMessage = {
        id: 'test-3',
        role: 'user',
        content: 'Test error'
      };

      setTimeout(() => {
        mockProcess.stderr.push('Error: API key invalid');
        mockProcess.stderr.endStream();
        mockProcess.emit('exit', 1, null);
      }, 10);

      await expect(adapter.executeSync(message)).rejects.toThrow('exit code');
    });
  });

  describe('context strategies', () => {
    it('should use STDIN for small contexts', () => {
      const message: A2AMessage = {
        id: 'test-4',
        role: 'user',
        content: 'Short message'
      };

      const strategy = adapter['selectContextStrategy'](message);

      expect(strategy).toBe(ContextStrategy.ARGS);
    });

    it('should use STDIN for large contexts', () => {
      const largeContent = 'x'.repeat(10000);

      const message: A2AMessage = {
        id: 'test-5',
        role: 'user',
        content: largeContent
      };

      const strategy = adapter['selectContextStrategy'](message);

      expect(strategy).toBe(ContextStrategy.STDIN);
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      adapter = new CodexCLIAdapter({
        apiKey: 'test-key',
        command: 'openai',
        retry: {
          maxAttempts: 3,
          backoffMs: 10,
          retryableExitCodes: [1]
        }
      });

      let attempts = 0;

      jest.spyOn(adapter as any, 'spawnProcess').mockImplementation(async () => {
        attempts++;

        if (attempts < 3) {
          // Fail first 2 attempts
          setTimeout(() => {
            mockProcess.emit('exit', 1, null);
          }, 10);
        } else {
          // Succeed on 3rd attempt
          setTimeout(() => {
            mockProcess.stdout.push(JSON.stringify({
              choices: [{ message: { content: 'Success' } }]
            }));
            mockProcess.stdout.endStream();
            mockProcess.emit('exit', 0, null);
          }, 10);
        }

        return mockProcess;
      });

      const message: A2AMessage = {
        id: 'test-6',
        role: 'user',
        content: 'Test retry'
      };

      const response = await adapter.executeSync(message);

      expect(attempts).toBe(3);
      expect(response.content).toBe('Success');
    });
  });
});
```

### 7.2 Integration Testing with Real CLIs

```typescript
/**
 * Integration tests with actual CLI tools
 * These tests require the CLI tools to be installed
 */
describe('CLI Integration Tests', () => {
  // Skip if CLI not available
  const skipIfMissing = (command: string) => {
    try {
      require('child_process').execSync(`which ${command}`);
      return false;
    } catch {
      return true;
    }
  };

  describe('Codex CLI', () => {
    const skip = skipIfMissing('openai');

    (skip ? it.skip : it)('should execute real codex command', async () => {
      const adapter = new CodexCLIAdapter({
        apiKey: process.env.OPENAI_API_KEY!,
        command: 'openai'
      });

      const message: A2AMessage = {
        id: 'integration-1',
        role: 'user',
        content: 'Write a function to add two numbers'
      };

      const response = await adapter.executeSync(message);

      expect(response.content).toBeTruthy();
      expect(response.content).toContain('function');

      await adapter.cleanup();
    }, 30000); // 30 second timeout for real API call
  });

  describe('Cursor Agent', () => {
    const skip = skipIfMissing('cursor-agent');

    (skip ? it.skip : it)('should execute real cursor command', async () => {
      const adapter = new CursorAgentAdapter({
        apiKey: process.env.CURSOR_API_KEY!,
        projectRoot: process.cwd(),
        command: 'cursor-agent'
      });

      const message: A2AMessage = {
        id: 'integration-2',
        role: 'user',
        content: 'Analyze the project structure'
      };

      const response = await adapter.executeSync(message);

      expect(response.content).toBeTruthy();

      await adapter.cleanup();
    }, 30000);
  });
});
```

### 7.3 Mock CLI Response Fixtures

```typescript
/**
 * Fixture data for testing CLI responses
 */
export const CLIFixtures = {
  codex: {
    success: {
      stdout: JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'function add(a, b) { return a + b; }'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35
        }
      }),
      stderr: '',
      exitCode: 0
    },

    error: {
      stdout: '',
      stderr: 'Error: Invalid API key',
      exitCode: 1
    }
  },

  cursor: {
    success: {
      stdout: JSON.stringify({
        id: 'cursor-session-123',
        sessionId: 'sess-abc',
        response: 'Analysis complete',
        fileChanges: [
          { file: 'src/main.ts', action: 'modified' }
        ],
        suggestions: [
          'Consider adding error handling'
        ]
      }),
      stderr: '',
      exitCode: 0
    }
  },

  gemini: {
    success: {
      stdout: [
        JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: 'First chunk of response' }]
            }
          }]
        }),
        JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: ' second chunk' }]
            },
            finishReason: 'STOP'
          }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 15
          }
        })
      ].join('\n'),
      stderr: '',
      exitCode: 0
    }
  }
};

/**
 * Test helper to create mock adapter with fixture data
 */
export function createMockAdapter(
  AdapterClass: typeof CLIAdapter,
  fixture: any
): CLIAdapter {
  const adapter = new AdapterClass({
    apiKey: 'test-key',
    command: 'test-command'
  } as any);

  // Mock spawnProcess to return fixture data
  jest.spyOn(adapter as any, 'spawnProcess').mockImplementation(async () => {
    const mockProcess = new MockChildProcess();

    setTimeout(() => {
      if (fixture.stdout) {
        mockProcess.stdout.push(fixture.stdout);
      }
      if (fixture.stderr) {
        mockProcess.stderr.push(fixture.stderr);
      }

      mockProcess.stdout.endStream();
      mockProcess.stderr.endStream();
      mockProcess.emit('exit', fixture.exitCode, null);
    }, 10);

    return mockProcess;
  });

  return adapter;
}
```

### 7.4 Performance Benchmarks

```typescript
/**
 * Performance benchmarks for CLI adapters
 */
describe('Performance Benchmarks', () => {
  it('should handle 100 concurrent requests', async () => {
    const adapter = new CodexCLIAdapter({
      apiKey: 'test-key',
      command: 'openai',
      maxProcesses: 10
    });

    const messages = Array.from({ length: 100 }, (_, i) => ({
      id: `perf-${i}`,
      role: 'user' as const,
      content: `Test message ${i}`
    }));

    const startTime = Date.now();

    const responses = await Promise.all(
      messages.map(msg => adapter.executeSync(msg))
    );

    const duration = Date.now() - startTime;

    expect(responses).toHaveLength(100);
    expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds

    console.log(`Processed 100 requests in ${duration}ms`);
    console.log(`Average: ${duration / 100}ms per request`);

    await adapter.cleanup();
  }, 60000);

  it('should efficiently reuse processes', async () => {
    const adapter = new CursorAgentAdapter({
      apiKey: 'test-key',
      projectRoot: process.cwd(),
      command: 'cursor-agent',
      reuseProcesses: true
    });

    const sessionManager = new SessionManager();
    let session = await sessionManager.getSession(adapter);

    // Execute multiple messages in same session
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: `session-${i}`,
      role: 'user' as const,
      content: `Session message ${i}`
    }));

    const startTime = Date.now();

    for (const msg of messages) {
      await adapter.executeSync(msg);
    }

    const duration = Date.now() - startTime;

    console.log(`10 session requests in ${duration}ms`);
    console.log(`Average: ${duration / 10}ms per request`);

    await sessionManager.cleanup();
  }, 60000);

  it('should benchmark context strategies', async () => {
    const adapter = new CodexCLIAdapter({
      apiKey: 'test-key',
      command: 'openai'
    });

    const sizes = [1000, 10000, 100000, 1000000]; // 1KB, 10KB, 100KB, 1MB
    const results: any[] = [];

    for (const size of sizes) {
      const content = 'x'.repeat(size);
      const message: A2AMessage = {
        id: `size-${size}`,
        role: 'user',
        content
      };

      const strategy = adapter['selectContextStrategy'](message);
      const startTime = Date.now();

      try {
        await adapter.executeSync(message);
        const duration = Date.now() - startTime;

        results.push({
          size,
          strategy,
          duration,
          throughput: (size / duration) * 1000 // bytes per second
        });
      } catch (error) {
        results.push({
          size,
          strategy,
          error: error.message
        });
      }
    }

    console.table(results);

    await adapter.cleanup();
  }, 120000);
});
```

---

## 8. Configuration Schema

### 8.1 YAML Configuration Format

```yaml
# claude-flow-cli-adapters.yaml

# Global CLI adapter settings
global:
  # Default timeout for all CLI operations (ms)
  defaultTimeout: 30000

  # Maximum concurrent processes across all adapters
  maxGlobalProcesses: 20

  # Enable response caching
  enableCaching: true
  cacheTTL: 300000  # 5 minutes

  # Resource limits
  resources:
    maxMemoryPerProcessMB: 512
    maxProcessDurationMs: 60000

  # Retry configuration
  retry:
    maxAttempts: 3
    backoffMs: 1000
    backoffStrategy: exponential  # fixed, linear, exponential
    retryableExitCodes: [1, 2, 143]

# Adapter-specific configurations
adapters:
  # OpenAI Codex CLI Adapter
  codex-cli:
    enabled: true
    command: openai
    baseArgs: ["api", "chat.completions.create"]

    environment:
      OPENAI_API_KEY: "${OPENAI_API_KEY}"

    config:
      model: gpt-4
      temperature: 0.7
      maxTokens: 2048
      systemPrompt: "You are a helpful coding assistant."

    performance:
      timeout: 30000
      maxProcesses: 5
      reuseProcesses: false

    contextStrategy:
      default: stdin
      thresholds:
        stdinMaxBytes: 10240      # Use stdin for < 10KB
        tempFileMaxBytes: 1048576 # Use temp file for < 1MB
        # Use working dir for > 1MB

  # Cursor Agent Adapter
  cursor-agent:
    enabled: true
    command: cursor-agent
    baseArgs: ["--format", "json"]

    environment:
      CURSOR_API_KEY: "${CURSOR_API_KEY}"
      CURSOR_PROJECT_ROOT: "${WORKSPACE_ROOT}"

    config:
      projectRoot: "${WORKSPACE_ROOT}"
      enableLSP: true
      features:
        pairProgramming: true
        suggestions: true
        refactoring: true

    performance:
      timeout: 60000  # Cursor may need more time
      maxProcesses: 3
      reuseProcesses: true  # Benefit from session reuse

    contextStrategy:
      default: working_dir
      fileContext:
        maxFiles: 10
        includePatterns:
          - "**/*.ts"
          - "**/*.js"
          - "**/*.tsx"
          - "**/*.jsx"
        excludePatterns:
          - "**/node_modules/**"
          - "**/dist/**"

  # Google Gemini CLI Adapter
  gemini-cli:
    enabled: true
    command: gemini-cli
    baseArgs: ["--stream", "--format", "json"]

    environment:
      GOOGLE_API_KEY: "${GOOGLE_API_KEY}"

    config:
      model: gemini-pro
      multiModal: false

      generationConfig:
        temperature: 0.7
        topP: 0.8
        topK: 40
        maxOutputTokens: 2048

      safetySettings:
        - harmCategory: HARM_CATEGORY_HARASSMENT
          threshold: BLOCK_MEDIUM_AND_ABOVE
        - harmCategory: HARM_CATEGORY_HATE_SPEECH
          threshold: BLOCK_MEDIUM_AND_ABOVE

    performance:
      timeout: 45000
      maxProcesses: 4
      reuseProcesses: false

    contextStrategy:
      default: stdin
      multiModal:
        enabled: true
        maxAttachmentSizeMB: 10

# Process pool configuration
processPool:
  enabled: true
  maxIdleTime: 60000  # 60 seconds
  cleanupInterval: 30000  # Check every 30 seconds
  maxProcessAge: 1800000  # 30 minutes

# Session management
sessions:
  enabled: true
  maxSessionAge: 1800000  # 30 minutes
  cleanupInterval: 60000  # Check every minute

# Monitoring and logging
monitoring:
  enabled: true

  metrics:
    - executionTime
    - memoryUsage
    - exitCodes
    - errorRates

  logging:
    level: info  # debug, info, warn, error
    includeStderr: true
    logDirectory: ./logs/cli-adapters

# Error handling
errorHandling:
  captureStderr: true
  maxStderrLength: 10240  # 10KB

  notifications:
    enabled: false
    webhookUrl: "${ERROR_WEBHOOK_URL}"
```

### 8.2 TypeScript Configuration Types

```typescript
/**
 * Complete type definitions for CLI adapter configuration
 */
export interface CLIAdapterConfiguration {
  global: GlobalConfig;
  adapters: Record<string, AdapterConfig>;
  processPool: ProcessPoolConfig;
  sessions: SessionConfig;
  monitoring: MonitoringConfig;
  errorHandling: ErrorHandlingConfig;
}

export interface GlobalConfig {
  defaultTimeout: number;
  maxGlobalProcesses: number;
  enableCaching: boolean;
  cacheTTL: number;
  resources: ResourceConfig;
  retry: RetryConfig;
}

export interface ResourceConfig {
  maxMemoryPerProcessMB: number;
  maxProcessDurationMs: number;
}

export interface AdapterConfig {
  enabled: boolean;
  command: string;
  baseArgs: string[];
  environment: Record<string, string>;
  config: any;
  performance: PerformanceConfig;
  contextStrategy: ContextStrategyConfig;
}

export interface PerformanceConfig {
  timeout: number;
  maxProcesses: number;
  reuseProcesses: boolean;
}

export interface ContextStrategyConfig {
  default: ContextStrategy;
  thresholds?: {
    stdinMaxBytes?: number;
    tempFileMaxBytes?: number;
  };
  fileContext?: FileContextConfig;
  multiModal?: MultiModalConfig;
}

export interface FileContextConfig {
  maxFiles: number;
  includePatterns: string[];
  excludePatterns: string[];
}

export interface MultiModalConfig {
  enabled: boolean;
  maxAttachmentSizeMB: number;
}

export interface ProcessPoolConfig {
  enabled: boolean;
  maxIdleTime: number;
  cleanupInterval: number;
  maxProcessAge: number;
}

export interface SessionConfig {
  enabled: boolean;
  maxSessionAge: number;
  cleanupInterval: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  logging: LoggingConfig;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  includeStderr: boolean;
  logDirectory: string;
}

export interface ErrorHandlingConfig {
  captureStderr: boolean;
  maxStderrLength: number;
  notifications: NotificationConfig;
}

export interface NotificationConfig {
  enabled: boolean;
  webhookUrl?: string;
}

/**
 * Configuration loader
 */
export class ConfigLoader {
  /**
   * Load configuration from YAML file
   */
  static async loadFromFile(filePath: string): Promise<CLIAdapterConfiguration> {
    const fs = require('fs').promises;
    const yaml = require('yaml');

    const content = await fs.readFile(filePath, 'utf-8');
    const config = yaml.parse(content);

    // Expand environment variables
    return this.expandEnvironmentVariables(config);
  }

  /**
   * Expand environment variable references in configuration
   */
  private static expandEnvironmentVariables(config: any): any {
    const expand = (value: any): any => {
      if (typeof value === 'string') {
        return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
          return process.env[varName] || '';
        });
      }

      if (Array.isArray(value)) {
        return value.map(expand);
      }

      if (typeof value === 'object' && value !== null) {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = expand(val);
        }
        return result;
      }

      return value;
    };

    return expand(config);
  }

  /**
   * Validate configuration
   */
  static validate(config: CLIAdapterConfiguration): ValidationResult {
    const errors: string[] = [];

    // Validate global config
    if (config.global.defaultTimeout <= 0) {
      errors.push('global.defaultTimeout must be positive');
    }

    // Validate adapters
    for (const [name, adapter] of Object.entries(config.adapters)) {
      if (adapter.enabled && !adapter.command) {
        errors.push(`adapters.${name}.command is required`);
      }

      if (adapter.performance.timeout <= 0) {
        errors.push(`adapters.${name}.performance.timeout must be positive`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### 8.3 Configuration Examples

```yaml
# Example: Development configuration
# claude-flow-cli-adapters.dev.yaml

global:
  defaultTimeout: 60000  # Longer timeouts for debugging
  maxGlobalProcesses: 5
  enableCaching: false   # Disable caching in dev

  resources:
    maxMemoryPerProcessMB: 1024  # More memory for dev
    maxProcessDurationMs: 120000

adapters:
  codex-cli:
    enabled: true
    command: openai
    environment:
      OPENAI_API_KEY: "${OPENAI_API_KEY}"
      OPENAI_ORG_ID: "${OPENAI_ORG_ID}"

    config:
      model: gpt-4
      temperature: 0.9  # More creative in dev

    performance:
      timeout: 60000
      maxProcesses: 2

monitoring:
  enabled: true
  logging:
    level: debug  # Verbose logging in dev
    includeStderr: true
    logDirectory: ./logs/dev

---

# Example: Production configuration
# claude-flow-cli-adapters.prod.yaml

global:
  defaultTimeout: 30000
  maxGlobalProcesses: 50
  enableCaching: true
  cacheTTL: 600000  # 10 minutes

  resources:
    maxMemoryPerProcessMB: 512
    maxProcessDurationMs: 60000

  retry:
    maxAttempts: 5
    backoffMs: 2000
    backoffStrategy: exponential

adapters:
  codex-cli:
    enabled: true
    command: openai
    environment:
      OPENAI_API_KEY: "${OPENAI_API_KEY_PROD}"

    config:
      model: gpt-4
      temperature: 0.7
      maxTokens: 2048

    performance:
      timeout: 30000
      maxProcesses: 20
      reuseProcesses: false

processPool:
  enabled: true
  maxIdleTime: 30000
  cleanupInterval: 15000
  maxProcessAge: 600000  # 10 minutes

sessions:
  enabled: true
  maxSessionAge: 900000  # 15 minutes
  cleanupInterval: 60000

monitoring:
  enabled: true
  metrics:
    - executionTime
    - memoryUsage
    - exitCodes
    - errorRates
    - throughput

  logging:
    level: warn  # Only warnings and errors in prod
    includeStderr: true
    logDirectory: /var/log/claude-flow/cli-adapters

errorHandling:
  captureStderr: true
  maxStderrLength: 10240

  notifications:
    enabled: true
    webhookUrl: "${PROD_ERROR_WEBHOOK}"
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Implement base `CLIAdapter` class
- [ ] Implement context strategy helpers
- [ ] Create process execution utilities
- [ ] Build error handling framework
- [ ] Write comprehensive unit tests

### Phase 2: Concrete Adapters (Week 3-4)
- [ ] Implement `CodexCLIAdapter`
- [ ] Implement `CursorAgentAdapter`
- [ ] Implement `GeminiCLIAdapter`
- [ ] Add adapter-specific optimizations
- [ ] Create integration tests

### Phase 3: Performance (Week 5-6)
- [ ] Implement process pool management
- [ ] Build session manager
- [ ] Add response caching
- [ ] Create resource monitoring
- [ ] Performance benchmarking

### Phase 4: Configuration (Week 7-8)
- [ ] Define configuration schema
- [ ] Implement config loader
- [ ] Add environment variable expansion
- [ ] Create validation logic
- [ ] Documentation and examples

### Phase 5: Integration (Week 9-10)
- [ ] Integrate with A2A router
- [ ] Add to adapter registry
- [ ] Update orchestration layer
- [ ] End-to-end testing
- [ ] Production deployment

---

## 10. Architecture Decision Records

### ADR-001: Process Pooling vs One-Shot Execution

**Context**: CLI processes have startup overhead. Should we reuse processes or create new ones for each request?

**Decision**: Support both modes, configurable per adapter.

**Rationale**:
- Codex CLI: One-shot (stateless, API-based)
- Cursor Agent: Process reuse (stateful, session-based)
- Gemini CLI: One-shot (stateless, streaming)

**Consequences**:
- ✓ Flexibility for different CLI characteristics
- ✓ Optimal performance per adapter type
- ✗ More complex implementation
- ✗ Need lifecycle management for both modes

---

### ADR-002: Context Passing Strategy Selection

**Context**: Different CLIs have different optimal ways to receive context (stdin, files, args, env).

**Decision**: Implement multiple strategies with automatic selection based on content size and type.

**Rationale**:
- Small contexts (< 10KB): stdin is fastest
- Medium contexts (10KB - 1MB): temp files avoid buffer limits
- Large contexts (> 1MB): working directory is most efficient
- Configuration data: environment variables are standard

**Consequences**:
- ✓ Optimal performance for each context size
- ✓ Handles edge cases (stdin buffer limits)
- ✗ More complex strategy selection logic
- ✗ Need cleanup for temp files

---

### ADR-003: Streaming vs Batch Output

**Context**: Some CLIs (Gemini) support streaming, others (Codex) return complete responses.

**Decision**: Implement streaming by default with chunked parsing, accumulate for non-streaming CLIs.

**Rationale**:
- Streaming provides real-time feedback
- Can parse partial JSON for progressive results
- Accumulation works for all CLI types

**Consequences**:
- ✓ Better user experience with streaming
- ✓ Lower latency to first token
- ✗ More complex parsing logic
- ✗ Need to handle incomplete JSON

---

## 11. Security Considerations

### 11.1 Shell Injection Prevention

```typescript
/**
 * Secure command execution helpers
 */
export class SecureExecution {
  /**
   * Safely escape shell argument
   */
  static escapeArg(arg: string): string {
    // Use single quotes and escape any single quotes in the string
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Validate command path
   */
  static validateCommand(command: string): boolean {
    // Only allow alphanumeric, dash, underscore, and slash
    return /^[a-zA-Z0-9\-_\/]+$/.test(command);
  }

  /**
   * Sanitize environment variables
   */
  static sanitizeEnv(env: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      // Only allow safe keys
      if (/^[A-Z_][A-Z0-9_]*$/.test(key)) {
        // Remove null bytes and newlines from values
        sanitized[key] = value.replace(/[\x00\n\r]/g, '');
      }
    }

    return sanitized;
  }
}
```

### 11.2 Credential Management

- **Never log API keys**: Sanitize logs before writing
- **Environment variables**: Preferred method for credentials
- **File permissions**: Ensure config files are 0600
- **Secret rotation**: Support dynamic credential updates
- **Vault integration**: Optional integration with HashiCorp Vault

---

## 12. Monitoring and Observability

### 12.1 Metrics to Track

```typescript
export interface CLIAdapterMetrics {
  // Performance metrics
  executionTime: number[];
  processSpawnTime: number[];
  contextPreparationTime: number[];
  outputParsingTime: number[];

  // Resource metrics
  peakMemoryUsage: number[];
  cpuTime: number[];

  // Success/failure metrics
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  retryCount: number;

  // Exit code distribution
  exitCodes: Record<number, number>;

  // Context strategy usage
  strategyUsage: Record<ContextStrategy, number>;
}
```

### 12.2 Logging Structure

```typescript
export interface CLIAdapterLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  adapter: string;
  operation: string;
  pid?: number;

  details: {
    command?: string;
    args?: string[];
    exitCode?: number;
    executionTime?: number;
    error?: string;
    stderr?: string;
  };
}
```

---

## 13. Conclusion

This architecture provides a robust, performant, and extensible foundation for integrating CLI-based coding agents into Claude Flow's A2A system. The design balances:

- **Flexibility**: Multiple context strategies, configurable per adapter
- **Performance**: Process pooling, session reuse, response caching
- **Reliability**: Comprehensive error handling, retry logic, resource limits
- **Security**: Safe shell execution, credential management
- **Maintainability**: Clear abstractions, extensive testing, good documentation

The architecture is immediately implementable and provides a solid foundation for future CLI adapter additions.
