# Advanced Usage Guide

This guide covers advanced features and techniques for using the Claude Code SDK effectively in complex development scenarios.

## Introduction

The Claude Code SDK provides powerful capabilities beyond basic code generation. This guide explores advanced features including multi-turn conversations, custom system prompts, output control, shell integration, performance optimization, and complex use cases that demonstrate the full potential of AI-assisted development.

## Multi-turn Conversations

Maintaining context across multiple interactions is crucial for complex development tasks. The Claude Code SDK provides several ways to continue conversations and maintain state.

### Continuing the Most Recent Conversation

To continue your most recent conversation without starting fresh:

```bash
claude --continue
```

This maintains all previous context and allows you to build upon earlier work:

```bash
# Initial request
claude "Create a user authentication system"

# Continue the conversation
claude --continue
# Claude will remember the authentication system and wait for your next instruction
```

### Continuing with a New Prompt

Combine continuation with a new instruction:

```bash
claude --continue "Now refactor this for better performance"
```

Example workflow:

```bash
# Step 1: Create initial implementation
claude "Build a REST API for a blog system"

# Step 2: Add features while maintaining context
claude --continue "Add authentication middleware"

# Step 3: Optimize the existing code
claude --continue "Now refactor this for better performance"

# Step 4: Add testing
claude --continue "Generate comprehensive test suites"
```

### Resuming Specific Sessions

Resume any previous conversation using its session ID:

```bash
claude --resume 550e8400-e29b-41d4-a716-446655440000
```

Find session IDs in your conversation history:

```bash
# List recent sessions
claude --list-sessions

# Resume a specific session
claude --resume 550e8400-e29b-41d4-a716-446655440000
```

### Using Resume in Print Mode

Combine resume with print mode for non-interactive workflows:

```bash
claude -p --resume 550e8400-e29b-41d4-a716-446655440000 "Update the tests"
```

This is particularly useful in automation scripts:

```bash
#!/bin/bash
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"

# Update implementation
claude -p --resume $SESSION_ID "Fix the authentication bug"

# Run tests
npm test

# Update documentation if tests pass
if [ $? -eq 0 ]; then
    claude -p --resume $SESSION_ID "Update the API documentation"
fi
```

## Custom System Prompts

System prompts guide Claude's behavior and expertise. Customize them for specific development contexts.

### Overriding System Prompts

Replace the default system prompt entirely:

```bash
claude -p "Build a REST API" --system-prompt "You are a senior backend engineer with 10 years of experience in Node.js and Express. Focus on scalability, security, and best practices. Always include error handling and input validation."
```

Example specialized prompts:

```bash
# Frontend specialist
claude -p "Create a dashboard" --system-prompt "You are a React expert specializing in modern UI/UX. Use TypeScript, styled-components, and follow accessibility guidelines."

# DevOps engineer
claude -p "Set up CI/CD" --system-prompt "You are a DevOps engineer expert in Docker, Kubernetes, and GitHub Actions. Focus on automation, security, and monitoring."

# Security expert
claude -p "Review this code" --system-prompt "You are a security engineer. Analyze code for vulnerabilities, suggest secure alternatives, and explain security implications."
```

### Appending to System Prompts

Add specific instructions while keeping the base prompt:

```bash
claude -p "Build a REST API" --append-system-prompt "After writing code, always include comprehensive JSDoc comments and explain the architectural decisions."
```

Useful append patterns:

```bash
# Add testing requirements
claude -p "Create a user service" --append-system-prompt "Include unit tests with Jest and integration tests. Aim for 90%+ code coverage."

# Add documentation requirements
claude -p "Build a library" --append-system-prompt "Generate detailed README.md with examples, API documentation, and contribution guidelines."

# Add performance focus
claude -p "Optimize this function" --append-system-prompt "Focus on performance optimization, memory efficiency, and provide benchmarking code."
```

## Advanced Output Control

Control how Claude presents information and code for different workflows.

### Output Formatting Options

```bash
# JSON output for programmatic processing
claude -p "Analyze this code" --output-format json

# Markdown output for documentation
claude -p "Explain this algorithm" --output-format markdown

# Plain text for simple integration
claude -p "List the issues" --output-format plain
```

### Filtering and Processing Output

```bash
# Extract only code blocks
claude -p "Create a utility function" | grep -A 20 "```javascript"

# Save explanations to documentation
claude -p "Explain the architecture" --output-format markdown > docs/architecture.md

# Process JSON output with jq
claude -p "Analyze dependencies" --output-format json | jq '.recommendations[]'
```

### Streaming vs Batch Output

```bash
# Stream output for real-time feedback
claude --stream "Generate a large application"

