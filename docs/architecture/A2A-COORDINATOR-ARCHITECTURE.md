# Claude Flow: Universal A2A Coordinator Architecture

**Version**: 3.0.0-alpha
**Status**: Design Specification
**Last Updated**: 2025-10-01

---

## Executive Summary

This document defines the architecture for transforming Claude Flow from a Claude-specific agent into a **universal coordinator/orchestrator** that runs on top of ANY coding agent backend through a standardized A2A (Agent-to-Agent) protocol.

**Key Paradigm Shift**:
- **Before**: Claude Flow = Claude-based coding agent
- **After**: Claude Flow = Universal coordinator that delegates to specialized agents

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│            (CLI / MCP Server / API / IDE Extension)             │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Flow Coordinator                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Request    │  │     Task     │  │   Orchestration     │  │
│  │   Parser     │→ │ Decomposer   │→ │     Engine          │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
│         ↓                  ↓                      ↓             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Capability  │  │    Agent     │  │      Result         │  │
│  │   Matcher    │  │   Router     │  │   Aggregator        │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                  A2A Protocol Layer (RFC-001)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Unified Agent Interface + Capability Negotiation        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Adapters                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Codex   │ │  Gemini  │ │  Cursor  │ │  Aider   │   ...    │
│  │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Backends                                │
│    OpenAI    Google AI    Cursor     Aider    Continue.dev      │
│    Codex      Gemini       IDE       Git       Cody  ...        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Principles

1. **Agent Agnostic**: Works with ANY LLM-based coding agent
2. **Capability-Based Routing**: Routes tasks based on agent capabilities, not hardcoded rules
3. **Protocol-First**: A2A protocol is the contract between coordinator and agents
4. **Composable**: Agents can be chained, parallelized, or nested
5. **Extensible**: New agents can be added without changing core coordinator
6. **Resilient**: Graceful degradation when agents fail or are unavailable

---

## 2. Coordinator Engine Design

### 2.1 Request Processing Pipeline

```
User Request
    ↓
┌─────────────────────┐
│  1. Request Parser   │  → Parse natural language into structured task
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 2. Task Decomposer  │  → Break into atomic subtasks
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 3. Capability Match │  → Match subtasks to agent capabilities
└─────────────────────┘
    ↓
┌─────────────────────┐
│  4. Agent Router    │  → Select optimal agent(s) for each subtask
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 5. Execution Plan   │  → Generate DAG of task dependencies
└─────────────────────┘
    ↓
┌─────────────────────┐
│  6. Orchestrator    │  → Execute plan (parallel/sequential)
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 7. Result Aggregate │  → Combine results from multiple agents
└─────────────────────┘
    ↓
Unified Response
```

### 2.2 Task Decomposition Algorithm

```typescript
interface Task {
  id: string;
  type: TaskType;
  description: string;
  requiredCapabilities: Capability[];
  dependencies: string[]; // Task IDs
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedComplexity: number; // 1-10
  context: Record<string, unknown>;
}

enum TaskType {
  // Code Operations
  CODE_GENERATION = 'code_generation',
  CODE_REFACTORING = 'code_refactoring',
  CODE_REVIEW = 'code_review',
  CODE_SEARCH = 'code_search',
  CODE_ANALYSIS = 'code_analysis',

  // Documentation
  DOCUMENTATION = 'documentation',
  API_DESIGN = 'api_design',

  // Research & Planning
  RESEARCH = 'research',
  ARCHITECTURE = 'architecture',
  PLANNING = 'planning',

  // Version Control
  GIT_OPERATIONS = 'git_operations',
  MERGE_CONFLICT = 'merge_conflict',

  // Testing
  TEST_GENERATION = 'test_generation',
  TEST_EXECUTION = 'test_execution',

  // IDE Operations
  INLINE_EDIT = 'inline_edit',
  MULTI_FILE_EDIT = 'multi_file_edit',

  // Deployment
  DEPLOYMENT = 'deployment',
  INFRASTRUCTURE = 'infrastructure',
}

class TaskDecomposer {
  /**
   * Decomposes a user request into atomic tasks
   */
  async decompose(request: string, context: Context): Promise<Task[]> {
    // Step 1: Parse intent using lightweight NLP
    const intent = await this.parseIntent(request);

    // Step 2: Identify required operations
    const operations = await this.identifyOperations(intent, context);

    // Step 3: Create task graph
    const tasks = await this.createTaskGraph(operations);

    // Step 4: Optimize task order
    const optimized = await this.optimizeTaskOrder(tasks);

    return optimized;
  }

  private async parseIntent(request: string): Promise<Intent> {
    // Use pattern matching + lightweight LLM call
    const patterns = [
      { pattern: /build.*api/i, intent: 'build_api' },
      { pattern: /refactor.*code/i, intent: 'refactor' },
      { pattern: /add.*feature/i, intent: 'add_feature' },
      { pattern: /fix.*bug/i, intent: 'fix_bug' },
      { pattern: /deploy/i, intent: 'deploy' },
      // ... more patterns
    ];

    // If pattern match fails, use LLM
    return await this.llmParseIntent(request);
  }

  private async identifyOperations(
    intent: Intent,
    context: Context
  ): Promise<Operation[]> {
    // Map intent to concrete operations
    const operationMap = {
      build_api: [
        'research_best_practices',
        'design_api_schema',
        'generate_boilerplate',
        'implement_endpoints',
        'generate_tests',
        'generate_docs',
      ],
      refactor: [
        'analyze_code_quality',
        'identify_patterns',
        'apply_refactorings',
        'update_tests',
      ],
      // ... more mappings
    };

    return operationMap[intent.type] || [];
  }

  private async createTaskGraph(operations: Operation[]): Promise<Task[]> {
    const tasks: Task[] = [];
    const dependencies = this.inferDependencies(operations);

    for (const op of operations) {
      tasks.push({
        id: generateId(),
        type: this.mapOperationToTaskType(op),
        description: op.description,
        requiredCapabilities: this.inferCapabilities(op),
        dependencies: dependencies[op.id] || [],
        priority: op.priority || 'medium',
        estimatedComplexity: op.complexity || 5,
        context: op.context || {},
      });
    }

    return tasks;
  }
}
```

### 2.3 Agent Selection Logic

```typescript
interface AgentScore {
  agentId: string;
  score: number;
  reasoning: string;
}

class AgentRouter {
  /**
   * Selects optimal agent(s) for a task based on capabilities,
   * performance history, and load balancing
   */
  async selectAgent(
    task: Task,
    availableAgents: RegisteredAgent[]
  ): Promise<string> {
    // Step 1: Filter agents by required capabilities
    const capableAgents = availableAgents.filter(agent =>
      this.hasRequiredCapabilities(agent, task.requiredCapabilities)
    );

    if (capableAgents.length === 0) {
      throw new Error(`No agents available with capabilities: ${task.requiredCapabilities.join(', ')}`);
    }

    // Step 2: Score each agent
    const scores: AgentScore[] = await Promise.all(
      capableAgents.map(agent => this.scoreAgent(agent, task))
    );

    // Step 3: Select highest scoring agent
    scores.sort((a, b) => b.score - a.score);

    return scores[0].agentId;
  }

  private async scoreAgent(
    agent: RegisteredAgent,
    task: Task
  ): Promise<AgentScore> {
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Capability match quality (0-40 points)
    const capabilityScore = this.scoreCapabilityMatch(agent, task);
    score += capabilityScore;
    reasons.push(`Capability match: ${capabilityScore}/40`);

    // Factor 2: Historical performance (0-30 points)
    const performanceScore = await this.scorePerformance(agent, task.type);
    score += performanceScore;
    reasons.push(`Performance history: ${performanceScore}/30`);

    // Factor 3: Current load (0-15 points)
    const loadScore = this.scoreLoad(agent);
    score += loadScore;
    reasons.push(`Load: ${loadScore}/15`);

    // Factor 4: Cost efficiency (0-10 points)
    const costScore = this.scoreCost(agent);
    score += costScore;
    reasons.push(`Cost: ${costScore}/10`);

    // Factor 5: Latency (0-5 points)
    const latencyScore = this.scoreLatency(agent);
    score += latencyScore;
    reasons.push(`Latency: ${latencyScore}/5`);

    return {
      agentId: agent.id,
      score,
      reasoning: reasons.join(', '),
    };
  }

  private scoreCapabilityMatch(
    agent: RegisteredAgent,
    task: Task
  ): number {
    // Score based on how well agent's capabilities match task requirements
    const required = task.requiredCapabilities;
    const provided = agent.capabilities;

    let score = 0;
    for (const cap of required) {
      const match = provided.find(p => p.type === cap.type);
      if (!match) continue;

      // Exact match
      if (match.level === cap.level) {
        score += 10;
      }
      // Higher capability than required
      else if (match.level > cap.level) {
        score += 8;
      }
      // Lower capability than required
      else {
        score += 4;
      }
    }

    return Math.min(score, 40);
  }

  private async scorePerformance(
    agent: RegisteredAgent,
    taskType: TaskType
  ): Promise<number> {
    // Query performance history from database
    const history = await this.db.getAgentPerformance(agent.id, taskType);

    if (!history || history.length === 0) {
      return 15; // Neutral score for new agents
    }

    // Calculate success rate
    const successRate = history.filter(h => h.success).length / history.length;

    // Calculate average completion time percentile
    const avgTime = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
    const timePercentile = this.calculatePercentile(avgTime, taskType);

    // Score: 70% success rate, 30% speed
    return Math.round((successRate * 21) + (timePercentile * 9));
  }
}
```

