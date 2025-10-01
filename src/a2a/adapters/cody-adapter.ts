/**
 * Cody (Sourcegraph) Adapter
 * Integrates with Sourcegraph Cody for code intelligence
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
  A2AError,
  TokenUsage
} from './base-adapter';

// ============================================================================
// Cody-Specific Types
// ============================================================================

export interface CodyConfig extends AgentConfig {
  type: 'sourcegraph';
  accessToken: string;
  serverEndpoint?: string;
  workspaceRoot?: string;
  enableCodeSearch?: boolean;
  searchContextSize?: number;
}

interface CodyRequest {
  query: string;
  codebase?: string;
  files?: CodyFile[];
  intent?: 'chat' | 'edit' | 'search' | 'explain';
  model?: string;
  stream?: boolean;
}

interface CodyFile {
  path: string;
  content?: string;
  startLine?: number;
  endLine?: number;
}

interface CodyResponse {
  text: string;
  codeBlocks?: CodyCodeBlock[];
  references?: CodyReference[];
  contextFiles?: CodyFile[];
}

interface CodyCodeBlock {
  language: string;
  code: string;
  explanation?: string;
}

interface CodyReference {
  repository: string;
  file: string;
  lines: { start: number; end: number };
  url?: string;
  relevance?: number;
}

interface CodySearchResult {
  file: string;
  repository: string;
  matches: Array<{
    line: number;
    content: string;
    matchRanges: Array<[number, number]>;
  }>;
  score: number;
}

// ============================================================================
// Cody Adapter Implementation
// ============================================================================

export class CodyAdapter extends BaseAgentAdapter {
  private accessToken!: string;
  private serverEndpoint: string = 'https://sourcegraph.com/.api/graphql';
  private workspaceRoot?: string;
  private enableCodeSearch: boolean = true;
  private searchContextSize: number = 10;

  // ========================================
  // Lifecycle
  // ========================================

  protected async doInitialize(): Promise<void> {
    const config = this.config as CodyConfig;

    if (!config.accessToken) {
      throw new AdapterError(
        'CODY-CFG-001',
        'Sourcegraph access token is required',
        ErrorCategory.CONFIGURATION
      );
    }

    this.accessToken = config.accessToken;
    this.serverEndpoint = config.serverEndpoint || this.serverEndpoint;
    this.workspaceRoot = config.workspaceRoot;
    this.enableCodeSearch = config.enableCodeSearch ?? this.enableCodeSearch;
    this.searchContextSize = config.searchContextSize || this.searchContextSize;

    // Test connection
    await this.testConnection();
  }

  protected async doShutdown(): Promise<void> {
    // No cleanup needed
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
    const query = `
      query {
        currentUser {
          id
        }
      }
    `;

    const response = await fetch(this.serverEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new AdapterError(
        'CODY-AUTH-001',
        'Failed to authenticate with Sourcegraph',
        ErrorCategory.AUTHENTICATION
      );
    }

    const data = await response.json();
    if (data.errors) {
      throw new AdapterError(
        'CODY-AUTH-002',
        `Authentication error: ${data.errors[0].message}`,
        ErrorCategory.AUTHENTICATION
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
        AgentCapability.CODE_SEARCH,
        AgentCapability.SEMANTIC_SEARCH,
        AgentCapability.CHAT_INTERFACE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.MULTI_FILE_CONTEXT,
        AgentCapability.WORKSPACE_AWARENESS
      ],
      operations: [
        'code.generate',
        'code.edit',
        'code.review',
        'code.explain',
        'search.code',
        'search.semantic',
        'chat.send',
        'context.gather'
      ],
      limitations: {
        maxContextSize: 100000,
        fileTypes: ['*'],
        rateLimit: {
          requestsPerMinute: 60
        }
      },
      metadata: {
        version: '1.0.0',
        provider: 'sourcegraph'
      }
    };
  }

  // ========================================
  // Request Execution
  // ========================================

  protected async executeRequest(nativeRequest: CodyRequest, message: A2AMessage): Promise<any> {
    switch (message.operation) {
      case 'search.code':
      case 'search.semantic':
        return this.executeCodeSearch(nativeRequest);

      case 'context.gather':
        return this.executeContextGather(nativeRequest);

      default:
        return this.executeChatRequest(nativeRequest);
    }
  }

  protected async *executeStreamRequest(
    nativeRequest: CodyRequest,
    message: A2AMessage
  ): AsyncIterator<StreamChunk> {
    const query = `
      mutation CodyChat($input: CodyChatInput!) {
        codyChat(input: $input) {
          id
          stream
        }
      }
    `;

    const variables = {
      input: {
        query: nativeRequest.query,
        codebase: nativeRequest.codebase,
        files: nativeRequest.files,
        intent: nativeRequest.intent || 'chat',
        stream: true
      }
    };

    const response = await fetch(this.serverEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new AdapterError(
        'CODY-REQ-001',
        `Request failed: ${response.statusText}`,
        ErrorCategory.NETWORK,
        true
      );
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
                data: {
                  content: chunk.text,
                  references: chunk.references
                }
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
  // Operation Implementations
  // ========================================

  private async executeChatRequest(request: CodyRequest): Promise<CodyResponse> {
    return this.retryWithBackoff(async () => {
      const query = `
        mutation CodyChat($input: CodyChatInput!) {
          codyChat(input: $input) {
            text
            codeBlocks {
              language
              code
              explanation
            }
            references {
              repository
              file
              lines {
                start
                end
              }
              url
              relevance
            }
          }
        }
      `;

      const variables = {
        input: {
          query: request.query,
          codebase: request.codebase || this.workspaceRoot,
          files: request.files,
          intent: request.intent || 'chat',
          model: request.model
        }
      };

      const response = await fetch(this.serverEndpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data.data.codyChat;
    });
  }

  private async executeCodeSearch(request: CodyRequest): Promise<{ results: CodySearchResult[] }> {
    return this.retryWithBackoff(async () => {
      const query = `
        query CodeSearch($query: String!, $contextSize: Int) {
          search(query: $query, version: V3, patternType: standard) {
            results {
              results {
                ... on FileMatch {
                  file {
                    path
                    repository {
                      name
                    }
                  }
                  lineMatches {
                    lineNumber
                    preview
                    offsetAndLengths
                  }
                }
              }
              matchCount
              elapsedMilliseconds
            }
          }
        }
      `;

      const variables = {
        query: request.query,
        contextSize: this.searchContextSize
      };

      const response = await fetch(this.serverEndpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      // Transform results
      const results: CodySearchResult[] = data.data.search.results.results
        .filter((r: any) => r.file)
        .map((result: any) => ({
          file: result.file.path,
          repository: result.file.repository.name,
          matches: result.lineMatches.map((lm: any) => ({
            line: lm.lineNumber,
            content: lm.preview,
            matchRanges: lm.offsetAndLengths
          })),
          score: 1.0 // Sourcegraph doesn't return relevance scores
        }));

      return { results };
    });
  }

  private async executeContextGather(request: CodyRequest): Promise<{ contextFiles: CodyFile[] }> {
    // Use code search to find relevant files
    const searchResults = await this.executeCodeSearch(request);

    const contextFiles: CodyFile[] = [];

    for (const result of searchResults.results.slice(0, this.searchContextSize)) {
      try {
        const content = await this.fetchFileContent(result.repository, result.file);
        contextFiles.push({
          path: result.file,
          content
        });
      } catch (error) {
        // Skip files that can't be fetched
        console.warn(`Failed to fetch ${result.file}:`, error);
      }
    }

    return { contextFiles };
  }

  private async fetchFileContent(repository: string, filePath: string): Promise<string> {
    const query = `
      query FileContent($repository: String!, $path: String!) {
        repository(name: $repository) {
          commit(rev: "HEAD") {
            file(path: $path) {
              content
            }
          }
        }
      }
    `;

    const variables = { repository, path: filePath };

    const response = await fetch(this.serverEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return data.data.repository.commit.file.content;
  }

  // ========================================
  // Protocol Translation
  // ========================================

  translateRequest(a2aMsg: A2AMessage): CodyRequest {
    const payload = a2aMsg.payload;

    const request: CodyRequest = {
      query: this.extractQuery(payload, a2aMsg.operation),
      codebase: a2aMsg.context?.workspaceRoot || this.workspaceRoot,
      files: this.extractFiles(a2aMsg),
      intent: this.mapOperationToIntent(a2aMsg.operation),
      stream: a2aMsg.metadata.streaming ?? false
    };

    return request;
  }

  translateResponse(nativeResp: CodyResponse, requestId: string): A2AResponse {
    return {
      id: `cody_${Date.now()}`,
      messageId: requestId,
      status: 'success',
      payload: {
        content: nativeResp.text,
        codeBlocks: nativeResp.codeBlocks || [],
        references: nativeResp.references || [],
        contextFiles: nativeResp.contextFiles || []
      },
      metadata: {
        timestamp: Date.now(),
        duration: 0
      }
    };
  }

  translateError(error: any): A2AError {
    if (error instanceof AdapterError) {
      return error.toA2AError();
    }

    // Check for common Sourcegraph errors
    if (error.message?.includes('rate limit')) {
      return {
        code: 'CODY-RL-001',
        message: 'Rate limit exceeded',
        category: ErrorCategory.RATE_LIMIT,
        retryable: true
      };
    }

    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      return {
        code: 'CODY-AUTH-003',
        message: 'Authentication failed',
        category: ErrorCategory.AUTHENTICATION,
        retryable: false
      };
    }

    return super.translateError(error);
  }

  // ========================================
  // Helper Methods
  // ========================================

  private extractQuery(payload: any, operation: OperationType): string {
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload.query) return payload.query;
    if (payload.prompt) return payload.prompt;
    if (payload.instruction) return payload.instruction;
    if (payload.message) return payload.message;

    // Operation-specific queries
    switch (operation) {
      case 'code.explain':
        return 'Explain what this code does';
      case 'code.review':
        return 'Review this code for issues';
      case 'code.refactor':
        return 'Suggest refactoring improvements';
      case 'search.code':
        return payload.pattern || payload.search || '';
      default:
        return JSON.stringify(payload);
    }
  }

  private extractFiles(a2aMsg: A2AMessage): CodyFile[] | undefined {
    const files: CodyFile[] = [];

    if (a2aMsg.context?.fileContext) {
      a2aMsg.context.fileContext.forEach(file => {
        files.push({
          path: file.path,
          content: file.content,
          startLine: file.startLine,
          endLine: file.endLine
        });
      });
    }

    if (a2aMsg.payload.files) {
      a2aMsg.payload.files.forEach((file: any) => {
        files.push({
          path: file.path || file.filePath,
          content: file.content,
          startLine: file.startLine,
          endLine: file.endLine
        });
      });
    }

    return files.length > 0 ? files : undefined;
  }

  private mapOperationToIntent(operation: OperationType): 'chat' | 'edit' | 'search' | 'explain' {
    switch (operation) {
      case 'code.edit':
      case 'file.edit':
        return 'edit';

      case 'search.code':
      case 'search.semantic':
        return 'search';

      case 'code.explain':
        return 'explain';

      default:
        return 'chat';
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `token ${this.accessToken}`
    };
  }

  // ========================================
  // Cody-Specific Methods
  // ========================================

  async searchCode(query: string, contextSize?: number): Promise<CodySearchResult[]> {
    const originalContextSize = this.searchContextSize;
    if (contextSize) {
      this.searchContextSize = contextSize;
    }

    try {
      const result = await this.executeCodeSearch({ query });
      return result.results;
    } finally {
      this.searchContextSize = originalContextSize;
    }
  }

  async getReferences(file: string, line: number): Promise<CodyReference[]> {
    const query = `
      query References($file: String!, $line: Int!) {
        references(file: $file, line: $line) {
          repository
          file
          lines {
            start
            end
          }
          url
        }
      }
    `;

    const variables = { file, line };

    const response = await fetch(this.serverEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new AdapterError(
        'CODY-REF-001',
        'Failed to get references',
        ErrorCategory.SYSTEM
      );
    }

    const data = await response.json();
    return data.data.references || [];
  }

  async explainCode(code: string, language: string): Promise<string> {
    const request: CodyRequest = {
      query: `Explain this ${language} code:\n\n${code}`,
      intent: 'explain'
    };

    const response = await this.executeChatRequest(request);
    return response.text;
  }
}

// ============================================================================
// Configuration Examples
// ============================================================================

export const CODY_CONFIG_EXAMPLES = {
  default: {
    type: 'sourcegraph' as const,
    name: 'cody-default',
    accessToken: process.env.SOURCEGRAPH_TOKEN || '',
    serverEndpoint: 'https://sourcegraph.com/.api/graphql',
    enableCodeSearch: true,
    searchContextSize: 10
  },
  enterprise: {
    type: 'sourcegraph' as const,
    name: 'cody-enterprise',
    accessToken: process.env.SOURCEGRAPH_TOKEN || '',
    serverEndpoint: 'https://sourcegraph.company.com/.api/graphql',
    workspaceRoot: process.cwd(),
    enableCodeSearch: true,
    searchContextSize: 20
  },
  focused: {
    type: 'sourcegraph' as const,
    name: 'cody-focused',
    accessToken: process.env.SOURCEGRAPH_TOKEN || '',
    workspaceRoot: process.cwd(),
    enableCodeSearch: true,
    searchContextSize: 5
  }
};
