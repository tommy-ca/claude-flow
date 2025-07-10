import {
  IFeature,
  FeatureState,
  FeatureConfig,
  FeatureMetadata,
  FeatureLifecycle,
  FeaturePriority
} from '../types/feature-types';

/**
 * Base implementation of the Feature interface
 */
export abstract class Feature implements IFeature {
  private _state: FeatureState = FeatureState.UNINITIALIZED;
  private _config: FeatureConfig;

  constructor(
    public readonly metadata: FeatureMetadata,
    initialConfig?: Partial<FeatureConfig>
  ) {
    this._config = {
      enabled: false,
      priority: FeaturePriority.NORMAL,
      ...initialConfig
    };
  }

  get state(): FeatureState {
    return this._state;
  }

  get config(): FeatureConfig {
    return { ...this._config };
  }

  async initialize(config?: FeatureConfig): Promise<void> {
    try {
      this._state = FeatureState.INITIALIZING;
      
      if (config) {
        this._config = { ...config };
      }

      if (this.onInit) {
        await this.onInit();
      }

      this._state = FeatureState.READY;
    } catch (error) {
      this._state = FeatureState.ERROR;
      if (this.onError) {
        await this.onError(error as Error);
      }
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this._state === FeatureState.UNINITIALIZED) {
      throw new Error('Feature must be initialized before starting');
    }

    if (!this._config.enabled) {
      throw new Error('Cannot start disabled feature');
    }

    try {
      this._state = FeatureState.ACTIVE;
      if (this.onStart) {
        await this.onStart();
      }
    } catch (error) {
      this._state = FeatureState.ERROR;
      if (this.onError) {
        await this.onError(error as Error);
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this._state = FeatureState.SUSPENDED;
      if (this.onStop) {
        await this.onStop();
      }
    } catch (error) {
      this._state = FeatureState.ERROR;
      if (this.onError) {
        await this.onError(error as Error);
      }
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.onDestroy) {
        await this.onDestroy();
      }
      this._state = FeatureState.DISABLED;
    } catch (error) {
      this._state = FeatureState.ERROR;
      if (this.onError) {
        await this.onError(error as Error);
      }
      throw error;
    }
  }

  getState(): FeatureState {
    return this._state;
  }

  async updateConfig(config: Partial<FeatureConfig>): Promise<void> {
    const newConfig = {
      ...this._config,
      ...config
    };

    if (config.settings) {
      newConfig.settings = config.settings;
    }

    if (config.metadata) {
      newConfig.metadata = config.metadata;
    }

    this._config = newConfig;

    if (this.onConfigChange) {
      await this.onConfigChange(this._config);
    }
  }

  // Lifecycle hooks (optional implementation by subclasses)
  onInit?(): Promise<void>;
  onStart?(): Promise<void>;
  onStop?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onError?(error: Error): Promise<void>;
  onConfigChange?(newConfig: FeatureConfig): Promise<void>;
}