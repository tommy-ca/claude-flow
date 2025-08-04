/**
 * Maestro Hive Mind Configuration
 * 
 * Unified configuration system combining SimpleMaestro and HiveMind capabilities
 * Following KISS principles with essential configuration only
 */

import { join } from 'path';
import type { 
  MaestroHiveConfig, 
  ConfigValidator 
} from './interfaces.js';
import type { 
  SwarmTopology, 
  QueenMode, 
  AgentType, 
  AgentCapability 
} from '../hive-mind/types.js';

/**
 * Default Maestro Hive configuration with sensible defaults
 */
export const DEFAULT_MAESTRO_HIVE_CONFIG: MaestroHiveConfig = {
  // Core HiveMind settings
  name: 'MaestroHive',
  topology: 'hierarchical',
  maxAgents: 8,
  queenMode: 'centralized',
  memoryTTL: 86400, // 24 hours
  consensusThreshold: 0.7,
  autoSpawn: true,
  enableConsensus: true,
  enableMemory: true,
  enableCommunication: true,
  
  // Maestro-specific settings
  enableSpecsDriven: true,
  workflowDirectory: join(process.cwd(), '.maestro-hive', 'workflows'),
  qualityThreshold: 0.8,
  autoValidation: true,
  consensusRequired: false, // Can be overridden per task
  
  // Default agent types for specs-driven workflow
  defaultAgentTypes: [
    'requirements_analyst',
    'design_architect', 
    'task_planner',
    'implementation_coder',
    'quality_reviewer',
    'steering_documenter'
  ],
  
  // Agent capability mappings optimized for specs-driven flow
  agentCapabilities: {
    // Core development agents
    'coordinator': ['task_management', 'resource_allocation', 'consensus_building'],
    'researcher': ['information_gathering', 'pattern_recognition', 'knowledge_synthesis'],
    'coder': ['code_generation', 'refactoring', 'debugging'],
    'analyst': ['data_analysis', 'performance_metrics', 'bottleneck_detection'],
    'architect': ['system_design', 'architecture_patterns', 'integration_planning'],
    'tester': ['test_generation', 'quality_assurance', 'edge_case_detection'],
    'reviewer': ['code_review', 'standards_enforcement', 'best_practices'],
    'optimizer': ['performance_optimization', 'resource_optimization', 'algorithm_improvement'],
    'documenter': ['documentation_generation', 'technical_writing', 'api_docs'],
    'monitor': ['system_monitoring', 'health_checks', 'alerting'],
    'specialist': ['domain_expertise', 'custom_capabilities', 'problem_solving'],
    
    // Maestro specs-driven agents (enhanced capabilities)
    'requirements_analyst': [
      'requirements_analysis', 
      'user_story_creation', 
      'acceptance_criteria',
      'information_gathering',
      'pattern_recognition'
    ],
    'design_architect': [
      'system_design', 
      'architecture', 
      'specs_driven_design',
      'technical_writing',
      'architecture_patterns',
      'integration_planning'
    ],
    'task_planner': [
      'task_management', 
      'workflow_orchestration', 
      'resource_allocation',
      'consensus_building'
    ],
    'implementation_coder': [
      'code_generation', 
      'refactoring', 
      'debugging',
      'test_generation',
      'best_practices'
    ],
    'quality_reviewer': [
      'code_review', 
      'quality_assurance', 
      'standards_enforcement',
      'test_generation',
      'edge_case_detection'
    ],
    'steering_documenter': [
      'documentation_generation', 
      'governance', 
      'technical_writing',
      'api_docs',
      'knowledge_synthesis'
    ]
  },
  
  enabledFeatures: [
    'specs-driven-workflow',
    'consensus-validation',
    'quality-gates',
    'agent-specialization',
    'workflow-orchestration',
    'neural-learning'
  ]
};

/**
 * Configuration builder with validation and presets
 */
export class MaestroHiveConfigBuilder {
  private config: MaestroHiveConfig;

  constructor(baseConfig: Partial<MaestroHiveConfig> = {}) {
    this.config = { ...DEFAULT_MAESTRO_HIVE_CONFIG, ...baseConfig };
  }

  /**
   * Set swarm topology with agent type optimization
   */
  topology(topology: SwarmTopology): MaestroHiveConfigBuilder {
    this.config.topology = topology;
    
    // Optimize agent types for topology
    switch (topology) {
      case 'hierarchical':
        this.config.defaultAgentTypes = ['coordinator', 'researcher', 'coder', 'analyst', 'tester'];
        this.config.queenMode = 'centralized';
        break;
      case 'mesh':
        this.config.defaultAgentTypes = ['coordinator', 'researcher', 'coder', 'specialist'];
        this.config.queenMode = 'distributed';
        break;
      case 'specs-driven':
        this.config.defaultAgentTypes = [
          'requirements_analyst', 'design_architect', 'task_planner',
          'implementation_coder', 'quality_reviewer', 'steering_documenter'
        ];
        this.config.queenMode = 'strategic';
        break;
      default:
        // Keep defaults
        break;
    }
    
    return this;
  }

