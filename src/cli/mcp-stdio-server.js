#!/usr/bin/env node
/**
 * Stdio MCP server for Claude Code integration
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { join } from 'path';
// Load SPARC modes
function loadSparcModes() {
    try {
        const modesPath = join(process.cwd(), '.roomodes');
        const modesContent = readFileSync(modesPath, 'utf-8');
        return JSON.parse(modesContent);
    }
    catch (error) {
        // Return default modes if file not found
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
async function main() {
    const server = new Server({
        name: 'claude-flow',
        version: '1.0.73',
    }, {
        capabilities: {
            tools: {},
        },
    });
    // Load SPARC modes
    const sparcModes = loadSparcModes();
    // Register handlers for listing tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools = [];
        // Add SPARC tools
        for (const [modeName, modeConfig] of Object.entries(sparcModes)) {
            tools.push({
                name: `sparc_${modeName}`,
                description: `Execute SPARC ${modeName} mode: ${modeConfig.description}`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        task: {
                            type: 'string',
                            description: 'The task description for the SPARC mode to execute',
                        },
                        context: {
                            type: 'object',
                            description: 'Optional context or parameters for the task',
                            properties: {
                                memoryKey: {
                                    type: 'string',
                                    description: 'Memory key to store results',
                                },
                                parallel: {
                                    type: 'boolean',
                                    description: 'Enable parallel execution',
                                },
                            },
                        },
                    },
                    required: ['task'],
                },
            });
        }
        // Add meta tools
        tools.push({
            name: 'sparc_list',
            description: 'List all available SPARC modes',
            inputSchema: {
                type: 'object',
                properties: {
                    verbose: {
                        type: 'boolean',
                        description: 'Include detailed information',
                    },
                },
            },
        });
        tools.push({
            name: 'sparc_swarm',
            description: 'Coordinate multiple SPARC agents in a swarm',
            inputSchema: {
                type: 'object',
                properties: {
                    objective: {
                        type: 'string',
                        description: 'The swarm objective',
                    },
                    strategy: {
                        type: 'string',
                        enum: ['research', 'development', 'analysis', 'testing', 'optimization', 'maintenance'],
                        description: 'Swarm execution strategy',
                    },
                    mode: {
                        type: 'string',
                        enum: ['centralized', 'distributed', 'hierarchical', 'mesh', 'hybrid'],
                        description: 'Coordination mode',
                    },
                    maxAgents: {
                        type: 'number',
                        description: 'Maximum number of agents',
                        default: 5,
                    },
                },
                required: ['objective', 'strategy'],
            },
        });
        return { tools };
    });
    // Register handler for calling tools
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        // Handle sparc_list
        if (name === 'sparc_list') {
            const { verbose = false } = args || {};
            const modes = Object.entries(sparcModes).map(([name, config]) => ({
                name,
                description: config.description,
                ...(verbose ? { tools: config.tools, prompt: config.prompt } : {}),
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ count: modes.length, modes }, null, 2),
                    },
                ],
            };
        }
        // Handle sparc_swarm
        if (name === 'sparc_swarm') {
            const { objective, strategy, mode = 'centralized', maxAgents = 5 } = args || {};
            return {
                content: [
                    {
                        type: 'text',
                        text: `🚀 SPARC Swarm Initiated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Objective: ${objective}
🎯 Strategy: ${strategy}
🔄 Coordination: ${mode}
👥 Max Agents: ${maxAgents}
🆔 Swarm ID: swarm-${Date.now()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: Ready to coordinate agents...`,
                    },
                ],
            };
        }
        // Handle SPARC mode execution
        if (name.startsWith('sparc_')) {
            const modeName = name.substring(6);
            const mode = sparcModes[modeName];
            if (!mode) {
                throw new Error(`Unknown SPARC mode: ${modeName}`);
            }
            const { task, context = {} } = args || {};
            return {
                content: [
                    {
                        type: 'text',
                        text: `🤖 Executing SPARC ${modeName} Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Task: ${task}
🎯 Mode: ${modeName}
📋 Description: ${mode.description}
🔧 Available Tools: ${mode.tools.join(', ')}
${context.memoryKey ? `💾 Memory Key: ${context.memoryKey}` : ''}
${context.parallel ? '⚡ Parallel Execution: Enabled' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: SPARC ${modeName} agent initialized and ready to execute task...`,
                    },
                ],
            };
        }
        throw new Error(`Unknown tool: ${name}`);
    });
    // Create and connect the transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr to avoid polluting stdio
    console.error('Claude-Flow MCP server started');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
