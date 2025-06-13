// sparc-commands.js - SPARC-specific slash commands

// Create SPARC mode slash command
export function createSparcSlashCommand(mode) {
  // Extract the full description without truncation
  const fullDescription = mode.roleDefinition.length > 100 
    ? `${mode.roleDefinition.substring(0, 97)}...` 
    : mode.roleDefinition;

  return `---
name: sparc-${mode.slug}
description: ${mode.name} - ${fullDescription}
---

# ${mode.name}

## Role Definition
${mode.roleDefinition}

## Custom Instructions
${mode.customInstructions}

## Available Tools
${Array.isArray(mode.groups) ? mode.groups.map(g => {
  if (typeof g === 'string') {
    return `- **${g}**: ${getToolDescription(g)}`;
  } else if (Array.isArray(g)) {
    return `- **${g[0]}**: ${g[1]?.description || getToolDescription(g[0])} ${g[1]?.fileRegex ? `(Files matching: ${g[1].fileRegex})` : ''}`;
  }
  return `- ${JSON.stringify(g)}`;
}).join('\n') : 'None'}

## Usage

This SPARC mode provides specialized AI assistance for ${getModePurpose(mode.slug)}.

### Running this mode:
\`\`\`bash
# Direct execution
./claude-flow sparc run ${mode.slug} "your task"

# With specific namespace for context isolation
./claude-flow sparc run ${mode.slug} "your task" --namespace ${mode.slug}

# Non-interactive mode for CI/CD pipelines
./claude-flow sparc run ${mode.slug} "your task" --non-interactive
\`\`\`

## Example Commands

\`\`\`bash
# Run this specific mode
./claude-flow sparc run ${mode.slug} "${getExampleTask(mode.slug)}"

# Use with memory namespace
./claude-flow sparc run ${mode.slug} "your task" --namespace ${mode.slug}

# Non-interactive mode for automation
./claude-flow sparc run ${mode.slug} "your task" --non-interactive
\`\`\`

## Memory Integration

\`\`\`bash
# Store mode-specific context
./claude-flow memory store "${mode.slug}_context" "important decisions" --namespace ${mode.slug}

# Query previous work
./claude-flow memory query "${mode.slug}" --limit 5
\`\`\`
`;
}

// Helper function to get tool descriptions
function getToolDescription(tool) {
  const toolDescriptions = {
    'read': 'File reading and viewing',
    'edit': 'File modification and creation',
    'browser': 'Web browsing capabilities',
    'mcp': 'Model Context Protocol tools',
    'command': 'Command execution'
  };
  return toolDescriptions[tool] || 'Tool access';
}

// Helper function to get mode purpose
function getModePurpose(slug) {
  const purposes = {
    'architect': 'system design and architecture planning',
    'code': 'clean, modular code implementation',
    'tdd': 'test-driven development workflows',
    'debug': 'troubleshooting and optimization',
    'security-review': 'security analysis and vulnerability assessment',
    'docs-writer': 'comprehensive documentation creation',
    'integration': 'system integration and coordination',
    'post-deployment-monitoring-mode': 'production monitoring and observability',
    'refinement-optimization-mode': 'performance optimization and refactoring',
    'devops': 'deployment and infrastructure automation',
    'supabase-admin': 'Supabase database and authentication management',
    'spec-pseudocode': 'requirements specification and pseudocode planning',
    'mcp': 'external service integration via Model Context Protocol',
    'swarm': 'multi-agent coordination for complex tasks',
    'sparc': 'full SPARC methodology orchestration',
    'ask': 'guidance on choosing appropriate SPARC modes',
    'tutorial': 'learning the SPARC methodology'
  };
  return purposes[slug] || 'specialized development tasks';
}