# Batch output for complete results
claude --no-stream "Create configuration files"
```

## Shell Integration

Integrate Claude Code SDK into your development workflow with shell scripts and automation.

### Bash Integration Examples

```bash
#!/bin/bash
# Development workflow automation

function ai_code_review() {
    local files="$1"
    echo "Running AI code review on: $files"
    
    claude -p "Review these files for bugs, performance issues, and best practices: $(cat $files)" \
        --system-prompt "You are a senior code reviewer. Provide specific, actionable feedback."
}

function ai_test_generation() {
    local file="$1"
    echo "Generating tests for: $file"
    
    claude -p "Generate comprehensive tests for this code: $(cat $file)" \
        --append-system-prompt "Use Jest framework and include edge cases." \
        > "${file%.js}.test.js"
}

function ai_documentation() {
    local project_dir="$1"
    echo "Generating documentation for: $project_dir"
    
    claude -p "Create comprehensive documentation for this project: $(find $project_dir -name '*.js' -exec cat {} \;)" \
        --output-format markdown > "$project_dir/AI_GENERATED_DOCS.md"
}
```

### Git Hooks Integration

```bash
#!/bin/bash
# .git/hooks/pre-commit
# AI-powered pre-commit hook

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.js$')

if [ -n "$STAGED_FILES" ]; then
    echo "Running AI code review on staged files..."
    
    for file in $STAGED_FILES; do
        # Quick code review
        REVIEW=$(claude -p "Quick review for critical issues: $(cat $file)" \
            --system-prompt "You are a linter. Only report critical bugs or security issues. Be concise.")
        
        if echo "$REVIEW" | grep -i "critical\|error\|security"; then
            echo "❌ Critical issues found in $file:"
            echo "$REVIEW"
            exit 1
        fi
    done
    
    echo "✅ AI code review passed"
fi
```

### Continuous Integration Integration

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Claude Code SDK
        run: npm install -g claude-code-sdk
        
      - name: AI Code Review
        run: |
          # Get changed files
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD | grep '\.js$')
          
          if [ -n "$CHANGED_FILES" ]; then
            echo "## AI Code Review" >> review.md
            
            for file in $CHANGED_FILES; do
              echo "### $file" >> review.md
              claude -p "Review this file: $(cat $file)" \
                --system-prompt "You are a code reviewer. Focus on bugs, security, and maintainability." \
                --output-format markdown >> review.md
            done
            
            # Post review as PR comment
            gh pr comment --body-file review.md
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

## Performance Optimization

Optimize your Claude Code SDK usage for faster and more efficient responses.

### Request Optimization

```bash
# Use specific, focused prompts
claude -p "Fix the authentication bug in line 45-60" # Good
claude -p "Fix my code" # Too vague

# Provide relevant context only
claude -p "Optimize this function: $(sed -n '45,60p' app.js)" # Good
claude -p "Optimize my code: $(cat entire_project.js)" # Too much context
```

### Caching and Session Management

```bash
# Reuse sessions for related tasks
SESSION_ID=$(claude "Start working on user authentication" --get-session-id)
claude --resume $SESSION_ID "Add password validation"
claude --resume $SESSION_ID "Add rate limiting"
claude --resume $SESSION_ID "Add tests"

# Use print mode for non-interactive tasks
claude -p "Generate utility functions" > utils.js
```

### Parallel Processing

```bash
#!/bin/bash
# Process multiple files in parallel

files=("auth.js" "user.js" "admin.js")

for file in "${files[@]}"; do
    {
        echo "Processing $file..."
        claude -p "Add comprehensive error handling to: $(cat $file)" > "${file%.js}_enhanced.js"
        echo "Completed $file"
    } &
done

wait
echo "All files processed"
```

## Error Handling

Handle and recover from common errors gracefully.

### Common Error Scenarios

```bash
#!/bin/bash
# Robust error handling

function safe_claude_call() {
    local prompt="$1"
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if result=$(claude -p "$prompt" 2>&1); then
            echo "$result"
            return 0
        else
            echo "Attempt $((retry_count + 1)) failed: $result" >&2
            retry_count=$((retry_count + 1))
            sleep $((retry_count * 2))  # Exponential backoff
        fi
    done
    
    echo "Failed after $max_retries attempts" >&2
    return 1
}

# Usage
if safe_claude_call "Generate a user model"; then
    echo "Success!"
else
    echo "Failed to generate code, falling back to template"
    cp templates/user_model.js src/models/user.js
