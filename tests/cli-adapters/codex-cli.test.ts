/**
 * TDD: Test-Driven Development for Codex CLI Adapter
 *
 * Principles:
 * - NO MOCKS: Test real CLI execution
 * - START SMALL: One simple test case first
 * - SOLID: Single Responsibility - test only CLI interaction
 */

import { execSync } from 'child_process';

// First, verify OpenAI CLI is available
describe('OpenAI CLI Availability', () => {
  it('should have openai CLI installed', () => {
    expect(() => {
      execSync('which openai', { encoding: 'utf-8' });
    }).not.toThrow();
  });

  (process.env.OPENAI_API_KEY ? it : it.skip)('should have OPENAI_API_KEY environment variable', () => {
    expect(process.env.OPENAI_API_KEY).toBeDefined();
  });
});

// Now test our adapter (doesn't exist yet - TDD!)
describe('CodexCLI Adapter', () => {
  (process.env.OPENAI_API_KEY ? it : it.skip)('should execute a simple prompt and return response', async () => {
    // This test will fail until we create the adapter
    const { CodexCLI } = await import('../../src/cli-adapters/codex-cli.js');

    const adapter = new CodexCLI({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini' // Use cheap model for tests
    });

    const response = await adapter.execute('Say "Hello World" and nothing else');

    expect(response).toBeDefined();
    expect(response.content).toContain('Hello World');
  }, 30000); // 30s timeout

  (process.env.OPENAI_API_KEY ? it : it.skip)('should handle errors gracefully', async () => {
    const { CodexCLI } = await import('../../src/cli-adapters/codex-cli.js');

    const adapter = new CodexCLI({
      apiKey: 'invalid-key',
      model: 'gpt-4o-mini'
    });

    await expect(
      adapter.execute('test')
    ).rejects.toThrow();
  }, 10000); // 10s timeout
});
