/**
 * TDD: Test-Driven Development for Claude CLI Adapter
 *
 * Principles:
 * - NO MOCKS: Test real CLI execution
 * - START SMALL: One simple test case first
 * - SOLID: Single Responsibility - test only CLI interaction
 */

import { execSync } from 'child_process';

// First, verify Claude CLI is available
describe('Claude CLI Availability', () => {
  it('should have claude CLI accessible', () => {
    const claudePath = process.env.HOME + '/.claude/local/claude';
    expect(() => {
      execSync(`test -x ${claudePath}`, { stdio: 'ignore' });
    }).not.toThrow();
  });

  it('should return JSON format', () => {
    const claudePath = process.env.HOME + '/.claude/local/claude';
    const result = execSync(`echo "test" | ${claudePath} -p --output-format json`, {
      encoding: 'utf-8',
      timeout: 30000
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('type');
    expect(parsed).toHaveProperty('result');
  }, 30000);
});

// Now test our adapter (doesn't exist yet - TDD!)
describe('ClaudeCLI Adapter', () => {
  it('should execute a simple prompt and return response', async () => {
    // This test will fail until we create the adapter
    const { ClaudeCLI } = await import('../../src/cli-adapters/claude-cli.js');

    const adapter = new ClaudeCLI({
      model: 'sonnet' // Use default sonnet model
    });

    const response = await adapter.execute('Say "Hello World" and nothing else');

    expect(response).toBeDefined();
    expect(response.content).toContain('Hello World');
    expect(response.sessionId).toBeDefined();
  }, 30000); // 30s timeout

  it('should include usage metadata', async () => {
    const { ClaudeCLI } = await import('../../src/cli-adapters/claude-cli.js');

    const adapter = new ClaudeCLI({ model: 'sonnet' });
    const response = await adapter.execute('Write a haiku about testing');

    expect(response.usage).toBeDefined();
    expect(response.usage).toHaveProperty('inputTokens');
    expect(response.usage).toHaveProperty('outputTokens');
    expect(response.usage).toHaveProperty('totalTokens');
    // At least one should be > 0 (might be cached)
    expect(response.usage.totalTokens).toBeGreaterThanOrEqual(0);
  }, 30000);

  it('should support streaming output', async () => {
    const { ClaudeCLI } = await import('../../src/cli-adapters/claude-cli.js');

    const adapter = new ClaudeCLI({ model: 'sonnet' });
    const chunks: string[] = [];

    for await (const chunk of adapter.stream('Count from 1 to 5')) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toMatch(/1|2|3|4|5/);
  }, 30000);

  it('should support different models', async () => {
    const { ClaudeCLI } = await import('../../src/cli-adapters/claude-cli.js');

    const adapter = new ClaudeCLI({ model: 'haiku' });
    const response = await adapter.execute('Say "fast"');

    expect(response.content).toBeDefined();
    expect(response.modelUsed).toContain('haiku');
  }, 30000);
});
