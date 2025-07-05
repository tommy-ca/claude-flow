/**
 * Help text templates for Claude Flow CLI
 * Provides clear, actionable command documentation
 */

export const VERSION = '2.0.0';

export const MAIN_HELP = `
🌊 Claude-Flow v${VERSION} - Enterprise-Grade AI Agent Orchestration Platform

🎯 ENTERPRISE FEATURES: Complete ruv-swarm integration with 27 MCP tools, neural networking, and production-ready infrastructure

USAGE:
  claude-flow <command> [options]
  claude-flow <command> --help    # Get detailed help for any command

🚀 QUICK START:
  # First time setup (creates CLAUDE.md & .claude/commands)
  npx claude-flow@2.0.0 init --sparc
  
  # After setup, use without npx:
  claude-flow start --ui --swarm         # Start with swarm intelligence UI
  claude-flow swarm "build REST API"     # Deploy multi-agent workflow

📋 CORE COMMANDS:
  init                     Initialize Claude Flow v2.0.0 (creates CLAUDE.md & .claude/commands)
  start [--ui] [--swarm]   Start orchestration system
  swarm <objective>        Multi-agent swarm coordination
  agent <action>           Agent management (spawn, list, terminate)
  sparc <mode>             SPARC development modes (17 available)
  memory <action>          Persistent memory operations
  github <mode>            GitHub workflow automation (6 modes)
  status                   System status and health
  
📋 ADDITIONAL COMMANDS:
  task <action>            Task and workflow management
  config <action>          System configuration
  mcp <action>             MCP server management
  monitor                  Real-time system monitoring
  batch <action>           Batch operations

🔍 GET HELP:
  claude-flow --help                Show this help
  claude-flow help                  Show this help
  claude-flow help <command>        Detailed command help
  claude-flow <command> --help      Detailed command help

📚 Documentation: https://github.com/ruvnet/claude-code-flow
🐝 ruv-swarm: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm
`;

