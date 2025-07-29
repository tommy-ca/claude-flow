/**
 * Central source of truth for agent types
 * 
 * This file ensures consistency across TypeScript types and runtime validation.
 * It provides the definitive list of all agent types used throughout the Claude Flow system,
 * along with utilities for validation, categorization, and description.
 * 
 * @fileoverview Agent type definitions and utilities
 * @version 1.0.0
 * @since 2024-01-01
 */

export const AGENT_TYPES = {
  // Core swarm agent types
  COORDINATOR: 'coordinator',
  RESEARCHER: 'researcher',
  CODER: 'coder',
  ANALYST: 'analyst',
  ARCHITECT: 'architect',
  TESTER: 'tester',
  REVIEWER: 'reviewer',
  OPTIMIZER: 'optimizer',
  DOCUMENTER: 'documenter',
  MONITOR: 'monitor',
  SPECIALIST: 'specialist',
  
  // Maestro specs-driven agent types
  REQUIREMENTS_ANALYST: 'requirements_analyst',
  DESIGN_ARCHITECT: 'design_architect',
  TASK_PLANNER: 'task_planner',
  IMPLEMENTATION_CODER: 'implementation_coder',
  QUALITY_REVIEWER: 'quality_reviewer',
  STEERING_DOCUMENTER: 'steering_documenter',
} as const;

export type AgentType = (typeof AGENT_TYPES)[keyof typeof AGENT_TYPES];

// Array of all valid agent types for runtime validation
export const VALID_AGENT_TYPES = Object.values(AGENT_TYPES);

// Categorized agent types for better organization
export const AGENT_TYPE_CATEGORIES = {
  CORE: [
    AGENT_TYPES.COORDINATOR,
    AGENT_TYPES.RESEARCHER,
    AGENT_TYPES.CODER,
    AGENT_TYPES.ANALYST,
    AGENT_TYPES.ARCHITECT,
    AGENT_TYPES.TESTER,
    AGENT_TYPES.REVIEWER,
    AGENT_TYPES.OPTIMIZER,
    AGENT_TYPES.DOCUMENTER,
    AGENT_TYPES.MONITOR,
    AGENT_TYPES.SPECIALIST,
  ],
  MAESTRO: [
    AGENT_TYPES.REQUIREMENTS_ANALYST,
    AGENT_TYPES.DESIGN_ARCHITECT,
    AGENT_TYPES.TASK_PLANNER,
    AGENT_TYPES.IMPLEMENTATION_CODER,
    AGENT_TYPES.QUALITY_REVIEWER,
    AGENT_TYPES.STEERING_DOCUMENTER,
  ]
} as const;

// Agent type descriptions for documentation and UI
export const AGENT_TYPE_DESCRIPTIONS = {
  [AGENT_TYPES.COORDINATOR]: 'Orchestrates and manages other agents in the swarm',
  [AGENT_TYPES.RESEARCHER]: 'Performs research and data gathering operations',
  [AGENT_TYPES.CODER]: 'Writes and maintains code, handles implementation tasks',
  [AGENT_TYPES.ANALYST]: 'Analyzes data and generates insights and reports',
  [AGENT_TYPES.ARCHITECT]: 'Designs system architecture and technical solutions',
  [AGENT_TYPES.TESTER]: 'Tests and validates functionality, ensures quality',
  [AGENT_TYPES.REVIEWER]: 'Reviews and validates work from other agents',
  [AGENT_TYPES.OPTIMIZER]: 'Optimizes performance and efficiency of systems',
  [AGENT_TYPES.DOCUMENTER]: 'Creates and maintains documentation',
  [AGENT_TYPES.MONITOR]: 'Monitors system health and performance',
  [AGENT_TYPES.SPECIALIST]: 'Domain-specific specialized agent with expert knowledge',
  
  // Maestro specs-driven descriptions
  [AGENT_TYPES.REQUIREMENTS_ANALYST]: 'Analyzes requirements and creates user stories with acceptance criteria',
  [AGENT_TYPES.DESIGN_ARCHITECT]: 'Creates technical designs and architecture solutions from specifications',
  [AGENT_TYPES.TASK_PLANNER]: 'Plans and breaks down implementation tasks with dependencies',
  [AGENT_TYPES.IMPLEMENTATION_CODER]: 'Implements code based on specifications and designs',
  [AGENT_TYPES.QUALITY_REVIEWER]: 'Reviews implementation quality and ensures standards compliance',
  [AGENT_TYPES.STEERING_DOCUMENTER]: 'Creates governance documentation and steering guides',
} as const;