### 2.4 Result Aggregation Strategy

```typescript
interface TaskResult {
  taskId: string;
  agentId: string;
  status: 'success' | 'failure' | 'partial';
  output: unknown;
  artifacts: Artifact[];
  metadata: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
  };
  error?: Error;
}

class ResultAggregator {
  /**
   * Combines results from multiple agents into unified response
   */
  async aggregate(
    tasks: Task[],
    results: TaskResult[]
  ): Promise<AggregatedResult> {
    // Step 1: Validate all tasks completed
    const completed = this.validateCompletion(tasks, results);
    if (!completed.success) {
      return this.handleIncompleteResults(completed, results);
    }

    // Step 2: Merge artifacts
    const artifacts = this.mergeArtifacts(results);

    // Step 3: Combine outputs
    const output = this.combineOutputs(tasks, results);

    // Step 4: Generate summary
    const summary = await this.generateSummary(tasks, results);

    // Step 5: Calculate metrics
    const metrics = this.calculateMetrics(results);

    return {
      success: true,
      output,
      artifacts,
      summary,
      metrics,
    };
  }

  private mergeArtifacts(results: TaskResult[]): Artifact[] {
    const artifacts: Artifact[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      for (const artifact of result.artifacts) {
        // Deduplicate by path/id
        const key = artifact.path || artifact.id;
        if (seen.has(key)) continue;

        seen.add(key);
        artifacts.push(artifact);
      }
    }

    return artifacts;
  }

  private combineOutputs(
    tasks: Task[],
    results: TaskResult[]
  ): unknown {
    // Build task dependency graph
    const graph = this.buildDependencyGraph(tasks);

    // Topological sort to get execution order
    const order = this.topologicalSort(graph);

    // Combine outputs in dependency order
    const combined: Record<string, unknown> = {};

    for (const taskId of order) {
      const result = results.find(r => r.taskId === taskId);
      if (!result) continue;

      combined[taskId] = result.output;
    }

    return combined;
  }
}
```

---

## 3. Agent Backend Interface

### 3.1 Universal Agent Interface

```typescript
/**
 * Universal interface that ALL agent backends must implement
 * This is the contract between Claude Flow coordinator and any agent
 */
interface IAgentBackend {
  /**
   * Metadata
   */
  id: string;
  name: string;
  version: string;
  provider: string; // 'openai', 'google', 'anthropic', 'cursor', etc.

  /**
   * Lifecycle
   */
  initialize(config: AgentConfig): Promise<void>;
  shutdown(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;

  /**
   * Capabilities
   */
  getCapabilities(): Promise<Capability[]>;
  supportsCapability(capability: Capability): boolean;

  /**
   * Core Operations
   */
  executeTask(request: TaskRequest): Promise<TaskResponse>;
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  generateCode(prompt: CodePrompt, context: Context): Promise<CodeResult>;
  editCode(edit: EditRequest): Promise<EditResult>;
  searchCode(query: SearchQuery): Promise<SearchResult[]>;
  analyzeCode(files: string[]): Promise<AnalysisResult>;

  /**
   * Version Control
   */
  gitOperation(operation: GitOperation): Promise<GitResult>;

  /**
   * Testing
   */
  generateTests(target: TestTarget): Promise<TestResult>;
  executeTests(tests: string[]): Promise<TestExecutionResult>;

  /**
   * State Management
   */
  getState(): Promise<AgentState>;
  setState(state: Partial<AgentState>): Promise<void>;

  /**
   * Resource Management
   */
  getResourceUsage(): Promise<ResourceUsage>;
  setResourceLimits(limits: ResourceLimits): Promise<void>;
}

/**
 * Capability declaration with granular levels
 */
interface Capability {
  type: CapabilityType;
  level: 1 | 2 | 3 | 4 | 5; // 1=basic, 5=expert
  languages?: string[]; // Programming languages supported
  frameworks?: string[]; // Frameworks supported
  metadata?: Record<string, unknown>;
}

enum CapabilityType {
  // Code Operations
  CODE_GENERATION = 'code_generation',
  CODE_REFACTORING = 'code_refactoring',
  CODE_REVIEW = 'code_review',
  CODE_SEARCH = 'code_search',
  CODE_ANALYSIS = 'code_analysis',
  INLINE_EDITING = 'inline_editing',
  MULTI_FILE_EDITING = 'multi_file_editing',

  // Language Understanding
  NATURAL_LANGUAGE = 'natural_language',
  TECHNICAL_WRITING = 'technical_writing',
  DOCUMENTATION = 'documentation',

  // Architecture & Design
  SYSTEM_DESIGN = 'system_design',
  API_DESIGN = 'api_design',
  DATABASE_DESIGN = 'database_design',

  // Testing
  TEST_GENERATION = 'test_generation',
  TEST_EXECUTION = 'test_execution',

  // Version Control
  GIT_OPERATIONS = 'git_operations',
  MERGE_CONFLICT_RESOLUTION = 'merge_conflict_resolution',

  // Deployment
  CI_CD = 'ci_cd',
  INFRASTRUCTURE = 'infrastructure',

  // Research
  WEB_SEARCH = 'web_search',
  DOCUMENTATION_SEARCH = 'documentation_search',
  PATTERN_RECOGNITION = 'pattern_recognition',
}

/**
 * Task request sent to agent
 */
interface TaskRequest {
  taskId: string;
  type: TaskType;
  description: string;
  context: Context;
  requirements: Requirement[];
  constraints: Constraint[];
  timeout?: number; // milliseconds
}

interface Context {
  // File system context
  workingDirectory: string;
  files: FileInfo[];

  // Project context
  language: string;
  framework?: string;
  dependencies: Record<string, string>;

  // Git context
  branch?: string;
  uncommittedChanges?: string[];

  // Previous results
  previousResults?: TaskResult[];

  // User preferences
  preferences?: Record<string, unknown>;
}

/**
 * Task response from agent
 */
interface TaskResponse {
  taskId: string;
  status: 'success' | 'failure' | 'partial';
  output: unknown;
  artifacts: Artifact[];
  log: LogEntry[];
  metadata: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
    model?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface Artifact {
  type: 'file' | 'diff' | 'command' | 'test' | 'documentation';
  path?: string;
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
}
```

### 3.2 Adapter Pattern Implementation

