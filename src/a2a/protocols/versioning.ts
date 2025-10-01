/**
 * A2A Protocol Versioning and Compatibility
 * Version: 1.0.0
 *
 * Protocol version negotiation and backward compatibility
 */

// ============================================================================
// Version Definitions
// ============================================================================

/**
 * Protocol version information
 */
export interface ProtocolVersionInfo {
  version: string;               // Semantic version (e.g., "1.2.3")
  releaseDate: string;           // ISO 8601 date
  status: VersionStatus;

  // Compatibility
  compatibleWith?: string[];     // Compatible versions
  deprecates?: string[];         // Deprecated versions

  // Changes
  changes: VersionChange[];

  // Features
  features: string[];

  metadata?: Record<string, unknown>;
}

/**
 * Version status
 */
export enum VersionStatus {
  DRAFT = 'draft',               // Under development
  BETA = 'beta',                 // Beta testing
  STABLE = 'stable',             // Production ready
  DEPRECATED = 'deprecated',     // Scheduled for removal
  OBSOLETE = 'obsolete'          // No longer supported
}

/**
 * Version change
 */
export interface VersionChange {
  type: 'feature' | 'enhancement' | 'bugfix' | 'breaking' | 'security';
  description: string;

  // For breaking changes
  migration?: string;            // Migration guide
  affectedAPIs?: string[];

  metadata?: Record<string, unknown>;
}

// ============================================================================
// Supported Versions
// ============================================================================

/**
 * Current supported protocol versions
 */
export const SUPPORTED_VERSIONS: ProtocolVersionInfo[] = [
  {
    version: '1.0.0',
    releaseDate: '2025-01-15',
    status: VersionStatus.STABLE,
    compatibleWith: ['1.0.0'],
    changes: [
      {
        type: 'feature',
        description: 'Initial A2A protocol release'
      }
    ],
    features: [
      'Core message envelope',
      'Agent registration and discovery',
      'Task orchestration',
      'Shared memory protocol',
      'Service discovery',
      'Event notification',
      'Health monitoring'
    ]
  }
];

/**
 * Minimum supported version
 */
export const MIN_SUPPORTED_VERSION = '1.0.0';

/**
 * Maximum supported version
 */
export const MAX_SUPPORTED_VERSION = '1.0.0';

/**
 * Current protocol version
 */
export const CURRENT_VERSION = '1.0.0';

// ============================================================================
// Version Negotiation
// ============================================================================

/**
 * Version negotiation request
 */
export interface VersionNegotiationRequest {
  supportedVersions: string[];   // Versions client supports
  preferredVersion?: string;     // Client's preferred version

  // Client capabilities
  features?: string[];           // Features client supports
  extensions?: string[];         // Custom extensions

  metadata?: Record<string, unknown>;
}

/**
 * Version negotiation response
 */
export interface VersionNegotiationResponse {
  selectedVersion: string;       // Agreed version

  // Server capabilities
  serverFeatures: string[];
  serverExtensions?: string[];

  // Negotiation metadata
  fallbackVersion?: string;      // Fallback if issues arise
  upgradeAvailable?: string;     // Newer version available

  metadata?: Record<string, unknown>;
}

/**
 * Negotiate protocol version
 */
export function negotiateVersion(
  clientVersions: string[],
  serverVersions: string[] = SUPPORTED_VERSIONS.map(v => v.version)
): string | null {
  // Find highest common version
  const commonVersions = clientVersions.filter(cv => serverVersions.includes(cv));

  if (commonVersions.length === 0) {
    return null;
  }

  // Sort by semantic version and return highest
  return commonVersions.sort(compareVersions).reverse()[0];
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart < bPart) return -1;
    if (aPart > bPart) return 1;
  }

  return 0;
}

/**
 * Check if version is supported
 */
export function isVersionSupported(version: string): boolean {
  return SUPPORTED_VERSIONS.some(v => v.version === version);
}

/**
 * Check if version is compatible
 */
export function isVersionCompatible(
  version: string,
  targetVersion: string = CURRENT_VERSION
): boolean {
  const versionInfo = SUPPORTED_VERSIONS.find(v => v.version === targetVersion);

  if (!versionInfo) {
    return false;
  }

  return versionInfo.compatibleWith?.includes(version) ?? false;
}

/**
 * Get version info
 */
export function getVersionInfo(version: string): ProtocolVersionInfo | null {
  return SUPPORTED_VERSIONS.find(v => v.version === version) || null;
}

// ============================================================================
// Backward Compatibility
// ============================================================================

/**
 * Message adapter for version compatibility
 */
export interface MessageAdapter {
  fromVersion: string;
  toVersion: string;

  // Transformation function
  transform: (message: any) => any;

  // Reverse transformation
  reverseTransform?: (message: any) => any;

  metadata?: Record<string, unknown>;
}

/**
 * Registry of message adapters
 */
const MESSAGE_ADAPTERS: MessageAdapter[] = [];

/**
 * Register message adapter
 */
export function registerAdapter(adapter: MessageAdapter): void {
  MESSAGE_ADAPTERS.push(adapter);
}

/**
 * Transform message between versions
 */
