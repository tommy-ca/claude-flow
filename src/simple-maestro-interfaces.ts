/**
 * Simple Maestro Interfaces - Essential Contracts Only
 * 
 * KISS principle: Only the most essential interfaces needed for functionality.
 * Replaces the complex 40+ interface system with 4-5 core contracts.
 */

// ===== CORE INTERFACES =====

/**
 * Essential task specification
 */
export interface Task {
  id: string;
  description: string;
  type: 'spec' | 'design' | 'implementation' | 'test' | 'review';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  created: Date;
  completed?: Date;
  metadata?: Record<string, any>;
}

/**
 * Simple workflow specification
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  created: Date;
  updated: Date;
}

/**
 * Basic validation result
 */
export interface ValidationResult {
  valid: boolean;
  score: number; // 0-1
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Core coordination interface - Single point of control
 */
export interface TaskCoordinator {
  // Task management
  createTask(description: string, type: Task['type'], priority?: Task['priority']): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  getTasks(filter?: Partial<Task>): Promise<Task[]>;
  deleteTask(id: string): Promise<boolean>;

  // Workflow management
  createWorkflow(name: string, description: string): Promise<Workflow>;
  addTaskToWorkflow(workflowId: string, task: Task): Promise<Workflow>;
  executeWorkflow(id: string): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow | null>;

  // Content generation
  generateContent(prompt: string, type: string): Promise<string>;
  
  // Simple validation
  validate(content: string, type: string): Promise<ValidationResult>;
  
  // Status and cleanup
  getStatus(): Promise<{ active: boolean; tasks: number; workflows: number }>;
  shutdown(): Promise<void>;
}

/**
 * File management interface
 */
export interface FileManager {
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  createDirectory(path: string): Promise<void>;
  listFiles(directory: string): Promise<string[]>;
}

// ===== SIMPLE TYPES =====

/**
 * Basic configuration - 5 key options only
 */
export interface MaestroConfig {
  workingDirectory: string;
  enableValidation: boolean;
  qualityThreshold: number; // 0-1
  maxConcurrentTasks: number;
  autoSave: boolean;
}

/**
 * Simple agent capability
 */
export interface Agent {
  id: string;
  name: string;
  type: string;
  available: boolean;
  capabilities: string[];
}

/**
 * Basic event for coordination
 */
export interface CoordinationEvent {
  type: string;
  data: any;
  timestamp: Date;
  source: string;
}

// ===== UTILITY TYPES =====

/**
 * Simple error with context
 */
export interface MaestroError extends Error {
  code: string;
  context?: Record<string, any>;
}

/**
 * Basic metrics for monitoring
 */
export interface Metrics {
  tasksCreated: number;
  tasksCompleted: number;
  workflowsActive: number;
  averageCompletionTime: number;
  successRate: number;
}

/**
 * Simple logger interface
 */
export interface Logger {
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error?: any): void;
  debug(message: string, context?: any): void;
}