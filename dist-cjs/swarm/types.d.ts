/**
 * Comprehensive types and interfaces for the swarm system
 */
import { EventEmitter } from 'node:events';
export interface SwarmId {
    id: string;
    timestamp: number;
    namespace: string;
}
export interface AgentId {
    id: string;
    swarmId: string;
    type: AgentType;
    instance: number;
}
export interface TaskId {
    id: string;
    swarmId: string;
    sequence: number;
    priority: number;
}
export type AgentType = 'coordinator' | 'researcher' | 'coder' | 'analyst' | 'architect' | 'tester' | 'reviewer' | 'optimizer' | 'documenter' | 'monitor' | 'specialist';
export type AgentStatus = 'initializing' | 'idle' | 'busy' | 'paused' | 'error' | 'offline' | 'terminating' | 'terminated';
export interface AgentCapabilities {
    codeGeneration: boolean;
    codeReview: boolean;
    testing: boolean;
    documentation: boolean;
    research: boolean;
    analysis: boolean;
    webSearch: boolean;
    apiIntegration: boolean;
    fileSystem: boolean;
    terminalAccess: boolean;
    languages: string[];
    frameworks: string[];
    domains: string[];
    tools: string[];
    maxConcurrentTasks: number;
    maxMemoryUsage: number;
    maxExecutionTime: number;
    reliability: number;
    speed: number;
    quality: number;
}
export interface AgentMetrics {
    tasksCompleted: number;
    tasksFailed: number;
    averageExecutionTime: number;
    successRate: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
    codeQuality: number;
    testCoverage: number;
    bugRate: number;
    userSatisfaction: number;
    totalUptime: number;
    lastActivity: Date;
    responseTime: number;
}
export interface AgentState {
    id: AgentId;
    name: string;
    type: AgentType;
    status: AgentStatus;
    capabilities: AgentCapabilities;
    metrics: AgentMetrics;
    currentTask?: TaskId;
    workload: number;
    health: number;
    config: AgentConfig;
    environment: AgentEnvironment;
    endpoints: string[];
    lastHeartbeat: Date;
    taskHistory: TaskId[];
    errorHistory: AgentError[];
    parentAgent?: AgentId;
    childAgents: AgentId[];
    collaborators: AgentId[];
}
export interface AgentConfig {
    autonomyLevel: number;
    learningEnabled: boolean;
    adaptationEnabled: boolean;
    maxTasksPerHour: number;
    maxConcurrentTasks: number;
    timeoutThreshold: number;
    reportingInterval: number;
    heartbeatInterval: number;
    permissions: string[];
    trustedAgents: AgentId[];
    expertise: Record<string, number>;
    preferences: Record<string, any>;
}
export interface AgentEnvironment {
    runtime: 'deno' | 'node' | 'claude' | 'browser';
    version: string;
    workingDirectory: string;
    tempDirectory: string;
    logDirectory: string;
    apiEndpoints: Record<string, string>;
    credentials: Record<string, string>;
    availableTools: string[];
    toolConfigs: Record<string, any>;
}
export interface AgentError {
    timestamp: Date;
    type: string;
    message: string;
    stack?: string;
    context: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
}
export type TaskType = 'research' | 'analysis' | 'coding' | 'testing' | 'review' | 'documentation' | 'deployment' | 'monitoring' | 'coordination' | 'communication' | 'maintenance' | 'optimization' | 'validation' | 'integration' | 'custom' | 'data-analysis' | 'performance-analysis' | 'statistical-analysis' | 'visualization' | 'predictive-modeling' | 'anomaly-detection' | 'trend-analysis' | 'business-intelligence' | 'quality-analysis' | 'system-design' | 'architecture-review' | 'api-design' | 'cloud-architecture' | 'microservices-design' | 'security-architecture' | 'scalability-design' | 'database-architecture' | 'code-generation' | 'code-review' | 'refactoring' | 'debugging' | 'api-development' | 'database-design' | 'performance-optimization' | 'task-orchestration' | 'progress-tracking' | 'resource-allocation' | 'workflow-management' | 'team-coordination' | 'status-reporting' | 'fact-check' | 'literature-review' | 'market-analysis' | 'unit-testing' | 'integration-testing' | 'e2e-testing' | 'performance-testing' | 'security-testing' | 'api-testing' | 'test-automation' | 'test-analysis';
export type TaskStatus = 'created' | 'queued' | 'assigned' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'retrying' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';
export interface TaskRequirements {
    agentType?: AgentType;
    capabilities: string[];
    minReliability?: number;
    estimatedDuration?: number;
    maxDuration?: number;
    memoryRequired?: number;
    cpuRequired?: number;
    tools: string[];
    permissions: string[];
    environment?: Record<string, any>;
    reviewRequired?: boolean;
    testingRequired?: boolean;
    documentationRequired?: boolean;
}
export interface TaskConstraints {
    deadline?: Date;
    startAfter?: Date;
    maxRetries?: number;
    maxTokens?: number;
    timeoutAfter?: number;
    maxCost?: number;
    exclusiveAccess?: string[];
    dependencies: TaskId[];
    dependents: TaskId[];
    conflicts: TaskId[];
    preferredAgents?: AgentId[];
    excludedAgents?: AgentId[];
    requiresHuman?: boolean;
}
export interface TaskResult {
    output: any;
    artifacts: Record<string, any>;
    metadata: Record<string, any>;
    quality: number;
    completeness: number;
    accuracy: number;
    executionTime: number;
    resourcesUsed: Record<string, number>;
    validated: boolean;
    validationResults?: any;
    recommendations?: string[];
    nextSteps?: string[];
}
export interface TaskDefinition {
    id: TaskId;
    type: TaskType;
    name: string;
    description: string;
    requirements: TaskRequirements;
    constraints: TaskConstraints;
    priority: TaskPriority;
    input: any;
    expectedOutput?: any;
    instructions: string;
    context: Record<string, any>;
    parameters?: Record<string, any>;
    examples?: any[];
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    assignedTo?: AgentId;
    assignedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    result?: TaskResult;
    error?: TaskError;
    attempts: TaskAttempt[];
    statusHistory: TaskStatusChange[];
}
export interface TaskAttempt {
    attemptNumber: number;
    agent: AgentId;
    startedAt: Date;
    completedAt?: Date;
    status: TaskStatus;
    result?: TaskResult;
    error?: TaskError;
    resourcesUsed: Record<string, number>;
}
export interface TaskStatusChange {
    timestamp: Date;
    from: TaskStatus;
    to: TaskStatus;
    reason: string;
    triggeredBy: AgentId | 'system' | 'user';
}
export interface TaskError {
    type: string;
    message: string;
    code?: string;
    stack?: string;
    context: Record<string, any>;
    recoverable: boolean;
    retryable: boolean;
}
export type SwarmMode = 'centralized' | 'distributed' | 'hierarchical' | 'mesh' | 'hybrid';
export type SwarmStrategy = 'auto' | 'research' | 'development' | 'analysis' | 'testing' | 'optimization' | 'maintenance' | 'custom';
export interface SwarmObjective {
    id: string;
    name: string;
    description: string;
    strategy: SwarmStrategy;
    mode: SwarmMode;
    requirements: SwarmRequirements;
    constraints: SwarmConstraints;
    tasks: TaskDefinition[];
    dependencies: TaskDependency[];
    status: SwarmStatus;
    progress: SwarmProgress;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    deadline?: Date;
    results?: SwarmResults;
    metrics: SwarmMetrics;
}
export interface SwarmRequirements {
    minAgents: number;
    maxAgents: number;
    agentTypes: AgentType[];
    estimatedDuration: number;
    maxDuration: number;
    resourceBudget?: Record<string, number>;
    qualityThreshold: number;
    reviewCoverage: number;
    testCoverage: number;
    throughputTarget?: number;
    latencyTarget?: number;
    reliabilityTarget: number;
}
export interface SwarmConstraints {
    deadline?: Date;
    milestones: SwarmMilestone[];
    maxCost?: number;
    resourceLimits: Record<string, number>;
    minQuality: number;
    requiredApprovals: string[];
    allowedFailures: number;
    recoveryTime: number;
    maintenanceWindows?: TimeWindow[];
}
export interface SwarmMilestone {
    id: string;
    name: string;
    description: string;
    deadline: Date;
    requirements: string[];
    dependencies: string[];
    completed: boolean;
    completedAt?: Date;
}
export interface TimeWindow {
    start: Date;
    end: Date;
    type: 'maintenance' | 'blackout' | 'preferred';
    description: string;
}
export type SwarmStatus = 'planning' | 'initializing' | 'executing' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'recovering' | 'optimizing';
export interface SwarmProgress {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    estimatedCompletion: Date;
    timeRemaining: number;
    percentComplete: number;
    averageQuality: number;
    passedReviews: number;
    passedTests: number;
    resourceUtilization: Record<string, number>;
    costSpent: number;
    activeAgents: number;
    idleAgents: number;
    busyAgents: number;
}
export interface SwarmResults {
    outputs: Record<string, any>;
    artifacts: Record<string, any>;
    reports: Record<string, any>;
    overallQuality: number;
    qualityByTask: Record<string, number>;
    totalExecutionTime: number;
    resourcesUsed: Record<string, number>;
    efficiency: number;
    objectivesMet: string[];
    objectivesFailed: string[];
    improvements: string[];
    nextActions: string[];
}
export interface SwarmMetrics {
    throughput: number;
    latency: number;
    efficiency: number;
    reliability: number;
    averageQuality: number;
    defectRate: number;
    reworkRate: number;
    resourceUtilization: Record<string, number>;
    costEfficiency: number;
    agentUtilization: number;
    agentSatisfaction: number;
    collaborationEffectiveness: number;
    scheduleVariance: number;
    deadlineAdherence: number;
}
export interface TaskDependency {
    task: TaskId;
    dependsOn: TaskId;
    type: DependencyType;
    constraint?: string;
}
export type DependencyType = 'finish-start' | 'start-start' | 'finish-finish' | 'start-finish' | 'resource' | 'data' | 'approval';
export interface CoordinationStrategy {
    name: string;
    description: string;
    agentSelection: AgentSelectionStrategy;
    taskScheduling: TaskSchedulingStrategy;
    loadBalancing: LoadBalancingStrategy;
    faultTolerance: FaultToleranceStrategy;
    communication: CommunicationStrategy;
}
export type AgentSelectionStrategy = 'capability-based' | 'load-based' | 'performance-based' | 'random' | 'round-robin' | 'affinity-based' | 'cost-based' | 'hybrid';
export type TaskSchedulingStrategy = 'fifo' | 'priority' | 'deadline' | 'shortest-job' | 'critical-path' | 'resource-aware' | 'adaptive';
export type LoadBalancingStrategy = 'work-stealing' | 'work-sharing' | 'centralized' | 'distributed' | 'predictive' | 'reactive';
export type FaultToleranceStrategy = 'retry' | 'redundancy' | 'checkpoint' | 'circuit-breaker' | 'bulkhead' | 'timeout' | 'graceful-degradation';
export type CommunicationStrategy = 'direct' | 'broadcast' | 'publish-subscribe' | 'request-response' | 'event-driven' | 'gossip' | 'hierarchical';
export interface SwarmMemory {
    namespace: string;
    partitions: MemoryPartition[];
    permissions: MemoryPermissions;
    persistent: boolean;
    backupEnabled: boolean;
    distributed: boolean;
    consistency: ConsistencyLevel;
    cacheEnabled: boolean;
    compressionEnabled: boolean;
}
export interface MemoryPartition {
    id: string;
    name: string;
    type: MemoryType;
    entries: MemoryEntry[];
    maxSize: number;
    ttl?: number;
    readOnly: boolean;
    shared: boolean;
    indexed: boolean;
    compressed: boolean;
}
export type MemoryType = 'knowledge' | 'state' | 'cache' | 'logs' | 'results' | 'communication' | 'configuration' | 'metrics';
export interface MemoryEntry {
    id: string;
    key: string;
    value: any;
    type: string;
    tags: string[];
    owner: AgentId;
    accessLevel: AccessLevel;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    version: number;
    previousVersions?: MemoryEntry[];
    references: string[];
    dependencies: string[];
}
export type AccessLevel = 'private' | 'team' | 'swarm' | 'public' | 'system';
export interface MemoryPermissions {
    read: AccessLevel;
    write: AccessLevel;
    delete: AccessLevel;
    share: AccessLevel;
}
export type ConsistencyLevel = 'strong' | 'eventual' | 'weak' | 'session';
export interface MonitoringConfig {
    metricsEnabled: boolean;
    loggingEnabled: boolean;
    tracingEnabled: boolean;
    metricsInterval: number;
    heartbeatInterval: number;
    healthCheckInterval: number;
    retentionPeriod: number;
    maxLogSize: number;
    maxMetricPoints: number;
    alertingEnabled: boolean;
    alertThresholds: Record<string, number>;
    exportEnabled: boolean;
    exportFormat: string;
    exportDestination: string;
}
export interface SystemMetrics {
    timestamp: Date;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
    activeSwarms: number;
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    runningTasks: number;
    throughput: number;
    latency: number;
    errorRate: number;
    successRate: number;
    resourceUtilization: Record<string, number>;
    queueLengths: Record<string, number>;
}
export interface Alert {
    id: string;
    timestamp: Date;
    level: AlertLevel;
    type: AlertType;
    message: string;
    source: string;
    context: Record<string, any>;
    acknowledged: boolean;
    resolved: boolean;
    assignedTo?: string;
    escalationLevel: number;
    escalatedAt?: Date;
}
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';
export type AlertType = 'system' | 'performance' | 'resource' | 'security' | 'agent' | 'task' | 'swarm' | 'custom';
export interface SwarmEvent {
    id: string;
    timestamp: Date;
    type: EventType;
    source: string;
    data: Record<string, any>;
    targets?: string[];
    broadcast: boolean;
    processed: boolean;
    processedAt?: Date;
    correlationId?: string;
    causationId?: string;
}
export type EventType = 'swarm.created' | 'swarm.started' | 'swarm.paused' | 'swarm.resumed' | 'swarm.completed' | 'swarm.failed' | 'swarm.cancelled' | 'agent.created' | 'agent.started' | 'agent.stopped' | 'agent.error' | 'agent.heartbeat' | 'task.created' | 'task.assigned' | 'task.started' | 'task.paused' | 'task.resumed' | 'task.completed' | 'task.failed' | 'task.cancelled' | 'task.retried' | 'coordination.load_balanced' | 'coordination.work_stolen' | 'coordination.agent_selected' | 'coordination.dependency_resolved' | 'system.startup' | 'system.shutdown' | 'system.resource_limit' | 'system.performance_degradation' | 'custom.user_defined';
export interface SwarmEventEmitter extends EventEmitter {
    emitSwarmEvent(event: SwarmEvent): boolean;
    emitSwarmEvents(events: SwarmEvent[]): boolean;
    onSwarmEvent(type: EventType, handler: (event: SwarmEvent) => void): this;
    offSwarmEvent(type: EventType, handler: (event: SwarmEvent) => void): this;
    filterEvents(predicate: (event: SwarmEvent) => boolean): SwarmEvent[];
    correlateEvents(correlationId: string): SwarmEvent[];
}
export interface SwarmConfig {
    name: string;
    description: string;
    version: string;
    mode: SwarmMode;
    strategy: SwarmStrategy;
    coordinationStrategy: CoordinationStrategy;
    maxAgents: number;
    maxTasks: number;
    maxDuration: number;
    taskTimeoutMinutes?: number;
    resourceLimits: Record<string, number>;
    qualityThreshold: number;
    reviewRequired: boolean;
    testingRequired: boolean;
    monitoring: MonitoringConfig;
    memory: SwarmMemory;
    security: SecurityConfig;
    performance: PerformanceConfig;
}
export interface SecurityConfig {
    authenticationRequired: boolean;
    authorizationRequired: boolean;
    encryptionEnabled: boolean;
    defaultPermissions: string[];
    adminRoles: string[];
    auditEnabled: boolean;
    auditLevel: string;
    inputValidation: boolean;
    outputSanitization: boolean;
}
export interface PerformanceConfig {
    maxConcurrency: number;
    defaultTimeout: number;
    cacheEnabled: boolean;
    cacheSize: number;
    cacheTtl: number;
    optimizationEnabled: boolean;
    adaptiveScheduling: boolean;
    predictiveLoading: boolean;
    resourcePooling: boolean;
    connectionPooling: boolean;
    memoryPooling: boolean;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    validatedAt: Date;
    validator: string;
    context: Record<string, any>;
}
export interface ValidationError {
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'critical';
}
export interface ValidationWarning {
    field: string;
    message: string;
    code: string;
    recommendation: string;
}
export declare function isAgentId(obj: any): obj is AgentId;
export declare function isTaskId(obj: any): obj is TaskId;
export declare function isSwarmEvent(obj: any): obj is SwarmEvent;
export declare function isTaskDefinition(obj: any): obj is TaskDefinition;
export declare function isAgentState(obj: any): obj is AgentState;
export declare const SWARM_CONSTANTS: {
    readonly DEFAULT_TASK_TIMEOUT: number;
    readonly DEFAULT_AGENT_TIMEOUT: number;
    readonly DEFAULT_HEARTBEAT_INTERVAL: number;
    readonly MAX_AGENTS_PER_SWARM: 100;
    readonly MAX_TASKS_PER_AGENT: 10;
    readonly MAX_RETRIES: 3;
    readonly MIN_QUALITY_THRESHOLD: 0.7;
    readonly DEFAULT_QUALITY_THRESHOLD: 0.8;
    readonly HIGH_QUALITY_THRESHOLD: 0.9;
    readonly DEFAULT_THROUGHPUT_TARGET: 10;
    readonly DEFAULT_LATENCY_TARGET: 1000;
    readonly DEFAULT_RELIABILITY_TARGET: 0.95;
    readonly DEFAULT_MEMORY_LIMIT: number;
    readonly DEFAULT_CPU_LIMIT: 1;
    readonly DEFAULT_DISK_LIMIT: number;
};
declare const _default: {
    SWARM_CONSTANTS: {
        readonly DEFAULT_TASK_TIMEOUT: number;
        readonly DEFAULT_AGENT_TIMEOUT: number;
        readonly DEFAULT_HEARTBEAT_INTERVAL: number;
        readonly MAX_AGENTS_PER_SWARM: 100;
        readonly MAX_TASKS_PER_AGENT: 10;
        readonly MAX_RETRIES: 3;
        readonly MIN_QUALITY_THRESHOLD: 0.7;
        readonly DEFAULT_QUALITY_THRESHOLD: 0.8;
        readonly HIGH_QUALITY_THRESHOLD: 0.9;
        readonly DEFAULT_THROUGHPUT_TARGET: 10;
        readonly DEFAULT_LATENCY_TARGET: 1000;
        readonly DEFAULT_RELIABILITY_TARGET: 0.95;
        readonly DEFAULT_MEMORY_LIMIT: number;
        readonly DEFAULT_CPU_LIMIT: 1;
        readonly DEFAULT_DISK_LIMIT: number;
    };
    isAgentId: typeof isAgentId;
    isTaskId: typeof isTaskId;
    isSwarmEvent: typeof isSwarmEvent;
    isTaskDefinition: typeof isTaskDefinition;
    isAgentState: typeof isAgentState;
};
export default _default;
//# sourceMappingURL=types.d.ts.map