/**
 * Agent Validation System
 * 
 * Comprehensive validation for agent definitions, capabilities, and system integration.
 * Ensures all agents meet quality standards and can be properly loaded and executed.
 */

import { agentLoader, type AgentDefinition } from './agent-loader.js';
import type { ILogger } from '../core/logger.js';

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validator: (agent: AgentDefinition) => ValidationIssue[];
}

export interface ValidationIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationReport {
  agentName: string;
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
  validatedAt: Date;
}

export interface SystemValidationReport {
  totalAgents: number;
  validAgents: number;
  invalidAgents: number;
  averageScore: number;
  criticalIssues: ValidationIssue[];
  reports: ValidationReport[];
  validatedAt: Date;
}

/**
 * Agent validation system with comprehensive rule-based validation
 */
export class AgentValidator {
  private logger: ILogger;
  private validationRules: ValidationRule[] = [];

  constructor(logger: ILogger) {
    this.logger = logger;
    this.initializeDefaultRules();
  }

  /**
   * Validate a single agent definition
   */
  async validateAgent(agentName: string): Promise<ValidationReport> {
    try {
      const agent = await agentLoader.getAgent(agentName);
      if (!agent) {
        return {
          agentName,
          valid: false,
          score: 0,
          issues: [{
            rule: 'agent_exists',
            severity: 'error',
            message: `Agent '${agentName}' not found`,
            suggestion: 'Check agent name spelling and ensure agent definition file exists'
          }],
          summary: { errors: 1, warnings: 0, infos: 0 },
          validatedAt: new Date()
        };
      }

      return this.validateAgentDefinition(agent);
    } catch (error) {
      this.logger.error('Agent validation failed', { agentName, error });
      return {
        agentName,
        valid: false,
        score: 0,
        issues: [{
          rule: 'validation_error',
          severity: 'error',
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestion: 'Check agent definition file format and syntax'
        }],
        summary: { errors: 1, warnings: 0, infos: 0 },
        validatedAt: new Date()
      };
    }
  }

