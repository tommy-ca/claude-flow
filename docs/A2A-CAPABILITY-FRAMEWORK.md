# A2A Capability Framework

An intelligent agent capability framework for Agent-to-Agent (A2A) protocol integration with automatic capability detection, semantic matching, protocol translation, and performance-based learning.

## Overview

The A2A Capability Framework enables seamless integration between different agent platforms by providing:

1. **Automatic Capability Detection** - Discover and introspect agent capabilities
2. **Semantic Matching** - Find optimal agents using natural language and embeddings
3. **Protocol Translation** - Translate between different agent platforms automatically
4. **Performance Learning** - Learn and optimize agent selection based on execution history

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  A2A Capability Framework                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Capability      │  │   Semantic       │                │
│  │  Detection       │  │   Matching       │                │
│  │                  │  │                  │                │
│  │ • Auto-discovery │  │ • Embeddings     │                │
│  │ • Introspection  │  │ • Cosine sim     │                │
│  │ • Version check  │  │ • Tag matching   │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Protocol        │  │  Performance     │                │
│  │  Translation     │  │  Learning        │                │
│  │                  │  │                  │                │
│  │ • Gap detection  │  │ • Track metrics  │                │
│  │ • Polyfilling    │  │ • Route optim    │                │
│  │ • Degradation    │  │ • Adaptation     │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Capability Detection

Auto-discover agent capabilities through multiple methods:

- **Manifest Parsing** - Read agent capability manifests
- **Runtime Probing** - Active/passive capability testing
- **Platform Introspection** - Platform-specific capability detection
- **Version Compatibility** - Automatic compatibility matrix generation

### 2. Semantic Matching

Find the right agent for the job using:

- **Embedding-based Search** - Semantic similarity using vector embeddings
- **Multi-criteria Matching** - Category, tags, performance, reliability
- **Confidence Scoring** - Transparent match quality scores
- **Task-to-Capability Mapping** - Automatic task decomposition

### 3. Protocol Translation

Seamless cross-platform integration:

- **Feature Gap Detection** - Identify missing platform features
- **Automatic Polyfilling** - Fill feature gaps when possible
- **Graceful Degradation** - Fallback strategies for incompatibilities
- **Protocol Normalization** - Standardized capability interfaces

### 4. Performance Learning

Intelligent routing based on history:

- **Performance Tracking** - Monitor latency, success rate, throughput
- **Pattern Learning** - Learn optimal agent selection patterns
- **Explore/Exploit Balance** - Try new agents while using proven ones
- **Adaptive Routing** - Route to best-performing agents

## Usage

### Basic Setup

```typescript
import { A2ACapabilityFramework } from './src/a2a';

// Initialize framework
const framework = new A2ACapabilityFramework({
  enableAutoDiscovery: true,
  discoveryInterval: 60000,
  enableRuntimeProbing: true
});

// Discover agents
await framework.initialize([
  'http://localhost:3000/agents',
  'http://localhost:3001/agents'
]);
```

### Register Custom Agent

```typescript
import { AgentManifest, AgentPlatform, CapabilityCategory } from './src/a2a';

const manifest: AgentManifest = {
  agentId: 'my-agent',
  name: 'My Custom Agent',
  platform: AgentPlatform.CLAUDE_FLOW,
  capabilities: [
    {
      id: 'my-capability',
      name: 'code_generation',
      description: 'Generate TypeScript code',
      category: CapabilityCategory.GENERATION,
      tags: ['typescript', 'code'],
      // ... more fields
    }
  ]
};

await framework.registerAgent(manifest);
```

### Find Capabilities

```typescript
// Semantic search
const matches = await framework.findCapabilities({
  description: 'Generate REST API with authentication',
  minReliability: 0.9,
  maxLatency: 500
});

// Category search
const analysisCapabilities = await framework.findCapabilities({
  category: CapabilityCategory.ANALYSIS,
  tags: ['code', 'quality']
});
```

### Select Optimal Agent

```typescript
const match = await framework.selectOptimalCapability(
  'Analyze code quality and suggest improvements'
);

if (match) {
  console.log(`Selected: ${match.capability.name}`);
  console.log(`Confidence: ${match.score}`);
  console.log(`Platform: ${match.capability.provider.platform}`);
}
```

### Execute Capability

```typescript
const result = await framework.executeCapability(
  'my-capability-id',
  {
    specification: 'Create a user authentication API',
    language: 'typescript'
  }
);

console.log('Result:', result);

// Check performance
const stats = framework.getCapabilityStats('my-capability-id');
console.log(`Success rate: ${stats.successRate}`);
console.log(`Avg latency: ${stats.averageLatency}ms`);
```

### Performance-Based Routing

```typescript
// Execute multiple times to build history
for (let i = 0; i < 10; i++) {
  const match = await framework.selectOptimalCapability('Generate Python code');
  await framework.executeCapability(match.capability.id, { task: `Task ${i}` });
}

// Compare capabilities based on performance
const comparison = await framework.compareCapabilities(
  'Generate Python code'
);

comparison.forEach(comp => {
  console.log(`${comp.capability.name}: ${comp.recommendationScore}`);
});
```

### Cross-Platform Adaptation

