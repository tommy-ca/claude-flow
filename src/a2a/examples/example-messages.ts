/**
 * A2A Protocol Example Messages
 * Version: 1.0.0
 *
 * Example messages for common A2A communication scenarios
 */

import {
  MessageEnvelope,
  MessageType,
  MessagePriority,
  AgentState,
  TaskState,
  RegisterMessage,
  RegisterAckMessage,
  CapabilityQueryMessage,
  CapabilityResponseMessage,
  TaskRequestMessage,
  TaskResponseMessage,
  TaskStatusMessage,
  HeartbeatMessage,
  ErrorMessage,
  ErrorType,
  StateSyncMessage,
  EventNotifyMessage
} from '../types/core-messages.js';

import {
  MemoryWriteRequest,
  MemoryReadRequest,
  ConsistencyModel
} from '../types/memory-protocol.js';

import {
  RegistryQueryRequest,
  AgentSelectionRequest,
  LoadBalancingStrategy
} from '../types/service-discovery.js';

// ============================================================================
// Example 1: Agent Registration Flow
// ============================================================================

/**
 * Example: Agent registers with the swarm
 */
export const exampleRegistration: MessageEnvelope<RegisterMessage> = {
  version: '1.0.0',
  type: MessageType.REGISTER,
  messageId: '550e8400-e29b-41d4-a716-446655440001',
  from: {
    agentId: 'agent-coder-001',
    namespace: 'development'
  },
  to: {
    agentId: 'registry-service',
    namespace: 'system'
  },
  priority: MessagePriority.HIGH,
  timestamp: Date.now(),
  payload: {
    agent: {
      agentId: 'agent-coder-001',
      agentType: 'coder',
      name: 'Backend Developer Agent',
      version: '2.0.0',
      description: 'Specialized in backend API development',
      tags: ['backend', 'api', 'nodejs', 'typescript'],
      maxConcurrentTasks: 3,
      maxMemoryMb: 512
    },
    capabilities: [
      {
        name: 'rest-api-development',
        version: '1.0.0',
        description: 'Build RESTful APIs with Express',
        averageLatencyMs: 5000,
        successRate: 0.95,
        tags: ['api', 'rest', 'express']
      },
      {
        name: 'database-schema-design',
        version: '1.0.0',
        description: 'Design PostgreSQL schemas',
        averageLatencyMs: 3000,
        successRate: 0.92,
        tags: ['database', 'postgresql']
      }
    ],
    endpoints: [
      {
        protocol: 'http',
        address: 'localhost',
        port: 8080,
        path: '/api/v1/agent'
      }
    ]
  }
};

/**
 * Example: Registry acknowledges registration
 */
export const exampleRegistrationAck: MessageEnvelope<RegisterAckMessage> = {
  version: '1.0.0',
  type: MessageType.REGISTER_ACK,
  messageId: '550e8400-e29b-41d4-a716-446655440002',
  correlationId: '550e8400-e29b-41d4-a716-446655440001',
  from: {
    agentId: 'registry-service',
    namespace: 'system'
  },
  to: {
    agentId: 'agent-coder-001',
    namespace: 'development'
  },
  priority: MessagePriority.HIGH,
  timestamp: Date.now(),
  payload: {
    agentId: 'agent-coder-001',
    success: true,
    assignedAddress: {
      agentId: 'agent-coder-001',
      swarmId: 'swarm-dev-alpha',
      nodeId: 'node-01',
      namespace: 'development'
    },
    registryEndpoint: 'http://registry:9000/api/v1'
  }
};

// ============================================================================
// Example 2: Capability Discovery
// ============================================================================

/**
 * Example: Query for agents with specific capabilities
 */
export const exampleCapabilityQuery: MessageEnvelope<CapabilityQueryMessage> = {
  version: '1.0.0',
  type: MessageType.CAPABILITY_QUERY,
  messageId: '550e8400-e29b-41d4-a716-446655440003',
  from: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'registry-service',
    namespace: 'system'
  },
  priority: MessagePriority.MEDIUM,
  timestamp: Date.now(),
  payload: {
    requiredCapabilities: ['rest-api-development'],
    tags: ['nodejs'],
    minSuccessRate: 0.90,
    maxLatencyMs: 10000
  }
};

/**
 * Example: Capability query response
 */
