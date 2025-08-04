/**
 * Steering Workflow Components Export
 * 
 * Centralized exports for all steering workflow components following SOLID architecture
 */

// Core orchestration component
export { SteeringOrchestrator } from './SteeringOrchestrator.js';

// Interfaces and types
export type {
  ISteeringWorkflowCoordination,
  ISteeringDocumentManager,
  ISteeringValidator,
  ISteeringContentGenerator,
  SteeringWorkflowRequest,
  SteeringOperationResult,
  SteeringOperation,
  SteeringDocument,
  SteeringDocumentType,
  ValidationResult,
  WorkflowProgress,
  RecoveryResult,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  ValidationRequest,
  DocumentOperationContext,
  CrossDocumentValidation,
  OrchestrationConfig,
  SteeringWorkflowEvent
} from '../interfaces/steering-interfaces.js';

// Factory function for creating orchestrator with proper dependency injection
import type {
  ISteeringDocumentManager,
  ISteeringValidator,
  ISteeringContentGenerator
} from '../interfaces/steering-interfaces.js';
import type {
  MaestroCoordinator,
  MaestroLogger
} from '../interfaces.js';
import { SteeringOrchestrator } from './SteeringOrchestrator.js';

/**
 * Factory function to create SteeringOrchestrator with dependency injection
 */
export function createSteeringOrchestrator(
  documentManager: ISteeringDocumentManager,
  validator: ISteeringValidator,
  contentGenerator: ISteeringContentGenerator,
  coordinator: MaestroCoordinator,
  logger: MaestroLogger
): SteeringOrchestrator {
  return new SteeringOrchestrator(
    documentManager,
    validator,
    contentGenerator,
    coordinator,
    logger
  );
}

/**
 * Utility function to validate orchestrator dependencies
 */
export function validateOrchestratorDependencies(
  documentManager: ISteeringDocumentManager,
  validator: ISteeringValidator,
  contentGenerator: ISteeringContentGenerator,
  coordinator: MaestroCoordinator,
  logger: MaestroLogger
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!documentManager) {
    errors.push('Document manager is required');
  }
  if (!validator) {
    errors.push('Validator is required');
  }
  if (!contentGenerator) {
    errors.push('Content generator is required');
  }
  if (!coordinator) {
    errors.push('Coordinator is required');
  }
  if (!logger) {
    errors.push('Logger is required');
  }

  // Check for required methods
  if (documentManager && typeof documentManager.createDocument !== 'function') {
    errors.push('Document manager missing createDocument method');
  }
  if (validator && typeof validator.validateDocument !== 'function') {
    errors.push('Validator missing validateDocument method');
  }
  if (contentGenerator && typeof contentGenerator.generateContent !== 'function') {
    errors.push('Content generator missing generateContent method');
  }
  if (coordinator && typeof coordinator.createTask !== 'function') {
    errors.push('Coordinator missing createTask method');
  }
  if (logger && typeof logger.info !== 'function') {
    errors.push('Logger missing info method');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}