```typescript
/**
 * Base adapter class that provides common functionality
 */
abstract class BaseAgentAdapter implements IAgentBackend {
  protected config: AgentConfig;
  protected state: AgentState;

  constructor(config: AgentConfig) {
    this.config = config;
    this.state = { status: 'uninitialized' };
  }

  // Common implementations
  async healthCheck(): Promise<HealthStatus> {
    return {
      status: this.state.status,
      uptime: Date.now() - (this.state.startTime || Date.now()),
      lastRequest: this.state.lastRequest,
    };
  }

  supportsCapability(capability: Capability): boolean {
    const capabilities = this.getCapabilities();
    return capabilities.some(c =>
      c.type === capability.type && c.level >= capability.level
    );
  }

  // Abstract methods that adapters must implement
  abstract initialize(config: AgentConfig): Promise<void>;
  abstract getCapabilities(): Promise<Capability[]>;
  abstract executeTask(request: TaskRequest): Promise<TaskResponse>;
}

/**
 * OpenAI Codex Adapter
 */
class CodexAdapter extends BaseAgentAdapter {
  private client: OpenAI;

  id = 'codex';
  name = 'OpenAI Codex';
  version = '1.0.0';
  provider = 'openai';

  async initialize(config: AgentConfig): Promise<void> {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.state = {
      status: 'ready',
      startTime: Date.now(),
    };
  }

  async getCapabilities(): Promise<Capability[]> {
    return [
      {
        type: CapabilityType.CODE_GENERATION,
        level: 5,
        languages: ['javascript', 'typescript', 'python', 'go', 'rust'],
      },
      {
        type: CapabilityType.CODE_REFACTORING,
        level: 4,
        languages: ['javascript', 'typescript', 'python'],
      },
      {
        type: CapabilityType.TEST_GENERATION,
        level: 4,
      },
      {
        type: CapabilityType.DOCUMENTATION,
        level: 4,
      },
    ];
  }

  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();

    try {
      // Build prompt from task request
      const prompt = this.buildPrompt(request);

      // Call OpenAI API
      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      });

      // Parse response
      const output = completion.choices[0].message.content;
      const artifacts = this.extractArtifacts(output);

      return {
        taskId: request.taskId,
        status: 'success',
        output,
        artifacts,
        log: [],
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: completion.usage?.total_tokens,
          model: completion.model,
        },
      };
    } catch (error) {
      return {
        taskId: request.taskId,
        status: 'failure',
        output: null,
        artifacts: [],
        log: [],
        metadata: {
          duration: Date.now() - startTime,
        },
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
        },
      };
    }
  }

  async generateCode(
    prompt: CodePrompt,
    context: Context
  ): Promise<CodeResult> {
    // Implementation specific to code generation
    const messages = this.buildCodePromptMessages(prompt, context);

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.2,
    });

    return this.parseCodeResponse(completion);
  }

  // Not supported by Codex
  async gitOperation(operation: GitOperation): Promise<GitResult> {
    throw new Error('Git operations not supported by Codex adapter');
  }
}

/**
 * Google Gemini Adapter
 */
class GeminiAdapter extends BaseAgentAdapter {
  private client: GoogleGenerativeAI;

  id = 'gemini';
  name = 'Google Gemini';
  version = '1.0.0';
  provider = 'google';

  async initialize(config: AgentConfig): Promise<void> {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.state = { status: 'ready', startTime: Date.now() };
  }

  async getCapabilities(): Promise<Capability[]> {
    return [
      {
        type: CapabilityType.NATURAL_LANGUAGE,
        level: 5,
      },
      {
        type: CapabilityType.SYSTEM_DESIGN,
        level: 5,
      },
      {
        type: CapabilityType.CODE_ANALYSIS,
        level: 5,
      },
      {
        type: CapabilityType.DOCUMENTATION,
        level: 5,
      },
      {
        type: CapabilityType.WEB_SEARCH,
        level: 4,
      },
      {
        type: CapabilityType.CODE_GENERATION,
        level: 4,
        languages: ['javascript', 'typescript', 'python', 'java', 'go'],
      },
    ];
  }

  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: this.config.model || 'gemini-pro',
      });

      const prompt = this.buildPrompt(request);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const output = response.text();

      return {
        taskId: request.taskId,
        status: 'success',
        output,
        artifacts: this.extractArtifacts(output),
        log: [],
        metadata: {
          duration: Date.now() - startTime,
          model: 'gemini-pro',
        },
      };
    } catch (error) {
      return {
        taskId: request.taskId,
        status: 'failure',
        output: null,
        artifacts: [],
        log: [],
        metadata: { duration: Date.now() - startTime },
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
        },
      };
    }
  }
}

/**
 * Cursor IDE Adapter
 */
class CursorAdapter extends BaseAgentAdapter {
  private client: CursorClient;

  id = 'cursor';
  name = 'Cursor IDE';
  version = '1.0.0';
  provider = 'cursor';

  async initialize(config: AgentConfig): Promise<void> {
    this.client = new CursorClient({
      apiKey: config.apiKey,
      endpoint: config.endpoint || 'http://localhost:3000',
    });

    await this.client.connect();
    this.state = { status: 'ready', startTime: Date.now() };
  }

  async getCapabilities(): Promise<Capability[]> {
    return [
      {
        type: CapabilityType.INLINE_EDITING,
        level: 5,
        languages: ['javascript', 'typescript', 'python', 'go', 'rust'],
      },
      {
        type: CapabilityType.MULTI_FILE_EDITING,
        level: 5,
      },
      {
        type: CapabilityType.CODE_REFACTORING,
        level: 5,
      },
      {
        type: CapabilityType.CODE_GENERATION,
        level: 4,
      },
    ];
  }

  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();

    try {
      // Cursor specializes in inline edits
      if (request.type === TaskType.INLINE_EDIT) {
        return await this.executeInlineEdit(request);
      }

      // Generic task execution
      const result = await this.client.executeCommand({
        command: 'ai-edit',
        args: {
          instruction: request.description,
          context: request.context,
        },
      });

      return {
        taskId: request.taskId,
        status: result.success ? 'success' : 'failure',
        output: result.changes,
        artifacts: result.files.map(f => ({
          type: 'diff',
          path: f.path,
          content: f.diff,
        })),
        log: result.log || [],
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        taskId: request.taskId,
        status: 'failure',
        output: null,
        artifacts: [],
        log: [],
        metadata: { duration: Date.now() - startTime },
        error: {
          code: 'CURSOR_ERROR',
          message: error.message,
        },
      };
    }
  }

  async editCode(edit: EditRequest): Promise<EditResult> {
    // Cursor's specialty - direct IDE integration
    return await this.client.applyEdit({
      file: edit.file,
      instruction: edit.instruction,
      range: edit.range,
    });
  }
}

/**
 * Aider Git Assistant Adapter
 */
class AiderAdapter extends BaseAgentAdapter {
  private aider: AiderClient;

  id = 'aider';
  name = 'Aider Git Assistant';
  version = '1.0.0';
  provider = 'aider';

  async initialize(config: AgentConfig): Promise<void> {
    this.aider = new AiderClient({
      workingDir: config.workingDir,
      model: config.model || 'gpt-4',
    });

    await this.aider.start();
    this.state = { status: 'ready', startTime: Date.now() };
  }

  async getCapabilities(): Promise<Capability[]> {
    return [
      {
        type: CapabilityType.GIT_OPERATIONS,
        level: 5,
      },
      {
        type: CapabilityType.MERGE_CONFLICT_RESOLUTION,
        level: 5,
      },
      {
        type: CapabilityType.CODE_GENERATION,
        level: 4,
        languages: ['python', 'javascript', 'typescript'],
      },
      {
        type: CapabilityType.CODE_REFACTORING,
        level: 4,
      },
    ];
  }

  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();

    try {
      // Send task to Aider
      const result = await this.aider.execute(request.description);

      return {
        taskId: request.taskId,
        status: result.success ? 'success' : 'failure',
        output: result.output,
        artifacts: result.changes.map(c => ({
          type: 'diff',
          path: c.file,
          content: c.diff,
        })),
        log: result.log,
        metadata: {
          duration: Date.now() - startTime,
          tokensUsed: result.tokensUsed,
        },
      };
    } catch (error) {
      return {
        taskId: request.taskId,
        status: 'failure',
        output: null,
        artifacts: [],
        log: [],
        metadata: { duration: Date.now() - startTime },
        error: {
          code: 'AIDER_ERROR',
          message: error.message,
        },
      };
    }
  }

  async gitOperation(operation: GitOperation): Promise<GitResult> {
    // Aider's specialty
    switch (operation.type) {
      case 'commit':
        return await this.aider.commit(operation.message);
      case 'resolve-conflict':
        return await this.aider.resolveConflict(operation.files);
      case 'rebase':
        return await this.aider.rebase(operation.branch);
      default:
        throw new Error(`Unsupported git operation: ${operation.type}`);
    }
  }
}

/**
 * Cody Code Search Adapter
 */
class CodyAdapter extends BaseAgentAdapter {
  private client: CodyClient;

  id = 'cody';
  name = 'Sourcegraph Cody';
  version = '1.0.0';
  provider = 'sourcegraph';

  async initialize(config: AgentConfig): Promise<void> {
    this.client = new CodyClient({
      accessToken: config.accessToken,
      endpoint: config.endpoint || 'https://sourcegraph.com',
    });

    this.state = { status: 'ready', startTime: Date.now() };
  }

  async getCapabilities(): Promise<Capability[]> {
    return [
      {
        type: CapabilityType.CODE_SEARCH,
        level: 5,
        languages: ['*'], // All languages
      },
      {
        type: CapabilityType.CODE_ANALYSIS,
        level: 5,
      },
      {
        type: CapabilityType.DOCUMENTATION_SEARCH,
        level: 5,
      },
      {
        type: CapabilityType.PATTERN_RECOGNITION,
        level: 4,
      },
    ];
  }

  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();

    try {
      const result = await this.client.search({
        query: request.description,
        context: request.context,
      });

      return {
        taskId: request.taskId,
        status: 'success',
        output: result.matches,
        artifacts: result.matches.map(m => ({
          type: 'file',
          path: m.file,
          content: m.content,
          metadata: { score: m.score },
        })),
        log: [],
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        taskId: request.taskId,
        status: 'failure',
        output: null,
        artifacts: [],
        log: [],
        metadata: { duration: Date.now() - startTime },
        error: {
          code: 'CODY_ERROR',
          message: error.message,
        },
      };
    }
  }

  async searchCode(query: SearchQuery): Promise<SearchResult[]> {
    // Cody's specialty
    return await this.client.codeSearch({
      query: query.query,
      repo: query.repo,
      branch: query.branch,
      language: query.language,
    });
  }
}
```

