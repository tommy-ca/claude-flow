/**
 * Mock Adapter for Testing
 * Provides a configurable mock implementation for testing adapter integrations
 */

import {
  BaseAgentAdapter,
  A2AMessage,
  A2AResponse,
  StreamChunk,
  AgentCapabilities,
  AgentCapability,
  OperationType,
  AgentConfig,
  AdapterError,
  ErrorCategory
} from '../base-adapter';

// ============================================================================
// Mock Adapter Configuration
// ============================================================================

export interface MockAdapterConfig extends AgentConfig {
  type: 'mock';
  delay?: number;
  failureRate?: number;
  capabilities?: AgentCapability[];
  operations?: OperationType[];
}

interface MockResponse {
  pattern?: RegExp | string;
  response: A2AResponse;
  delay?: number;
}

interface MockError {
  pattern?: RegExp | string;
  error: AdapterError;
  delay?: number;
}

// ============================================================================
// Mock Adapter Implementation
// ============================================================================

export class MockAdapter extends BaseAgentAdapter {
  private delay: number = 0;
  private failureRate: number = 0;
  private mockResponses: MockResponse[] = [];
  private mockErrors: MockError[] = [];
  private capabilities: AgentCapability[] = [];
  private operations: OperationType[] = [];
  private callHistory: Array<{ message: A2AMessage; timestamp: number }> = [];

  // ========================================
  // Lifecycle
  // ========================================

  protected async doInitialize(): Promise<void> {
    const config = this.config as MockAdapterConfig;

    this.delay = config.delay || 0;
    this.failureRate = config.failureRate || 0;

    this.capabilities = config.capabilities || [
      AgentCapability.CODE_GENERATION,
      AgentCapability.CODE_EDITING,
      AgentCapability.CHAT_INTERFACE
    ];

    this.operations = config.operations || [
      'code.generate',
      'code.edit',
      'chat.send'
    ];
  }

  protected async doShutdown(): Promise<void> {
    this.mockResponses = [];
    this.mockErrors = [];
    this.callHistory = [];
  }

  protected async doHealthCheck(): Promise<boolean> {
    return true;
  }

  // ========================================
  // Capabilities
  // ========================================

  getCapabilities(): AgentCapabilities {
    return {
      supported: this.capabilities,
      operations: this.operations,
      limitations: {},
      metadata: {
        version: '1.0.0-mock',
        provider: 'mock'
      }
    };
  }

  // ========================================
  // Request Execution
  // ========================================

  protected async executeRequest(nativeRequest: any, message: A2AMessage): Promise<any> {
    // Record call
    this.callHistory.push({
      message,
      timestamp: Date.now()
    });

    // Simulate delay
    if (this.delay > 0) {
      await this.sleep(this.delay);
    }

    // Simulate random failures
    if (Math.random() < this.failureRate) {
      throw new AdapterError(
        'MOCK-ERR-001',
        'Simulated random failure',
        ErrorCategory.SYSTEM,
        true
      );
    }

    // Check for matching error pattern
    const matchedError = this.findMatchingError(message);
    if (matchedError) {
      if (matchedError.delay) {
        await this.sleep(matchedError.delay);
      }
      throw matchedError.error;
    }

    // Check for matching response pattern
    const matchedResponse = this.findMatchingResponse(message);
    if (matchedResponse) {
      if (matchedResponse.delay) {
        await this.sleep(matchedResponse.delay);
      }
      return matchedResponse.response;
    }

    // Default response
    return this.createDefaultResponse(message);
  }

  protected async *executeStreamRequest(
    nativeRequest: any,
    message: A2AMessage
  ): AsyncIterator<StreamChunk> {
    // Record call
    this.callHistory.push({
      message,
      timestamp: Date.now()
    });

    const response = await this.executeRequest(nativeRequest, message);

    // Simulate streaming by chunking the response
    const content = response.payload?.content || 'Mock streamed response';
    const chunkSize = 10;

    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);

      if (this.delay > 0) {
        await this.sleep(this.delay / 10);
      }

