/**
 * Cursor Adapter
 * Integrates with Cursor IDE for inline editing and LSP integration
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
// Cursor-Specific Types
// ============================================================================

export interface CursorConfig extends AgentConfig {
  type: 'cursor';
  workspaceRoot: string;
  cursorPath?: string;
  serverPort?: number;
  enableLSP?: boolean;
  inlineEditingMode?: 'ghost-text' | 'diff' | 'replace';
}

interface CursorRequest {
  method: string;
  params: any;
  id?: string;
}

interface CursorResponse {
  id?: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface InlineEdit {
  filePath: string;
  startLine: number;
  endLine: number;
  newText: string;
  mode: 'ghost-text' | 'diff' | 'replace';
}

interface LSPDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number;
  message: string;
  source?: string;
}

// ============================================================================
// Cursor Adapter Implementation
// ============================================================================

export class CursorAdapter extends BaseAgentAdapter {
  private workspaceRoot!: string;
  private cursorPath?: string;
  private serverPort: number = 3456;
  private cursorProcess?: ChildProcess;
  private enableLSP: boolean = true;
  private inlineEditingMode: 'ghost-text' | 'diff' | 'replace' = 'diff';
  private lspCache: Map<string, LSPDiagnostic[]> = new Map();

  // ========================================
  // Lifecycle
  // ========================================

  protected async doInitialize(): Promise<void> {
    const config = this.config as CursorConfig;

    if (!config.workspaceRoot) {
      throw new AdapterError(
        'CURSOR-CFG-001',
        'Workspace root is required',
        ErrorCategory.CONFIGURATION
      );
    }

    this.workspaceRoot = config.workspaceRoot;
    this.cursorPath = config.cursorPath;
    this.serverPort = config.serverPort || this.serverPort;
    this.enableLSP = config.enableLSP ?? this.enableLSP;
    this.inlineEditingMode = config.inlineEditingMode || this.inlineEditingMode;

    // Verify workspace exists
    await this.verifyWorkspace();

    // Start Cursor agent server if path provided
    if (this.cursorPath) {
      await this.startCursorServer();
    }
  }

  protected async doShutdown(): Promise<void> {
    if (this.cursorProcess) {
      this.cursorProcess.kill();
      this.cursorProcess = undefined;
    }
    this.lspCache.clear();
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      await this.verifyWorkspace();
      if (this.cursorProcess) {
        return !this.cursorProcess.killed;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async verifyWorkspace(): Promise<void> {
    try {
      const stats = await fs.stat(this.workspaceRoot);
      if (!stats.isDirectory()) {
        throw new Error('Workspace root is not a directory');
      }
    } catch (error: any) {
      throw new AdapterError(
        'CURSOR-WS-001',
        `Invalid workspace: ${error.message}`,
        ErrorCategory.CONFIGURATION
      );
    }
  }

  private async startCursorServer(): Promise<void> {
    if (!this.cursorPath) return;

    return new Promise((resolve, reject) => {
      this.cursorProcess = spawn(this.cursorPath!, [
        'agent-server',
        '--port', String(this.serverPort),
        '--workspace', this.workspaceRoot
      ]);

      this.cursorProcess.on('error', (error) => {
        reject(new AdapterError(
          'CURSOR-SRV-001',
          `Failed to start Cursor server: ${error.message}`,
          ErrorCategory.SYSTEM
        ));
      });

      // Wait for server to be ready
      setTimeout(() => resolve(), 2000);
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
        AgentCapability.CODE_REVIEW,
        AgentCapability.INLINE_EDITING,
        AgentCapability.FILE_READING,
        AgentCapability.FILE_WRITING,
        AgentCapability.FILE_EDITING,
        AgentCapability.LSP_INTEGRATION,
        AgentCapability.WORKSPACE_AWARENESS,
        AgentCapability.MULTI_FILE_CONTEXT,
        AgentCapability.GIT_AWARE
      ],
      operations: [
        'code.generate',
        'code.edit',
        'code.review',
        'code.refactor',
        'file.read',
        'file.write',
        'file.edit',
        'file.search',
        'context.gather'
      ],
      limitations: {
        maxContextSize: 100000,
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.c']
      },
      metadata: {
        version: '1.0.0',
        provider: 'cursor'
      }
    };
  }

  // ========================================
  // Request Execution
  // ========================================

  protected async executeRequest(nativeRequest: CursorRequest, message: A2AMessage): Promise<any> {
    switch (message.operation) {
      case 'code.edit':
      case 'file.edit':
        return this.executeInlineEdit(nativeRequest, message);

      case 'file.read':
        return this.executeFileRead(nativeRequest);

      case 'file.write':
        return this.executeFileWrite(nativeRequest);

      case 'file.search':
        return this.executeFileSearch(nativeRequest);

      case 'context.gather':
        return this.executeContextGather(nativeRequest);

      case 'code.review':
        return this.executeCodeReview(nativeRequest);

      default:
        throw new AdapterError(
          'CURSOR-OP-001',
          `Operation ${message.operation} not supported`,
          ErrorCategory.UNSUPPORTED
        );
    }
  }

  protected async *executeStreamRequest(
    nativeRequest: CursorRequest,
    message: A2AMessage
  ): AsyncIterator<StreamChunk> {
    // Cursor doesn't support streaming in the same way
    // We simulate it by yielding the full response
    const result = await this.executeRequest(nativeRequest, message);

    yield {
      id: message.id,
      type: 'delta',
      data: result
    };

    yield {
      id: message.id,
      type: 'complete',
      data: null
    };
  }

  // ========================================
  // Operation Implementations
  // ========================================

  private async executeInlineEdit(request: CursorRequest, message: A2AMessage): Promise<any> {
    const edit: InlineEdit = request.params;
    const filePath = path.resolve(this.workspaceRoot, edit.filePath);

    // Read current file content
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Validate line numbers
    if (edit.startLine < 0 || edit.endLine >= lines.length) {
      throw new AdapterError(
        'CURSOR-EDIT-001',
        'Invalid line range',
        ErrorCategory.VALIDATION
      );
    }

    // Apply edit
    const newLines = [
      ...lines.slice(0, edit.startLine),
      ...edit.newText.split('\n'),
      ...lines.slice(edit.endLine + 1)
    ];

    // Write back
    await fs.writeFile(filePath, newLines.join('\n'), 'utf-8');

    // Get LSP diagnostics if enabled
    let diagnostics: LSPDiagnostic[] = [];
    if (this.enableLSP) {
      diagnostics = await this.getLSPDiagnostics(filePath);
    }

    return {
      success: true,
      filePath: edit.filePath,
      linesChanged: edit.endLine - edit.startLine + 1,
      diagnostics,
      mode: edit.mode
    };
  }

  private async executeFileRead(request: CursorRequest): Promise<any> {
    const { filePath, startLine, endLine } = request.params;
    const fullPath = path.resolve(this.workspaceRoot, filePath);

    const content = await fs.readFile(fullPath, 'utf-8');

    if (startLine !== undefined && endLine !== undefined) {
      const lines = content.split('\n');
      const selectedLines = lines.slice(startLine, endLine + 1);
      return {
        content: selectedLines.join('\n'),
        startLine,
        endLine,
        totalLines: lines.length
      };
    }

    return {
      content,
      totalLines: content.split('\n').length
    };
  }

  private async executeFileWrite(request: CursorRequest): Promise<any> {
    const { filePath, content } = request.params;
    const fullPath = path.resolve(this.workspaceRoot, filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      success: true,
      filePath,
      bytesWritten: content.length
    };
  }

  private async executeFileSearch(request: CursorRequest): Promise<any> {
    const { pattern, fileTypes } = request.params;

    // Use grep-like search
    const files = await this.findFiles(this.workspaceRoot, fileTypes);
    const matches: Array<{ file: string; line: number; content: string }> = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.match(new RegExp(pattern))) {
          matches.push({
            file: path.relative(this.workspaceRoot, file),
            line: index,
            content: line.trim()
          });
        }
      });
    }

    return {
      pattern,
      matches,
      totalFiles: files.length,
      matchCount: matches.length
    };
  }

  private async executeContextGather(request: CursorRequest): Promise<any> {
    const { focusFile, radius } = request.params;
    const fullPath = path.resolve(this.workspaceRoot, focusFile);

    // Gather related files based on imports/references
    const relatedFiles = await this.findRelatedFiles(fullPath, radius || 2);

    // Read content of related files
    const context = await Promise.all(
      relatedFiles.map(async (file) => {
        const content = await fs.readFile(file, 'utf-8');
        return {
          path: path.relative(this.workspaceRoot, file),
          content,
          language: this.detectLanguage(file)
        };
      })
    );

    return {
      focusFile,
      relatedFiles: context,
      totalFiles: context.length
    };
  }

  private async executeCodeReview(request: CursorRequest): Promise<any> {
    const { filePath } = request.params;
    const fullPath = path.resolve(this.workspaceRoot, filePath);

    // Get LSP diagnostics
    const diagnostics = await this.getLSPDiagnostics(fullPath);

    // Read file for static analysis
    const content = await fs.readFile(fullPath, 'utf-8');

    // Simple static analysis
    const issues = this.performStaticAnalysis(content, filePath);

    return {
      filePath,
      diagnostics,
      staticIssues: issues,
      totalIssues: diagnostics.length + issues.length
    };
  }

  // ========================================
  // Protocol Translation
  // ========================================

  translateRequest(a2aMsg: A2AMessage): CursorRequest {
    const request: CursorRequest = {
      method: this.operationToMethod(a2aMsg.operation),
      params: this.translateParams(a2aMsg),
      id: a2aMsg.id
    };

    return request;
  }

  translateResponse(nativeResp: any, requestId: string): A2AResponse {
    return {
      id: `cursor_${Date.now()}`,
      messageId: requestId,
      status: nativeResp.success !== false ? 'success' : 'error',
      payload: nativeResp,
      metadata: {
        timestamp: Date.now(),
        duration: 0
      }
    };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private operationToMethod(operation: OperationType): string {
    const methodMap: Record<string, string> = {
      'code.edit': 'inline_edit',
      'file.edit': 'inline_edit',
      'file.read': 'read_file',
      'file.write': 'write_file',
      'file.search': 'search_files',
      'context.gather': 'gather_context',
      'code.review': 'review_code'
    };

    return methodMap[operation] || operation;
  }

  private translateParams(a2aMsg: A2AMessage): any {
    const payload = a2aMsg.payload;

    switch (a2aMsg.operation) {
      case 'code.edit':
      case 'file.edit':
        return {
          filePath: payload.filePath,
          startLine: payload.startLine || 0,
          endLine: payload.endLine || 0,
          newText: payload.newText || payload.content,
          mode: this.inlineEditingMode
        };

      case 'file.read':
        return {
          filePath: payload.filePath || payload.path,
          startLine: payload.startLine,
          endLine: payload.endLine
        };

      case 'file.write':
        return {
          filePath: payload.filePath || payload.path,
          content: payload.content
        };

      case 'file.search':
        return {
          pattern: payload.pattern || payload.query,
          fileTypes: payload.fileTypes || ['*']
        };

      case 'context.gather':
        return {
          focusFile: payload.focusFile || payload.filePath,
          radius: payload.radius || 2
        };

      case 'code.review':
        return {
          filePath: payload.filePath || payload.path
        };

      default:
        return payload;
    }
  }

  private async findFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip node_modules, .git, etc.
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes('*') || extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await scan(dir);
    return files;
  }

  private async findRelatedFiles(filePath: string, radius: number): Promise<string[]> {
    const related: Set<string> = new Set([filePath]);

    // Read file and find imports
    const content = await fs.readFile(filePath, 'utf-8');
    const imports = this.extractImports(content, filePath);

    for (const imp of imports) {
      related.add(imp);
      if (radius > 1) {
        // Recursively find related files
        const nested = await this.findRelatedFiles(imp, radius - 1);
        nested.forEach(f => related.add(f));
      }
    }

    return Array.from(related);
  }

  private extractImports(content: string, basePath: string): string[] {
    const imports: string[] = [];
    const dir = path.dirname(basePath);

    // Simple regex-based import extraction
    const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        // Relative import
        const resolved = path.resolve(dir, importPath);
        imports.push(resolved);
      }
    }

    return imports;
  }

  private async getLSPDiagnostics(filePath: string): Promise<LSPDiagnostic[]> {
    // Check cache first
    if (this.lspCache.has(filePath)) {
      return this.lspCache.get(filePath)!;
    }

    // In a real implementation, this would query LSP server
    // For now, return empty array
    return [];
  }

  private performStaticAnalysis(content: string, filePath: string): Array<{ line: number; message: string; severity: string }> {
    const issues: Array<{ line: number; message: string; severity: string }> = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // TODO (without space) check
      if (line.includes('TODO')) {
        issues.push({
          line: index,
          message: 'TODO comment found',
          severity: 'info'
        });
      }

      // Console.log check
      if (line.includes('console.log')) {
        issues.push({
          line: index,
          message: 'console.log statement found',
          severity: 'warning'
        });
      }

      // Long line check
      if (line.length > 120) {
        issues.push({
          line: index,
          message: 'Line exceeds 120 characters',
          severity: 'warning'
        });
      }
    });

    return issues;
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c'
    };
    return languageMap[ext] || 'text';
  }
}

// ============================================================================
// Configuration Examples
// ============================================================================

export const CURSOR_CONFIG_EXAMPLES = {
  default: {
    type: 'cursor' as const,
    name: 'cursor-ide',
    workspaceRoot: process.cwd(),
    enableLSP: true,
    inlineEditingMode: 'diff' as const
  },
  withServer: {
    type: 'cursor' as const,
    name: 'cursor-server',
    workspaceRoot: process.cwd(),
    cursorPath: '/Applications/Cursor.app/Contents/MacOS/Cursor',
    serverPort: 3456,
    enableLSP: true,
    inlineEditingMode: 'ghost-text' as const
  }
};
