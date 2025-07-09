# Resource Manager Architecture

The Resource Manager is a comprehensive system for intelligent resource allocation, monitoring, and agent deployment in the claude-flow ecosystem. It provides automated resource management, pressure detection, and optimization capabilities for multi-agent systems.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Resource Manager                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    Monitor      │  │   Allocator     │  │ Pressure Detector│  │
│  │                 │  │                 │  │                 │  │
│  │ • System Metrics│  │ • Resource Pool │  │ • Trend Analysis│  │
│  │ • Process Metrics│  │ • Allocation    │  │ • Anomaly Detect│  │
│  │ • Alerts        │  │ • Optimization  │  │ • Predictions   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                Agent Managers                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │   Agent 1   │  │   Agent 2   │  │   Agent N   │        │  │
│  │  │ • Resource  │  │ • Resource  │  │ • Resource  │        │  │
│  │  │   Requests  │  │   Requests  │  │   Requests  │        │  │
│  │  │ • Auto-Scale│  │ • Auto-Scale│  │ • Auto-Scale│        │  │
│  │  │ • Health    │  │ • Health    │  │ • Health    │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                Integration Layer                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │     MCP     │  │    Swarm    │  │ Claude Flow │        │  │
│  │  │ Integration │  │ Integration │  │ Integration │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Resource Monitor (`monitors/`)

- **System Monitoring**: CPU, memory, disk, network usage
- **Process Monitoring**: Per-process resource consumption
- **Alert System**: Threshold-based notifications
- **Historical Data**: Time-series resource metrics
- **Export Support**: JSON, CSV, Prometheus formats

### 2. Resource Allocator (`allocators/`)

- **Allocation Strategies**: Priority, fair-share, best-fit, ML-optimized
- **Resource Pool Management**: Available resource tracking
- **Optimization**: Automatic resource rebalancing
- **Sharing Policies**: Exclusive, shared, preemptible resources
- **Persistence**: State export/import capabilities

### 3. Pressure Detector (`monitors/`)

- **Pressure Levels**: Normal, moderate, high, critical
- **Trend Analysis**: Resource usage patterns
- **Predictive Analytics**: Future resource needs
- **Anomaly Detection**: Unusual usage patterns
- **Response Actions**: Automated remediation

### 4. Agent Resource Manager (`agents/`)

- **Per-Agent Resources**: Isolated resource management
- **Auto-Scaling**: Dynamic resource adjustment
- **Health Monitoring**: Agent-specific health checks
- **QoS Classes**: Guaranteed, burstable, best-effort
- **Performance Objectives**: SLA compliance tracking

## Directory Structure

```
src/resource-manager/
├── types/                    # TypeScript interfaces
│   ├── metrics.ts           # Resource metrics types
│   ├── monitor.ts           # Monitor interfaces
│   ├── allocator.ts         # Allocator interfaces
│   ├── agent.ts             # Agent management types
│   ├── pressure.ts          # Pressure detection types
│   ├── integration.ts       # External integrations
│   ├── factory.ts           # Factory patterns
│   └── index.ts             # Main exports
├── core/                    # Core implementations
│   └── resource-manager.ts  # Main manager class
├── monitors/                # Monitoring implementations
│   ├── system-monitor.ts    # System resource monitor
│   ├── process-monitor.ts   # Process-specific monitor
│   └── composite-monitor.ts # Combined monitoring
├── allocators/              # Allocation strategies
│   ├── priority-allocator.ts    # Priority-based allocation
│   ├── fair-share-allocator.ts  # Fair share allocation
│   ├── best-fit-allocator.ts    # Best fit allocation
│   └── ml-allocator.ts          # ML-optimized allocation
├── agents/                  # Agent resource management
│   ├── agent-manager.ts     # Per-agent resource manager
│   ├── auto-scaler.ts       # Auto-scaling logic
│   └── health-checker.ts    # Health monitoring
├── utils/                   # Utility functions
│   ├── resource-utils.ts    # Resource calculations
│   ├── metrics-utils.ts     # Metrics processing
│   └── validation.ts        # Input validation
└── factory/                 # Component factories
    ├── resource-manager-factory.ts  # Main factory
    └── integration-factory.ts       # Integration factory
```

## Key Features

### 1. Intelligent Resource Allocation

- **Multiple Strategies**: Priority, fair-share, best-fit, ML-optimized
- **Over-provisioning**: Configurable over-allocation for peak loads
- **Resource Sharing**: Efficient resource utilization across agents
- **Predictive Allocation**: Future resource needs prediction

### 2. Comprehensive Monitoring

- **System Metrics**: CPU, memory, disk, network monitoring
- **Process Tracking**: Per-process resource consumption
- **Real-time Alerts**: Threshold-based notifications
- **Historical Analysis**: Time-series data storage and analysis

### 3. Pressure Detection & Response

- **Multi-level Pressure**: Normal, moderate, high, critical levels
- **Trend Analysis**: Resource usage pattern recognition
- **Anomaly Detection**: Statistical and ML-based anomaly detection
- **Automated Response**: Configurable response actions

### 4. Agent-Specific Management

- **Resource Isolation**: Per-agent resource boundaries
- **Auto-scaling**: Dynamic resource adjustment based on load
- **Health Monitoring**: Agent-specific health checks
- **Performance Tracking**: SLA compliance monitoring

### 5. Integration Support

