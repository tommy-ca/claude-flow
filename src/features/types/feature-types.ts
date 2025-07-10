/**
 * Feature System Type Definitions
 * Transparent and extensible feature architecture for claude-flow
 */

/**
 * Feature lifecycle states
 */
export enum FeatureState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ERROR = 'error',
  DISABLED = 'disabled'
}

/**
 * Feature priority levels
 */
export enum FeaturePriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

/**
 * Feature dependency definition
 */
export interface FeatureDependency {
  featureId: string;
  version?: string;
  optional?: boolean;
}

/**
 * Feature configuration schema
 */
export interface FeatureConfig {
  enabled: boolean;
  priority?: FeaturePriority;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Feature metadata
 */
export interface FeatureMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: FeatureDependency[];
  tags?: string[];
}

/**
 * Feature lifecycle hooks
 */
export interface FeatureLifecycle {
  onInit?(): Promise<void>;
  onStart?(): Promise<void>;
  onStop?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onError?(error: Error): Promise<void>;
  onConfigChange?(newConfig: FeatureConfig): Promise<void>;
}

/**
 * Base feature interface
 */
export interface IFeature extends FeatureLifecycle {
  readonly metadata: FeatureMetadata;
  readonly state: FeatureState;
  readonly config: FeatureConfig;
  
  initialize(config?: FeatureConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  getState(): FeatureState;
  updateConfig(config: Partial<FeatureConfig>): Promise<void>;
}

/**
 * Feature manager interface
 */
export interface IFeatureManager {
  register(feature: IFeature): Promise<void>;
  unregister(featureId: string): Promise<void>;
  get(featureId: string): IFeature | undefined;
  getAll(): Map<string, IFeature>;
  enable(featureId: string): Promise<void>;
  disable(featureId: string): Promise<void>;
  start(featureId?: string): Promise<void>;
  stop(featureId?: string): Promise<void>;
  isEnabled(featureId: string): boolean;
  getState(featureId: string): FeatureState | undefined;
}

/**
 * Feature registry interface
 */
export interface IFeatureRegistry {
  discover(path?: string): Promise<IFeature[]>;
  load(featureId: string): Promise<IFeature>;
  scan(patterns?: string[]): Promise<FeatureMetadata[]>;
  validate(feature: IFeature): boolean;
}

/**
 * Transparency layer event types
 */
export enum TransparencyEventType {
  FEATURE_REGISTERED = 'feature:registered',
  FEATURE_UNREGISTERED = 'feature:unregistered',
  FEATURE_STATE_CHANGE = 'feature:state:change',
  FEATURE_CONFIG_CHANGE = 'feature:config:change',
  FEATURE_ERROR = 'feature:error',
  FEATURE_LOG = 'feature:log'
}

/**
 * Transparency event
 */
export interface TransparencyEvent {
  type: TransparencyEventType;
  featureId: string;
  timestamp: Date;
  data?: any;
  error?: Error;
}

/**
 * Transparency layer interface
 */
export interface ITransparencyLayer {
  log(event: TransparencyEvent): void;
  subscribe(callback: (event: TransparencyEvent) => void): () => void;
  getHistory(featureId?: string, limit?: number): TransparencyEvent[];
  clear(featureId?: string): void;
}

/**
 * Configuration manager interface
 */
export interface IConfigurationManager {
  load(path?: string): Promise<Record<string, FeatureConfig>>;
  save(configs: Record<string, FeatureConfig>, path?: string): Promise<void>;
  get(featureId: string): FeatureConfig | undefined;
  set(featureId: string, config: FeatureConfig): void;
  update(featureId: string, updates: Partial<FeatureConfig>): void;
  validate(featureId: string, config: FeatureConfig): boolean;
}

/**
 * Feature constructor type
 */
export type FeatureConstructor = new (config?: FeatureConfig) => IFeature;

/**
 * Feature factory function type
 */
export type FeatureFactory = (config?: FeatureConfig) => IFeature | Promise<IFeature>;