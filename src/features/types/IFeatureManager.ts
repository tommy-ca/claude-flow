import { IFeature, FeatureState, FeatureCategory } from './IFeature';
import { IFeatureConfiguration } from './IFeatureConfiguration';
import { ITransparencyLayer } from './ITransparencyLayer';

/**
 * Feature management interface
 * Handles discovery, lifecycle, configuration, and coordination of features
 */
export interface IFeatureManager {
  /**
   * Transparency layer for logging and monitoring
   */
  transparency: ITransparencyLayer;

  /**
   * Discover available features
   * @param searchPaths Optional paths to search for features
   * @returns List of discovered features
   */
  discover(searchPaths?: string[]): Promise<IFeature[]>;

  /**
   * Register a feature with the manager
   * @param feature The feature to register
   * @returns True if successfully registered
   */
  register(feature: IFeature): Promise<boolean>;

  /**
   * Unregister a feature
   * @param featureId The ID of the feature to unregister
   * @returns True if successfully unregistered
   */
  unregister(featureId: string): Promise<boolean>;

  /**
   * Get a feature by ID
   * @param featureId The ID of the feature
   * @returns The feature or undefined if not found
   */
  getFeature(featureId: string): IFeature | undefined;

  /**
   * Get all registered features
   * @returns Map of feature ID to feature
   */
  getAllFeatures(): Map<string, IFeature>;

  /**
   * Get features by category
   * @param category The category to filter by
   * @returns List of features in the category
   */
  getFeaturesByCategory(category: FeatureCategory): IFeature[];

  /**
   * Get features by state
   * @param state The state to filter by
   * @returns List of features in the state
   */
  getFeaturesByState(state: FeatureState): IFeature[];

  /**
   * Enable a feature
   * @param featureId The ID of the feature to enable
   * @returns True if successfully enabled
   */
  enableFeature(featureId: string): Promise<boolean>;

  /**
   * Disable a feature
   * @param featureId The ID of the feature to disable
   * @returns True if successfully disabled
   */
  disableFeature(featureId: string): Promise<boolean>;

  /**
   * Toggle a feature's enabled state
   * @param featureId The ID of the feature to toggle
   * @returns The new enabled state
   */
  toggleFeature(featureId: string): Promise<boolean>;

  /**
   * Check if a feature is enabled
   * @param featureId The ID of the feature
   * @returns True if the feature is enabled
   */
  isFeatureEnabled(featureId: string): boolean;

  /**
   * Get the state of a feature
   * @param featureId The ID of the feature
   * @returns The current state of the feature
   */
  getFeatureState(featureId: string): FeatureState | undefined;

  /**
   * Configure a feature
   * @param featureId The ID of the feature
   * @param config The configuration to apply
   * @returns True if successfully configured
   */
  configureFeature(featureId: string, config: any): Promise<boolean>;

  /**
   * Get feature configuration
   * @param featureId The ID of the feature
   * @returns The current configuration
   */
  getFeatureConfig(featureId: string): any;

  /**
   * Validate feature dependencies
   * @param featureId The ID of the feature
   * @returns True if all dependencies are satisfied
   */
  validateDependencies(featureId: string): boolean;

  /**
   * Get missing dependencies for a feature
   * @param featureId The ID of the feature
   * @returns List of missing dependency IDs
   */
  getMissingDependencies(featureId: string): string[];

  /**
   * Initialize all registered features
   * @returns Map of feature ID to initialization result
   */
  initializeAll(): Promise<Map<string, boolean>>;

  /**
   * Destroy all features
   * @returns Map of feature ID to destruction result
   */
  destroyAll(): Promise<Map<string, boolean>>;

  /**
   * Load features from a configuration
   * @param config The configuration to load from
   * @returns List of loaded features
   */
  loadFromConfig(config: IFeatureConfiguration): Promise<IFeature[]>;

  /**
   * Save current feature state to configuration
   * @returns The current configuration
   */
  saveToConfig(): IFeatureConfiguration;

  /**
   * Subscribe to feature state changes
   * @param callback Function to call when state changes
   * @returns Unsubscribe function
   */
  onStateChange(callback: (featureId: string, newState: FeatureState, oldState: FeatureState) => void): () => void;

  /**
   * Subscribe to feature configuration changes
   * @param callback Function to call when configuration changes
   * @returns Unsubscribe function
   */
  onConfigChange(callback: (featureId: string, newConfig: any, oldConfig: any) => void): () => void;

  /**
   * Get feature dependency graph
   * @returns Map of feature ID to list of dependent feature IDs
   */
  getDependencyGraph(): Map<string, string[]>;

  /**
   * Get features in initialization order based on dependencies
   * @returns Ordered list of feature IDs
   */
  getInitializationOrder(): string[];

  /**
   * Check system health
   * @returns Health status report
   */
  healthCheck(): Promise<IFeatureHealthReport>;
}

/**
 * Feature health report
 */
export interface IFeatureHealthReport {
  /**
   * Overall health status
   */
  healthy: boolean;

  /**
   * Total number of features
   */
  totalFeatures: number;

  /**
   * Number of enabled features
   */
  enabledFeatures: number;

  /**
   * Number of features in error state
   */
  errorFeatures: number;

  /**
   * Individual feature health
   */
  features: Map<string, IFeatureHealth>;

  /**
   * Timestamp of the health check
   */
  timestamp: Date;
}

/**
 * Individual feature health
 */
export interface IFeatureHealth {
  /**
   * Feature ID
   */
  id: string;

  /**
   * Current state
   */
  state: FeatureState;

  /**
   * Whether the feature is healthy
   */
  healthy: boolean;

  /**
   * Error message if unhealthy
   */
  error?: string;

  /**
   * Last successful operation timestamp
   */
  lastSuccess?: Date;

  /**
   * Number of errors since last success
   */
  errorCount: number;
}