/**
 * Context Builder for CLI Adapters
 *
 * Serializes and builds structured context for CLI agents including file context,
 * project metadata, task information, and memory context.
 *
 * @module context-builder
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * File context information
 */
export interface FileContext {
  /** File path relative to project root */
  path: string;

  /** File content */
  content: string;

  /** File language/type */
  language?: string;

  /** Line count */
  lines: number;

  /** File size in bytes */
  size: number;
}

/**
 * Project context metadata
 */
export interface ProjectContext {
  /** Project root directory */
  root: string;

  /** Detected language */
  language?: string;

  /** Detected framework */
  framework?: string;

  /** Package manager (npm, yarn, pnpm, etc.) */
  packageManager?: string;

  /** Build system */
  buildSystem?: string;

  /** Test framework */
  testFramework?: string;

  /** Dependencies */
  dependencies?: Record<string, string>;

  /** Dev dependencies */
  devDependencies?: Record<string, string>;
}

/**
 * Git repository information
 */
export interface GitInfo {
  /** Current branch */
  branch?: string;

  /** Commit hash */
  commit?: string;

  /** Uncommitted changes */
  hasChanges: boolean;

  /** Remote URL */
  remote?: string;
}

/**
 * Task context information
 */
export interface TaskContext {
  /** Task identifier */
  id: string;

  /** Task type */
  type: string;

  /** Task description */
  description: string;

  /** Task requirements */
  requirements?: string[];

  /** Related files */
  relatedFiles?: string[];
}

/**
 * Complete agent context
 */
export interface AgentContext {
  /** Task information */
  task: TaskContext;

  /** File context */
  files: FileContext[];

  /** Project metadata */
  project: ProjectContext;

  /** Git information */
  git?: GitInfo;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Context builder for creating structured context for CLI agents
 *
 * @example
 * ```typescript
 * const builder = new ContextBuilder('/path/to/project');
 *
 * // Build complete context
 * const context = await builder.buildTaskContext({
 *   id: 'task-1',
 *   type: 'refactor',
 *   description: 'Refactor authentication module',
 *   relatedFiles: ['src/auth.ts', 'src/middleware/auth.ts']
 * });
 *
 * // Serialize for CLI
 * const json = builder.serializeContext(context);
 * ```
 */
export class ContextBuilder {
  constructor(private projectRoot: string) {}

  /**
   * Build complete task context for CLI agents
   */
  public async buildTaskContext(task: TaskContext): Promise<AgentContext> {
    const [fileContext, projectContext, gitInfo] = await Promise.all([
      this.buildFileContext(task.relatedFiles || []),
      this.buildProjectContext(),
      this.getGitInfo()
    ]);

    return {
      task,
      files: fileContext,
      project: projectContext,
      git: gitInfo,
      metadata: {
        timestamp: Date.now(),
        workingDirectory: this.projectRoot
      }
    };
  }

