# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a RooCode MCP mode configuration project called "code-flow" - an autonomous code execution and refinement agent designed to work within the RooCode agentic pipeline ecosystem.

## Architecture

The project defines two custom MCP modes in `.roomodes`:

1. **code-flow**: Autonomous code execution and structural refinement agent
   - Manages code generation, refactoring, and logic-level updates
   - Uses MCP-based inputs and recursive task loops
   - Integrates with other RooCode agents (tdd-runner, critic, reflection, memory-manager)

2. **claude-code**: General coding assistant with MCP tool integration
   - Provides automated tool usage for complex codebase operations
   - Handles multi-file editing, pattern searching, and project navigation

## Development Status

Currently in specification phase - no implementation exists yet. The intended structure:
```
/modes
  ├── code-flow/
  │   ├── handler.ts
  │   ├── config.json
  │   └── prompts/
  │       └── base_prompt.txt
/src
  └── ...
.mcp.json
.roomodes
```

## Key Integration Points

The code-flow mode expects these companion modes in the RooCode environment:
- `prompt-generator`
- `tdd-runner`
- `memory-manager`
- `reflection`
- `critic`
- `doc-writer` (optional)

## MCP Tool Usage Pattern

When implementing the code-flow mode, follow this workflow:
1. Start with `Glob`/`Grep` for impact analysis
2. Use `Read` for dependency mapping
3. Apply `MultiEdit` for precise changes
4. Validate with `Bash` testing commands
5. Delegate follow-up tasks via `Task` tool
6. Track progress with `TodoWrite`