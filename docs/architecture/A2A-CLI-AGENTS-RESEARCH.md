# CLI-Based Coding Agents Research: A2A Integration Analysis

**Date:** 2025-10-01
**Research Focus:** codex-cli, cursor-agent, gemini-cli
**Purpose:** Understand actual implementations for Agent-to-Agent (A2A) communication patterns

---

## Executive Summary

This research examines three major CLI-based coding agents for potential A2A integration:

1. **OpenAI Codex CLI** - Official OpenAI coding agent, npm-based, supports pipe mode and MCP
2. **Cursor Agent CLI** - Cursor's terminal agent, supports headless/non-interactive mode, MCP integration
3. **Google Gemini CLI** - Google's open-source terminal agent, extensive MCP support, built-in tools

**Key Finding:** All three tools support programmatic integration through non-interactive modes with JSON output, making them viable for A2A communication patterns. Each has distinct strengths for different use cases.

---

## Section 1: Tool Discovery

### 1.1 OpenAI Codex CLI

**Official Name:** OpenAI Codex CLI
**Package Name:** `@openai/codex`
**Repository:** https://github.com/openai/codex
**NPM Package:** https://www.npmjs.com/package/@openai/codex
**Documentation:** https://developers.openai.com/codex/cli/

#### Installation Methods
```bash
# Global npm install
npm install -g @openai/codex

# Homebrew
brew install codex

# Direct binary download
# Available for macOS (Apple Silicon/x86_64) and Linux (x86_64/arm64)
# Download from GitHub Releases
```

#### Version Information
- **Current Version:** 0.42.0 (as of research date)
- **Platform Support:** macOS, Linux (official), Windows (experimental via WSL)
- **Built With:** Rust (for speed and efficiency)
- **License:** Apache-2.0

#### Availability
- Free tier with ChatGPT Plus/Pro/Team/Edu/Enterprise plans
- API key authentication available
- Default model: GPT-5 for fast reasoning

---

### 1.2 Cursor Agent CLI

**Official Name:** Cursor Agent CLI
**Binary Name:** `cursor-agent`
**Repository:** Not publicly available (proprietary with beta CLI)
**Documentation:** https://cursor.com/docs/cli/overview

#### Installation Methods
```bash
# Official installer script
curl https://cursor.com/install -fsSL | bash
```

#### Version Information
- **Status:** Beta (as of research date)
- **Platform Support:** macOS, Linux, Windows (exact details not fully documented)
- **License:** Proprietary
- **Integration:** Works alongside Cursor IDE

#### Availability
- Available to Cursor users
- Supports multiple AI models (Anthropic, OpenAI, Gemini)
- Beta status - security safeguards evolving

---

### 1.3 Google Gemini CLI

**Official Name:** Gemini CLI
**Package Name:** `@google/gemini-cli`
**Repository:** https://github.com/google-gemini/gemini-cli
**NPM Package:** https://www.npmjs.com/package/@google/gemini-cli
**Documentation:** https://cloud.google.com/gemini/docs/codeassist/gemini-cli

#### Installation Methods
```bash
# Instant npx (no install)
npx https://github.com/google-gemini/gemini-cli

# Global npm install
npm install -g @google/gemini-cli

# Homebrew
brew install gemini-cli
```

#### Version Information
- **Current Version:** 0.6.1 (as of research date)
- **Platform Support:** macOS, Linux, Windows
- **Requirements:** Node.js 20+
- **License:** Apache-2.0
- **Built With:** TypeScript/Node.js

#### Availability
- Free tier: 60 requests/min, 1,000 requests/day (with Google account)
- API key option: 100 requests/day
- Vertex AI option for enterprise
- Fully open-source

---

## Section 2: CLI Interface Specifications

### 2.1 OpenAI Codex CLI

#### Command Syntax

**Interactive Mode:**
```bash
codex                                    # Start interactive session
codex "fix the auth bug"                 # Start with prompt
```

**Non-Interactive/Quiet Mode:**
```bash
codex -q "analyze this codebase"         # Quiet mode with JSON output
codex --quiet "refactor utils.js"        # Long form
```

**Pipe Mode (stdin/stdout JSON):**
```bash
# Codex reads/writes JSON via stdin/stdout
echo '{"prompt": "explain this code"}' | codex --pipe
```

#### Input/Output Formats

**Input Methods:**
- Interactive terminal prompts
- Command-line arguments
- stdin pipe (JSON format)
- Screenshots and diagrams (multimodal)

**Output Modes:**
- Interactive UI (default)
- Quiet mode: JSON to stdout (each reasoning step)
- Pipe mode: JSON request/response format
- Human-readable text

**JSON Output Structure (Quiet Mode):**
```json
{
  "type": "reasoning_step",
  "content": "Analysis of the code...",
  "step_number": 1
}
```

#### Configuration Options

**Config File:** `~/.codex/config.toml`

**Key Configuration Sections:**
- Authentication settings (ChatGPT account or API key)
- Approval modes (Suggest, Auto Edit, Full Auto)
- MCP server integrations
- Model preferences
- Privacy settings

**Approval Modes:**
1. **Suggest** (default) - Reads files, requires approval for changes
2. **Auto Edit** - Auto-applies file changes, requires command approval
3. **Full Auto** - Executes both file operations and commands without approval

#### Authentication Methods

**Primary (Recommended):**
```bash
codex                                    # Interactive login flow
# Sign in with ChatGPT Plus/Pro/Team/Edu/Enterprise account
```

**Alternative - API Key:**
```bash
export OPENAI_API_KEY="sk-..."
codex --auth-method api-key
```

**Headless Machine Login:**
```bash
# For CI/CD and automated environments
# Configuration via config.toml
```

#### Integration Points

**Local Operations:**
- All file read/write operations happen locally
- Command execution on local machine
- Only prompts and diffs sent to model

**MCP Integration:**
```toml
# ~/.codex/config.toml
[mcp_servers]
[mcp_servers.my-server]
command = "npx"
args = ["-y", "@my-org/my-mcp-server"]
```

**SDK for Node.js:**
```javascript
// @openai/codex SDK runs CLI in Node.js process
// Provides API on top of pipe mode
const codex = require('@openai/codex');
```

---

### 2.2 Cursor Agent CLI

#### Command Syntax

**Interactive Mode:**
```bash
cursor-agent                             # Start interactive session
cursor-agent "fix auth module"           # Start with prompt
cursor-agent chat "find bugs"            # Explicit chat mode
```

**Non-Interactive/Print Mode:**
```bash
cursor-agent -p "analyze code"           # Print mode
cursor-agent --print "refactor utils"    # Long form
```

**Headless Mode:**
```bash
cursor-agent -p "task" --output-format json --force --model gpt-5
```

#### Input/Output Formats

**Input Methods:**
- Interactive terminal prompts
- Command-line arguments with `-p` flag
- Direct prompts

