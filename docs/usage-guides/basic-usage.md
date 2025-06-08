# Basic Usage Guide

## Introduction

This guide covers the fundamental usage patterns of the Claude Code SDK. You'll learn how to perform basic operations like code generation, explanation, and review using simple command-line interactions. This guide is designed for developers who want to quickly get started with the SDK's core functionality.

## Basic Command Structure

The Claude Code SDK follows a consistent command structure:

```bash
claude [options] [command]
```

The most common pattern uses the `-p` or `--prompt` flag to provide instructions:

```bash
claude -p "Your instruction here"
```

### Common Options

- `-p, --prompt`: Provide a text prompt for the AI
- `--output-format`: Control output format (text, json, stream-json)
- `--help`: Display help information
- `--version`: Show version information

## Simple Code Generation

The most straightforward use case is generating code with simple prompts:

### Basic Function Generation

```bash
claude -p "Write a function to calculate Fibonacci numbers"
```

**Example Output:**
```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Optimized version with memoization
function fibonacciMemo(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 1) return n;
    memo[n] = fibonacciMemo(n - 1, memo) + fibonacciMemo(n - 2, memo);
    return memo[n];
}
```

### Class Generation

```bash
claude -p "Create a Python class for a simple bank account"
```

**Example Output:**
```python
class BankAccount:
    def __init__(self, account_number, initial_balance=0):
        self.account_number = account_number
        self.balance = initial_balance
        self.transaction_history = []
    
    def deposit(self, amount):
        if amount > 0:
            self.balance += amount
            self.transaction_history.append(f"Deposited ${amount}")
            return True
        return False
    
    def withdraw(self, amount):
        if 0 < amount <= self.balance:
            self.balance -= amount
            self.transaction_history.append(f"Withdrew ${amount}")
            return True
        return False
    
    def get_balance(self):
        return self.balance
```

## Input Methods

The SDK supports multiple ways to provide input to accommodate different workflows:

### 1. Direct Command Line Prompts

The simplest method is providing prompts directly:

```bash
claude -p "Explain how async/await works in JavaScript"
```

### 2. Piped Input

You can pipe content from other commands or echo statements:

```bash
echo "Explain this code" | claude -p
```

```bash
cat myfile.js | claude -p "Review this code for potential bugs"
```

### 3. Reading from Files

For longer prompts or when working with existing content:

```bash
claude -p "$(cat prompt.txt)"
```

Or combine file content with additional instructions:

```bash
claude -p "Review the following code for security issues: $(cat app.py)"
```

### 4. Interactive Mode

For multi-turn conversations:

```bash
claude --interactive
```

## Output Control

The SDK provides several output formats to suit different use cases:

### Default Text Output

By default, the SDK returns plain text responses:

```bash
claude -p "Generate a hello world function"
```

### JSON Format

For programmatic processing, use JSON output:

```bash
claude -p "Generate a hello world function" --output-format json
```

**Example JSON Output:**
```json
{
  "response": "function helloWorld() {\n    console.log('Hello, World!');\n}",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "model": "claude-3-sonnet",
    "tokens_used": 45
  }
}
```

### Streaming Output

For real-time responses, especially useful for longer generations:

```bash
claude -p "Build a React component for a todo list" --output-format stream-json
```

This outputs JSON objects as they're generated, allowing you to process responses incrementally.

## Common Use Cases

Here are practical examples of the SDK's most common applications:

### Code Generation

```bash
# Generate a REST API endpoint
claude -p "Create a Node.js Express route for user authentication"

# Generate database schema
claude -p "Design a SQL schema for an e-commerce application"

# Create utility functions
claude -p "Write a utility function to validate email addresses"
```

### Code Explanation

```bash
# Explain complex code
claude -p "Explain how this regex works: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/"

# Understand algorithms
claude -p "Explain the quicksort algorithm with an example"

# Clarify syntax
claude -p "What does the spread operator do in JavaScript?"
```

### Code Review

```bash
# Review for best practices
claude -p "Review this function for best practices: $(cat myfunction.js)"

# Security review
claude -p "Check this code for security vulnerabilities: $(cat auth.py)"

# Performance analysis
claude -p "Analyze this code for performance issues: $(cat algorithm.cpp)"
```

### Bug Fixing

```bash
# Debug errors
claude -p "This code throws an error: $(cat buggy.js). Help me fix it."

# Troubleshoot issues
claude -p "My React component isn't rendering. Here's the code: $(cat Component.jsx)"

# Fix syntax errors
claude -p "Fix the syntax errors in this Python code: $(cat broken.py)"
```

### Test Writing

```bash
# Generate unit tests
claude -p "Write unit tests for this function: $(cat calculator.js)"

# Create integration tests
claude -p "Generate integration tests for this API endpoint: $(cat api.js)"

# Mock data generation
claude -p "Create mock data for testing a user management system"
```

## Best Practices

### Effective Prompt Construction

1. **Be Specific**: Instead of "write code", use "write a Python function that validates email addresses using regex"

2. **Provide Context**: Include relevant details about your environment, framework, or constraints
   ```bash
   claude -p "Create a React component using TypeScript and Material-UI for a user profile form"
   ```

3. **Specify Output Format**: Mention the desired programming language, style, or structure
   ```bash
   claude -p "Write a RESTful API in Node.js using Express with error handling and input validation"
   ```

4. **Include Examples**: When possible, provide examples of what you're looking for
   ```bash
   claude -p "Create a CSS animation similar to a fade-in effect but with a slide-up motion"
   ```

### SDK Usage Tips

1. **Use Appropriate Output Formats**: 
   - Use `json` for programmatic processing
   - Use `stream-json` for long responses
   - Use default text for quick reviews

2. **Combine with Shell Tools**: Leverage pipes and file operations
   ```bash
   claude -p "Optimize this code" < input.js > optimized.js
   ```

3. **Save Frequently Used Prompts**: Create shell aliases for common tasks
   ```bash
   alias code-review='claude -p "Review this code for best practices:"'
   alias explain-code='claude -p "Explain this code:"'
   ```

4. **Iterate and Refine**: Use the SDK iteratively to refine your code
   ```bash
   # First pass
   claude -p "Create a basic todo app in React"
   
   # Refinement
   claude -p "Add error handling and loading states to this React todo app: $(cat todo.jsx)"
   ```

5. **Version Control Integration**: Use the SDK as part of your development workflow
   ```bash
   # Pre-commit code review
   git diff --cached | claude -p "Review these changes for potential issues"
   ```

### Performance Considerations

- For large files, consider breaking them into smaller chunks
- Use streaming output for long-running generations
- Cache frequently used responses when appropriate
- Be mindful of API rate limits in automated scripts

---

*This guide covers the essential usage patterns of the Claude Code SDK. For more advanced features and integrations, see the [Advanced Usage Guide](advanced-usage.md) and [API Reference](../api-reference.md).*