export const exampleCapabilityResponse: MessageEnvelope<CapabilityResponseMessage> = {
  version: '1.0.0',
  type: MessageType.CAPABILITY_RESPONSE,
  messageId: '550e8400-e29b-41d4-a716-446655440004',
  correlationId: '550e8400-e29b-41d4-a716-446655440003',
  from: {
    agentId: 'registry-service',
    namespace: 'system'
  },
  to: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  priority: MessagePriority.MEDIUM,
  timestamp: Date.now(),
  payload: {
    agents: [
      {
        agent: {
          agentId: 'agent-coder-001',
          agentType: 'coder',
          name: 'Backend Developer Agent',
          version: '2.0.0',
          tags: ['backend', 'api', 'nodejs']
        },
        capabilities: [
          {
            name: 'rest-api-development',
            version: '1.0.0',
            successRate: 0.95,
            averageLatencyMs: 5000
          }
        ],
        state: AgentState.IDLE,
        currentLoad: 0.0,
        availableSlots: 3,
        lastHeartbeat: Date.now() - 5000
      }
    ],
    totalCount: 1
  }
};

// ============================================================================
// Example 3: Task Request/Response Flow
// ============================================================================

/**
 * Example: Request task execution
 */
export const exampleTaskRequest: MessageEnvelope<TaskRequestMessage> = {
  version: '1.0.0',
  type: MessageType.TASK_REQUEST,
  messageId: '550e8400-e29b-41d4-a716-446655440005',
  from: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  priority: MessagePriority.HIGH,
  timestamp: Date.now(),
  traceId: 'trace-550e8400',
  spanId: 'span-001',
  payload: {
    taskId: 'task-550e8400-001',
    taskType: 'rest-api-development',
    description: 'Create user authentication endpoints',
    requiredCapabilities: ['rest-api-development'],
    priority: MessagePriority.HIGH,
    input: {
      endpoints: [
        { method: 'POST', path: '/auth/register', description: 'User registration' },
        { method: 'POST', path: '/auth/login', description: 'User login' },
        { method: 'POST', path: '/auth/logout', description: 'User logout' }
      ],
      framework: 'express',
      authentication: 'jwt',
      database: 'postgresql'
    },
    context: {
      sessionId: 'session-001',
      workflowId: 'workflow-auth-implementation',
      memoryNamespace: 'swarm/dev-alpha/auth-project'
    },
    timeoutMs: 300000,
    progressCallback: true
  }
};

/**
 * Example: Task status update
 */
export const exampleTaskStatus: MessageEnvelope<TaskStatusMessage> = {
  version: '1.0.0',
  type: MessageType.TASK_STATUS,
  messageId: '550e8400-e29b-41d4-a716-446655440006',
  correlationId: '550e8400-e29b-41d4-a716-446655440005',
  from: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  priority: MessagePriority.MEDIUM,
  timestamp: Date.now(),
  traceId: 'trace-550e8400',
  spanId: 'span-002',
  parentSpanId: 'span-001',
  payload: {
    taskId: 'task-550e8400-001',
    status: TaskState.IN_PROGRESS,
    progress: 0.45,
    message: 'Implementing user registration endpoint',
    estimatedCompletionMs: 150000,
    partialResults: {
      completed: ['POST /auth/register'],
      inProgress: ['POST /auth/login']
    }
  }
};

/**
 * Example: Task completion response
 */
export const exampleTaskResponse: MessageEnvelope<TaskResponseMessage> = {
  version: '1.0.0',
  type: MessageType.TASK_RESPONSE,
  messageId: '550e8400-e29b-41d4-a716-446655440007',
  correlationId: '550e8400-e29b-41d4-a716-446655440005',
  from: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  priority: MessagePriority.HIGH,
  timestamp: Date.now(),
  traceId: 'trace-550e8400',
  spanId: 'span-003',
  parentSpanId: 'span-001',
  payload: {
    taskId: 'task-550e8400-001',
    status: TaskState.COMPLETED,
    output: {
      files: [
        { path: '/src/routes/auth.ts', size: 2048 },
        { path: '/src/middleware/auth.ts', size: 1024 },
        { path: '/tests/auth.test.ts', size: 1536 }
      ],
      endpoints: [
        { method: 'POST', path: '/auth/register', implemented: true },
        { method: 'POST', path: '/auth/login', implemented: true },
        { method: 'POST', path: '/auth/logout', implemented: true }
      ],
      testsCreated: 12,
      testsPassed: 12
    },
    executedBy: 'agent-coder-001',
    startedAt: Date.now() - 280000,
    completedAt: Date.now(),
    durationMs: 280000,
    resourceUsage: {
      cpuMs: 45000,
      memoryBytes: 134217728,
      tokensUsed: 8500
    }
  }
};