### 3.3 Adapter Registry

```typescript
/**
 * Registry for managing agent adapters
 */
class AdapterRegistry {
  private adapters = new Map<string, IAgentBackend>();
  private configs = new Map<string, AgentConfig>();

  /**
   * Register a new adapter
   */
  register(adapter: IAgentBackend, config: AgentConfig): void {
    this.adapters.set(adapter.id, adapter);
    this.configs.set(adapter.id, config);
  }

  /**
   * Get adapter by ID
   */
  get(id: string): IAgentBackend | undefined {
    return this.adapters.get(id);
  }

  /**
   * Get all registered adapters
   */
  getAll(): IAgentBackend[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Find adapters by capability
   */
  findByCapability(capability: Capability): IAgentBackend[] {
    return this.getAll().filter(adapter =>
      adapter.supportsCapability(capability)
    );
  }

  /**
   * Auto-discover and register adapters from config
   */
  async autoDiscover(config: CoordinatorConfig): Promise<void> {
    for (const agentConfig of config.agents) {
      if (!agentConfig.enabled) continue;

      const adapter = this.createAdapter(agentConfig);
      await adapter.initialize(agentConfig);

      this.register(adapter, agentConfig);
    }
  }

  private createAdapter(config: AgentConfig): IAgentBackend {
    switch (config.type) {
      case 'openai':
        return new CodexAdapter(config);
      case 'google':
        return new GeminiAdapter(config);
      case 'cursor':
        return new CursorAdapter(config);
      case 'aider':
        return new AiderAdapter(config);
      case 'cody':
        return new CodyAdapter(config);
      default:
        throw new Error(`Unknown adapter type: ${config.type}`);
    }
  }
}
```

---

## 4. Multi-Agent Orchestration

### 4.1 Parallel Execution Pattern

```typescript
class ParallelOrchestrator {
  /**
   * Execute independent tasks in parallel
   */
  async executeParallel(
    tasks: Task[],
    agents: Map<string, IAgentBackend>
  ): Promise<TaskResult[]> {
    // Group tasks by agent
    const tasksByAgent = this.groupByAgent(tasks);

    // Execute all tasks in parallel
    const promises = Array.from(tasksByAgent.entries()).map(
      async ([agentId, agentTasks]) => {
        const agent = agents.get(agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        // Execute agent's tasks in parallel
        return await Promise.all(
          agentTasks.map(task => this.executeTask(agent, task))
        );
      }
    );

    const results = await Promise.all(promises);
    return results.flat();
  }

  private async executeTask(
    agent: IAgentBackend,
    task: Task
  ): Promise<TaskResult> {
    const request: TaskRequest = {
      taskId: task.id,
      type: task.type,
      description: task.description,
      context: task.context,
      requirements: [],
      constraints: [],
    };

    try {
      const response = await agent.executeTask(request);

      return {
        taskId: task.id,
        agentId: agent.id,
        status: response.status,
        output: response.output,
        artifacts: response.artifacts,
        metadata: response.metadata,
      };
    } catch (error) {
      return {
        taskId: task.id,
        agentId: agent.id,
        status: 'failure',
        output: null,
        artifacts: [],
        metadata: { duration: 0 },
        error,
      };
    }
  }
}
```

### 4.2 Sequential Workflow Pattern

```typescript
class SequentialOrchestrator {
  /**
   * Execute tasks sequentially with dependency management
   */
  async executeSequential(
    tasks: Task[],
    agents: Map<string, IAgentBackend>
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // Build dependency graph
    const graph = this.buildDependencyGraph(tasks);

    // Topological sort
    const order = this.topologicalSort(graph);

    // Execute in order
    for (const taskId of order) {
      const task = taskMap.get(taskId);
      if (!task) continue;

      // Get agent for this task
      const agentId = task.context.assignedAgent;
      const agent = agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      // Inject previous results into context
      const context = this.enrichContext(
        task.context,
        task.dependencies,
        results
      );

      // Execute task
      const request: TaskRequest = {
        taskId: task.id,
        type: task.type,
        description: task.description,
        context,
        requirements: [],
        constraints: [],
      };

      const response = await agent.executeTask(request);

      results.push({
        taskId: task.id,
        agentId: agent.id,
        status: response.status,
        output: response.output,
        artifacts: response.artifacts,
        metadata: response.metadata,
      });

      // Stop if task failed and it's critical
      if (response.status === 'failure' && task.priority === 'critical') {
        throw new Error(`Critical task failed: ${task.id}`);
      }
    }

    return results;
  }

  private enrichContext(
    context: Context,
    dependencies: string[],
    results: TaskResult[]
  ): Context {
    const previousResults = dependencies
      .map(depId => results.find(r => r.taskId === depId))
      .filter(Boolean);

    return {
      ...context,
      previousResults,
    };
  }
}
```

### 4.3 Adaptive Workflow Pattern