  /**
   * Set maximum agents with validation
   */
  maxAgents(max: number): MaestroHiveConfigBuilder {
    if (max < 1 || max > 50) {
      throw new Error('Max agents must be between 1 and 50');
    }
    this.config.maxAgents = max;
    return this;
  }

  /**
   * Configure quality settings
   */
  quality(threshold: number, autoValidation: boolean = true): MaestroHiveConfigBuilder {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Quality threshold must be between 0 and 1');
    }
    this.config.qualityThreshold = threshold;
    this.config.autoValidation = autoValidation;
    return this;
  }

  /**
   * Configure consensus settings
   */
  consensus(threshold: number, required: boolean = false): MaestroHiveConfigBuilder {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Consensus threshold must be between 0 and 1');
    }
    this.config.consensusThreshold = threshold;
    this.config.consensusRequired = required;
    this.config.enableConsensus = true;
    return this;
  }

  /**
   * Configure specs-driven workflow
   */
  specsDriven(enabled: boolean = true): MaestroHiveConfigBuilder {
    this.config.enableSpecsDriven = enabled;
    if (enabled && this.config.topology !== 'specs-driven') {
      this.topology('specs-driven');
    }
    return this;
  }

  /**
   * Set working directory
   */
  workingDirectory(path: string): MaestroHiveConfigBuilder {
    this.config.workflowDirectory = path;
    return this;
  }

  /**
   * Add custom agent capabilities
   */
  addAgentCapabilities(agentType: AgentType, capabilities: AgentCapability[]): MaestroHiveConfigBuilder {
    if (!this.config.agentCapabilities[agentType]) {
      this.config.agentCapabilities[agentType] = [];
    }
    this.config.agentCapabilities[agentType].push(...capabilities);
    return this;
  }

  /**
   * Enable specific features
   */
  enableFeatures(features: string[]): MaestroHiveConfigBuilder {
    this.config.enabledFeatures = [...(this.config.enabledFeatures || []), ...features];
    return this;
  }

  /**
   * Build and validate configuration
   */
  build(): MaestroHiveConfig {
    const validator = new MaestroConfigValidator();
    const validation = validator.validateMaestroConfig(this.config);
    
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    return { ...this.config };
  }
}

/**
 * Configuration presets for common use cases
 */
export const MAESTRO_CONFIG_PRESETS = {
  /**
   * Development preset - relaxed validation, comprehensive agents
   */
  development(): MaestroHiveConfig {
    return new MaestroHiveConfigBuilder()
      .topology('specs-driven')
      .maxAgents(10)
      .quality(0.6, true)
      .consensus(0.6, false)
      .specsDriven(true)
      .enableFeatures(['debug-logging', 'experimental-features'])
      .build();
  },

  /**
   * Production preset - strict validation, optimized performance
   */
  production(): MaestroHiveConfig {
    return new MaestroHiveConfigBuilder()
      .topology('hierarchical')
      .maxAgents(6)
      .quality(0.85, true)
      .consensus(0.8, true)
      .specsDriven(true)
      .enableFeatures(['performance-monitoring', 'error-recovery'])
      .build();
  },

  /**
   * Research preset - mesh topology, high agent count
   */
  research(): MaestroHiveConfig {
    return new MaestroHiveConfigBuilder()
      .topology('mesh')
      .maxAgents(12)
      .quality(0.7, true)
      .consensus(0.7, true)
      .specsDriven(false)
      .enableFeatures(['experimental-agents', 'advanced-consensus'])
      .build();
  },

  /**
   * Testing preset - minimal setup, fast execution
   */
  testing(): MaestroHiveConfig {
    return new MaestroHiveConfigBuilder()
      .topology('star')
      .maxAgents(4)
      .quality(0.5, false)
      .consensus(0.5, false)
      .specsDriven(false)
      .enableFeatures(['test-mode'])
      .build();
  },

  /**
   * Specs-driven preset - optimized for specification workflow
   */
  specsDriven(): MaestroHiveConfig {
    return new MaestroHiveConfigBuilder()
      .topology('specs-driven')
      .maxAgents(8)
      .quality(0.8, true)
      .consensus(0.75, true)
      .specsDriven(true)
      .enableFeatures([
        'specs-driven-workflow',
        'requirements-validation',
        'design-consensus',
        'quality-gates',
        'steering-documentation'
      ])
      .build();
  }
};