fi
```

### Validation and Fallbacks

```bash
#!/bin/bash
# Validate generated code

function generate_and_validate() {
    local prompt="$1"
    local output_file="$2"
    
    # Generate code
    claude -p "$prompt" > "$output_file"
    
    # Validate syntax
    if node -c "$output_file" 2>/dev/null; then
        echo "✅ Generated valid JavaScript"
        return 0
    else
        echo "❌ Generated invalid JavaScript, attempting fix..."
        
        # Try to fix
        claude -p "Fix the syntax errors in this code: $(cat $output_file)" > "${output_file}.fixed"
        
        if node -c "${output_file}.fixed" 2>/dev/null; then
            mv "${output_file}.fixed" "$output_file"
            echo "✅ Fixed and validated"
            return 0
        else
            echo "❌ Could not fix automatically"
            return 1
        fi
    fi
}
```

## Advanced Use Cases

Complex examples demonstrating the full potential of the Claude Code SDK.

### Refactoring Large Codebases

```bash
#!/bin/bash
# Large codebase refactoring workflow

function refactor_codebase() {
    local project_dir="$1"
    local refactor_type="$2"
    
    echo "Starting $refactor_type refactoring of $project_dir"
    
    # Analyze codebase structure
    claude -p "Analyze this codebase structure and suggest refactoring strategy: $(find $project_dir -name '*.js' | head -20 | xargs cat)" \
        --system-prompt "You are a senior architect. Focus on maintainability and scalability." \
        > refactor_plan.md
    
    # Process files in dependency order
    find "$project_dir" -name '*.js' | while read file; do
        echo "Refactoring $file..."
        
        # Create backup
        cp "$file" "${file}.backup"
        
        # Refactor with context
        claude -p "Refactor this file for $refactor_type: $(cat $file)" \
            --append-system-prompt "Maintain existing functionality. Follow the plan in refactor_plan.md." \
            > "${file}.new"
        
        # Validate refactored code
        if node -c "${file}.new" 2>/dev/null; then
            mv "${file}.new" "$file"
            echo "✅ Successfully refactored $file"
        else
            echo "❌ Refactoring failed for $file, restoring backup"
            mv "${file}.backup" "$file"
        fi
    done
}

# Usage examples
refactor_codebase "./src" "modern ES6+ syntax"
refactor_codebase "./lib" "functional programming patterns"
refactor_codebase "./api" "async/await conversion"
```

### Debugging Complex Issues

```bash
#!/bin/bash
# AI-powered debugging workflow

function debug_with_ai() {
    local error_log="$1"
    local source_files="$2"
    
    echo "🔍 Starting AI-powered debugging session..."
    
    # Start debugging session
    SESSION_ID=$(claude "I need help debugging an issue" --get-session-id)
    
    # Provide error context
    claude --resume $SESSION_ID -p "Here's the error log: $(cat $error_log)"
    
    # Provide source code context
    claude --resume $SESSION_ID -p "Here are the relevant source files: $(cat $source_files)"
    
    # Get initial analysis
    claude --resume $SESSION_ID -p "Analyze the error and suggest debugging steps" \
        --system-prompt "You are a debugging expert. Provide systematic debugging approach."
    
    # Interactive debugging loop
    while true; do
        echo "\n🤖 What would you like to investigate next?"
        echo "1) Add logging"
        echo "2) Create test case"
        echo "3) Check dependencies"
        echo "4) Analyze stack trace"
        echo "5) Exit"
        
        read -p "Choice: " choice
        
        case $choice in
            1)
                claude --resume $SESSION_ID -p "Add strategic logging to help debug this issue"
                ;;
            2)
                claude --resume $SESSION_ID -p "Create a minimal test case that reproduces this error"
                ;;
            3)
                claude --resume $SESSION_ID -p "Check if this could be a dependency version issue: $(cat package.json)"
                ;;
            4)
                claude --resume $SESSION_ID -p "Analyze this stack trace in detail: $(tail -50 $error_log)"
                ;;
            5)
                echo "Debugging session ended"
                break
                ;;
        esac
    done
}
```

### Generating Complete Applications

```bash
#!/bin/bash
# Generate a complete application with AI