```typescript
class AdaptiveOrchestrator {
  /**
   * Dynamically adjusts execution strategy based on results
   */
  async executeAdaptive(
    tasks: Task[],
    agents: Map<string, IAgentBackend>
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const remaining = [...tasks];

    while (remaining.length > 0) {
      // Analyze current state
      const analysis = this.analyzeProgress(results, remaining);

      // Decide next action
      const action = this.decideNextAction(analysis);

      switch (action.type) {
        case 'parallel':
          // Execute independent tasks in parallel
          const parallelTasks = this.selectParallelTasks(remaining, action.count);
          const parallelResults = await this.executeParallel(parallelTasks, agents);
          results.push(...parallelResults);
          this.removeCompleted(remaining, parallelResults);
          break;

        case 'sequential':
          // Execute critical path sequentially
          const nextTask = this.selectNextTask(remaining, results);
          const result = await this.executeSingle(nextTask, agents);
          results.push(result);
          this.removeCompleted(remaining, [result]);
          break;

        case 'reassign':
          // Reassign failed task to different agent
          const failedTask = action.task;
          const newAgent = await this.selectAlternativeAgent(failedTask, agents);
          failedTask.context.assignedAgent = newAgent.id;
          break;

        case 'retry':
          // Retry failed task with same agent
          const retryTask = action.task;
          const retryResult = await this.executeSingle(retryTask, agents);
          results.push(retryResult);
          this.removeCompleted(remaining, [retryResult]);
          break;

        case 'abort':
          // Critical failure, abort remaining tasks
          throw new Error(`Workflow aborted: ${action.reason}`);
      }
    }

    return results;
  }

  private analyzeProgress(
    results: TaskResult[],
    remaining: Task[]
  ): WorkflowAnalysis {
    const completed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failure').length;
    const total = results.length + remaining.length;

    return {
      progressRate: completed / total,
      failureRate: failed / total,
      remainingComplexity: this.calculateComplexity(remaining),
      estimatedTimeRemaining: this.estimateTimeRemaining(remaining, results),
    };
  }

  private decideNextAction(analysis: WorkflowAnalysis): Action {
    // High failure rate - be more conservative
    if (analysis.failureRate > 0.3) {
      return { type: 'sequential' };
    }

    // Low failure rate - be aggressive
    if (analysis.failureRate < 0.1) {
      return { type: 'parallel', count: 5 };
    }

    // Default to moderate parallelism
    return { type: 'parallel', count: 3 };
  }
}
```

### 4.4 Error Handling & Retry Logic

```typescript
class ErrorHandler {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
  };

  /**
   * Execute task with retry logic
   */
  async executeWithRetry(
    agent: IAgentBackend,
    task: Task
  ): Promise<TaskResult> {
    let lastError: Error | undefined;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.executeTask(agent, task);

        if (result.status === 'success') {
          return result;
        }

        // Partial success - might be acceptable
        if (result.status === 'partial') {
          const acceptable = await this.isPartialAcceptable(result);
          if (acceptable) {
            return result;
          }
        }

        lastError = result.error;
      } catch (error) {
        lastError = error;
      }

      // Exponential backoff
      if (attempt < this.retryConfig.maxRetries - 1) {
        await this.sleep(delay);
        delay *= this.retryConfig.backoffMultiplier;
      }
    }

    // All retries failed
    return {
      taskId: task.id,
      agentId: agent.id,
      status: 'failure',
      output: null,
      artifacts: [],
      metadata: { duration: 0 },
      error: lastError,
    };
  }

  /**
   * Handle agent failure by trying alternative agents
   */
  async handleAgentFailure(
    task: Task,
    failedAgent: IAgentBackend,
    availableAgents: IAgentBackend[]
  ): Promise<TaskResult> {
    // Find alternative agents with required capabilities
    const alternatives = availableAgents.filter(
      agent =>
        agent.id !== failedAgent.id &&
        task.requiredCapabilities.every(cap =>
          agent.supportsCapability(cap)
        )
    );

    if (alternatives.length === 0) {
      throw new Error(
        `No alternative agents available for task ${task.id}`
      );
    }

    // Try each alternative
    for (const agent of alternatives) {
      try {
        const result = await this.executeWithRetry(agent, task);
        if (result.status === 'success') {
          return result;
        }
      } catch (error) {
        // Try next agent
        continue;
      }
    }

    throw new Error(
      `All agents failed for task ${task.id}`
    );
  }
}
```

---

## 5. Configuration System

### 5.1 Configuration Schema

```yaml
# claude-flow.config.yaml

# Coordinator Configuration
coordinator:
  # Execution strategy
  defaultStrategy: adaptive # parallel | sequential | adaptive

  # Concurrency limits
  maxConcurrentTasks: 10
  maxConcurrentAgentsPerTask: 3

  # Timeouts
  defaultTaskTimeout: 300000 # 5 minutes
  healthCheckInterval: 30000 # 30 seconds

  # Retry configuration
  retryPolicy:
    maxRetries: 3
    backoffMultiplier: 2
    initialDelay: 1000

  # Resource limits
  resourceLimits:
    maxMemoryPerAgent: 2048 # MB
    maxTokensPerTask: 100000

# Agent Backend Configurations
agents:
  # OpenAI Codex
  codex:
    type: openai
    enabled: true
    apiKey: ${OPENAI_API_KEY}
    model: gpt-4
    temperature: 0.2
    maxTokens: 4000
    priority: high # Prefer this agent when multiple match

  # Google Gemini
  gemini:
    type: google
    enabled: true
    apiKey: ${GOOGLE_API_KEY}
    model: gemini-pro
    priority: high

  # Anthropic Claude
  claude:
    type: anthropic
    enabled: true
    apiKey: ${ANTHROPIC_API_KEY}
    model: claude-3-sonnet-20240229
    priority: medium

  # Cursor IDE
  cursor:
    type: cursor
    enabled: true
    endpoint: http://localhost:3000
    apiKey: ${CURSOR_API_KEY}
    priority: high # Prefer for inline edits

  # Aider Git Assistant
  aider:
    type: aider
    enabled: true
    workingDir: ${PWD}
    model: gpt-4
    autoCommit: false
    priority: high # Prefer for git operations

  # Continue.dev
  continue:
    type: continue
    enabled: false # Disabled by default
    endpoint: http://localhost:3001

  # Sourcegraph Cody
  cody:
    type: cody
    enabled: true
    accessToken: ${SOURCEGRAPH_TOKEN}
    endpoint: https://sourcegraph.com
    priority: high # Prefer for code search

# Task Routing Rules
routing:
  # Override automatic routing with explicit rules
  rules:
    # Code generation tasks
    - taskType: code_generation
      preferredAgents: [codex, gemini, claude]
      excludeAgents: [cursor, aider]

    # Inline editing
    - taskType: inline_edit
      preferredAgents: [cursor]
      fallbackAgents: [codex]

    # Git operations
    - taskType: git_operations
      preferredAgents: [aider]
      excludeAgents: [codex, gemini]

    # Code search
    - taskType: code_search
      preferredAgents: [cody]

    # Research tasks
    - taskType: research
      preferredAgents: [gemini, claude]

    # System design
    - taskType: system_design
      preferredAgents: [gemini, claude]
      excludeAgents: [cursor, aider]

# Capability Overrides
capabilities:
  # Override detected capabilities
  overrides:
    codex:
      code_generation:
        level: 5
        languages: [javascript, typescript, python, go, rust, java]

    cursor:
      inline_editing:
        level: 5

    aider:
      git_operations:
        level: 5

# Workflow Templates
workflows:
  # Build REST API workflow
  build_api:
    steps:
      - name: research
        taskType: research
        agent: gemini

      - name: design
        taskType: api_design
        agent: gemini
        dependsOn: [research]

      - name: generate_boilerplate
        taskType: code_generation
        agent: codex
        dependsOn: [design]

      - name: implement_endpoints
        taskType: code_generation
        agent: codex
        dependsOn: [generate_boilerplate]
        parallel: true # Can implement endpoints in parallel

      - name: generate_tests
        taskType: test_generation
        agent: codex
        dependsOn: [implement_endpoints]

      - name: git_commit
        taskType: git_operations
        agent: aider
        dependsOn: [generate_tests]

  # Refactor codebase workflow
  refactor:
    steps:
      - name: analyze
        taskType: code_analysis
        agent: cody

      - name: search_patterns
        taskType: code_search
        agent: cody
        dependsOn: [analyze]

      - name: apply_refactorings
        taskType: code_refactoring
        agent: cursor
        dependsOn: [search_patterns]

      - name: update_tests
        taskType: test_generation
        agent: codex
        dependsOn: [apply_refactorings]

# Memory & State Management
memory:
  # Shared memory between agents
  enabled: true
  backend: redis # redis | memory | file
  ttl: 3600 # 1 hour

  # State persistence
  persistence:
    enabled: true
    directory: .claude-flow/state

# Monitoring & Observability
monitoring:
  enabled: true

  # Metrics collection
  metrics:
    collectAgentPerformance: true
    collectTokenUsage: true
    collectCosts: true

  # Logging
  logging:
    level: info # debug | info | warn | error
    format: json
    destination: stdout

  # Telemetry
  telemetry:
    enabled: false
    endpoint: https://telemetry.claude-flow.dev

# Cost Management
costs:
  # Budget limits
  budgetLimits:
    daily: 100 # USD
    monthly: 3000 # USD

  # Cost tracking per agent
  tracking:
    codex:
      inputTokenCost: 0.00003 # per token
      outputTokenCost: 0.00006 # per token

    gemini:
      inputTokenCost: 0.000125
      outputTokenCost: 0.000375

    claude:
      inputTokenCost: 0.000003
      outputTokenCost: 0.000015
```