**Output Formats:**
```bash
# JSON object output (single result)
--output-format json

# NDJSON streaming (progress events)
--output-format stream-json

# Human-readable text
--output-format text
```

**JSON Output Structure:**
```json
{
  "result": "Analysis complete...",
  "files_modified": ["src/auth.ts"],
  "commands_executed": ["npm test"],
  "status": "success"
}
```

**Stream JSON Output (NDJSON):**
```json
{"type": "system_init", "timestamp": 1234567890}
{"type": "delta", "content": "Analyzing..."}
{"type": "tool_call", "tool": "edit_file", "args": {...}}
{"type": "result", "status": "complete"}
```

#### Configuration Options

**Config Files:**
- `.cursor/mcp.json` - Project-specific MCP servers
- `~/.cursor/mcp.json` - Global MCP servers
- Same config used for both IDE and CLI

**Flags:**
```bash
--force                  # Apply edits in print mode (no confirmation)
--model <model>          # Specify model (gpt-5, claude, etc.)
--output-format <format> # json, stream-json, text
-p, --print             # Non-interactive print mode
--resume <chat-id>      # Resume specific conversation
```

#### Session Management

```bash
# List previous chats
cursor-agent ls

# Resume latest conversation
cursor-agent resume

# Resume specific conversation
cursor-agent --resume="chat-abc123"
```

#### Authentication Methods

**Environment Variable:**
```bash
export CURSOR_API_KEY="your-api-key"
cursor-agent -p "task"
```

**Interactive Login:**
```bash
cursor-agent
# Follow authentication prompts
```

#### Integration Points

**MCP Integration:**
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

**MCP Management:**
```bash
cursor-agent mcp              # View configured servers
cursor-agent mcp list-tools   # List available tools
# Tools automatically discovered and used
```

**Subprocess Spawning for Sub-agents:**
```bash
# cursor-agent can spawn sub-agents recursively
# Uses headless mode via shell commands
cursor-agent -p "[task]" --output-format=text --force --model [model]
```

**Fan-out Pattern:**
- Main agent spawns multiple sub-agents for parallel tasks
- Each sub-agent runs in headless mode
- Results fan-in to main agent

---

### 2.3 Google Gemini CLI

#### Command Syntax

**Interactive Mode:**
```bash
gemini                                   # Start in current directory
gemini --include-directories ../lib,../docs  # Multi-directory context
```

**Non-Interactive Mode:**
```bash
gemini -p "explain architecture"         # Prompt flag
gemini --prompt "summarize code"         # Long form
```

**Model Selection:**
```bash
gemini -m gemini-2.5-flash              # Specify model
gemini -m gemini-2.5-pro                # Pro model
```

**Output Format:**
```bash
gemini -p "analyze code" --output-format json
```

#### Input/Output Formats

**Input Methods:**
- Interactive terminal prompts
- Command-line arguments with `-p`/`--prompt`
- Context from specified directories
- Multimodal (text, images)

**Output Formats:**
- Interactive UI (default)
- JSON structured output (`--output-format json`)
- Plain text for scripting

**JSON Output Structure:**
```json
{
  "response": "Analysis results...",
  "model": "gemini-2.5-pro",
  "tokens_used": 1234,
  "status": "completed"
}
```

#### Configuration Options

**Config File:** `~/.gemini/settings.json`

**MCP Server Configuration:**
```json
{
  "mcpServers": {
    "custom-tool": {
      "command": "python",
      "args": ["my_mcp_server.py"],
      "env": {
        "API_KEY": "..."
      }
    }
  }
}
```

**Custom Slash Commands:**
```bash
# Project-specific commands
<project>/.gemini/commands/test.toml      # Becomes /test
<project>/.gemini/commands/git/commit.toml # Becomes /git:commit
```

**Command Line Flags:**
```bash
--include-directories <dirs>  # Add context from directories
-m, --model <model>           # Specify model
-p, --prompt <prompt>         # Non-interactive prompt
--output-format json          # JSON output for scripting
```

#### Authentication Methods

**Google OAuth (Recommended - Free Tier):**
```bash
gemini
# Interactive login with personal Google account
# 60 req/min, 1,000 req/day
```

**Gemini API Key:**
```bash
export GEMINI_API_KEY="..."
gemini -p "task"
# 100 requests/day
# Get key from: https://aistudio.google.com/apikey
```

**Vertex AI (Enterprise):**
```bash
# Requires Google Cloud project setup
# Configure via ~/.gemini/settings.json
# Higher rate limits for production
```

#### Integration Points

**Built-in Tools:**
- Google Search (web grounding)
- File operations (read, write, execute)
- Shell commands
- Web fetching

**MCP Integration:**
```json
// ~/.gemini/settings.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {"GITHUB_TOKEN": "..."}
    }
  }
}
```

**FastMCP Integration:**
```python
# Python MCP server development with FastMCP
# Seamless integration with Gemini CLI
# Custom tools automatically discovered
```

**Slash Commands:**
```bash
/tools                # View available tools
/security:analyze     # Run security scan
/deploy              # Deploy to Cloud Run
# Custom commands from .gemini/commands/
```

**Exit Codes:**
- Specific codes for automation/scripting
- Useful for CI/CD integration
- Error handling in scripts

---

## Section 3: Capability Matrix

| Capability | Codex CLI | Cursor Agent CLI | Gemini CLI |
|------------|-----------|------------------|------------|
| **Code Generation** | ✅ GPT-5 | ✅ Multi-model | ✅ Gemini 2.5 Pro |
| **File Reading** | ✅ Local | ✅ Local | ✅ Local |
| **File Writing** | ✅ Local | ✅ Local | ✅ Local |
| **File Editing** | ✅ Patches | ✅ Direct | ✅ Direct |
| **Command Execution** | ✅ With approval | ✅ With approval | ✅ With approval |
| **Streaming Output** | ❌ (JSON steps) | ✅ NDJSON | ❌ (Full response) |
| **Non-Interactive Mode** | ✅ Quiet/Pipe | ✅ Print mode | ✅ Prompt mode |
| **JSON Output** | ✅ Pipe/Quiet | ✅ Three formats | ✅ --output-format |
| **Session Management** | ⚠️ Limited | ✅ Resume/ls | ⚠️ Basic |
| **MCP Integration** | ✅ config.toml | ✅ mcp.json | ✅ settings.json |
| **Custom Tools** | ✅ Via MCP | ✅ Via MCP | ✅ Via MCP + Built-in |
| **Multi-modal Input** | ✅ Screenshots | ⚠️ Limited | ✅ Images |
| **Web Search** | ⚠️ Via MCP | ⚠️ Via MCP | ✅ Built-in Google |
| **Git Integration** | ⚠️ Via MCP | ⚠️ Via MCP | ✅ GitHub MCP |
| **Sub-agent Spawning** | ❌ Not documented | ✅ Headless recursion | ❌ Not documented |
| **API/SDK** | ✅ Node.js SDK | ⚠️ Background API | ✅ Core package |
| **Approval Modes** | ✅ 3 levels | ✅ Force flag | ⚠️ Basic |
| **Context Window** | ⚠️ Model-dependent | ⚠️ Model-dependent | ✅ 1M tokens |
| **Rate Limits (Free)** | Plan-dependent | Unknown | 60/min, 1000/day |
| **Open Source** | ✅ Apache-2.0 | ❌ Proprietary | ✅ Apache-2.0 |
| **CI/CD Ready** | ✅ Quiet mode | ✅ Headless | ✅ Non-interactive |
| **Progress Tracking** | ✅ To-do list | ✅ Stream events | ⚠️ Limited |
| **Custom Slash Commands** | ❌ | ❌ | ✅ .gemini/commands |
| **Python SDK** | ❌ | ❌ | ⚠️ Separate API |
| **Windows Support** | ⚠️ Experimental | ⚠️ Beta | ✅ Native |

