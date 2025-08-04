/**
 * Test Setup for Refactoring Validation
 * Configures test environment for comprehensive validation testing
 */

// Set test environment before any imports
process.env.CLAUDE_FLOW_ENV = 'test';
process.env.NODE_ENV = 'test';

// Mock HiveMind components to avoid database dependencies in tests
jest.mock('../../src/hive-mind/core/HiveMind', () => ({
  HiveMind: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue('test-swarm-id'),
    shutdown: jest.fn().mockResolvedValue(undefined),
    getFullStatus: jest.fn().mockResolvedValue({
      name: 'TestSwarm',
      topology: 'hierarchical',
      health: 'healthy',
      uptime: 1000,
      agents: [],
      agentsByType: {},
      warnings: []
    }),
    spawnAgent: jest.fn().mockResolvedValue({
      id: 'test-agent-id',
      name: 'test-agent',
      type: 'analyst',
      capabilities: [],
      status: 'idle'
    }),
    submitTask: jest.fn().mockResolvedValue({
      id: 'test-task-id',
      status: 'pending'
    }),
    getTask: jest.fn().mockResolvedValue({
      id: 'test-task-id',
      result: 'Test result'
    }),
    getAgents: jest.fn().mockResolvedValue([]),
    cancelTask: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  }))
}));

jest.mock('../../src/hive-mind/core/Agent', () => ({
  Agent: jest.fn().mockImplementation(() => ({
    id: 'test-agent-id',
    name: 'test-agent',
    type: 'analyst',
    capabilities: [],
    status: 'idle'
  }))
}));

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('{}'),
    access: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([])
  }
}));

export {};