/**
 * Integration interfaces for connecting with external systems
 */

import { IResourceMetrics, IResourceAlert } from './metrics';
import { IAgentResourceMetrics } from './agent';

/**
 * MCP integration interface
 */
export interface IMcpIntegration {
  /** Integration name */
  name: string;

  /** Connect to MCP server */
  connect(config: IMcpConnectionConfig): Promise<void>;

  /** Disconnect from MCP server */
  disconnect(): Promise<void>;

  /** Check connection status */
  isConnected(): boolean;

  /** Send resource metrics to MCP */
  sendMetrics(metrics: IResourceMetrics): Promise<void>;

  /** Send agent metrics to MCP */
  sendAgentMetrics(metrics: IAgentResourceMetrics): Promise<void>;

  /** Send alert to MCP */
  sendAlert(alert: IResourceAlert): Promise<void>;

  /** Register MCP command handler */
  registerCommandHandler(command: string, handler: McpCommandHandler): void;

  /** Handle incoming MCP request */
  handleRequest(request: IMcpRequest): Promise<IMcpResponse>;
}

/**
 * MCP connection configuration
 */
export interface IMcpConnectionConfig {
  /** MCP server URL */
  url: string;

  /** Authentication token */
  token?: string;

  /** Connection timeout in ms */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff: number;
  };

  /** TLS configuration */
  tls?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
}

/**
 * MCP request
 */
export interface IMcpRequest {
  /** Request ID */
  id: string;

  /** Request method */
  method: string;

  /** Request parameters */
  params?: any;

  /** Request metadata */
  metadata?: Record<string, any>;
}

/**
 * MCP response
 */
export interface IMcpResponse {
  /** Request ID this responds to */
  id: string;

  /** Response result */
  result?: any;

  /** Response error */
  error?: {
    code: number;
    message: string;
    data?: any;
  };

  /** Response metadata */
  metadata?: Record<string, any>;
}

/**
 * MCP command handler
 */
export type McpCommandHandler = (params: any, metadata?: Record<string, any>) => Promise<any>;

/**
 * Swarm integration interface
 */
export interface ISwarmIntegration {
  /** Integration name */
  name: string;

  /** Initialize swarm integration */
  initialize(config: ISwarmConfig): Promise<void>;

  /** Register with swarm coordinator */
  register(agentId: string): Promise<void>;

  /** Unregister from swarm */
  unregister(agentId: string): Promise<void>;

  /** Report agent resources to swarm */
  reportResources(agentId: string, metrics: IAgentResourceMetrics): Promise<void>;

  /** Request resources from swarm */
  requestResources(
    agentId: string,
    request: ISwarmResourceRequest
  ): Promise<ISwarmResourceResponse>;

  /** Get swarm topology */
  getTopology(): Promise<ISwarmTopology>;

  /** Subscribe to swarm events */
  subscribe(event: SwarmEvent, callback: SwarmEventCallback): () => void;
}

/**
 * Swarm configuration
 */
export interface ISwarmConfig {
  /** Coordinator endpoint */
  coordinatorUrl: string;

  /** Swarm ID */
  swarmId: string;

  /** Node ID */
  nodeId: string;

  /** Communication protocol */
  protocol: SwarmProtocol;

  /** Heartbeat interval in ms */
  heartbeatInterval: number;

  /** Discovery settings */
  discovery?: {
    enabled: boolean;
    multicastGroup?: string;
    port?: number;
  };
}

/**
 * Swarm protocols
 */
export enum SwarmProtocol {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  GRPC = 'grpc',
  MQTT = 'mqtt'
}

/**
 * Swarm resource request
 */
export interface ISwarmResourceRequest {
  /** Request ID */
  requestId: string;

  /** Resource requirements */
  requirements: {
    cpu?: number;
    memory?: number;
    disk?: number;
    network?: number;
  };

  /** Constraints */
  constraints?: ISwarmConstraints;

  /** Priority */
  priority: number;

  /** Duration in ms */
  duration?: number;
}

/**
 * Swarm constraints
 */
export interface ISwarmConstraints {
  /** Required node labels */
  nodeLabels?: Record<string, string>;

  /** Anti-affinity rules */
  antiAffinity?: string[];

  /** Preferred zones */
  zones?: string[];

  /** Network requirements */
  network?: {
    bandwidth?: number;
    latency?: number;
  };
}

/**
 * Swarm resource response
 */
export interface ISwarmResourceResponse {
  /** Request ID */
  requestId: string;

  /** Whether request was granted */
  granted: boolean;

  /** Assigned node */
  nodeId?: string;

  /** Allocated resources */
  allocated?: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };

  /** Reason if not granted */
  reason?: string;
}

/**
 * Swarm topology
 */
export interface ISwarmTopology {
  /** Topology type */
  type: SwarmTopologyType;

  /** Nodes in the swarm */
  nodes: ISwarmNode[];

  /** Connections between nodes */
  connections: ISwarmConnection[];

  /** Coordinator node ID */
  coordinatorId: string;

  /** Last update timestamp */
  lastUpdate: Date;
}

/**
 * Swarm topology types
 */
export enum SwarmTopologyType {
  MESH = 'mesh',
  STAR = 'star',
  RING = 'ring',
  TREE = 'tree',
  HYBRID = 'hybrid'
}

/**
 * Swarm node
 */
export interface ISwarmNode {
  /** Node ID */
  id: string;

