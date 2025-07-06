/**
 * Hive Mind Module Export
 * 
 * Main entry point for the Hive Mind collective intelligence system
 */

// Core classes
export { HiveMind } from './core/HiveMind';
export { Queen } from './core/Queen';
export { Agent } from './core/Agent';
export { Memory } from './core/Memory';
export { Communication } from './core/Communication';
export { DatabaseManager } from './core/DatabaseManager';

// Integration layer
export { MCPToolWrapper } from './integration/MCPToolWrapper';
export { SwarmOrchestrator } from './integration/SwarmOrchestrator';
export { ConsensusEngine } from './integration/ConsensusEngine';

// Types
export * from './types';

// Default export
export { HiveMind as default } from './core/HiveMind';