#!/usr/bin/env node
/**
 * Simplified AI Content Generator
 * Following KISS and SOLID principles
 */

import { EventEmitter } from 'events';
import { IContentGenerator, ITemplateManager, IAgentManager } from './interfaces';
import { ContentRequest, ContentResult, AgentSpec, ContentTemplate } from './types';

/**
 * Simple Template Manager - Single Responsibility
 */
class TemplateManager implements ITemplateManager {
  private templates = new Map<string, ContentTemplate>();

  constructor() {
    this.initializeTemplates();
  }

  getTemplate(name: string): ContentTemplate | null {
    return this.templates.get(name) || null;
  }

  applyTemplate(template: ContentTemplate, variables: Record<string, string>): string {
    let content = template.template;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return content;
  }

  listTemplates(): ContentTemplate[] {
    return Array.from(this.templates.values());
  }

  private initializeTemplates(): void {
    const templates: ContentTemplate[] = [
      {
        name: 'specification',
        type: 'specification',
        template: '# {{name}}\n\n## Overview\n{{overview}}\n\n## Requirements\n{{requirements}}',
        variables: ['name', 'overview', 'requirements'],
        quality: 'high',
        examples: ['user-auth', 'payment-system']
      },
      {
        name: 'design',
        type: 'design',
        template: '# {{name}} Design\n\n## Architecture\n{{architecture}}\n\n## Components\n{{components}}',
        variables: ['name', 'architecture', 'components'],
        quality: 'high',
        examples: ['microservices', 'event-driven']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.name, template);
    });
  }
}

/**
 * Simple Agent Manager - Single Responsibility
 */
class AgentManager implements IAgentManager {
  private agents = new Map<string, AgentSpec>();

  constructor() {
    this.initializeAgents();
  }

  getAgent(id: string): AgentSpec | null {
    return this.agents.get(id) || null;
  }

  listAgents(): AgentSpec[] {
    return Array.from(this.agents.values());
  }

  activateAgent(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.active = true;
    }
  }

  deactivateAgent(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.active = false;
    }
  }

  private initializeAgents(): void {
    const agents: AgentSpec[] = [
      {
        id: 'spec-writer',
        name: 'Specification Writer',
        specialty: ['requirements', 'user-stories', 'acceptance-criteria'],
        experience: 0.92,
        active: true
      },
      {
        id: 'architect',
        name: 'System Architect',
        specialty: ['architecture', 'design-patterns', 'components'],
        experience: 0.89,
        active: true
      },
      {
        id: 'documenter',
        name: 'Technical Writer',
        specialty: ['documentation', 'technical-writing', 'examples'],
        experience: 0.87,
        active: true
      }
    ];

    agents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });
  }
}

/**
 * Simple Content Generator - Single Responsibility, Dependency Injection
 */
export class SimpleContentGenerator extends EventEmitter implements IContentGenerator {
  constructor(
    private templateManager: ITemplateManager,
    private agentManager: IAgentManager
  ) {
    super();
  }

  async generateContent(request: ContentRequest): Promise<ContentResult> {
    const startTime = Date.now();
    
    // Select appropriate agents (KISS approach)
    const agents = this.selectAgents(request.type);
    
    // Generate content using template if available
    const content = this.generateContentText(request);
    
    // Simple quality assessment
    const quality = this.assessQuality(content);
    
    const result: ContentResult = {
      id: request.id,
      content,
      generatedAt: new Date(),
      quality,
      tokens: Math.ceil(content.length / 4), // Simple token estimation
      processingTime: Date.now() - startTime,
      agents: agents.map(a => a.name),
      confidence: quality * 0.95, // Simple confidence calculation
      improvements: this.generateImprovements(content, quality)
    };

    this.emit('contentGenerated', result);
    return result;
  }

  async getAgentMetrics(): Promise<Record<string, any>> {
    const agents = this.agentManager.listAgents();
    const activeAgents = agents.filter(a => a.active);
    
    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      averageExperience: activeAgents.reduce((sum, a) => sum + a.experience, 0) / activeAgents.length,
      agents: agents.reduce((acc, agent) => {
        acc[agent.id] = {
          name: agent.name,
          experience: agent.experience,
          active: agent.active,
          specialties: agent.specialty.length
        };
        return acc;
      }, {} as Record<string, any>)
    };
  }

  async getTemplateMetrics(): Promise<Record<string, any>> {
    const templates = this.templateManager.listTemplates();
    
    return {
      totalTemplates: templates.length,
      templates: templates.reduce((acc, template) => {
        acc[template.name] = {
          type: template.type,
          quality: template.quality,
          variables: template.variables.length
        };
        return acc;
      }, {} as Record<string, any>)
    };
  }

  // Private helper methods - keep simple (KISS)
  private selectAgents(contentType: string): AgentSpec[] {
    const agents = this.agentManager.listAgents().filter(a => a.active);
    
    // Simple selection logic
    switch (contentType) {
      case 'specification':
        return agents.filter(a => a.specialty.includes('requirements'));
      case 'design':
        return agents.filter(a => a.specialty.includes('architecture'));
      case 'documentation':
        return agents.filter(a => a.specialty.includes('documentation'));
      default:
        return agents.slice(0, 2); // Default to first 2 agents
    }
  }

  private generateContentText(request: ContentRequest): string {
    const template = this.templateManager.getTemplate(request.type);
    
    if (template) {
      const variables = this.extractVariables(request);
      return this.templateManager.applyTemplate(template, variables);
    }
    
    // Fallback to simple content generation
    return this.generateSimpleContent(request);
  }

  private extractVariables(request: ContentRequest): Record<string, string> {
    return {
      name: this.extractName(request.context),
      overview: `${request.context} with comprehensive implementation`,
      requirements: request.requirements.map(r => `- ${r}`).join('\n'),
      architecture: `Architecture for ${request.context} following best practices`,
      components: 'Core components with clean interfaces and separation of concerns'
    };
  }

  private extractName(context: string): string {
    return context.split(' ').slice(0, 3).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  private generateSimpleContent(request: ContentRequest): string {
    return [
      `# ${this.extractName(request.context)}`,
      '',
      '## Overview',
      `This ${request.type} addresses: ${request.context}`,
      '',
      '## Requirements',
      ...request.requirements.map(r => `- ${r}`),
      '',
      '## Implementation Notes',
      `Quality level: ${request.quality}`,
      `Target audience: ${request.targetAudience}`
    ].join('\n');
  }

  private assessQuality(content: string): number {
    // Simple quality assessment (KISS approach)
    let score = 0.7; // Base score
    
    if (content.length > 200) score += 0.1;
    if (content.includes('#')) score += 0.05;
    if (content.includes('##')) score += 0.05;
    if (content.includes('-')) score += 0.05;
    if (content.split('\n').length > 10) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  private generateImprovements(content: string, quality: number): string[] {
    const improvements: string[] = [];
    
    if (content.length < 200) {
      improvements.push('Add more detailed content');
    }
    
    if (!content.includes('```')) {
      improvements.push('Include code examples');
    }
    
    if (quality < 0.8) {
      improvements.push('Improve structure and completeness');
    }
    
    return improvements;
  }
}

/**
 * Factory function for creating SimpleContentGenerator with dependencies
 * Follows Dependency Inversion Principle
 */
export function createSimpleContentGenerator(): SimpleContentGenerator {
  const templateManager = new TemplateManager();
  const agentManager = new AgentManager();
  
  return new SimpleContentGenerator(templateManager, agentManager);
}