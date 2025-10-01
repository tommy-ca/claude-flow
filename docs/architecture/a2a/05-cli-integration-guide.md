# A2A Protocol Integration - CLI Integration Guide

## 1. Overview

### 1.1 What are CLI Agents?

CLI (Command-Line Interface) agents are AI assistants that operate through command-line executables rather than HTTP APIs or libraries. Examples include:

- **gemini-cli**: Google's Gemini via command-line tool
- **codex-cli**: Microsoft Codex command-line interface
- **cursor-cli**: Cursor AI command-line tool
- **aider**: AI pair programming assistant
- **any CLI tool**: Custom or third-party CLI agents

### 1.2 Why CLI Agents?

**Benefits**:
✅ **Simplicity**: No API keys or complex authentication in many cases
✅ **Portability**: Works across different environments
✅ **Isolation**: Process-level sandboxing
✅ **Flexibility**: Easy to prototype and test
✅ **Universality**: Almost any tool can be wrapped as a CLI agent

**Trade-offs**:
❌ **Performance**: Process spawn overhead (~100-500ms)
❌ **Resource Usage**: Each agent is a separate process
❌ **Communication**: Limited to stdio, files, or networking
❌ **State Management**: More complex than in-process agents

### 1.3 When to Use CLI vs API

| Criterion | CLI Agents | API Agents |
|-----------|------------|------------|
| **Startup Latency** | 100-500ms | <10ms |
| **Throughput** | ~10-100 req/s | 100-1000+ req/s |
| **Resource Usage** | High (process per agent) | Low (shared process) |
| **Isolation** | Excellent | Limited |
| **Simplicity** | High | Medium |
| **Best For** | Prototyping, isolation, portability | Production, performance |

**Recommendation**:
- Start with CLI for prototyping
- Move to API for production if performance matters
- Use CLI when isolation is critical
- Hybrid approach for best of both worlds

## 2. CLI Adapter Development

### 2.1 Step-by-Step Guide

#### Step 1: Research the CLI Tool

```bash
# Understand the CLI interface
gemini-cli --help

# Test basic commands
gemini-cli execute --prompt "Hello, world"

# Check version and capabilities
gemini-cli --version
gemini-cli capabilities

# Test input/output formats
echo '{"prompt": "test"}' | gemini-cli execute --format json
```

#### Step 2: Create the Adapter Class

```typescript
// src/a2a/adapters/gemini-cli-adapter.ts
import { AgentBase } from './agent-base';
import { CLIProcessManager } from './cli/process-manager';
import { ContextBuilder } from './cli/context-builder';

export class GeminiCLIAdapter extends AgentBase {
  private processManager: CLIProcessManager;
  private contextBuilder: ContextBuilder;
  private executable: string;

  constructor(config: AgentConfig) {
    super(config);
    this.executable = config.cliPath || 'gemini-cli';
    this.processManager = new CLIProcessManager({
      maxProcesses: 10,
      idleTimeout: 300000, // 5 minutes
      killTimeout: 5000,   // 5 seconds
    });
    this.contextBuilder = new ContextBuilder({
      strategy: 'stdin',      // preferred
      fallback: 'tempfile',   // if stdin fails
      format: 'json',
    });
  }

  protected async doSpawn(config: AgentConfig): Promise<void> {
    // Validate CLI is available
    await this.validateCLI();

    // Initialize process pool
    await this.processManager.initialize();

    // Store agent info
    this.id = generateAgentId();
    this.status = AgentStatus.ACTIVE;

    // Register with A2A registry
    await this.registerWithA2A();
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    // Build context
    const context = this.contextBuilder.build({
      agent: { id: this.id, platform: 'gemini-cli' },
      task,
      memory: await this.loadTaskMemory(task),
    });

    // Spawn or reuse process
    const process = await this.processManager.acquire({
      command: this.executable,
      args: ['execute', '--format', 'json'],
      cwd: task.context?.workingDir || process.cwd(),
      env: {
        ...process.env,
        A2A_AGENT_ID: this.id,
        A2A_TASK_ID: task.id,
      },
      timeout: task.constraints?.maxDuration || 300000,
    });

    try {
      // Send context via stdin
      await process.stdin.write(JSON.stringify(context) + '\n');

      // Read response from stdout
      const response = await process.stdout.read();

      // Parse result
      const result = this.parseResponse(response, task);

      // Release process back to pool
      await this.processManager.release(process);

      return result;
    } catch (error) {
      // Kill failed process
      await process.kill();
      throw new TaskExecutionError(task.id, error);
    }
  }

  private async validateCLI(): Promise<void> {
    try {
      const result = await spawn(this.executable, ['--version']);
      console.log(`Gemini CLI version: ${result.stdout}`);
    } catch (error) {
      throw new Error(`CLI not found: ${this.executable}`);
    }
  }

  private parseResponse(response: string, task: Task): TaskResult {
    try {
      const data = JSON.parse(response);
      return {
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        data: data.result,
        metrics: {
          tokensUsed: data.usage?.tokens,
          executionTime: data.duration,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse CLI response: ${error.message}`);
    }
  }

  protected async doGetCapabilities(): Promise<Capability[]> {
    // Query CLI for capabilities
    const process = await this.processManager.acquire({
      command: this.executable,
      args: ['capabilities', '--format', 'json'],
    });

    const response = await process.stdout.read();
    await this.processManager.release(process);

    return this.parseCapabilities(JSON.parse(response));
  }

  async terminate(): Promise<void> {
    // Cleanup all processes
    await this.processManager.shutdown();
    this.status = AgentStatus.TERMINATED;
  }
}
```

#### Step 3: Implement Process Manager

```typescript
// src/a2a/adapters/cli/process-manager.ts
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface ProcessConfig {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  timeout: number;
  maxMemory?: number;
  shell?: boolean;
}

