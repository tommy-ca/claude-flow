// utils.js - Shared CLI utility functions

import { Deno, existsSync } from './node-compat.js';

// Color formatting functions
export function printSuccess(message) {
  console.log(`✅ ${message}`);
}

export function printError(message) {
  console.log(`❌ ${message}`);
}

export function printWarning(message) {
  console.log(`⚠️  ${message}`);
}

export function printInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// Command validation helpers
export function validateArgs(args, minLength, usage) {
  if (args.length < minLength) {
    printError(`Usage: ${usage}`);
    return false;
  }
  return true;
}

// File system helpers
export async function ensureDirectory(path) {
  try {
    await Deno.mkdir(path, { recursive: true });
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
    return true;
  }
}

export async function fileExists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

// JSON helpers
export async function readJsonFile(path, defaultValue = {}) {
  try {
    const content = await Deno.readTextFile(path);
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

export async function writeJsonFile(path, data) {
  await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
}

// String helpers
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

export function truncateString(str, length = 100) {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Command execution helpers
export function parseFlags(args) {
  const flags = {};
  const filteredArgs = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const flagName = arg.substring(2);
      const nextArg = args[i + 1];
      
      if (nextArg && !nextArg.startsWith('--')) {
        flags[flagName] = nextArg;
        i++; // Skip next arg since we consumed it
      } else {
        flags[flagName] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flags
      const shortFlags = arg.substring(1);
      for (const flag of shortFlags) {
        flags[flag] = true;
      }
    } else {
      filteredArgs.push(arg);
    }
  }
  
  return { flags, args: filteredArgs };
}

// Process execution helpers
export async function runCommand(command, args = [], options = {}) {
  try {
    // Check if we're in Node.js or Deno environment
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js environment
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      
      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          ...options
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          resolve({
            success: code === 0,
            code: code || 0,
            stdout: stdout,
            stderr: stderr
          });
        });
        
        child.on('error', (err) => {
          resolve({
            success: false,
            code: -1,
            stdout: '',
            stderr: err.message
          });
        });
      });
    } else {
      // Deno environment
      const cmd = new Deno.Command(command, {
        args,
        ...options
      });
      
      const result = await cmd.output();
      
      return {
        success: result.code === 0,
        code: result.code,
        stdout: new TextDecoder().decode(result.stdout),
        stderr: new TextDecoder().decode(result.stderr)
      };
    }
  } catch (err) {
    return {
      success: false,
      code: -1,
      stdout: '',
      stderr: err.message
    };
  }
}

// Configuration helpers
export async function loadConfig(path = 'claude-flow.config.json') {
  const defaultConfig = {
    terminal: {
      poolSize: 10,
      recycleAfter: 20,
      healthCheckInterval: 30000,
      type: "auto"
    },
    orchestrator: {
      maxConcurrentTasks: 10,
      taskTimeout: 300000
    },
    memory: {
      backend: "json",
      path: "./memory/claude-flow-data.json"
    }
  };
  
  try {
    const content = await Deno.readTextFile(path);
    return { ...defaultConfig, ...JSON.parse(content) };
  } catch {
    return defaultConfig;
  }
}

export async function saveConfig(config, path = 'claude-flow.config.json') {
  await writeJsonFile(path, config);
}

// ID generation
export function generateId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

// Array helpers
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Environment helpers
export function getEnvVar(name, defaultValue = null) {
  return Deno.env.get(name) ?? defaultValue;
}

export function setEnvVar(name, value) {
  Deno.env.set(name, value);
}

// Validation helpers
export function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// Progress and status helpers
export function showProgress(current, total, message = '') {
  const percentage = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
  console.log(`\r${bar} ${percentage}% ${message}`);
}

export function clearLine() {
  console.log('\r\x1b[K');
}

// Async helpers
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      await sleep(delay * attempt);
    }
  }
}

// ruv-swarm MCP integration helpers
export async function callRuvSwarmMCP(tool, params = {}) {
  try {
    const command = 'npx';
    const args = ['ruv-swarm', 'mcp', 'call', tool, '--params', JSON.stringify(params)];
    
    const result = await runCommand(command, args, { 
      stdout: 'piped',
      stderr: 'piped'
    });
    
    if (!result.success) {
      throw new Error(`ruv-swarm MCP call failed: ${result.stderr}`);
    }
    
    try {
      return JSON.parse(result.stdout);
    } catch {
      return { success: true, output: result.stdout };
    }
  } catch (err) {
    printError(`Failed to call ruv-swarm MCP tool ${tool}: ${err.message}`);
    throw err;
  }
}

export async function execRuvSwarmHook(hookName, params = {}) {
  try {
    const command = 'npx';
    const args = ['ruv-swarm', 'hook', hookName];
    
    // Add parameters as CLI arguments
    Object.entries(params).forEach(([key, value]) => {
      args.push(`--${key}`);
      if (value !== true && value !== false) {
        args.push(String(value));
      }
    });
    
    const result = await runCommand(command, args, {
      stdout: 'piped',
      stderr: 'piped'
    });
    
    if (!result.success) {
      throw new Error(`ruv-swarm hook failed: ${result.stderr}`);
    }
    
    return {
      success: true,
      output: result.stdout,
      stderr: result.stderr
    };
  } catch (err) {
    printError(`Failed to execute ruv-swarm hook ${hookName}: ${err.message}`);
    throw err;
  }
}

export async function checkRuvSwarmAvailable() {
  try {
    const result = await runCommand('npx', ['ruv-swarm', '--version'], {
      stdout: 'piped',
      stderr: 'piped'
    });
    
    return result.success;
  } catch {
    return false;
  }
}

// Neural training specific helpers
export async function trainNeuralModel(modelName, dataSource, epochs = 50) {
  return await callRuvSwarmMCP('neural_train', {
    model: modelName,
    data: dataSource,
    epochs: epochs,
    timestamp: Date.now()
  });
}

export async function updateNeuralPattern(operation, outcome, metadata = {}) {
  return await callRuvSwarmMCP('neural_patterns', {
    action: 'learn',
    operation: operation,
    outcome: outcome,
    metadata: metadata,
    timestamp: Date.now()
  });
}

export async function getSwarmStatus(swarmId = null) {
  return await callRuvSwarmMCP('swarm_status', {
    swarmId: swarmId
  });
}

export async function spawnSwarmAgent(agentType, config = {}) {
  return await callRuvSwarmMCP('agent_spawn', {
    type: agentType,
    config: config,
    timestamp: Date.now()
  });
}