**Legend:**
- ✅ Fully supported
- ⚠️ Partial/Limited support
- ❌ Not supported or not documented

---

## Section 4: Integration Requirements

### 4.1 OpenAI Codex CLI

#### Spawning and Control

**Basic Subprocess:**
```javascript
const { spawn } = require('child_process');

// Interactive mode
const codex = spawn('codex', ['analyze this code']);

// Non-interactive quiet mode with JSON
const codexQuiet = spawn('codex', ['-q', 'refactor utils.js']);

codexQuiet.stdout.on('data', (data) => {
  const jsonOutput = JSON.parse(data.toString());
  console.log('Reasoning step:', jsonOutput);
});
```

**Pipe Mode (stdin/stdout JSON):**
```javascript
const codexPipe = spawn('codex', ['--pipe']);

// Send JSON request
codexPipe.stdin.write(JSON.stringify({
  prompt: "Explain this function",
  context: {...}
}));
codexPipe.stdin.end();

// Receive JSON response
codexPipe.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  console.log(response);
});
```

**Using Node.js SDK:**
```javascript
// @openai/codex SDK provides API over pipe mode
const codex = require('@openai/codex');

const result = await codex.execute({
  prompt: "Fix authentication bug",
  mode: "auto-edit"
});
```

#### Context Passing Strategies

1. **Environment Variables:**
   ```bash
   OPENAI_API_KEY="sk-..." codex -q "task"
   ```

2. **Config File:**
   ```toml
   # ~/.codex/config.toml
   [authentication]
   method = "chatgpt"

   [approval]
   mode = "auto-edit"

   [mcp_servers.github]
   command = "npx"
   args = ["-y", "@modelcontextprotocol/server-github"]
   ```

3. **Working Directory:**
   - Codex uses current working directory as context
   - Automatically analyzes local files
   - Respects .gitignore patterns

4. **Multimodal Context:**
   - Can pass screenshots via command line
   - Diagram inputs for code generation

#### Session Management

**Limitations:**
- Limited built-in session management
- Focus on single-shot or interactive sessions
- State primarily managed through file system changes

**Workarounds:**
- Use config file for persistence
- MCP servers for stateful operations
- External session tracking in orchestrator

#### Error Handling Patterns

**Exit Codes:**
```bash
codex -q "task"; echo $?
# 0 = success
# Non-zero = error (specific codes not documented)
```

**Error Output:**
```javascript
codexProcess.stderr.on('data', (data) => {
  console.error('Codex error:', data.toString());
});

codexProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error('Codex failed with code:', code);
  }
});
```

**JSON Error Format (Quiet Mode):**
```json
{
  "type": "error",
  "message": "Authentication failed",
  "code": "AUTH_ERROR"
}
```

---

### 4.2 Cursor Agent CLI

#### Spawning and Control

**Basic Subprocess:**
```javascript
const { spawn } = require('child_process');

// Interactive mode
const cursor = spawn('cursor-agent', ['chat', 'fix the bug']);

// Non-interactive print mode with JSON
const cursorHeadless = spawn('cursor-agent', [
  '-p',
  'analyze security issues',
  '--output-format', 'json',
  '--force',
  '--model', 'gpt-5'
]);

cursorHeadless.stdout.on('data', (data) => {
  const result = JSON.parse(data.toString());
  console.log(result);
});
```

**Streaming Mode:**
```javascript
const cursorStream = spawn('cursor-agent', [
  '-p',
  'refactor authentication',
  '--output-format', 'stream-json'
]);

cursorStream.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      const event = JSON.parse(line);
      switch(event.type) {
        case 'system_init':
          console.log('Agent initialized');
          break;
        case 'delta':
          process.stdout.write(event.content);
          break;
        case 'tool_call':
          console.log('Tool:', event.tool, event.args);
          break;
        case 'result':
          console.log('Completed:', event.status);
          break;
      }
    }
  });
});
```

**Sub-agent Spawning (Recursive):**
```javascript
// Main agent spawns sub-agents for parallel tasks
const spawnSubAgent = (task, model = 'gpt-5') => {
  return spawn('cursor-agent', [
    '-p', task,
    '--output-format', 'text',
    '--force',
    '--model', model
  ]);
};

// Fan-out pattern
const subAgent1 = spawnSubAgent('Implement user auth');
const subAgent2 = spawnSubAgent('Create API endpoints');
const subAgent3 = spawnSubAgent('Write unit tests');

// Fan-in results
Promise.all([
  collectOutput(subAgent1),
  collectOutput(subAgent2),
  collectOutput(subAgent3)
]).then(results => {
  console.log('All sub-agents completed:', results);
});
```

#### Context Passing Strategies

1. **Environment Variables:**
   ```bash
   export CURSOR_API_KEY="your-key"
   cursor-agent -p "task"
   ```

2. **MCP Configuration:**
   ```json
   // .cursor/mcp.json (project-level)
   {
     "mcpServers": {
       "project-context": {
         "command": "node",
         "args": ["./mcp-server.js"],
         "env": {
           "PROJECT_ID": "123",
           "CONTEXT": "auth-module"
         }
       }
     }
   }
   ```

3. **Working Directory:**
   - Cursor analyzes files in current directory
   - Uses MCP config from `.cursor/mcp.json`
   - Falls back to global `~/.cursor/mcp.json`

4. **Resume Sessions:**
   ```bash
   # Continue previous conversation
   cursor-agent resume
   cursor-agent --resume="chat-abc123"
   ```

#### Session Management

**List Sessions:**
```bash
cursor-agent ls
# Shows previous chat sessions with IDs
```

**Resume Specific Session:**
```bash
cursor-agent --resume="chat-abc123"
```

**Programmatic Session Handling:**
```javascript
const { exec } = require('child_process');

// List sessions
exec('cursor-agent ls', (error, stdout) => {
  const sessions = parseSessionList(stdout);
  console.log('Available sessions:', sessions);
});

// Resume latest
const cursor = spawn('cursor-agent', ['resume']);
```

