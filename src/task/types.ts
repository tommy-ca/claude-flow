// Task system types

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
  engine: any;
  coordinator: any;
  logger: any;
  memory: any;
}