// ============================================================================
// Example 4: Memory Operations
// ============================================================================

/**
 * Example: Write to shared memory
 */
export const exampleMemoryWrite: MessageEnvelope<MemoryWriteRequest> = {
  version: '1.0.0',
  type: 'a2a.memory.write' as MessageType,
  messageId: '550e8400-e29b-41d4-a716-446655440008',
  from: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'memory-service',
    namespace: 'system'
  },
  priority: MessagePriority.MEDIUM,
  timestamp: Date.now(),
  payload: {
    namespace: 'swarm/dev-alpha/auth-project',
    key: 'api/auth/schema',
    value: {
      endpoints: ['/auth/register', '/auth/login', '/auth/logout'],
      authentication: 'jwt',
      tokenExpiry: 3600,
      refreshEnabled: true
    },
    ttl: 86400000,
    consistencyModel: ConsistencyModel.STRONG,
    tags: ['api', 'authentication', 'schema']
  }
};

/**
 * Example: Read from shared memory
 */
export const exampleMemoryRead: MessageEnvelope<MemoryReadRequest> = {
  version: '1.0.0',
  type: 'a2a.memory.read' as MessageType,
  messageId: '550e8400-e29b-41d4-a716-446655440009',
  from: {
    agentId: 'agent-tester-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'memory-service',
    namespace: 'system'
  },
  priority: MessagePriority.MEDIUM,
  timestamp: Date.now(),
  payload: {
    namespace: 'swarm/dev-alpha/auth-project',
    key: 'api/auth/schema',
    consistencyModel: ConsistencyModel.CAUSAL
  }
};

// ============================================================================
// Example 5: State Synchronization
// ============================================================================

/**
 * Example: State sync between agents
 */
export const exampleStateSync: MessageEnvelope<StateSyncMessage> = {
  version: '1.0.0',
  type: MessageType.STATE_SYNC,
  messageId: '550e8400-e29b-41d4-a716-44665544000a',
  from: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  priority: MessagePriority.LOW,
  timestamp: Date.now(),
  payload: {
    agentId: 'agent-coder-001',
    namespace: 'agent-state',
    syncType: 'incremental',
    sequenceNumber: 42,
    state: {
      entries: [
        {
          key: 'currentTask',
          value: 'task-550e8400-001',
          version: 1,
          timestamp: Date.now()
        },
        {
          key: 'taskQueue',
          value: ['task-550e8400-002', 'task-550e8400-003'],
          version: 5,
          timestamp: Date.now()
        }
      ]
    },
    vectorClock: {
      'agent-coder-001': 42,
      'agent-coordinator-001': 38
    }
  }
};

// ============================================================================
// Example 6: Event Notification
// ============================================================================

/**
 * Example: Event notification (task completed)
 */
export const exampleEventNotification: MessageEnvelope<EventNotifyMessage> = {
  version: '1.0.0',
  type: MessageType.EVENT_NOTIFY,
  messageId: '550e8400-e29b-41d4-a716-44665544000b',
  from: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: [
    {
      agentId: 'agent-coordinator-001',
      swarmId: 'swarm-dev-alpha'
    },
    {
      agentId: 'event-logger',
      namespace: 'system'
    }
  ],
  priority: MessagePriority.LOW,
  timestamp: Date.now(),
  payload: {
    eventType: 'task.completed',
    eventId: '550e8400-e29b-41d4-a716-44665544000b',
    source: {
      agentId: 'agent-coder-001',
      swarmId: 'swarm-dev-alpha'
    },
    timestamp: Date.now(),
    data: {
      taskId: 'task-550e8400-001',
      taskType: 'rest-api-development',
      duration: 280000,
      success: true
    },
    severity: 'info',
    category: 'task-lifecycle'
  }
};

// ============================================================================
// Example 7: Heartbeat
// ============================================================================

/**
 * Example: Agent heartbeat
 */