#### Error Handling Patterns

**Exit Codes:**
```bash
cursor-agent -p "task" --output-format json
echo $?
# 0 = success
# Non-zero = error
```

**Error Output (JSON):**
```json
{
  "error": true,
  "message": "Model API key invalid",
  "code": "AUTH_ERROR",
  "details": {...}
}
```

**Stream Error Events:**
```json
{"type": "error", "message": "File not found", "file": "src/utils.js"}
```

**Error Handling Code:**
```javascript
cursorProcess.on('error', (err) => {
  console.error('Failed to start cursor-agent:', err);
});

cursorProcess.stderr.on('data', (data) => {
  console.error('Cursor stderr:', data.toString());
});

cursorProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error('Cursor exited with error code:', code);
  }
});
```

---

### 4.3 Google Gemini CLI

#### Spawning and Control

**Basic Subprocess:**
```javascript
const { spawn } = require('child_process');

// Interactive mode
const gemini = spawn('gemini');

// Non-interactive with JSON
const geminiNonInteractive = spawn('gemini', [
  '-p', 'analyze codebase architecture',
  '--output-format', 'json',
  '-m', 'gemini-2.5-pro'
]);

geminiNonInteractive.stdout.on('data', (data) => {
  const result = JSON.parse(data.toString());
  console.log(result);
});
```

**Multi-directory Context:**
```javascript
const geminiWithContext = spawn('gemini', [
  '-p', 'explain the auth system',
  '--include-directories', '../lib,../docs',
  '--output-format', 'json'
]);
```

**Model Selection:**
```javascript
const geminiFlash = spawn('gemini', [
  '-p', 'quick code review',
  '-m', 'gemini-2.5-flash',  // Faster model
  '--output-format', 'json'
]);

const geminiPro = spawn('gemini', [
  '-p', 'comprehensive analysis',
  '-m', 'gemini-2.5-pro',    // More capable
  '--output-format', 'json'
]);
```

#### Context Passing Strategies

1. **Environment Variables:**
   ```bash
   export GEMINI_API_KEY="..."
   gemini -p "task" --output-format json
   ```

2. **MCP Server Configuration:**
   ```json
   // ~/.gemini/settings.json
   {
     "mcpServers": {
       "database": {
         "command": "python",
         "args": ["db_mcp_server.py"],
         "env": {
           "DB_CONNECTION": "postgresql://...",
           "API_KEY": "..."
         }
       },
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_TOKEN": "ghp_..."
         }
       }
     }
   }
   ```

3. **Custom Slash Commands:**
   ```toml
   # <project>/.gemini/commands/deploy.toml
   name = "deploy"
   description = "Deploy application to Cloud Run"
   prompt = """
   Deploy the current application to Google Cloud Run:
   1. Build container image
   2. Push to artifact registry
   3. Deploy to Cloud Run
   4. Verify deployment
   """
   ```

4. **Directory Context:**
   ```bash
   # Current directory + additional paths
   gemini --include-directories ../shared,../config
   ```

#### Session Management

**Limitations:**
- Limited built-in session/conversation history
- Each invocation is relatively independent
- State managed through file system changes

**Custom Solutions:**
```javascript
// Maintain conversation context externally
const conversationHistory = [];

function callGemini(prompt) {
  const fullPrompt = `
    Previous context: ${JSON.stringify(conversationHistory)}

    New request: ${prompt}
  `;

  const gemini = spawn('gemini', [
    '-p', fullPrompt,
    '--output-format', 'json'
  ]);

  // Collect response and add to history
  gemini.stdout.on('data', (data) => {
    const response = JSON.parse(data.toString());
    conversationHistory.push({ prompt, response });
  });
}
```

#### Error Handling Patterns

**Exit Codes:**
```bash
gemini -p "task" --output-format json
echo $?
# Specific exit codes for different failure reasons
```

**Exit Code Documentation:**
- Gemini CLI uses specific exit codes to indicate termination reason
- Especially useful for scripting and automation
- Check exit code for error handling in scripts

**Error Output:**
```javascript
geminiProcess.stderr.on('data', (data) => {
  console.error('Gemini error:', data.toString());
});

geminiProcess.on('exit', (code) => {
  switch(code) {
    case 0:
      console.log('Success');
      break;
    case 1:
      console.error('General error');
      break;
    // Other codes as documented
    default:
      console.error('Unknown error code:', code);
  }
});
```

**JSON Error Format:**
```json
{
  "error": {
    "message": "API quota exceeded",
    "code": "QUOTA_EXCEEDED",
    "details": {
      "daily_limit": 1000,
      "requests_made": 1000
    }
  }
}
```

**Built-in Error Handling:**
- Rate limiting errors clearly indicated
- Authentication failures with remediation steps
- Model unavailability with fallback suggestions

---

## Section 5: Concrete Examples

### 5.1 OpenAI Codex CLI Examples

#### Example 1: Non-Interactive Code Analysis

**Command:**
```bash
codex -q "Analyze the authentication module for security vulnerabilities"
```

**Expected Output (JSON stream):**
```json
{"type":"reasoning_step","step":1,"content":"Reading auth.js file..."}
{"type":"reasoning_step","step":2,"content":"Analyzing password hashing implementation..."}
{"type":"reasoning_step","step":3,"content":"Checking for SQL injection vulnerabilities..."}
{"type":"result","vulnerabilities":["Weak password hashing","Missing input validation"],"recommendations":["Use bcrypt with salt rounds >= 12","Add input sanitization"]}
```

#### Example 2: Pipe Mode Integration

**Input JSON:**
```json
{
  "prompt": "Refactor this function to use async/await",
  "file": "src/utils.js",
  "function": "fetchUserData",
  "context": {
    "framework": "express",
    "style_guide": "airbnb"
  }
}
```

**Command:**
```bash
echo '{"prompt":"Refactor to async/await","file":"src/utils.js"}' | codex --pipe
```

**Expected Output:**
```json
{
  "status": "success",
  "changes": {
    "file": "src/utils.js",
    "diff": "...",
    "explanation": "Converted callback-based code to async/await pattern"
  }
}
```

#### Example 3: MCP Integration (Node.js)

**Configuration:**
```toml
# ~/.codex/config.toml
[mcp_servers.database]
command = "npx"
args = ["-y", "@example/database-mcp-server"]

[mcp_servers.database.env]
DB_HOST = "localhost"
DB_NAME = "myapp"
```

**Usage:**
```bash
codex "Query the database for users created in the last 24 hours"
```

**Expected Behavior:**
- Codex detects database MCP server
- Uses MCP tools to query database
- Returns results and generates summary code

#### Example 4: Automated CI/CD Pipeline

**GitHub Actions Example:**
```yaml
name: Code Review with Codex

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Codex
        run: npm install -g @openai/codex

      - name: Run Codex Analysis
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          codex -q "Review the code changes in this PR for bugs and security issues" > review.json
          cat review.json

      - name: Post Review
        run: |
          # Parse review.json and post comment to PR
          node scripts/post-review.js
```

