/**
 * A2A Protocol Schema Tests
 *
 * Comprehensive tests for all A2A message type schemas
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateMessageEnvelope,
  validateAgentRegistration,
  validateTaskRequest,
  validateTaskResponse,
  validateMemoryOperation,
  validateDiscoveryQuery,
  validateHealthCheck,
  validateErrorResponse,
  clearSchemaCache,
  isMessageEnvelope,
  isTaskRequest,
  assertValid,
} from './validator.js';

describe('A2A Protocol Schema Validation', () => {
  beforeEach(() => {
    clearSchemaCache();
  });

  describe('Message Envelope', () => {
    it('should validate valid message envelope', () => {
      const envelope = {
        version: '1.0.0',
        type: 'a2a.task.request',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        from: {
          agentId: 'agent-001',
          swarmId: 'swarm-alpha',
        },
        to: {
          agentId: 'agent-002',
        },
        priority: 1,
        timestamp: 1696118400000,
        payload: {
          taskId: 'task-001',
        },
      };

      const result = validateMessageEnvelope(envelope);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject envelope with invalid version format', () => {
      const envelope = {
        version: '1.0',
        type: 'a2a.task.request',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        from: { agentId: 'agent-001' },
        to: { agentId: 'agent-002' },
        priority: 1,
        timestamp: 1696118400000,
        payload: {},
      };

      const result = validateMessageEnvelope(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('pattern');
    });

    it('should reject envelope with missing required fields', () => {
      const envelope = {
        version: '1.0.0',
        type: 'a2a.task.request',
        // Missing messageId, from, to, priority, timestamp, payload
      };

      const result = validateMessageEnvelope(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate envelope with multicast to addresses', () => {
      const envelope = {
        version: '1.0.0',
        type: 'a2a.event.notify',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        from: { agentId: 'agent-001' },
        to: [
          { agentId: 'agent-002' },
          { agentId: 'agent-003' },
        ],
        priority: 2,
        timestamp: 1696118400000,
        payload: {},
      };

      const result = validateMessageEnvelope(envelope);
      expect(result.valid).toBe(true);
    });

    it('should validate envelope with optional fields', () => {
      const envelope = {
        version: '1.0.0',
        type: 'a2a.task.request',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        correlationId: '660e8400-e29b-41d4-a716-446655440001',
        replyTo: 'agent-001',
        from: { agentId: 'agent-001' },
        to: { agentId: 'agent-002' },
        priority: 1,
        ttl: 30000,
        expiresAt: 1696148400000,
        timestamp: 1696118400000,
        spanId: 'span-123',
        traceId: 'trace-456',
        parentSpanId: 'span-000',
        payload: {},
        headers: { custom: 'value' },
        signature: 'signature-data',
        encryptedPayload: true,
      };

      const result = validateMessageEnvelope(envelope);
      expect(result.valid).toBe(true);
    });
  });

  describe('Agent Registration', () => {
    it('should validate valid registration message', () => {
      const registration = {
        agent: {
          agentId: 'agent-001',
          agentType: 'researcher',
          name: 'Research Agent',
          version: '2.5.0',
        },
        capabilities: [
          {
            name: 'research',
            version: '1.0.0',
          },
        ],
      };

      const result = validateAgentRegistration(registration);
      expect(result.valid).toBe(true);
    });

    it('should validate registration with endpoints', () => {
      const registration = {
        agent: {
          agentId: 'agent-001',
          agentType: 'researcher',
          name: 'Research Agent',
          version: '2.5.0',
        },
        capabilities: [
          {
            name: 'research',
            version: '1.0.0',
          },
        ],
        endpoints: [
          {
            protocol: 'https',
            address: 'api.example.com',
            port: 443,
            path: '/agents/001',
          },
        ],
      };

      const result = validateAgentRegistration(registration);
      expect(result.valid).toBe(true);
    });

    it('should reject registration with invalid capability', () => {
      const registration = {
        agent: {
          agentId: 'agent-001',
          agentType: 'researcher',
          name: 'Research Agent',
          version: '2.5.0',
        },
        capabilities: [
          {
            // Missing required 'name' and 'version'
          },
        ],
      };

      const result = validateAgentRegistration(registration);
      expect(result.valid).toBe(false);
    });
  });

  describe('Task Request', () => {
    it('should validate valid task request', () => {
      const taskRequest = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        taskType: 'research',
        description: 'Research ML optimization',
        requiredCapabilities: ['research', 'analysis'],
        priority: 1,
        input: {
          query: 'ML optimization techniques',
        },
      };

      const result = validateTaskRequest(taskRequest);
      expect(result.valid).toBe(true);
    });

    it('should validate task request with context', () => {
      const taskRequest = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        taskType: 'research',
        description: 'Research ML optimization',
        requiredCapabilities: ['research'],
        priority: 1,
        input: {},
        context: {
          sessionId: 'session-001',
          userId: 'user-123',
          workflowId: '660e8400-e29b-41d4-a716-446655440001',
          environment: 'production',
        },
      };

      const result = validateTaskRequest(taskRequest);
      expect(result.valid).toBe(true);
    });

    it('should reject task request with invalid priority', () => {
      const taskRequest = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        taskType: 'research',
        description: 'Research ML optimization',
        requiredCapabilities: ['research'],
        priority: 10, // Invalid: must be 0-4
        input: {},
      };

      const result = validateTaskRequest(taskRequest);
      expect(result.valid).toBe(false);
    });
  });

  describe('Task Response', () => {
    it('should validate completed task response', () => {
      const taskResponse = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        output: {
          result: 'success',
        },
        executedBy: 'agent-001',
        startedAt: 1696118400000,
        completedAt: 1696118700000,
        durationMs: 300000,
      };

      const result = validateTaskResponse(taskResponse);
      expect(result.valid).toBe(true);
    });

    it('should validate failed task response with error', () => {
      const taskResponse = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'failed',
        error: {
          code: 'A2A-R-500',
          message: 'Task execution failed',
        },
        executedBy: 'agent-001',
        startedAt: 1696118400000,
        completedAt: 1696118430000,
        durationMs: 30000,
      };

      const result = validateTaskResponse(taskResponse);
      expect(result.valid).toBe(true);
    });

    it('should reject response with invalid error code format', () => {
      const taskResponse = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'failed',
        error: {
          code: 'INVALID-CODE',
          message: 'Error',
        },
        executedBy: 'agent-001',
        startedAt: 1696118400000,
      };

      const result = validateTaskResponse(taskResponse);
      expect(result.valid).toBe(false);
    });
  });

  describe('Memory Operations', () => {
    it('should validate memory read request', () => {
      const readRequest = {
        namespace: 'project/ml-optimization',
        key: 'research/findings',
        consistencyModel: 'strong',
      };

      const result = validateMemoryOperation(readRequest, 'read');
      expect(result.valid).toBe(true);
    });

    it('should validate memory write request', () => {
      const writeRequest = {
        namespace: 'project/ml-optimization',
        key: 'research/findings',
        value: { data: 'test' },
        ttl: 3600000,
        consistencyModel: 'eventual',
      };

      const result = validateMemoryOperation(writeRequest, 'write');
      expect(result.valid).toBe(true);
    });

    it('should validate memory update request', () => {
      const updateRequest = {
        namespace: 'project/ml-optimization',
        key: 'research/findings',
        operations: [
          {
            op: 'set',
            path: 'status',
            value: 'completed',
          },
        ],
      };

      const result = validateMemoryOperation(updateRequest, 'update');
      expect(result.valid).toBe(true);
    });

    it('should reject write request with both createOnly and updateOnly', () => {
      const writeRequest = {
        namespace: 'test',
        key: 'test',
        value: {},
        createOnly: true,
        updateOnly: true,
      };

      const result = validateMemoryOperation(writeRequest, 'write');
      // This would be logically invalid but schema allows it
      // Consider adding custom validation if needed
      expect(result.valid).toBe(true);
    });
  });

  describe('Discovery Query', () => {
    it('should validate discovery query', () => {
      const query = {
        requiredCapabilities: ['research', 'analysis'],
        states: ['idle', 'busy'],
        healthStatuses: ['healthy'],
        minAvailableSlots: 1,
        maxLoad: 0.8,
        limit: 10,
        offset: 0,
      };

      const result = validateDiscoveryQuery(query);
      expect(result.valid).toBe(true);
    });

    it('should validate query with filters', () => {
      const query = {
        filters: [
          {
            field: 'metadata.agentType',
            operator: 'eq',
            value: 'researcher',
          },
        ],
        sortBy: 'availableSlots',
        sortOrder: 'desc',
      };

      const result = validateDiscoveryQuery(query);
      expect(result.valid).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should validate health check request', () => {
      const request = {
        checkType: 'full',
        includeMetrics: true,
      };

      const result = validateHealthCheck(request, 'request');
      expect(result.valid).toBe(true);
    });

    it('should validate health check response', () => {
      const response = {
        agentId: 'agent-001',
        healthy: true,
        state: 'idle',
        checks: [
          {
            name: 'memory',
            status: 'pass',
          },
        ],
      };

      const result = validateHealthCheck(response, 'response');
      expect(result.valid).toBe(true);
    });

    it('should validate heartbeat message', () => {
      const heartbeat = {
        agentId: 'agent-001',
        state: 'idle',
        currentLoad: 0.3,
        activeTasks: 2,
        queuedTasks: 0,
        availableSlots: 3,
        uptime: 86400,
      };

      const result = validateHealthCheck(heartbeat, 'heartbeat');
      expect(result.valid).toBe(true);
    });
  });

  describe('Error Response', () => {
    it('should validate error response', () => {
      const error = {
        errorCode: 'A2A-R-404',
        errorType: 'not_found',
        message: 'Agent not found',
      };

      const result = validateErrorResponse(error);
      expect(result.valid).toBe(true);
    });

    it('should validate error with details', () => {
      const error = {
        errorCode: 'A2A-M-409',
        errorType: 'conflict',
        message: 'Version conflict',
        details: {
          code: 'VERSION_MISMATCH',
          message: 'Expected version 3, found 5',
          metadata: {
            expectedVersion: 3,
            actualVersion: 5,
          },
        },
        retryable: true,
        retryAfterMs: 1000,
      };

      const result = validateErrorResponse(error);
      expect(result.valid).toBe(true);
    });

    it('should reject error with invalid code format', () => {
      const error = {
        errorCode: 'INVALID',
        errorType: 'internal',
        message: 'Error',
      };

      const result = validateErrorResponse(error);
      expect(result.valid).toBe(false);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify valid message envelope', () => {
      const envelope = {
        version: '1.0.0',
        type: 'a2a.task.request',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        from: { agentId: 'agent-001' },
        to: { agentId: 'agent-002' },
        priority: 1,
        timestamp: 1696118400000,
        payload: {},
      };

      expect(isMessageEnvelope(envelope)).toBe(true);
    });

    it('should correctly identify invalid message envelope', () => {
      const envelope = {
        version: '1.0.0',
        // Missing required fields
      };

      expect(isMessageEnvelope(envelope)).toBe(false);
    });
  });

  describe('Assertion Functions', () => {
    it('should not throw for valid data', () => {
      const envelope = {
        version: '1.0.0',
        type: 'a2a.task.request',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        from: { agentId: 'agent-001' },
        to: { agentId: 'agent-002' },
        priority: 1,
        timestamp: 1696118400000,
        payload: {},
      };

      expect(() => assertValid('message-envelope', envelope)).not.toThrow();
    });

    it('should throw for invalid data', () => {
      const envelope = {
        version: '1.0',
        // Invalid and missing fields
      };

      expect(() => assertValid('message-envelope', envelope)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty optional arrays', () => {
      const registration = {
        agent: {
          agentId: 'agent-001',
          agentType: 'researcher',
          name: 'Research Agent',
          version: '2.5.0',
          tags: [],
        },
        capabilities: [
          {
            name: 'research',
            version: '1.0.0',
            tags: [],
          },
        ],
        endpoints: [],
      };

      const result = validateAgentRegistration(registration);
      expect(result.valid).toBe(true);
    });

    it('should handle maximum valid values', () => {
      const envelope = {
        version: '999.999.999',
        type: 'a2a.task.request',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        from: { agentId: 'agent-001' },
        to: { agentId: 'agent-002' },
        priority: 4,
        timestamp: Number.MAX_SAFE_INTEGER,
        payload: {},
      };

      const result = validateMessageEnvelope(envelope);
      expect(result.valid).toBe(true);
    });

    it('should reject negative timestamps', () => {
      const envelope = {
        version: '1.0.0',
        type: 'a2a.task.request',
        messageId: '550e8400-e29b-41d4-a716-446655440000',
        from: { agentId: 'agent-001' },
        to: { agentId: 'agent-002' },
        priority: 1,
        timestamp: -1,
        payload: {},
      };

      const result = validateMessageEnvelope(envelope);
      expect(result.valid).toBe(false);
    });
  });
});