```typescript
// Detect feature gaps
const gaps = framework.detectFeatureGaps(
  'claude-flow-capability',
  AgentPlatform.OPENAI_SWARM
);

gaps.forEach(gap => {
  console.log(`Gap: ${gap.feature} (${gap.severity})`);
  if (gap.polyfillAvailable) {
    console.log('  ✓ Polyfill available');
  }
});

// Create adaptation strategy
const strategies = framework.createAdaptationStrategy(
  'claude-flow-capability',
  AgentPlatform.LANGCHAIN
);
```

## Capability Schema

### Core Types

```typescript
interface Capability {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  tags: string[];
  version: CapabilityVersion;
  io: CapabilityIO;
  reliability: number;
  metrics?: PerformanceMetrics;
  provider: {
    agentId: string;
    platform: AgentPlatform;
  };
}

interface CapabilityQuery {
  description?: string;
  category?: CapabilityCategory;
  tags?: string[];
  minReliability?: number;
  maxLatency?: number;
  requiredPlatforms?: AgentPlatform[];
}

interface CapabilityMatch {
  capability: Capability;
  score: number;
  matchReasons: MatchReason[];
  adaptationRequired: boolean;
  estimatedPerformance?: PerformanceMetrics;
}
```

### Supported Platforms

- `CLAUDE_FLOW` - Claude Flow native
- `OPENAI_SWARM` - OpenAI Swarm
- `AUTOGEN` - Microsoft AutoGen
- `LANGCHAIN` - LangChain
- `CREWAI` - CrewAI
- `SEMANTIC_KERNEL` - Semantic Kernel
- `HAYSTACK` - Haystack
- `CUSTOM` - Custom platforms

### Capability Categories

- `COMPUTATION` - Computational tasks
- `DATA_PROCESSING` - Data transformation
- `COMMUNICATION` - Inter-agent communication
- `COORDINATION` - Multi-agent coordination
- `LEARNING` - ML and pattern learning
- `SEARCH` - Information retrieval
- `GENERATION` - Content generation
- `ANALYSIS` - Analysis and evaluation
- `TRANSFORMATION` - Data transformation
- `VALIDATION` - Validation and verification
- `MONITORING` - Monitoring and observability
- `SECURITY` - Security operations

## Integration with Claude Flow

The A2A framework integrates seamlessly with Claude Flow's existing infrastructure:

### Neural Integration

```typescript
// Uses claude-flow's neural models for embeddings
const embedding = await neuralService.generateEmbedding(description);

// Performance prediction using neural networks
const prediction = await neuralService.predictPerformance(capability, task);
```

### Memory Integration

```typescript
// Store capability performance in memory
await memoryService.store('capability-stats', stats);

// Retrieve historical performance
const history = await memoryService.retrieve('capability-history');
```

### Hooks Integration

```typescript
// Pre-execution hook
await hooks.preTask({ capability, task });

// Post-execution tracking
await hooks.postTask({ capability, metrics, success });
```

## Performance Characteristics

- **Discovery**: Auto-discovery with configurable intervals
- **Matching**: O(n) semantic matching with caching
- **Translation**: Minimal overhead for same-platform execution
- **Learning**: Adaptive learning rate with explore/exploit balance

## Best Practices

1. **Enable Auto-Discovery** - Let the framework find agents automatically
2. **Use Semantic Search** - Describe tasks naturally for best matches
3. **Monitor Performance** - Track capability stats to improve routing
4. **Handle Adaptation** - Check adaptation requirements for cross-platform calls
5. **Version Compatibility** - Use compatibility matrix for safe upgrades
6. **Cache Embeddings** - Reuse embeddings for common queries
7. **Balance Exploration** - Allow framework to try new capabilities

## Testing

Run the comprehensive test suite:

```bash
npm test tests/a2a/capability-framework.test.ts
```

Tests cover:
- Capability detection and introspection
- Semantic matching algorithms
- Protocol translation
- Performance learning
- Cross-platform scenarios
- Integration workflows

## Examples

See `/src/a2a/examples/usage-examples.ts` for comprehensive examples including:

1. Basic setup and discovery
2. Manual agent registration
3. Semantic capability search
4. Optimal agent selection
5. Cross-platform execution
6. Performance-based routing
7. Adaptation strategy analysis
8. Learning and adaptation
9. Compatibility matrix

## Architecture Decisions

### Why Embeddings?

Semantic embeddings enable natural language capability search, making it easy to find the right agent without exact name matching.

### Why Learning?

Performance-based learning ensures the framework continuously improves routing decisions based on real execution data.

### Why Protocol Translation?

Protocol translation enables true interoperability between different agent platforms without manual integration code.

### Why Graceful Degradation?

Feature gaps are inevitable across platforms. Graceful degradation ensures functionality even with missing features.

## Roadmap

- [ ] Additional platform adapters (CrewAI, Haystack)
- [ ] Advanced embedding models (multi-modal)
- [ ] Real-time capability streaming
- [ ] Federated capability discovery
- [ ] Capability marketplace integration
- [ ] Advanced polyfill generation
- [ ] Cost-based routing optimization
- [ ] Capability versioning and migration

## Contributing

Contributions welcome! Areas of interest:

- New platform adapters
- Improved matching algorithms
- Better polyfill strategies
- Performance optimizations
- Documentation and examples

## License

Same as claude-flow main project.