---

### 5.2 Cursor Agent CLI Examples

#### Example 1: Non-Interactive with JSON Output

**Command:**
```bash
cursor-agent -p "Find and fix all console.log statements in the codebase" \
  --output-format json \
  --force \
  --model gpt-5
```

**Expected Output:**
```json
{
  "result": "Found and fixed 23 console.log statements",
  "files_modified": [
    "src/utils.js",
    "src/api/handlers.js",
    "src/components/UserList.jsx"
  ],
  "changes": [
    {
      "file": "src/utils.js",
      "lines_changed": 5,
      "description": "Replaced console.log with proper logger"
    }
  ],
  "status": "success"
}
```

#### Example 2: Streaming Progress (NDJSON)

**Command:**
```bash
cursor-agent -p "Refactor the authentication system to use JWT" \
  --output-format stream-json
```

**Expected Output (NDJSON stream):**
```json
{"type":"system_init","timestamp":1704123456,"model":"gpt-5"}
{"type":"delta","content":"Analyzing current authentication system..."}
{"type":"tool_call","tool":"read_file","args":{"path":"src/auth.js"}}
{"type":"delta","content":"Found session-based auth, planning JWT migration..."}
{"type":"tool_call","tool":"edit_file","args":{"path":"src/auth.js","changes":"..."}}
{"type":"delta","content":"Updated auth.js with JWT implementation..."}
{"type":"tool_call","tool":"create_file","args":{"path":"src/middleware/jwt.js"}}
{"type":"result","status":"complete","summary":"JWT authentication implemented"}
```

#### Example 3: Sub-Agent Orchestration

**Orchestrator Script:**
```javascript
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function orchestrateFeature() {
  // Main agent coordinates sub-agents

  // Sub-agent 1: Backend implementation
  const backend = spawn('cursor-agent', [
    '-p', 'Implement REST API endpoints for user management with Express',
    '--output-format', 'text',
    '--force',
    '--model', 'gpt-5'
  ]);

  // Sub-agent 2: Frontend implementation
  const frontend = spawn('cursor-agent', [
    '-p', 'Create React components for user management UI',
    '--output-format', 'text',
    '--force',
    '--model', 'gpt-5'
  ]);

  // Sub-agent 3: Tests
  const tests = spawn('cursor-agent', [
    '-p', 'Write comprehensive tests for user management feature',
    '--output-format', 'text',
    '--force',
    '--model', 'gpt-5'
  ]);

  // Wait for all sub-agents
  const results = await Promise.all([
    collectOutput(backend),
    collectOutput(frontend),
    collectOutput(tests)
  ]);

  console.log('Feature complete:', results);
}

function collectOutput(process) {
  return new Promise((resolve, reject) => {
    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    process.on('exit', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Process failed with code ${code}`));
    });
  });
}
```

#### Example 4: Session Resume

**Command:**
```bash
# List previous sessions
cursor-agent ls

# Output:
# chat-abc123: "Implement user authentication" (2 hours ago)
# chat-def456: "Fix database connection issues" (1 day ago)

# Resume specific session
cursor-agent --resume="chat-abc123"
```

**In Script:**
```javascript
const { execSync } = require('child_process');

// Get latest session
const sessions = execSync('cursor-agent ls').toString();
const latestSession = parseLatestSession(sessions);

// Resume with new prompt
const cursor = spawn('cursor-agent', [
  '--resume', latestSession.id,
  'chat',
  'Now add password reset functionality'
]);
```

#### Example 5: MCP Integration

**Configuration (.cursor/mcp.json):**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    },
    "database": {
      "command": "node",
      "args": ["./mcp-servers/database.js"],
      "env": {
        "DB_URL": "postgresql://localhost/myapp"
      }
    }
  }
}
```

**Usage:**
```bash
cursor-agent -p "Create a GitHub issue for the bug we just found and update the database status"
```

**Expected Behavior:**
- Cursor detects GitHub and database MCP servers
- Uses GitHub MCP to create issue
- Uses database MCP to update bug tracking table
- Returns issue URL and database confirmation

---

### 5.3 Google Gemini CLI Examples

#### Example 1: Non-Interactive Analysis

**Command:**
```bash
gemini -p "Analyze the architecture of this codebase and suggest improvements" \
  --output-format json \
  -m gemini-2.5-pro
```

**Expected Output:**
```json
{
  "response": "Architecture Analysis:\n\n1. Current Structure:\n- Monolithic Express.js application\n- Tightly coupled components\n- No clear separation of concerns\n\n2. Suggestions:\n- Implement layered architecture\n- Separate routes, controllers, services\n- Add dependency injection\n- Consider microservices for auth module",
  "model": "gemini-2.5-pro",
  "tokens_used": 2341,
  "context_files": [
    "src/server.js",
    "src/routes/index.js",
    "src/models/User.js"
  ],
  "status": "completed"
}
```

#### Example 2: Multi-Directory Context

**Command:**
```bash
gemini --include-directories ../shared,../config,../docs \
  -p "Explain how the authentication system works across all modules" \
  --output-format json
```

**Expected Behavior:**
- Gemini analyzes files from current directory + specified directories
- Creates comprehensive context from multiple sources
- Explains authentication flow across modules

#### Example 3: Custom Slash Command

**Command File (.gemini/commands/test.toml):**
```toml
name = "test"
description = "Run full test suite with coverage analysis"
prompt = """
Execute the following test workflow:
1. Run unit tests with Jest
2. Run integration tests
3. Generate coverage report
4. Analyze coverage and suggest areas needing more tests
5. Identify flaky tests
"""
```

**Usage:**
```bash
gemini
> /test
```

**Or Non-Interactive:**
```bash
# Note: Custom slash commands typically work in interactive mode
# For non-interactive, use full prompt
gemini -p "Run full test suite: jest --coverage && analyze results" --output-format json
```

#### Example 4: Built-in Google Search

**Command:**
```bash
gemini -p "Research the latest best practices for Node.js security in 2025 and apply them to our codebase" \
  --output-format json
```

**Expected Behavior:**
- Gemini uses built-in Google Search tool
- Fetches latest security best practices from web
- Analyzes current codebase
- Suggests specific security improvements based on 2025 standards

#### Example 5: MCP Integration with FastMCP

**Python MCP Server (custom_tools.py):**
```python
from fastmcp import FastMCP

mcp = FastMCP("Custom Dev Tools")

@mcp.tool()
async def deploy_to_staging(app_name: str) -> str:
    """Deploy application to staging environment"""
    # Deployment logic here
    return f"Deployed {app_name} to staging"

@mcp.tool()
async def run_security_scan(directory: str) -> dict:
    """Run security vulnerability scan"""
    # Security scan logic
    return {
        "vulnerabilities": [...],
        "severity": "medium"
    }

if __name__ == "__main__":
    mcp.run()
```

