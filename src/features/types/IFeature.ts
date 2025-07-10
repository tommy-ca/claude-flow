/**
 * Core feature interface for the transparent feature system
 * All features must implement this interface to be managed by the system
 */
export interface IFeature {
  /**
   * Unique identifier for the feature
   */
  id: string;

  /**
   * Human-readable name of the feature
   */
  name: string;

  /**
   * Detailed description of what the feature does
   */
  description: string;

  /**
   * Version of the feature following semantic versioning
   */
  version: string;

  /**
   * Category of the feature for organization
   */
  category: FeatureCategory;

  /**
   * Whether the feature is currently enabled
   */
  enabled: boolean;

  /**
   * List of feature IDs that this feature depends on
   */
  dependencies?: string[];

  /**
   * Configuration schema for the feature
   */
  configSchema?: Record<string, any>;

  /**
   * Lifecycle hooks for the feature
   */
  lifecycle: IFeatureLifecycle;

  /**
   * Metadata for the feature
   */
  metadata?: IFeatureMetadata;
}

/**
 * Feature lifecycle hooks
 */
export interface IFeatureLifecycle {
  /**
   * Called when the feature is being initialized
   */
  onInit?: () => Promise<void>;

  /**
   * Called when the feature is being enabled
   */
  onEnable?: () => Promise<void>;

  /**
   * Called when the feature is being disabled
   */
  onDisable?: () => Promise<void>;

  /**
   * Called when the feature is being destroyed
   */
  onDestroy?: () => Promise<void>;

  /**
   * Called when feature configuration changes
   */
  onConfigChange?: (newConfig: any, oldConfig: any) => Promise<void>;
}

/**
 * Feature metadata
 */
export interface IFeatureMetadata {
  /**
   * Author of the feature
   */
  author?: string;

  /**
   * License of the feature
   */
  license?: string;

  /**
   * Tags for feature discovery
   */
  tags?: string[];

  /**
   * Creation timestamp
   */
  createdAt?: Date;

  /**
   * Last update timestamp
   */
  updatedAt?: Date;

  /**
   * Whether this is an experimental feature
   */
  experimental?: boolean;

  /**
   * Minimum required claude-flow version
   */
  minVersion?: string;

  /**
   * Maximum supported claude-flow version
   */
  maxVersion?: string;
}

/**
 * Feature categories
 */
export enum FeatureCategory {
  CORE = 'core',
  AGENT = 'agent',
  MEMORY = 'memory',
  COORDINATION = 'coordination',
  INTEGRATION = 'integration',
  UI = 'ui',
  UTILITY = 'utility',
  EXPERIMENTAL = 'experimental',
  CUSTOM = 'custom'
}

/**
 * Feature state
 */
export enum FeatureState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ENABLING = 'enabling',
  ENABLED = 'enabled',
  DISABLING = 'disabling',
  DISABLED = 'disabled',
  ERROR = 'error',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed'
}

/**
 * Feature priority levels for initialization order
 */
export enum FeaturePriority {
  CRITICAL = 0,
  HIGH = 10,
  MEDIUM = 50,
  LOW = 100,
  OPTIONAL = 1000
}