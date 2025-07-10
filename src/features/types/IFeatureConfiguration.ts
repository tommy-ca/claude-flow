import { FeatureCategory } from './IFeature';

/**
 * Feature configuration interface
 * Defines how features are configured and persisted
 */
export interface IFeatureConfiguration {
  /**
   * Configuration version
   */
  version: string;

  /**
   * Global feature settings
   */
  global: IGlobalFeatureSettings;

  /**
   * Individual feature configurations
   */
  features: IFeatureConfigEntry[];

  /**
   * Feature presets
   */
  presets?: IFeaturePreset[];

  /**
   * Environment-specific overrides
   */
  environments?: Record<string, IEnvironmentConfig>;

  /**
   * Configuration metadata
   */
  metadata?: IConfigMetadata;
}

/**
 * Global feature settings
 */
export interface IGlobalFeatureSettings {
  /**
   * Whether to auto-discover features
   */
  autoDiscover: boolean;

  /**
   * Paths to search for features
   */
  discoveryPaths?: string[];

  /**
   * Whether to auto-enable discovered features
   */
  autoEnable: boolean;

  /**
   * Default feature timeout in milliseconds
   */
  defaultTimeout?: number;

  /**
   * Whether to enable safe mode (disable experimental features)
   */
  safeMode?: boolean;

  /**
   * Whether to validate dependencies on startup
   */
  validateDependencies?: boolean;

  /**
   * Whether to enable hot reload
   */
  hotReload?: boolean;

  /**
   * Log level for features
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Performance monitoring settings
   */
  monitoring?: IMonitoringSettings;
}

/**
 * Individual feature configuration entry
 */
export interface IFeatureConfigEntry {
  /**
   * Feature ID
   */
  id: string;

  /**
   * Whether the feature is enabled
   */
  enabled: boolean;

  /**
   * Feature-specific configuration
   */
  config?: any;

  /**
   * Override feature metadata
   */
  overrides?: {
    name?: string;
    description?: string;
    category?: FeatureCategory;
    priority?: number;
  };

  /**
   * Environment-specific configurations
   */
  environments?: Record<string, any>;

  /**
   * Feature flags
   */
  flags?: IFeatureFlags;
}

/**
 * Feature preset
 */
export interface IFeaturePreset {
  /**
   * Preset ID
   */
  id: string;

  /**
   * Preset name
   */
  name: string;

  /**
   * Preset description
   */
  description: string;

  /**
   * Features to enable
   */
  enableFeatures: string[];

  /**
   * Features to disable
   */
  disableFeatures?: string[];

  /**
   * Feature configurations
   */
  configurations?: Record<string, any>;

  /**
   * Preset tags
   */
  tags?: string[];
}

/**
 * Environment configuration
 */
export interface IEnvironmentConfig {
  /**
   * Environment name
   */
  name: string;

  /**
   * Environment description
   */
  description?: string;

  /**
   * Global settings override
   */
  global?: Partial<IGlobalFeatureSettings>;

  /**
   * Feature overrides
   */
  features?: Record<string, Partial<IFeatureConfigEntry>>;

  /**
   * Active presets for this environment
   */
  activePresets?: string[];
}

/**
 * Configuration metadata
 */
export interface IConfigMetadata {
  /**
   * Configuration creation timestamp
   */
  createdAt: Date;

  /**
   * Configuration last update timestamp
   */
  updatedAt: Date;

  /**
   * Configuration author
   */
  author?: string;

  /**
   * Configuration description
   */
  description?: string;

  /**
   * Configuration tags
   */
  tags?: string[];

  /**
   * Custom metadata
   */
  custom?: Record<string, any>;
}

/**
 * Monitoring settings
 */
export interface IMonitoringSettings {
  /**
   * Whether to enable monitoring
   */
  enabled: boolean;

  /**
   * Metrics collection interval in milliseconds
   */
  metricsInterval?: number;

  /**
   * Whether to track performance
   */
  trackPerformance?: boolean;

  /**
   * Whether to track errors
   */
  trackErrors?: boolean;

  /**
   * Whether to track usage
   */
  trackUsage?: boolean;

  /**
   * Monitoring backends
   */
  backends?: IMonitoringBackend[];
}

/**
 * Monitoring backend
 */
export interface IMonitoringBackend {
  /**
   * Backend type
   */
  type: 'console' | 'file' | 'http' | 'custom';

  /**
   * Backend configuration
   */
  config: any;

  /**
   * Whether the backend is enabled
   */
  enabled: boolean;
}

/**
 * Feature flags
 */
export interface IFeatureFlags {
  /**
   * Whether the feature is experimental
   */
  experimental?: boolean;

  /**
   * Whether the feature is deprecated
   */
  deprecated?: boolean;

  /**
   * Whether the feature is beta
   */
  beta?: boolean;

  /**
   * Whether to skip validation
   */
  skipValidation?: boolean;

  /**
   * Whether to force enable despite dependencies
   */
  forceEnable?: boolean;

  /**
   * Custom flags
   */
  custom?: Record<string, boolean>;
}

/**
 * Configuration validation result
 */
export interface IConfigValidationResult {
  /**
   * Whether the configuration is valid
   */
  valid: boolean;

  /**
   * Validation errors
   */
  errors: IConfigValidationError[];

  /**
   * Validation warnings
   */
  warnings: IConfigValidationWarning[];

  /**
   * Suggested fixes
   */
  suggestions?: string[];
}

/**
 * Configuration validation error
 */
export interface IConfigValidationError {
  /**
   * Error path in configuration
   */
  path: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Error code
   */
  code: string;

  /**
   * Expected value
   */
  expected?: any;

  /**
   * Actual value
   */
  actual?: any;
}

/**
 * Configuration validation warning
 */
export interface IConfigValidationWarning {
  /**
   * Warning path in configuration
   */
  path: string;

  /**
   * Warning message
   */
  message: string;

  /**
   * Warning code
   */
  code: string;

  /**
   * Suggestion
   */
  suggestion?: string;
}

/**
 * Configuration loader interface
 */
export interface IConfigurationLoader {
  /**
   * Load configuration from a source
   * @param source Configuration source (file path, URL, etc.)
   * @returns Loaded configuration
   */
  load(source: string): Promise<IFeatureConfiguration>;

  /**
   * Save configuration to a destination
   * @param config Configuration to save
   * @param destination Save destination
   */
  save(config: IFeatureConfiguration, destination: string): Promise<void>;

  /**
   * Validate configuration
   * @param config Configuration to validate
   * @returns Validation result
   */
  validate(config: IFeatureConfiguration): IConfigValidationResult;

  /**
   * Merge configurations
   * @param base Base configuration
   * @param overrides Override configuration
   * @returns Merged configuration
   */
  merge(base: IFeatureConfiguration, ...overrides: Partial<IFeatureConfiguration>[]): IFeatureConfiguration;

  /**
   * Apply environment configuration
   * @param config Base configuration
   * @param environment Environment name
   * @returns Configuration with environment applied
   */
  applyEnvironment(config: IFeatureConfiguration, environment: string): IFeatureConfiguration;

  /**
   * Apply preset
   * @param config Base configuration
   * @param presetId Preset ID to apply
   * @returns Configuration with preset applied
   */
  applyPreset(config: IFeatureConfiguration, presetId: string): IFeatureConfiguration;
}