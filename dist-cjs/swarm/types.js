"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWARM_CONSTANTS = void 0;
exports.isAgentId = isAgentId;
exports.isTaskId = isTaskId;
exports.isSwarmEvent = isSwarmEvent;
exports.isTaskDefinition = isTaskDefinition;
exports.isAgentState = isAgentState;
// ===== TYPE GUARDS =====
function isAgentId(obj) {
    return obj && typeof obj.id === 'string' && typeof obj.swarmId === 'string';
}
function isTaskId(obj) {
    return obj && typeof obj.id === 'string' && typeof obj.swarmId === 'string';
}
function isSwarmEvent(obj) {
    return obj && typeof obj.id === 'string' && typeof obj.type === 'string';
}
function isTaskDefinition(obj) {
    return obj && isTaskId(obj.id) && typeof obj.type === 'string';
}
function isAgentState(obj) {
    return obj && isAgentId(obj.id) && typeof obj.status === 'string';
}
// ===== CONSTANTS =====
exports.SWARM_CONSTANTS = {
    // Timeouts
    DEFAULT_TASK_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    DEFAULT_AGENT_TIMEOUT: 30 * 1000, // 30 seconds
    DEFAULT_HEARTBEAT_INTERVAL: 10 * 1000, // 10 seconds
    // Limits
    MAX_AGENTS_PER_SWARM: 100,
    MAX_TASKS_PER_AGENT: 10,
    MAX_RETRIES: 3,
    // Quality thresholds
    MIN_QUALITY_THRESHOLD: 0.7,
    DEFAULT_QUALITY_THRESHOLD: 0.8,
    HIGH_QUALITY_THRESHOLD: 0.9,
    // Performance targets
    DEFAULT_THROUGHPUT_TARGET: 10, // tasks per minute
    DEFAULT_LATENCY_TARGET: 1000, // milliseconds
    DEFAULT_RELIABILITY_TARGET: 0.95, // 95%
    // Resource limits
    DEFAULT_MEMORY_LIMIT: 512 * 1024 * 1024, // 512MB
    DEFAULT_CPU_LIMIT: 1.0, // 1 CPU core
    DEFAULT_DISK_LIMIT: 1024 * 1024 * 1024, // 1GB
};
// ===== EXPORTS =====
exports.default = {
    // Type exports are handled by TypeScript
    SWARM_CONSTANTS: exports.SWARM_CONSTANTS,
    // Utility functions
    isAgentId,
    isTaskId,
    isSwarmEvent,
    isTaskDefinition,
    isAgentState,
};
//# sourceMappingURL=types.js.map