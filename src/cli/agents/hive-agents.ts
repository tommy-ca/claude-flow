/**
 * Hive Mind Agent Templates
 * Specialized agents for the Hive Mind swarm system
 */

import { BaseAgent, AgentCapability } from './base-agent.js';

export interface HiveAgentConfig {
  type: 'queen' | 'worker' | 'scout' | 'guardian' | 'architect';
  specialization?: string;
  consensusWeight?: number;
  knowledgeDomains?: string[];
}

/**
 * Queen Agent - Orchestrator and decision maker
 */
export class QueenAgent extends BaseAgent {
  constructor(name: string) {
    super(name, 'coordinator', [
      AgentCapability.Coordination,
      AgentCapability.Planning,
      AgentCapability.Communication,
      AgentCapability.DecisionMaking
    ]);
  }

  getSystemPrompt(): string {
    return `You are ${this.name}, a Queen agent in the Hive Mind swarm.

ROLE: Orchestrator and Decision Maker
- Coordinate all swarm activities
- Make final decisions after consensus
- Delegate tasks to appropriate agents
- Monitor overall progress and quality

RESPONSIBILITIES:
1. Task decomposition and planning
2. Agent assignment and coordination
3. Consensus facilitation
4. Quality assurance
5. Strategic decision making

CONSENSUS PROTOCOL:
- Propose major decisions for voting
- Facilitate discussion among agents
- Calculate consensus thresholds
- Make tie-breaking decisions when needed

COMMUNICATION STYLE:
- Clear and authoritative
- Balanced and fair
- Strategic thinking
- Focus on swarm objectives`;
  }

  async analyzeObjective(objective: string): Promise<any> {
    return {
      complexity: 'high',
      requiredAgents: ['architect', 'worker', 'scout', 'guardian'],
      estimatedTasks: 5,
      strategy: 'hierarchical',
      consensusRequired: true
    };
  }
}

/**
 * Worker Agent - Implementation and execution
 */
export class WorkerAgent extends BaseAgent {
  constructor(name: string, specialization: string = 'general') {
    super(name, 'coder', [
      AgentCapability.Coding,
      AgentCapability.Testing,
      AgentCapability.Implementation,
      AgentCapability.Debugging
    ]);
    this.metadata.specialization = specialization;
  }

  getSystemPrompt(): string {
    return `You are ${this.name}, a Worker agent in the Hive Mind swarm.

ROLE: Implementation and Execution Specialist
- Execute assigned tasks efficiently
- Implement solutions based on designs
- Collaborate with other workers
- Report progress and issues

SPECIALIZATION: ${this.metadata.specialization || 'general'}

RESPONSIBILITIES:
1. Task implementation
2. Code development
3. Testing and validation
4. Bug fixing
5. Performance optimization

WORK PROTOCOL:
- Accept tasks from Queen or consensus
- Provide effort estimates
- Request help when blocked
- Share knowledge with swarm

COMMUNICATION STYLE:
- Technical and precise
- Progress-focused
- Collaborative
- Solution-oriented`;
  }

  async estimateEffort(task: any): Promise<number> {
    // Estimate based on task type and specialization match
    const baseEffort = task.complexity || 5;
    const specializationBonus = task.type === this.metadata.specialization ? 0.8 : 1.0;
    return Math.round(baseEffort * specializationBonus);
  }
}

/**
 * Scout Agent - Research and exploration
 */
export class ScoutAgent extends BaseAgent {
  constructor(name: string) {
    super(name, 'researcher', [
      AgentCapability.Research,
      AgentCapability.Analysis,
      AgentCapability.WebSearch,
      AgentCapability.Documentation
    ]);
  }

  getSystemPrompt(): string {
    return `You are ${this.name}, a Scout agent in the Hive Mind swarm.

ROLE: Research and Exploration Specialist
- Explore new territories and solutions
- Research best practices and patterns
- Identify potential risks and opportunities
- Gather intelligence for the swarm

RESPONSIBILITIES:
1. Information gathering
2. Technology research
3. Risk assessment
4. Opportunity identification
5. Knowledge synthesis

SCOUTING PROTOCOL:
- Proactively investigate unknowns
- Report findings to swarm
- Suggest new approaches
- Validate assumptions

COMMUNICATION STYLE:
- Curious and investigative
- Evidence-based
- Forward-thinking
- Risk-aware`;
  }

  async scout(topic: string): Promise<any> {
    return {
      findings: [`Best practices for ${topic}`, `Common pitfalls in ${topic}`],
      risks: ['Technical debt', 'Scalability concerns'],
      opportunities: ['New framework available', 'Performance optimization possible'],
      recommendations: ['Consider microservices', 'Implement caching']
    };
  }
}

/**
 * Guardian Agent - Quality and validation
 */
export class GuardianAgent extends BaseAgent {
  constructor(name: string) {
    super(name, 'reviewer', [
      AgentCapability.Review,
      AgentCapability.Testing,
      AgentCapability.Security,
      AgentCapability.QualityAssurance
    ]);
  }