// JSON Schema for agent type validation
export const AGENT_TYPE_SCHEMA = {
  type: 'string',
  enum: VALID_AGENT_TYPES,
  description: 'Type of AI agent',
  examples: VALID_AGENT_TYPES,
};

/**
 * Validates if a string is a valid agent type
 * 
 * @param type - The string to validate
 * @returns True if the type is a valid AgentType, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = isValidAgentType('coordinator'); // true
 * const isInvalid = isValidAgentType('invalid'); // false
 * ```
 */
export function isValidAgentType(type: string): type is AgentType {
  return VALID_AGENT_TYPES.includes(type as AgentType);
}

/**
 * Gets the human-readable description for an agent type
 * 
 * @param type - The agent type to get description for
 * @returns The description string, or 'Unknown agent type' if not found
 * 
 * @example
 * ```typescript
 * const desc = getAgentTypeDescription(AGENT_TYPES.COORDINATOR);
 * // Returns: "Orchestrates and manages other agents in the swarm"
 * ```
 */
export function getAgentTypeDescription(type: AgentType): string {
  return AGENT_TYPE_DESCRIPTIONS[type] || 'Unknown agent type';
}

/**
 * Checks if an agent type belongs to a specific category
 * 
 * @param type - The agent type to check
 * @param category - The category to check against ('CORE' or 'MAESTRO')
 * @returns True if the agent type is in the specified category
 * 
 * @example
 * ```typescript
 * const isCoreAgent = isAgentTypeInCategory(AGENT_TYPES.COORDINATOR, 'CORE'); // true
 * const isMaestroAgent = isAgentTypeInCategory(AGENT_TYPES.REQUIREMENTS_ANALYST, 'MAESTRO'); // true
 * ```
 */
export function isAgentTypeInCategory(type: AgentType, category: keyof typeof AGENT_TYPE_CATEGORIES): boolean {
  return AGENT_TYPE_CATEGORIES[category].includes(type);
}

/**
 * Gets all agent types in a specific category
 * 
 * @param category - The category to get agent types for ('CORE' or 'MAESTRO')
 * @returns Readonly array of agent types in the specified category
 * 
 * @example
 * ```typescript
 * const coreAgents = getAgentTypesByCategory('CORE');
 * const maestroAgents = getAgentTypesByCategory('MAESTRO');
 * ```
 */
export function getAgentTypesByCategory(category: keyof typeof AGENT_TYPE_CATEGORIES): readonly AgentType[] {
  return AGENT_TYPE_CATEGORIES[category];
}

// Strategy types
export const SWARM_STRATEGIES = {
  AUTO: 'auto',
  RESEARCH: 'research',
  DEVELOPMENT: 'development',
  ANALYSIS: 'analysis',
  TESTING: 'testing',
  OPTIMIZATION: 'optimization',
  MAINTENANCE: 'maintenance',
  CUSTOM: 'custom',
} as const;

export type SwarmStrategy = (typeof SWARM_STRATEGIES)[keyof typeof SWARM_STRATEGIES];
export const VALID_SWARM_STRATEGIES = Object.values(SWARM_STRATEGIES);

// Task orchestration strategies (different from swarm strategies)
export const ORCHESTRATION_STRATEGIES = {
  PARALLEL: 'parallel',
  SEQUENTIAL: 'sequential',
  ADAPTIVE: 'adaptive',
  BALANCED: 'balanced',
} as const;

export type OrchestrationStrategy =
  (typeof ORCHESTRATION_STRATEGIES)[keyof typeof ORCHESTRATION_STRATEGIES];
export const VALID_ORCHESTRATION_STRATEGIES = Object.values(ORCHESTRATION_STRATEGIES);
