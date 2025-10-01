/**
 * Integration Example: Multi-Agent Workflow
 *
 * Demonstrates a complete workflow using multiple CLI adapters in coordination,
 * simulating a real-world software development task.
 */

import {
  createCodexAdapter,
  createCursorAdapter,
  createGeminiAdapter,
  createContextBuilder,
  findBestAdapter,
  detectAvailableAgents
} from '../index';

/**
 * Simulated workflow: Implement a new feature
 *
 * Steps:
 * 1. Research best practices (Gemini - large context, web search)
 * 2. Generate initial code (Codex - code generation)
 * 3. Refactor and integrate (Cursor - LSP, multi-file editing)
 * 4. Generate documentation (Gemini - large context output)
 */
async function multiAgentWorkflow() {
  console.log('=== Multi-Agent Workflow Example ===\n');
  console.log('Task: Implement user authentication with JWT\n');

  // Check available agents
  const available = await detectAvailableAgents();
  console.log('Available agents:', available.map(a => a.displayName).join(', '));

  if (available.length === 0) {
    console.log('\nNo CLI agents available. Please install at least one:');
    console.log('  - npm install -g @openai/codex');
    console.log('  - npm install -g @google/gemini-cli');
    return;
  }

  const projectRoot = process.cwd();
  const contextBuilder = createContextBuilder(projectRoot);

  // Step 1: Research with Gemini (if available)
  console.log('Step 1: Research best practices...\n');

  const geminiAvailable = available.find(a => a.name === 'gemini');
  let researchFindings = '';

  if (geminiAvailable && process.env.GOOGLE_API_KEY) {
    const gemini = createGeminiAdapter({
      apiKey: process.env.GOOGLE_API_KEY!,
      model: 'gemini-pro',
      stream: false
    });

    try {
      const research = await gemini.executeSync({
        role: 'user',
        content: `Research and summarize:
1. JWT authentication best practices in Node.js/TypeScript
2. Security considerations
3. Recommended libraries
4. Token storage strategies

Provide a concise summary.`
      });

      researchFindings = research.content;
      console.log('Research findings:');
      console.log(researchFindings);
      console.log('\n');
    } finally {
      await gemini.cleanup();
    }
  } else {
    console.log('Gemini not available, skipping research step\n');
    researchFindings = 'Use jsonwebtoken library, secure token storage, implement refresh tokens';
  }

  // Step 2: Generate code with Codex (if available)
  console.log('Step 2: Generate authentication code...\n');

  const codexAvailable = available.find(a => a.name === 'codex');
  let generatedCode = '';

  if (codexAvailable && process.env.OPENAI_API_KEY) {
    const codex = createCodexAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo',
      systemPrompt: 'You are an expert TypeScript developer. Generate clean, type-safe code.'
    });

    try {
      const codeGen = await codex.executeSync({
        role: 'user',
        content: `Based on these best practices:
${researchFindings}

Generate TypeScript code for:
1. JWTService class with sign() and verify() methods
2. Authentication middleware
3. User interface with password hashing

Include proper error handling and types.`
      });

      generatedCode = codeGen.content;
      console.log('Generated code:');
      console.log(generatedCode.substring(0, 500) + '...\n');
    } finally {
      await codex.cleanup();
    }
  } else {
    console.log('Codex not available, skipping code generation step\n');
    generatedCode = '// JWT service implementation placeholder';
  }

  // Step 3: Refactor and integrate with Cursor (if available)
  console.log('Step 3: Refactor and integrate...\n');

  const cursorAvailable = available.find(a => a.name === 'cursor');

  if (cursorAvailable && process.env.CURSOR_API_KEY) {
    // Build context for Cursor
    const context = await contextBuilder.buildTaskContext({
      id: 'integrate-jwt-auth',
      type: 'integration',
      description: 'Integrate JWT authentication into existing codebase',
      relatedFiles: [
        'src/a2a/adapters/cli/base-cli-adapter.ts'
      ]
    });

    const cursor = createCursorAdapter({
      apiKey: process.env.CURSOR_API_KEY!,
      projectRoot,
      enableLSP: true,
      fileContext: context.files.map(f => f.path)
    });

    try {
      const integration = await cursor.executeSync({
        role: 'user',
        content: `I have this generated authentication code:

${generatedCode}

Suggest how to integrate this into the existing codebase:
1. Where to place the files
2. What existing files need modification
3. Dependencies to add
4. Configuration changes

Provide specific file paths and code snippets.`,
        metadata: { context }
      });

      console.log('Integration plan:');
      console.log(integration.content);

      if (integration.metadata?.fileChanges) {
        console.log('\nFiles to modify:');
        for (const change of integration.metadata.fileChanges) {
          console.log(`  - ${change.file}`);
        }
      }
    } finally {
      await cursor.cleanup();
    }
  } else {
    console.log('Cursor not available, skipping integration step\n');
  }

  // Step 4: Generate documentation
  console.log('\nStep 4: Generate documentation...\n');

  // Use best available adapter for documentation
  const docAdapter = findBestAdapter({
    capabilities: ['documentation', 'large-context'],
    preferredModel: 'gemini'
  });

  if (docAdapter) {
    const adapter = docAdapter.name === 'gemini'
      ? createGeminiAdapter({
          apiKey: process.env.GOOGLE_API_KEY!,
          model: 'gemini-pro'
        })
      : createCodexAdapter({
          apiKey: process.env.OPENAI_API_KEY!,
          model: 'gpt-4'
        });

    try {
      const docs = await adapter.executeSync({
        role: 'user',
        content: `Generate comprehensive documentation for this JWT authentication implementation:

Code:
${generatedCode}

Include:
1. API documentation
2. Setup instructions
3. Usage examples
4. Security notes
5. Testing guidelines

Format as Markdown.`
      });

      console.log('Generated documentation:');
      console.log(docs.content.substring(0, 500) + '...\n');
    } finally {
      await adapter.cleanup();
    }
  }

  console.log('Workflow complete!\n');
  console.log('Summary:');
  console.log('  ✓ Researched best practices');
  console.log('  ✓ Generated authentication code');
  console.log('  ✓ Planned integration');
  console.log('  ✓ Created documentation');
}

