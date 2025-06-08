# MCP Automated Development Flows for Claude

## Overview

This guide provides comprehensive instructions for using Model Context Protocol (MCP) tools to create automated development workflows with Claude. These patterns enable efficient, systematic code development with minimal manual intervention.

## Core MCP Tools for Development Flows

### 1. Code Discovery & Analysis Tools

#### Glob - Pattern-Based File Discovery
```
Use Case: Find files by patterns for bulk operations
Pattern Examples:
- "**/*.ts" - All TypeScript files
- "src/**/*.{js,jsx}" - JavaScript/React files in src
- "test/**/*.spec.js" - Test specification files
- "*.config.{js,json}" - Configuration files

Automation Pattern:
1. Use Glob to identify target files
2. Process results with Grep for content analysis
3. Apply bulk operations with MultiEdit
```

#### Grep - Content Pattern Search
```
Use Case: Find code patterns, functions, or specific implementations
Pattern Examples:
- "function\s+\w+" - Function declarations
- "import.*from.*react" - React imports
- "TODO|FIXME|HACK" - Code annotations
- "console\.(log|error|warn)" - Debug statements

Automation Pattern:
1. Use Grep to locate specific code patterns
2. Use Read to examine context around matches
3. Apply targeted fixes with Edit/MultiEdit
```

#### Read - Contextual File Analysis
```
Use Case: Examine file contents before modifications
Best Practices:
- Always Read before Edit to understand context
- Use offset/limit for large files
- Combine with Glob results for systematic analysis

Automation Pattern:
1. Glob to find relevant files
2. Read each file to understand structure
3. Plan modifications based on content analysis
```

### 2. File Modification Tools

#### Edit - Single Text Replacement
```
Use Case: Simple, targeted text replacements
Best Practices:
- Use for single, specific changes
- Ensure old_string matches exactly
- Set replace_all=true for global replacements

Automation Pattern:
1. Grep to find target text
2. Read to verify context
3. Edit with precise old_string/new_string
```

#### MultiEdit - Batch File Modifications
```
Use Case: Multiple changes to a single file
Best Practices:
- Group related changes into single MultiEdit call
- Order edits from bottom to top to preserve line numbers
- Use for refactoring operations

Automation Pattern:
1. Read file to understand structure
2. Plan all necessary changes
3. Execute MultiEdit with all changes at once
```

#### Write - New File Creation
```
Use Case: Create new files or complete rewrites
Best Practices:
- Use absolute paths starting with /workspaces/claude-code-flow/
- Include complete file content
- Use for scaffolding new components/modules

Automation Pattern:
1. Analyze project structure with Glob/LS
2. Determine optimal file placement
3. Write complete, functional files
```

### 3. Project Management Tools

#### Task - Sub-Agent Delegation
```
Use Case: Break complex operations into manageable sub-tasks
Best Practices:
- Use clear, specific task descriptions
- Delegate specialized operations (testing, documentation)
- Coordinate parallel development streams

Automation Pattern:
1. Analyze complex requirements
2. Break into logical sub-tasks
3. Launch Task for each specialized operation
4. Coordinate results integration
```

#### TodoRead/TodoWrite - Progress Tracking
```
Use Case: Track development progress and pending tasks
Best Practices:
- Update todos proactively during development
- Use priority levels (high/medium/low)
- Track status (pending/in_progress/completed)

Automation Pattern:
1. TodoRead to check current state
2. Update progress with TodoWrite
3. Plan next steps based on remaining todos
```

#### Bash - Command Execution
```
Use Case: Build, test, and validate operations
Common Commands:
- npm install/build/test
- git status/add/commit
- linting and formatting
- server startup/shutdown

Automation Pattern:
1. Execute build/test commands after changes
2. Validate modifications with appropriate tools
3. Use for environment setup and maintenance
```

## Automated Development Flow Patterns

### Pattern 1: Feature Implementation Flow

```
1. Analysis Phase:
   - Glob: Find related files ("**/*component*.{js,ts}")
   - Grep: Search for similar implementations
   - Read: Examine existing patterns and structure

2. Implementation Phase:
   - Write: Create new feature files
   - MultiEdit: Update existing files with integrations
   - Edit: Make targeted configuration changes

3. Validation Phase:
   - Bash: Run tests and linting
   - TodoWrite: Track implementation progress
   - Task: Delegate documentation updates

4. Integration Phase:
   - Grep: Find integration points
   - MultiEdit: Update imports and exports
   - Bash: Validate build process
```

### Pattern 2: Refactoring Flow

