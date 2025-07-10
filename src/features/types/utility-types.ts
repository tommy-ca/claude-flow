import { IFeature, FeatureCategory, FeatureState } from './IFeature';
import { IFeatureConfiguration, IFeatureConfigEntry } from './IFeatureConfiguration';

/**
 * Utility types for the feature system
 * Provides helpful type transformations and compositions
 */

/**
 * Extract feature IDs from an array of features
 */
export type FeatureIds<T extends IFeature[]> = T[number]['id'];

/**
 * Create a feature map type from an array of features
 */
export type FeatureMap<T extends IFeature[]> = {
  [K in T[number] as K['id']]: K;
};

/**
 * Partial feature for updates
 */
export type PartialFeature = Partial<Omit<IFeature, 'id'>> & Pick<IFeature, 'id'>;

/**
 * Feature with required configuration
 */
export type ConfigurableFeature<TConfig = any> = IFeature & {
  configSchema: Record<string, any>;
  config: TConfig;
};

/**
 * Feature initialization options
 */
export interface FeatureInitOptions {
  /**
   * Timeout for initialization in milliseconds
   */
  timeout?: number;

  /**
   * Whether to retry on failure
   */
  retry?: boolean;

  /**
   * Number of retry attempts
   */
  retryAttempts?: number;

  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;

  /**
   * Whether to skip dependency validation
   */
  skipDependencies?: boolean;

  /**
   * Initial configuration
   */
  config?: any;
}

/**
 * Feature operation result
 */
export type FeatureResult<T = any> = FeatureSuccess<T> | FeatureFailure;

/**
 * Successful feature operation
 */
export interface FeatureSuccess<T = any> {
  success: true;
  data: T;
  duration?: number;
}

/**
 * Failed feature operation
 */
export interface FeatureFailure {
  success: false;
  error: Error;
  code?: string;
  duration?: number;
}

/**
 * Feature event
 */
export interface FeatureEvent<T = any> {
  /**
   * Event type
   */
  type: string;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Event timestamp
   */
  timestamp: Date;

  /**
   * Event data
   */
  data?: T;

  /**
   * Event metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Feature dependency graph node
 */
export interface DependencyNode {
  /**
   * Feature ID
   */
  id: string;

  /**
   * Features that depend on this one
   */
  dependents: string[];

  /**
   * Features this one depends on
   */
  dependencies: string[];

  /**
   * Dependency depth in the graph
   */
  depth: number;

  /**
   * Whether this is a circular dependency
   */
  circular: boolean;
}

/**
 * Feature filter criteria
 */
export interface FeatureFilter {
  /**
   * Filter by IDs
   */
  ids?: string[];

  /**
   * Filter by categories
   */
  categories?: FeatureCategory[];

  /**
   * Filter by states
   */
  states?: FeatureState[];

  /**
   * Filter by enabled status
   */
  enabled?: boolean;

  /**
   * Filter by tags
   */
  tags?: string[];

  /**
   * Filter by experimental status
   */
  experimental?: boolean;

  /**
   * Custom filter function
   */
  custom?: (feature: IFeature) => boolean;
}

/**
 * Feature batch operation
 */
export interface FeatureBatchOperation<T = any> {
  /**
   * Operation type
   */
  type: 'enable' | 'disable' | 'configure' | 'initialize' | 'destroy';

  /**
   * Feature IDs to operate on
   */
  featureIds: string[];

  /**
   * Operation options
   */
  options?: T;

  /**
   * Whether to continue on error
   */
  continueOnError?: boolean;

  /**
   * Whether to run in parallel
   */
  parallel?: boolean;

  /**
   * Maximum parallel operations
   */
  parallelLimit?: number;
}

/**
 * Feature batch result
 */
export interface FeatureBatchResult<T = any> {
  /**
   * Overall success
   */
  success: boolean;

  /**
   * Individual results
   */
  results: Map<string, FeatureResult<T>>;

  /**
   * Total duration
   */
  duration: number;

  /**
   * Number of successful operations
   */
  successCount: number;

