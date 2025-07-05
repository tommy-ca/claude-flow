#!/usr/bin/env node

/**
 * Main entry point for claude-flow CLI
 * This file is referenced in package.json "bin" field
 * Enables: npm install -g claude-flow or npx claude-flow@latest
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = __dirname;

// Define possible CLI paths
const binPath = join(scriptDir, 'bin', 'claude-flow');
const srcPath = join(scriptDir, 'src', 'cli', 'simple-cli.js');

// Function to run the CLI
function runCli(cliCommand, cliArgs) {
  const cli = spawn(cliCommand, cliArgs, {
    stdio: 'inherit',
    env: { ...process.env, CLAUDE_FLOW_ROOT: scriptDir }
  });
  
  cli.on('error', (error) => {
    console.error('❌ Failed to run claude-flow:', error.message);
    process.exit(1);
  });
  
  cli.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// Determine which CLI to run
if (existsSync(binPath)) {
  // Use the bin dispatcher (handles runtime detection)
  runCli(binPath, process.argv.slice(2));
} else if (existsSync(srcPath)) {
  // Direct Node.js execution of simple-cli.js
  runCli('node', [srcPath, ...process.argv.slice(2)]);
} else {
  console.error('❌ Error: Could not find claude-flow implementation');
  console.error('Expected either:');
  console.error(`  - ${binPath}`);
  console.error(`  - ${srcPath}`);
  console.error('\n💡 Try reinstalling: npm install -g claude-flow@latest');
  process.exit(1);
}