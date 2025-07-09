export * from '../swarm/types.js';
export interface MemoryEntry {
    id: string;
    key: string;
    value: any;
    data?: any;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    partition?: string;
}
export type TaskId = string;
export type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';
export declare enum ComponentStatus {
    HEALTHY = "healthy",
    WARNING = "warning",
    ERROR = "error",
    UNKNOWN = "unknown"
}
export interface AlertData {
    id: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    component?: string;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=index.d.ts.map