### 5.2 Environment Variables

```bash
# .env

# OpenAI
OPENAI_API_KEY=sk-...

# Google AI
GOOGLE_API_KEY=...

# Anthropic
ANTHROPIC_API_KEY=...

# Cursor
CURSOR_API_KEY=...

# Sourcegraph
SOURCEGRAPH_TOKEN=...

# Redis (for shared memory)
REDIS_URL=redis://localhost:6379

# Working directory
CLAUDE_FLOW_WORKING_DIR=/path/to/project

# Enable debug mode
CLAUDE_FLOW_DEBUG=true
```

### 5.3 Programmatic Configuration

```typescript
import { CoordinatorConfig } from './config';

const config: CoordinatorConfig = {
  coordinator: {
    defaultStrategy: 'adaptive',
    maxConcurrentTasks: 10,
  },

  agents: [
    {
      type: 'openai',
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
      priority: 'high',
    },
    {
      type: 'google',
      enabled: true,
      apiKey: process.env.GOOGLE_API_KEY,
      model: 'gemini-pro',
      priority: 'high',
    },
    {
      type: 'cursor',
      enabled: true,
      endpoint: 'http://localhost:3000',
      priority: 'high',
    },
  ],

  routing: {
    rules: [
      {
        taskType: 'code_generation',
        preferredAgents: ['codex', 'gemini'],
      },
      {
        taskType: 'inline_edit',
        preferredAgents: ['cursor'],
      },
    ],
  },
};

export default config;
```

---

## 6. Integration Examples

### 6.1 Example 1: "Build a REST API"

**User Request**: "Build a REST API for a todo app with authentication"

**Execution Flow**:

```typescript
// 1. Request parsing
const request = "Build a REST API for a todo app with authentication";

// 2. Task decomposition
const tasks = [
  {
    id: 't1',
    type: TaskType.RESEARCH,
    description: 'Research REST API best practices and authentication patterns',
    requiredCapabilities: [
      { type: CapabilityType.WEB_SEARCH, level: 4 },
      { type: CapabilityType.NATURAL_LANGUAGE, level: 4 },
    ],
    dependencies: [],
  },
  {
    id: 't2',
    type: TaskType.API_DESIGN,
    description: 'Design API schema with endpoints and authentication flow',
    requiredCapabilities: [
      { type: CapabilityType.API_DESIGN, level: 4 },
      { type: CapabilityType.SYSTEM_DESIGN, level: 4 },
    ],
    dependencies: ['t1'],
  },
  {
    id: 't3',
    type: TaskType.CODE_GENERATION,
    description: 'Generate Express.js boilerplate with TypeScript',
    requiredCapabilities: [
      { type: CapabilityType.CODE_GENERATION, level: 4 },
    ],
    dependencies: ['t2'],
  },
  {
    id: 't4',
    type: TaskType.CODE_GENERATION,
    description: 'Implement JWT authentication middleware',
    requiredCapabilities: [
      { type: CapabilityType.CODE_GENERATION, level: 4 },
    ],
    dependencies: ['t3'],
  },
  {
    id: 't5',
    type: TaskType.CODE_GENERATION,
    description: 'Implement todo CRUD endpoints',
    requiredCapabilities: [
      { type: CapabilityType.CODE_GENERATION, level: 4 },
    ],
    dependencies: ['t4'],
  },
  {
    id: 't6',
    type: TaskType.TEST_GENERATION,
    description: 'Generate unit tests for authentication',
    requiredCapabilities: [
      { type: CapabilityType.TEST_GENERATION, level: 4 },
    ],
    dependencies: ['t4'],
  },
  {
    id: 't7',
    type: TaskType.TEST_GENERATION,
    description: 'Generate integration tests for API endpoints',
    requiredCapabilities: [
      { type: CapabilityType.TEST_GENERATION, level: 4 },
    ],
    dependencies: ['t5'],
  },
  {
    id: 't8',
    type: TaskType.GIT_OPERATIONS,
    description: 'Commit changes with descriptive message',
    requiredCapabilities: [
      { type: CapabilityType.GIT_OPERATIONS, level: 4 },
    ],
    dependencies: ['t6', 't7'],
  },
];

// 3. Agent selection
const assignments = {
  t1: 'gemini',    // Research - Gemini excels at research
  t2: 'gemini',    // API Design - Gemini excels at design
  t3: 'codex',     // Code gen - Codex best for TypeScript
  t4: 'codex',     // Auth implementation - Codex
  t5: 'codex',     // CRUD endpoints - Codex
  t6: 'codex',     // Test generation - Codex
  t7: 'codex',     // Test generation - Codex
  t8: 'aider',     // Git operations - Aider specialty
};

// 4. Execution plan (mixed parallel/sequential)
// Phase 1: Research (t1) - Sequential
// Phase 2: Design (t2) - Sequential (depends on t1)
// Phase 3: Boilerplate (t3) - Sequential (depends on t2)
// Phase 4: Auth + CRUD (t4, t5) - Sequential
// Phase 5: Tests (t6, t7) - PARALLEL (independent)
// Phase 6: Git commit (t8) - Sequential (depends on t6, t7)

// 5. Execute
const coordinator = new Coordinator(config);
const result = await coordinator.execute(tasks, assignments);

// 6. Result
/*
{
  success: true,
  artifacts: [
    { type: 'file', path: 'src/server.ts', content: '...' },
    { type: 'file', path: 'src/middleware/auth.ts', content: '...' },
    { type: 'file', path: 'src/routes/todos.ts', content: '...' },
    { type: 'file', path: 'src/tests/auth.test.ts', content: '...' },
    { type: 'file', path: 'src/tests/todos.test.ts', content: '...' },
  ],
  summary: 'Built REST API with JWT auth and CRUD endpoints',
  metrics: {
    totalDuration: 45000, // 45 seconds
    tokensUsed: 25000,
    cost: 0.75, // USD
    agentsUsed: ['gemini', 'codex', 'aider'],
  },
}
*/
```

### 6.2 Example 2: "Refactor Codebase"

**User Request**: "Refactor the authentication module to use modern patterns"

**Execution Flow**:

```typescript
// 1. Task decomposition
const tasks = [
  {
    id: 't1',
    type: TaskType.CODE_SEARCH,
    description: 'Find all authentication-related code',
    requiredCapabilities: [
      { type: CapabilityType.CODE_SEARCH, level: 4 },
    ],
    dependencies: [],
  },
  {
    id: 't2',
    type: TaskType.CODE_ANALYSIS,
    description: 'Analyze current authentication patterns',
    requiredCapabilities: [
      { type: CapabilityType.CODE_ANALYSIS, level: 4 },
    ],
    dependencies: ['t1'],
  },
  {
    id: 't3',
    type: TaskType.RESEARCH,
    description: 'Research modern authentication patterns',
    requiredCapabilities: [
      { type: CapabilityType.WEB_SEARCH, level: 4 },
    ],
    dependencies: [],
  },
  {
    id: 't4',
    type: TaskType.CODE_REFACTORING,
    description: 'Refactor auth module with modern patterns',
    requiredCapabilities: [
      { type: CapabilityType.CODE_REFACTORING, level: 4 },
      { type: CapabilityType.MULTI_FILE_EDITING, level: 4 },
    ],
    dependencies: ['t2', 't3'],
  },
  {
    id: 't5',
    type: TaskType.TEST_GENERATION,
    description: 'Update tests to match new implementation',
    requiredCapabilities: [
      { type: CapabilityType.TEST_GENERATION, level: 4 },
    ],
    dependencies: ['t4'],
  },
];

// 2. Agent selection
const assignments = {
  t1: 'cody',      // Code search - Cody specialty
  t2: 'cody',      // Code analysis - Cody specialty
  t3: 'gemini',    // Research - Gemini
  t4: 'cursor',    // Refactoring - Cursor (multi-file editing)
  t5: 'codex',     // Test generation - Codex
};

// 3. Execution
// Phase 1: Search + Research (t1, t3) - PARALLEL
// Phase 2: Analysis (t2) - Sequential (depends on t1)
// Phase 3: Refactoring (t4) - Sequential (depends on t2, t3)
// Phase 4: Tests (t5) - Sequential (depends on t4)

const result = await coordinator.execute(tasks, assignments);
```