  getSystemPrompt(): string {
    return `You are ${this.name}, a Guardian agent in the Hive Mind swarm.

ROLE: Quality Assurance and Protection
- Ensure code quality and standards
- Identify security vulnerabilities
- Validate implementations
- Protect swarm from errors

RESPONSIBILITIES:
1. Code review
2. Security analysis
3. Quality validation
4. Standard enforcement
5. Risk mitigation

GUARDIAN PROTOCOL:
- Review all implementations
- Flag potential issues
- Suggest improvements
- Enforce best practices

COMMUNICATION STYLE:
- Protective and thorough
- Constructive criticism
- Standards-focused
- Security-minded`;
  }

  async validateWork(work: any): Promise<any> {
    return {
      qualityScore: 0.85,
      issues: ['Missing error handling', 'Incomplete tests'],
      securityConcerns: ['Input validation needed'],
      recommendations: ['Add unit tests', 'Implement logging'],
      approved: true
    };
  }
}

/**
 * Architect Agent - System design and planning
 */
export class ArchitectAgent extends BaseAgent {
  constructor(name: string) {
    super(name, 'architect', [
      AgentCapability.Architecture,
      AgentCapability.Planning,
      AgentCapability.Design,
      AgentCapability.Documentation
    ]);
  }

  getSystemPrompt(): string {
    return `You are ${this.name}, an Architect agent in the Hive Mind swarm.

ROLE: System Design and Architecture
- Design system architecture
- Plan technical solutions
- Define interfaces and contracts
- Ensure scalability and maintainability

RESPONSIBILITIES:
1. System architecture design
2. Technical planning
3. Interface definition
4. Pattern selection
5. Documentation

ARCHITECTURE PROTOCOL:
- Design before implementation
- Consider all requirements
- Plan for scalability
- Document decisions

COMMUNICATION STYLE:
- Strategic and systematic
- Pattern-focused
- Future-oriented
- Technically detailed`;
  }

  async designSystem(requirements: any): Promise<any> {
    return {
      architecture: 'microservices',
      components: ['API Gateway', 'Auth Service', 'Business Logic', 'Database'],
      patterns: ['Repository', 'Factory', 'Observer'],
      technologies: ['Node.js', 'PostgreSQL', 'Redis', 'Docker'],
      interfaces: ['REST API', 'WebSocket', 'Message Queue']
    };
  }
}

/**
 * Factory for creating Hive agents
 */
export class HiveAgentFactory {
  static createAgent(config: HiveAgentConfig & { name: string }): BaseAgent {
    switch (config.type) {
      case 'queen':
        return new QueenAgent(config.name);
      
      case 'worker':
        return new WorkerAgent(config.name, config.specialization);
      
      case 'scout':
        return new ScoutAgent(config.name);
      
      case 'guardian':
        return new GuardianAgent(config.name);
      
      case 'architect':
        return new ArchitectAgent(config.name);
      
      default:
        throw new Error(`Unknown Hive agent type: ${config.type}`);
    }
  }

  /**
   * Create a balanced swarm for an objective
   */
  static createBalancedSwarm(objective: string, maxAgents: number = 8): BaseAgent[] {
    const agents: BaseAgent[] = [];
    
    // Always include a Queen
    agents.push(new QueenAgent('Queen-Genesis'));
    
    // Determine agent composition based on objective
    const needsDesign = objective.toLowerCase().includes('build') || 
                       objective.toLowerCase().includes('create');
    const needsResearch = objective.toLowerCase().includes('research') || 
                         objective.toLowerCase().includes('analyze');
    
    if (needsDesign && agents.length < maxAgents) {
      agents.push(new ArchitectAgent('Architect-Prime'));
    }
    
    if (needsResearch && agents.length < maxAgents) {
      agents.push(new ScoutAgent('Scout-Alpha'));
    }
    
    // Add workers based on remaining slots
    const workerCount = Math.min(3, maxAgents - agents.length - 1); // -1 for Guardian
    for (let i = 0; i < workerCount; i++) {
      const specializations = ['backend', 'frontend', 'database', 'integration'];
      const spec = specializations[i % specializations.length];
      agents.push(new WorkerAgent(`Worker-${i + 1}`, spec));
    }
    
    // Always include a Guardian if space
    if (agents.length < maxAgents) {
      agents.push(new GuardianAgent('Guardian-Omega'));
    }
    
    return agents;
  }

  /**
   * Get agent capabilities matrix
   */
  static getCapabilitiesMatrix(): Map<string, string[]> {
    return new Map([
      ['queen', ['orchestration', 'consensus', 'decision-making', 'delegation']],
      ['worker', ['implementation', 'coding', 'testing', 'debugging']],
      ['scout', ['research', 'exploration', 'analysis', 'discovery']],
      ['guardian', ['validation', 'security', 'quality', 'review']],
      ['architect', ['design', 'planning', 'architecture', 'patterns']]
    ]);
  }
}