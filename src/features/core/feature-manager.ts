import {
  IFeatureManager,
  IFeature,
  FeatureState,
  ITransparencyLayer,
  TransparencyEventType
} from '../types/feature-types';
import { TransparencyLayer } from './transparency-layer';

/**
 * Feature Manager implementation
 * Manages the lifecycle and coordination of features
 */
export class FeatureManager implements IFeatureManager {
  private features: Map<string, IFeature> = new Map();
  private transparencyLayer: ITransparencyLayer;

  constructor(transparencyLayer?: ITransparencyLayer) {
    this.transparencyLayer = transparencyLayer || new TransparencyLayer();
  }

  async register(feature: IFeature): Promise<void> {
    const featureId = feature.metadata.id;

    if (this.features.has(featureId)) {
      throw new Error(`Feature ${featureId} is already registered`);
    }

    // Initialize the feature
    await feature.initialize(feature.config);

    // Store the feature
    this.features.set(featureId, feature);

    // Log registration event
    this.transparencyLayer.log({
      type: TransparencyEventType.FEATURE_REGISTERED,
      featureId,
      timestamp: new Date(),
      data: { metadata: feature.metadata }
    });
  }

  async unregister(featureId: string): Promise<void> {
    const feature = this.features.get(featureId);

    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    // Stop the feature if it's running
    if (feature.state === FeatureState.ACTIVE) {
      await feature.stop();
    }

    // Destroy the feature
    await feature.destroy();

    // Remove from registry
    this.features.delete(featureId);

    // Log unregistration event
    this.transparencyLayer.log({
      type: TransparencyEventType.FEATURE_UNREGISTERED,
      featureId,
      timestamp: new Date()
    });
  }

  get(featureId: string): IFeature | undefined {
    return this.features.get(featureId);
  }

  getAll(): Map<string, IFeature> {
    return new Map(this.features);
  }

  async enable(featureId: string): Promise<void> {
    const feature = this.features.get(featureId);

    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    // Update config to enable
    await feature.updateConfig({ enabled: true });

    // Start the feature
    await this.start(featureId);
  }

  async disable(featureId: string): Promise<void> {
    const feature = this.features.get(featureId);

    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    // Stop the feature
    await this.stop(featureId);

    // Update config to disable
    await feature.updateConfig({ enabled: false });
  }

  async start(featureId?: string): Promise<void> {
    if (featureId) {
      // Start specific feature
      const feature = this.features.get(featureId);
      if (!feature) {
        throw new Error(`Feature ${featureId} not found`);
      }

      await this.startFeature(feature);
    } else {
      // Start all enabled features
      for (const feature of this.features.values()) {
        if (feature.config.enabled) {
          await this.startFeature(feature);
        }
      }
    }
  }

  async stop(featureId?: string): Promise<void> {
    if (featureId) {
      // Stop specific feature
      const feature = this.features.get(featureId);
      if (!feature) {
        throw new Error(`Feature ${featureId} not found`);
      }

      await this.stopFeature(feature);
    } else {
      // Stop all active features
      for (const feature of this.features.values()) {
        if (feature.state === FeatureState.ACTIVE) {
          await this.stopFeature(feature);
        }
      }
    }
  }

  isEnabled(featureId: string): boolean {
    const feature = this.features.get(featureId);
    return feature?.config.enabled ?? false;
  }

  getState(featureId: string): FeatureState | undefined {
    const feature = this.features.get(featureId);
    return feature?.getState();
  }

  private async startFeature(feature: IFeature): Promise<void> {
    const previousState = feature.state;

    try {
      await feature.start();

      this.transparencyLayer.log({
        type: TransparencyEventType.FEATURE_STATE_CHANGE,
        featureId: feature.metadata.id,
        timestamp: new Date(),
        data: { previousState, newState: feature.state }
      });
    } catch (error) {
      this.transparencyLayer.log({
        type: TransparencyEventType.FEATURE_ERROR,
        featureId: feature.metadata.id,
        timestamp: new Date(),
        error: error as Error
      });
      throw error;
    }
  }

  private async stopFeature(feature: IFeature): Promise<void> {
    const previousState = feature.state;

    try {
      await feature.stop();

      this.transparencyLayer.log({
        type: TransparencyEventType.FEATURE_STATE_CHANGE,
        featureId: feature.metadata.id,
        timestamp: new Date(),
        data: { previousState, newState: feature.state }
      });
    } catch (error) {
      this.transparencyLayer.log({
        type: TransparencyEventType.FEATURE_ERROR,
        featureId: feature.metadata.id,
        timestamp: new Date(),
        error: error as Error
      });
      throw error;
    }
  }
}