### 6.3 Example 3: "Add Feature with Full Pipeline"

**User Request**: "Add email notification feature when todo is completed"

**Execution Flow**:

```typescript
// Use predefined workflow template
const workflow = config.workflows.add_feature;

// Override with specific details
const tasks = workflow.generateTasks({
  feature: 'email notifications',
  trigger: 'todo completed',
  integration: 'SendGrid',
});

// Tasks generated:
// 1. Research SendGrid API (gemini)
// 2. Design notification system (gemini)
// 3. Implement email service (codex)
// 4. Add webhook handler (codex)
// 5. Update todo completion logic (cursor - inline edit)
// 6. Generate tests (codex)
// 7. Update docs (gemini)
// 8. Git commit (aider)

// Multi-agent execution
const result = await coordinator.executeWorkflow('add_feature', {
  feature: 'email notifications',
  trigger: 'todo completed',
  integration: 'SendGrid',
});
```

### 6.4 Example 4: "Complex Multi-Agent Pipeline"

**User Request**: "Migrate Express API to Fastify with better error handling and add Prometheus metrics"

```typescript
// This is a COMPLEX task requiring multiple agents
const tasks = [
  // Phase 1: Analysis (Parallel)
  {
    id: 't1',
    type: TaskType.CODE_SEARCH,
    description: 'Find all Express route handlers',
    agent: 'cody',
  },
  {
    id: 't2',
    type: TaskType.CODE_ANALYSIS,
    description: 'Analyze Express middleware dependencies',
    agent: 'cody',
  },
  {
    id: 't3',
    type: TaskType.RESEARCH,
    description: 'Research Fastify best practices',
    agent: 'gemini',
  },
  {
    id: 't4',
    type: TaskType.RESEARCH,
    description: 'Research Prometheus integration patterns',
    agent: 'gemini',
  },

  // Phase 2: Planning (Sequential)
  {
    id: 't5',
    type: TaskType.ARCHITECTURE,
    description: 'Design Fastify migration strategy',
    agent: 'gemini',
    dependencies: ['t1', 't2', 't3'],
  },
  {
    id: 't6',
    type: TaskType.ARCHITECTURE,
    description: 'Design error handling architecture',
    agent: 'gemini',
    dependencies: ['t5'],
  },

  // Phase 3: Implementation (Mixed)
  {
    id: 't7',
    type: TaskType.CODE_GENERATION,
    description: 'Generate Fastify boilerplate',
    agent: 'codex',
    dependencies: ['t5'],
  },
  {
    id: 't8',
    type: TaskType.CODE_REFACTORING,
    description: 'Migrate route handlers to Fastify',
    agent: 'cursor', // Multi-file editing
    dependencies: ['t7'],
  },
  {
    id: 't9',
    type: TaskType.CODE_GENERATION,
    description: 'Implement centralized error handling',
    agent: 'codex',
    dependencies: ['t6', 't7'],
  },
  {
    id: 't10',
    type: TaskType.CODE_GENERATION,
    description: 'Implement Prometheus metrics',
    agent: 'codex',
    dependencies: ['t4', 't8'],
  },

  // Phase 4: Testing (Parallel)
  {
    id: 't11',
    type: TaskType.TEST_GENERATION,
    description: 'Generate route tests',
    agent: 'codex',
    dependencies: ['t8'],
  },
  {
    id: 't12',
    type: TaskType.TEST_GENERATION,
    description: 'Generate error handling tests',
    agent: 'codex',
    dependencies: ['t9'],
  },
  {
    id: 't13',
    type: TaskType.TEST_GENERATION,
    description: 'Generate metrics tests',
    agent: 'codex',
    dependencies: ['t10'],
  },

  // Phase 5: Documentation (Parallel)
  {
    id: 't14',
    type: TaskType.DOCUMENTATION,
    description: 'Update API documentation',
    agent: 'gemini',
    dependencies: ['t8'],
  },
  {
    id: 't15',
    type: TaskType.DOCUMENTATION,
    description: 'Document error codes',
    agent: 'gemini',
    dependencies: ['t9'],
  },

  // Phase 6: Git (Sequential)
  {
    id: 't16',
    type: TaskType.GIT_OPERATIONS,
    description: 'Commit migration changes',
    agent: 'aider',
    dependencies: ['t11', 't12', 't13', 't14', 't15'],
  },
];

// Execute with adaptive orchestration
const result = await coordinator.executeAdaptive(tasks);

// Coordinator automatically:
// - Executes Phase 1 tasks (t1-t4) in parallel
// - Sequences Phase 2 planning (t5-t6)
// - Mixes parallel/sequential for Phase 3 implementation
// - Parallelizes Phase 4 testing (t11-t13)
// - Parallelizes Phase 5 docs (t14-t15)
// - Sequences final git commit (t16)
//
// If any agent fails:
// - Retries with same agent
// - Falls back to alternative agent
// - Adjusts execution strategy
```

---

## 7. Migration from Current Design

### 7.1 Current Architecture Issues

**Problem 1**: Claude Flow is tightly coupled to Claude/Anthropic
```typescript
// Current (Wrong)
class ClaudeFlowAgent {
  private claude: Anthropic;

  async execute(task: string) {
    // Can ONLY use Claude
    return await this.claude.messages.create(...);
  }
}
```

**Problem 2**: No abstraction for other agents
```typescript
// Current (Wrong)
// Every agent is a separate implementation
// No unified interface
```

**Problem 3**: Hardcoded agent selection
```typescript
// Current (Wrong)
if (task.includes('code')) {
  useClaudeForCoding();
} else if (task.includes('research')) {
  useClaudeForResearch();
}
// Always Claude!
```

### 7.2 Migration Strategy

**Phase 1: Abstraction Layer**
1. Define `IAgentBackend` interface
2. Extract current Claude logic into `ClaudeAdapter`
3. Add adapter registry
4. Update coordinator to use adapters instead of direct Claude calls

```typescript
// Before
class Coordinator {
  private claude: Anthropic;

  async execute(task: string) {
    return await this.claude.messages.create(...);
  }
}

// After
class Coordinator {
  private registry: AdapterRegistry;
  private router: AgentRouter;

  async execute(task: Task) {
    const agent = await this.router.selectAgent(task, this.registry.getAll());
    return await agent.executeTask(task);
  }
}
```

**Phase 2: Additional Adapters**
1. Implement `CodexAdapter` for OpenAI
2. Implement `GeminiAdapter` for Google
3. Implement `CursorAdapter` for Cursor IDE
4. Test each adapter independently

**Phase 3: Agent Router**
1. Implement capability-based routing
2. Add scoring algorithm
3. Add performance tracking
4. Test routing decisions

**Phase 4: Orchestration**
1. Implement parallel orchestrator
2. Implement sequential orchestrator
3. Implement adaptive orchestrator
4. Add error handling & retry logic

**Phase 5: Configuration**
1. Define configuration schema
2. Implement config loader
3. Add environment variable support
4. Add programmatic config

**Phase 6: Testing**
1. Unit tests for each adapter
2. Integration tests for orchestration
3. End-to-end tests with real agents
4. Performance benchmarks

### 7.3 Backwards Compatibility