  /**
   * Number of failed operations
   */
  failureCount: number;
}

/**
 * Deep partial type for nested updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Required deep type
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Feature configuration with defaults
 */
export type FeatureConfigWithDefaults<TConfig> = TConfig & {
  _defaults: Partial<TConfig>;
  _applied: boolean;
};

/**
 * Type-safe feature registry
 */
export interface TypedFeatureRegistry<TFeatures extends Record<string, IFeature>> {
  /**
   * Get a feature by ID with type inference
   */
  get<K extends keyof TFeatures>(id: K): TFeatures[K] | undefined;

  /**
   * Register a feature with type checking
   */
  register<K extends keyof TFeatures>(id: K, feature: TFeatures[K]): void;

  /**
   * Get all features
   */
  getAll(): TFeatures;
}

/**
 * Feature lifecycle state machine
 */
export type FeatureStateMachine = {
  [K in FeatureState]: {
    from: FeatureState[];
    to: FeatureState[];
    actions?: string[];
  };
};

/**
 * Extract configuration type from a feature
 */
export type ExtractConfig<T> = T extends ConfigurableFeature<infer C> ? C : never;

/**
 * Feature with specific lifecycle hooks
 */
export type FeatureWithHooks<T extends keyof IFeature['lifecycle']> = IFeature & {
  lifecycle: Required<Pick<IFeature['lifecycle'], T>>;
};

/**
 * Async feature operation
 */
export type AsyncFeatureOperation<T = any> = () => Promise<FeatureResult<T>>;

/**
 * Feature operation queue item
 */
export interface QueuedOperation<T = any> {
  /**
   * Operation ID
   */
  id: string;

  /**
   * Feature ID
   */
  featureId: string;

  /**
   * Operation to execute
   */
  operation: AsyncFeatureOperation<T>;

  /**
   * Priority (lower is higher priority)
   */
  priority: number;

  /**
   * Queued timestamp
   */
  queuedAt: Date;

  /**
   * Started timestamp
   */
  startedAt?: Date;

  /**
   * Completed timestamp
   */
  completedAt?: Date;

  /**
   * Operation result
   */
  result?: FeatureResult<T>;
}

/**
 * Create a type-safe feature builder
 */
export interface FeatureBuilder<TConfig = any> {
  /**
   * Set feature ID
   */
  withId(id: string): this;

  /**
   * Set feature name
   */
  withName(name: string): this;

  /**
   * Set feature description
   */
  withDescription(description: string): this;

  /**
   * Set feature version
   */
  withVersion(version: string): this;

  /**
   * Set feature category
   */
  withCategory(category: FeatureCategory): this;

  /**
   * Add dependencies
   */
  withDependencies(...dependencies: string[]): this;

  /**
   * Set configuration schema
   */
  withConfigSchema(schema: Record<string, any>): this;

  /**
   * Add lifecycle hook
   */
  withLifecycleHook<K extends keyof IFeature['lifecycle']>(
    hook: K,
    handler: NonNullable<IFeature['lifecycle'][K]>
  ): this;

  /**
   * Set metadata
   */
  withMetadata(metadata: Partial<IFeature['metadata']>): this;

  /**
   * Build the feature
   */
  build(): IFeature;
}

/**
 * Feature validation result
 */
export interface FeatureValidationResult {
  /**
   * Whether the feature is valid
   */
  valid: boolean;

  /**
   * Validation errors
   */
  errors: FeatureValidationError[];

  /**
   * Validation warnings
   */
  warnings: FeatureValidationWarning[];
}

/**
 * Feature validation error
 */
export interface FeatureValidationError {
  /**
   * Error path
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
   * Severity
   */
  severity: 'error' | 'critical';
}

/**
 * Feature validation warning
 */
export interface FeatureValidationWarning {
  /**
   * Warning path
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
}

/**
 * Type for feature plugin
 */
export interface FeaturePlugin {
  /**
   * Plugin name
   */
  name: string;

  /**
   * Plugin version
   */
  version: string;

  /**
   * Initialize the plugin
   */
  initialize(manager: any): Promise<void>;

  /**
   * Features provided by this plugin
   */
  features?: IFeature[];

  /**
   * Enhance existing features
   */
  enhance?(feature: IFeature): IFeature;

  /**
   * Plugin cleanup
   */
  destroy?(): Promise<void>;
}