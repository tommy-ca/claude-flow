#!/usr/bin/env node
/**
 * Maestro Module - Clean Exports Following SOLID Principles  
 * Single entry point for all maestro functionality - Simplified for Performance
 */

// Core Coordinators (Simple implementations following SOLID)
export { 
  SimpleMaestroCoordinator, 
  createSimpleMaestroCoordinator 
} from './simple-coordinator';

// Component Implementations
export { 
  SimpleContentGenerator, 
  createSimpleContentGenerator 
} from './simple-content-generator';

export { 
  SimpleConsensusValidator, 
  createSimpleConsensusValidator 
} from './simple-consensus-validator';

export { 
  SimpleDatabaseOptimizer, 
  createSimpleDatabaseOptimizer 
} from './simple-database-optimizer';

// Core Types for Compatibility
export * from './types';

// Interfaces
export * from './interfaces';

// Default export for common usage
export { createSimpleMaestroCoordinator as createMaestroCoordinator } from './simple-coordinator';