export const exampleHeartbeat: MessageEnvelope<HeartbeatMessage> = {
  version: '1.0.0',
  type: MessageType.HEARTBEAT,
  messageId: '550e8400-e29b-41d4-a716-44665544000c',
  from: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'registry-service',
    namespace: 'system'
  },
  priority: MessagePriority.CRITICAL,
  timestamp: Date.now(),
  payload: {
    agentId: 'agent-coder-001',
    state: AgentState.BUSY,
    currentLoad: 0.67,
    activeTasks: 2,
    queuedTasks: 1,
    availableSlots: 1,
    uptime: 3600,
    lastTaskCompletedAt: Date.now() - 10000,
    metrics: {
      cpuUsage: 0.45,
      memoryUsage: 0.62,
      avgResponseTimeMs: 5200,
      p95ResponseTimeMs: 8500,
      p99ResponseTimeMs: 12000,
      successRate: 0.96,
      errorRate: 0.04
    }
  }
};

// ============================================================================
// Example 8: Error Handling
// ============================================================================

/**
 * Example: Error response
 */
export const exampleError: MessageEnvelope<ErrorMessage> = {
  version: '1.0.0',
  type: MessageType.ERROR,
  messageId: '550e8400-e29b-41d4-a716-44665544000d',
  correlationId: '550e8400-e29b-41d4-a716-446655440005',
  from: {
    agentId: 'agent-coder-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  priority: MessagePriority.HIGH,
  timestamp: Date.now(),
  payload: {
    errorCode: 'A2A-T-002',
    errorType: ErrorType.TIMEOUT,
    message: 'Task execution timeout',
    details: {
      code: 'A2A-T-002',
      message: 'Task exceeded maximum execution time of 300000ms',
      field: 'timeoutMs'
    },
    originalMessageId: '550e8400-e29b-41d4-a716-446655440005',
    failedOperation: 'TASK_REQUEST',
    retryable: true,
    retryAfterMs: 60000
  }
};

// ============================================================================
// Example 9: Service Discovery
// ============================================================================

/**
 * Example: Query service registry
 */
export const exampleRegistryQuery: MessageEnvelope<RegistryQueryRequest> = {
  version: '1.0.0',
  type: 'a2a.registry.query' as MessageType,
  messageId: '550e8400-e29b-41d4-a716-44665544000e',
  from: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'registry-service',
    namespace: 'system'
  },
  priority: MessagePriority.MEDIUM,
  timestamp: Date.now(),
  payload: {
    requiredCapabilities: ['rest-api-development'],
    states: [AgentState.IDLE, AgentState.BUSY],
    healthStatuses: ['healthy'],
    minAvailableSlots: 1,
    maxLoad: 0.8,
    maxLatencyMs: 10000,
    minSuccessRate: 0.90,
    limit: 5,
    sortBy: 'currentLoad' as any,
    sortOrder: 'asc'
  }
};

/**
 * Example: Agent selection for load balancing
 */
export const exampleAgentSelection: MessageEnvelope<AgentSelectionRequest> = {
  version: '1.0.0',
  type: 'a2a.agent.select' as MessageType,
  messageId: '550e8400-e29b-41d4-a716-44665544000f',
  from: {
    agentId: 'agent-coordinator-001',
    swarmId: 'swarm-dev-alpha'
  },
  to: {
    agentId: 'load-balancer',
    namespace: 'system'
  },
  priority: MessagePriority.HIGH,
  timestamp: Date.now(),
  payload: {
    requiredCapabilities: ['rest-api-development'],
    estimatedDurationMs: 300000,
    priority: 1,
    strategy: LoadBalancingStrategy.LEAST_LOADED,
    minAvailableSlots: 1,
    maxLoad: 0.7,
    count: 1
  }
};

// ============================================================================
// Export All Examples
// ============================================================================

export const exampleMessages = {
  registration: exampleRegistration,
  registrationAck: exampleRegistrationAck,
  capabilityQuery: exampleCapabilityQuery,
  capabilityResponse: exampleCapabilityResponse,
  taskRequest: exampleTaskRequest,
  taskStatus: exampleTaskStatus,
  taskResponse: exampleTaskResponse,
  memoryWrite: exampleMemoryWrite,
  memoryRead: exampleMemoryRead,
  stateSync: exampleStateSync,
  eventNotification: exampleEventNotification,
  heartbeat: exampleHeartbeat,
  error: exampleError,
  registryQuery: exampleRegistryQuery,
  agentSelection: exampleAgentSelection
};
