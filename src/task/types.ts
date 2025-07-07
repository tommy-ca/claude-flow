// Task system types
import type { TaskEngine } from './engine.js';
import type { TaskCoordinator } from './coordination.js';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface CoordinationContext {
  sessionId: string;
  coordinationMode: string;
  agents: any[];
  metadata?: Record<string, any>;
}

export interface TaskCommandContext {
  taskEngine: TaskEngine;
  taskCoordinator?: TaskCoordinator;
  memoryManager?: any;
  logger?: any;
}
