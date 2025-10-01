/**
 * Adapter Registry and Factory
 * Central management for all A2A adapters
 */

import {
  IAgentBackendAdapter,
  AgentConfig,
  AdapterError,
  ErrorCategory,
  AgentCapability,
  OperationType
} from './base-adapter';

import { CodexAdapter, OpenAIConfig } from './codex-adapter';
import { GeminiAdapter, GeminiConfig } from './gemini-adapter';
import { CursorAdapter, CursorConfig } from './cursor-adapter';
import { AiderAdapter, AiderConfig } from './aider-adapter';
import { ContinueAdapter, ContinueConfig } from './continue-adapter';
import { CodyAdapter, CodyConfig } from './cody-adapter';

// ============================================================================
// Registry Types
// ============================================================================

export type AdapterType = 'openai' | 'google' | 'cursor' | 'aider' | 'continue' | 'sourcegraph';

export type AdapterConfigUnion =
  | OpenAIConfig
  | GeminiConfig
  | CursorConfig
  | AiderConfig
  | ContinueConfig
  | CodyConfig;

interface AdapterRegistryEntry {
  type: AdapterType;
  factory: (config: AgentConfig) => IAgentBackendAdapter;
  description: string;
  capabilities: AgentCapability[];
}

interface AdapterInstanceEntry {
  id: string;
  type: AdapterType;
  name: string;
  adapter: IAgentBackendAdapter;
  config: AgentConfig;
  createdAt: number;
  lastUsed: number;
}