/**
 * Configuration validator implementation
 */
export class MaestroConfigValidator implements ConfigValidator {
  validateMaestroConfig(config: Partial<MaestroHiveConfig>) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!config.name) {
      errors.push('Configuration name is required');
    }

    if (!config.topology) {
      errors.push('Swarm topology is required');
    }

    if (config.maxAgents !== undefined) {
      if (config.maxAgents < 1) {
        errors.push('maxAgents must be at least 1');
      }
      if (config.maxAgents > 50) {
        warnings.push('maxAgents > 50 may impact performance');
      }
    }

    // Quality validation
    if (config.qualityThreshold !== undefined) {
      if (config.qualityThreshold < 0 || config.qualityThreshold > 1) {
        errors.push('qualityThreshold must be between 0 and 1');
      }
      if (config.qualityThreshold < 0.5) {
        warnings.push('Low quality threshold may reduce output quality');
      }
    }

    // Consensus validation
    if (config.consensusThreshold !== undefined) {
      if (config.consensusThreshold < 0 || config.consensusThreshold > 1) {
        errors.push('consensusThreshold must be between 0 and 1');
      }
      if (config.consensusRequired && config.consensusThreshold > 0.9) {
        warnings.push('High consensus threshold may slow decision making');
      }
    }

    // Topology-specific validation
    if (config.topology === 'specs-driven' && !config.enableSpecsDriven) {
      warnings.push('specs-driven topology should have enableSpecsDriven: true');
      suggestions.push('Enable specs-driven workflow for optimal performance');
    }

    // Agent configuration validation
    if (config.defaultAgentTypes && config.defaultAgentTypes.length === 0) {
      warnings.push('No default agent types specified');
      suggestions.push('Add at least one default agent type');
    }

    // Feature validation
    if (config.enabledFeatures) {
      const requiredFeatures = ['specs-driven-workflow', 'quality-gates'];
      const missingFeatures = requiredFeatures.filter(f => !config.enabledFeatures!.includes(f));
      if (missingFeatures.length > 0) {
        suggestions.push(`Consider enabling: ${missingFeatures.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  validateWorkflowConfig(workflow: Partial<any>) {
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (!workflow.name) {
      errors.push('Workflow name is required');
    }

    if (!workflow.description) {
      errors.push('Workflow description is required');
    }

    if (workflow.tasks && workflow.tasks.length === 0) {
      suggestions.push('Add tasks to the workflow');
    }

    return { valid: errors.length === 0, errors, suggestions };
  }

  validateAgentConfig(agent: Partial<any>) {
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (!agent.name) {
      errors.push('Agent name is required');
    }

    if (!agent.type) {
      errors.push('Agent type is required');
    }

    if (agent.capabilities && agent.capabilities.length === 0) {
      suggestions.push('Add capabilities to the agent');
    }

    return { valid: errors.length === 0, errors, suggestions };
  }
}

/**
 * Load configuration from environment variables or use defaults
 */
export function loadMaestroHiveConfig(): MaestroHiveConfig {
  const builder = new MaestroHiveConfigBuilder();

  // Load from environment variables
  if (process.env.MAESTRO_TOPOLOGY) {
    builder.topology(process.env.MAESTRO_TOPOLOGY as SwarmTopology);
  }

  if (process.env.MAESTRO_MAX_AGENTS) {
    const maxAgents = parseInt(process.env.MAESTRO_MAX_AGENTS, 10);
    if (!isNaN(maxAgents)) {
      builder.maxAgents(maxAgents);
    }
  }

  if (process.env.MAESTRO_QUALITY_THRESHOLD) {
    const threshold = parseFloat(process.env.MAESTRO_QUALITY_THRESHOLD);
    if (!isNaN(threshold)) {
      builder.quality(threshold, process.env.MAESTRO_AUTO_VALIDATION !== 'false');
    }
  }

  if (process.env.MAESTRO_CONSENSUS_THRESHOLD) {
    const threshold = parseFloat(process.env.MAESTRO_CONSENSUS_THRESHOLD);
    if (!isNaN(threshold)) {
      builder.consensus(threshold, process.env.MAESTRO_CONSENSUS_REQUIRED === 'true');
    }
  }

  if (process.env.MAESTRO_WORKING_DIR) {
    builder.workingDirectory(process.env.MAESTRO_WORKING_DIR);
  }

  if (process.env.MAESTRO_SPECS_DRIVEN !== 'false') {
    builder.specsDriven(true);
  }

  return builder.build();
}

/**
 * Create configuration from preset name
 */
export function createPresetConfig(presetName: keyof typeof MAESTRO_CONFIG_PRESETS): MaestroHiveConfig {
  return MAESTRO_CONFIG_PRESETS[presetName]();
}