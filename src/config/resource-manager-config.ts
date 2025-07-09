/**
 * Resource Manager Configuration
 * Centralizes configuration for the resource management system
 */

import { z } from 'zod';
import { ConfigManager } from './config-manager';

// Configuration schemas
const MetricTypeSchema = z.enum(['cpu', 'memory', 'gpu', 'network', 'disk', 'custom']);

const ThresholdSchema = z.object({
  warning: z.number().min(0).max(100),
  critical: z.number().min(0).max(100)
});

const ResourceThresholdsSchema = z.object({
  cpu: ThresholdSchema,
  memory: ThresholdSchema,
  gpu: ThresholdSchema.optional(),
  network: z
    .object({
      latency: z.object({
        warning: z.number().positive(),
        critical: z.number().positive()
      }),
      bandwidth: z.object({
        warning: z.number().positive(),
        critical: z.number().positive()
      })
    })
    .optional(),
  disk: ThresholdSchema.optional()
});

const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  interval: z.number().positive().default(30000), // 30 seconds
  retention: z.number().positive().default(604800000), // 7 days in ms
  metrics: z.array(MetricTypeSchema).default(['cpu', 'memory', 'network']),
  alerting: z
    .object({
      enabled: z.boolean().default(true),
      channels: z.array(z.enum(['console', 'file', 'webhook', 'email'])).default(['console']),
      cooldown: z.number().positive().default(300000) // 5 minutes
    })
    .default({}),
  persistence: z
    .object({
      enabled: z.boolean().default(true),
      backend: z.enum(['memory', 'file', 'database']).default('file'),
      path: z.string().default('./data/resource-metrics')
    })
    .default({})
});

const DeploymentConstraintsSchema = z.object({
  maxAgentsPerServer: z.number().positive().default(10),
  minServerHealth: z.enum(['healthy', 'degraded']).default('healthy'),
  requireGPU: z.boolean().default(false),
  networkLatencyMax: z.number().positive().default(100), // ms
  memoryReservation: z.number().min(0).max(100).default(10), // % to keep free
  cpuReservation: z.number().min(0).max(100).default(20) // % to keep free
});

const OptimizationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  strategy: z.enum(['balanced', 'performance', 'efficiency', 'cost']).default('balanced'),
  autoApply: z.boolean().default(false),
  schedule: z
    .object({
      enabled: z.boolean().default(false),
      cron: z.string().default('0 */6 * * *') // Every 6 hours
    })
    .default({}),
  constraints: DeploymentConstraintsSchema.default({})
});

const PredictionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  horizon: z
    .object({
      shortTerm: z.number().positive().default(3600000), // 1 hour
      mediumTerm: z.number().positive().default(86400000), // 24 hours
      longTerm: z.number().positive().default(604800000) // 7 days
    })
    .default({}),
  algorithms: z.array(z.enum(['linear', 'exponential', 'seasonal', 'ml'])).default(['linear']),
  confidence: z
    .object({
      minimum: z.number().min(0).max(1).default(0.6),
      target: z.number().min(0).max(1).default(0.8)
    })
    .default({})
});

const AlertingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  channels: z
    .array(
      z.object({
        type: z.enum(['console', 'file', 'webhook', 'email', 'slack']),
        config: z.record(z.any()),
        enabled: z.boolean().default(true)
      })
    )
    .default([]),
  rules: z
    .array(
      z.object({
        name: z.string(),
        condition: z.string(), // Expression to evaluate
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        cooldown: z.number().positive().default(300000),
        enabled: z.boolean().default(true)
      })
    )
    .default([]),
  escalation: z
    .object({
      enabled: z.boolean().default(false),
      levels: z
        .array(
          z.object({
            delay: z.number().positive(),
            channels: z.array(z.string())
          })
        )
        .default([])
    })
    .default({})
});

const ResourceManagerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  thresholds: ResourceThresholdsSchema.default({}),
  monitoring: MonitoringConfigSchema.default({}),
  optimization: OptimizationConfigSchema.default({}),
  prediction: PredictionConfigSchema.default({}),
  alerting: AlertingConfigSchema.default({}),
  integrations: z
    .object({
      mcp: z
        .object({
          enabled: z.boolean().default(true),
          reportInterval: z.number().positive().default(30000),
          servers: z.array(z.string()).default([])
        })
        .default({}),
      swarm: z
        .object({
          enabled: z.boolean().default(true),
          coordinatorIntegration: z.boolean().default(true),
          autoDeployment: z.boolean().default(true)
        })
        .default({}),
      memory: z
        .object({
          enabled: z.boolean().default(true),
          backend: z.enum(['memory', 'file', 'database']).default('file'),
          retention: z.number().positive().default(2592000000) // 30 days
        })
        .default({})
    })
    .default({}),
  experimental: z
    .object({
      enableMLPredictions: z.boolean().default(false),
      enableAutoScaling: z.boolean().default(false),
      enableCostOptimization: z.boolean().default(false)
    })
    .default({})
});