- **MCP Integration**: Model Control Protocol support
- **Swarm Coordination**: Multi-node resource coordination
- **Claude Flow**: Native integration with flow engine
- **Extensible**: Plugin architecture for custom integrations

## Usage Examples

### Basic Setup

```typescript
import { ResourceManagerFactory } from './factory/resource-manager-factory';

const factory = new ResourceManagerFactory();
const resourceManager = factory.createResourceManager(
  // Monitor config
  {
    interval: 5000,
    enabled: true,
    thresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90,
      networkUtilization: 75
    }
  },
  // Allocator config
  {
    strategy: 'priority',
    maxCpuCores: 8,
    maxMemory: 16 * 1024 * 1024 * 1024,
    allowSharing: true
  },
  // Pressure detector config
  {
    enabled: true,
    interval: 10000,
    prediction: {
      enabled: true,
      horizon: 300000,
      model: 'linear'
    }
  }
);

await resourceManager.start();
```

### Agent Management

```typescript
// Create agent resource manager
const agentManager = resourceManager.createAgentManager({
  agentId: 'agent-001',
  agentType: 'worker',
  limits: {
    maxCpuCores: 2,
    maxMemory: 4 * 1024 * 1024 * 1024,
    maxDiskSpace: 10 * 1024 * 1024 * 1024,
    maxNetworkBandwidth: 100 * 1024 * 1024
  },
  requests: {
    cpuCores: 1,
    memory: 2 * 1024 * 1024 * 1024,
    diskSpace: 5 * 1024 * 1024 * 1024,
    networkBandwidth: 50 * 1024 * 1024
  },
  qosClass: 'guaranteed',
  autoScaling: {
    enabled: true,
    minResources: { cpuCores: 0.5, memory: 1024 * 1024 * 1024 },
    maxResources: { cpuCores: 2, memory: 4 * 1024 * 1024 * 1024 },
    scaleUpThreshold: 80,
    scaleDownThreshold: 30
  }
});

// Request resources
const allocation = await agentManager.requestResources();
```

### Monitoring & Alerts

```typescript
// Subscribe to pressure changes
resourceManager.pressureDetector.subscribe(status => {
  console.log(`Pressure level: ${status.level}`);
  if (status.level === 'critical') {
    // Take action
  }
});

// Subscribe to alerts
resourceManager.monitor.subscribeToAlerts(alert => {
  console.log(`Alert: ${alert.message}`);
  // Handle alert
});

// Get health report
const healthReport = await resourceManager.getHealthReport();
console.log(`System health: ${healthReport.overallHealth}`);
```

## Configuration

### Resource Thresholds

```typescript
const thresholds = {
  cpuUsage: 80, // CPU usage threshold (%)
  memoryUsage: 85, // Memory usage threshold (%)
  diskUsage: 90, // Disk usage threshold (%)
  networkUtilization: 75 // Network utilization threshold (%)
};
```

### Allocation Strategies

- **Priority**: Allocate based on request priority
- **Fair Share**: Distribute resources evenly
- **Best Fit**: Minimize resource fragmentation
- **ML Optimized**: Machine learning-based allocation

### QoS Classes

- **Guaranteed**: Reserved resources, never preempted
- **Burstable**: Can burst beyond requests up to limits
- **Best Effort**: No guarantees, can be preempted

## Integration Points

### MCP Integration

- Resource metrics reporting to MCP servers
- Command handling for resource operations
- Alert forwarding to MCP clients

### Swarm Coordination

- Multi-node resource coordination
- Distributed resource allocation
- Topology-aware resource management

### Claude Flow Integration

- Flow-aware resource allocation
- Flow-specific resource monitoring
- Dynamic scaling based on flow demands

## Performance Considerations

### Monitoring Frequency

- **System Metrics**: 5-10 seconds for responsive monitoring
- **Process Metrics**: 10-30 seconds for detailed tracking
- **Pressure Detection**: 10-60 seconds for trend analysis

### Memory Usage

- **Metric History**: Configurable retention period
- **Alert History**: Limited to recent alerts
- **Allocation State**: Minimal memory footprint

### CPU Overhead

- **Monitoring**: <1% CPU overhead for system monitoring
- **Allocation**: O(n) complexity for most strategies
- **Pressure Detection**: Minimal impact with efficient algorithms

## Security Considerations

### Resource Isolation

- Agent resource boundaries enforced
- No cross-agent resource access
- Secure resource allocation tracking

### Access Control

- Role-based access to resource operations
- Audit logging for resource changes
- Secure communication with integrations

### Data Protection

- Encrypted metric storage options
- Secure export/import capabilities
- Privacy-aware process monitoring

## Future Enhancements

### Machine Learning

- **Predictive Scaling**: ML-based resource prediction
- **Anomaly Detection**: Advanced anomaly detection
- **Optimization**: AI-powered resource optimization

### Advanced Monitoring

- **Distributed Tracing**: Cross-service resource tracking
- **Custom Metrics**: User-defined resource metrics
- **Advanced Visualizations**: Real-time dashboards

### Integration Expansion

- **Cloud Providers**: AWS, Azure, GCP integration
- **Container Orchestration**: Kubernetes integration
- **Monitoring Systems**: Prometheus, Grafana integration

## Contributing

1. **Architecture**: Follow the established patterns
2. **Types**: Add proper TypeScript interfaces
3. **Testing**: Include unit and integration tests
4. **Documentation**: Update README and inline docs
5. **Performance**: Consider resource overhead

## License

This resource manager is part of the claude-flow project and follows the same licensing terms.