      yield {
        id: message.id,
        type: 'delta',
        data: { content: chunk }
      };
    }

    yield {
      id: message.id,
      type: 'complete',
      data: null
    };
  }

  // ========================================
  // Protocol Translation
  // ========================================

  translateRequest(a2aMsg: A2AMessage): any {
    return {
      mockRequest: true,
      originalMessage: a2aMsg
    };
  }

  translateResponse(nativeResp: any, requestId: string): A2AResponse {
    if (nativeResp.id) {
      // Already an A2AResponse
      return nativeResp;
    }

    return {
      id: `mock_${Date.now()}`,
      messageId: requestId,
      status: 'success',
      payload: nativeResp,
      metadata: {
        timestamp: Date.now(),
        duration: this.delay
      }
    };
  }

  // ========================================
  // Mock Configuration Methods
  // ========================================

  setResponse(response: A2AResponse, pattern?: RegExp | string, delay?: number): void {
    this.mockResponses.push({
      pattern,
      response,
      delay
    });
  }

  setError(error: AdapterError, pattern?: RegExp | string, delay?: number): void {
    this.mockErrors.push({
      pattern,
      error,
      delay
    });
  }

  clearResponses(): void {
    this.mockResponses = [];
  }

  clearErrors(): void {
    this.mockErrors = [];
  }

  setDelay(delay: number): void {
    this.delay = delay;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  addCapability(capability: AgentCapability): void {
    if (!this.capabilities.includes(capability)) {
      this.capabilities.push(capability);
    }
  }

  removeCapability(capability: AgentCapability): void {
    this.capabilities = this.capabilities.filter(c => c !== capability);
  }

  addOperation(operation: OperationType): void {
    if (!this.operations.includes(operation)) {
      this.operations.push(operation);
    }
  }

  removeOperation(operation: OperationType): void {
    this.operations = this.operations.filter(o => o !== operation);
  }

  // ========================================
  // Testing Utilities
  // ========================================

  getCallHistory(): Array<{ message: A2AMessage; timestamp: number }> {
    return [...this.callHistory];
  }

  getCallCount(): number {
    return this.callHistory.length;
  }

  getLastCall(): { message: A2AMessage; timestamp: number } | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  clearCallHistory(): void {
    this.callHistory = [];
  }

  wasCalledWith(predicate: (message: A2AMessage) => boolean): boolean {
    return this.callHistory.some(call => predicate(call.message));
  }

  getCallsMatching(predicate: (message: A2AMessage) => boolean): A2AMessage[] {
    return this.callHistory
      .filter(call => predicate(call.message))
      .map(call => call.message);
  }

  // ========================================
  // Helper Methods
  // ========================================

  private findMatchingResponse(message: A2AMessage): MockResponse | undefined {
    return this.mockResponses.find(mock => {
      if (!mock.pattern) return false;

      const searchStr = JSON.stringify(message);

      if (typeof mock.pattern === 'string') {
        return searchStr.includes(mock.pattern);
      }

      return mock.pattern.test(searchStr);
    });
  }

  private findMatchingError(message: A2AMessage): MockError | undefined {
    return this.mockErrors.find(mock => {
      if (!mock.pattern) return false;

      const searchStr = JSON.stringify(message);

      if (typeof mock.pattern === 'string') {
        return searchStr.includes(mock.pattern);
      }

      return mock.pattern.test(searchStr);
    });
  }

  private createDefaultResponse(message: A2AMessage): A2AResponse {
    return {
      id: `mock_${Date.now()}`,
      messageId: message.id,
      status: 'success',
      payload: {
        content: `Mock response for operation: ${message.operation}`,
        operation: message.operation,
        mockData: true
      },
      metadata: {
        timestamp: Date.now(),
        duration: this.delay
      }
    };
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

export function createMockAdapter(config: Partial<MockAdapterConfig> = {}): MockAdapter {
  return new MockAdapter();
}

export async function createInitializedMock(
  config: Partial<MockAdapterConfig> = {}
): Promise<MockAdapter> {
  const adapter = new MockAdapter();
  await adapter.initialize({
    type: 'mock',
    name: 'test-mock',
    ...config
  });
  return adapter;
}

export function createMockResponse(
  overrides: Partial<A2AResponse> = {}
): A2AResponse {
  return {
    id: `mock_${Date.now()}`,
    messageId: 'test',
    status: 'success',
    payload: {
      content: 'Mock response content'
    },
    metadata: {
      timestamp: Date.now(),
      duration: 0
    },
    ...overrides
  };
}

export function createMockMessage(
  overrides: Partial<A2AMessage> = {}
): A2AMessage {
  return {
    id: `msg_${Date.now()}`,
    type: 'request',
    operation: 'code.generate',
    payload: {
      prompt: 'Test prompt'
    },
    metadata: {
      timestamp: Date.now(),
      source: 'test'
    },
    ...overrides
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export class MockAdapterAssertions {
  constructor(private adapter: MockAdapter) {}

  assertCalled(): void {
    if (this.adapter.getCallCount() === 0) {
      throw new Error('Expected adapter to be called but it was not');
    }
  }

  assertNotCalled(): void {
    if (this.adapter.getCallCount() > 0) {
      throw new Error('Expected adapter not to be called but it was');
    }
  }

  assertCalledTimes(expected: number): void {
    const actual = this.adapter.getCallCount();
    if (actual !== expected) {
      throw new Error(`Expected ${expected} calls but got ${actual}`);
    }
  }

  assertCalledWith(predicate: (message: A2AMessage) => boolean): void {
    if (!this.adapter.wasCalledWith(predicate)) {
      throw new Error('Expected adapter to be called with matching message');
    }
  }

  assertLastCallOperation(operation: OperationType): void {
    const lastCall = this.adapter.getLastCall();
    if (!lastCall) {
      throw new Error('No calls made to adapter');
    }
    if (lastCall.message.operation !== operation) {
      throw new Error(
        `Expected last call operation to be ${operation} but was ${lastCall.message.operation}`
      );
    }
  }

  assertCallOrder(operations: OperationType[]): void {
    const history = this.adapter.getCallHistory();
    const actualOps = history.map(call => call.message.operation);

    if (actualOps.length !== operations.length) {
      throw new Error('Call count does not match expected operations');
    }

    for (let i = 0; i < operations.length; i++) {
      if (actualOps[i] !== operations[i]) {
        throw new Error(
          `Expected operation ${operations[i]} at position ${i} but got ${actualOps[i]}`
        );
      }
    }
  }
}

export function assertMock(adapter: MockAdapter): MockAdapterAssertions {
  return new MockAdapterAssertions(adapter);
}
