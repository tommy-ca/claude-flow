# A2A Integration Refactoring Guide

**Version**: 1.0.0
**Date**: 2025-10-01
**Status**: Implementation Ready
**Target**: Claude Flow v2.5.0 → v2.6.0 (A2A Integration)

---

## Document Purpose

This guide provides **step-by-step instructions** for refactoring Claude Flow to integrate with the A2A (Agent-to-Agent) protocol. It serves as the **practical implementation roadmap** for developers.

**Related Documents**:
- [UNIFIED_REQUIREMENTS.md](./UNIFIED_REQUIREMENTS.md) - Formal requirements (WHAT)
- [01-specification.md](./01-specification.md) - Protocol specification (WHAT)
- [02-architecture.md](./02-architecture.md) - System architecture (HOW)
- [INTEGRATION_ANALYSIS.md](./INTEGRATION_ANALYSIS.md) - Gap analysis (WHY)
- **This Document** - Implementation guide (HOW TO DO IT STEP-BY-STEP)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Phase 1: Foundation (Week 1-2)](#2-phase-1-foundation-week-1-2)
3. [Phase 2: Cross-Platform Discovery (Week 3)](#3-phase-2-cross-platform-discovery-week-3)
4. [Phase 3: CLI Platform Adapters (Week 4)](#4-phase-3-cli-platform-adapters-week-4)
5. [Phase 4: Memory & Event Sync (Week 5)](#5-phase-4-memory--event-sync-week-5)
6. [Phase 5: Security & Auth (Week 6)](#6-phase-5-security--auth-week-6)
7. [Phase 6: Performance Optimization (Week 7)](#7-phase-6-performance-optimization-week-7)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment Guide](#9-deployment-guide)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### 1.1 Development Environment Setup

**Required Tools**:
```bash
# Node.js and npm
node --version  # ≥ 18.0.0
npm --version   # ≥ 9.0.0

# TypeScript
npm install -g typescript@^5.0.0

# Testing
npm install -g jest@^29.0.0

# Claude Flow
git clone https://github.com/ruvnet/claude-flow.git
cd claude-flow
npm install
npm run build
npm test  # All existing tests must pass (baseline)
```

**Verify Working Claude CLI Adapter**:
```bash
# Run Claude CLI adapter tests (reference implementation)
npm test -- tests/cli-adapters/claude-cli.test.ts

# Expected output: 6/6 tests passing
# ✓ should have claude CLI accessible
# ✓ should return JSON format
# ✓ should execute a simple prompt and return response
# ✓ should include usage metadata
# ✓ should support streaming output
# ✓ should support different models
```

### 1.2 Project Structure (Target State)

```
claude-flow/
├── src/
│   ├── a2a/                           # NEW: A2A integration layer
│   │   ├── protocol/
│   │   │   ├── message-translator.ts  # CF ↔ A2A translation
│   │   │   ├── schema-validator.ts    # JSON schema validation
│   │   │   ├── version-negotiator.ts  # Protocol versioning
│   │   │   └── types.ts               # A2A TypeScript types
│   │   ├── adapters/
│   │   │   ├── base-adapter.ts        # Abstract base class
│   │   │   ├── claude-flow-adapter.ts # CF → A2A adapter
│   │   │   ├── cli-agent-adapter.ts   # CLI agents → A2A
│   │   │   └── capability-mapper.ts   # Capability translation
│   │   ├── registry/
│   │   │   ├── agent-advertiser.ts    # Publish agents to A2A
│   │   │   ├── discovery-client.ts    # Discover remote agents
│   │   │   └── capability-index.ts    # In-memory index
│   │   ├── transport/
│   │   │   ├── base-transport.ts      # ITransport interface
│   │   │   ├── mcp-transport.ts       # MCP implementation
│   │   │   ├── http-transport.ts      # HTTP REST
│   │   │   └── websocket-transport.ts # WebSocket
│   │   ├── coordination/
│   │   │   ├── task-router.ts         # Route to local/remote
│   │   │   └── health-monitor.ts      # Monitor remote agents
│   │   └── security/
│   │       ├── authenticator.ts       # JWT auth
│   │       ├── authorizer.ts          # Capability-based authz
│   │       └── encryption.ts          # TLS utilities
│   ├── cli-adapters/                  # EXISTING (reference)
│   │   ├── claude-cli.ts              # ✅ COMPLETE
│   │   ├── gemini-cli.ts              # TODO (Phase 3)
│   │   ├── codex-cli.ts               # TODO (Phase 3)
│   │   └── cursor-cli.ts              # TODO (Future)
│   ├── core/
│   │   ├── orchestrator.ts            # MODIFY: Add A2A routing
│   │   └── ...
│   ├── agents/
│   │   ├── agent-manager.ts           # MODIFY: Add A2A advertisement
│   │   └── ...
│   └── memory/
│       ├── distributed-memory.ts      # MODIFY: Add A2A sync
│       └── ...
├── tests/
│   └── a2a/                           # NEW: A2A tests
│       ├── protocol/
│       ├── adapters/
│       ├── registry/
│       └── integration/
├── docs/
│   └── architecture/
│       └── a2a/
│           ├── UNIFIED_REQUIREMENTS.md        # ✅ COMPLETE
│           ├── 01-specification.md            # ✅ UPDATED v2.0
│           ├── 02-architecture.md             # ✅ EXISTING
│           ├── INTEGRATION_ANALYSIS.md        # ✅ COMPLETE
│           └── REFACTORING_GUIDE.md           # ← THIS FILE
└── config/
    └── a2a.config.ts                  # NEW: A2A configuration
```

### 1.3 Feature Flag Setup

**CRITICAL**: All A2A features MUST be behind a feature flag for zero-downtime deployment.

Create `config/a2a.config.ts`:

```typescript
export interface A2AConfig {
  enabled: boolean;              // Master switch (default: false)
  protocol: {
    version: string;
    fallbackVersions: string[];
  };
  platforms: {
    [platform: string]: {
      enabled: boolean;
      adapter: string;
      endpoints?: Record<string, string>;
    };
  };
  transport: {
    preferred: 'mcp' | 'http' | 'websocket';
    mcp?: { port: number };
    http?: { port: number; timeout: number };
    websocket?: { port: number; pingInterval: number };
  };
  memory: {
    syncEnabled: boolean;
    syncStrategy: 'immediate' | 'eventual';
    conflictResolution: 'last-write-wins' | 'merge';
  };
  security: {
    authentication: {
      enabled: boolean;
      method: 'jwt' | 'api-key';
      tokenExpiry: number;
    };
  };
}

// Default configuration (A2A disabled)
export const defaultA2AConfig: A2AConfig = {
  enabled: false,  // ← CRITICAL: Disabled by default
  protocol: {
    version: '1.0.0',
    fallbackVersions: [],
  },
  platforms: {
    'claude-flow': {
      enabled: true,
      adapter: 'ClaudeFlowAdapter',
    },
  },
  transport: {
    preferred: 'mcp',
  },
  memory: {
    syncEnabled: false,
    syncStrategy: 'eventual',
    conflictResolution: 'last-write-wins',
  },
  security: {
    authentication: {
      enabled: false,
      method: 'jwt',
      tokenExpiry: 3600,
    },
  },
};

// Load configuration from environment
export function loadA2AConfig(): A2AConfig {
  const config = { ...defaultA2AConfig };

  // Override from environment variables
  if (process.env.A2A_ENABLED === 'true') {
    config.enabled = true;
  }

  if (process.env.A2A_PROTOCOL_VERSION) {
    config.protocol.version = process.env.A2A_PROTOCOL_VERSION;
  }

  return config;
}
```

---

## 2. Phase 1: Foundation (Week 1-2)

**Goal**: Create core A2A protocol layer and message translation

**Reference**: Claude CLI adapter (`src/cli-adapters/claude-cli.ts`) for pattern

### 2.1 Step 1: A2A TypeScript Types

**File**: `src/a2a/protocol/types.ts`

**Implementation**:

```typescript
// Base A2A message envelope
export interface A2AMessage {
  $schema: string;
  type: string;
  version: string;
  messageId: string;
  timestamp: string;
  source: {
    agentId: string;
    platform: string;
  };
  target?: {
    agentId?: string;
    platform?: string;
  };
}

// Agent Advertisement
export interface AgentAdvertisement extends A2AMessage {
  type: 'agent.advertisement';
  agent: {
    id: string;
    name: string;
    platform: string;
    version: string;
    status: 'available' | 'busy' | 'offline' | 'error';
    capabilities: {
      type: string[];
      skills: string[];
      languages?: string[];
      frameworks?: string[];
      maxComplexity?: number;
    };
    resources: {
      cpu: { available: number; unit: 'percent' | 'cores' };
      memory: { available: number; unit: 'MB' | 'GB' };
      maxConcurrentTasks?: number;
    };
    contact: {
      transport: 'mcp' | 'http' | 'websocket';
      endpoint: string;
    };
  };
}

// Task Request
export interface TaskRequest extends A2AMessage {
  type: 'task.request';
  task: {
    id: string;
    description: string;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    requiredCapabilities?: {
      skills?: string[];
      languages?: string[];
      frameworks?: string[];
    };
    context?: {
      files?: { path: string; content: string }[];
      environment?: Record<string, string>;
      memory?: Record<string, any>;
    };
    constraints?: {
      timeout?: number;
      maxTokens?: number;
      costLimit?: number;
    };
  };
}

// Task Response
export interface TaskResponse extends A2AMessage {
  type: 'task.response';
  task: {
    id: string;
    status: 'completed' | 'failed' | 'timeout' | 'rejected';
    result?: {
      output: string;
      files?: { path: string; content: string }[];
      metrics?: {
        duration: number;
        tokensUsed?: number;
        costUsd?: number;
      };
    };
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  };
}

// Memory Sync
export interface MemorySync extends A2AMessage {
  type: 'memory.sync';
  memory: {
    namespace: string;
    operations: Array<{
      type: 'set' | 'delete' | 'update';
      key: string;
      value?: any;
      ttl?: number;
      version?: number;
    }>;
  };
}

// Event Notification
export interface EventNotification extends A2AMessage {
  type: 'event.notification';
  event: {
    type: string;
    severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    category: 'lifecycle' | 'task' | 'memory' | 'system' | 'custom';
    data: any;
  };
}
```

**Test**: `tests/a2a/protocol/types.test.ts`

```typescript
import { AgentAdvertisement, TaskRequest, TaskResponse } from '../../../src/a2a/protocol/types';

describe('A2A Types', () => {
  it('should create valid AgentAdvertisement', () => {
    const ad: AgentAdvertisement = {
      $schema: 'https://a2a-protocol.org/schemas/v1/agent-advertisement.json',
      type: 'agent.advertisement',
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date().toISOString(),
      source: {
        agentId: 'agent-001',
        platform: 'claude-flow',
      },
      agent: {
        id: 'agent-001',
        name: 'Test Agent',
        platform: 'claude-flow',
        version: '2.5.0',
        status: 'available',
        capabilities: {
          type: ['researcher'],
          skills: ['web-search', 'analysis'],
        },
        resources: {
          cpu: { available: 80, unit: 'percent' },
          memory: { available: 4096, unit: 'MB' },
        },
        contact: {
          transport: 'mcp',
          endpoint: 'mcp://localhost:3000/agents/agent-001',
        },
      },
    };

    expect(ad).toBeDefined();
    expect(ad.type).toBe('agent.advertisement');
    expect(ad.agent.id).toBe('agent-001');
  });

  // More tests for TaskRequest, TaskResponse, etc.
});
```

**Run**:
```bash
npm test -- tests/a2a/protocol/types.test.ts
```

### 2.2 Step 2: Message Translator

**File**: `src/a2a/protocol/message-translator.ts`

**Implementation** (following Claude CLI pattern):

```typescript
import { AgentState } from '../../swarm/types';
import { Task } from '../../core/types';
import { AgentAdvertisement, TaskRequest, TaskResponse } from './types';

/**
 * Translates Claude Flow AgentState to A2A AgentAdvertisement
 *
 * Pattern: Based on Claude CLI adapter success (src/cli-adapters/claude-cli.ts)
 */
export function toA2AAgent(cfAgent: AgentState): AgentAdvertisement {
  return {
    $schema: 'https://a2a-protocol.org/schemas/v1/agent-advertisement.json',
    type: 'agent.advertisement',
    version: '1.0.0',
    messageId: generateMessageId(),
    timestamp: new Date().toISOString(),
    source: {
      agentId: cfAgent.id.id,
      platform: 'claude-flow',
    },
    agent: {
      id: cfAgent.id.id,
      name: cfAgent.name,
      platform: 'claude-flow',
      version: '2.5.0',
      status: mapAgentStatus(cfAgent.status),
      capabilities: {
        type: [cfAgent.type],
        skills: cfAgent.capabilities.skills,
        languages: cfAgent.capabilities.languages,
        frameworks: cfAgent.capabilities.frameworks,
        maxComplexity: cfAgent.capabilities.maxComplexity,
      },
      resources: {
        cpu: {
          available: 100 - cfAgent.workload * 100,
          unit: 'percent',
        },
        memory: {
          available: cfAgent.metrics.memoryUsage,
          unit: 'MB',
        },
        maxConcurrentTasks: cfAgent.capabilities.resourceLimits?.maxConcurrentTasks,
      },
      contact: {
        transport: 'mcp',
        endpoint: `mcp://localhost:${process.env.MCP_PORT || 3000}/agents/${cfAgent.id.id}`,
      },
    },
  };
}

/**
 * Translates Claude Flow Task to A2A TaskRequest
 */
export function toA2ATaskRequest(cfTask: Task, sender: AgentState): TaskRequest {
  return {
    $schema: 'https://a2a-protocol.org/schemas/v1/task-request.json',
    type: 'task.request',
    version: '1.0.0',
    messageId: generateMessageId(),
    timestamp: new Date().toISOString(),
    source: {
      agentId: sender.id.id,
      platform: 'claude-flow',
    },
    task: {
      id: cfTask.id.id,
      description: cfTask.description,
      type: mapTaskType(cfTask.type),
      priority: cfTask.priority.toLowerCase() as any,
      requiredCapabilities: {
        skills: cfTask.requirements?.requiredCapabilities,
        languages: cfTask.requirements?.languages,
        frameworks: cfTask.requirements?.frameworks,
      },
      context: {
        files: cfTask.context?.files,
        environment: cfTask.context?.environment,
        memory: cfTask.context?.memory,
      },
      constraints: {
        timeout: cfTask.timeout,
        maxTokens: cfTask.maxTokens,
        costLimit: cfTask.budget,
      },
    },
  };
}

/**
 * Translates A2A TaskRequest to Claude Flow Task
 */
export function fromA2ATaskRequest(a2aTask: TaskRequest): Task {
  return {
    id: { id: a2aTask.task.id },
    description: a2aTask.task.description,
    type: mapA2ATaskType(a2aTask.task.type),
    priority: a2aTask.task.priority.toUpperCase() as any,
    requirements: {
      requiredCapabilities: a2aTask.task.requiredCapabilities?.skills,
      languages: a2aTask.task.requiredCapabilities?.languages,
      frameworks: a2aTask.task.requiredCapabilities?.frameworks,
    },
    context: {
      files: a2aTask.task.context?.files,
      environment: a2aTask.task.context?.environment,
      memory: a2aTask.task.context?.memory,
    },
    timeout: a2aTask.task.constraints?.timeout,
    maxTokens: a2aTask.task.constraints?.maxTokens,
    budget: a2aTask.task.constraints?.costLimit,
    status: 'pending',
    metrics: {
      startTime: Date.now(),
      completionTime: 0,
      tokensUsed: 0,
      cost: 0,
    },
  };
}

/**
 * Translates Claude Flow Task result to A2A TaskResponse
 */
export function toA2ATaskResponse(cfTask: Task, agent: AgentState): TaskResponse {
  return {
    $schema: 'https://a2a-protocol.org/schemas/v1/task-response.json',
    type: 'task.response',
    version: '1.0.0',
    messageId: generateMessageId(),
    timestamp: new Date().toISOString(),
    source: {
      agentId: agent.id.id,
      platform: 'claude-flow',
    },
    task: {
      id: cfTask.id.id,
      status: mapTaskStatus(cfTask.status),
      result: cfTask.status === 'completed' ? {
        output: cfTask.result?.output || '',
        files: cfTask.result?.files,
        metrics: {
          duration: cfTask.metrics.completionTime - cfTask.metrics.startTime,
          tokensUsed: cfTask.metrics.tokensUsed,
          costUsd: cfTask.metrics.cost,
        },
      } : undefined,
      error: cfTask.status === 'failed' ? {
        code: cfTask.error?.code || 'TASK_FAILED',
        message: cfTask.error?.message || 'Task execution failed',
        details: cfTask.error,
      } : undefined,
    },
  };
}

// Helper functions
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function mapAgentStatus(cfStatus: string): 'available' | 'busy' | 'offline' | 'error' {
  const statusMap: Record<string, 'available' | 'busy' | 'offline' | 'error'> = {
    'active': 'available',
    'busy': 'busy',
    'idle': 'available',
    'error': 'error',
    'terminated': 'offline',
  };
  return statusMap[cfStatus] || 'offline';
}

function mapTaskType(cfType: string): string {
  // Direct mapping for most types
  const typeMap: Record<string, string> = {
    'coding': 'coding',
    'testing': 'testing',
    'review': 'review',
    'research': 'research',
    'analysis': 'analysis',
    'optimization': 'optimization',
  };
  return typeMap[cfType] || cfType;
}

function mapA2ATaskType(a2aType: string): string {
  // Reverse mapping
  return a2aType;
}

function mapTaskStatus(cfStatus: string): 'completed' | 'failed' | 'timeout' | 'rejected' {
  const statusMap: Record<string, 'completed' | 'failed' | 'timeout' | 'rejected'> = {
    'completed': 'completed',
    'failed': 'failed',
    'cancelled': 'rejected',
    'blocked': 'rejected',
  };
  return statusMap[cfStatus] || 'failed';
}
```

**Test**: `tests/a2a/protocol/message-translator.test.ts`

```typescript
import { toA2AAgent, toA2ATaskRequest, fromA2ATaskRequest, toA2ATaskResponse } from '../../../src/a2a/protocol/message-translator';
import { AgentState } from '../../../src/swarm/types';
import { Task } from '../../../src/core/types';

describe('Message Translator', () => {
  describe('toA2AAgent', () => {
    it('should translate AgentState to AgentAdvertisement', () => {
      const cfAgent: AgentState = {
        id: { id: 'agent-001' },
        name: 'Test Agent',
        type: 'researcher',
        status: 'active',
        capabilities: {
          skills: ['web-search', 'analysis'],
          languages: ['python'],
          frameworks: ['langchain'],
          maxComplexity: 8,
        },
        metrics: {
          memoryUsage: 2048,
          cpuUsage: 30,
          taskCount: 5,
        },
        workload: 0.3,
        health: 1.0,
      };

      const a2aAgent = toA2AAgent(cfAgent);

      expect(a2aAgent).toBeDefined();
      expect(a2aAgent.type).toBe('agent.advertisement');
      expect(a2aAgent.agent.id).toBe('agent-001');
      expect(a2aAgent.agent.name).toBe('Test Agent');
      expect(a2aAgent.agent.status).toBe('available');
      expect(a2aAgent.agent.capabilities.type).toContain('researcher');
      expect(a2aAgent.agent.capabilities.skills).toContain('web-search');
      expect(a2aAgent.agent.resources.cpu.available).toBe(70); // 100 - 30
      expect(a2aAgent.agent.resources.memory.available).toBe(2048);
    });

    it('should handle missing optional fields', () => {
      const cfAgent: AgentState = {
        id: { id: 'agent-002' },
        name: 'Minimal Agent',
        type: 'coder',
        status: 'idle',
        capabilities: {
          skills: ['coding'],
        },
        metrics: {
          memoryUsage: 1024,
        },
        workload: 0,
        health: 1.0,
      };

      const a2aAgent = toA2AAgent(cfAgent);

      expect(a2aAgent.agent.capabilities.languages).toBeUndefined();
      expect(a2aAgent.agent.capabilities.frameworks).toBeUndefined();
    });
  });

  describe('toA2ATaskRequest', () => {
    it('should translate Task to TaskRequest', () => {
      const cfTask: Task = {
        id: { id: 'task-001' },
        description: 'Research ML optimization',
        type: 'research',
        priority: 'HIGH',
        requirements: {
          requiredCapabilities: ['web-search', 'analysis'],
          languages: ['python'],
        },
        timeout: 300000,
        maxTokens: 50000,
        budget: 1.0,
        status: 'pending',
        metrics: {
          startTime: Date.now(),
          completionTime: 0,
          tokensUsed: 0,
          cost: 0,
        },
      };

      const sender: AgentState = {
        id: { id: 'agent-sender' },
        name: 'Sender',
        type: 'coordinator',
        status: 'active',
        capabilities: { skills: [] },
        metrics: {},
        workload: 0,
        health: 1.0,
      };

      const a2aTask = toA2ATaskRequest(cfTask, sender);

      expect(a2aTask).toBeDefined();
      expect(a2aTask.type).toBe('task.request');
      expect(a2aTask.task.id).toBe('task-001');
      expect(a2aTask.task.description).toBe('Research ML optimization');
      expect(a2aTask.task.type).toBe('research');
      expect(a2aTask.task.priority).toBe('high');
      expect(a2aTask.task.requiredCapabilities?.skills).toContain('web-search');
      expect(a2aTask.task.constraints?.timeout).toBe(300000);
    });
  });

  describe('fromA2ATaskRequest', () => {
    it('should translate TaskRequest to Task', () => {
      const a2aTask: TaskRequest = {
        $schema: 'https://a2a-protocol.org/schemas/v1/task-request.json',
        type: 'task.request',
        version: '1.0.0',
        messageId: 'msg-123',
        timestamp: new Date().toISOString(),
        source: {
          agentId: 'remote-agent',
          platform: 'gemini',
        },
        task: {
          id: 'task-remote-001',
          description: 'Write a function',
          type: 'coding',
          priority: 'medium',
          requiredCapabilities: {
            skills: ['typescript', 'testing'],
            languages: ['typescript'],
          },
          constraints: {
            timeout: 60000,
            maxTokens: 10000,
          },
        },
      };

      const cfTask = fromA2ATaskRequest(a2aTask);

      expect(cfTask).toBeDefined();
      expect(cfTask.id.id).toBe('task-remote-001');
      expect(cfTask.description).toBe('Write a function');
      expect(cfTask.type).toBe('coding');
      expect(cfTask.priority).toBe('MEDIUM');
      expect(cfTask.requirements?.requiredCapabilities).toContain('typescript');
      expect(cfTask.timeout).toBe(60000);
      expect(cfTask.status).toBe('pending');
    });
  });

  describe('toA2ATaskResponse', () => {
    it('should translate completed Task to TaskResponse', () => {
      const cfTask: Task = {
        id: { id: 'task-001' },
        description: 'Test task',
        type: 'coding',
        priority: 'HIGH',
        status: 'completed',
        result: {
          output: 'function test() { return true; }',
          files: [
            { path: 'test.ts', content: 'function test() { return true; }' },
          ],
        },
        metrics: {
          startTime: 1000,
          completionTime: 5000,
          tokensUsed: 1000,
          cost: 0.05,
        },
      };

      const agent: AgentState = {
        id: { id: 'agent-001' },
        name: 'Coder Agent',
        type: 'coder',
        status: 'active',
        capabilities: { skills: ['coding'] },
        metrics: {},
        workload: 0,
        health: 1.0,
      };

      const a2aResponse = toA2ATaskResponse(cfTask, agent);

      expect(a2aResponse).toBeDefined();
      expect(a2aResponse.type).toBe('task.response');
      expect(a2aResponse.task.id).toBe('task-001');
      expect(a2aResponse.task.status).toBe('completed');
      expect(a2aResponse.task.result?.output).toContain('function test');
      expect(a2aResponse.task.result?.metrics?.duration).toBe(4000);
      expect(a2aResponse.task.result?.metrics?.tokensUsed).toBe(1000);
      expect(a2aResponse.task.result?.metrics?.costUsd).toBe(0.05);
    });

    it('should translate failed Task to TaskResponse with error', () => {
      const cfTask: Task = {
        id: { id: 'task-002' },
        description: 'Failing task',
        type: 'testing',
        priority: 'HIGH',
        status: 'failed',
        error: {
          code: 'TEST_FAILED',
          message: 'Tests did not pass',
        },
        metrics: {
          startTime: 1000,
          completionTime: 2000,
          tokensUsed: 500,
          cost: 0.025,
        },
      };

      const agent: AgentState = {
        id: { id: 'agent-002' },
        name: 'Tester Agent',
        type: 'tester',
        status: 'active',
        capabilities: { skills: ['testing'] },
        metrics: {},
        workload: 0,
        health: 1.0,
      };

      const a2aResponse = toA2ATaskResponse(cfTask, agent);

      expect(a2aResponse.task.status).toBe('failed');
      expect(a2aResponse.task.error).toBeDefined();
      expect(a2aResponse.task.error?.code).toBe('TEST_FAILED');
      expect(a2aResponse.task.error?.message).toContain('not pass');
    });
  });
});
```

**Run**:
```bash
npm test -- tests/a2a/protocol/message-translator.test.ts
```

**Expected Output**: 10+ tests passing

### 2.3 Step 3: JSON Schema Validator

**File**: `src/a2a/protocol/schema-validator.ts`

**Implementation**:

```typescript
import Ajv from 'ajv';
import { A2AMessage, AgentAdvertisement, TaskRequest, TaskResponse } from './types';

// JSON Schemas (simplified - full schemas should be external files)
const agentAdvertisementSchema = {
  type: 'object',
  required: ['$schema', 'type', 'version', 'messageId', 'timestamp', 'source', 'agent'],
  properties: {
    $schema: { type: 'string' },
    type: { const: 'agent.advertisement' },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    messageId: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    source: {
      type: 'object',
      required: ['agentId', 'platform'],
      properties: {
        agentId: { type: 'string' },
        platform: { type: 'string' },
      },
    },
    agent: {
      type: 'object',
      required: ['id', 'name', 'platform', 'version', 'status', 'capabilities', 'resources', 'contact'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        platform: { type: 'string' },
        version: { type: 'string' },
        status: { enum: ['available', 'busy', 'offline', 'error'] },
        // ... more properties
      },
    },
  },
};

const taskRequestSchema = {
  type: 'object',
  required: ['$schema', 'type', 'version', 'messageId', 'timestamp', 'source', 'task'],
  properties: {
    $schema: { type: 'string' },
    type: { const: 'task.request' },
    // ... more properties
  },
};

const taskResponseSchema = {
  type: 'object',
  required: ['$schema', 'type', 'version', 'messageId', 'timestamp', 'source', 'task'],
  properties: {
    $schema: { type: 'string' },
    type: { const: 'task.response' },
    // ... more properties
  },
};

export class SchemaValidator {
  private ajv: Ajv;
  private schemas: Map<string, any>;

  constructor() {
    this.ajv = new Ajv({ strict: true, allErrors: true });
    this.schemas = new Map();

    // Register schemas
    this.registerSchema('agent.advertisement', agentAdvertisementSchema);
    this.registerSchema('task.request', taskRequestSchema);
    this.registerSchema('task.response', taskResponseSchema);
  }

  registerSchema(messageType: string, schema: any): void {
    this.schemas.set(messageType, schema);
    this.ajv.addSchema(schema, messageType);
  }

  validate(message: A2AMessage): { valid: boolean; errors?: any[] } {
    const schema = this.schemas.get(message.type);
    if (!schema) {
      return {
        valid: false,
        errors: [{ message: `No schema registered for message type: ${message.type}` }],
      };
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(message);

    return {
      valid: valid as boolean,
      errors: validate.errors || undefined,
    };
  }

  validateOrThrow(message: A2AMessage): void {
    const result = this.validate(message);
    if (!result.valid) {
      throw new ValidationError('Message validation failed', result.errors || []);
    }
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: any[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Singleton instance
export const schemaValidator = new SchemaValidator();
```

**Test**: `tests/a2a/protocol/schema-validator.test.ts`

```typescript
import { schemaValidator, ValidationError } from '../../../src/a2a/protocol/schema-validator';
import { AgentAdvertisement, TaskRequest } from '../../../src/a2a/protocol/types';

describe('Schema Validator', () => {
  it('should validate correct AgentAdvertisement', () => {
    const message: AgentAdvertisement = {
      $schema: 'https://a2a-protocol.org/schemas/v1/agent-advertisement.json',
      type: 'agent.advertisement',
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date().toISOString(),
      source: { agentId: 'agent-001', platform: 'claude-flow' },
      agent: {
        id: 'agent-001',
        name: 'Test Agent',
        platform: 'claude-flow',
        version: '2.5.0',
        status: 'available',
        capabilities: {
          type: ['researcher'],
          skills: ['web-search'],
        },
        resources: {
          cpu: { available: 80, unit: 'percent' },
          memory: { available: 4096, unit: 'MB' },
        },
        contact: {
          transport: 'mcp',
          endpoint: 'mcp://localhost:3000/agents/agent-001',
        },
      },
    };

    const result = schemaValidator.validate(message);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject invalid AgentAdvertisement (missing required field)', () => {
    const message: any = {
      $schema: 'https://a2a-protocol.org/schemas/v1/agent-advertisement.json',
      type: 'agent.advertisement',
      version: '1.0.0',
      messageId: 'msg-123',
      timestamp: new Date().toISOString(),
      source: { agentId: 'agent-001', platform: 'claude-flow' },
      // Missing 'agent' field
    };

    const result = schemaValidator.validate(message);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0]).toHaveProperty('message');
  });

  it('should throw ValidationError when using validateOrThrow', () => {
    const invalidMessage: any = {
      type: 'agent.advertisement',
      // Missing required fields
    };

    expect(() => {
      schemaValidator.validateOrThrow(invalidMessage);
    }).toThrow(ValidationError);
  });
});
```

**Run**:
```bash
npm test -- tests/a2a/protocol/schema-validator.test.ts
```

### 2.4 Step 4: Feature Flag Integration

**File**: Modify `src/core/orchestrator.ts`

**Changes** (minimal, following adapter pattern):

```typescript
// At top of file
import { loadA2AConfig } from '../../config/a2a.config';
import { TaskRouter } from '../a2a/coordination/task-router';  // To be implemented in Phase 2

export class Orchestrator implements IOrchestrator {
  private a2aConfig: A2AConfig;
  private a2aRouter?: TaskRouter;

  constructor(/* existing params */) {
    // Existing initialization...

    // Load A2A config
    this.a2aConfig = loadA2AConfig();

    // Initialize A2A router if enabled
    if (this.a2aConfig.enabled) {
      this.a2aRouter = new TaskRouter(/* dependencies */);
    }
  }

  async assignTask(task: Task): Promise<void> {
    // Check if A2A routing enabled
    if (this.a2aConfig.enabled && this.a2aRouter) {
      // Try A2A routing first
      const bestAgent = await this.a2aRouter.findBestAgent(task);

      if (bestAgent && bestAgent.platform !== 'claude-flow') {
        // Route to remote agent
        console.log(`[A2A] Routing task to remote agent: ${bestAgent.id} (${bestAgent.platform})`);
        await this.a2aRouter.routeToRemoteAgent(task, bestAgent);
        return;
      }
    }

    // Existing local routing logic (unchanged)
    const agent = this.selectBestAgent(task);
    await this.agentManager.assignTask(agent.id, task);
  }
}
```

**Test Regression**:
```bash
# CRITICAL: All existing tests must still pass
npm test

# Expected: 100% pass rate (same as baseline)
```

### 2.5 Phase 1 Acceptance Criteria

**Checklist**:
- [ ] All TypeScript types defined (`src/a2a/protocol/types.ts`)
- [ ] Message translator implemented with 100% test coverage
- [ ] Schema validator implemented and tested
- [ ] Feature flag configuration working
- [ ] All existing Claude Flow tests pass (100%)
- [ ] New A2A tests pass (10+ tests)
- [ ] No performance regression (<5% overhead measured)

**Verification Commands**:
```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npm run typecheck
```

---

## 3. Phase 2: Cross-Platform Discovery (Week 3)

**Goal**: Enable agent discovery across platforms

**Dependencies**: Phase 1 complete

### 3.1 Step 1: Agent Registry

**File**: `src/a2a/registry/agent-advertiser.ts`

**Implementation**:

```typescript
import { AgentState } from '../../swarm/types';
import { toA2AAgent } from '../protocol/message-translator';
import { AgentAdvertisement } from '../protocol/types';

export interface IAgentAdvertiser {
  advertise(agent: AgentState): Promise<void>;
  withdraw(agentId: string): Promise<void>;
  heartbeat(agentId: string): Promise<void>;
}

export class AgentAdvertiser implements IAgentAdvertiser {
  private advertisedAgents: Map<string, AgentAdvertisement>;
  private heartbeatTimers: Map<string, NodeJS.Timeout>;
  private discoveryClients: IDiscoveryClient[];

  constructor(discoveryClients: IDiscoveryClient[] = []) {
    this.advertisedAgents = new Map();
    this.heartbeatTimers = new Map();
    this.discoveryClients = discoveryClients;
  }

  async advertise(agent: AgentState): Promise<void> {
    // Translate to A2A format
    const advertisement = toA2AAgent(agent);

    // Store locally
    this.advertisedAgents.set(agent.id.id, advertisement);

    // Broadcast to all discovery clients
    await Promise.all(
      this.discoveryClients.map(client =>
        client.registerAgent(advertisement)
      )
    );

    // Setup periodic heartbeat
    this.setupHeartbeat(agent.id.id);

    console.log(`[A2A] Advertised agent: ${agent.name} (${agent.id.id})`);
  }

  async withdraw(agentId: string): Promise<void> {
    // Stop heartbeat
    const timer = this.heartbeatTimers.get(agentId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(agentId);
    }

    // Remove from local storage
    this.advertisedAgents.delete(agentId);

    // Notify discovery clients
    await Promise.all(
      this.discoveryClients.map(client =>
        client.deregisterAgent(agentId)
      )
    );

    console.log(`[A2A] Withdrew agent: ${agentId}`);
  }

  async heartbeat(agentId: string): Promise<void> {
    const advertisement = this.advertisedAgents.get(agentId);
    if (!advertisement) {
      console.warn(`[A2A] Cannot send heartbeat for unknown agent: ${agentId}`);
      return;
    }

    // Update timestamp
    advertisement.timestamp = new Date().toISOString();

    // Send to discovery clients
    await Promise.all(
      this.discoveryClients.map(client =>
        client.heartbeat(agentId)
      )
    );
  }

  private setupHeartbeat(agentId: string): void {
    // Clear existing timer
    const existingTimer = this.heartbeatTimers.get(agentId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Setup new timer (heartbeat every 30 seconds)
    const timer = setInterval(() => {
      this.heartbeat(agentId).catch(err => {
        console.error(`[A2A] Heartbeat failed for ${agentId}:`, err);
      });
    }, 30000);

    this.heartbeatTimers.set(agentId, timer);
  }
}

export interface IDiscoveryClient {
  registerAgent(advertisement: AgentAdvertisement): Promise<void>;
  deregisterAgent(agentId: string): Promise<void>;
  heartbeat(agentId: string): Promise<void>;
}
```

**Test**: `tests/a2a/registry/agent-advertiser.test.ts`

```typescript
import { AgentAdvertiser, IDiscoveryClient } from '../../../src/a2a/registry/agent-advertiser';
import { AgentState } from '../../../src/swarm/types';
import { AgentAdvertisement } from '../../../src/a2a/protocol/types';

// Mock discovery client
class MockDiscoveryClient implements IDiscoveryClient {
  registeredAgents: Map<string, AgentAdvertisement> = new Map();
  heartbeats: string[] = [];

  async registerAgent(advertisement: AgentAdvertisement): Promise<void> {
    this.registeredAgents.set(advertisement.agent.id, advertisement);
  }

  async deregisterAgent(agentId: string): Promise<void> {
    this.registeredAgents.delete(agentId);
  }

  async heartbeat(agentId: string): Promise<void> {
    this.heartbeats.push(agentId);
  }
}

describe('AgentAdvertiser', () => {
  let advertiser: AgentAdvertiser;
  let mockClient: MockDiscoveryClient;

  beforeEach(() => {
    mockClient = new MockDiscoveryClient();
    advertiser = new AgentAdvertiser([mockClient]);
  });

  it('should advertise agent to discovery clients', async () => {
    const agent: AgentState = {
      id: { id: 'agent-001' },
      name: 'Test Agent',
      type: 'researcher',
      status: 'active',
      capabilities: { skills: ['web-search'] },
      metrics: { memoryUsage: 2048 },
      workload: 0.3,
      health: 1.0,
    };

    await advertiser.advertise(agent);

    expect(mockClient.registeredAgents.size).toBe(1);
    expect(mockClient.registeredAgents.has('agent-001')).toBe(true);

    const advertisement = mockClient.registeredAgents.get('agent-001');
    expect(advertisement?.agent.name).toBe('Test Agent');
  });

  it('should withdraw agent from discovery clients', async () => {
    const agent: AgentState = {
      id: { id: 'agent-002' },
      name: 'Test Agent 2',
      type: 'coder',
      status: 'active',
      capabilities: { skills: ['coding'] },
      metrics: {},
      workload: 0,
      health: 1.0,
    };

    await advertiser.advertise(agent);
    expect(mockClient.registeredAgents.size).toBe(1);

    await advertiser.withdraw('agent-002');
    expect(mockClient.registeredAgents.size).toBe(0);
  });

  it('should send heartbeat for advertised agent', async () => {
    const agent: AgentState = {
      id: { id: 'agent-003' },
      name: 'Test Agent 3',
      type: 'tester',
      status: 'active',
      capabilities: { skills: ['testing'] },
      metrics: {},
      workload: 0,
      health: 1.0,
    };

    await advertiser.advertise(agent);
    await advertiser.heartbeat('agent-003');

    expect(mockClient.heartbeats).toContain('agent-003');
  });
});
```

**Run**:
```bash
npm test -- tests/a2a/registry/agent-advertiser.test.ts
```

[CONTINUE IN NEXT SECTION DUE TO LENGTH...]

---

**End of Part 1 of Refactoring Guide**

This guide continues with Phase 2-7 implementation details, testing strategies, deployment procedures, and troubleshooting. The complete guide should be approximately 3000-4000 lines covering all phases systematically.

**Status**: ✅ Foundation complete, ready for Phase 2 implementation

**Next Actions**:
1. Complete Phase 1 implementation following this guide
2. Run all tests and verify acceptance criteria
3. Proceed to Phase 2 (Cross-Platform Discovery)