  /** Node type */
  type: string;

  /** Node status */
  status: SwarmNodeStatus;

  /** Node resources */
  resources: {
    total: INodeResources;
    available: INodeResources;
    allocated: INodeResources;
  };

  /** Node labels */
  labels: Record<string, string>;

  /** Last heartbeat */
  lastHeartbeat: Date;
}

/**
 * Node resources
 */
export interface INodeResources {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

/**
 * Swarm node status
 */
export enum SwarmNodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAINING = 'draining',
  MAINTENANCE = 'maintenance'
}

/**
 * Swarm connection
 */
export interface ISwarmConnection {
  /** Source node ID */
  from: string;

  /** Target node ID */
  to: string;

  /** Connection type */
  type: SwarmConnectionType;

  /** Connection metrics */
  metrics: {
    latency: number;
    bandwidth: number;
    packetLoss: number;
  };
}

/**
 * Swarm connection types
 */
export enum SwarmConnectionType {
  DIRECT = 'direct',
  RELAY = 'relay',
  TUNNEL = 'tunnel'
}

/**
 * Swarm events
 */
export enum SwarmEvent {
  NODE_JOINED = 'node-joined',
  NODE_LEFT = 'node-left',
  TOPOLOGY_CHANGED = 'topology-changed',
  RESOURCE_GRANTED = 'resource-granted',
  RESOURCE_REVOKED = 'resource-revoked',
  COORDINATOR_CHANGED = 'coordinator-changed'
}

/**
 * Swarm event callback
 */
export type SwarmEventCallback = (event: ISwarmEvent) => void;

/**
 * Swarm event data
 */
export interface ISwarmEvent {
  /** Event type */
  type: SwarmEvent;

  /** Event timestamp */
  timestamp: Date;

  /** Event data */
  data: any;
}

/**
 * Claude Flow integration interface
 */
export interface IClaudeFlowIntegration {
  /** Integration name */
  name: string;

  /** Initialize integration */
  initialize(config: IClaudeFlowConfig): Promise<void>;

  /** Create resource-aware flow */
  createFlow(
    definition: IFlowDefinition,
    resourceRequirements: IFlowResourceRequirements
  ): Promise<IResourceAwareFlow>;

  /** Monitor flow resources */
  monitorFlow(flowId: string): Promise<IFlowResourceMetrics>;

  /** Scale flow resources */
  scaleFlow(flowId: string, scale: number): Promise<void>;

  /** Get flow resource usage */
  getFlowUsage(flowId: string): Promise<IFlowResourceUsage>;
}

/**
 * Claude Flow configuration
 */
export interface IClaudeFlowConfig {
  /** Flow engine endpoint */
  endpoint: string;

  /** API key */
  apiKey?: string;

  /** Resource management mode */
  resourceMode: ResourceManagementMode;

  /** Default resource limits */
  defaultLimits?: IFlowResourceRequirements;
}

/**
 * Resource management modes
 */
export enum ResourceManagementMode {
  /** Strict resource enforcement */
  STRICT = 'strict',

  /** Flexible resource allocation */
  FLEXIBLE = 'flexible',

  /** Best effort allocation */
  BEST_EFFORT = 'best-effort'
}

/**
 * Flow definition
 */
export interface IFlowDefinition {
  /** Flow ID */
  id: string;

  /** Flow name */
  name: string;

  /** Flow steps */
  steps: any[];

  /** Flow configuration */
  config: Record<string, any>;
}

/**
 * Flow resource requirements
 */
export interface IFlowResourceRequirements {
  /** CPU requirements per instance */
  cpu: number;

  /** Memory requirements per instance */
  memory: number;

  /** Disk requirements per instance */
  disk: number;

  /** Network requirements per instance */
  network: number;

  /** Minimum instances */
  minInstances: number;

  /** Maximum instances */
  maxInstances: number;
}

/**
 * Resource-aware flow
 */
export interface IResourceAwareFlow {
  /** Flow ID */
  id: string;

  /** Flow status */
  status: FlowStatus;

  /** Allocated resources */
  allocatedResources: IFlowResourceRequirements;

  /** Current instances */
  instances: number;

  /** Start flow */
  start(): Promise<void>;

  /** Stop flow */
  stop(): Promise<void>;

  /** Update resources */
  updateResources(requirements: Partial<IFlowResourceRequirements>): Promise<void>;
}

/**
 * Flow status
 */
export enum FlowStatus {
  CREATED = 'created',
  STARTING = 'starting',
  RUNNING = 'running',
  SCALING = 'scaling',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * Flow resource metrics
 */
export interface IFlowResourceMetrics {
  /** Flow ID */
  flowId: string;

  /** Timestamp */
  timestamp: Date;

  /** Resource usage per instance */
  perInstance: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };

  /** Total resource usage */
  total: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };

  /** Number of instances */
  instances: number;

  /** Performance metrics */
  performance: {
    throughput: number;
    latency: number;
    errorRate: number;
  };
}

/**
 * Flow resource usage
 */
export interface IFlowResourceUsage {
  /** Flow ID */
  flowId: string;

  /** Time period */
  period: {
    start: Date;
    end: Date;
  };

  /** Average usage */
  average: IFlowResourceMetrics;

  /** Peak usage */
  peak: IFlowResourceMetrics;

  /** Usage cost */
  cost?: {
    amount: number;
    currency: string;
    breakdown: Record<string, number>;
  };
}