// Helper function to get example tasks
function getExampleTask(slug) {
  const examples = {
    'architect': 'design microservices architecture',
    'code': 'implement REST API endpoints',
    'tdd': 'create user authentication tests',
    'debug': 'fix memory leak in service',
    'security-review': 'audit API security',
    'docs-writer': 'create API documentation',
    'integration': 'connect payment service',
    'post-deployment-monitoring-mode': 'monitor production metrics',
    'refinement-optimization-mode': 'optimize database queries',
    'devops': 'deploy to AWS Lambda',
    'supabase-admin': 'create user authentication schema',
    'spec-pseudocode': 'define payment flow requirements',
    'mcp': 'integrate with external API',
    'swarm': 'build complete feature with tests',
    'sparc': 'orchestrate authentication system',
    'ask': 'help me choose the right mode',
    'tutorial': 'guide me through SPARC methodology'
  };
  return examples[slug] || 'implement feature';
}

// Create main SPARC command
export function createMainSparcCommand(modes) {
  const modeList = modes.map(m => `- \`/sparc-${m.slug}\` - ${m.name}`).join('\n');
  
  return `---
name: sparc
description: Execute SPARC methodology workflows with Claude-Flow orchestration platform
---

# ⚡️ SPARC Development Methodology with Claude-Flow

SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) is a systematic development methodology integrated with Claude-Flow's advanced orchestration capabilities.

## 🌊 Claude-Flow Integration

Claude-Flow provides:
- **Multi-Agent Orchestration**: Coordinate multiple AI agents for complex tasks
- **Persistent Memory**: Cross-session knowledge retention and sharing
- **Timeout-Free Execution**: Background processing for long-running tasks
- **Real-Time Monitoring**: Track progress and system health
- **Automated Workflows**: CI/CD-ready with non-interactive mode

## Available SPARC Modes

${modeList}

## Quick Start

### Run SPARC orchestrator (default):
\`\`\`bash
./claude-flow sparc "build complete authentication system"
\`\`\`

### Run a specific mode:
\`\`\`bash
./claude-flow sparc run <mode> "your task"
./claude-flow sparc run architect "design API structure"
./claude-flow sparc run tdd "implement user service"
\`\`\`

### Execute full TDD workflow:
\`\`\`bash
./claude-flow sparc tdd "implement user authentication"
\`\`\`

### List all modes with details:
\`\`\`bash
./claude-flow sparc modes --verbose
\`\`\`

## SPARC Methodology Phases

1. **📋 Specification Phase**
   - Define clear functional and non-functional requirements
   - Document constraints, edge cases, and acceptance criteria
   - Create user stories and use cases
   - Command: \`./claude-flow sparc run spec-pseudocode "define requirements"\`

2. **🧠 Pseudocode Phase**
   - Develop algorithmic logic and data flow diagrams
   - Plan modular component boundaries
   - Define interfaces and contracts
   - Command: \`./claude-flow sparc run spec-pseudocode "create logic flow"\`

3. **🏗️ Architecture Phase**
   - Design scalable system architecture
   - Create API specifications and database schemas
   - Plan security and deployment strategies
   - Command: \`./claude-flow sparc run architect "design system"\`

4. **🔄 Refinement Phase (TDD)**
   - Implement using Test-Driven Development
   - Follow Red-Green-Refactor cycle
   - Maintain high test coverage (>90%)
   - Command: \`./claude-flow sparc tdd "implement feature"\`

5. **✅ Completion Phase**
   - Integrate all components
   - Validate against original requirements
   - Create comprehensive documentation
   - Command: \`./claude-flow sparc run integration "finalize system"\`

## 🧠 Claude-Flow Memory Integration

Leverage Claude-Flow's persistent memory system for seamless context sharing:

### Storing Context
\`\`\`bash
# Store phase-specific information
./claude-flow memory store "spec_requirements" "User auth with OAuth2/JWT" --namespace spec
./claude-flow memory store "arch_decisions" "Microservices with API Gateway" --namespace arch
./claude-flow memory store "test_coverage" "Auth module: 95% coverage" --namespace test
\`\`\`

### Retrieving Context
\`\`\`bash
# Query across all namespaces
./claude-flow memory query "authentication"

# Query specific namespace
./claude-flow memory query "design patterns" --namespace arch --limit 5
\`\`\`

### Managing Project Memory
\`\`\`bash
# Export for backup or sharing
./claude-flow memory export project-backup-$(date +%Y%m%d).json

# Import previous project context
./claude-flow memory import project-context.json

# View memory statistics
./claude-flow memory stats
\`\`\`

## 🐝 Advanced Swarm Orchestration

Claude-Flow's swarm system enables multi-agent coordination for complex SPARC workflows:

### Development Swarms
\`\`\`bash
# Full-stack development with review process
./claude-flow swarm "Build REST API with authentication" \\
  --strategy development --monitor --review --testing

# Parallel feature development
./claude-flow swarm "Implement user management system" \\
  --strategy development --parallel --max-agents 8
\`\`\`

### Long-Running Tasks
\`\`\`bash
# Background execution (timeout-free)
./claude-flow swarm "Refactor legacy codebase" \\
  --strategy optimization --background --monitor

# Distributed coordination
./claude-flow swarm "Large-scale data migration" \\
  --strategy maintenance --distributed --ui
\`\`\`

### Research & Analysis
\`\`\`bash
# Comprehensive research swarm
./claude-flow swarm "Analyze technology stack options" \\
  --strategy research --parallel --verbose
\`\`\`

## 🤖 Automation & CI/CD Integration

Claude-Flow supports automated workflows with non-interactive mode:

### Automated Development
\`\`\`bash
# Code generation in CI pipeline
./claude-flow sparc run code "implement user service" --non-interactive

# Automated testing
./claude-flow sparc tdd "payment processing" --non-interactive

# Architecture validation
./claude-flow sparc run architect "validate design" --non-interactive
\`\`\`

### Batch Processing
\`\`\`bash
# Execute workflow configuration
./claude-flow workflow sparc-pipeline.json --non-interactive

# Run multiple SPARC modes in sequence
./claude-flow sparc run spec-pseudocode "define API" --non-interactive && \\
./claude-flow sparc run architect "design API" --non-interactive && \\
./claude-flow sparc run code "implement API" --non-interactive
\`\`\`

## 📊 Claude-Flow Capabilities

### System Features
- **Agent Management**: Spawn and coordinate multiple AI agents
- **Task Scheduling**: Advanced scheduling with dependency resolution
- **Resource Pooling**: Efficient terminal and resource management
- **Error Recovery**: Automatic retry with circuit breakers
- **Performance Monitoring**: Real-time metrics and health checks

### Command Examples
\`\`\`bash
# Check system status
./claude-flow status

# Monitor in real-time
./claude-flow monitor

# Spawn specialized agents
./claude-flow agent spawn researcher --name "Senior Researcher"
./claude-flow agent spawn developer --name "Lead Developer"

# Create and track tasks
./claude-flow task create research "Analyze best practices"
./claude-flow task list --verbose
\`\`\`

## 🎯 SPARC Best Practices

✅ **Modular Architecture**: Maintain files under 500 lines for clarity
✅ **Security First**: Never expose secrets or environment-specific values
✅ **Test-Driven**: Write tests before implementation (Red-Green-Refactor)
✅ **Context Persistence**: Use memory system for cross-session continuity
✅ **Incremental Development**: Break complex tasks into manageable phases
✅ **Documentation**: Maintain up-to-date docs throughout development

## 🚀 Getting Started

1. Initialize SPARC environment: \`npx -y claude-flow@latest init --sparc\`
2. Start orchestrator: \`./claude-flow start --ui\`
3. Run SPARC workflow: \`./claude-flow sparc "your project"\`

For comprehensive documentation, see \`/claude-flow-help\` or visit:
https://github.com/ruvnet/claude-code-flow
`;
}