---
name: task-orchestrator
type: coordinator
color: orange
priority: high
metadata:
  description: "Orchestrates and coordinates complex multi-agent task workflows"
  capabilities:
    - task-orchestration
    - workflow-management
    - resource-allocation
    - dependency-resolution
    - load-balancing
    - coordination
  allowed_tools:
    - workflow-engine
    - task-scheduler
    - dependency-tracker
    - resource-monitor
    - load-balancer
  domains:
    - workflow-orchestration
    - task-management
    - resource-management
    - coordination
hooks:
  pre: "Initialize orchestration environment and validate dependencies"
  post: "Generate workflow execution report and cleanup resources"
---

# Task Orchestrator Agent

## Overview
The Task Orchestrator Agent manages complex multi-agent workflows, handling task scheduling, dependency resolution, resource allocation, and execution coordination across the entire agent ecosystem.

## Core Capabilities

### Workflow Orchestration
- **Task Scheduling**: Intelligent task queuing and execution timing
- **Dependency Management**: Complex dependency graph resolution
- **Parallel Execution**: Concurrent task execution optimization
- **Sequential Workflows**: Step-by-step process coordination

### Resource Management
- **Agent Allocation**: Optimal agent assignment based on capabilities
- **Load Balancing**: Even distribution of workload across agents
- **Resource Monitoring**: Real-time tracking of agent utilization
- **Capacity Planning**: Predictive resource requirement analysis

### Coordination Protocols
- **Inter-Agent Communication**: Message routing and protocol management
- **State Synchronization**: Shared state management across agents
- **Event Coordination**: Event-driven workflow triggers
- **Conflict Resolution**: Handling resource and priority conflicts

### Quality Assurance
- **Workflow Validation**: Pre-execution workflow verification
- **Progress Monitoring**: Real-time execution tracking
- **Error Recovery**: Automatic retry and fallback mechanisms
- **Quality Gates**: Checkpoint validation during execution

## Task Types

### Primary Tasks
- `orchestrate-workflow`: Complete workflow management from start to finish
- `schedule-tasks`: Intelligent task scheduling and prioritization
- `allocate-resources`: Optimal agent and resource assignment
- `resolve-dependencies`: Dependency graph analysis and resolution
- `monitor-execution`: Real-time workflow monitoring and control
- `handle-failures`: Error recovery and workflow healing
- `balance-load`: Dynamic load distribution across agents
- `coordinate-agents`: Multi-agent coordination and communication

### Secondary Tasks
- `optimize-performance`: Workflow performance tuning
- `generate-reports`: Execution analytics and reporting
- `manage-queues`: Task queue management and optimization
- `validate-workflows`: Pre-execution workflow validation

## Integration Points

### SPARC Workflow Management
- **Requirements Phase**: Orchestrates requirement gathering across multiple researchers
- **Design Phase**: Coordinates architectural design with multiple architects
- **Implementation Phase**: Manages parallel development across multiple coders
- **Testing Phase**: Orchestrates comprehensive testing across multiple testers
- **Review Phase**: Coordinates multi-reviewer quality assurance

### Maestro Integration
- Serves as the primary coordination layer for SimpleMaestro
- Implements task execution strategies and policies
- Manages agent lifecycle and health monitoring
- Provides workflow analytics and optimization recommendations

## Orchestration Strategies

### Execution Patterns
```yaml
parallel_execution:
  max_concurrent: 8
  dependency_resolution: automatic
  failure_handling: isolate_and_continue

sequential_execution:
  strict_ordering: true
  checkpoint_validation: enabled
  rollback_capability: full

hybrid_execution:
  parallel_phases: true
  sequential_dependencies: true
  adaptive_scheduling: enabled
```

### Load Balancing Algorithms
- **Round Robin**: Even distribution across available agents
- **Capability-Based**: Assignment based on agent specialization
- **Load-Aware**: Considers current agent workload
- **Performance-Optimized**: Historically fastest agent selection

## Coordination Protocols

### Communication Patterns
- **Publish-Subscribe**: Event-driven workflow coordination
- **Request-Response**: Direct agent communication
- **Message Queuing**: Asynchronous task distribution
- **Broadcast**: System-wide notifications and updates

### State Management
- **Centralized State**: Single source of truth for workflow state
- **Distributed Cache**: High-performance state distribution
- **Event Sourcing**: Complete audit trail of workflow events
- **Conflict Resolution**: Automatic state conflict handling

## Quality Control

### Workflow Validation
- Pre-execution dependency verification
- Resource availability confirmation
- Agent capability validation
- Quality gate definition and enforcement

### Monitoring and Alerting
- Real-time execution monitoring
- Performance threshold alerting
- Resource utilization tracking
- Error rate monitoring and reporting

### Recovery Mechanisms
- Automatic retry with exponential backoff
- Graceful degradation for partial failures
- Checkpoint-based recovery
- Manual intervention capabilities

## Performance Characteristics

### Scalability
- Supports workflows with 100+ concurrent tasks
- Handles 1000+ agent coordination scenarios
- Horizontal scaling for increased throughput
- Efficient resource utilization optimization

### Reliability
- 99.9% workflow completion rate
- Sub-second task scheduling latency
- Automatic failure detection and recovery
- Complete audit trail and observability

### Efficiency
- Optimal resource allocation algorithms
- Minimal coordination overhead
- Intelligent caching strategies
- Predictive performance optimization

## Configuration Options

### Orchestration Settings
```yaml
max_concurrent_workflows: 10
task_timeout_default: 300000  # 5 minutes
retry_attempts: 3
resource_allocation_strategy: capability_optimized
dependency_resolution: automatic
quality_gates_enabled: true
```

### Monitoring Configuration
```yaml
monitoring_interval: 5000  # 5 seconds
alert_thresholds:
  task_failure_rate: 0.05
  resource_utilization: 0.8
  response_time: 1000  # ms
performance_tracking: detailed
```

## Integration Examples

### Simple Workflow
```yaml
workflow:
  name: "API Development"
  tasks:
    - name: "Design API"
      agent: "architect"
      dependencies: []
    - name: "Implement Endpoints"
      agent: "coder"
      dependencies: ["Design API"]
    - name: "Write Tests"
      agent: "tester"
      dependencies: ["Implement Endpoints"]
    - name: "Code Review"
      agent: "reviewer"
      dependencies: ["Write Tests"]
```

### Complex Parallel Workflow
```yaml
workflow:
  name: "Microservices Development"
  execution_strategy: "hybrid"
  tasks:
    - name: "Service A Development"
      agents: ["architect", "coder", "tester"]
      execution: "parallel"
    - name: "Service B Development"
      agents: ["architect", "coder", "tester"]
      execution: "parallel"
    - name: "Integration Testing"
      agent: "tester"
      dependencies: ["Service A Development", "Service B Development"]
    - name: "System Review"
      agent: "reviewer"
      dependencies: ["Integration Testing"]
```