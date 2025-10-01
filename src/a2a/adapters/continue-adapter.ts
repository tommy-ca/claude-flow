/**
 * Continue.dev Adapter
 * Integrates with Continue.dev IDE extension
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

// ============================================================================
// Continue.dev-Specific Types
// ============================================================================

export interface ContinueConfig extends AgentConfig {
  type: 'continue';
  workspaceRoot: string;
  serverUrl?: string;
  apiKey?: string;
  model?: string;
  contextProviders?: string[];
  customCommands?: Record<string, string>;
}

interface ContinueRequest {
  method: string;
  params: {
    message?: string;
    context?: ContinueContext[];
    slashCommand?: string;
    selectedCode?: string;
    cursorPosition?: { line: number; character: number };
  };
}

interface ContinueContext {
  type: 'file' | 'terminal' | 'problems' | 'code' | 'url';
  content: string;
  metadata?: {
    path?: string;
    language?: string;
    relevance?: number;
  };
}

interface ContinueResponse {
  content: string;
  suggestions?: CodeSuggestion[];
  edits?: CodeEdit[];
  context?: ContinueContext[];
}

interface CodeSuggestion {
  code: string;
  language: string;
  explanation?: string;
  filePath?: string;
}

interface CodeEdit {
  filePath: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

// ============================================================================
// Continue Adapter Implementation
// ============================================================================

export class ContinueAdapter extends BaseAgentAdapter {
  private workspaceRoot!: string;
  private serverUrl: string = 'http://localhost:65432';
  private model: string = 'gpt-4';
  private contextProviders: string[] = ['file', 'terminal', 'problems'];
  private customCommands: Record<string, string> = {};

  // ========================================
  // Lifecycle
  // ========================================

  protected async doInitialize(): Promise<void> {
    const config = this.config as ContinueConfig;

    if (!config.workspaceRoot) {
      throw new AdapterError(
        'CONTINUE-CFG-001',
        'Workspace root is required',
        ErrorCategory.CONFIGURATION
      );
    }

    this.workspaceRoot = config.workspaceRoot;
    this.serverUrl = config.serverUrl || this.serverUrl;
    this.model = config.model || this.model;
    this.contextProviders = config.contextProviders || this.contextProviders;
    this.customCommands = config.customCommands || this.customCommands;

    // Test connection
    await this.testConnection();
  }

  protected async doShutdown(): Promise<void> {
    // Continue server is managed by IDE
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      await this.testConnection();
      return true;
    } catch {
      return false;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Health check failed');
      }
    } catch (error: any) {
      throw new AdapterError(
        'CONTINUE-CONN-001',
        `Failed to connect to Continue server: ${error.message}`,
        ErrorCategory.NETWORK,
        true
      );
    }
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
        AgentCapability.CODE_EXPLANATION,
        AgentCapability.CODE_REFACTORING,
        AgentCapability.INLINE_EDITING,
        AgentCapability.CHAT_INTERFACE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.WORKSPACE_AWARENESS,
        AgentCapability.LSP_INTEGRATION,
        AgentCapability.MULTI_FILE_CONTEXT,
        AgentCapability.TERMINAL_EXECUTION
      ],
      operations: [
        'code.generate',
        'code.edit',
        'code.review',
        'code.refactor',
        'code.explain',
        'file.edit',
        'chat.send',
        'terminal.execute',
        'context.gather'
      ],
      limitations: {
        maxContextSize: 100000,
        fileTypes: ['*']
      },
      metadata: {
        version: '1.0.0',
        model: this.model,
        provider: 'continue'
      }
    };
  }

  // ========================================
  // Request Execution
  // ========================================

  protected async executeRequest(nativeRequest: ContinueRequest, message: A2AMessage): Promise<any> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(`${this.serverUrl}/v1/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nativeRequest)
      });

      if (!response.ok) {
        throw new Error(`Continue request failed: ${response.statusText}`);
      }

      return response.json();
    });
  }

  protected async *executeStreamRequest(
    nativeRequest: ContinueRequest,
    message: A2AMessage
  ): AsyncIterator<StreamChunk> {
    const response = await fetch(`${this.serverUrl}/v1/continue/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nativeRequest)
    });

    if (!response.ok) {
      throw new Error(`Continue stream request failed: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield {
                id: message.id,
                type: 'complete',
                data: null
              };
              return;
            }

            try {
              const chunk = JSON.parse(data);
              yield {
                id: message.id,
                type: 'delta',
                data: chunk
              };
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ========================================
  // Protocol Translation
  // ========================================

  translateRequest(a2aMsg: A2AMessage): ContinueRequest {
    const payload = a2aMsg.payload;
    const context = this.buildContext(a2aMsg);

    const request: ContinueRequest = {
      method: this.operationToMethod(a2aMsg.operation),
      params: {
        message: this.extractMessage(payload, a2aMsg.operation),
        context,
        selectedCode: payload.selectedCode,
        cursorPosition: payload.cursorPosition
      }
    };

    // Add slash command if applicable
    const slashCommand = this.getSlashCommand(a2aMsg.operation);
    if (slashCommand) {
      request.params.slashCommand = slashCommand;
    }

    return request;
  }

  translateResponse(nativeResp: ContinueResponse, requestId: string): A2AResponse {
    return {
      id: `continue_${Date.now()}`,
      messageId: requestId,
      status: 'success',
      payload: {
        content: nativeResp.content,
        suggestions: nativeResp.suggestions || [],
        edits: nativeResp.edits || [],
        context: nativeResp.context || []
      },
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
      'code.generate': 'generate',
      'code.edit': 'edit',
      'code.review': 'review',
      'code.refactor': 'refactor',
      'code.explain': 'explain',
      'file.edit': 'edit',
      'chat.send': 'chat',
      'terminal.execute': 'terminal',
      'context.gather': 'context'
    };

    return methodMap[operation] || 'chat';
  }

  private getSlashCommand(operation: OperationType): string | undefined {
    const slashCommands: Record<string, string> = {
      'code.edit': '/edit',
      'code.review': '/review',
      'code.explain': '/explain',
      'code.refactor': '/refactor',
      'file.edit': '/edit',
      'terminal.execute': '/cmd'
    };

    return slashCommands[operation];
  }

  private extractMessage(payload: any, operation: OperationType): string {
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload.prompt) return payload.prompt;
    if (payload.instruction) return payload.instruction;
    if (payload.message) return payload.message;
    if (payload.question) return payload.question;

    // Operation-specific defaults
    switch (operation) {
      case 'code.edit':
        return `Edit the selected code: ${payload.description || ''}`;
      case 'code.review':
        return 'Review this code for issues and improvements';
      case 'code.explain':
        return 'Explain what this code does';
      case 'code.refactor':
        return 'Refactor this code to improve quality';
      default:
        return JSON.stringify(payload);
    }
  }

  private buildContext(a2aMsg: A2AMessage): ContinueContext[] {
    const context: ContinueContext[] = [];

    // Add file context
    if (a2aMsg.context?.fileContext) {
      a2aMsg.context.fileContext.forEach(file => {
        context.push({
          type: 'file',
          content: file.content || '',
          metadata: {
            path: file.path,
            language: file.language,
            relevance: file.relevance
          }
        });
      });
    }

    // Add git context as code context
    if (a2aMsg.context?.gitContext) {
      const git = a2aMsg.context.gitContext;
      const gitInfo = [
        `Branch: ${git.branch}`,
        git.commit ? `Commit: ${git.commit}` : '',
        git.uncommittedChanges ? 'Uncommitted changes present' : ''
      ].filter(Boolean).join('\n');

      context.push({
        type: 'code',
        content: gitInfo,
        metadata: {
          path: '.git',
          relevance: 0.5
        }
      });
    }

    // Add workspace info
    if (a2aMsg.context?.workspaceRoot) {
      context.push({
        type: 'file',
        content: `Workspace: ${a2aMsg.context.workspaceRoot}`,
        metadata: {
          path: a2aMsg.context.workspaceRoot,
          relevance: 0.3
        }
      });
    }

    return context;
  }

  // ========================================
  // Continue-Specific Methods
  // ========================================

  async executeSlashCommand(command: string, args: string[]): Promise<A2AResponse> {
    const request: ContinueRequest = {
      method: 'slashCommand',
      params: {
        slashCommand: command,
        message: args.join(' ')
      }
    };

    const nativeResponse = await this.executeRequest(request, {
      id: `cmd_${Date.now()}`,
      type: 'request',
      operation: 'chat.send',
      payload: { command, args },
      metadata: {
        timestamp: Date.now(),
        source: 'continue-adapter'
      }
    });

    return this.translateResponse(nativeResponse, `cmd_${Date.now()}`);
  }

  async addContextProvider(provider: string): Promise<void> {
    if (!this.contextProviders.includes(provider)) {
      this.contextProviders.push(provider);
    }
  }

  async removeContextProvider(provider: string): Promise<void> {
    this.contextProviders = this.contextProviders.filter(p => p !== provider);
  }

  async registerCustomCommand(name: string, template: string): Promise<void> {
    this.customCommands[name] = template;
  }

  async getAvailableCommands(): Promise<string[]> {
    const defaultCommands = [
      '/edit',
      '/comment',
      '/share',
      '/cmd',
      '/explain',
      '/review',
      '/test',
      '/refactor'
    ];

    return [...defaultCommands, ...Object.keys(this.customCommands)];
  }
}

// ============================================================================
// Configuration Examples
// ============================================================================

export const CONTINUE_CONFIG_EXAMPLES = {
  default: {
    type: 'continue' as const,
    name: 'continue-default',
    workspaceRoot: process.cwd(),
    serverUrl: 'http://localhost:65432',
    model: 'gpt-4',
    contextProviders: ['file', 'terminal', 'problems']
  },
  claude: {
    type: 'continue' as const,
    name: 'continue-claude',
    workspaceRoot: process.cwd(),
    serverUrl: 'http://localhost:65432',
    model: 'claude-3-opus-20240229',
    contextProviders: ['file', 'terminal', 'problems', 'code', 'url']
  },
  custom: {
    type: 'continue' as const,
    name: 'continue-custom',
    workspaceRoot: process.cwd(),
    serverUrl: 'http://localhost:65432',
    model: 'gpt-4-turbo',
    contextProviders: ['file', 'terminal'],
    customCommands: {
      '/docs': 'Generate documentation for the selected code',
      '/optimize': 'Optimize the selected code for performance',
      '/secure': 'Review the selected code for security issues'
    }
  }
};