**Configuration (~/.gemini/settings.json):**
```json
{
  "mcpServers": {
    "devtools": {
      "command": "python",
      "args": ["custom_tools.py"],
      "env": {
        "STAGING_URL": "https://staging.example.com",
        "API_KEY": "..."
      }
    }
  }
}
```

**Usage:**
```bash
gemini -p "Run a security scan on the src directory and deploy to staging if no critical issues found" \
  --output-format json
```

**Expected Behavior:**
- Gemini detects custom MCP server tools
- Runs `run_security_scan` tool
- Analyzes results
- If safe, runs `deploy_to_staging` tool
- Returns comprehensive report

#### Example 6: CI/CD Integration

**GitLab CI Example:**
```yaml
stages:
  - analyze
  - deploy

code_analysis:
  stage: analyze
  script:
    - npm install -g @google/gemini-cli
    - |
      gemini -p "Analyze code quality and security for files changed in this commit" \
        --output-format json > analysis.json
    - cat analysis.json
    - node scripts/check-analysis.js  # Fail pipeline if critical issues
  artifacts:
    reports:
      codequality: analysis.json

deploy_with_gemini:
  stage: deploy
  script:
    - |
      gemini -p "Deploy application to Cloud Run with these requirements: \
        - Use artifact registry \
        - Enable authentication \
        - Set up monitoring" \
        --output-format json
  only:
    - main
```

#### Example 7: Scripting with Exit Codes

**Bash Script:**
```bash
#!/bin/bash

# Run Gemini analysis
gemini -p "Check if the codebase follows our style guide" --output-format json > style_check.json

# Check exit code
if [ $? -eq 0 ]; then
    echo "Style check passed"

    # Parse JSON result
    violations=$(jq '.violations | length' style_check.json)

    if [ "$violations" -gt 0 ]; then
        echo "Found $violations style violations"
        exit 1
    fi
else
    echo "Style check failed with error code: $?"
    exit 1
fi
```

---

## Section 6: Gaps & Challenges

### 6.1 What Works Differently Than Expected

#### Codex CLI

**Expectation:** Full REST API or SDK for programmatic control
**Reality:** Primarily pipe mode (stdin/stdout JSON) and Node.js SDK wrapper
**Impact:** Requires process spawning and stream handling for integration

**Expectation:** Comprehensive session management
**Reality:** Limited session persistence, focus on single interactions
**Impact:** A2A orchestrators need external session management

**Expectation:** Standardized JSON output format
**Reality:** Quiet mode outputs reasoning steps as separate JSON objects
**Impact:** Need to parse multiple JSON objects from stream, not single response

**Expectation:** Windows native support
**Reality:** Experimental Windows support via WSL
**Impact:** May limit deployment options on Windows servers

#### Cursor Agent CLI

**Expectation:** Fully documented public API
**Reality:** Beta CLI with evolving features, proprietary
**Impact:** API stability concerns, documentation may lag features

**Expectation:** Open-source availability
**Reality:** Proprietary tool from Cursor
**Impact:** Cannot inspect internals or contribute fixes

**Expectation:** Consistent model availability
**Reality:** Depends on Cursor service backend
**Impact:** Model selection may be limited or changed by service

**Expectation:** Complete session persistence
**Reality:** Session resume works but may have limitations
**Impact:** Long-running A2A workflows may lose context

#### Gemini CLI

**Expectation:** Real-time streaming output
**Reality:** Full response returned at once (no token streaming in JSON mode)
**Impact:** Less granular progress updates compared to Cursor's stream-json

**Expectation:** Built-in session/conversation management
**Reality:** Each invocation is relatively independent
**Impact:** Multi-turn A2A conversations require external state management

