/**
 * Base CLI Adapter for Agent-to-Agent Communication
 *
 * Provides process lifecycle management, stdio communication, context passing strategies,
 * error handling with retry logic, and resource monitoring for CLI-based coding agents.
 *
 * @module base-cli-adapter
 */

import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Base configuration for all CLI adapters
 */
export interface CLIAdapterConfig {
  /** Command to execute (e.g., "openai", "cursor-agent", "gemini-cli") */
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
 * CLI execution error with recovery strategies
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
 * Generic A2A message interface (adapt to your actual A2A message format)
 */
export interface A2AMessage {
  id?: string;
  role: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Generic A2A response interface (adapt to your actual A2A response format)
 */
export interface A2AResponse {
  id: string;
  role: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Abstract base class for all CLI adapters
 *
 * @example
 * ```typescript
 * class MyAdapter extends CLIAdapter {
 *   protected getCommand(): string { return 'my-cli'; }
 *   protected getArgs(message: A2AMessage): string[] { return ['--prompt', message.content]; }
 *   protected selectContextStrategy(message: A2AMessage): ContextStrategy { return ContextStrategy.STDIN; }
 *   protected formatInput(message: A2AMessage, strategy: ContextStrategy): string { return message.content; }
 *   protected parseOutput(output: CLIOutput): A2AResponse {
 *     return { id: 'resp', role: 'assistant', content: output.stdout };
 *   }
 *   protected getEnvironment(): Record<string, string> { return {}; }
 *   protected async spawnProcess(args: string[]): Promise<ChildProcess> {
 *     return spawn(this.getCommand(), args, { stdio: ['pipe', 'pipe', 'pipe'] });
 *   }
 * }
 * ```
 */
export abstract class CLIAdapter extends EventEmitter {
  protected config: Required<CLIAdapterConfig>;
  protected state: ProcessState = ProcessState.IDLE;
  protected currentProcess?: ChildProcess;
  protected processPool: ChildProcess[] = [];
  private tempFiles: string[] = [];

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
   * Get the command to execute (e.g., "openai", "cursor-agent")
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

  /**
   * Low-level process spawning (override for custom spawn behavior)
   */
  protected abstract spawnProcess(args: string[]): Promise<ChildProcess>;

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
    await this.cleanupTempFiles();
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
        try {
          process.kill('SIGKILL');
        } catch (error) {
          // Process may have already exited
        }
        resolve();
      }, 5000);

      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Attempt graceful termination
      try {
        process.kill('SIGTERM');
      } catch (error) {
        // Process may have already exited
        clearTimeout(timeout);
        resolve();
      }
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
    if (this.config.maxMemoryMB && process.pid) {
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
      const { execSync } = await import('child_process');
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
    const startTime = Date.now();

    for await (const chunk of this.receive(process)) {
      chunks.push(chunk);

      // Try to parse partial response
      try {
        const partialOutput: CLIOutput = {
          stdout: chunks.join(''),
          stderr: errors.join(''),
          exitCode: -1,
          executionTime: Date.now() - startTime,
          pid: process.pid!
        };

        yield this.parseOutput(partialOutput);
      } catch {
        // Parsing failed, wait for more data
      }
    }

    // Final response with complete output
    const exitCode = await this.getExitCode(process);
    const finalOutput: CLIOutput = {
      stdout: chunks.join(''),
      stderr: errors.join(''),
      exitCode,
      executionTime: Date.now() - startTime,
      pid: process.pid!
    };

    if (exitCode !== 0 && finalOutput.stdout.trim() === '') {
      throw CLIError.fromExitCode(exitCode, finalOutput.stderr, process.pid!);
    }

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

  // ========== Context Strategy Helpers ==========

  /**
   * Create temporary file with context
   */
  protected async createTempFile(content: string, prefix: string = 'context'): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
    const tempFile = path.join(tempDir, 'context.txt');

    await fs.writeFile(tempFile, content, 'utf-8');
    this.tempFiles.push(tempFile);

    return tempFile;
  }

  /**
   * Cleanup all temporary files
   */
  protected async cleanupTempFiles(): Promise<void> {
    for (const tempFile of this.tempFiles) {
      try {
        await fs.unlink(tempFile);
        await fs.rmdir(path.dirname(tempFile));
      } catch {
        // Ignore cleanup errors
      }
    }
    this.tempFiles = [];
  }

  /**
   * Safely escape shell arguments
   */
  protected escapeShellArg(arg: string): string {
    // Use proper shell escaping
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Build environment with safe values
   */
  protected buildEnvironment(
    additions: Record<string, string>
  ): Record<string, string> {
    return {
      ...process.env,
      ...this.config.environment,
      ...additions,
      // Ensure PATH is preserved
      PATH: process.env.PATH || ''
    };
  }
}
