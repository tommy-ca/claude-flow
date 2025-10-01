/**
 * CLI Adapter Registry
 *
 * Provides factory and registry for CLI adapters with auto-detection of installed CLIs,
 * capability discovery, and adapter instantiation.
 *
 * @module registry
 */

import { execSync } from 'child_process';
import { CodexCLIAdapter, CodexCLIConfig } from './codex-cli-adapter';
import { CursorAgentAdapter, CursorAgentConfig } from './cursor-agent-adapter';
import { GeminiCLIAdapter, GeminiCLIConfig } from './gemini-cli-adapter';
import { CLIAdapter } from './base-cli-adapter';

/**
 * CLI agent descriptor with metadata
 */
export interface CLIAgentDescriptor {
  /** Unique identifier */
  name: string;

  /** Display name */
  displayName: string;

  /** CLI version */
  version?: string;

  /** Command to execute */
  command: string;

  /** Supported capabilities */
  capabilities: string[];

  /** Supported programming languages */
  supportedLanguages: string[];

  /** Whether the CLI is currently available */
  available: boolean;

  /** Installation instructions */
  installInstructions?: string;
}

/**
 * Adapter factory function type
 */
type AdapterFactory<T extends CLIAdapter = CLIAdapter> = (config: any) => T;

/**
 * Registry of available CLI adapters with capability metadata
 *
 * @example
 * ```typescript
 * const registry = new CLIAdapterRegistry();
 *
 * // Auto-detect installed CLIs
 * const available = await registry.detectAvailableAgents();
 * console.log('Available agents:', available.map(a => a.name));
 *
 * // Register custom adapter
 * registry.register('my-cli', MyAdapter, {
 *   name: 'my-cli',
 *   displayName: 'My Custom CLI',
 *   command: 'my-cli',
 *   capabilities: ['code-generation', 'refactoring'],
 *   supportedLanguages: ['typescript', 'javascript']
 * });
 *
 * // Create adapter instance
 * const adapter = registry.createAdapter('codex', {
 *   apiKey: process.env.OPENAI_API_KEY
 * });
 * ```
 */
export class CLIAdapterRegistry {
  private adapters = new Map<string, AdapterFactory>();
  private descriptors = new Map<string, CLIAgentDescriptor>();

  constructor() {
    // Register built-in adapters
    this.registerBuiltInAdapters();
  }

  /**
   * Register a CLI adapter
   */
  public register<T extends CLIAdapter>(
    name: string,
    factory: AdapterFactory<T>,
    descriptor: Omit<CLIAgentDescriptor, 'available'>
  ): void {
    this.adapters.set(name, factory);
    this.descriptors.set(name, {
      ...descriptor,
      available: false // Will be updated by detection
    });
  }

  /**
   * Create an adapter instance by name
   */
  public createAdapter<T extends CLIAdapter = CLIAdapter>(
    name: string,
    config: any
  ): T {
    const factory = this.adapters.get(name);
    if (!factory) {
      throw new Error(`Adapter '${name}' not registered`);
    }

    return factory(config) as T;
  }

  /**
   * Get descriptor for an adapter
   */
  public getDescriptor(name: string): CLIAgentDescriptor | undefined {
    return this.descriptors.get(name);
  }

  /**
   * List all registered adapters
   */
  public listAdapters(): CLIAgentDescriptor[] {
    return Array.from(this.descriptors.values());
  }

  /**
   * List only available adapters (installed CLIs)
   */
  public listAvailableAdapters(): CLIAgentDescriptor[] {
    return this.listAdapters().filter(d => d.available);
  }

  /**
   * Auto-detect available CLI agents on the system
   */
  public async detectAvailableAgents(): Promise<CLIAgentDescriptor[]> {
    const detected: CLIAgentDescriptor[] = [];

    for (const [name, descriptor] of this.descriptors.entries()) {
      const isAvailable = await this.isCommandAvailable(descriptor.command);

      if (isAvailable) {
        // Try to get version
        const version = await this.getCommandVersion(descriptor.command);

        const updatedDescriptor: CLIAgentDescriptor = {
          ...descriptor,
          available: true,
          version
        };

        this.descriptors.set(name, updatedDescriptor);
        detected.push(updatedDescriptor);
      }
    }

    return detected;
  }

  /**
   * Find best adapter for task requirements
   */
  public findBestAdapter(requirements: {
    capabilities?: string[];
    languages?: string[];
    preferredModel?: string;
  }): CLIAgentDescriptor | null {
    const available = this.listAvailableAdapters();

    if (available.length === 0) {
      return null;
    }

    // Score each adapter based on requirements
    const scored = available.map(adapter => {
      let score = 0;

      // Check capabilities
      if (requirements.capabilities) {
        const matchedCaps = requirements.capabilities.filter(cap =>
          adapter.capabilities.includes(cap)
        );
        score += matchedCaps.length * 10;
      }

      // Check languages
      if (requirements.languages) {
        const matchedLangs = requirements.languages.filter(lang =>
          adapter.supportedLanguages.includes(lang)
        );
        score += matchedLangs.length * 5;
      }

      // Prefer specific models if mentioned
      if (requirements.preferredModel) {
        if (adapter.name.includes(requirements.preferredModel.toLowerCase())) {
          score += 20;
        }
      }

      return { adapter, score };
    });

    // Sort by score and return best
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.score > 0 ? scored[0].adapter : available[0];
  }