export const COMMAND_HELP = {
  swarm: `
🧠 SWARM COMMAND - Multi-Agent AI Coordination

USAGE:
  claude-flow swarm <objective> [options]

DESCRIPTION:
  Deploy intelligent multi-agent swarms to accomplish complex objectives.
  Agents work in parallel with neural optimization and real-time coordination.

OPTIONS:
  --strategy <type>    Execution strategy: research, development, analysis, 
                       testing, optimization, maintenance
  --mode <type>        Coordination mode: centralized, distributed, 
                       hierarchical, mesh, hybrid
  --max-agents <n>     Maximum number of agents (default: 5)
  --parallel           Enable parallel execution (2.8-4.4x speed improvement)
  --monitor            Real-time swarm monitoring
  --ui                 Interactive user interface
  --background         Run in background with progress tracking

EXAMPLES:
  claude-flow swarm "Build a REST API with authentication"
  claude-flow swarm "Research cloud architecture patterns" --strategy research
  claude-flow swarm "Optimize database queries" --max-agents 3 --parallel
  claude-flow swarm "Develop feature X" --strategy development --monitor --ui

AGENT TYPES:
  researcher    Research with web access and data analysis
  coder         Code development with neural patterns
  analyst       Performance analysis and optimization
  architect     System design with enterprise patterns
  tester        Comprehensive testing with automation
  coordinator   Multi-agent orchestration
`,

  github: `
🐙 GITHUB COMMAND - Workflow Automation

USAGE:
  claude-flow github <mode> <objective> [options]

DESCRIPTION:
  Automate GitHub workflows with 6 specialized AI-powered modes.
  Each mode handles specific aspects of repository management.

MODES:
  gh-coordinator      GitHub workflow orchestration and CI/CD
  pr-manager          Pull request management with reviews
  issue-tracker       Issue management and project coordination
  release-manager     Release coordination and deployment
  repo-architect      Repository structure optimization
  sync-coordinator    Multi-package synchronization

OPTIONS:
  --auto-approve      Automatically approve safe changes
  --dry-run           Preview changes without applying
  --verbose           Detailed operation logging
  --config <file>     Custom configuration file

EXAMPLES:
  claude-flow github pr-manager "create feature PR with tests"
  claude-flow github gh-coordinator "setup CI/CD pipeline" --auto-approve
  claude-flow github release-manager "prepare v2.0.0 release"
  claude-flow github repo-architect "optimize monorepo structure"
  claude-flow github issue-tracker "analyze and label issues"
  claude-flow github sync-coordinator "sync versions across packages"
`,

  agent: `
🤖 AGENT COMMAND - AI Agent Management

USAGE:
  claude-flow agent <action> [options]

ACTIONS:
  spawn <type>      Create new AI agent
  list              List all active agents
  terminate <id>    Terminate specific agent
  info <id>         Show agent details
  hierarchy         Manage agent hierarchies
  ecosystem         View agent ecosystem

OPTIONS:
  --name <name>     Custom agent name
  --verbose         Detailed output
  --json            JSON output format

AGENT TYPES:
  researcher        Research and data analysis
  coder            Code generation and refactoring
  analyst          Performance and security analysis
  architect        System design and architecture
  tester           Test creation and execution
  coordinator      Task coordination
  reviewer         Code and design review
  optimizer        Performance optimization

EXAMPLES:
  claude-flow agent spawn researcher --name "DataBot"
  claude-flow agent list --verbose
  claude-flow agent terminate agent-123
  claude-flow agent hierarchy create enterprise
  claude-flow agent ecosystem status
`,

  memory: `
💾 MEMORY COMMAND - Persistent Memory Management

USAGE:
  claude-flow memory <action> [options]

ACTIONS:
  store <key> <value>     Store data in memory
  get <key>               Retrieve stored data
  query <search>          Search memory contents
  list                    List all stored items
  delete <key>            Delete specific entry
  stats                   Memory usage statistics
  export <file>           Export memory to file
  import <file>           Import memory from file
  cleanup                 Clean old entries

OPTIONS:
  --namespace <ns>        Use specific namespace
  --format <type>         Output format (json, table)
  --verbose               Detailed output

EXAMPLES:
  claude-flow memory store architecture "microservices pattern"
  claude-flow memory get architecture
  claude-flow memory query "API design"
  claude-flow memory stats
  claude-flow memory export backup.json
  claude-flow memory cleanup --older-than 30d
`,

  sparc: `
🚀 SPARC COMMAND - Development Mode Operations

USAGE:
  claude-flow sparc [mode] [objective]
  claude-flow sparc <action>

DESCRIPTION:
  SPARC provides 17 specialized development modes for different workflows.
  Each mode optimizes AI assistance for specific tasks.

MODES:
  architect      System architecture and design
  code           Code generation and implementation
  tdd            Test-driven development workflow
  debug          Debugging and troubleshooting
  security       Security analysis and fixes
  refactor       Code refactoring and optimization
  docs           Documentation generation
  review         Code review and quality checks
  data           Data modeling and analysis
  api            API design and implementation
  ui             UI/UX development
  ops            DevOps and infrastructure
  ml             Machine learning workflows
  blockchain     Blockchain development
  mobile         Mobile app development
  game           Game development
  iot            IoT system development

ACTIONS:
  modes          List all available modes
  info <mode>    Show mode details
  run <mode>     Run specific mode

EXAMPLES:
  claude-flow sparc "design authentication system"    # Auto-select mode
  claude-flow sparc architect "design microservices"  # Use architect mode
  claude-flow sparc tdd "user registration feature"   # TDD workflow
  claude-flow sparc modes                            # List all modes
  claude-flow sparc info security                    # Mode details
`,

  init: `
🎯 INIT COMMAND - Initialize Claude Flow Environment

USAGE:
  claude-flow init [options]

DESCRIPTION:
  Initialize Claude Flow v2.0.0 in your project with full MCP integration.
  By default creates enhanced setup with CLAUDE.md and .claude/commands.

OPTIONS:
  --force          Overwrite existing configuration
  --dry-run        Preview what will be created
  --basic          Use basic initialization (pre-v2.0.0)
  --sparc          SPARC enterprise setup with additional features
  --minimal        Minimal setup without examples
  --template <t>   Use specific project template

WHAT claude-flow init CREATES (DEFAULT):
  📄 CLAUDE.md          AI-readable project instructions & context
  📁 .claude/           Enterprise configuration directory containing:
    └── commands/       Custom commands and automation scripts
    └── settings.json   Advanced configuration and hooks
    └── hooks/          Pre/post operation automation
  📋 .roomodes          17 specialized SPARC development modes
  
  CLAUDE.md CONTENTS:
  • Project overview and objectives
  • Technology stack and architecture
  • Development guidelines and patterns
  • AI-specific instructions for better assistance
  • Integration with ruv-swarm MCP tools
  
  .claude/commands INCLUDES:
  • Custom project-specific commands
  • Automated workflow scripts
  • Integration hooks for Claude Code
  • Team collaboration tools
  
  Features enabled:
  • ruv-swarm integration with 27 MCP tools
  • Neural network processing with WASM
  • Multi-agent coordination topologies
  • Cross-session memory persistence
  • GitHub workflow automation
  • Performance monitoring
  • Enterprise security features

EXAMPLES:
  npx claude-flow@2.0.0 init              # Default: Full v2.0.0 setup
  claude-flow init                        # Initialize with enhanced features
  claude-flow init --force                # Overwrite existing configuration
  claude-flow init --dry-run              # Preview what will be created
  claude-flow init --sparc                # SPARC enterprise setup
  claude-flow init --minimal              # Basic setup only
`,

  start: `
🚀 START COMMAND - Start Orchestration System

USAGE:
  claude-flow start [options]

DESCRIPTION:
  Start the Claude Flow orchestration system with optional UI and swarm intelligence.

OPTIONS:
  --ui             Enable interactive user interface
  --swarm          Enable swarm intelligence features
  --daemon         Run as background daemon
  --port <port>    MCP server port (default: 3000)
  --verbose        Detailed logging
  --config <file>  Custom configuration file

EXAMPLES:
  claude-flow start                      # Basic start
  claude-flow start --ui --swarm         # Full UI with swarm features
  claude-flow start --daemon             # Background daemon
  claude-flow start --port 8080          # Custom MCP port
  claude-flow start --config prod.json   # Production config
`,

  status: `
📊 STATUS COMMAND - System Status

USAGE:
  claude-flow status [options]

DESCRIPTION:
  Show comprehensive system status including agents, tasks, and resources.

OPTIONS:
  --verbose        Detailed system information
  --json           JSON output format
  --watch          Live updates
  --interval <ms>  Update interval (with --watch)

OUTPUT INCLUDES:
  • Orchestrator status
  • Active agents and their state
  • Task queue and progress
  • Memory usage statistics
  • MCP server status
  • System resources
  • Performance metrics

EXAMPLES:
  claude-flow status                     # Basic status
  claude-flow status --verbose           # Detailed information
  claude-flow status --json              # Machine-readable format
  claude-flow status --watch             # Live monitoring
`
};

export function getCommandHelp(command) {
  return COMMAND_HELP[command] || `Help not available for command: ${command}`;
}

export function getMainHelp() {
  return MAIN_HELP;
}