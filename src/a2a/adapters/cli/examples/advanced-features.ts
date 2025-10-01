/**
 * Advanced Features Examples for CLI Adapters
 *
 * Demonstrates advanced patterns including context building, protocol translation,
 * adapter selection, and session management.
 */

import {
  createCodexAdapter,
  createCursorAdapter,
  createGeminiAdapter,
  createContextBuilder,
  createProtocolTranslator,
  findBestAdapter,
  createAdapter,
  CLIAdapterRegistry
} from '../index';

/**
 * Example 1: Context Building
 */
async function contextBuildingExample() {
  console.log('=== Context Building Example ===\n');

  const projectRoot = process.cwd();
  const builder = createContextBuilder(projectRoot);

  // Build comprehensive task context
  const context = await builder.buildTaskContext({
    id: 'refactor-auth',
    type: 'refactor',
    description: 'Refactor authentication module to use dependency injection',
    requirements: [
      'Use constructor injection',
      'Create interfaces for dependencies',
      'Add unit tests',
      'Update documentation'
    ],
    relatedFiles: [
      'src/a2a/adapters/cli/base-cli-adapter.ts',
      'src/a2a/adapters/cli/codex-cli-adapter.ts'
    ]
  });

  console.log('Built context for task:', context.task.id);
  console.log('Files in context:', context.files.length);
  console.log('Project language:', context.project.language);
  console.log('Project framework:', context.project.framework);

  if (context.git) {
    console.log('Git branch:', context.git.branch);
    console.log('Has uncommitted changes:', context.git.hasChanges);
  }

  // Generate file tree
  const fileTree = await builder.generateFileTree(2);
  console.log('\nProject structure:');
  console.log(fileTree);

  // Use context with Cursor adapter
  const adapter = createCursorAdapter({
    apiKey: process.env.CURSOR_API_KEY!,
    projectRoot,
    enableLSP: true
  });

  try {
    const response = await adapter.executeSync({
      role: 'user',
      content: context.task.description,
      metadata: { context }
    });

    console.log('\nResponse:', response.content);
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 2: Protocol Translation
 */
async function protocolTranslationExample() {
  console.log('\n=== Protocol Translation Example ===\n');

  const translator = createProtocolTranslator();

  // Translate A2A message to different CLI formats
  const a2aMessage = {
    role: 'user',
    content: 'Explain dependency injection in TypeScript',
    metadata: {
      task: 'explanation',
      complexity: 'medium'
    }
  };

  // To Codex format
  const codexRequest = translator.a2aToCodex(a2aMessage, {
    model: 'gpt-4',
    temperature: 0.7,
    systemPrompt: 'You are a TypeScript expert'
  });

  console.log('Codex request format:');
  console.log(JSON.stringify(codexRequest, null, 2));

  // To Gemini format
  const geminiRequest = translator.a2aToGemini(a2aMessage, {
    temperature: 0.7,
    topP: 0.8,
    maxOutputTokens: 2048
  });

  console.log('\nGemini request format:');
  console.log(JSON.stringify(geminiRequest, null, 2));

  // Detect CLI type from response
  const sampleResponse = JSON.stringify({
    choices: [{ message: { content: 'test' } }],
    usage: { total_tokens: 100 }
  });

  const detectedType = translator.detectCLIType(sampleResponse);
  console.log('\nDetected CLI type:', detectedType);
}

/**
 * Example 3: Smart Adapter Selection
 */
async function smartAdapterSelectionExample() {
  console.log('\n=== Smart Adapter Selection Example ===\n');

  // Scenario 1: Need refactoring with LSP support
  const refactoringAdapter = findBestAdapter({
    capabilities: ['refactoring', 'lsp-integration', 'multi-file-editing'],
    languages: ['typescript'],
    preferredModel: 'cursor'
  });

  console.log('Best for refactoring:', refactoringAdapter?.displayName);

  // Scenario 2: Need code generation with large context
  const largeContextAdapter = findBestAdapter({
    capabilities: ['code-generation', 'large-context'],
    languages: ['python', 'javascript']
  });

  console.log('Best for large context:', largeContextAdapter?.displayName);

  // Scenario 3: Need multi-modal capabilities
  const multiModalAdapter = findBestAdapter({
    capabilities: ['multi-modal', 'code-generation'],
    preferredModel: 'gemini'
  });

  console.log('Best for multi-modal:', multiModalAdapter?.displayName);

  // Use the selected adapter
  if (refactoringAdapter) {
    const adapter = createAdapter(refactoringAdapter.name, {
      apiKey: process.env.API_KEY,
      projectRoot: process.cwd()
    });

    console.log(`\nUsing ${refactoringAdapter.displayName} for task...`);

    try {
      const response = await adapter.executeSync({
        role: 'user',
        content: 'Suggest refactoring opportunities in this project'
      });

      console.log('Suggestions:', response.content.substring(0, 200) + '...');
    } finally {
      await adapter.cleanup();
    }
  }
}

/**
 * Example 4: Registry Management
 */
async function registryManagementExample() {
  console.log('\n=== Registry Management Example ===\n');

  const registry = new CLIAdapterRegistry();

  // List all registered adapters
  console.log('Registered adapters:');
  const allAdapters = registry.listAdapters();
  for (const adapter of allAdapters) {
    console.log(`  ${adapter.displayName}:`);
    console.log(`    Command: ${adapter.command}`);
    console.log(`    Available: ${adapter.available}`);
    console.log(`    Capabilities: ${adapter.capabilities.slice(0, 3).join(', ')}...`);
  }

  // Health check for each adapter
  console.log('\nHealth checks:');
  for (const adapter of allAdapters.slice(0, 3)) {
    const health = await registry.healthCheck(adapter.name);
    console.log(`  ${adapter.displayName}:`);
    console.log(`    Healthy: ${health.healthy}`);
    if (health.latency) {
      console.log(`    Latency: ${health.latency}ms`);
    }
    if (health.message) {
      console.log(`    Message: ${health.message}`);
    }
  }

  // Get specific descriptor
  const codexDesc = registry.getDescriptor('codex');
  if (codexDesc) {
    console.log('\nCodex descriptor:');
    console.log('  Languages:', codexDesc.supportedLanguages.join(', '));
    console.log('  Install:', codexDesc.installInstructions);
  }
}

/**
 * Example 5: Session Reuse and Performance
 */
async function sessionReuseExample() {
  console.log('\n=== Session Reuse Example ===\n');

  // Cursor adapter with session reuse enabled
  const adapter = createCursorAdapter({
    apiKey: process.env.CURSOR_API_KEY!,
    projectRoot: process.cwd(),
    reuseProcesses: true,
    maxProcesses: 3,
    enableLSP: true
  });

  try {
    console.log('Executing multiple tasks with session reuse...\n');

    const tasks = [
      'List all TypeScript files in this project',
      'Identify potential performance bottlenecks',
      'Suggest naming convention improvements'
    ];

    const startTime = Date.now();

    for (let i = 0; i < tasks.length; i++) {
      console.log(`Task ${i + 1}: ${tasks[i]}`);

      const taskStart = Date.now();

      const response = await adapter.executeSync({
        role: 'user',
        content: tasks[i]
      });

      const taskTime = Date.now() - taskStart;

      console.log(`  Completed in ${taskTime}ms`);
      console.log(`  Session ID: ${response.metadata?.sessionId || 'N/A'}`);
      console.log(`  Response: ${response.content.substring(0, 100)}...\n`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average per task: ${Math.round(totalTime / tasks.length)}ms`);

  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 6: Parallel Execution
 */
async function parallelExecutionExample() {
  console.log('\n=== Parallel Execution Example ===\n');

  const codexAdapter = createCodexAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    maxProcesses: 3
  });

  const geminiAdapter = createGeminiAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    maxProcesses: 3
  });

  try {
    console.log('Executing tasks in parallel...\n');

    const startTime = Date.now();

    const [codexResult, geminiResult] = await Promise.all([
      codexAdapter.executeSync({
        role: 'user',
        content: 'Write a TypeScript function for binary search'
      }),
      geminiAdapter.executeSync({
        role: 'user',
        content: 'Explain time complexity of binary search'
      })
    ]);

    const totalTime = Date.now() - startTime;

    console.log('Codex result:');
    console.log(codexResult.content);

    console.log('\nGemini result:');
    console.log(geminiResult.content);

    console.log(`\nCompleted in ${totalTime}ms (parallel execution)`);

  } finally {
    await codexAdapter.cleanup();
    await geminiAdapter.cleanup();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Run examples (comment out ones you don't want to run)

    await contextBuildingExample();
    await protocolTranslationExample();
    await smartAdapterSelectionExample();
    await registryManagementExample();

    // These require API keys:
    // await sessionReuseExample();
    // await parallelExecutionExample();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