export type ResourceManagerConfig = z.infer<typeof ResourceManagerConfigSchema>;
export type MetricType = z.infer<typeof MetricTypeSchema>;
export type ResourceThresholds = z.infer<typeof ResourceThresholdsSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type OptimizationConfig = z.infer<typeof OptimizationConfigSchema>;
export type PredictionConfig = z.infer<typeof PredictionConfigSchema>;
export type AlertingConfig = z.infer<typeof AlertingConfigSchema>;
export type DeploymentConstraints = z.infer<typeof DeploymentConstraintsSchema>;

/**
 * Resource Manager Configuration Manager
 * Handles loading, validation, and management of resource manager configuration
 */
export class ResourceManagerConfigManager {
  private config: ResourceManagerConfig;
  private configPath: string;
  private configManager: ConfigManager;

  constructor(configPath: string = 'resource-manager') {
    this.configPath = configPath;
    this.configManager = new ConfigManager();
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    await this.loadConfig();
    await this.validateConfig();
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<void> {
    try {
      const rawConfig = await this.configManager.get(this.configPath);

      if (rawConfig) {
        this.config = ResourceManagerConfigSchema.parse(rawConfig);
      } else {
        // Create default configuration
        this.config = this.getDefaultConfig();
        await this.saveConfig();
      }
    } catch (error) {
      throw new Error(
        `Failed to load resource manager configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(): Promise<void> {
    try {
      await this.configManager.set(this.configPath, this.config);
    } catch (error) {
      throw new Error(
        `Failed to save resource manager configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<void> {
    try {
      ResourceManagerConfigSchema.parse(this.config);
    } catch (error) {
      throw new Error(
        `Invalid resource manager configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ResourceManagerConfig {
    return {
      enabled: true,
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        gpu: { warning: 85, critical: 95 },
        network: {
          latency: { warning: 50, critical: 100 },
          bandwidth: { warning: 100, critical: 10 } // Mbps
        },
        disk: { warning: 80, critical: 95 }
      },
      monitoring: {
        enabled: true,
        interval: 30000,
        retention: 604800000,
        metrics: ['cpu', 'memory', 'network'],
        alerting: {
          enabled: true,
          channels: ['console'],
          cooldown: 300000
        },
        persistence: {
          enabled: true,
          backend: 'file',
          path: './data/resource-metrics'
        }
      },
      optimization: {
        enabled: true,
        strategy: 'balanced',
        autoApply: false,
        schedule: {
          enabled: false,
          cron: '0 */6 * * *'
        },
        constraints: {
          maxAgentsPerServer: 10,
          minServerHealth: 'healthy',
          requireGPU: false,
          networkLatencyMax: 100,
          memoryReservation: 10,
          cpuReservation: 20
        }
      },
      prediction: {
        enabled: true,
        horizon: {
          shortTerm: 3600000,
          mediumTerm: 86400000,
          longTerm: 604800000
        },
        algorithms: ['linear'],
        confidence: {
          minimum: 0.6,
          target: 0.8
        }
      },
      alerting: {
        enabled: true,
        channels: [
          {
            type: 'console',
            config: { level: 'info' },
            enabled: true
          },
          {
            type: 'file',
            config: {
              path: './logs/resource-alerts.log',
              level: 'warn'
            },
            enabled: true
          }
        ],
        rules: [
          {
            name: 'High CPU Usage',
            condition: 'cpu.usage > thresholds.cpu.warning',
            severity: 'high',
            cooldown: 300000,
            enabled: true
          },
          {
            name: 'Critical Memory Usage',
            condition: 'memory.usage > thresholds.memory.critical',
            severity: 'critical',
            cooldown: 180000,
            enabled: true
          },
          {
            name: 'Server Offline',
            condition: 'server.status == "offline"',
            severity: 'critical',
            cooldown: 60000,
            enabled: true
          }
        ],
        escalation: {
          enabled: false,
          levels: []
        }
      },
      integrations: {
        mcp: {
          enabled: true,
          reportInterval: 30000,
          servers: []
        },
        swarm: {
          enabled: true,
          coordinatorIntegration: true,
          autoDeployment: true
        },
        memory: {
          enabled: true,
          backend: 'file',
          retention: 2592000000
        }
      },
      experimental: {
        enableMLPredictions: false,
        enableAutoScaling: false,
        enableCostOptimization: false
      }
    };
  }

  /**
   * Get complete configuration
   */
  getConfig(): ResourceManagerConfig {
    return this.config;
  }

  /**
   * Get specific configuration section
   */
  getSection<T extends keyof ResourceManagerConfig>(section: T): ResourceManagerConfig[T] {
    return this.config[section];
  }

  /**
   * Update configuration section
   */
  async updateSection<T extends keyof ResourceManagerConfig>(
    section: T,
    updates: Partial<ResourceManagerConfig[T]>
  ): Promise<void> {
    this.config[section] = { ...this.config[section], ...updates };
    await this.validateConfig();
    await this.saveConfig();
  }

  /**
   * Get threshold for a specific metric
   */
  getThreshold(metric: MetricType): { warning: number; critical: number } | null {
    const thresholds = this.config.thresholds;

    switch (metric) {
      case 'cpu':
        return thresholds.cpu;
      case 'memory':
        return thresholds.memory;
      case 'gpu':
        return thresholds.gpu || null;
      case 'disk':
        return thresholds.disk || null;
      default:
        return null;
    }
  }

  /**
   * Update threshold for a specific metric
   */
  async updateThreshold(
    metric: MetricType,
    threshold: { warning: number; critical: number }
  ): Promise<void> {
    const thresholds = { ...this.config.thresholds };

    switch (metric) {
      case 'cpu':
        thresholds.cpu = threshold;
        break;
      case 'memory':
        thresholds.memory = threshold;
        break;
      case 'gpu':
        thresholds.gpu = threshold;
        break;
      case 'disk':
        thresholds.disk = threshold;
        break;
      default:
        throw new Error(`Invalid metric type: ${metric}`);
    }

    await this.updateSection('thresholds', thresholds);
  }

  /**
   * Enable/disable monitoring
   */
  async setMonitoringEnabled(enabled: boolean): Promise<void> {
    await this.updateSection('monitoring', { enabled });
  }

  /**
   * Update monitoring interval
   */
  async setMonitoringInterval(interval: number): Promise<void> {
    if (interval < 1000) {
      throw new Error('Monitoring interval must be at least 1000ms');
    }

    await this.updateSection('monitoring', { interval });
  }

  /**
   * Enable/disable optimization
   */
  async setOptimizationEnabled(enabled: boolean): Promise<void> {
    await this.updateSection('optimization', { enabled });
  }

  /**
   * Update optimization strategy
   */
  async setOptimizationStrategy(
    strategy: 'balanced' | 'performance' | 'efficiency' | 'cost'
  ): Promise<void> {
    await this.updateSection('optimization', { strategy });
  }

  /**
   * Enable/disable auto-apply optimization
   */
  async setAutoApplyOptimization(autoApply: boolean): Promise<void> {
    await this.updateSection('optimization', { autoApply });
  }

  /**
   * Add alert rule
   */
  async addAlertRule(rule: {
    name: string;
    condition: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    cooldown?: number;
    enabled?: boolean;
  }): Promise<void> {
    const alerting = { ...this.config.alerting };
    alerting.rules.push({
      cooldown: 300000,
      enabled: true,
      ...rule
    });

    await this.updateSection('alerting', alerting);
  }

  /**
   * Remove alert rule
   */
  async removeAlertRule(name: string): Promise<void> {
    const alerting = { ...this.config.alerting };
    alerting.rules = alerting.rules.filter(rule => rule.name !== name);

    await this.updateSection('alerting', alerting);
  }

  /**
   * Enable/disable experimental features
   */
  async setExperimentalFeature(
    feature: keyof ResourceManagerConfig['experimental'],
    enabled: boolean
  ): Promise<void> {
    const experimental = { ...this.config.experimental };
    experimental[feature] = enabled;

    await this.updateSection('experimental', experimental);
  }

  /**
   * Get deployment constraints
   */
  getDeploymentConstraints(): DeploymentConstraints {
    return this.config.optimization.constraints;
  }

  /**
   * Update deployment constraints
   */
  async updateDeploymentConstraints(constraints: Partial<DeploymentConstraints>): Promise<void> {
    const optimization = { ...this.config.optimization };
    optimization.constraints = { ...optimization.constraints, ...constraints };

    await this.updateSection('optimization', optimization);
  }

  /**
   * Get alerting configuration
   */
  getAlertingConfig(): AlertingConfig {
    return this.config.alerting;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof ResourceManagerConfig): boolean {
    return this.config[feature] as boolean;
  }

  /**
   * Get integration configuration
   */
  getIntegrationConfig(): ResourceManagerConfig['integrations'] {
    return this.config.integrations;
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.saveConfig();
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = ResourceManagerConfigSchema.parse(importedConfig);
      await this.saveConfig();
    } catch (error) {
      throw new Error(
        `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
