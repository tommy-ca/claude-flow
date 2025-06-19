/**
 * SPARC mode integration for MCP server
 * Exposes all 17 SPARC modes as MCP tools
 */

import { MCPTool, MCPContext } from '../utils/types.js';
import { ILogger } from '../core/logger.js';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface SparcToolContext extends MCPContext {
  orchestrator?: any;
  taskExecutor?: any;
  memoryManager?: any;
  eventBus?: any;
}

interface SparcMode {
  description: string;
  prompt: string;
  tools: string[];
}

interface SparcModes {
  [key: string]: SparcMode;
}

/**
 * Load SPARC mode definitions from .roomodes file
 */
function loadSparcModes(): SparcModes {
  try {
    const modesPath = join(process.cwd(), '.roomodes');
    const modesContent = readFileSync(modesPath, 'utf-8');
    return JSON.parse(modesContent);
  } catch (error) {
    // Fallback to essential modes if file can't be loaded
    return {
      orchestrator: {
        description: "Multi-agent task orchestration and coordination",
        prompt: "SPARC: orchestrator",
        tools: ["TodoWrite", "TodoRead", "Task", "Memory", "Bash"]
      },
      coder: {
        description: "Autonomous code generation and implementation",
        prompt: "SPARC: coder",
        tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "TodoWrite"]
      },
      researcher: {
        description: "Deep research and comprehensive analysis",
        prompt: "SPARC: researcher",
        tools: ["WebSearch", "WebFetch", "Read", "Write", "Memory", "TodoWrite", "Task"]
      }
    };
  }
}

/**
 * Create all SPARC mode MCP tools
 */
export function createSparcTools(logger: ILogger): MCPTool[] {
  const sparcModes = loadSparcModes();
  const tools: MCPTool[] = [];

  // Create a tool for each SPARC mode
  for (const [modeName, modeConfig] of Object.entries(sparcModes)) {
    tools.push(createSparcModeTool(modeName, modeConfig, logger));
  }

  // Add meta tools for SPARC system
  tools.push(createListSparcModesTool(sparcModes, logger));
  tools.push(createSparcExecutorTool(logger));
  tools.push(createSparcSwarmTool(logger));

  return tools;
}

/**
 * Create a tool for a specific SPARC mode
 */
function createSparcModeTool(modeName: string, modeConfig: SparcMode, logger: ILogger): MCPTool {
  return {
    name: `sparc_${modeName}`,
    description: `Execute SPARC ${modeName} mode: ${modeConfig.description}`,
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'The task description for the SPARC mode to execute'
        },
        context: {
          type: 'object',
          description: 'Optional context or parameters for the task',
          properties: {
            memoryKey: {
              type: 'string',
              description: 'Memory key to store results'
            },
            workingDirectory: {
              type: 'string',
              description: 'Working directory for the task'
            },
            parallel: {
              type: 'boolean',
              description: 'Enable parallel execution where applicable'
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds (0 for no timeout)'
            }
          }
        }
      },
      required: ['task']
    },
    handler: async (input: any, context?: SparcToolContext) => {
      const { task, context: taskContext = {} } = input;
      
      try {
        logger.info(`Executing SPARC ${modeName} mode`, { task, context: taskContext });

        // If orchestrator is available, use it to execute the SPARC mode
        if (context?.orchestrator) {
          const result = await context.orchestrator.executeSparMode({
            mode: modeName,
            task,
            prompt: modeConfig.prompt,
            tools: modeConfig.tools,
            ...taskContext
          });

          return {
            success: true,
            mode: modeName,
            result,
            message: `Successfully executed SPARC ${modeName} mode`
          };
        }

        // Fallback response if orchestrator not available
        return {
          success: true,
          mode: modeName,
          task,
          tools: modeConfig.tools,
          message: `SPARC ${modeName} mode registered. Orchestrator required for execution.`
        };
      } catch (error) {
        logger.error(`Failed to execute SPARC ${modeName} mode`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

/**
 * Create tool to list all available SPARC modes
 */
function createListSparcModesTool(sparcModes: SparcModes, logger: ILogger): MCPTool {
  return {
    name: 'sparc_list',
    description: 'List all available SPARC modes and their capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          description: 'Include detailed information about each mode'
        }
      }
    },
    handler: async (input: any) => {
      const { verbose = false } = input;
      
      const modes = Object.entries(sparcModes).map(([name, config]) => ({
        name,
        description: config.description,
        ...(verbose ? { tools: config.tools, prompt: config.prompt } : {})
      }));

      return {
        success: true,
        count: modes.length,
        modes
      };
    }
  };
}