export interface ManagedProcess {
  id: string;
  pid: number;
  config: ProcessConfig;
  status: 'starting' | 'running' | 'idle' | 'terminating';
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
  kill: () => Promise<void>;
  metrics: ProcessMetrics;
}

export interface ProcessMetrics {
  startTime: Date;
  lastActivity: Date;
  requestCount: number;
  errorCount: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class CLIProcessManager extends EventEmitter {
  private processes: Map<string, ManagedProcess>;
  private idleProcesses: ManagedProcess[];
  private config: ProcessManagerConfig;

  constructor(config: ProcessManagerConfig) {
    super();
    this.config = config;
    this.processes = new Map();
    this.idleProcesses = [];
  }

  async initialize(): Promise<void> {
    // Start cleanup timer
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  async acquire(config: ProcessConfig): Promise<ManagedProcess> {
    // Try to reuse idle process
    const idle = this.findIdleProcess(config);
    if (idle) {
      idle.status = 'running';
      idle.metrics.lastActivity = new Date();
      return idle;
    }

    // Check if we can spawn new process
    if (this.processes.size >= this.config.maxProcesses) {
      // Wait for a process to become available
      return this.waitForAvailableProcess(config);
    }

    // Spawn new process
    return this.spawnProcess(config);
  }

  async release(process: ManagedProcess): Promise<void> {
    process.status = 'idle';
    process.metrics.lastActivity = new Date();
    this.idleProcesses.push(process);
  }

  private async spawnProcess(config: ProcessConfig): Promise<ManagedProcess> {
    const processId = generateProcessId();

    const childProcess = spawn(config.command, config.args, {
      cwd: config.cwd,
      env: config.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: config.shell,
    });

    const managed: ManagedProcess = {
      id: processId,
      pid: childProcess.pid!,
      config,
      status: 'starting',
      stdin: childProcess.stdin,
      stdout: childProcess.stdout,
      stderr: childProcess.stderr,
      kill: async () => this.killProcess(childProcess),
      metrics: {
        startTime: new Date(),
        lastActivity: new Date(),
        requestCount: 0,
        errorCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    };

    // Monitor process
    this.monitorProcess(managed, childProcess);

    // Wait for process to be ready
    await this.waitForReady(childProcess);

    managed.status = 'running';
    this.processes.set(processId, managed);
    this.emit('process:spawned', managed);

    return managed;
  }

  private monitorProcess(
    managed: ManagedProcess,
    childProcess: ChildProcess
  ): void {
    // Monitor stdout
    childProcess.stdout.on('data', (data) => {
      this.emit('process:stdout', managed, data);
    });

    // Monitor stderr
    childProcess.stderr.on('data', (data) => {
      this.emit('process:stderr', managed, data);
      managed.metrics.errorCount++;
    });

    // Monitor exit
    childProcess.on('exit', (code, signal) => {
      this.handleProcessExit(managed, code, signal);
    });

    // Monitor errors
    childProcess.on('error', (error) => {
      this.handleProcessError(managed, error);
    });

    // Monitor resource usage (if available)
    if (process.platform === 'linux') {
      this.monitorResourceUsage(managed);
    }
  }

  private async killProcess(childProcess: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      // Try graceful shutdown
      childProcess.kill('SIGTERM');

      // Force kill after timeout
      const killTimer = setTimeout(() => {
        childProcess.kill('SIGKILL');
      }, this.config.killTimeout);

      childProcess.on('exit', () => {
        clearTimeout(killTimer);
        resolve();
      });
    });
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    const idleTimeout = this.config.idleTimeout;

    // Find idle processes that exceeded timeout
    const toKill = this.idleProcesses.filter((process) => {
      const idle = now - process.metrics.lastActivity.getTime();
      return idle > idleTimeout;
    });

    // Kill them
    for (const process of toKill) {
      await process.kill();
      this.processes.delete(process.id);
      this.idleProcesses = this.idleProcesses.filter((p) => p.id !== process.id);
      this.emit('process:cleaned', process);
    }
  }

  async shutdown(): Promise<void> {
    // Kill all processes
    const promises = Array.from(this.processes.values()).map((p) => p.kill());
    await Promise.all(promises);
    this.processes.clear();
    this.idleProcesses = [];
  }
}
```

#### Step 4: Implement Context Builder

```typescript
// src/a2a/adapters/cli/context-builder.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface ContextStrategy {
  strategy: 'stdin' | 'tempfile' | 'workingdir' | 'env' | 'args';
  fallback?: 'stdin' | 'tempfile' | 'workingdir';
  format: 'json' | 'yaml' | 'text';
}

