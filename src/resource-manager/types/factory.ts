/**
 * Factory interfaces for creating resource management components
 */

import {
  IResourceMonitor,
  IResourceMonitorConfig,
  IMonitoringStrategy,
  IAlertHandler,
  IMetricExporter
} from './monitor';

import { IResourceAllocator, IResourceAllocatorConfig, IAllocationStrategy } from './allocator';

import { IResourcePressureDetector, IPressureDetectorConfig } from './pressure';

import { IAgentResourceManager, IAgentResourceConfig } from './agent';

import { IMcpIntegration, ISwarmIntegration, IClaudeFlowIntegration } from './integration';

/**
 * Resource manager factory interface
 */
export interface IResourceManagerFactory {
  /** Create resource monitor */
  createMonitor(config: IResourceMonitorConfig): IResourceMonitor;

  /** Create resource allocator */
  createAllocator(config: IResourceAllocatorConfig): IResourceAllocator;

  /** Create pressure detector */
  createPressureDetector(config: IPressureDetectorConfig): IResourcePressureDetector;

  /** Create agent resource manager */
  createAgentManager(config: IAgentResourceConfig): IAgentResourceManager;

  /** Register custom monitor strategy */
  registerMonitorStrategy(strategy: IMonitoringStrategy): void;

  /** Register custom allocation strategy */
  registerAllocationStrategy(strategy: IAllocationStrategy): void;

  /** Register custom alert handler */
  registerAlertHandler(handler: IAlertHandler): void;

  /** Register custom metric exporter */
  registerMetricExporter(exporter: IMetricExporter): void;

  /** Get available strategies */
  getAvailableStrategies(): {
    monitoring: string[];
    allocation: string[];
  };

  /** Get registered handlers */
  getRegisteredHandlers(): {
    alerts: string[];
    exporters: string[];
  };
}

/**
 * Integration factory interface
 */
export interface IIntegrationFactory {
  /** Create MCP integration */
  createMcpIntegration(config?: any): IMcpIntegration;

  /** Create swarm integration */
  createSwarmIntegration(config?: any): ISwarmIntegration;

  /** Create Claude Flow integration */
  createClaudeFlowIntegration(config?: any): IClaudeFlowIntegration;

  /** Register custom integration */
  registerIntegration(type: string, factory: IntegrationFactoryFunction): void;

  /** Create custom integration */
  createIntegration(type: string, config?: any): IIntegration;

  /** Get available integrations */
  getAvailableIntegrations(): string[];
}

/**
 * Integration factory function
 */
export type IntegrationFactoryFunction = (config?: any) => IIntegration;

/**
 * Base integration interface
 */
export interface IIntegration {
  /** Integration name */
  name: string;

  /** Integration type */
  type: string;

  /** Initialize integration */
  initialize(config?: any): Promise<void>;

  /** Shutdown integration */
  shutdown(): Promise<void>;

  /** Check if integration is active */
  isActive(): boolean;

  /** Get integration status */
  getStatus(): IIntegrationStatus;
}

/**
 * Integration status
 */
export interface IIntegrationStatus {
  /** Active status */
  active: boolean;

  /** Connection status */
  connected: boolean;

  /** Last activity timestamp */
  lastActivity?: Date;

  /** Error information */
  error?: {
    message: string;
    timestamp: Date;
  };

  /** Integration metrics */
  metrics?: {
    messagesIn: number;
    messagesOut: number;
    errors: number;
    latency: number;
  };
}

/**
 * Component factory configuration
 */
export interface IComponentFactoryConfig {
  /** Available monitoring strategies */
  monitoringStrategies?: Map<string, IMonitoringStrategy>;

  /** Available allocation strategies */
  allocationStrategies?: Map<string, IAllocationStrategy>;

  /** Available alert handlers */
  alertHandlers?: Map<string, IAlertHandler>;

  /** Available metric exporters */
  metricExporters?: Map<string, IMetricExporter>;