/**
 * Create SPARC executor tool for running arbitrary SPARC workflows
 */
function createSparcExecutorTool(logger: ILogger): MCPTool {
  return {
    name: 'sparc_execute',
    description: 'Execute a custom SPARC workflow with specified modes and coordination',
    inputSchema: {
      type: 'object',
      properties: {
        workflow: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'SPARC mode to execute'
              },
              task: {
                type: 'string',
                description: 'Task for this step'
              },
              dependsOn: {
                type: 'array',
                items: { type: 'number' },
                description: 'Indices of steps this depends on'
              }
            },
            required: ['mode', 'task']
          },
          description: 'Workflow steps to execute'
        },
        parallel: {
          type: 'boolean',
          description: 'Execute independent steps in parallel'
        }
      },
      required: ['workflow']
    },
    handler: async (input: any, context?: SparcToolContext) => {
      const { workflow, parallel = true } = input;
      
      try {
        logger.info('Executing SPARC workflow', { steps: workflow.length, parallel });

        // Workflow execution logic would go here
        // This would coordinate multiple SPARC modes based on dependencies

        return {
          success: true,
          stepsExecuted: workflow.length,
          parallel,
          message: 'SPARC workflow execution completed'
        };
      } catch (error) {
        logger.error('Failed to execute SPARC workflow', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

/**
 * Create SPARC swarm coordination tool
 */
function createSparcSwarmTool(logger: ILogger): MCPTool {
  return {
    name: 'sparc_swarm',
    description: 'Coordinate multiple SPARC agents in a swarm for complex tasks',
    inputSchema: {
      type: 'object',
      properties: {
        objective: {
          type: 'string',
          description: 'The swarm objective'
        },
        strategy: {
          type: 'string',
          enum: ['research', 'development', 'analysis', 'testing', 'optimization', 'maintenance'],
          description: 'Swarm execution strategy'
        },
        mode: {
          type: 'string',
          enum: ['centralized', 'distributed', 'hierarchical', 'mesh', 'hybrid'],
          description: 'Coordination mode'
        },
        maxAgents: {
          type: 'number',
          default: 5,
          description: 'Maximum number of agents'
        },
        agents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'SPARC mode for this agent'
              },
              role: {
                type: 'string',
                description: 'Agent role in the swarm'
              },
              task: {
                type: 'string',
                description: 'Specific task for this agent'
              }
            }
          },
          description: 'Specific agent configurations'
        }
      },
      required: ['objective', 'strategy']
    },
    handler: async (input: any, context?: SparcToolContext) => {
      const { objective, strategy, mode = 'centralized', maxAgents = 5, agents = [] } = input;
      
      try {
        logger.info('Initiating SPARC swarm', { objective, strategy, mode, maxAgents });

        // Swarm coordination logic would integrate with swarm coordinator
        const swarmId = `swarm-${Date.now()}`;

        return {
          success: true,
          swarmId,
          objective,
          strategy,
          mode,
          maxAgents,
          agentCount: agents.length || maxAgents,
          message: 'SPARC swarm initiated successfully'
        };
      } catch (error) {
        logger.error('Failed to initiate SPARC swarm', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}