  /**
   * Check if a command is available on the system
   */
  private async isCommandAvailable(command: string): Promise<boolean> {
    try {
      // Try 'which' on Unix-like systems
      if (process.platform !== 'win32') {
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
      }

      // Try 'where' on Windows
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get version of a command
   */
  private async getCommandVersion(command: string): Promise<string | undefined> {
    try {
      // Try common version flags
      for (const flag of ['--version', '-v', 'version']) {
        try {
          const output = execSync(`${command} ${flag}`, {
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 5000
          });

          // Extract version number (e.g., "1.2.3")
          const match = output.match(/(\d+\.\d+\.\d+)/);
          if (match) {
            return match[1];
          }

          return output.trim().split('\n')[0];
        } catch {
          continue;
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Register built-in adapters
   */
  private registerBuiltInAdapters(): void {
    // Codex (OpenAI CLI)
    this.register(
      'codex',
      (config: CodexCLIConfig) => new CodexCLIAdapter(config),
      {
        name: 'codex',
        displayName: 'OpenAI Codex CLI',
        command: 'openai',
        capabilities: [
          'code-generation',
          'code-completion',
          'code-explanation',
          'debugging',
          'refactoring',
          'documentation'
        ],
        supportedLanguages: [
          'javascript',
          'typescript',
          'python',
          'java',
          'c',
          'cpp',
          'csharp',
          'go',
          'rust',
          'ruby',
          'php',
          'swift',
          'kotlin',
          'shell'
        ],
        installInstructions: 'npm install -g @openai/codex or brew install codex'
      }
    );

    // Cursor Agent
    this.register(
      'cursor',
      (config: CursorAgentConfig) => new CursorAgentAdapter(config),
      {
        name: 'cursor',
        displayName: 'Cursor Agent CLI',
        command: 'cursor-agent',
        capabilities: [
          'code-generation',
          'refactoring',
          'pair-programming',
          'lsp-integration',
          'multi-file-editing',
          'code-suggestions',
          'context-aware-edits'
        ],
        supportedLanguages: [
          'javascript',
          'typescript',
          'python',
          'java',
          'c',
          'cpp',
          'csharp',
          'go',
          'rust',
          'ruby',
          'php',
          'swift',
          'kotlin'
        ],
        installInstructions: 'curl https://cursor.com/install -fsSL | bash'
      }
    );

    // Gemini CLI
    this.register(
      'gemini',
      (config: GeminiCLIConfig) => new GeminiCLIAdapter(config),
      {
        name: 'gemini',
        displayName: 'Google Gemini CLI',
        command: 'gemini-cli',
        capabilities: [
          'code-generation',
          'code-explanation',
          'multi-modal',
          'large-context',
          'web-search',
          'streaming',
          'safety-ratings'
        ],
        supportedLanguages: [
          'javascript',
          'typescript',
          'python',
          'java',
          'c',
          'cpp',
          'go',
          'rust',
          'kotlin',
          'shell'
        ],
        installInstructions: 'npm install -g @google/gemini-cli or brew install gemini-cli'
      }
    );
  }

  /**
   * Health check for an adapter
   */
  public async healthCheck(name: string): Promise<{
    healthy: boolean;
    message?: string;
    latency?: number;
  }> {
    const descriptor = this.descriptors.get(name);
    if (!descriptor) {
      return { healthy: false, message: 'Adapter not registered' };
    }

    if (!descriptor.available) {
      return { healthy: false, message: 'CLI not installed' };
    }

    const startTime = Date.now();

    try {
      // Try to execute a simple command
      execSync(`${descriptor.command} --help`, {
        stdio: 'ignore',
        timeout: 5000
      });

      const latency = Date.now() - startTime;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${(error as Error).message}`
      };
    }
  }
}

/**
 * Global registry instance
 */
export const globalRegistry = new CLIAdapterRegistry();

/**
 * Convenience function to create an adapter
 */
export function createAdapter<T extends CLIAdapter = CLIAdapter>(
  name: string,
  config: any
): T {
  return globalRegistry.createAdapter<T>(name, config);
}

/**
 * Convenience function to detect available agents
 */
export async function detectAvailableAgents(): Promise<CLIAgentDescriptor[]> {
  return globalRegistry.detectAvailableAgents();
}

/**
 * Convenience function to find best adapter
 */
export function findBestAdapter(requirements: {
  capabilities?: string[];
  languages?: string[];
  preferredModel?: string;
}): CLIAgentDescriptor | null {
  return globalRegistry.findBestAdapter(requirements);
}