**Expectation:** Python CLI (given Google's Python focus)
**Reality:** Node.js-based CLI (Python SDK exists separately for API)
**Impact:** Node.js required for CLI; Python users need different approach

**Expectation:** Direct integration with Google Cloud services
**Reality:** Requires separate configuration and authentication
**Impact:** More setup for Cloud Run, GKE, etc. integration

---

### 6.2 What's Missing from Current A2A Design

#### 1. Standardized Agent Communication Protocol

**Gap:** Each CLI has different output formats and communication patterns
- Codex: Multiple JSON objects for reasoning steps
- Cursor: Three different output formats (json, stream-json, text)
- Gemini: Single JSON response

**A2A Requirement:** Unified message format for agent-to-agent communication

**Proposed Solution:**
```typescript
interface A2AMessage {
  type: 'request' | 'response' | 'event' | 'error';
  agent: {
    id: string;
    name: string;
    type: 'codex' | 'cursor' | 'gemini';
  };
  payload: {
    prompt?: string;
    result?: any;
    event?: string;
    error?: Error;
  };
  context: {
    session_id: string;
    task_id: string;
    parent_task_id?: string;
  };
  timestamp: number;
}
```

#### 2. Session Management Layer

**Gap:** No CLI provides robust multi-turn conversation state management suitable for A2A
- Codex: Minimal session support
- Cursor: Resume feature but limited API
- Gemini: No built-in conversation history

**A2A Requirement:** Persistent, shareable session state across agents

**Proposed Solution:**
```typescript
interface A2ASession {
  id: string;
  agents: Array<{
    agent_id: string;
    cli_type: 'codex' | 'cursor' | 'gemini';
    context: any;
  }>;
  conversation_history: A2AMessage[];
  shared_context: {
    working_directory: string;
    files_modified: string[];
    current_task: string;
    dependencies: Record<string, any>;
  };
  created_at: number;
  updated_at: number;
}
```

#### 3. Agent Capability Discovery

**Gap:** No standardized way to discover what each agent can do
- Codex: Capabilities implicit from model
- Cursor: MCP tools discoverable but format-specific
- Gemini: Built-in + MCP tools, slash commands

**A2A Requirement:** Runtime capability discovery and negotiation

**Proposed Solution:**
```typescript
interface AgentCapabilities {
  agent_type: 'codex' | 'cursor' | 'gemini';
  version: string;
  features: {
    code_generation: boolean;
    file_operations: boolean;
    command_execution: boolean;
    web_search: boolean;
    multimodal: boolean;
    streaming: boolean;
  };
  models: Array<{
    name: string;
    context_window: number;
    capabilities: string[];
  }>;
  mcp_tools: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  rate_limits: {
    requests_per_minute: number;
    requests_per_day: number;
  };
}
```

#### 4. Task Decomposition and Routing

**Gap:** No mechanism to intelligently route subtasks to appropriate agents

**A2A Requirement:** Task routing based on agent capabilities

**Example Scenario:**
```
Task: "Build a full-stack user authentication system"

Current A2A limitation:
- No built-in way to decide which CLI handles which part
- Must manually orchestrate or use simple rules

Needed:
- Capability-based routing
  - Codex: Backend API (GPT-5 excels at backend)
  - Cursor: Multi-file refactoring (streaming progress)
  - Gemini: Research + documentation (Google Search, large context)
```

**Proposed Solution:**
```typescript
interface TaskRouter {
  analyzeTask(task: string): Promise<TaskAnalysis>;
  routeToAgent(subtask: Subtask, capabilities: AgentCapabilities[]): Agent;
  optimizeExecution(tasks: Subtask[]): ExecutionPlan;
}

interface TaskAnalysis {
  subtasks: Subtask[];
  dependencies: Map<string, string[]>;
  estimated_complexity: 'low' | 'medium' | 'high';
  recommended_agents: Record<string, string[]>; // subtask_id -> agent_types
}
```

#### 5. Error Recovery and Retry Logic

**Gap:** Each CLI has different error handling and recovery
- Codex: JSON errors in quiet mode
- Cursor: Exit codes + error events
- Gemini: Specific exit codes, quota errors

**A2A Requirement:** Unified error recovery strategies

**Proposed Solution:**
```typescript
interface A2AErrorHandler {
  handleError(error: A2AError): Promise<RecoveryAction>;
  retry(task: Task, options: RetryOptions): Promise<Result>;
  fallback(task: Task, failedAgent: Agent, alternatives: Agent[]): Promise<Result>;
}

interface A2AError {
  type: 'auth' | 'quota' | 'timeout' | 'invalid_input' | 'model_error' | 'network';
  agent: string;
  message: string;
  recoverable: boolean;
  retry_after?: number;
}

interface RecoveryAction {
  action: 'retry' | 'fallback' | 'skip' | 'fail';
  delay_ms?: number;
  alternative_agent?: Agent;
}
```

#### 6. Cost and Resource Management

**Gap:** No unified way to track costs and usage across CLIs
- Codex: Plan-based (ChatGPT subscription)
- Cursor: Unknown/service-based
- Gemini: Free tier with clear limits, or API key

**A2A Requirement:** Cost tracking and optimization

**Proposed Solution:**
```typescript
interface A2ACostTracker {
  estimateCost(task: Task, agent: Agent): Promise<CostEstimate>;
  trackUsage(agent: Agent, result: Result): void;
  optimizeForCost(tasks: Task[], budget: number): ExecutionPlan;
}

interface CostEstimate {
  agent: string;
  estimated_tokens: number;
  estimated_cost_usd: number;
  estimated_time_seconds: number;
  confidence: number;
}
```

#### 7. Progress Monitoring and Observability

**Gap:** Different progress reporting mechanisms
- Codex: Reasoning steps in quiet mode
- Cursor: Stream-json events (excellent)
- Gemini: Full response at end (no streaming)

**A2A Requirement:** Unified progress tracking

**Proposed Solution:**
```typescript
interface A2AObservability {
  subscribeToProgress(agent: Agent, callback: ProgressCallback): Unsubscribe;
  getAgentStatus(agent: Agent): AgentStatus;
  getTaskProgress(task_id: string): TaskProgress;
}

interface TaskProgress {
  task_id: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percent: number;
  current_step: string;
  steps_completed: number;
  steps_total: number;
  estimated_completion: number;
  events: ProgressEvent[];
}
```

#### 8. Context Sharing and Synchronization

**Gap:** No built-in mechanism for agents to share context
- Each CLI operates on file system
- MCP servers can provide shared context but not standardized
- No A2A-specific context sharing

**A2A Requirement:** Shared context store with synchronization

**Proposed Solution:**
```typescript
interface A2AContextStore {
  set(key: string, value: any, scope: 'global' | 'session' | 'task'): Promise<void>;
  get(key: string, scope: 'global' | 'session' | 'task'): Promise<any>;
  subscribe(pattern: string, callback: ContextCallback): Unsubscribe;
  synchronize(agents: Agent[]): Promise<void>;
}

// Example usage:
// Agent 1 (Codex) discovers API structure
await context.set('api_structure', apiSchema, 'session');

// Agent 2 (Cursor) uses it for frontend
const apiSchema = await context.get('api_structure', 'session');

// Agent 3 (Gemini) monitors changes
context.subscribe('api_structure', (newValue) => {
  console.log('API structure updated:', newValue);
});
```

---

### 6.3 New Requirements from Research

#### 1. Multi-CLI Orchestration Framework

**Requirement:** Framework to manage multiple CLI agents concurrently

**Components:**
- Agent registry and lifecycle management
- Task queue and scheduler
- Resource allocation and throttling
- Result aggregation

**Example Architecture:**
```typescript
class A2AOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: TaskQueue;
  private contextStore: A2AContextStore;

  async registerAgent(config: AgentConfig): Promise<Agent> {
    const agent = await this.createAgent(config);
    this.agents.set(agent.id, agent);
    return agent;
  }

  async executeTask(task: Task): Promise<Result> {
    // 1. Analyze task and decompose
    const subtasks = await this.analyzeTask(task);

    // 2. Route to appropriate agents
    const execution_plan = await this.createExecutionPlan(subtasks);

    // 3. Execute with monitoring
    const results = await this.executeWithMonitoring(execution_plan);

    // 4. Aggregate and return
    return this.aggregateResults(results);
  }
}
```

#### 2. Adapter Pattern for CLI Differences

**Requirement:** Abstract away CLI-specific differences

**Implementation:**
```typescript
interface CLIAdapter {
  spawn(config: SpawnConfig): Promise<Process>;
  sendRequest(request: A2AMessage): Promise<void>;
  receiveResponse(): Promise<A2AMessage>;
  handleError(error: Error): Promise<RecoveryAction>;
}

class CodexAdapter implements CLIAdapter {
  spawn(config: SpawnConfig): Promise<Process> {
    return spawn('codex', ['-q', ...config.args]);
  }

  async receiveResponse(): Promise<A2AMessage> {
    // Parse multiple JSON objects from stdout
    // Convert to unified A2AMessage format
  }
}

class CursorAdapter implements CLIAdapter {
  spawn(config: SpawnConfig): Promise<Process> {
    return spawn('cursor-agent', ['-p', ...config.args, '--output-format', 'stream-json']);
  }

  async receiveResponse(): Promise<A2AMessage> {
    // Parse NDJSON stream
    // Convert to unified A2AMessage format
  }
}

class GeminiAdapter implements CLIAdapter {
  spawn(config: SpawnConfig): Promise<Process> {
    return spawn('gemini', ['-p', ...config.args, '--output-format', 'json']);
  }

  async receiveResponse(): Promise<A2AMessage> {
    // Parse single JSON response
    // Convert to unified A2AMessage format
  }
}
```

#### 3. MCP as A2A Communication Channel

**Requirement:** Leverage MCP for agent-to-agent communication

**Insight:** All three CLIs support MCP - can be used as standardized communication layer

**Proposal:**
```typescript
// Create A2A MCP Server
class A2AMCPServer {
  @tool()
  async sendToAgent(agent_id: string, message: A2AMessage): Promise<Result> {
    const agent = this.agents.get(agent_id);
    return await agent.process(message);
  }

  @tool()
  async getAgentCapabilities(agent_id: string): Promise<AgentCapabilities> {
    const agent = this.agents.get(agent_id);
    return agent.capabilities;
  }

  @tool()
  async shareContext(key: string, value: any): Promise<void> {
    await this.contextStore.set(key, value, 'session');
  }

  @tool()
  async getSharedContext(key: string): Promise<any> {
    return await this.contextStore.get(key, 'session');
  }
}

// Agents communicate through MCP
// Agent 1 (Codex) with A2A MCP configured
codex "Use the A2A MCP to send the API schema to agent-cursor-01"

// Agent 2 (Cursor) receives via MCP
// No need for orchestrator to manually pass data
```

#### 4. Agent Health Monitoring

**Requirement:** Monitor agent health and performance

**Implementation:**
```typescript
interface AgentHealth {
  agent_id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_heartbeat: number;
  metrics: {
    response_time_ms: number;
    error_rate: number;
    success_rate: number;
    queue_depth: number;
  };
  rate_limits: {
    current_usage: number;
    limit: number;
    reset_at: number;
  };
}

class A2AHealthMonitor {
  async checkHealth(agent: Agent): Promise<AgentHealth> {
    // Send test request
    // Measure response time
    // Check rate limits
    // Return health status
  }

  async autoRecover(agent: Agent): Promise<void> {
    // Restart if unhealthy
    // Clear queue
    // Reset connections
  }
}
```

#### 5. Testing and Simulation Framework

**Requirement:** Test A2A workflows without calling actual APIs

**Implementation:**
```typescript
class A2ASimulator {
  mockAgent(type: 'codex' | 'cursor' | 'gemini'): MockAgent {
    return new MockAgent(type);
  }

  recordInteraction(agent: Agent, request: A2AMessage, response: A2AMessage): void {
    // Record for replay
  }

  replayInteraction(recording: Recording): Promise<A2AMessage> {
    // Replay without API calls
  }
}

// Usage in tests
describe('A2A Workflow', () => {
  it('should orchestrate multi-agent code generation', async () => {
    const orchestrator = new A2AOrchestrator();

    const codex = orchestrator.mockAgent('codex');
    const cursor = orchestrator.mockAgent('cursor');

    codex.mockResponse('Implement API', { code: '...' });
    cursor.mockResponse('Create UI', { code: '...' });

    const result = await orchestrator.executeTask('Build user auth system');

    expect(result.status).toBe('success');
  });
});
```

---

## Section 7: Recommendations for A2A Implementation

### 7.1 Immediate Actions

1. **Build Adapter Layer**
   - Create unified interface for all three CLIs
   - Abstract spawn, request, response patterns
   - Handle CLI-specific output formats

2. **Implement Context Store**
   - Simple key-value store for shared context
   - Support session and task scopes
   - Enable agent-to-agent data passing

3. **Create Task Router**
   - Basic capability matching
   - Route tasks to appropriate agents
   - Handle dependencies between subtasks

### 7.2 Short-term Enhancements

1. **Session Management**
   - Implement persistent session state
   - Support multi-turn conversations
   - Enable session resume after failures

2. **Error Recovery**
   - Unified error handling across CLIs
   - Retry logic with exponential backoff
   - Fallback to alternative agents

3. **Progress Monitoring**
   - Subscribe to agent progress
   - Aggregate progress across agents
   - Real-time status updates

### 7.3 Long-term Vision

1. **MCP-Based A2A Communication**
   - Build A2A MCP server
   - Agents communicate through MCP tools
   - Eliminate need for orchestrator in some cases

2. **Self-Optimizing Orchestration**
   - Learn from successful workflows
   - Optimize agent selection
   - Cost and performance optimization

3. **A2A Protocol Standardization**
   - Propose standard A2A message format
   - Work with CLI vendors on integration
   - Contribute to MCP specification

---

## Appendix A: Installation Commands Summary

```bash
# OpenAI Codex CLI
npm install -g @openai/codex
# OR
brew install codex

# Cursor Agent CLI
curl https://cursor.com/install -fsSL | bash

# Google Gemini CLI
npm install -g @google/gemini-cli
# OR
brew install gemini-cli
# OR
npx https://github.com/google-gemini/gemini-cli
```

---

## Appendix B: Key Configuration Files

```bash
# Codex
~/.codex/config.toml

# Cursor
~/.cursor/mcp.json           # Global
.cursor/mcp.json             # Project

# Gemini
~/.gemini/settings.json      # Global
.gemini/commands/*.toml      # Custom slash commands
```

---

## Appendix C: Useful Links

**OpenAI Codex CLI:**
- Repository: https://github.com/openai/codex
- NPM: https://www.npmjs.com/package/@openai/codex
- Docs: https://developers.openai.com/codex/cli/

**Cursor Agent CLI:**
- Docs: https://cursor.com/docs/cli/overview
- Blog: https://cursor.com/blog/cli

**Google Gemini CLI:**
- Repository: https://github.com/google-gemini/gemini-cli
- NPM: https://www.npmjs.com/package/@google/gemini-cli
- Docs: https://cloud.google.com/gemini/docs/codeassist/gemini-cli
- Tutorial Series: https://medium.com/google-cloud/gemini-cli-tutorial-series-77da7d494718

**MCP Resources:**
- Model Context Protocol: https://modelcontextprotocol.io
- FastMCP (Python): https://github.com/jlowin/fastmcp

---

## Appendix D: Research Methodology

**Search Strategy:**
1. Initial web searches for official documentation
2. GitHub repository analysis
3. NPM package documentation review
4. Community examples and tutorials
5. CLI help output analysis
6. Integration pattern research

**Sources:**
- Official documentation websites
- GitHub repositories
- NPM registry
- Developer blogs and tutorials
- Community forums (Hacker News, Reddit)
- YouTube tutorials
- Technical articles and guides

**Validation:**
- Cross-referenced multiple sources
- Verified installation commands
- Checked version numbers
- Confirmed feature availability
- Identified deprecated features

---

## Conclusion

All three CLI-based coding agents (Codex, Cursor, Gemini) are viable for A2A integration with distinct strengths:

- **Codex CLI**: Best for OpenAI ecosystem integration, pipe mode for programmatic use
- **Cursor Agent CLI**: Excellent streaming progress, sub-agent spawning, multi-model support
- **Gemini CLI**: Large context window, built-in Google Search, extensive MCP support, best free tier

**Key Enabler:** All support MCP, which can serve as a standardized communication layer for A2A.

**Critical Gap:** No existing standardized A2A protocol - must be built on top of these tools.

**Next Steps:** Build adapter layer, implement context sharing, and create task routing logic to enable true multi-agent collaboration.
