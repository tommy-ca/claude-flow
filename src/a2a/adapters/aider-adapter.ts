/**
 * Aider Adapter
 * Integrates with Aider CLI for Git-aware code editing
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
  A2AError
} from './base-adapter';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

// ============================================================================
// Aider-Specific Types
// ============================================================================

export interface AiderConfig extends AgentConfig {
  type: 'aider';
  workspaceRoot: string;
  aiderPath?: string;
  model?: string;
  autoCommit?: boolean;
  editFormat?: 'whole' | 'diff' | 'udiff';
  darkMode?: boolean;
  stream?: boolean;
}

interface AiderCommand {
  type: 'edit' | 'add' | 'drop' | 'commit' | 'undo' | 'diff' | 'run';
  args: string[];
  input?: string;
  files?: string[];
}

interface AiderOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
  filesModified?: string[];
  commitHash?: string;
  diff?: string;
}

interface GitStatus {
  branch: string;
  modified: string[];
  untracked: string[];
  staged: string[];
  clean: boolean;
}

// ============================================================================
// Aider Adapter Implementation
// ============================================================================

export class AiderAdapter extends BaseAgentAdapter {
  private workspaceRoot!: string;
  private aiderPath: string = 'aider';
  private model: string = 'gpt-4';
  private autoCommit: boolean = false;
  private editFormat: 'whole' | 'diff' | 'udiff' = 'diff';
  private darkMode: boolean = false;
  private enableStreaming: boolean = true;
  private sessionFiles: Set<string> = new Set();

  // ========================================
  // Lifecycle
  // ========================================

  protected async doInitialize(): Promise<void> {
    const config = this.config as AiderConfig;

    if (!config.workspaceRoot) {
      throw new AdapterError(
        'AIDER-CFG-001',
        'Workspace root is required',
        ErrorCategory.CONFIGURATION
      );
    }

    this.workspaceRoot = config.workspaceRoot;
    this.aiderPath = config.aiderPath || this.aiderPath;
    this.model = config.model || this.model;
    this.autoCommit = config.autoCommit ?? this.autoCommit;
    this.editFormat = config.editFormat || this.editFormat;
    this.darkMode = config.darkMode ?? this.darkMode;
    this.enableStreaming = config.stream ?? this.enableStreaming;

    // Verify workspace and git
    await this.verifyGitRepository();

    // Test aider installation
    await this.testAiderInstallation();
  }

  protected async doShutdown(): Promise<void> {
    this.sessionFiles.clear();
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      await this.verifyGitRepository();
      await this.testAiderInstallation();
      return true;
    } catch {
      return false;
    }
  }

  private async verifyGitRepository(): Promise<void> {
    const gitDir = path.join(this.workspaceRoot, '.git');
    try {
      const stats = await fs.stat(gitDir);
      if (!stats.isDirectory()) {
        throw new Error('Not a git repository');
      }
    } catch (error: any) {
      throw new AdapterError(
        'AIDER-GIT-001',
        'Workspace must be a git repository',
        ErrorCategory.CONFIGURATION
      );
    }
  }

  private async testAiderInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.aiderPath, ['--version']);

      proc.on('error', (error) => {
        reject(new AdapterError(
          'AIDER-INST-001',
          `Aider not found: ${error.message}`,
          ErrorCategory.CONFIGURATION
        ));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new AdapterError(
            'AIDER-INST-002',
            'Aider installation check failed',
            ErrorCategory.CONFIGURATION
          ));
        }
      });
    });
  }

  // ========================================
  // Capabilities
  // ========================================

  getCapabilities(): AgentCapabilities {
    return {
      supported: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.CODE_REFACTORING,
        AgentCapability.FILE_EDITING,
        AgentCapability.GIT_OPERATIONS,
        AgentCapability.GIT_AWARE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.WORKSPACE_AWARENESS,
        AgentCapability.MULTI_FILE_CONTEXT,
        AgentCapability.AUTONOMOUS_EXECUTION
      ],
      operations: [
        'code.generate',
        'code.edit',
        'code.refactor',
        'file.edit',
        'git.commit',
        'git.diff',
        'git.status',
        'terminal.execute'
      ],
      limitations: {
        maxContextSize: 32000,
        fileTypes: ['*']
      },
      metadata: {
        version: '1.0.0',
        model: this.model,
        provider: 'aider'
      }
    };
  }

  // ========================================
  // Request Execution
  // ========================================

  protected async executeRequest(nativeRequest: AiderCommand, message: A2AMessage): Promise<any> {
    switch (nativeRequest.type) {
      case 'edit':
        return this.executeEdit(nativeRequest);

      case 'add':
        return this.executeAddFiles(nativeRequest);

      case 'drop':
        return this.executeDropFiles(nativeRequest);

      case 'commit':
        return this.executeCommit(nativeRequest);

      case 'undo':
        return this.executeUndo();

      case 'diff':
        return this.executeGitDiff(nativeRequest);

      case 'run':
        return this.executeCommand(nativeRequest);

      default:
        throw new AdapterError(
          'AIDER-OP-001',
          `Operation ${nativeRequest.type} not supported`,
          ErrorCategory.UNSUPPORTED
        );
    }
  }

  protected async *executeStreamRequest(
    nativeRequest: AiderCommand,
    message: A2AMessage
  ): AsyncIterator<StreamChunk> {
    if (nativeRequest.type !== 'edit') {
      // Non-edit operations don't stream
      const result = await this.executeRequest(nativeRequest, message);
      yield { id: message.id, type: 'delta', data: result };
      yield { id: message.id, type: 'complete', data: null };
      return;
    }

    // Stream edit operation
    const args = this.buildAiderArgs(nativeRequest);
    const proc = spawn(this.aiderPath, args, {
      cwd: this.workspaceRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;

      // Yield incremental output
      yield {
        id: message.id,
        type: 'delta',
        data: {
          type: 'stdout',
          content: chunk,
          timestamp: Date.now()
        }
      };
    });

    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;

      yield {
        id: message.id,
        type: 'delta',
        data: {
          type: 'stderr',
          content: chunk,
          timestamp: Date.now()
        }
      };
    });

    // Write input if provided
    if (nativeRequest.input) {
      proc.stdin.write(nativeRequest.input + '\n');
      proc.stdin.end();
    }

    // Wait for completion
    await new Promise((resolve) => {
      proc.on('close', resolve);
    });

    // Parse output for modified files
    const filesModified = this.parseModifiedFiles(stdout);
    const commitHash = this.parseCommitHash(stdout);

    yield {
      id: message.id,
      type: 'complete',
      data: {
        success: proc.exitCode === 0,
        filesModified,
        commitHash,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      }
    };
  }

  // ========================================
  // Operation Implementations
  // ========================================

  private async executeEdit(command: AiderCommand): Promise<AiderOutput> {
    const args = this.buildAiderArgs(command);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.aiderPath, args, {
        cwd: this.workspaceRoot
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Write input if provided
      if (command.input) {
        proc.stdin.write(command.input + '\n');
        proc.stdin.end();
      }

      proc.on('close', (code) => {
        const filesModified = this.parseModifiedFiles(stdout);
        const commitHash = this.parseCommitHash(stdout);

        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          filesModified,
          commitHash
        });
      });

      proc.on('error', (error) => {
        reject(new AdapterError(
          'AIDER-EXEC-001',
          `Failed to execute aider: ${error.message}`,
          ErrorCategory.SYSTEM
        ));
      });
    });
  }

  private async executeAddFiles(command: AiderCommand): Promise<AiderOutput> {
    command.files?.forEach(f => this.sessionFiles.add(f));

    return {
      success: true,
      stdout: `Added ${command.files?.length || 0} files to session`,
      stderr: '',
      filesModified: command.files
    };
  }

  private async executeDropFiles(command: AiderCommand): Promise<AiderOutput> {
    command.files?.forEach(f => this.sessionFiles.delete(f));

    return {
      success: true,
      stdout: `Removed ${command.files?.length || 0} files from session`,
      stderr: '',
      filesModified: command.files
    };
  }

  private async executeCommit(command: AiderCommand): Promise<AiderOutput> {
    const message = command.args[0] || 'Aider commit';

    return new Promise((resolve, reject) => {
      const proc = spawn('git', ['commit', '-am', message], {
        cwd: this.workspaceRoot
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const commitHash = this.parseCommitHash(stdout);

        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          commitHash
        });
      });

      proc.on('error', (error) => {
        reject(new AdapterError(
          'AIDER-GIT-002',
          `Git commit failed: ${error.message}`,
          ErrorCategory.SYSTEM
        ));
      });
    });
  }

  private async executeUndo(): Promise<AiderOutput> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', ['reset', 'HEAD~1'], {
        cwd: this.workspaceRoot
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      proc.on('error', (error) => {
        reject(new AdapterError(
          'AIDER-GIT-003',
          `Git undo failed: ${error.message}`,
          ErrorCategory.SYSTEM
        ));
      });
    });
  }

  private async executeGitDiff(command: AiderCommand): Promise<AiderOutput> {
    const args = ['diff'];
    if (command.files && command.files.length > 0) {
      args.push(...command.files);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, {
        cwd: this.workspaceRoot
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          diff: stdout.trim()
        });
      });

      proc.on('error', (error) => {
        reject(new AdapterError(
          'AIDER-GIT-004',
          `Git diff failed: ${error.message}`,
          ErrorCategory.SYSTEM
        ));
      });
    });
  }

  private async executeCommand(command: AiderCommand): Promise<AiderOutput> {
    const [cmd, ...args] = command.args;

    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        cwd: this.workspaceRoot
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      proc.on('error', (error) => {
        reject(new AdapterError(
          'AIDER-CMD-001',
          `Command execution failed: ${error.message}`,
          ErrorCategory.SYSTEM
        ));
      });
    });
  }

  // ========================================
  // Protocol Translation
  // ========================================

  translateRequest(a2aMsg: A2AMessage): AiderCommand {
    const payload = a2aMsg.payload;

    switch (a2aMsg.operation) {
      case 'code.edit':
      case 'code.generate':
      case 'code.refactor':
      case 'file.edit':
        return {
          type: 'edit',
          args: [],
          input: payload.prompt || payload.instruction || payload.message,
          files: payload.files || (payload.filePath ? [payload.filePath] : [])
        };

      case 'git.commit':
        return {
          type: 'commit',
          args: [payload.message || 'Automated commit'],
          files: []
        };

      case 'git.diff':
        return {
          type: 'diff',
          args: [],
          files: payload.files || []
        };

      case 'git.status':
        return {
          type: 'run',
          args: ['git', 'status', '--short'],
          files: []
        };

      case 'terminal.execute':
        return {
          type: 'run',
          args: payload.command ? payload.command.split(' ') : payload.args || [],
          files: []
        };

      default:
        return {
          type: 'edit',
          args: [],
          input: JSON.stringify(payload),
          files: []
        };
    }
  }

  translateResponse(nativeResp: AiderOutput, requestId: string): A2AResponse {
    return {
      id: `aider_${Date.now()}`,
      messageId: requestId,
      status: nativeResp.success ? 'success' : 'error',
      payload: {
        output: nativeResp.stdout,
        error: nativeResp.stderr,
        filesModified: nativeResp.filesModified || [],
        commitHash: nativeResp.commitHash,
        diff: nativeResp.diff,
        exitCode: nativeResp.exitCode
      },
      metadata: {
        timestamp: Date.now(),
        duration: 0
      },
      error: nativeResp.success ? undefined : {
        code: 'AIDER-EXEC-002',
        message: nativeResp.stderr || 'Aider execution failed',
        category: ErrorCategory.SYSTEM,
        retryable: true
      }
    };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private buildAiderArgs(command: AiderCommand): string[] {
    const args = [
      '--yes',  // Auto-accept suggestions
      '--model', this.model,
      '--edit-format', this.editFormat
    ];

    if (this.autoCommit) {
      args.push('--auto-commits');
    } else {
      args.push('--no-auto-commits');
    }

    if (this.darkMode) {
      args.push('--dark-mode');
    }

    if (!this.enableStreaming) {
      args.push('--no-stream');
    }

    // Add files
    const files = command.files || Array.from(this.sessionFiles);
    if (files.length > 0) {
      args.push(...files);
    }

    // Add message if provided
    if (command.input) {
      args.push('--message', command.input);
    }

    return args;
  }

  private parseModifiedFiles(output: string): string[] {
    const files: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Look for patterns like "Modified: path/to/file.js"
      const match = line.match(/(?:Modified|Created|Updated):\s+(.+)/i);
      if (match) {
        files.push(match[1].trim());
      }
    }

    return files;
  }

  private parseCommitHash(output: string): string | undefined {
    // Look for git commit hash pattern
    const match = output.match(/\b([0-9a-f]{7,40})\b/);
    return match ? match[1] : undefined;
  }

  async getGitStatus(): Promise<GitStatus> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', ['status', '--porcelain', '--branch'], {
        cwd: this.workspaceRoot
      });

      let stdout = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new AdapterError(
            'AIDER-GIT-005',
            'Failed to get git status',
            ErrorCategory.SYSTEM
          ));
          return;
        }

        const lines = stdout.split('\n');
        const branchLine = lines[0];
        const branch = branchLine.match(/## (.+?)(?:\.\.\.|$)/)?.[1] || 'unknown';

        const modified: string[] = [];
        const untracked: string[] = [];
        const staged: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const status = line.substring(0, 2);
          const file = line.substring(3);

          if (status[0] === 'M' || status[1] === 'M') {
            modified.push(file);
          }
          if (status[0] === 'A') {
            staged.push(file);
          }
          if (status === '??') {
            untracked.push(file);
          }
        }

        resolve({
          branch,
          modified,
          untracked,
          staged,
          clean: modified.length === 0 && untracked.length === 0 && staged.length === 0
        });
      });

      proc.on('error', (error) => {
        reject(new AdapterError(
          'AIDER-GIT-006',
          `Git status failed: ${error.message}`,
          ErrorCategory.SYSTEM
        ));
      });
    });
  }
}

// ============================================================================
// Configuration Examples
// ============================================================================

export const AIDER_CONFIG_EXAMPLES = {
  default: {
    type: 'aider' as const,
    name: 'aider-default',
    workspaceRoot: process.cwd(),
    model: 'gpt-4',
    autoCommit: false,
    editFormat: 'diff' as const
  },
  autoCommit: {
    type: 'aider' as const,
    name: 'aider-auto',
    workspaceRoot: process.cwd(),
    model: 'gpt-4-turbo',
    autoCommit: true,
    editFormat: 'diff' as const,
    stream: true
  },
  claude: {
    type: 'aider' as const,
    name: 'aider-claude',
    workspaceRoot: process.cwd(),
    model: 'claude-3-opus-20240229',
    autoCommit: false,
    editFormat: 'udiff' as const,
    darkMode: true
  }
};
