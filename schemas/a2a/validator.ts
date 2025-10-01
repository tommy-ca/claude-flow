/**
 * A2A Protocol JSON Schema Validator
 *
 * Provides validation utilities for all A2A message types using JSON Schema
 */

import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Ajv with strict mode and formats
const ajv = new Ajv({
  strict: true,
  allErrors: true,
  verbose: true,
  $data: true,
  discriminator: true,
});
addFormats(ajv);

// Schema cache
const schemaCache = new Map<string, ValidateFunction>();

/**
 * Load and compile a JSON schema
 */
function loadSchema(schemaName: string): ValidateFunction {
  if (schemaCache.has(schemaName)) {
    return schemaCache.get(schemaName)!;
  }

  const schemaPath = join(__dirname, `${schemaName}.json`);
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  const validate = ajv.compile(schema);
  schemaCache.set(schemaName, validate);

  return validate;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Formatted validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
  params?: Record<string, unknown>;
}

/**
 * Format Ajv errors into readable format
 */
function formatErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors) return [];

  return errors.map((error) => ({
    path: error.instancePath || error.schemaPath,
    message: error.message || 'Validation failed',
    keyword: error.keyword,
    params: error.params,
  }));
}

/**
 * Validate message envelope
 */
export function validateMessageEnvelope(data: unknown): ValidationResult {
  const validate = loadSchema('message-envelope');
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Validate agent registration message
 */
export function validateAgentRegistration(data: unknown): ValidationResult {
  const validate = loadSchema('agent-registration');
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Validate task request message
 */
export function validateTaskRequest(data: unknown): ValidationResult {
  const validate = loadSchema('task-request');
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Validate task response message
 */
export function validateTaskResponse(data: unknown): ValidationResult {
  const validate = loadSchema('task-response');
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Validate memory operation message
 */
export function validateMemoryOperation(data: unknown, operationType: 'read' | 'write' | 'update' | 'delete'): ValidationResult {
  const schema = loadSchema('memory-operations');

  // Get the specific operation schema from $defs
  const schemaObj = JSON.parse(readFileSync(join(__dirname, 'memory-operations.json'), 'utf-8'));
  const operationSchemaMap = {
    read: schemaObj.$defs.memoryReadRequest,
    write: schemaObj.$defs.memoryWriteRequest,
    update: schemaObj.$defs.memoryUpdateRequest,
    delete: schemaObj.$defs.memoryDeleteRequest,
  };

  const validate = ajv.compile(operationSchemaMap[operationType]);
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Validate discovery query message
 */
export function validateDiscoveryQuery(data: unknown): ValidationResult {
  const validate = loadSchema('discovery-query');
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Validate health check message
 */
export function validateHealthCheck(data: unknown, messageType: 'request' | 'response' | 'heartbeat'): ValidationResult {
  const schemaObj = JSON.parse(readFileSync(join(__dirname, 'health-check.json'), 'utf-8'));

  const schemaMap = {
    request: schemaObj.$defs.healthCheckRequest,
    response: schemaObj.$defs.healthCheckResponse,
    heartbeat: schemaObj.$defs.heartbeatMessage,
  };

  const validate = ajv.compile(schemaMap[messageType]);
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Validate error response message
 */
export function validateErrorResponse(data: unknown): ValidationResult {
  const validate = loadSchema('error-response');
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Generic validator - validates any data against a schema by name
 */
export function validate(schemaName: string, data: unknown): ValidationResult {
  const validate = loadSchema(schemaName);
  const valid = validate(data);

  return {
    valid: !!valid,
    errors: valid ? undefined : formatErrors(validate.errors),
  };
}

/**
 * Type guard: Check if data is valid message envelope
 */
export function isMessageEnvelope(data: unknown): data is Record<string, unknown> {
  return validateMessageEnvelope(data).valid;
}

/**
 * Type guard: Check if data is valid agent registration
 */
export function isAgentRegistration(data: unknown): data is Record<string, unknown> {
  return validateAgentRegistration(data).valid;
}

/**
 * Type guard: Check if data is valid task request
 */
export function isTaskRequest(data: unknown): data is Record<string, unknown> {
  return validateTaskRequest(data).valid;
}

/**
 * Type guard: Check if data is valid task response
 */
export function isTaskResponse(data: unknown): data is Record<string, unknown> {
  return validateTaskResponse(data).valid;
}

/**
 * Type guard: Check if data is valid error response
 */
export function isErrorResponse(data: unknown): data is Record<string, unknown> {
  return validateErrorResponse(data).valid;
}

/**
 * Assert validation - throws if invalid
 */
export function assertValid(schemaName: string, data: unknown): asserts data {
  const result = validate(schemaName, data);
  if (!result.valid) {
    const errorMessages = result.errors?.map((e) => `${e.path}: ${e.message}`).join(', ');
    throw new Error(`Schema validation failed for ${schemaName}: ${errorMessages}`);
  }
}

/**
 * Clear schema cache (useful for testing)
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}
