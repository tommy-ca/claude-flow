/**
 * Agent Integration Tests
 * 
 * Comprehensive integration tests to verify the agent system works correctly
 * with SimpleMaestro and other system components.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { agentLoader } from './agent-loader.js';
import { EnhancedAgentSelector } from './enhanced-agent-selector.js';
import { AgentValidator } from './agent-validation.js';
import { SpecsDrivenAgentSelector } from './specs-driven-agent-selector.js';
import { createSimpleMaestroCoordinator } from '../simple-maestro.js';
import type { ILogger } from '../core/logger.js';

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface IntegrationTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  results: TestResult[];
  executedAt: Date;
}

/**
 * Agent system integration test suite
 */
export class AgentIntegrationTester {
  private logger: ILogger;
  private agentSelector: EnhancedAgentSelector;
  private validator: AgentValidator;
  private testResults: TestResult[] = [];

  constructor(logger: ILogger) {
    this.logger = logger;
    this.agentSelector = new EnhancedAgentSelector(logger);
    this.validator = new AgentValidator(logger);
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<IntegrationTestReport> {
    const startTime = Date.now();
    this.testResults = [];

    this.logger.info('Starting agent integration tests');

    // Test categories
    const testCategories = [
      () => this.testAgentLoading(),
      () => this.testAgentValidation(),
      () => this.testAgentSelection(),
      () => this.testSpecsDrivenSelection(),
      () => this.testMaestroIntegration(),
      () => this.testErrorHandling(),
      () => this.testCachePerformance()
    ];

    // Run all test categories
    for (const testCategory of testCategories) {
      try {
        await testCategory();
      } catch (error) {
        this.logger.error('Test category failed', { error });
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = this.testResults.length - passedTests;
    const successRate = this.testResults.length > 0 ? passedTests / this.testResults.length : 0;

    const report: IntegrationTestReport = {
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      successRate,
      totalDuration,
      results: this.testResults,
      executedAt: new Date()
    };

    this.logger.info('Integration tests completed', {
      totalTests: report.totalTests,
      passed: report.passedTests,
      failed: report.failedTests,
      successRate: (report.successRate * 100).toFixed(1) + '%',
      duration: report.totalDuration
    });

    return report;
  }

  /**
   * Test agent loading functionality
   */
  private async testAgentLoading(): Promise<void> {
    // Test 1: Load all agents
    await this.runTest('load_all_agents', async () => {
      const agents = await agentLoader.getAllAgents();
      if (agents.length === 0) {
        throw new Error('No agents loaded');
      }
      return { agentCount: agents.length };
    });

    // Test 2: Load specific agents
    const testAgents = ['coder', 'reviewer', 'tester', 'analyst'];
    for (const agentName of testAgents) {
      await this.runTest(`load_agent_${agentName}`, async () => {
        const agent = await agentLoader.getAgent(agentName);
        if (!agent) {
          throw new Error(`Failed to load agent: ${agentName}`);
        }
        return { agentName: agent.name, hasDescription: !!agent.description };
      });
    }

    // Test 3: Load agent categories
    await this.runTest('load_agent_categories', async () => {
      const categories = await agentLoader.getAgentCategories();
      if (categories.length === 0) {
        throw new Error('No agent categories loaded');
      }
      return { categoryCount: categories.length };
    });

    // Test 4: Search agents
    await this.runTest('search_agents', async () => {
      const results = await agentLoader.searchAgents('code');
      return { searchResults: results.length };
    });

    // Test 5: Validate agent types
    await this.runTest('validate_agent_types', async () => {
      const types = await agentLoader.getAvailableAgentTypes();
      const validations = await Promise.all(
        types.map(type => agentLoader.isValidAgentType(type))
      );
      const allValid = validations.every(v => v);
      if (!allValid) {
        throw new Error('Some agent types are invalid');
      }
      return { validatedTypes: types.length };
    });
  }

  /**
   * Test agent validation functionality
   */
  private async testAgentValidation(): Promise<void> {
    // Test 1: Validate individual agent
    await this.runTest('validate_single_agent', async () => {
      const report = await this.validator.validateAgent('coder');
      return { 
        valid: report.valid,
        score: report.score,
        issues: report.issues.length
      };
    });

    // Test 2: System-wide validation
    await this.runTest('validate_all_agents', async () => {
      const report = await this.validator.validateAllAgents();
      return {
        totalAgents: report.totalAgents,
        validAgents: report.validAgents,
        averageScore: report.averageScore,
        criticalIssues: report.criticalIssues.length
      };
    });

    // Test 3: Custom validation rule
    await this.runTest('custom_validation_rule', async () => {
      this.validator.addValidationRule({
        name: 'test_rule',
        description: 'Test validation rule',
        severity: 'info',
        validator: (agent) => [{
          rule: 'test_rule',
          severity: 'info',
          message: 'Test message'
        }]
      });

      const rules = this.validator.getValidationRules();
      const hasTestRule = rules.some(r => r.name === 'test_rule');
      if (!hasTestRule) {
        throw new Error('Custom validation rule not added');
      }

      const removed = this.validator.removeValidationRule('test_rule');
      if (!removed) {
        throw new Error('Custom validation rule not removed');
      }

      return { ruleCount: rules.length };
    });
  }

  /**
   * Test agent selection functionality
   */
  private async testAgentSelection(): Promise<void> {
    // Test 1: Select agent by capability
    const capabilities = ['code-generation', 'testing', 'analysis', 'architecture'];
    for (const capability of capabilities) {
      await this.runTest(`select_agent_${capability}`, async () => {
        const result = await this.agentSelector.selectAgent({
          capability,
          fallbackStrategy: 'flexible'
        });
        
        if (!result.success && capability !== 'nonexistent-capability') {
          throw new Error(`Failed to select agent for ${capability}`);
        }

        return {
          success: result.success,
          selectedAgent: result.selectedAgent,
          confidence: result.confidence,
          fallbackUsed: result.fallbackUsed
        };
      });
    }

    // Test 2: Agent selection with preferences
    await this.runTest('select_agent_with_preferences', async () => {
      const result = await this.agentSelector.selectAgent({
        capability: 'code-generation',
        preferredAgents: ['coder'],
        fallbackStrategy: 'flexible'
      });

      return {
        success: result.success,
        selectedAgent: result.selectedAgent,
        matchedPreference: result.selectedAgent === 'coder'
      };
    });

    // Test 3: Agent selection with exclusions
    await this.runTest('select_agent_with_exclusions', async () => {
      const result = await this.agentSelector.selectAgent({
        capability: 'code-generation',
        excludeAgents: ['coder'],
        fallbackStrategy: 'flexible'
      });

      return {
        success: result.success,
        selectedAgent: result.selectedAgent,
        excludedCoder: result.selectedAgent !== 'coder'
      };
    });

    // Test 4: Get agent options
    await this.runTest('get_agent_options', async () => {
      const options = await this.agentSelector.getAgentOptions({
        capability: 'code-generation',
        maxCandidates: 5
      });

      return {
        optionCount: options.length,
        hasHealthScores: options.every(opt => typeof opt.healthScore === 'number')
      };
    });

    // Test 5: Validate agent capability
    await this.runTest('validate_agent_capability', async () => {
      const valid = await this.agentSelector.validateAgentCapability('coder', 'code-generation');
      const invalid = await this.agentSelector.validateAgentCapability('nonexistent', 'code-generation');

      return {
        validResult: valid,
        invalidResult: invalid
      };
    });
  }

  /**
   * Test specs-driven selection functionality
   */
  private async testSpecsDrivenSelection(): Promise<void> {
    // Test 1: Find best agent
    await this.runTest('specs_find_best_agent', async () => {
      const agent = await SpecsDrivenAgentSelector.findBestAgent('code-generation');
      return { selectedAgent: agent };
    });

    // Test 2: Search agents
    await this.runTest('specs_search_agents', async () => {
      const result = await SpecsDrivenAgentSelector.searchAgents({
        capabilities: ['code-generation', 'testing'],
        maxAgents: 3,
        minConfidence: 0.5
      });

      return {
        matchCount: result.matches.length,
        totalSearched: result.totalSearched,
        searchTime: result.searchTime
      };
    });

    // Test 3: Get workflow agents
    const phases = ['requirements', 'design', 'implementation', 'quality'] as const;
    for (const phase of phases) {
      await this.runTest(`specs_workflow_${phase}`, async () => {
        const agents = await SpecsDrivenAgentSelector.getWorkflowAgents(phase);
        return { agentCount: agents.length };
      });
    }

    // Test 4: Validate agent capability
    await this.runTest('specs_validate_capability', async () => {
      const valid = await SpecsDrivenAgentSelector.validateAgentCapability('coder', 'code-generation');
      return { valid };
    });
  }

  /**
   * Test SimpleMaestro integration
   */
  private async testMaestroIntegration(): Promise<void> {
    // Test 1: Create maestro coordinator
    await this.runTest('create_maestro_coordinator', async () => {
      const coordinator = createSimpleMaestroCoordinator();
      const status = await coordinator.getStatus();
      
      return {
        active: status.active,
        tasks: status.tasks,
        workflows: status.workflows
      };
    });

    // Test 2: Create task with agent selection
    await this.runTest('maestro_create_task', async () => {
      const coordinator = createSimpleMaestroCoordinator();
      
      const task = await coordinator.createTask(
        'Test task for agent integration',
        'implementation',
        'medium'
      );

      return {
        taskId: task.id,
        taskType: task.type,
        taskStatus: task.status
      };
    });

    // Test 3: Generate content with agent context
    await this.runTest('maestro_generate_content', async () => {
      const coordinator = createSimpleMaestroCoordinator();
      
      const content = await coordinator.generateContent(
        'Create a simple function',
        'implementation'
      );

      const hasContent = content && content.length > 0;
      
      return {
        hasContent,
        contentLength: content?.length || 0
      };
    });
  }

  /**
   * Test error handling and edge cases
   */
  private async testErrorHandling(): Promise<void> {
    // Test 1: Invalid agent name
    await this.runTest('handle_invalid_agent', async () => {
      const agent = await agentLoader.getAgent('nonexistent-agent');
      const result = await this.agentSelector.selectAgent({
        capability: 'nonexistent-capability',
        fallbackStrategy: 'strict'
      });

      return {
        agentIsNull: agent === null,
        selectionFailed: !result.success,
        hasErrorMessage: !!result.errorMessage
      };
    });

    // Test 2: Empty capability search
    await this.runTest('handle_empty_capability', async () => {
      const result = await this.agentSelector.selectAgent({
        capability: '',
        fallbackStrategy: 'any'
      });

      return {
        success: result.success,
        hasErrorHandling: true
      };
    });

    // Test 3: Validation of invalid agent
    await this.runTest('validate_invalid_agent', async () => {
      const report = await this.validator.validateAgent('nonexistent-agent');
      
      return {
        valid: report.valid,
        hasErrors: report.summary.errors > 0,
        errorMessage: report.issues[0]?.message
      };
    });

    // Test 4: Network timeout simulation
    await this.runTest('handle_timeout', async () => {
      // Simulate timeout by using very short timeout
      const result = await this.agentSelector.selectAgent({
        capability: 'code-generation',
        timeout: 1 // Very short timeout
      });

      return {
        completed: true,
        result: result.success
      };
    });
  }

  /**
   * Test cache performance
   */
  private async testCachePerformance(): Promise<void> {
    // Test 1: Cache effectiveness
    await this.runTest('cache_performance', async () => {
      const capability = 'code-generation';
      
      // First selection (cache miss)
      const start1 = Date.now();
      const result1 = await this.agentSelector.selectAgent({ capability });
      const time1 = Date.now() - start1;

      // Second selection (cache hit)
      const start2 = Date.now();
      const result2 = await this.agentSelector.selectAgent({ capability });
      const time2 = Date.now() - start2;

      return {
        firstSelectionTime: time1,
        secondSelectionTime: time2,
        cacheImprovement: time1 > time2,
        bothSuccessful: result1.success && result2.success
      };
    });

    // Test 2: Cache clearing
    await this.runTest('cache_clearing', async () => {
      this.agentSelector.clearCache();
      const stats = this.agentSelector.getSelectionStats();
      
      return {
        cacheCleared: stats.cacheSize === 0,
        stats
      };
    });
  }

  /**
   * Run a single test with error handling and timing
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Running test: ${name}`);
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        success: true,
        duration,
        details
      });
      
      this.logger.debug(`Test passed: ${name}`, { duration, details });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.testResults.push({
        name,
        success: false,
        duration,
        error: errorMessage
      });
      
      this.logger.warn(`Test failed: ${name}`, { duration, error: errorMessage });
    }
  }

  /**
   * Generate test report
   */
  generateReport(report: IntegrationTestReport, format: 'json' | 'markdown' | 'summary' = 'summary'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      
      case 'markdown':
        return this.generateMarkdownReport(report);
      
      case 'summary':
      default:
        return this.generateSummaryReport(report);
    }
  }

  private generateSummaryReport(report: IntegrationTestReport): string {
    const lines = [
      `Agent Integration Test Report (${report.executedAt.toISOString()})`,
      `${'='.repeat(60)}`,
      `Total Tests: ${report.totalTests}`,
      `Passed: ${report.passedTests} (${(report.successRate * 100).toFixed(1)}%)`,
      `Failed: ${report.failedTests}`,
      `Total Duration: ${report.totalDuration}ms`,
      ``
    ];

    if (report.failedTests > 0) {
      lines.push(`Failed Tests:`);
      const failedTests = report.results.filter(r => !r.success);
      for (const test of failedTests) {
        lines.push(`  - ${test.name}: ${test.error}`);
      }
      lines.push(``);
    }

    // Performance insights
    const avgDuration = report.totalDuration / report.totalTests;
    lines.push(`Performance:`);
    lines.push(`  - Average test duration: ${avgDuration.toFixed(1)}ms`);
    
    const slowTests = report.results
      .filter(r => r.duration > avgDuration * 2)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3);
    
    if (slowTests.length > 0) {
      lines.push(`  - Slowest tests:`);
      for (const test of slowTests) {
        lines.push(`    - ${test.name}: ${test.duration}ms`);
      }
    }

    return lines.join('\n');
  }

  private generateMarkdownReport(report: IntegrationTestReport): string {
    let markdown = `# Agent Integration Test Report\n\n`;
    markdown += `**Generated:** ${report.executedAt.toISOString()}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${report.totalTests}\n`;
    markdown += `- **Passed:** ${report.passedTests} (${(report.successRate * 100).toFixed(1)}%)\n`;
    markdown += `- **Failed:** ${report.failedTests}\n`;
    markdown += `- **Total Duration:** ${report.totalDuration}ms\n\n`;

    if (report.failedTests > 0) {
      markdown += `## Failed Tests\n\n`;
      const failedTests = report.results.filter(r => !r.success);
      for (const test of failedTests) {
        markdown += `### ${test.name}\n\n`;
        markdown += `**Error:** ${test.error}\n`;
        markdown += `**Duration:** ${test.duration}ms\n\n`;
      }
    }

    markdown += `## All Test Results\n\n`;
    for (const test of report.results) {
      const status = test.success ? '✅' : '❌';
      markdown += `- ${status} **${test.name}** (${test.duration}ms)\n`;
    }

    return markdown;
  }
}

/**
 * Factory function for creating integration tester
 */
export function createAgentIntegrationTester(logger: ILogger): AgentIntegrationTester {
  return new AgentIntegrationTester(logger);
}