/**
 * A2A Capability Schema and Manifest Definitions
 *
 * Defines the comprehensive capability schema for agent-to-agent protocol integration,
 * supporting capability discovery, versioning, and semantic matching.
 */

export interface CapabilityVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
}

export interface CapabilityParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  description: string;
  required: boolean;
  default?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface CapabilityIO {
  input: CapabilityParameter[];
  output: {
    type: string;
    description: string;
    schema?: any;
  };
}

export interface PerformanceMetrics {
  averageLatency?: number; // ms
  throughput?: number; // operations/sec
  successRate?: number; // 0-1
  errorRate?: number; // 0-1
  resourceUsage?: {
    cpu?: number; // percentage
    memory?: number; // MB
    tokens?: number; // for LLM agents
  };
}

export interface CapabilityConstraints {
  maxConcurrency?: number;
  timeout?: number; // ms
  rateLimit?: {
    requests: number;
    window: number; // ms
  };
  dependencies?: string[]; // Required capabilities
  exclusions?: string[]; // Incompatible capabilities
}

export interface Capability {
  id: string; // Unique capability identifier
  name: string;
  description: string;
  category: CapabilityCategory;
  tags: string[];
  version: CapabilityVersion;

  // Semantic information
  semanticVector?: number[]; // Embedding for semantic matching
  aliases?: string[]; // Alternative names
  examples?: string[]; // Usage examples

  // Technical specifications
  io: CapabilityIO;
  constraints?: CapabilityConstraints;

  // Performance and reliability
  metrics?: PerformanceMetrics;
  reliability: number; // 0-1 reliability score

  // Provider information
  provider: {
    agentId: string;
    platform: AgentPlatform;
    endpoint?: string;
    authentication?: AuthenticationMethod;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deprecatedAt?: Date;
  supersededBy?: string; // Capability ID
}

export enum CapabilityCategory {
  COMPUTATION = 'computation',
  DATA_PROCESSING = 'data_processing',
  COMMUNICATION = 'communication',
  COORDINATION = 'coordination',
  LEARNING = 'learning',
  SEARCH = 'search',
  GENERATION = 'generation',
  ANALYSIS = 'analysis',
  TRANSFORMATION = 'transformation',
  VALIDATION = 'validation',
  MONITORING = 'monitoring',
  SECURITY = 'security',
  CUSTOM = 'custom'
}

/**
 * Agent Platform Types
 *
 * NOTE: Claude Flow is the COORDINATOR, not an agent platform.
 * These are the BACKEND agent platforms that Claude Flow coordinates.
 */
export enum AgentPlatform {
  // OpenAI platforms
  OPENAI_CODEX = 'openai-codex',
  OPENAI_GPT4 = 'openai-gpt4',
  OPENAI_SWARM = 'openai-swarm',

  // Google platforms
  GOOGLE_GEMINI = 'google-gemini',
  GOOGLE_GEMINI_CLI = 'google-gemini-cli',

  // IDE/Editor agents
  CURSOR = 'cursor',
  CURSOR_AGENT = 'cursor-agent',
  GITHUB_COPILOT = 'github-copilot',
  CONTINUE_DEV = 'continue-dev',
  CODY = 'cody',

  // CLI coding agents
  AIDER = 'aider',

  // Agent frameworks
  AUTOGEN = 'autogen',
  LANGCHAIN = 'langchain',
  LANGGRAPH = 'langgraph',
  CREWAI = 'crewai',
  SEMANTIC_KERNEL = 'semantic-kernel',
  HAYSTACK = 'haystack',

  // Other
  CUSTOM = 'custom'
}

export enum AuthenticationMethod {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  JWT = 'jwt',
  MUTUAL_TLS = 'mutual_tls',
  NONE = 'none'
}

export interface AgentManifest {
  agentId: string;
  name: string;
  description: string;
  platform: AgentPlatform;
  version: CapabilityVersion;

  // Capabilities
  capabilities: Capability[];

  // Platform-specific configuration
  platformConfig?: {
    endpoint?: string;
    apiVersion?: string;
    features?: string[];
    limitations?: string[];
  };

  // Discovery and health
  discoveryEndpoint?: string;
  healthEndpoint?: string;

  // Compatibility
  compatibilityMatrix?: {
    [platform: string]: {
      supported: boolean;
      version?: string;
      adapters?: string[];
    };
  };

  // Metadata
  maintainer?: string;
  documentation?: string;
  license?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapabilityQuery {
  // Semantic search
  description?: string;
  semanticVector?: number[];

  // Exact matching
  capabilityId?: string;
  name?: string;
  category?: CapabilityCategory;
  tags?: string[];

  // Constraints
  minReliability?: number;
  maxLatency?: number;
  requiredPlatforms?: AgentPlatform[];
  excludedPlatforms?: AgentPlatform[];

  // Performance requirements
  minThroughput?: number;
  maxResourceUsage?: {
    cpu?: number;
    memory?: number;
    tokens?: number;
  };

  // Compatibility
  compatibleWith?: string[]; // Other capability IDs
  version?: {
    exact?: CapabilityVersion;
    min?: CapabilityVersion;
    max?: CapabilityVersion;
  };
}

export interface CapabilityMatch {
  capability: Capability;
  score: number; // 0-1 match score
  matchReasons: MatchReason[];
  adaptationRequired: boolean;
  adaptations?: AdaptationStrategy[];
  estimatedPerformance?: PerformanceMetrics;
}

export interface MatchReason {
  type: 'semantic' | 'exact' | 'alias' | 'category' | 'performance';
  score: number;
  details: string;
}

export interface AdaptationStrategy {
  type: AdaptationType;
  description: string;
  impact: 'none' | 'minimal' | 'moderate' | 'significant';
  transformations?: Transformation[];
}

export enum AdaptationType {
  PROTOCOL_TRANSLATION = 'protocol_translation',
  PARAMETER_MAPPING = 'parameter_mapping',
  DATA_TRANSFORMATION = 'data_transformation',
  POLYFILL = 'polyfill',
  PROXY = 'proxy',
  FALLBACK = 'fallback',
  AGGREGATION = 'aggregation'
}

export interface Transformation {
  from: string;
  to: string;
  method: 'map' | 'transform' | 'proxy' | 'aggregate';
  implementation?: string; // Code or reference
}

export interface CapabilityRegistry {
  capabilities: Map<string, Capability>;
  manifests: Map<string, AgentManifest>;
  semanticIndex: SemanticIndex;
  performanceHistory: Map<string, PerformanceMetrics[]>;
}

export interface SemanticIndex {
  vectors: Map<string, number[]>; // Capability ID -> embedding
  dimension: number;
  indexType: 'flat' | 'ivf' | 'hnsw';
}

export interface CapabilityDiscoveryConfig {
  enableAutoDiscovery: boolean;
  discoveryInterval: number; // ms
  healthCheckInterval: number; // ms
  discoveryEndpoints: string[];

  // Probing configuration
  enableRuntimeProbing: boolean;
  probingStrategy: 'passive' | 'active' | 'adaptive';

  // Caching
  cacheTTL: number; // ms
  enableSemanticCaching: boolean;
}