```
1. Discovery Phase:
   - Grep: Find code patterns to refactor
   - Glob: Identify affected files
   - Read: Understand current implementation

2. Planning Phase:
   - TodoWrite: Create refactoring task list
   - Task: Break into manageable chunks
   - Read: Analyze dependencies

3. Execution Phase:
   - MultiEdit: Apply systematic changes
   - Edit: Handle edge cases
   - Bash: Validate after each major change

4. Verification Phase:
   - Bash: Run comprehensive tests
   - Grep: Verify pattern consistency
   - TodoWrite: Mark completion status
```

### Pattern 3: Bug Fix Flow

```
1. Investigation Phase:
   - Grep: Search for error patterns or related code
   - Read: Examine problematic files
   - Bash: Reproduce issue with test commands

2. Root Cause Analysis:
   - Glob: Find related files that might be affected
   - Grep: Search for similar patterns across codebase
   - Read: Understand code flow and dependencies

3. Fix Implementation:
   - Edit: Apply targeted fixes
   - MultiEdit: Update related code if necessary
   - Bash: Test fix immediately

4. Validation Phase:
   - Bash: Run full test suite
   - Grep: Ensure no similar issues remain
   - TodoWrite: Document fix and prevention measures
```

### Pattern 4: Code Quality Improvement Flow

```
1. Assessment Phase:
   - Grep: Find code quality issues (TODO, console.log, etc.)
   - Glob: Identify files needing attention
   - Read: Analyze code structure and patterns

2. Systematic Improvement:
   - MultiEdit: Apply consistent formatting/style changes
   - Edit: Fix specific quality issues
   - Write: Create missing documentation files

3. Automation Setup:
   - Write: Create/update linting configurations
   - Bash: Set up pre-commit hooks
   - Task: Delegate documentation generation

4. Validation:
   - Bash: Run quality checks and tests
   - Grep: Verify improvements applied consistently
   - TodoWrite: Track ongoing quality initiatives
```

## Advanced Automation Techniques

### Conditional Logic Patterns

```
1. File Existence Checks:
   - Use Glob to check if files exist before operations
   - Use LS to verify directory structure
   - Adapt workflow based on project structure

2. Content-Based Decisions:
   - Use Grep to detect existing patterns
   - Use Read to analyze file content
   - Choose appropriate modification strategy

3. Dependency Management:
   - Grep for import/require statements
   - Read package.json or similar config files
   - Update dependencies systematically
```

### Parallel Processing Patterns

```
1. Independent File Operations:
   - Use Task to process multiple files simultaneously
   - Coordinate results with TodoWrite
   - Merge changes systematically

2. Specialized Sub-Tasks:
   - Task for testing operations
   - Task for documentation generation
   - Task for deployment preparation

3. Cross-Cutting Concerns:
   - Use Grep to find all instances of patterns
   - Apply MultiEdit to multiple files
   - Validate changes with Bash commands
```

### Error Handling and Recovery

```
1. Validation Checkpoints:
   - Use Bash to test after each major change
   - Use Grep to verify expected patterns exist
   - Use Read to confirm file integrity

2. Rollback Strategies:
   - Use TodoWrite to track change history
   - Use Bash for git operations if needed
   - Plan incremental changes for easy rollback

3. Progressive Enhancement:
   - Start with minimal viable changes
   - Use Task to add enhancements incrementally
   - Validate each step before proceeding
```

## Best Practices for MCP Automation

### 1. Always Start with Analysis
- Use Glob and Grep before making changes
- Read files to understand context
- Plan modifications based on discovered patterns

### 2. Use Absolute Paths
- All file operations require absolute paths
- Start paths with /workspaces/claude-code-flow/
- Use LS to verify path structure when needed

### 3. Batch Operations Efficiently
- Group related changes into MultiEdit operations
- Use Task for parallel processing when appropriate
- Minimize tool calls through strategic batching

### 4. Validate Continuously
- Use Bash to test after significant changes
- Use Grep to verify expected outcomes
- Use TodoWrite to track validation status

### 5. Maintain Context Awareness
- Use Read to understand existing code patterns
- Use Grep to find related implementations
- Adapt automation to project-specific conventions

### 6. Handle Edge Cases
- Use conditional logic based on Grep/Read results
- Plan fallback strategies for unexpected scenarios
- Use Task to delegate complex edge case handling

## Integration with Code-Flow Mode

When operating in `code-flow` mode, these MCP patterns should be applied automatically:

1. **Trigger Analysis**: Start with Glob/Grep to understand scope
2. **Context Gathering**: Use Read to examine relevant files
3. **Change Planning**: Use TodoWrite to track planned modifications
4. **Implementation**: Use MultiEdit for efficient changes
5. **Validation**: Use Bash for testing and verification
6. **Delegation**: Use Task for follow-up operations
7. **Progress Tracking**: Use TodoWrite to maintain state

This systematic approach ensures consistent, reliable automated development flows that leverage the full power of MCP tools while maintaining code quality and project integrity.