```typescript
/**
 * Compatibility layer for existing code
 */
class ClaudeFlowLegacy {
  private coordinator: Coordinator;

  constructor(config: LegacyConfig) {
    // Convert legacy config to new config
    const newConfig = this.convertConfig(config);
    this.coordinator = new Coordinator(newConfig);
  }

  /**
   * Legacy method - routes to coordinator
   */
  async execute(prompt: string): Promise<string> {
    const task: Task = {
      id: generateId(),
      type: TaskType.CODE_GENERATION,
      description: prompt,
      requiredCapabilities: [],
      dependencies: [],
      priority: 'medium',
      estimatedComplexity: 5,
      context: {},
    };

    const result = await this.coordinator.execute([task]);
    return result.output as string;
  }
}
```

### 7.4 Implementation Roadmap

**Week 1-2: Foundation**
- [ ] Define `IAgentBackend` interface
- [ ] Implement `BaseAgentAdapter`
- [ ] Extract Claude logic to `ClaudeAdapter`
- [ ] Implement `AdapterRegistry`
- [ ] Write unit tests

**Week 3-4: Core Adapters**
- [ ] Implement `CodexAdapter`
- [ ] Implement `GeminiAdapter`
- [ ] Implement `CursorAdapter`
- [ ] Test each adapter
- [ ] Integration tests

**Week 5-6: Routing & Orchestration**
- [ ] Implement `AgentRouter`
- [ ] Implement capability scoring
- [ ] Implement `ParallelOrchestrator`
- [ ] Implement `SequentialOrchestrator`
- [ ] Test orchestration patterns

**Week 7-8: Configuration & Error Handling**
- [ ] Define configuration schema
- [ ] Implement config loader
- [ ] Implement retry logic
- [ ] Implement error handling
- [ ] Add fallback mechanisms

**Week 9-10: Advanced Features**
- [ ] Implement `AdaptiveOrchestrator`
- [ ] Add performance tracking
- [ ] Add cost tracking
- [ ] Implement monitoring
- [ ] Add telemetry

**Week 11-12: Polish & Documentation**
- [ ] Write documentation
- [ ] Create examples
- [ ] Migration guide
- [ ] Performance benchmarks
- [ ] Release v3.0.0

---

## 8. Architecture Decision Records (ADRs)

### ADR-001: Universal Agent Interface

**Status**: Proposed

**Context**: Claude Flow needs to support multiple agent backends (Codex, Gemini, Cursor, etc.) with different APIs and capabilities.

**Decision**: Implement a universal `IAgentBackend` interface that all agents must implement through adapters.

**Consequences**:
- **Positive**: Agent-agnostic coordinator, easy to add new agents
- **Negative**: Overhead of adapter implementation
- **Mitigation**: Provide base adapter class with common functionality

### ADR-002: Capability-Based Routing

**Status**: Proposed

**Context**: Need intelligent routing of tasks to appropriate agents.

**Decision**: Use capability-based routing with scoring algorithm instead of hardcoded rules.

**Consequences**:
- **Positive**: Flexible, adapts to agent availability, optimizes for performance
- **Negative**: More complex than rule-based routing
- **Mitigation**: Provide sensible defaults, allow manual overrides

### ADR-003: Adaptive Orchestration

**Status**: Proposed

**Context**: Different tasks require different execution strategies (parallel vs sequential).

**Decision**: Implement adaptive orchestrator that dynamically adjusts strategy based on task analysis and intermediate results.

**Consequences**:
- **Positive**: Optimal performance, handles failures gracefully
- **Negative**: Non-deterministic execution order
- **Mitigation**: Provide logging for transparency, allow forcing specific strategies

### ADR-004: YAML Configuration

**Status**: Proposed

**Context**: Need human-readable configuration for agent backends and routing rules.

**Decision**: Use YAML for primary configuration format, support programmatic config as alternative.

**Consequences**:
- **Positive**: Human-readable, version controllable, widely understood
- **Negative**: Another config format to maintain
- **Mitigation**: Provide schema validation, good defaults

### ADR-005: Retry with Fallback

**Status**: Proposed

**Context**: Agents can fail due to rate limits, timeouts, or errors.

**Decision**: Implement retry logic with exponential backoff, then fallback to alternative agents.

**Consequences**:
- **Positive**: Resilient to transient failures, maximizes success rate
- **Negative**: Can increase latency
- **Mitigation**: Configurable retry limits, fast failure for critical issues

---

## 9. Future Enhancements

### 9.1 Agent Marketplace

Allow users to publish and discover custom agent adapters:

```typescript
// Install community adapter
npx claude-flow install @community/llama-adapter

// Use in config
agents:
  llama:
    type: llama
    enabled: true
    endpoint: http://localhost:8000
```

### 9.2 Agent Collaboration Protocols

Enable agents to communicate directly:

```typescript
interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  content: unknown;
}

// Codex asks Cody for code examples
const examples = await codex.send(cody, {
  type: 'request',
  content: { query: 'Find examples of React hooks' },
});
```

### 9.3 Learning & Optimization

Track agent performance and optimize routing:

```typescript
class LearningRouter extends AgentRouter {
  async learn(task: Task, agent: IAgentBackend, result: TaskResult) {
    // Update performance model
    await this.model.update({
      taskType: task.type,
      agentId: agent.id,
      success: result.status === 'success',
      duration: result.metadata.duration,
    });

    // Adjust routing weights
    this.weights.adjust(task.type, agent.id, result);
  }
}
```

### 9.4 Visual Workflow Builder

GUI for building multi-agent workflows:

```
┌──────────────────────────────────────────────┐
│  Claude Flow Workflow Builder                │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─────┐    ┌─────┐    ┌─────┐             │
│  │ 🔍  │───▶│ 🎨  │───▶│ 💾  │             │
│  │Cody │    │Codex│    │Aider│             │
│  └─────┘    └─────┘    └─────┘             │
│  Search     Generate   Commit              │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │ Task: Build authentication          │   │
│  │ Steps: Search → Generate → Commit   │   │
│  │ Expected: 2-3 minutes               │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  [Run Workflow]  [Save Template]            │
└──────────────────────────────────────────────┘
```

### 9.5 Multi-Tenant Support

Support multiple users/teams with isolation:

```typescript
class TenantIsolation {
  async execute(tenantId: string, task: Task) {
    const registry = this.getTenantRegistry(tenantId);
    const router = this.getTenantRouter(tenantId);

    return await router.execute(task, registry);
  }
}
```

---

## 10. Conclusion

This architecture transforms Claude Flow from a Claude-specific agent into a **universal coordinator** that can orchestrate ANY coding agent backend. The key innovations are:

1. **Universal Agent Interface**: Standardized contract for all agents
2. **Adapter Pattern**: Easy integration of new agents
3. **Capability-Based Routing**: Intelligent task-to-agent matching
4. **Multi-Agent Orchestration**: Parallel, sequential, and adaptive execution
5. **Extensible Configuration**: YAML + programmatic config
6. **Production-Ready**: Error handling, retry logic, monitoring

The result is a system where:
- **Users** can choose the best agents for their needs
- **Developers** can easily add new agent backends
- **Organizations** can optimize costs and performance
- **The ecosystem** benefits from standardization

**Next Steps**:
1. Review and approve this architecture
2. Begin Phase 1 implementation (abstraction layer)
3. Implement core adapters (Codex, Gemini, Cursor)
4. Build orchestration engine
5. Launch v3.0.0 with universal coordination

---

## Appendix

### A. Complete Type Definitions

See `/docs/architecture/types/` for complete TypeScript definitions:
- `agent-interface.ts` - IAgentBackend interface
- `task.ts` - Task and subtask types
- `config.ts` - Configuration schemas
- `orchestration.ts` - Orchestrator types

### B. Agent Comparison Matrix

| Agent | Code Gen | Refactor | Git | Search | Design | Research |
|-------|----------|----------|-----|--------|--------|----------|
| Codex | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Gemini | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Claude | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cursor | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |
| Aider | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |
| Cody | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

### C. References

- [A2A Protocol RFC-001](/docs/a2a-protocol-rfc-001.md)
- [Agent Architecture Patterns](https://martinfowler.com/articles/agent-architecture.html)
- [Capability-Based Security](https://en.wikipedia.org/wiki/Capability-based_security)
- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-01
**Authors**: Claude Flow Architecture Team
**Status**: Design Specification - Pending Approval