export class ContextBuilder {
  private strategy: ContextStrategy;

  constructor(strategy: ContextStrategy) {
    this.strategy = strategy;
  }

  build(context: SerializedContext): BuiltContext {
    const serialized = this.serialize(context);

    switch (this.strategy.strategy) {
      case 'stdin':
        return this.buildStdinContext(serialized);
      case 'tempfile':
        return this.buildTempFileContext(serialized);
      case 'workingdir':
        return this.buildWorkingDirContext(serialized);
      case 'env':
        return this.buildEnvContext(serialized);
      case 'args':
        return this.buildArgsContext(serialized);
      default:
        throw new Error(`Unknown strategy: ${this.strategy.strategy}`);
    }
  }

  private serialize(context: SerializedContext): string {
    switch (this.strategy.format) {
      case 'json':
        return JSON.stringify(context, null, 2);
      case 'yaml':
        return yaml.stringify(context);
      case 'text':
        return this.serializeAsText(context);
      default:
        throw new Error(`Unknown format: ${this.strategy.format}`);
    }
  }

  private buildStdinContext(serialized: string): BuiltContext {
    return {
      type: 'stdin',
      data: serialized,
      cleanup: async () => {
        // No cleanup needed for stdin
      },
    };
  }

  private async buildTempFileContext(serialized: string): Promise<BuiltContext> {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `a2a-context-${Date.now()}.json`);

    await fs.writeFile(tempFile, serialized, 'utf-8');

    return {
      type: 'tempfile',
      path: tempFile,
      data: serialized,
      cleanup: async () => {
        await fs.unlink(tempFile).catch(() => {
          // Ignore errors
        });
      },
    };
  }

  private async buildWorkingDirContext(
    serialized: string
  ): Promise<BuiltContext> {
    const contextDir = '.a2a';
    const contextFile = path.join(contextDir, 'context.json');

    // Ensure directory exists
    await fs.mkdir(contextDir, { recursive: true });

    // Write context
    await fs.writeFile(contextFile, serialized, 'utf-8');

    return {
      type: 'workingdir',
      path: contextFile,
      data: serialized,
      cleanup: async () => {
        // Keep working dir context for debugging
      },
    };
  }

  private buildEnvContext(serialized: string): BuiltContext {
    // For small data only
    if (serialized.length > 4096) {
      throw new Error('Context too large for environment variables');
    }

    // Encode as base64
    const encoded = Buffer.from(serialized).toString('base64');

    return {
      type: 'env',
      env: {
        A2A_CONTEXT: encoded,
      },
      cleanup: async () => {
        // No cleanup needed
      },
    };
  }

  private buildArgsContext(serialized: string): BuiltContext {
    // Parse context to extract key fields
    const context = JSON.parse(serialized);

    return {
      type: 'args',
      args: [
        '--agent-id',
        context.agent.id,
        '--task-id',
        context.task.id,
        '--task-type',
        context.task.type,
      ],
      cleanup: async () => {
        // No cleanup needed
      },
    };
  }
}
```

### 2.2 Code Templates

#### Basic CLI Adapter Template

```typescript
// template-cli-adapter.ts
import { AgentBase } from '../agent-base';