export function transformMessage(
  message: any,
  fromVersion: string,
  toVersion: string
): any {
  if (fromVersion === toVersion) {
    return message;
  }

  // Find adapter chain
  const adapter = MESSAGE_ADAPTERS.find(
    a => a.fromVersion === fromVersion && a.toVersion === toVersion
  );

  if (!adapter) {
    throw new Error(
      `No adapter found for transformation from ${fromVersion} to ${toVersion}`
    );
  }

  return adapter.transform(message);
}

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Feature capability
 */
export interface FeatureCapability {
  name: string;
  version: string;
  description?: string;

  // Requirements
  requiredProtocolVersion?: string;
  dependencies?: string[];       // Other features required

  // Support
  experimental?: boolean;
  deprecated?: boolean;

  metadata?: Record<string, unknown>;
}

/**
 * Available features
 */
export const AVAILABLE_FEATURES: FeatureCapability[] = [
  {
    name: 'core-messaging',
    version: '1.0.0',
    description: 'Core message envelope and routing',
    requiredProtocolVersion: '1.0.0'
  },
  {
    name: 'task-orchestration',
    version: '1.0.0',
    description: 'Task request/response protocol',
    requiredProtocolVersion: '1.0.0'
  },
  {
    name: 'shared-memory',
    version: '1.0.0',
    description: 'Shared memory operations',
    requiredProtocolVersion: '1.0.0'
  },
  {
    name: 'service-discovery',
    version: '1.0.0',
    description: 'Agent registry and discovery',
    requiredProtocolVersion: '1.0.0'
  },
  {
    name: 'event-notification',
    version: '1.0.0',
    description: 'Event publish/subscribe',
    requiredProtocolVersion: '1.0.0'
  },
  {
    name: 'distributed-tracing',
    version: '1.0.0',
    description: 'OpenTelemetry-compatible tracing',
    requiredProtocolVersion: '1.0.0'
  },
  {
    name: 'transactions',
    version: '1.0.0',
    description: 'ACID transactions for memory operations',
    requiredProtocolVersion: '1.0.0'
  },
  {
    name: 'circuit-breaker',
    version: '1.0.0',
    description: 'Circuit breaker pattern for resilience',
    requiredProtocolVersion: '1.0.0'
  }
];

/**
 * Check if feature is available
 */
export function isFeatureAvailable(
  featureName: string,
  protocolVersion: string = CURRENT_VERSION
): boolean {
  const feature = AVAILABLE_FEATURES.find(f => f.name === featureName);

  if (!feature) {
    return false;
  }

  if (feature.requiredProtocolVersion) {
    return compareVersions(protocolVersion, feature.requiredProtocolVersion) >= 0;
  }

  return true;
}

/**
 * Get supported features for version
 */
export function getSupportedFeatures(version: string): FeatureCapability[] {
  return AVAILABLE_FEATURES.filter(f =>
    !f.requiredProtocolVersion || compareVersions(version, f.requiredProtocolVersion) >= 0
  );
}

// ============================================================================
// Extension Points
// ============================================================================

/**
 * Protocol extension
 */
export interface ProtocolExtension {
  name: string;
  version: string;
  namespace: string;             // Namespaced extension identifier

  description?: string;

  // Message types added
  messageTypes?: string[];

  // Schema location
  schemaUrl?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Registered extensions
 */
const REGISTERED_EXTENSIONS: ProtocolExtension[] = [];

/**
 * Register protocol extension
 */
export function registerExtension(extension: ProtocolExtension): void {
  // Check for namespace collision
  const existing = REGISTERED_EXTENSIONS.find(e => e.namespace === extension.namespace);

  if (existing) {
    throw new Error(`Extension with namespace ${extension.namespace} already registered`);
  }

  REGISTERED_EXTENSIONS.push(extension);
}

/**
 * Get registered extension
 */
export function getExtension(namespace: string): ProtocolExtension | null {
  return REGISTERED_EXTENSIONS.find(e => e.namespace === namespace) || null;
}

/**
 * List all extensions
 */
export function listExtensions(): ProtocolExtension[] {
  return [...REGISTERED_EXTENSIONS];
}

// ============================================================================
// Migration Support
// ============================================================================

/**
 * Migration guide
 */
export interface MigrationGuide {
  fromVersion: string;
  toVersion: string;

  // Changes
  breakingChanges: BreakingChange[];
  deprecations: Deprecation[];

  // Steps
  migrationSteps: MigrationStep[];

  // Resources
  documentationUrl?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Breaking change
 */
export interface BreakingChange {
  description: string;
  affectedAPIs: string[];

  // Migration
  before: string;                // Code before
  after: string;                 // Code after

  rationale?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Deprecation notice
 */
export interface Deprecation {
  feature: string;
  deprecatedIn: string;          // Version
  removedIn?: string;            // Version when removed

  replacement?: string;
  migrationGuide?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Migration step
 */
export interface MigrationStep {
  order: number;
  title: string;
  description: string;

  // Automation
  automated?: boolean;
  script?: string;               // Migration script

  metadata?: Record<string, unknown>;
}

/**
 * Get migration guide
 */
export function getMigrationGuide(
  fromVersion: string,
  toVersion: string
): MigrationGuide | null {
  // This would be populated with actual migration guides
  // For now, return null as we only have v1.0.0
  return null;
}