function generate_app() {
    local app_name="$1"
    local app_type="$2"
    local features="$3"
    
    echo "🚀 Generating $app_type application: $app_name"
    
    # Create project structure
    mkdir -p "$app_name"/{src,tests,docs,config}
    cd "$app_name"
    
    # Start application generation session
    SESSION_ID=$(claude "Generate a $app_type application called $app_name with features: $features" --get-session-id)
    
    # Generate package.json
    claude --resume $SESSION_ID -p "Create package.json for this application" \
        --output-format json > package.json
    
    # Generate main application files
    claude --resume $SESSION_ID -p "Create the main application entry point" > src/app.js
    
    # Generate configuration
    claude --resume $SESSION_ID -p "Create configuration files" > config/default.json
    
    # Generate tests
    claude --resume $SESSION_ID -p "Create comprehensive test suite" > tests/app.test.js
    
    # Generate documentation
    claude --resume $SESSION_ID -p "Create README.md with setup and usage instructions" \
        --output-format markdown > README.md
    
    # Generate API documentation if it's an API
    if [[ "$app_type" == *"api"* ]]; then
        claude --resume $SESSION_ID -p "Create OpenAPI/Swagger documentation" > docs/api.yaml
    fi
    
    # Install dependencies and run tests
    npm install
    npm test
    
    echo "✅ Application $app_name generated successfully!"
    echo "📁 Location: $(pwd)"
    echo "🚀 Run with: npm start"
}

# Usage examples
generate_app "todo-api" "REST API" "CRUD operations, authentication, rate limiting"
generate_app "chat-app" "real-time web app" "WebSocket communication, user management, message history"
generate_app "data-processor" "CLI tool" "file processing, data validation, report generation"
```

### Creating Comprehensive Test Suites

```bash
#!/bin/bash
# Generate comprehensive test suites

function generate_test_suite() {
    local source_dir="$1"
    local test_type="$2"  # unit, integration, e2e
    
    echo "🧪 Generating $test_type tests for $source_dir"
    
    # Create test directory structure
    mkdir -p "tests/$test_type"
    
    # Start testing session
    SESSION_ID=$(claude "Generate $test_type tests for this codebase" --get-session-id)
    
    # Analyze codebase for test generation
    find "$source_dir" -name '*.js' | while read file; do
        echo "Generating tests for $file..."
        
        test_file="tests/$test_type/$(basename ${file%.js}).test.js"
        
        case $test_type in
            "unit")
                claude --resume $SESSION_ID -p "Generate unit tests for this module: $(cat $file)" \
                    --append-system-prompt "Use Jest. Test all functions, edge cases, and error conditions. Aim for 100% coverage." \
                    > "$test_file"
                ;;
            "integration")
                claude --resume $SESSION_ID -p "Generate integration tests for this module: $(cat $file)" \
                    --append-system-prompt "Test module interactions, database operations, and API calls. Use test doubles appropriately." \
                    > "$test_file"
                ;;
            "e2e")
                claude --resume $SESSION_ID -p "Generate end-to-end tests for this module: $(cat $file)" \
                    --append-system-prompt "Use Playwright or Cypress. Test complete user workflows and system behavior." \
                    > "$test_file"
                ;;
        esac
        
        echo "✅ Generated $test_file"
    done
    
    # Generate test configuration
    claude --resume $SESSION_ID -p "Create Jest configuration for $test_type tests" > "tests/$test_type/jest.config.js"
    
    # Generate test utilities
    claude --resume $SESSION_ID -p "Create test utilities and helpers for $test_type tests" > "tests/$test_type/helpers.js"
    
    echo "🎉 $test_type test suite generated successfully!"
    echo "Run with: npm run test:$test_type"
}

# Generate all test types
generate_test_suite "src" "unit"
generate_test_suite "src" "integration"
generate_test_suite "src" "e2e"
```

## Best Practices Summary

1. **Use specific, focused prompts** for better results
2. **Maintain conversation context** for complex multi-step tasks
3. **Customize system prompts** for specialized domains
4. **Validate generated code** before using in production
5. **Implement error handling** and fallback strategies
6. **Use parallel processing** for independent tasks
7. **Integrate with existing workflows** through shell scripts
8. **Cache and reuse sessions** for related work
9. **Combine AI assistance with traditional tools** for robust solutions
10. **Always review and test** AI-generated code

## Troubleshooting

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Session not found | Use `claude --list-sessions` to find valid session IDs |
| API rate limits | Implement exponential backoff and request batching |
| Large context errors | Break down requests into smaller, focused prompts |
| Invalid generated code | Add validation steps and syntax checking |
| Inconsistent responses | Use more specific system prompts and examples |

### Getting Help

- Check the [basic usage guide](basic-usage.md) for fundamentals
- Review [core concepts](../core-concepts.md) for deeper understanding
- Use `claude --help` for command reference
- Enable debug mode with `--debug` flag for troubleshooting

For more advanced scenarios and custom integrations, consider the Claude Code SDK's extensibility features and plugin system.