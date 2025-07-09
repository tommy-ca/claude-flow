"use strict";
/**
 * Core type definitions for Claude-Flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemEvents = void 0;
// Event-related types
var SystemEvents;
(function (SystemEvents) {
    // Agent events
    SystemEvents["AGENT_SPAWNED"] = "agent:spawned";
    SystemEvents["AGENT_TERMINATED"] = "agent:terminated";
    SystemEvents["AGENT_ERROR"] = "agent:error";
    SystemEvents["AGENT_IDLE"] = "agent:idle";
    SystemEvents["AGENT_ACTIVE"] = "agent:active";
    // Task events
    SystemEvents["TASK_CREATED"] = "task:created";
    SystemEvents["TASK_ASSIGNED"] = "task:assigned";
    SystemEvents["TASK_STARTED"] = "task:started";
    SystemEvents["TASK_COMPLETED"] = "task:completed";
    SystemEvents["TASK_FAILED"] = "task:failed";
    SystemEvents["TASK_CANCELLED"] = "task:cancelled";
    // Memory events
    SystemEvents["MEMORY_CREATED"] = "memory:created";
    SystemEvents["MEMORY_UPDATED"] = "memory:updated";
    SystemEvents["MEMORY_DELETED"] = "memory:deleted";
    SystemEvents["MEMORY_SYNCED"] = "memory:synced";
    // System events
    SystemEvents["SYSTEM_READY"] = "system:ready";
    SystemEvents["SYSTEM_SHUTDOWN"] = "system:shutdown";
    SystemEvents["SYSTEM_ERROR"] = "system:error";
    SystemEvents["SYSTEM_HEALTHCHECK"] = "system:healthcheck";
    // Coordination events
    SystemEvents["RESOURCE_ACQUIRED"] = "resource:acquired";
    SystemEvents["RESOURCE_RELEASED"] = "resource:released";
    SystemEvents["DEADLOCK_DETECTED"] = "deadlock:detected";
    SystemEvents["MESSAGE_SENT"] = "message:sent";
    SystemEvents["MESSAGE_RECEIVED"] = "message:received";
})(SystemEvents || (exports.SystemEvents = SystemEvents = {}));
//# sourceMappingURL=types.js.map