export class TemplateCLIAdapter extends AgentBase {
  // TODO: Add your CLI tool name
  private cliCommand = 'your-cli-tool';

  protected async doSpawn(config: AgentConfig): Promise<void> {
    // TODO: Initialize your CLI adapter
    // 1. Validate CLI is available
    // 2. Set up process manager
    // 3. Configure context builder
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    // TODO: Execute task via CLI
    // 1. Build context
    // 2. Spawn/reuse process
    // 3. Send input
    // 4. Read output
    // 5. Parse result
    throw new Error('Not implemented');
  }

  protected async doGetCapabilities(): Promise<Capability[]> {
    // TODO: Query CLI for capabilities
    throw new Error('Not implemented');
  }
}
```

### 2.3 Best Practices

**DO**:
✅ Reuse processes when possible (pooling)
✅ Implement timeouts for all operations
✅ Handle process crashes gracefully
✅ Clean up zombie processes
✅ Monitor resource usage
✅ Use structured logging
✅ Validate CLI output format
✅ Test error scenarios

**DON'T**:
❌ Spawn unlimited processes
❌ Block waiting for process indefinitely
❌ Ignore stderr output
❌ Hard-code paths (use configuration)
❌ Trust CLI output without validation
❌ Forget to clean up temp files
❌ Skip error handling
❌ Ignore resource limits

## 3. Configuration

### 3.1 Environment Setup

```bash
# Add CLI tools to PATH
export PATH="/path/to/cli/tools:$PATH"

# Configure A2A CLI settings
export A2A_CLI_MAX_PROCESSES=50
export A2A_CLI_IDLE_TIMEOUT=300000
export A2A_CLI_SPAWN_TIMEOUT=10000
export A2A_CLI_KILL_TIMEOUT=5000

# Configure specific CLI tools
export GEMINI_API_KEY="your-api-key"
export CODEX_AUTH_TOKEN="your-token"
```

### 3.2 Configuration File

```yaml
# config/a2a-cli.yaml
cli:
  process_manager:
    max_processes: 50
    idle_timeout: 300000  # 5 minutes
    spawn_timeout: 10000  # 10 seconds
    kill_timeout: 5000    # 5 seconds
    pool_strategy: 'fifo' # or 'lru'

  context_builder:
    default_strategy: 'stdin'
    fallback_strategy: 'tempfile'
    format: 'json'
    compression: false

  adapters:
    gemini-cli:
      enabled: true
      executable: 'gemini-cli'
      default_args: ['--format', 'json']
      timeout: 300000
      max_memory: 2048  # MB

    codex-cli:
      enabled: true
      executable: 'codex-cli'
      default_args: []
      timeout: 600000
      max_memory: 4096  # MB

  resource_limits:
    max_cpu_percent: 80
    max_memory_mb: 4096
    max_file_descriptors: 1024
```

### 3.3 Authentication

```typescript
// Handle CLI authentication
class CLIAuthManager {
  async authenticate(platform: string): Promise<void> {
    switch (platform) {
      case 'gemini-cli':
        // Check for API key
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY not set');
        }
        break;

      case 'codex-cli':
        // Authenticate via OAuth
        await this.authenticateCodex();
        break;

      default:
        // No authentication needed
        break;
    }
  }

  private async authenticateCodex(): Promise<void> {
    // Run authentication flow
    const result = await spawn('codex-cli', ['auth', 'login']);
    if (result.exitCode !== 0) {
      throw new Error('Authentication failed');
    }
  }
}
```

### 3.4 Resource Limits

```typescript
// Set resource limits for spawned processes
import { spawn } from 'child_process';
import { setrlimit } from 'posix';

