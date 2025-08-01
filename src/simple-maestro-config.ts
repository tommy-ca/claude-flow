/**
 * Simple Maestro Configuration - 3-5 Key Options Only
 * 
 * KISS principle: Essential configuration only, no complex feature flags.
 * Replaces 100+ configuration options with clean, focused settings.
 */

import { join } from 'path';
import { MaestroConfig } from './simple-maestro-interfaces.js';

/**
 * Default configuration with sensible defaults
 */
export const DEFAULT_CONFIG: MaestroConfig = {
  workingDirectory: join(process.cwd(), '.maestro'),
  enableValidation: true,
  qualityThreshold: 0.7,
  maxConcurrentTasks: 3,
  autoSave: true
};

/**
 * Configuration builder with validation
 */
export class ConfigBuilder {
  private config: MaestroConfig;

  constructor(baseConfig: Partial<MaestroConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...baseConfig };
  }

  /**
   * Set working directory
   */
  workingDirectory(path: string): ConfigBuilder {
    this.config.workingDirectory = path;
    return this;
  }

  /**
   * Enable/disable validation
   */
  validation(enabled: boolean): ConfigBuilder {
    this.config.enableValidation = enabled;
    return this;
  }

  /**
   * Set quality threshold (0-1)
   */
  qualityThreshold(threshold: number): ConfigBuilder {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Quality threshold must be between 0 and 1');
    }
    this.config.qualityThreshold = threshold;
    return this;
  }

  /**
   * Set maximum concurrent tasks
   */
  maxTasks(max: number): ConfigBuilder {
    if (max < 1 || max > 10) {
      throw new Error('Max concurrent tasks must be between 1 and 10');
    }
    this.config.maxConcurrentTasks = max;
    return this;
  }

  /**
   * Enable/disable auto-save
   */
  autoSave(enabled: boolean): ConfigBuilder {
    this.config.autoSave = enabled;
    return this;
  }

  /**
   * Build validated configuration
   */
  build(): MaestroConfig {
    this.validateConfig();
    return { ...this.config };
  }

  /**
   * Simple validation of configuration
   */
  private validateConfig(): void {
    if (!this.config.workingDirectory) {
      throw new Error('Working directory is required');
    }
    
    if (this.config.qualityThreshold < 0 || this.config.qualityThreshold > 1) {
      throw new Error('Quality threshold must be between 0 and 1');
    }
    
    if (this.config.maxConcurrentTasks < 1) {
      throw new Error('Max concurrent tasks must be at least 1');
    }
  }
}

/**
 * Simple configuration presets
 */
export const CONFIG_PRESETS = {
  /**
   * Development preset - relaxed validation, higher concurrency
   */
  development(): MaestroConfig {
    return new ConfigBuilder()
      .validation(true)
      .qualityThreshold(0.6)
      .maxTasks(5)
      .autoSave(true)
      .build();
  },

  /**
   * Production preset - strict validation, conservative concurrency
   */
  production(): MaestroConfig {
    return new ConfigBuilder()
      .validation(true)
      .qualityThreshold(0.8)
      .maxTasks(2)
      .autoSave(true)
      .build();
  },

  /**
   * Testing preset - minimal validation, single task
   */
  testing(): MaestroConfig {
    return new ConfigBuilder()
      .validation(false)
      .qualityThreshold(0.5)
      .maxTasks(1)
      .autoSave(false)
      .build();
  }
};

/**
 * Load configuration from environment or defaults
 */
export function loadConfig(): MaestroConfig {
  const builder = new ConfigBuilder();

  // Load from environment variables if available
  if (process.env.MAESTRO_WORKING_DIR) {
    builder.workingDirectory(process.env.MAESTRO_WORKING_DIR);
  }

  if (process.env.MAESTRO_VALIDATION !== undefined) {
    builder.validation(process.env.MAESTRO_VALIDATION === 'true');
  }

  if (process.env.MAESTRO_QUALITY_THRESHOLD) {
    const threshold = parseFloat(process.env.MAESTRO_QUALITY_THRESHOLD);
    if (!isNaN(threshold)) {
      builder.qualityThreshold(threshold);
    }
  }

  if (process.env.MAESTRO_MAX_TASKS) {
    const maxTasks = parseInt(process.env.MAESTRO_MAX_TASKS, 10);
    if (!isNaN(maxTasks)) {
      builder.maxTasks(maxTasks);
    }
  }

  if (process.env.MAESTRO_AUTO_SAVE !== undefined) {
    builder.autoSave(process.env.MAESTRO_AUTO_SAVE === 'true');
  }

  return builder.build();
}