  /** Default configurations */
  defaults?: {
    monitor?: Partial<IResourceMonitorConfig>;
    allocator?: Partial<IResourceAllocatorConfig>;
    pressureDetector?: Partial<IPressureDetectorConfig>;
    agent?: Partial<IAgentResourceConfig>;
  };
}

/**
 * Factory provider interface
 */
export interface IFactoryProvider {
  /** Get resource manager factory */
  getResourceManagerFactory(config?: IComponentFactoryConfig): IResourceManagerFactory;

  /** Get integration factory */
  getIntegrationFactory(): IIntegrationFactory;

  /** Register factory extension */
  registerExtension(extension: IFactoryExtension): void;

  /** Get registered extensions */
  getExtensions(): IFactoryExtension[];
}

/**
 * Factory extension interface
 */
export interface IFactoryExtension {
  /** Extension name */
  name: string;

  /** Extension version */
  version: string;

  /** Initialize extension */
  initialize(provider: IFactoryProvider): void;

  /** Extend resource manager factory */
  extendResourceManagerFactory?(factory: IResourceManagerFactory): void;

  /** Extend integration factory */
  extendIntegrationFactory?(factory: IIntegrationFactory): void;
}

/**
 * Strategy registry interface
 */
export interface IStrategyRegistry {
  /** Register monitoring strategy */
  registerMonitoringStrategy(name: string, strategy: IMonitoringStrategy): void;

  /** Register allocation strategy */
  registerAllocationStrategy(name: string, strategy: IAllocationStrategy): void;

  /** Get monitoring strategy */
  getMonitoringStrategy(name: string): IMonitoringStrategy | undefined;

  /** Get allocation strategy */
  getAllocationStrategy(name: string): IAllocationStrategy | undefined;

  /** List available strategies */
  listStrategies(): {
    monitoring: string[];
    allocation: string[];
  };

  /** Remove strategy */
  removeStrategy(type: 'monitoring' | 'allocation', name: string): boolean;
}

/**
 * Plugin system interface
 */
export interface IPluginSystem {
  /** Load plugin */
  loadPlugin(path: string): Promise<IPlugin>;

  /** Unload plugin */
  unloadPlugin(name: string): Promise<void>;

  /** Get loaded plugins */
  getPlugins(): IPlugin[];

  /** Get plugin by name */
  getPlugin(name: string): IPlugin | undefined;

  /** Enable plugin */
  enablePlugin(name: string): void;

  /** Disable plugin */
  disablePlugin(name: string): void;
}

/**
 * Plugin interface
 */
export interface IPlugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Plugin description */
  description: string;

  /** Plugin dependencies */
  dependencies?: string[];

  /** Initialize plugin */
  initialize(context: IPluginContext): Promise<void>;

  /** Shutdown plugin */
  shutdown(): Promise<void>;

  /** Plugin enabled status */
  isEnabled(): boolean;

  /** Plugin capabilities */
  capabilities: IPluginCapabilities;
}

/**
 * Plugin context
 */
export interface IPluginContext {
  /** Resource manager factory */
  resourceManagerFactory: IResourceManagerFactory;

  /** Integration factory */
  integrationFactory: IIntegrationFactory;

  /** Strategy registry */
  strategyRegistry: IStrategyRegistry;

  /** Plugin configuration */
  config: any;

  /** Logger */
  logger: ILogger;
}

/**
 * Plugin capabilities
 */
export interface IPluginCapabilities {
  /** Provides monitoring strategies */
  monitoringStrategies?: string[];

  /** Provides allocation strategies */
  allocationStrategies?: string[];

  /** Provides integrations */
  integrations?: string[];

  /** Provides alert handlers */
  alertHandlers?: string[];

  /** Provides metric exporters */
  metricExporters?: string[];
}

/**
 * Logger interface
 */
export interface ILogger {
  /** Log debug message */
  debug(message: string, ...args: any[]): void;

  /** Log info message */
  info(message: string, ...args: any[]): void;

  /** Log warning message */
  warn(message: string, ...args: any[]): void;

  /** Log error message */
  error(message: string, ...args: any[]): void;

  /** Create child logger */
  child(context: any): ILogger;
}