  /**
   * Validate agent definition against all rules
   */
  validateAgentDefinition(agent: AgentDefinition): ValidationReport {
    const issues: ValidationIssue[] = [];

    // Apply all validation rules
    for (const rule of this.validationRules) {
      try {
        const ruleIssues = rule.validator(agent);
        issues.push(...ruleIssues);
      } catch (error) {
        this.logger.warn('Validation rule failed', { rule: rule.name, error });
        issues.push({
          rule: rule.name,
          severity: 'warning',
          message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // Calculate summary
    const summary = {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      infos: issues.filter(i => i.severity === 'info').length
    };

    // Calculate score (0-100)
    const maxPossibleScore = 100;
    const errorPenalty = summary.errors * 20;
    const warningPenalty = summary.warnings * 5;
    const infoPenalty = summary.infos * 1;
    const score = Math.max(0, maxPossibleScore - errorPenalty - warningPenalty - infoPenalty);

    const valid = summary.errors === 0;

    return {
      agentName: agent.name,
      valid,
      score,
      issues,
      summary,
      validatedAt: new Date()
    };
  }

  /**
   * Validate all agents in the system
   */
  async validateAllAgents(): Promise<SystemValidationReport> {
    try {
      const startTime = Date.now();
      this.logger.info('Starting system-wide agent validation');

      const allAgents = await agentLoader.getAllAgents();
      const reports: ValidationReport[] = [];
      const criticalIssues: ValidationIssue[] = [];

      for (const agent of allAgents) {
        const report = this.validateAgentDefinition(agent);
        reports.push(report);

        // Collect critical issues
        const critical = report.issues.filter(issue => 
          issue.severity === 'error' && this.isCriticalIssue(issue)
        );
        criticalIssues.push(...critical);
      }

      const validAgents = reports.filter(r => r.valid).length;
      const invalidAgents = reports.length - validAgents;
      const averageScore = reports.length > 0 
        ? reports.reduce((sum, r) => sum + r.score, 0) / reports.length 
        : 0;

      const systemReport: SystemValidationReport = {
        totalAgents: reports.length,
        validAgents,
        invalidAgents,
        averageScore,
        criticalIssues,
        reports,
        validatedAt: new Date()
      };

      const executionTime = Date.now() - startTime;
      this.logger.info('System validation completed', {
        totalAgents: systemReport.totalAgents,
        validAgents: systemReport.validAgents,
        invalidAgents: systemReport.invalidAgents,
        averageScore: systemReport.averageScore.toFixed(2),
        criticalIssues: criticalIssues.length,
        executionTime
      });

      return systemReport;
    } catch (error) {
      this.logger.error('System validation failed', { error });
      throw error;
    }
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
    this.logger.info('Added custom validation rule', { name: rule.name });
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleName: string): boolean {
    const initialLength = this.validationRules.length;
    this.validationRules = this.validationRules.filter(rule => rule.name !== ruleName);
    const removed = this.validationRules.length < initialLength;
    
    if (removed) {
      this.logger.info('Removed validation rule', { name: ruleName });
    }
    
    return removed;
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * Generate validation report in different formats
   */
  generateReport(report: SystemValidationReport, format: 'json' | 'markdown' | 'summary' = 'summary'): string {
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

  // Private helper methods

  private initializeDefaultRules(): void {
    this.validationRules = [
      {
        name: 'required_fields',
        description: 'Check for required fields in agent definition',
        severity: 'error',
        validator: (agent) => {
          const issues: ValidationIssue[] = [];
          
          if (!agent.name || agent.name.trim().length === 0) {
            issues.push({
              rule: 'required_fields',
              severity: 'error',
              message: 'Agent name is required',
              field: 'name',
              suggestion: 'Add a unique, descriptive name for the agent'
            });
          }
          
          if (!agent.description || agent.description.trim().length === 0) {
            issues.push({
              rule: 'required_fields',
              severity: 'error',
              message: 'Agent description is required',
              field: 'description',
              suggestion: 'Add a clear description of the agent\'s purpose and capabilities'
            });
          }
          
          return issues;
        }
      },

      {
        name: 'name_format',
        description: 'Validate agent name format and uniqueness',
        severity: 'error',
        validator: (agent) => {
          const issues: ValidationIssue[] = [];
          
          if (agent.name) {
            // Check format
            if (!/^[a-z0-9-]+$/.test(agent.name)) {
              issues.push({
                rule: 'name_format',
                severity: 'error',
                message: 'Agent name must contain only lowercase letters, numbers, and hyphens',
                field: 'name',
                suggestion: 'Use kebab-case format (e.g., "system-architect", "code-reviewer")'
              });
            }
            
            // Check length
            if (agent.name.length < 3) {
              issues.push({
                rule: 'name_format',
                severity: 'error',
                message: 'Agent name must be at least 3 characters long',
                field: 'name',
                suggestion: 'Choose a more descriptive name'
              });
            }
            
            if (agent.name.length > 50) {
              issues.push({
                rule: 'name_format',
                severity: 'warning',
                message: 'Agent name should be less than 50 characters',
                field: 'name',
                suggestion: 'Consider using a shorter, more concise name'
              });
            }
          }
          
          return issues;
        }
      },

      {
        name: 'capabilities_format',
        description: 'Validate capabilities structure and content',
        severity: 'warning',
        validator: (agent) => {
          const issues: ValidationIssue[] = [];
          
          if (!agent.capabilities) {
            issues.push({
              rule: 'capabilities_format',
              severity: 'warning',
              message: 'No capabilities defined',
              field: 'capabilities',
              suggestion: 'Define agent capabilities to improve task matching'
            });
          } else if (Array.isArray(agent.capabilities)) {
            if (agent.capabilities.length === 0) {
              issues.push({
                rule: 'capabilities_format',
                severity: 'warning',
                message: 'Empty capabilities array',
                field: 'capabilities',
                suggestion: 'Add at least one capability'
              });
            }
            
            // Check for invalid capability formats
            for (const cap of agent.capabilities) {
              if (typeof cap !== 'string' || cap.trim().length === 0) {
                issues.push({
                  rule: 'capabilities_format',
                  severity: 'warning',
                  message: 'Invalid capability format',
                  field: 'capabilities',
                  suggestion: 'All capabilities should be non-empty strings'
                });
              }
            }
          }
          
          return issues;
        }
      },

      {
        name: 'description_quality',
        description: 'Validate description quality and completeness',
        severity: 'info',
        validator: (agent) => {
          const issues: ValidationIssue[] = [];
          
          if (agent.description) {
            if (agent.description.length < 20) {
              issues.push({
                rule: 'description_quality',
                severity: 'warning',
                message: 'Description is too short',
                field: 'description',
                suggestion: 'Provide a more detailed description of the agent\'s purpose and capabilities'
              });
            }
            
            if (agent.description.length > 500) {
              issues.push({
                rule: 'description_quality',
                severity: 'info',
                message: 'Description is very long',
                field: 'description',
                suggestion: 'Consider making the description more concise'
              });
            }
            
            // Check for common words that indicate good descriptions
            const qualityIndicators = ['specialized', 'responsible', 'handles', 'provides', 'manages'];
            const hasQualityIndicators = qualityIndicators.some(indicator => 
              agent.description.toLowerCase().includes(indicator)
            );
            
            if (!hasQualityIndicators) {
              issues.push({
                rule: 'description_quality',
                severity: 'info',
                message: 'Description could be more descriptive',
                field: 'description',
                suggestion: 'Consider describing what the agent is specialized in or responsible for'
              });
            }
          }
          
          return issues;
        }
      },

      {
        name: 'type_consistency',
        description: 'Validate type field consistency with name and capabilities',
        severity: 'warning',
        validator: (agent) => {
          const issues: ValidationIssue[] = [];
          
          if (agent.type && agent.name) {
            // Check if type and name are consistent
            const nameWords = agent.name.split('-');
            const typeInName = nameWords.some(word => 
              agent.type && agent.type.includes(word)
            );
            
            if (!typeInName && !agent.name.includes(agent.type)) {
              issues.push({
                rule: 'type_consistency',
                severity: 'info',
                message: 'Agent type and name seem inconsistent',
                field: 'type',
                suggestion: 'Ensure agent type aligns with the agent name and purpose'
              });
            }
          }
          
          return issues;
        }
      },

      {
        name: 'hooks_format',
        description: 'Validate hooks structure and format',
        severity: 'warning',
        validator: (agent) => {
          const issues: ValidationIssue[] = [];
          
          if (agent.hooks) {
            if (typeof agent.hooks !== 'object') {
              issues.push({
                rule: 'hooks_format',
                severity: 'error',
                message: 'Hooks must be an object',
                field: 'hooks',
                suggestion: 'Define hooks as an object with pre and/or post properties'
              });
            } else {
              // Check hook properties
              if (agent.hooks.pre && typeof agent.hooks.pre !== 'string') {
                issues.push({
                  rule: 'hooks_format',
                  severity: 'warning',
                  message: 'Pre-hook must be a string',
                  field: 'hooks.pre',
                  suggestion: 'Define pre-hook as a descriptive string'
                });
              }
              
              if (agent.hooks.post && typeof agent.hooks.post !== 'string') {
                issues.push({
                  rule: 'hooks_format',
                  severity: 'warning',
                  message: 'Post-hook must be a string',
                  field: 'hooks.post',
                  suggestion: 'Define post-hook as a descriptive string'
                });
              }
            }
          }
          
          return issues;
        }
      },

      {
        name: 'priority_validity',
        description: 'Validate priority field value',
        severity: 'warning',
        validator: (agent) => {
          const issues: ValidationIssue[] = [];
          
          if (agent.priority) {
            const validPriorities = ['low', 'medium', 'high', 'critical'];
            if (!validPriorities.includes(agent.priority)) {
              issues.push({
                rule: 'priority_validity',
                severity: 'warning',
                message: `Invalid priority value: ${agent.priority}`,
                field: 'priority',
                suggestion: `Use one of: ${validPriorities.join(', ')}`
              });
            }
          }
          
          return issues;
        }
      }
    ];

    this.logger.info('Initialized default validation rules', { 
      ruleCount: this.validationRules.length 
    });
  }

  private isCriticalIssue(issue: ValidationIssue): boolean {
    const criticalRules = ['required_fields', 'name_format'];
    return criticalRules.includes(issue.rule);
  }

  private generateMarkdownReport(report: SystemValidationReport): string {
    let markdown = `# Agent Validation Report\n\n`;
    markdown += `**Generated:** ${report.validatedAt.toISOString()}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Agents:** ${report.totalAgents}\n`;
    markdown += `- **Valid Agents:** ${report.validAgents}\n`;
    markdown += `- **Invalid Agents:** ${report.invalidAgents}\n`;
    markdown += `- **Average Score:** ${report.averageScore.toFixed(1)}/100\n`;
    markdown += `- **Critical Issues:** ${report.criticalIssues.length}\n\n`;

    if (report.criticalIssues.length > 0) {
      markdown += `## Critical Issues\n\n`;
      for (const issue of report.criticalIssues) {
        markdown += `- **${issue.rule}:** ${issue.message}\n`;
      }
      markdown += `\n`;
    }

    markdown += `## Agent Details\n\n`;
    for (const agentReport of report.reports) {
      markdown += `### ${agentReport.agentName}\n\n`;
      markdown += `- **Valid:** ${agentReport.valid ? '✅' : '❌'}\n`;
      markdown += `- **Score:** ${agentReport.score}/100\n`;
      markdown += `- **Issues:** ${agentReport.issues.length}\n`;
      
      if (agentReport.issues.length > 0) {
        markdown += `\n**Issues:**\n`;
        for (const issue of agentReport.issues) {
          const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
          markdown += `- ${icon} **${issue.rule}:** ${issue.message}\n`;
        }
      }
      
      markdown += `\n`;
    }

    return markdown;
  }

  private generateSummaryReport(report: SystemValidationReport): string {
    const lines = [
      `Agent Validation Summary (${report.validatedAt.toISOString()})`,
      `${'='.repeat(60)}`,
      `Total Agents: ${report.totalAgents}`,
      `Valid Agents: ${report.validAgents} (${((report.validAgents / report.totalAgents) * 100).toFixed(1)}%)`,
      `Invalid Agents: ${report.invalidAgents}`,
      `Average Score: ${report.averageScore.toFixed(1)}/100`,
      `Critical Issues: ${report.criticalIssues.length}`,
      ``
    ];

    if (report.invalidAgents > 0) {
      lines.push(`Invalid Agents:`);
      const invalidReports = report.reports.filter(r => !r.valid);
      for (const agentReport of invalidReports) {
        const errorCount = agentReport.summary.errors;
        lines.push(`  - ${agentReport.agentName}: ${errorCount} error(s)`);
      }
      lines.push(``);
    }

    if (report.criticalIssues.length > 0) {
      lines.push(`Critical Issues:`);
      for (const issue of report.criticalIssues.slice(0, 5)) {
        lines.push(`  - ${issue.rule}: ${issue.message}`);
      }
      if (report.criticalIssues.length > 5) {
        lines.push(`  ... and ${report.criticalIssues.length - 5} more`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Factory function for creating agent validator
 */
export function createAgentValidator(logger: ILogger): AgentValidator {
  return new AgentValidator(logger);
}