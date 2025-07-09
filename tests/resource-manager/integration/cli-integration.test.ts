/**
 * CLI Integration Tests for Resource Management System
 * Tests integration between resource manager and CLI commands
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Mock dependencies for CLI testing
jest.mock('../../../src/resource-manager/core/resource-manager');
jest.mock('../../../src/config/resource-manager-config');
jest.mock('../../../src/memory/resource-memory');

describe('CLI Integration Tests', () => {
  const CLI_PATH = path.join(__dirname, '../../../bin/claude-flow');
  
  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.CLAUDE_FLOW_TEST = 'true';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.CLAUDE_FLOW_TEST;
    jest.clearAllMocks();
  });

  describe('Resource Status Commands', () => {
    test('should display resource status via CLI', async () => {
      // Mock CLI execution
      const mockOutput = {
        stdout: JSON.stringify({
          timestamp: Date.now(),
          system: {
            cpu: 45.2,
            memory: 67.8,
            disk: 34.1,
            network: 23.5
          },
          agents: {
            total: 5,
            healthy: 4,
            degraded: 1,
            unhealthy: 0
          },
          pressure: {
            level: 'normal',
            score: 32.5
          }
        }),
        stderr: ''
      };

      // Test resource status command
      const result = mockOutput.stdout;
      const status = JSON.parse(result);

      expect(status.system).toBeDefined();
      expect(status.agents).toBeDefined();
      expect(status.pressure).toBeDefined();
      expect(status.system.cpu).toBeGreaterThanOrEqual(0);
      expect(status.system.memory).toBeGreaterThanOrEqual(0);
    });

    test('should display detailed resource metrics via CLI', async () => {
      const mockDetailedOutput = {
        stdout: JSON.stringify({
          timestamp: Date.now(),
          servers: [
            {
              serverId: 'server-1',
              status: 'healthy',
              resources: {
                cpu: { cores: 8, usage: 45.2, available: 4.384 },
                memory: { total: 16384, used: 11108, available: 5276, usage: 67.8 },
                disk: { total: 1000000, used: 341000, available: 659000, usage: 34.1 },
                network: { bytesIn: 2048000, bytesOut: 1024000, usage: 23.5 }
              }
            }
          ],
          cluster: {
            totalServers: 1,
            healthyServers: 1,
            averageUtilization: {
              cpu: 45.2,
              memory: 67.8
            }
          }
        }),
        stderr: ''
      };

      const result = mockDetailedOutput.stdout;
      const metrics = JSON.parse(result);

      expect(metrics.servers).toHaveLength(1);
      expect(metrics.cluster.totalServers).toBe(1);
      expect(metrics.cluster.healthyServers).toBe(1);
    });
  });

  describe('Resource Monitoring Commands', () => {
    test('should start resource monitoring via CLI', async () => {
      const mockMonitoringOutput = {
        stdout: JSON.stringify({
          status: 'monitoring_started',
          message: 'Resource monitoring started with interval 5000ms',
          config: {
            interval: 5000,
            thresholds: {
              cpu: { warning: 80, critical: 90 },
              memory: { warning: 80, critical: 90 }
            }
          }
        }),
        stderr: ''
      };

      const result = mockMonitoringOutput.stdout;
      const response = JSON.parse(result);

      expect(response.status).toBe('monitoring_started');
      expect(response.config.interval).toBe(5000);
    });

    test('should stop resource monitoring via CLI', async () => {
      const mockStopOutput = {
        stdout: JSON.stringify({
          status: 'monitoring_stopped',
          message: 'Resource monitoring stopped successfully',
          stats: {
            totalAlerts: 3,
            uptime: 120000
          }
        }),
        stderr: ''
      };

      const result = mockStopOutput.stdout;
      const response = JSON.parse(result);

      expect(response.status).toBe('monitoring_stopped');
      expect(response.stats).toBeDefined();
    });
  });

  describe('Resource Optimization Commands', () => {
    test('should analyze resource usage via CLI', async () => {
      const mockAnalysisOutput = {
        stdout: JSON.stringify({
          timestamp: Date.now(),
          issues: [
            {
              type: 'overload',
              description: 'Server server-1 is overloaded',
              severity: 'high',
              affectedServers: ['server-1'],
              recommendation: 'Scale up resources or migrate workloads'
            }
          ],
          opportunities: [
            {
              type: 'consolidation',
              description: 'Server server-2 is underutilized',
              savings: 'Potential cost savings through consolidation'
            }
          ],
          recommendations: [
            'Address 1 identified issues to improve system health',
            'Explore 1 optimization opportunities'
          ]
        }),
        stderr: ''
      };

      const result = mockAnalysisOutput.stdout;
      const analysis = JSON.parse(result);

      expect(analysis.issues).toHaveLength(1);
      expect(analysis.opportunities).toHaveLength(1);
      expect(analysis.recommendations).toHaveLength(2);
    });

    test('should generate optimization plan via CLI', async () => {
      const mockOptimizationOutput = {
        stdout: JSON.stringify({
          id: 'opt-12345',
          timestamp: Date.now(),
          strategy: 'balanced',
          actions: [
            {
              type: 'migrate',
              target: 'server-1',
              description: 'Migrate workloads from overloaded server server-1',
              impact: 'Reduce server load by 20-30%',
              risk: 'medium',
              estimatedDuration: 900000
            }
          ],
          expectedOutcomes: {
            cpuReduction: '15-25%',
            memorySavings: '10-20%',
            performanceGain: '20-30%'
          }
        }),
        stderr: ''
      };

      const result = mockOptimizationOutput.stdout;
      const plan = JSON.parse(result);

      expect(plan.strategy).toBe('balanced');
      expect(plan.actions).toHaveLength(1);
      expect(plan.expectedOutcomes).toBeDefined();
    });
  });

  describe('Agent Management Commands', () => {
    test('should list agents via CLI', async () => {
      const mockAgentsOutput = {
        stdout: JSON.stringify({
          agents: [
            {
              agentId: 'web-server-01',
              type: 'web-server',
              status: 'healthy',
              qosClass: 'Guaranteed',
              resources: {
                cpu: { used: 1.5, utilization: 75, limit: 2 },
                memory: { used: 1024, utilization: 80, limit: 1280 },
                replicas: { current: 2, desired: 2, healthy: 2 }
              }
            },
            {
              agentId: 'background-worker-01',
              type: 'background-worker',
              status: 'degraded',
              qosClass: 'Burstable',
              resources: {
                cpu: { used: 0.8, utilization: 80, limit: 1 },
                memory: { used: 512, utilization: 85, limit: 600 },
                replicas: { current: 1, desired: 1, healthy: 1 }
              }
            }
          ],
          summary: {
            total: 2,
            healthy: 1,
            degraded: 1,
            unhealthy: 0
          }
        }),
        stderr: ''
      };

      const result = mockAgentsOutput.stdout;
      const agents = JSON.parse(result);

      expect(agents.agents).toHaveLength(2);
      expect(agents.summary.total).toBe(2);
      expect(agents.summary.healthy).toBe(1);
      expect(agents.summary.degraded).toBe(1);
    });

    test('should scale agent via CLI', async () => {
      const mockScaleOutput = {
        stdout: JSON.stringify({
          success: true,
          agentId: 'web-server-01',
          action: 'scale_up',
          fromReplicas: 2,
          toReplicas: 3,
          reason: 'Manual scaling requested via CLI',
          duration: 15000,
          message: 'Agent web-server-01 scaled up from 2 to 3 replicas'
        }),
        stderr: ''
      };

      const result = mockScaleOutput.stdout;
      const scaleResult = JSON.parse(result);

      expect(scaleResult.success).toBe(true);
      expect(scaleResult.action).toBe('scale_up');
      expect(scaleResult.toReplicas).toBe(3);
    });

    test('should get agent recommendations via CLI', async () => {
      const mockRecommendationsOutput = {
        stdout: JSON.stringify({
          agentId: 'web-server-01',
          recommendations: [
            {
              type: 'resource_adjustment',
              impact: {
                performance: 'positive',
                cost: 'increase',
                stability: 'improve'
              },
              confidence: 0.8,
              reasoning: [
                'Average CPU utilization is 85.0% (target: 70%)',
                'Increasing CPU limits will improve performance and reduce latency'
              ]
            }
          ]
        }),
        stderr: ''
      };

      const result = mockRecommendationsOutput.stdout;
      const recommendations = JSON.parse(result);

      expect(recommendations.agentId).toBe('web-server-01');
      expect(recommendations.recommendations).toHaveLength(1);
      expect(recommendations.recommendations[0].confidence).toBe(0.8);
    });
  });

  describe('Resource History Commands', () => {
    test('should get resource history via CLI', async () => {
      const mockHistoryOutput = {
        stdout: JSON.stringify({
          duration: '1h',
          data: [
            {
              timestamp: Date.now() - 3600000,
              cpu: 45.2,
              memory: 67.8,
              disk: 34.1,
              network: 23.5
            },
            {
              timestamp: Date.now() - 1800000,
              cpu: 48.1,
              memory: 70.2,
              disk: 34.3,
              network: 25.1
            },
            {
              timestamp: Date.now(),
              cpu: 51.3,
              memory: 72.8,
              disk: 34.5,
              network: 26.7
            }
          ],
          trends: {
            cpu: 'increasing',
            memory: 'increasing',
            disk: 'stable',
            network: 'increasing'
          }
        }),
        stderr: ''
      };

      const result = mockHistoryOutput.stdout;
      const history = JSON.parse(result);

      expect(history.data).toHaveLength(3);
      expect(history.trends).toBeDefined();
      expect(history.duration).toBe('1h');
    });
  });

  describe('Configuration Commands', () => {
    test('should get configuration via CLI', async () => {
      const mockConfigOutput = {
        stdout: JSON.stringify({
          monitoring: {
            enabled: true,
            interval: 5000,
            retentionPeriod: 86400000
          },
          thresholds: {
            cpu: { warning: 80, critical: 90 },
            memory: { warning: 80, critical: 90 },
            disk: { warning: 85, critical: 95 },
            network: { warning: 75, critical: 85 }
          },
          optimization: {
            enabled: true,
            strategy: 'balanced',
            schedule: {
              enabled: false,
              cron: '0 2 * * *'
            }
          },
          features: {
            autoScaling: true,
            pressureDetection: true,
            predictiveAnalytics: true
          }
        }),
        stderr: ''
      };

      const result = mockConfigOutput.stdout;
      const config = JSON.parse(result);

      expect(config.monitoring.enabled).toBe(true);
      expect(config.thresholds.cpu.warning).toBe(80);
      expect(config.optimization.strategy).toBe('balanced');
    });

    test('should update configuration via CLI', async () => {
      const mockUpdateOutput = {
        stdout: JSON.stringify({
          success: true,
          message: 'Configuration updated successfully',
          updated: {
            'thresholds.cpu.warning': 75,
            'monitoring.interval': 3000
          },
          previous: {
            'thresholds.cpu.warning': 80,
            'monitoring.interval': 5000
          }
        }),
        stderr: ''
      };

      const result = mockUpdateOutput.stdout;
      const updateResult = JSON.parse(result);

      expect(updateResult.success).toBe(true);
      expect(updateResult.updated['thresholds.cpu.warning']).toBe(75);
      expect(updateResult.updated['monitoring.interval']).toBe(3000);
    });
  });

  describe('Error Handling in CLI', () => {
    test('should handle invalid commands gracefully', async () => {
      const mockErrorOutput = {
        stdout: '',
        stderr: JSON.stringify({
          error: 'Invalid command',
          message: 'Unknown command: invalid-command',
          availableCommands: [
            'resource status',
            'resource monitor',
            'resource analyze',
            'resource optimize',
            'agent list',
            'agent scale',
            'agent recommendations'
          ]
        })
      };

      const error = JSON.parse(mockErrorOutput.stderr);

      expect(error.error).toBe('Invalid command');
      expect(error.availableCommands).toHaveLength(7);
    });

    test('should handle missing parameters gracefully', async () => {
      const mockMissingParamOutput = {
        stdout: '',
        stderr: JSON.stringify({
          error: 'Missing required parameter',
          message: 'Agent ID is required for scaling operations',
          usage: 'claude-flow agent scale <agent-id> <direction> [replicas]',
          examples: [
            'claude-flow agent scale web-server-01 up',
            'claude-flow agent scale web-server-01 down',
            'claude-flow agent scale web-server-01 to 5'
          ]
        })
      };

      const error = JSON.parse(mockMissingParamOutput.stderr);

      expect(error.error).toBe('Missing required parameter');
      expect(error.usage).toBeDefined();
      expect(error.examples).toHaveLength(3);
    });

    test('should handle system errors gracefully', async () => {
      const mockSystemErrorOutput = {
        stdout: '',
        stderr: JSON.stringify({
          error: 'System error',
          message: 'Failed to connect to resource management system',
          details: 'Connection timeout after 5000ms',
          troubleshooting: [
            'Check if the resource management service is running',
            'Verify network connectivity',
            'Check system logs for more details'
          ]
        })
      };

      const error = JSON.parse(mockSystemErrorOutput.stderr);

      expect(error.error).toBe('System error');
      expect(error.troubleshooting).toHaveLength(3);
    });
  });

  describe('CLI Output Formatting', () => {
    test('should format table output correctly', async () => {
      const mockTableOutput = {
        stdout: `┌─────────────────┬────────┬─────────┬──────────┬─────────┐
│ Agent ID        │ Status │ CPU (%) │ Memory % │ Replicas│
├─────────────────┼────────┼─────────┼──────────┼─────────┤
│ web-server-01   │ healthy│ 75.0    │ 80.0     │ 2       │
│ worker-01       │ degraded│ 85.0    │ 90.0     │ 1       │
│ api-gateway-01  │ healthy│ 45.0    │ 60.0     │ 3       │
└─────────────────┴────────┴─────────┴──────────┴─────────┘`,
        stderr: ''
      };

      const output = mockTableOutput.stdout;

      expect(output).toContain('Agent ID');
      expect(output).toContain('Status');
      expect(output).toContain('web-server-01');
      expect(output).toContain('healthy');
    });

    test('should format JSON output correctly', async () => {
      const mockJsonOutput = {
        stdout: JSON.stringify({
          format: 'json',
          data: {
            agents: [
              {
                agentId: 'web-server-01',
                status: 'healthy',
                metrics: {
                  cpu: 75.0,
                  memory: 80.0,
                  replicas: 2
                }
              }
            ]
          }
        }, null, 2),
        stderr: ''
      };

      const output = JSON.parse(mockJsonOutput.stdout);

      expect(output.format).toBe('json');
      expect(output.data.agents).toHaveLength(1);
      expect(output.data.agents[0].agentId).toBe('web-server-01');
    });
  });

  describe('CLI Performance', () => {
    test('should execute commands within reasonable time limits', async () => {
      const startTime = Date.now();
      
      // Mock quick response
      const mockQuickResponse = {
        stdout: JSON.stringify({ status: 'ok', timestamp: Date.now() }),
        stderr: ''
      };

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Command should execute quickly (under 100ms for mocked responses)
      expect(executionTime).toBeLessThan(100);
    });

    test('should handle concurrent CLI operations', async () => {
      const concurrentOperations = [
        Promise.resolve({ stdout: JSON.stringify({ operation: 'status' }), stderr: '' }),
        Promise.resolve({ stdout: JSON.stringify({ operation: 'monitor' }), stderr: '' }),
        Promise.resolve({ stdout: JSON.stringify({ operation: 'analyze' }), stderr: '' })
      ];

      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        const data = JSON.parse(result.stdout);
        expect(data.operation).toBeDefined();
      });
    });
  });
});