// ============================================================================
// Adapter Registry
// ============================================================================

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private registry: Map<AdapterType, AdapterRegistryEntry> = new Map();
  private instances: Map<string, AdapterInstanceEntry> = new Map();

  private constructor() {
    this.registerDefaultAdapters();
  }

  static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  // ========================================
  // Registration
  // ========================================

  private registerDefaultAdapters(): void {
    // OpenAI Codex
    this.register({
      type: 'openai',
      factory: (config: AgentConfig) => new CodexAdapter(),
      description: 'OpenAI GPT models for code generation and chat',
      capabilities: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.CODE_REVIEW,
        AgentCapability.CODE_REFACTORING,
        AgentCapability.CODE_EXPLANATION,
        AgentCapability.TEST_GENERATION,
        AgentCapability.CHAT_INTERFACE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.FUNCTION_CALLING
      ]
    });

    // Google Gemini
    this.register({
      type: 'google',
      factory: (config: AgentConfig) => new GeminiAdapter(),
      description: 'Google Gemini AI for research and code generation',
      capabilities: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.CODE_REVIEW,
        AgentCapability.CODE_EXPLANATION,
        AgentCapability.TEST_GENERATION,
        AgentCapability.CHAT_INTERFACE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.MULTI_MODAL
      ]
    });

    // Cursor IDE
    this.register({
      type: 'cursor',
      factory: (config: AgentConfig) => new CursorAdapter(),
      description: 'Cursor IDE for inline editing and LSP integration',
      capabilities: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.INLINE_EDITING,
        AgentCapability.FILE_EDITING,
        AgentCapability.LSP_INTEGRATION,
        AgentCapability.WORKSPACE_AWARENESS,
        AgentCapability.MULTI_FILE_CONTEXT
      ]
    });

    // Aider
    this.register({
      type: 'aider',
      factory: (config: AgentConfig) => new AiderAdapter(),
      description: 'Aider CLI for Git-aware code editing',
      capabilities: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.CODE_REFACTORING,
        AgentCapability.FILE_EDITING,
        AgentCapability.GIT_OPERATIONS,
        AgentCapability.GIT_AWARE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.AUTONOMOUS_EXECUTION
      ]
    });

    // Continue.dev
    this.register({
      type: 'continue',
      factory: (config: AgentConfig) => new ContinueAdapter(),
      description: 'Continue.dev IDE extension',
      capabilities: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.CODE_REVIEW,
        AgentCapability.CODE_EXPLANATION,
        AgentCapability.INLINE_EDITING,
        AgentCapability.CHAT_INTERFACE,
        AgentCapability.STREAMING_RESPONSE,
        AgentCapability.WORKSPACE_AWARENESS,
        AgentCapability.LSP_INTEGRATION
      ]
    });

    // Sourcegraph Cody
    this.register({
      type: 'sourcegraph',
      factory: (config: AgentConfig) => new CodyAdapter(),
      description: 'Sourcegraph Cody for code intelligence',
      capabilities: [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_EDITING,
        AgentCapability.CODE_REVIEW,
        AgentCapability.CODE_EXPLANATION,
        AgentCapability.CODE_SEARCH,
        AgentCapability.SEMANTIC_SEARCH,
        AgentCapability.CHAT_INTERFACE,
        AgentCapability.STREAMING_RESPONSE
      ]
    });
  }

  register(entry: AdapterRegistryEntry): void {
    this.registry.set(entry.type, entry);
  }

  // ========================================
  // Factory Methods
  // ========================================

  async create(config: AdapterConfigUnion): Promise<string> {
    const entry = this.registry.get(config.type as AdapterType);
    if (!entry) {
      throw new AdapterError(
        'REG-FACT-001',
        `Unknown adapter type: ${config.type}`,
        ErrorCategory.CONFIGURATION
      );
    }

    // Create adapter instance
    const adapter = entry.factory(config);

    // Initialize
    await adapter.initialize(config);

    // Store instance
    const id = this.generateInstanceId(config.type as AdapterType, config.name);
    const instanceEntry: AdapterInstanceEntry = {
      id,
      type: config.type as AdapterType,
      name: config.name,
      adapter,
      config,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };

    this.instances.set(id, instanceEntry);

    return id;
  }

  async createMultiple(configs: AdapterConfigUnion[]): Promise<string[]> {
    return Promise.all(configs.map(config => this.create(config)));
  }

  get(id: string): IAgentBackendAdapter {
    const entry = this.instances.get(id);
    if (!entry) {
      throw new AdapterError(
        'REG-GET-001',
        `Adapter instance not found: ${id}`,
        ErrorCategory.CONFIGURATION
      );
    }

    entry.lastUsed = Date.now();
    return entry.adapter;
  }

  async destroy(id: string): Promise<void> {
    const entry = this.instances.get(id);
    if (!entry) {
      return;
    }

    await entry.adapter.shutdown();
    this.instances.delete(id);
  }

  async destroyAll(): Promise<void> {
    const shutdownPromises = Array.from(this.instances.values()).map(entry =>
      entry.adapter.shutdown()
    );

    await Promise.all(shutdownPromises);
    this.instances.clear();
  }

  // ========================================
  // Query Methods
  // ========================================

  list(): Array<{ id: string; type: AdapterType; name: string }> {
    return Array.from(this.instances.values()).map(entry => ({
      id: entry.id,
      type: entry.type,
      name: entry.name
    }));
  }

  listByType(type: AdapterType): string[] {
    return Array.from(this.instances.values())
      .filter(entry => entry.type === type)
      .map(entry => entry.id);
  }

  getAvailableTypes(): AdapterType[] {
    return Array.from(this.registry.keys());
  }

  getTypeInfo(type: AdapterType): AdapterRegistryEntry | undefined {
    return this.registry.get(type);
  }

  findByCapability(capability: AgentCapability): string[] {
    return Array.from(this.instances.values())
      .filter(entry => {
        const typeInfo = this.registry.get(entry.type);
        return typeInfo?.capabilities.includes(capability);
      })
      .map(entry => entry.id);
  }

  findByOperation(operation: OperationType): string[] {
    return Array.from(this.instances.values())
      .filter(entry => entry.adapter.supportsOperation(operation))
      .map(entry => entry.id);
  }

  // ========================================
  // Health & Monitoring
  // ========================================

  async healthCheck(id?: string): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    if (id) {
      const entry = this.instances.get(id);
      if (entry) {
        results[id] = await entry.adapter.isHealthy();
      }
    } else {
      const checks = Array.from(this.instances.entries()).map(async ([id, entry]) => {
        results[id] = await entry.adapter.isHealthy();
      });
      await Promise.all(checks);
    }

    return results;
  }

  getMetrics(id: string) {
    const entry = this.instances.get(id);
    if (!entry) {
      throw new AdapterError(
        'REG-MET-001',
        `Adapter instance not found: ${id}`,
        ErrorCategory.CONFIGURATION
      );
    }

    return {
      ...entry.adapter.getMetrics(),
      createdAt: entry.createdAt,
      lastUsed: entry.lastUsed,
      type: entry.type,
      name: entry.name
    };
  }

  getAllMetrics() {
    return Array.from(this.instances.entries()).map(([id, entry]) => ({
      id,
      ...this.getMetrics(id)
    }));
  }

  // ========================================
  // Configuration
  // ========================================

  async updateConfig(id: string, config: Partial<AgentConfig>): Promise<void> {
    const entry = this.instances.get(id);
    if (!entry) {
      throw new AdapterError(
        'REG-UPD-001',
        `Adapter instance not found: ${id}`,
        ErrorCategory.CONFIGURATION
      );
    }

    await entry.adapter.updateConfig(config);
    entry.config = { ...entry.config, ...config };
  }

  getConfig(id: string): AgentConfig {
    const entry = this.instances.get(id);
    if (!entry) {
      throw new AdapterError(
        'REG-CFG-001',
        `Adapter instance not found: ${id}`,
        ErrorCategory.CONFIGURATION
      );
    }

    return entry.adapter.getConfig();
  }

  // ========================================
  // Helper Methods
  // ========================================

  private generateInstanceId(type: AdapterType, name: string): string {
    return `${type}_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========================================
  // Cleanup & Maintenance
  // ========================================

  async cleanupInactive(inactiveThresholdMs: number = 3600000): Promise<number> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, entry] of this.instances.entries()) {
      if (now - entry.lastUsed > inactiveThresholdMs) {
        toRemove.push(id);
      }
    }

    await Promise.all(toRemove.map(id => this.destroy(id)));
    return toRemove.length;
  }

  getStats() {
    const stats = {
      totalInstances: this.instances.size,
      byType: {} as Record<AdapterType, number>,
      oldestInstance: 0,
      newestInstance: 0
    };

    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.instances.values()) {
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
      oldest = Math.min(oldest, entry.createdAt);
      newest = Math.max(newest, entry.createdAt);
    }

    stats.oldestInstance = oldest;
    stats.newestInstance = newest;

    return stats;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function getRegistry(): AdapterRegistry {
  return AdapterRegistry.getInstance();
}

export async function createAdapter(config: AdapterConfigUnion): Promise<string> {
  return getRegistry().create(config);
}

export function getAdapter(id: string): IAgentBackendAdapter {
  return getRegistry().get(id);
}

export async function destroyAdapter(id: string): Promise<void> {
  return getRegistry().destroy(id);
}

// ============================================================================
// Configuration Helpers
// ============================================================================

export function createOpenAIConfig(overrides: Partial<OpenAIConfig> = {}): OpenAIConfig {
  return {
    type: 'openai',
    name: 'openai-adapter',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4',
    ...overrides
  };
}

export function createGeminiConfig(overrides: Partial<GeminiConfig> = {}): GeminiConfig {
  return {
    type: 'google',
    name: 'gemini-adapter',
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    model: 'gemini-pro',
    ...overrides
  };
}

export function createCursorConfig(overrides: Partial<CursorConfig> = {}): CursorConfig {
  return {
    type: 'cursor',
    name: 'cursor-adapter',
    workspaceRoot: process.cwd(),
    enableLSP: true,
    ...overrides
  };
}

export function createAiderConfig(overrides: Partial<AiderConfig> = {}): AiderConfig {
  return {
    type: 'aider',
    name: 'aider-adapter',
    workspaceRoot: process.cwd(),
    model: 'gpt-4',
    autoCommit: false,
    ...overrides
  };
}

export function createContinueConfig(overrides: Partial<ContinueConfig> = {}): ContinueConfig {
  return {
    type: 'continue',
    name: 'continue-adapter',
    workspaceRoot: process.cwd(),
    serverUrl: 'http://localhost:65432',
    ...overrides
  };
}

export function createCodyConfig(overrides: Partial<CodyConfig> = {}): CodyConfig {
  return {
    type: 'sourcegraph',
    name: 'cody-adapter',
    accessToken: process.env.SOURCEGRAPH_TOKEN || '',
    enableCodeSearch: true,
    ...overrides
  };
}
