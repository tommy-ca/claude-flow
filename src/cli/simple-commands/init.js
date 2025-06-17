// init.js - Initialize Claude Code integration files
import { printSuccess, printError, printWarning, printInfo } from '../utils.js';
import { claudeFlowCommandsTemplate, sparcCommandsTemplate } from './init/claude-commands/index.js';
import path from 'node:path';

// CLAUDE.md template
const claudeMdTemplate = `# Claude Code Configuration - SPARC Development Environment

## Project Overview
This project uses the SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology for systematic Test-Driven Development with AI assistance through Claude-Flow orchestration.

## SPARC Development Commands

### Core SPARC Commands
- \`npx claude-flow sparc modes\`: List all available SPARC development modes
- \`npx claude-flow sparc run <mode> "<task>"\`: Execute specific SPARC mode for a task
- \`npx claude-flow sparc tdd "<feature>"\`: Run complete TDD workflow using SPARC methodology
- \`npx claude-flow sparc info <mode>\`: Get detailed information about a specific mode

### Standard Build Commands
- \`npm run build\`: Build the project
- \`npm run test\`: Run the test suite
- \`npm run lint\`: Run linter and format checks
- \`npm run typecheck\`: Run TypeScript type checking

## SPARC Methodology Workflow

### 1. Specification Phase
Define clear functional requirements, edge cases, and acceptance criteria.

### 2. Pseudocode Phase
Break down complex logic into steps and plan data structures.

### 3. Architecture Phase
Design system architecture and component relationships.

### 4. Refinement Phase (TDD Implementation)
Execute Test-Driven Development cycle:
- **Red**: Write failing tests first
- **Green**: Implement minimal code to pass tests
- **Refactor**: Optimize and clean up code
- **Repeat**: Continue until feature is complete

### 5. Completion Phase
Integration testing, documentation, and validation.

## Important Notes
- Always run tests before committing (\`npm run test\`)
- Use SPARC memory system to maintain context across sessions
- Follow the Red-Green-Refactor cycle during TDD phases
- Document architectural decisions in memory for future reference
- Regular security reviews for any authentication or data handling code

For more information about SPARC methodology, see: https://github.com/ruvnet/claude-code-flow/docs/sparc.md
`;

export async function initCommand(subArgs, flags) {
  const force = flags.force || false;
  const minimal = flags.minimal || false;
  const sparc = flags.sparc || false;
  
  try {
    // Initialize Claude Code directory
    const claudeDir = '.claude';
    const commandsDir = path.join(claudeDir, 'commands');
    
    // Create directories
    await Deno.mkdir(claudeDir, { recursive: true });
    await Deno.mkdir(commandsDir, { recursive: true });
    
    // Check if CLAUDE.md exists
    const claudeMdPath = 'CLAUDE.md';
    const claudeMdExists = await checkFileExists(claudeMdPath);
    
    if (claudeMdExists && !force) {
      printWarning('CLAUDE.md already exists. Use --force to overwrite.');
    } else {
      // Write CLAUDE.md
      await Deno.writeTextFile(claudeMdPath, claudeMdTemplate);
      printSuccess('Created CLAUDE.md with project instructions');
    }
    
    // Initialize SPARC modes if requested
    if (sparc && !minimal) {
      await initSparcModes(force);
    }
    
    // Create Claude Code commands
    if (!minimal) {
      await createClaudeCommands(commandsDir, force);
    }
    
    printSuccess('Claude Code integration initialized successfully!');
    
    if (sparc) {
      printInfo('\nSPARC development environment ready. Try:');
      printInfo('  npx claude-flow sparc modes     # List available modes');
      printInfo('  npx claude-flow sparc tdd "your feature"  # Start TDD workflow');
    }
    
  } catch (error) {
    printError(`Failed to initialize: ${error.message}`);
    throw error;
  }
}

async function checkFileExists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function initSparcModes(force) {
  const roomodesPath = '.roomodes';
  const roomodesExists = await checkFileExists(roomodesPath);
  
  if (roomodesExists && !force) {
    printWarning('.roomodes file already exists. Use --force to overwrite.');
    return;
  }
  
  // Create default SPARC modes configuration
  const sparcModes = {
    modes: {
      architect: {
        name: "System Architect",
        description: "Design system architecture and component structure",
        tools: ["Read", "Write", "Edit", "Bash", "WebSearch"],
        systemPrompt: "You are a system architect focused on designing scalable, maintainable architectures..."
      },
      code: {
        name: "Code Developer",
        description: "Write clean, modular, and efficient code",
        tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
        systemPrompt: "You are a senior developer focused on writing clean, efficient code..."
      },
      tdd: {
        name: "TDD Developer",
        description: "Test-driven development with Red-Green-Refactor cycle",
        tools: ["Read", "Write", "Edit", "Bash", "Grep"],
        systemPrompt: "You are a TDD expert following strict test-first development..."
      },
      debug: {
        name: "Debug Specialist",
        description: "Troubleshoot and fix bugs systematically",
        tools: ["Read", "Edit", "Bash", "Grep", "Glob"],
        systemPrompt: "You are a debugging specialist who systematically identifies and fixes bugs..."
      },
      "security-review": {
        name: "Security Reviewer",
        description: "Analyze code for security vulnerabilities",
        tools: ["Read", "Grep", "WebSearch"],
        systemPrompt: "You are a security expert reviewing code for vulnerabilities..."
      }
    }
  };
  
  await Deno.writeTextFile(roomodesPath, JSON.stringify(sparcModes, null, 2));
  printSuccess('Created .roomodes with SPARC development modes');
}

async function createClaudeCommands(commandsDir, force) {
  // Create claude-flow-help command
  const helpCommandPath = path.join(commandsDir, 'claude-flow-help.js');
  if (!await checkFileExists(helpCommandPath) || force) {
    await Deno.writeTextFile(helpCommandPath, claudeFlowCommandsTemplate);
    printSuccess('Created Claude Code command: claude-flow-help');
  }
  
  // Create SPARC commands
  const sparcCommandPath = path.join(commandsDir, 'sparc.js');
  if (!await checkFileExists(sparcCommandPath) || force) {
    await Deno.writeTextFile(sparcCommandPath, sparcCommandsTemplate);
    printSuccess('Created Claude Code command: sparc');
  }
}