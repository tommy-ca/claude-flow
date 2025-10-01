/**
 * Basic Usage Examples for CLI Adapters
 *
 * Demonstrates simple, common usage patterns for each CLI adapter.
 */

import {
  detectAvailableAgents,
  createCodexAdapter,
  createCursorAdapter,
  createGeminiAdapter,
  createAdapter
} from '../index';

/**
 * Example 1: Auto-detect and use first available CLI
 */
async function autoDetectExample() {
  console.log('=== Auto-Detection Example ===\n');

  // Detect all available CLI agents
  const available = await detectAvailableAgents();

  console.log('Available CLI agents:');
  for (const agent of available) {
    console.log(`  - ${agent.displayName} v${agent.version || 'unknown'}`);
    console.log(`    Command: ${agent.command}`);
    console.log(`    Capabilities: ${agent.capabilities.join(', ')}`);
  }

  if (available.length === 0) {
    console.log('No CLI agents detected. Please install one:');
    console.log('  - npm install -g @openai/codex');
    console.log('  - curl https://cursor.com/install -fsSL | bash');
    console.log('  - npm install -g @google/gemini-cli');
    return;
  }

  // Use first available agent
  const firstAgent = available[0];
  console.log(`\nUsing ${firstAgent.displayName}...\n`);

  const adapter = createAdapter(firstAgent.name, {
    apiKey: process.env.API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY,
    projectRoot: process.cwd() // For Cursor
  });

  try {
    const response = await adapter.executeSync({
      role: 'user',
      content: 'Write a TypeScript function that calculates the factorial of a number using recursion.'
    });

    console.log('Response:');
    console.log(response.content);
    console.log('\nMetadata:', JSON.stringify(response.metadata, null, 2));
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 2: Using OpenAI Codex CLI
 */
async function codexExample() {
  console.log('\n=== OpenAI Codex Example ===\n');

  const adapter = createCodexAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    command: 'openai',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are an expert TypeScript developer who writes clean, efficient code.'
  });

  try {
    console.log('Executing task...');

    const response = await adapter.executeSync({
      role: 'user',
      content: `Refactor this code to use modern TypeScript features:

function getData(callback) {
  setTimeout(function() {
    callback(null, { data: 'result' });
  }, 1000);
}

getData(function(err, result) {
  if (err) {
    console.error(err);
  } else {
    console.log(result);
  }
});`
    });

    console.log('Refactored code:');
    console.log(response.content);

    if (response.metadata?.usage) {
      console.log('\nToken usage:', response.metadata.usage);
    }
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 3: Using Cursor Agent CLI with project context
 */
async function cursorExample() {
  console.log('\n=== Cursor Agent Example ===\n');

  const adapter = createCursorAdapter({
    apiKey: process.env.CURSOR_API_KEY!,
    command: 'cursor-agent',
    projectRoot: process.cwd(),
    enableLSP: true,
    fileContext: [
      'src/a2a/adapters/cli/base-cli-adapter.ts',
      'src/a2a/adapters/cli/codex-cli-adapter.ts'
    ],
    outputFormat: 'json',
    features: {
      pairProgramming: true,
      suggestions: true,
      refactoring: true
    }
  });

  try {
    console.log('Analyzing project...');

    const response = await adapter.executeSync({
      role: 'user',
      content: 'Analyze the CLI adapter architecture and suggest improvements for error handling.'
    });

    console.log('Analysis:');
    console.log(response.content);

    if (response.metadata?.fileChanges) {
      console.log('\nSuggested file changes:');
      for (const change of response.metadata.fileChanges) {
        console.log(`  - ${change.file}: ${change.action}`);
      }
    }

    if (response.metadata?.suggestions) {
      console.log('\nSuggestions:');
      for (const suggestion of response.metadata.suggestions) {
        console.log(`  - ${suggestion}`);
      }
    }
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 4: Using Gemini CLI with streaming
 */
async function geminiStreamingExample() {
  console.log('\n=== Gemini CLI Streaming Example ===\n');

  const adapter = createGeminiAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    command: 'gemini-cli',
    model: 'gemini-pro',
    stream: true,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048
    }
  });

  try {
    console.log('Streaming response...\n');

    const iterator = await adapter.execute({
      role: 'user',
      content: 'Explain how TypeScript generics work with detailed examples.'
    });

    let lastResponse;
    for await (const response of iterator) {
      // Print incremental content
      if (response.metadata?.streaming) {
        process.stdout.write('.');
      } else {
        process.stdout.write('\n\n');
      }
      lastResponse = response;
    }

    console.log(lastResponse!.content);

    if (lastResponse!.metadata?.usage) {
      console.log('\nToken usage:', lastResponse!.metadata.usage);
    }
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 5: Error handling
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');

  const adapter = createCodexAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 5000, // Short timeout for demonstration
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      retryableExitCodes: [1, 2, 143]
    }
  });

  try {
    const response = await adapter.executeSync({
      role: 'user',
      content: 'Generate a complex application' // This might timeout
    });

    console.log('Success:', response.content);
  } catch (error: any) {
    console.error('Error occurred:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);

    if (error.exitCode) {
      console.error('  Exit code:', error.exitCode);
    }
    if (error.stderr) {
      console.error('  Stderr:', error.stderr);
    }

    // Handle specific error types
    switch (error.code) {
      case 'TIMEOUT':
        console.log('\nSuggestion: Increase timeout or simplify the task');
        break;
      case 'EXIT_CODE':
        console.log('\nSuggestion: Check CLI configuration and credentials');
        break;
      case 'PARSE_ERROR':
        console.log('\nSuggestion: CLI output format may have changed');
        break;
    }
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Run examples (comment out ones you don't want to run)
    await autoDetectExample();

    // Uncomment to run specific examples:
    // await codexExample();
    // await cursorExample();
    // await geminiStreamingExample();
    // await errorHandlingExample();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
