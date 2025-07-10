import {
  IFeature,
  IFeatureLifecycle,
  IFeatureMetadata,
  FeatureCategory,
  FeatureState,
  FeaturePriority
} from './IFeature';
import {
  IFeatureOperation,
  IFeatureStateChange,
  IFeatureConfigChange,
  IFeatureError,
  IFeatureMetric,
  OperationType,
  ErrorType,
  ErrorSeverity,
  MetricType as TransparencyMetricType
} from './ITransparencyLayer';
import { IMetric, MetricType } from './IFeatureMetrics';

/**
 * Type guard to check if a value is a valid IFeature
 */
export function isFeature(value: any): value is IFeature {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.version === 'string' &&
    isFeatureCategory(value.category) &&
    typeof value.enabled === 'boolean' &&
    isFeatureLifecycle(value.lifecycle)
  );
}

/**
 * Type guard to check if a value is a valid IFeatureLifecycle
 */
export function isFeatureLifecycle(value: any): value is IFeatureLifecycle {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const validMethods = ['onInit', 'onEnable', 'onDisable', 'onDestroy', 'onConfigChange'];
  
  return Object.keys(value).every(key => 
    validMethods.includes(key) && 
    (value[key] === undefined || typeof value[key] === 'function')
  );
}

/**
 * Type guard to check if a value is a valid IFeatureMetadata
 */
export function isFeatureMetadata(value: any): value is IFeatureMetadata {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    (value.author === undefined || typeof value.author === 'string') &&
    (value.license === undefined || typeof value.license === 'string') &&
    (value.tags === undefined || (Array.isArray(value.tags) && value.tags.every((tag: any) => typeof tag === 'string'))) &&
    (value.createdAt === undefined || value.createdAt instanceof Date) &&
    (value.updatedAt === undefined || value.updatedAt instanceof Date) &&
    (value.experimental === undefined || typeof value.experimental === 'boolean') &&
    (value.minVersion === undefined || typeof value.minVersion === 'string') &&
    (value.maxVersion === undefined || typeof value.maxVersion === 'string')
  );
}

/**
 * Type guard to check if a value is a valid FeatureCategory
 */
export function isFeatureCategory(value: any): value is FeatureCategory {
  return Object.values(FeatureCategory).includes(value);
}

/**
 * Type guard to check if a value is a valid FeatureState
 */
export function isFeatureState(value: any): value is FeatureState {
  return Object.values(FeatureState).includes(value);
}

/**
 * Type guard to check if a value is a valid FeaturePriority
 */
export function isFeaturePriority(value: any): value is FeaturePriority {
  return Object.values(FeaturePriority).includes(value);
}

/**
 * Type guard to check if a value is a valid IFeatureOperation
 */
export function isFeatureOperation(value: any): value is IFeatureOperation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    value.timestamp instanceof Date &&
    typeof value.featureId === 'string' &&
    isOperationType(value.operation) &&
    typeof value.success === 'boolean'
  );
}

/**
 * Type guard to check if a value is a valid OperationType
 */
export function isOperationType(value: any): value is OperationType {
  return Object.values(OperationType).includes(value);
}

/**
 * Type guard to check if a value is a valid IFeatureStateChange
 */
export function isFeatureStateChange(value: any): value is IFeatureStateChange {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    value.timestamp instanceof Date &&
    typeof value.featureId === 'string' &&
    isFeatureState(value.previousState) &&
    isFeatureState(value.newState)
  );
}

/**
 * Type guard to check if a value is a valid IFeatureConfigChange
 */
export function isFeatureConfigChange(value: any): value is IFeatureConfigChange {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    value.timestamp instanceof Date &&
    typeof value.featureId === 'string' &&
    value.previousConfig !== undefined &&
    value.newConfig !== undefined &&
    Array.isArray(value.changedFields) &&
    value.changedFields.every((field: any) => typeof field === 'string') &&
    typeof value.validated === 'boolean'
  );
}

/**
 * Type guard to check if a value is a valid IFeatureError
 */