function spawnWithLimits(config: ProcessConfig): ChildProcess {
  const child = spawn(config.command, config.args, {
    cwd: config.cwd,
    env: config.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Set resource limits (Linux only)
  if (process.platform === 'linux') {
    try {
      // Limit CPU time
      setrlimit('cpu', { soft: 300, hard: 600 }); // seconds

      // Limit memory
      setrlimit('as', { soft: 4096 * 1024 * 1024, hard: 4096 * 1024 * 1024 });

      // Limit file descriptors
      setrlimit('nofile', { soft: 1024, hard: 2048 });
    } catch (error) {
      console.warn('Failed to set resource limits:', error);
    }
  }

  return child;
}
```

## 4. Usage Examples

### 4.1 Basic Invocation

```typescript
// Create and use a CLI agent
import { GeminiCLIAdapter } from './adapters/gemini-cli-adapter';

async function example() {
  // Create agent
  const agent = new GeminiCLIAdapter({
    name: 'Gemini Research Agent',
    type: 'researcher',
    platform: 'gemini-cli',
    cliPath: '/usr/local/bin/gemini-cli',
  });

  // Spawn agent
  await agent.spawn();

  // Execute task
  const result = await agent.executeTask({
    id: 'task-123',
    type: 'research',
    description: 'Research quantum computing advances',
    parameters: {
      query: 'latest quantum computing breakthroughs 2025',
      depth: 'comprehensive',
    },
    constraints: {
      maxDuration: 300,
      maxTokens: 50000,
    },
  });

  console.log('Result:', result);

  // Cleanup
  await agent.terminate();
}
```

### 4.2 Streaming Responses

```typescript
// Handle streaming output from CLI
async function streamingExample() {
  const agent = new GeminiCLIAdapter(config);
  await agent.spawn();

  // Subscribe to stdout
  agent.on('stdout', (data) => {
    try {
      const line = JSON.parse(data);
      if (line.type === 'progress') {
        console.log(`Progress: ${line.percent}%`);
      } else if (line.type === 'result') {
        console.log('Result:', line.data);
      }
    } catch (error) {
      // Not JSON, treat as text
      console.log('Output:', data.toString());
    }
  });

  // Execute task
  await agent.executeTask(task);
}
```

### 4.3 Multi-Agent Workflows

```typescript
// Coordinate multiple CLI agents
async function multiAgentWorkflow() {
  // Create agents
  const researcher = new GeminiCLIAdapter({
    name: 'Researcher',
    type: 'researcher',
  });

  const coder = new CodexCLIAdapter({
    name: 'Coder',
    type: 'coder',
  });

  // Spawn agents
  await Promise.all([researcher.spawn(), coder.spawn()]);

  // Research phase
  const researchResult = await researcher.executeTask({
    id: 'research-task',
    type: 'research',
    description: 'Research algorithms',
  });

  // Store research in shared memory
  await memoryManager.write(
    'research/algorithms',
    researchResult.data,
    'project/ml-app'
  );

  // Coding phase (uses research from memory)
  const codeResult = await coder.executeTask({
    id: 'code-task',
    type: 'coding',
    description: 'Implement algorithm from research',
    context: {
      sharedMemoryKeys: ['research/algorithms'],
    },
  });

  console.log('Implementation:', codeResult);

  // Cleanup
  await Promise.all([researcher.terminate(), coder.terminate()]);
}
```

### 4.4 Error Handling

```typescript
// Robust error handling for CLI agents
async function robustExample() {
  const agent = new GeminiCLIAdapter(config);

  try {
    await agent.spawn();

    const result = await agent.executeTask(task);
    return result;
  } catch (error) {
    if (error instanceof ProcessSpawnError) {
      // CLI not found or failed to start
      console.error('Failed to spawn process:', error.message);
      // Try alternative CLI or fallback
    } else if (error instanceof ProcessTimeoutError) {
      // Process exceeded timeout
      console.error('Task timed out:', error.message);
      // Retry with longer timeout
    } else if (error instanceof ProcessCrashedError) {
      // Process crashed unexpectedly
      console.error('Process crashed:', error.message);
      // Restart and retry
    } else if (error instanceof InvalidOutputError) {
      // CLI returned invalid output
      console.error('Invalid output:', error.message);
      // Log output for debugging
    }

    throw error;
  } finally {
    // Always cleanup
    await agent.terminate().catch(() => {
      // Ignore cleanup errors
    });
  }
}
```

## 5. Troubleshooting

### 5.1 Common Issues

#### Issue: CLI Not Found

**Symptoms**:
```
Error: spawn gemini-cli ENOENT
```

**Solutions**:
1. Check CLI is installed: `which gemini-cli`
2. Add to PATH: `export PATH="/path/to/cli:$PATH"`
3. Use absolute path in config: `cliPath: '/usr/local/bin/gemini-cli'`

#### Issue: Process Timeout

**Symptoms**:
```
ProcessTimeoutError: Process exceeded 300s timeout
```

**Solutions**:
1. Increase timeout in task constraints
2. Check if CLI is hanging (inspect stderr)
3. Verify CLI has necessary resources
4. Test CLI manually with same input

#### Issue: Invalid Output Format

**Symptoms**:
```
InvalidOutputError: Failed to parse CLI response
```

**Solutions**:
1. Check CLI output format: `gemini-cli execute --format json`
2. Validate JSON: `gemini-cli execute | jq`
3. Check for error messages in stderr
4. Enable debug logging to see raw output

#### Issue: Resource Exhaustion

**Symptoms**:
```
Error: Cannot spawn process: Maximum processes reached
```

**Solutions**:
1. Increase max processes: `A2A_CLI_MAX_PROCESSES=100`
2. Reduce idle timeout to free processes faster
3. Check for zombie processes: `ps aux | grep gemini-cli`
4. Implement process pooling more aggressively

### 5.2 Debug Techniques

#### Enable Debug Logging

```typescript
// Enable detailed logging
import { setLogLevel } from './utils/logger';

setLogLevel('debug');

// Log all CLI interactions
agent.on('process:spawn', (process) => {
  console.log('Spawned:', process.pid, process.config.command);
});

agent.on('process:stdout', (process, data) => {
  console.log('stdout:', data.toString());
});

agent.on('process:stderr', (process, data) => {
  console.error('stderr:', data.toString());
});

agent.on('process:exit', (process, code, signal) => {
  console.log('Exit:', process.pid, 'code=', code, 'signal=', signal);
});
```

#### Test CLI Manually

```bash
# Test CLI directly
gemini-cli execute --format json <<EOF
{
  "prompt": "test prompt",
  "max_tokens": 1000
}
EOF

# Check exit code
echo $?

# Time the execution
time gemini-cli execute --prompt "test"

# Monitor resource usage
/usr/bin/time -v gemini-cli execute --prompt "test"
```

#### Inspect Process State

```bash
# List all CLI processes
ps aux | grep gemini-cli

# Check process details
ps -p <pid> -o pid,ppid,cmd,etime,%cpu,%mem

# Monitor in real-time
watch -n 1 'ps aux | grep gemini-cli'

# Check file descriptors
lsof -p <pid>

# Check memory usage
pmap <pid>
```

### 5.3 Performance Tuning

#### Optimize Process Pooling

```typescript
// Configure aggressive pooling
const processManager = new CLIProcessManager({
  maxProcesses: 100,        // Allow more concurrent processes
  idleTimeout: 600000,      // Keep idle processes longer (10 min)
  poolStrategy: 'lru',      // Use least-recently-used eviction
  preWarmCount: 5,          // Keep 5 warm processes ready
});
```

#### Optimize Context Passing

```typescript
// Use fastest context strategy
const contextBuilder = new ContextBuilder({
  strategy: 'stdin',        // Fastest for small data
  fallback: 'tempfile',     // For large data
  format: 'json',           // Fastest format
  compression: false,       // Disable unless data is huge
});

// Or use environment for small metadata
const contextBuilder = new ContextBuilder({
  strategy: 'env',          // Fastest for tiny data
  format: 'json',
});
```

#### Optimize Output Parsing

```typescript
// Stream and parse incrementally
const parser = new StreamingJSONParser();

process.stdout.on('data', (chunk) => {
  // Parse each line as it arrives (NDJSON)
  const lines = chunk.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        const data = JSON.parse(line);
        handleData(data);
      } catch (error) {
        // Incomplete line, buffer it
      }
    }
  }
});
```

---

## Summary

This guide covered:

1. **Overview**: When and why to use CLI agents
2. **Development**: Step-by-step adapter creation
3. **Configuration**: Environment and resource setup
4. **Usage**: Practical examples and patterns
5. **Troubleshooting**: Common issues and solutions

**Next Steps**:
- Read the [Architecture document](./02-architecture.md) for system design
- Check [Interface Contracts](./03-interface-contracts.md) for API details
- Review [Implementation Roadmap](./04-implementation-roadmap.md) for timeline

**Key Takeaways**:
- CLI agents provide isolation and portability
- Process pooling is essential for performance
- Context passing strategies matter for different use cases
- Error handling and resource management are critical
- Monitoring and debugging tools are your friends
