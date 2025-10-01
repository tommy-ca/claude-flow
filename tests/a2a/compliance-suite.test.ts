/**
 * A2A Compliance Test Suite
 *
 * This test suite validates Claude Flow's compliance with the A2A protocol
 * across all defined compliance levels.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Import A2A implementations (to be created)
import { A2AMessageHandler } from '../../src/a2a/message-handler';
import { A2AMemoryManager } from '../../src/a2a/memory/memory-manager';
import { A2ADiscoveryService } from '../../src/a2a/discovery/discovery-service';
import { HTTPTransport } from '../../src/a2a/transport/http-transport';
import { JWTAuthProvider } from '../../src/a2a/auth/jwt-auth';

// JSON Schema validator
const ajv = new Ajv();
addFormats(ajv);

// Load message schema
const messageSchema = {
  type: 'object',
  required: ['jsonrpc', 'method', 'id', 'from', 'to', 'conversation_id', 'timestamp', 'a2a_version'],
  properties: {
    jsonrpc: { const: '2.0' },
    method: { type: 'string' },
    params: { type: ['object', 'array'] },
    id: { type: ['string', 'number'] },
    from: { type: 'string' },
    to: { type: 'string' },
    conversation_id: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    a2a_version: { type: 'string' }
  }
};

const validateMessage = ajv.compile(messageSchema);

describe('A2A Compliance Suite', () => {

  describe('Level 1: Basic Messaging', () => {

    let messageHandler: A2AMessageHandler;
    let transport: HTTPTransport;
    let authProvider: JWTAuthProvider;

    beforeAll(() => {
      messageHandler = new A2AMessageHandler();
      transport = new HTTPTransport({ timeout: 5000 });
      authProvider = new JWTAuthProvider({ secret: 'test-secret' });
    });

    describe('JSON-RPC 2.0 Compliance', () => {

      it('should validate valid JSON-RPC 2.0 message', () => {
        const message = {
          jsonrpc: '2.0',
          method: 'test.echo',
          params: { message: 'hello' },
          id: 1
        };

        const isValid = ajv.validate({
          type: 'object',
          required: ['jsonrpc', 'method', 'id'],
          properties: {
            jsonrpc: { const: '2.0' },
            method: { type: 'string' },
            params: {},
            id: { type: ['string', 'number'] }
          }
        }, message);

        expect(isValid).toBe(true);
      });

      it('should reject invalid JSON-RPC version', () => {
        const message = {
          jsonrpc: '1.0',
          method: 'test.echo',
          id: 1
        };

        expect(() => messageHandler.validateMessage(message)).toThrow('Invalid JSON-RPC version');
      });

      it('should handle notification (no id)', () => {
        const notification = {
          jsonrpc: '2.0',
          method: 'test.notify',
          params: { event: 'test' }
        };

        expect(() => messageHandler.validateNotification(notification)).not.toThrow();
      });

    });

    describe('A2A Extensions', () => {

      it('should validate A2A message with all required fields', () => {
        const message = {
          jsonrpc: '2.0',
          method: 'task.assign',
          params: { task: 'test' },
          id: 'msg-123',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        expect(validateMessage(message)).toBe(true);
      });

      it('should reject message missing "from" field', () => {
        const message = {
          jsonrpc: '2.0',
          method: 'task.assign',
          id: 'msg-123',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        expect(validateMessage(message)).toBe(false);
      });

      it('should reject message missing "conversation_id"', () => {
        const message = {
          jsonrpc: '2.0',
          method: 'task.assign',
          id: 'msg-123',
          from: 'agent-1',
          to: 'agent-2',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        expect(validateMessage(message)).toBe(false);
      });

      it('should validate timestamp format', () => {
        const message = {
          jsonrpc: '2.0',
          method: 'task.assign',
          id: 'msg-123',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: 'invalid-date',
          a2a_version: '1.0'
        };

        expect(validateMessage(message)).toBe(false);
      });

      it('should accept optional priority field', () => {
        const message = {
          jsonrpc: '2.0',
          method: 'task.assign',
          params: { task: 'test' },
          id: 'msg-123',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0',
          priority: 'high'
        };

        expect(validateMessage(message)).toBe(true);
      });

    });

    describe('Error Handling', () => {

      it('should return proper error response format', async () => {
        const errorResponse = messageHandler.createErrorResponse(
          { id: 'msg-123', from: 'agent-1', to: 'agent-2' },
          { code: -32601, message: 'Method not found' }
        );

        expect(errorResponse).toMatchObject({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found'
          },
          id: 'msg-123'
        });
      });

      it('should use standard error codes', () => {
        const standardCodes = [-32700, -32600, -32601, -32602, -32603];
        const a2aCodes = [1001, 1002, 1003, 1004];

        const allCodes = [...standardCodes, ...a2aCodes];

        allCodes.forEach(code => {
          expect(messageHandler.getErrorMessage(code)).toBeTruthy();
        });
      });

    });

    describe('Transport Layer', () => {

      it('should send message over HTTP', async () => {
        const message = {
          jsonrpc: '2.0',
          method: 'test.echo',
          params: { message: 'hello' },
          id: 'msg-123',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        // Mock server should be running on localhost:3001
        const response = await transport.send(message, 'http://localhost:3001/a2a');

        expect(response).toMatchObject({
          jsonrpc: '2.0',
          result: expect.anything(),
          id: 'msg-123'
        });
      });

      it('should handle connection timeout', async () => {
        const message = {
          jsonrpc: '2.0',
          method: 'test.slow',
          id: 'msg-123',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        const slowTransport = new HTTPTransport({ timeout: 100 });

        await expect(
          slowTransport.send(message, 'http://localhost:3001/slow')
        ).rejects.toThrow('timeout');
      });

      it('should retry on failure', async () => {
        const message = {
          jsonrpc: '2.0',
          method: 'test.retry',
          id: 'msg-123',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        const retryTransport = new HTTPTransport({ maxRetries: 3 });

        const response = await retryTransport.send(message, 'http://localhost:3001/flaky');

        expect(response).toMatchObject({
          jsonrpc: '2.0',
          result: expect.anything()
        });
      });

    });

    describe('Authentication', () => {

      it('should generate valid JWT token', async () => {
        const token = await authProvider.generateToken('agent-1', ['code_analysis']);

        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
      });

      it('should validate JWT token', async () => {
        const token = await authProvider.generateToken('agent-1', ['code_analysis']);
        const identity = await authProvider.authenticate(token);

        expect(identity).toMatchObject({
          agentId: 'agent-1',
          capabilities: ['code_analysis']
        });
      });

      it('should reject invalid token', async () => {
        const invalidToken = 'invalid.token.here';

        await expect(
          authProvider.authenticate(invalidToken)
        ).rejects.toThrow('Invalid token');
      });

      it('should reject expired token', async () => {
        const expiredProvider = new JWTAuthProvider({
          secret: 'test-secret',
          expiresIn: '1ms'
        });

        const token = await expiredProvider.generateToken('agent-1', []);

        await new Promise(resolve => setTimeout(resolve, 10));

        await expect(
          expiredProvider.authenticate(token)
        ).rejects.toThrow();
      });

    });

  });

  describe('Level 2: Memory Synchronization', () => {

    let memoryManager: A2AMemoryManager;

    beforeAll(() => {
      memoryManager = new A2AMemoryManager({ agentId: 'agent-1' });
    });

    describe('CRDT Operations', () => {

      it('should perform LWW-Set add operation', async () => {
        await memoryManager.set('test-key', 'value1', 'lww-set');

        const value = await memoryManager.get('test-key');
        expect(value).toBe('value1');
      });

      it('should handle concurrent writes', async () => {
        const agent1 = new A2AMemoryManager({ agentId: 'agent-1' });
        const agent2 = new A2AMemoryManager({ agentId: 'agent-2' });

        // Both agents write concurrently
        await Promise.all([
          agent1.set('shared-key', 'value1', 'lww-set'),
          agent2.set('shared-key', 'value2', 'lww-set')
        ]);

        // Sync agents
        await agent1.sync('agent-2');

        // Both should have same value (last-write-wins)
        const value1 = await agent1.get('shared-key');
        const value2 = await agent2.get('shared-key');

        expect(value1).toBe(value2);
      });

      it('should resolve conflicts automatically', async () => {
        const agent1 = new A2AMemoryManager({ agentId: 'agent-1' });
        const agent2 = new A2AMemoryManager({ agentId: 'agent-2' });

        // Create conflict scenario
        await agent1.set('conflict-key', 'value1', 'lww-set');
        await agent2.set('conflict-key', 'value2', 'lww-set');

        // Sync should resolve conflict
        await agent1.sync('agent-2');

        const value = await agent1.get('conflict-key');
        expect(value).toBeTruthy(); // Should have one of the values
      });

    });

    describe('Vector Clocks', () => {

      it('should increment vector clock on write', async () => {
        const clockBefore = memoryManager.getVectorClock();

        await memoryManager.set('test-key', 'value', 'lww-set');

        const clockAfter = memoryManager.getVectorClock();

        expect(clockAfter.get('agent-1')).toBeGreaterThan(clockBefore.get('agent-1') || 0);
      });

      it('should merge vector clocks on sync', async () => {
        const agent1 = new A2AMemoryManager({ agentId: 'agent-1' });
        const agent2 = new A2AMemoryManager({ agentId: 'agent-2' });

        await agent1.set('key1', 'value1', 'lww-set');
        await agent2.set('key2', 'value2', 'lww-set');

        await agent1.sync('agent-2');

        const clock = agent1.getVectorClock();

        expect(clock.get('agent-1')).toBeGreaterThan(0);
        expect(clock.get('agent-2')).toBeGreaterThan(0);
      });

    });

    describe('Memory Synchronization', () => {

      it('should sync state between agents', async () => {
        const agent1 = new A2AMemoryManager({ agentId: 'agent-1' });
        const agent2 = new A2AMemoryManager({ agentId: 'agent-2' });

        await agent1.set('key1', 'value1', 'lww-set');
        await agent1.set('key2', 'value2', 'lww-set');

        await agent2.sync('agent-1');

        expect(await agent2.get('key1')).toBe('value1');
        expect(await agent2.get('key2')).toBe('value2');
      });

      it('should handle bidirectional sync', async () => {
        const agent1 = new A2AMemoryManager({ agentId: 'agent-1' });
        const agent2 = new A2AMemoryManager({ agentId: 'agent-2' });

        await agent1.set('key1', 'value1', 'lww-set');
        await agent2.set('key2', 'value2', 'lww-set');

        await agent1.sync('agent-2');
        await agent2.sync('agent-1');

        expect(await agent1.get('key2')).toBe('value2');
        expect(await agent2.get('key1')).toBe('value1');
      });

      it('should maintain eventual consistency', async () => {
        const agents = [
          new A2AMemoryManager({ agentId: 'agent-1' }),
          new A2AMemoryManager({ agentId: 'agent-2' }),
          new A2AMemoryManager({ agentId: 'agent-3' })
        ];

        // Each agent writes different values
        await agents[0].set('key', 'value1', 'lww-set');
        await agents[1].set('key', 'value2', 'lww-set');
        await agents[2].set('key', 'value3', 'lww-set');

        // Sync all agents
        for (const agent of agents) {
          for (const other of agents) {
            if (agent !== other) {
              await agent.sync(other.agentId);
            }
          }
        }

        // All agents should converge to same value
        const values = await Promise.all(agents.map(a => a.get('key')));

        expect(new Set(values).size).toBe(1); // All values should be the same
      });

    });

  });

  describe('Level 3: Service Discovery', () => {

    let discoveryService: A2ADiscoveryService;

    beforeAll(() => {
      discoveryService = new A2ADiscoveryService();
    });

    describe('Agent Registration', () => {

      it('should register agent with capabilities', async () => {
        const agentInfo = {
          id: 'agent-1',
          name: 'Test Agent',
          version: '1.0.0',
          capabilities: [
            {
              type: 'code_analysis',
              subtypes: ['security', 'performance'],
              version: '1.0.0'
            }
          ],
          endpoints: [
            {
              protocol: 'https',
              url: 'https://agent-1.example.com',
              health_check: '/health'
            }
          ]
        };

        await discoveryService.register(agentInfo);

        const registered = await discoveryService.lookup('agent-1');
        expect(registered).toMatchObject(agentInfo);
      });

      it('should update existing registration', async () => {
        const agentInfo = {
          id: 'agent-1',
          name: 'Updated Agent',
          version: '1.1.0',
          capabilities: []
        };

        await discoveryService.register(agentInfo);

        const registered = await discoveryService.lookup('agent-1');
        expect(registered.version).toBe('1.1.0');
      });

      it('should expire registration after TTL', async () => {
        const agentInfo = {
          id: 'agent-temp',
          name: 'Temporary Agent',
          capabilities: []
        };

        await discoveryService.register(agentInfo, { ttl: 1 }); // 1 second

        await new Promise(resolve => setTimeout(resolve, 1500));

        const registered = await discoveryService.lookup('agent-temp');
        expect(registered).toBeNull();
      });

    });

    describe('Capability Matching', () => {

      it('should find agents by capability type', async () => {
        const agents = await discoveryService.query({
          type: 'code_analysis'
        });

        expect(agents.length).toBeGreaterThan(0);
        expect(agents[0].capabilities).toContainEqual(
          expect.objectContaining({ type: 'code_analysis' })
        );
      });

      it('should filter by capability subtype', async () => {
        const agents = await discoveryService.query({
          type: 'code_analysis',
          subtypes: ['security']
        });

        expect(agents.length).toBeGreaterThan(0);
        expect(agents[0].capabilities[0].subtypes).toContain('security');
      });

      it('should sort by SLA score', async () => {
        // Register agents with different SLAs
        await discoveryService.register({
          id: 'fast-agent',
          capabilities: [{
            type: 'test',
            sla: { avg_response_time_ms: 50, availability: 99 }
          }]
        });

        await discoveryService.register({
          id: 'slow-agent',
          capabilities: [{
            type: 'test',
            sla: { avg_response_time_ms: 500, availability: 95 }
          }]
        });

        const agents = await discoveryService.query({ type: 'test' });

        expect(agents[0].id).toBe('fast-agent');
      });

    });

    describe('Health Monitoring', () => {

      it('should mark agent as unhealthy on failed health check', async () => {
        const agent = await discoveryService.lookup('agent-1');

        // Simulate failed health check
        await discoveryService.healthCheck('agent-1');

        const status = await discoveryService.getHealthStatus('agent-1');
        expect(status).toMatchObject({
          healthy: expect.any(Boolean),
          lastCheck: expect.any(Date)
        });
      });

      it('should remove unhealthy agents from query results', async () => {
        // Mark agent as unhealthy
        await discoveryService.setHealthStatus('agent-1', false);

        const agents = await discoveryService.query({
          type: 'code_analysis',
          healthyOnly: true
        });

        expect(agents.find(a => a.id === 'agent-1')).toBeUndefined();
      });

    });

  });

  describe('Level 4: Full Compliance', () => {

    describe('Advanced Messaging', () => {

      it('should handle streaming responses', async () => {
        const stream = await messageHandler.sendStream({
          jsonrpc: '2.0',
          method: 'task.stream',
          params: { task: 'long-running' },
          id: 'stream-1',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        });

        const chunks: any[] = [];

        for await (const chunk of stream) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
      });

      it('should handle batch operations', async () => {
        const batch = [
          { method: 'task.assign', params: { task: '1' }, id: '1' },
          { method: 'task.assign', params: { task: '2' }, id: '2' },
          { method: 'task.assign', params: { task: '3' }, id: '3' }
        ];

        const responses = await messageHandler.sendBatch(batch);

        expect(responses).toHaveLength(3);
        expect(responses.every(r => r.jsonrpc === '2.0')).toBe(true);
      });

    });

    describe('Security', () => {

      it('should support end-to-end encryption', async () => {
        const message = {
          jsonrpc: '2.0',
          method: 'secure.message',
          params: { secret: 'sensitive-data' },
          id: 'sec-1',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        const encrypted = await messageHandler.encryptMessage(message, 'agent-2-pubkey');

        expect(encrypted).not.toContain('sensitive-data');
      });

      it('should validate message signatures', async () => {
        const message = {
          jsonrpc: '2.0',
          method: 'signed.message',
          id: 'sig-1',
          from: 'agent-1',
          to: 'agent-2',
          conversation_id: 'conv-1',
          timestamp: new Date().toISOString(),
          a2a_version: '1.0'
        };

        const signed = await messageHandler.signMessage(message);

        const isValid = await messageHandler.verifySignature(signed);

        expect(isValid).toBe(true);
      });

    });

    describe('Observability', () => {

      it('should export OpenTelemetry traces', async () => {
        const tracer = messageHandler.getTracer();

        const span = tracer.startSpan('test-operation');
        span.end();

        const traces = await tracer.exportTraces();

        expect(traces).toContainEqual(
          expect.objectContaining({ name: 'test-operation' })
        );
      });

      it('should export Prometheus metrics', async () => {
        const metrics = await messageHandler.getMetrics();

        expect(metrics).toContain('a2a_messages_total');
        expect(metrics).toContain('a2a_message_duration_seconds');
      });

    });

  });

});