/**
 * Error handling workflow
 */
async function errorHandlingWorkflow() {
  console.log('\n=== Error Handling Workflow ===\n');

  const adapters = [];

  try {
    // Try to create adapters with potentially invalid configs
    const codex = createCodexAdapter({
      apiKey: process.env.OPENAI_API_KEY || 'invalid-key',
      timeout: 10000,
      retry: {
        maxAttempts: 2,
        backoffMs: 500,
        retryableExitCodes: [1]
      }
    });
    adapters.push(codex);

    console.log('Attempting task with potential errors...');

    const response = await codex.executeSync({
      role: 'user',
      content: 'Write a simple hello world function'
    });

    console.log('Success:', response.content);

  } catch (error: any) {
    console.log('\nHandling error gracefully:');
    console.log('  Error type:', error.constructor.name);
    console.log('  Error code:', error.code);
    console.log('  Error message:', error.message);

    // Fallback strategy
    console.log('\nAttempting fallback...');

    const available = await detectAvailableAgents();
    if (available.length > 0) {
      console.log(`Falling back to ${available[0].displayName}`);

      const fallbackAdapter = available[0].name === 'gemini'
        ? createGeminiAdapter({
            apiKey: process.env.GOOGLE_API_KEY!
          })
        : null;

      if (fallbackAdapter) {
        try {
          const response = await fallbackAdapter.executeSync({
            role: 'user',
            content: 'Write a simple hello world function'
          });

          console.log('Fallback success:', response.content);
          adapters.push(fallbackAdapter);
        } catch {
          console.log('Fallback also failed');
        }
      }
    }
  } finally {
    // Cleanup all adapters
    for (const adapter of adapters) {
      await adapter.cleanup();
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('CLI Adapters Integration Example\n');
  console.log('This demonstrates a complete multi-agent workflow\n');

  try {
    await multiAgentWorkflow();
    await errorHandlingWorkflow();

    console.log('\nIntegration example complete!');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