export function isFeatureError(value: any): value is IFeatureError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    value.timestamp instanceof Date &&
    typeof value.featureId === 'string' &&
    isErrorType(value.type) &&
    typeof value.message === 'string' &&
    isErrorSeverity(value.severity) &&
    typeof value.handled === 'boolean'
  );
}

/**
 * Type guard to check if a value is a valid ErrorType
 */
export function isErrorType(value: any): value is ErrorType {
  return Object.values(ErrorType).includes(value);
}

/**
 * Type guard to check if a value is a valid ErrorSeverity
 */
export function isErrorSeverity(value: any): value is ErrorSeverity {
  return Object.values(ErrorSeverity).includes(value);
}

/**
 * Type guard to check if a value is a valid IMetric
 */
export function isMetric(value: any): value is IMetric {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.name === 'string' &&
    typeof value.value === 'number' &&
    isMetricType(value.type) &&
    value.timestamp instanceof Date &&
    typeof value.featureId === 'string'
  );
}

/**
 * Type guard to check if a value is a valid MetricType
 */
export function isMetricType(value: any): value is MetricType {
  return Object.values(MetricType).includes(value);
}

/**
 * Type guard to check if an object has required feature properties
 */
export function hasFeatureProperties<T extends object>(
  obj: T,
  properties: (keyof IFeature)[]
): obj is T & Pick<IFeature, typeof properties[number]> {
  return properties.every(prop => prop in obj);
}

/**
 * Type guard to check if a feature has a specific lifecycle hook
 */
export function hasLifecycleHook<K extends keyof IFeatureLifecycle>(
  feature: IFeature,
  hook: K
): feature is IFeature & { lifecycle: Required<Pick<IFeatureLifecycle, K>> } {
  return (
    feature.lifecycle !== undefined &&
    hook in feature.lifecycle &&
    typeof feature.lifecycle[hook] === 'function'
  );
}

/**
 * Type guard to check if a feature has dependencies
 */
export function hasDependencies(feature: IFeature): feature is IFeature & { dependencies: string[] } {
  return (
    feature.dependencies !== undefined &&
    Array.isArray(feature.dependencies) &&
    feature.dependencies.length > 0
  );
}

/**
 * Type guard to check if a feature has metadata
 */
export function hasMetadata(feature: IFeature): feature is IFeature & { metadata: IFeatureMetadata } {
  return feature.metadata !== undefined && isFeatureMetadata(feature.metadata);
}

/**
 * Type guard to check if a feature has a config schema
 */
export function hasConfigSchema(feature: IFeature): feature is IFeature & { configSchema: Record<string, any> } {
  return (
    feature.configSchema !== undefined &&
    typeof feature.configSchema === 'object' &&
    feature.configSchema !== null
  );
}

/**
 * Type guard for array of features
 */
export function isFeatureArray(value: any): value is IFeature[] {
  return Array.isArray(value) && value.every(isFeature);
}

/**
 * Type guard for feature state transitions
 */
export function isValidStateTransition(from: FeatureState, to: FeatureState): boolean {
  const validTransitions: Record<FeatureState, FeatureState[]> = {
    [FeatureState.UNINITIALIZED]: [FeatureState.INITIALIZING, FeatureState.DESTROYING],
    [FeatureState.INITIALIZING]: [FeatureState.READY, FeatureState.ERROR, FeatureState.DESTROYING],
    [FeatureState.READY]: [FeatureState.ENABLING, FeatureState.DESTROYING],
    [FeatureState.ENABLING]: [FeatureState.ENABLED, FeatureState.ERROR, FeatureState.DESTROYING],
    [FeatureState.ENABLED]: [FeatureState.DISABLING, FeatureState.ERROR, FeatureState.DESTROYING],
    [FeatureState.DISABLING]: [FeatureState.DISABLED, FeatureState.ERROR, FeatureState.DESTROYING],
    [FeatureState.DISABLED]: [FeatureState.ENABLING, FeatureState.DESTROYING],
    [FeatureState.ERROR]: [FeatureState.INITIALIZING, FeatureState.DESTROYING],
    [FeatureState.DESTROYING]: [FeatureState.DESTROYED],
    [FeatureState.DESTROYED]: []
  };

  return validTransitions[from]?.includes(to) ?? false;
}