  /**
   * Build file context from file paths
   */
  public async buildFileContext(filePaths: string[]): Promise<FileContext[]> {
    const contexts: FileContext[] = [];

    for (const filePath of filePaths) {
      try {
        const fullPath = path.join(this.projectRoot, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);

        contexts.push({
          path: filePath,
          content,
          language: this.detectLanguage(filePath),
          lines: content.split('\n').length,
          size: stats.size
        });
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return contexts;
  }

  /**
   * Build project context with metadata
   */
  public async buildProjectContext(): Promise<ProjectContext> {
    const context: ProjectContext = {
      root: this.projectRoot
    };

    // Detect package.json (Node.js)
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf-8')
      );

      context.language = 'javascript';
      context.dependencies = packageJson.dependencies;
      context.devDependencies = packageJson.devDependencies;

      // Detect framework
      if (packageJson.dependencies?.react) {
        context.framework = 'react';
      } else if (packageJson.dependencies?.vue) {
        context.framework = 'vue';
      } else if (packageJson.dependencies?.next) {
        context.framework = 'next.js';
      } else if (packageJson.dependencies?.express) {
        context.framework = 'express';
      }

      // Detect package manager
      if (await this.fileExists('pnpm-lock.yaml')) {
        context.packageManager = 'pnpm';
      } else if (await this.fileExists('yarn.lock')) {
        context.packageManager = 'yarn';
      } else if (await this.fileExists('package-lock.json')) {
        context.packageManager = 'npm';
      }

      // Detect test framework
      if (packageJson.devDependencies?.jest) {
        context.testFramework = 'jest';
      } else if (packageJson.devDependencies?.mocha) {
        context.testFramework = 'mocha';
      } else if (packageJson.devDependencies?.vitest) {
        context.testFramework = 'vitest';
      }

      // Detect build system
      if (packageJson.devDependencies?.webpack) {
        context.buildSystem = 'webpack';
      } else if (packageJson.devDependencies?.vite) {
        context.buildSystem = 'vite';
      } else if (packageJson.devDependencies?.rollup) {
        context.buildSystem = 'rollup';
      }
    } catch {
      // Not a Node.js project
    }

    // Detect Python
    if (!context.language) {
      if (await this.fileExists('requirements.txt') || await this.fileExists('pyproject.toml')) {
        context.language = 'python';

        if (await this.fileExists('setup.py')) {
          context.buildSystem = 'setuptools';
        }

        if (await this.fileExists('pytest.ini')) {
          context.testFramework = 'pytest';
        }
      }
    }

    // Detect Go
    if (!context.language && await this.fileExists('go.mod')) {
      context.language = 'go';
      context.buildSystem = 'go';
    }

    // Detect Rust
    if (!context.language && await this.fileExists('Cargo.toml')) {
      context.language = 'rust';
      context.buildSystem = 'cargo';
    }

    return context;
  }

  /**
   * Get Git repository information
   */
  public async getGitInfo(): Promise<GitInfo | undefined> {
    try {
      const isGitRepo = await this.fileExists('.git');
      if (!isGitRepo) {
        return undefined;
      }

      const branch = execSync('git branch --show-current', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();

      const commit = execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();

      const statusOutput = execSync('git status --porcelain', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });

      const hasChanges = statusOutput.trim().length > 0;

      let remote: string | undefined;
      try {
        remote = execSync('git remote get-url origin', {
          cwd: this.projectRoot,
          encoding: 'utf-8'
        }).trim();
      } catch {
        // No remote configured
      }

      return {
        branch,
        commit,
        hasChanges,
        remote
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Serialize context to JSON string
   */
  public serializeContext(context: AgentContext): string {
    return JSON.stringify(context, null, 2);
  }

  /**
   * Serialize context to compact JSON
   */
  public serializeContextCompact(context: AgentContext): string {
    return JSON.stringify(context);
  }

  /**
   * Build minimal context (only essential information)
   */
  public async buildMinimalContext(task: TaskContext): Promise<string> {
    return JSON.stringify({
      task: {
        id: task.id,
        description: task.description
      },
      project: {
        root: this.projectRoot
      }
    });
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.sh': 'shell',
      '.bash': 'shell',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown'
    };

    return languageMap[ext] || 'text';
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate file tree structure
   */
  public async generateFileTree(maxDepth: number = 3): Promise<string> {
    const tree: string[] = [];

    const walkDir = async (dir: string, depth: number, prefix: string = '') => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        // Filter out common ignore patterns
        const filtered = entries.filter(entry => {
          const name = entry.name;
          return !name.startsWith('.') &&
                 name !== 'node_modules' &&
                 name !== 'dist' &&
                 name !== 'build' &&
                 name !== '__pycache__';
        });

        for (let i = 0; i < filtered.length; i++) {
          const entry = filtered[i];
          const isLast = i === filtered.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          const extension = isLast ? '    ' : '│   ';

          tree.push(`${prefix}${connector}${entry.name}`);

          if (entry.isDirectory()) {
            await walkDir(
              path.join(dir, entry.name),
              depth + 1,
              prefix + extension
            );
          }
        }
      } catch {
        // Skip directories we can't read
      }
    };

    tree.push(path.basename(this.projectRoot));
    await walkDir(this.projectRoot, 0);

    return tree.join('\n');
  }
}

/**
 * Create a context builder instance
 */
export function createContextBuilder(projectRoot: string): ContextBuilder {
  return new ContextBuilder(projectRoot);
}
