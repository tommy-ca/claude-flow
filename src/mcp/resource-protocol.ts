/**
 * Resource Protocol for MCP Servers
 * Defines the protocol for resource reporting and management between MCP servers and the resource manager
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';

// Resource metric schemas
const CPUMetricsSchema = z.object({
  usage: z.number().min(0).max(100),
  cores: z.number().positive(),
  loadAverage: z.array(z.number()).length(3).optional(),
  temperature: z.number().optional(),
});

const MemoryMetricsSchema = z.object({
  used: z.number().nonnegative(),
  total: z.number().positive(),
  available: z.number().nonnegative(),
  cached: z.number().nonnegative().optional(),
  swapUsed: z.number().nonnegative().optional(),
  swapTotal: z.number().nonnegative().optional(),
});

const GPUDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  memory: z.object({
    used: z.number().nonnegative(),
    total: z.number().positive(),
  }),
  utilization: z.number().min(0).max(100),
  temperature: z.number().optional(),
  powerUsage: z.number().optional(),
});

const NetworkMetricsSchema = z.object({
  latency: z.number().nonnegative(),
  bandwidth: z.number().positive(),
  packetsIn: z.number().nonnegative().optional(),
  packetsOut: z.number().nonnegative().optional(),
  bytesIn: z.number().nonnegative().optional(),
  bytesOut: z.number().nonnegative().optional(),
});

const DiskMetricsSchema = z.object({
  used: z.number().nonnegative(),
  total: z.number().positive(),
  available: z.number().nonnegative(),
  iops: z.number().nonnegative().optional(),
  readSpeed: z.number().nonnegative().optional(),
  writeSpeed: z.number().nonnegative().optional(),
});

// Main resource report schema
export const MCPResourceReportSchema = z.object({
  serverId: z.string(),
  timestamp: z.number(),
  resources: z.object({
    cpu: CPUMetricsSchema,
    memory: MemoryMetricsSchema,
    gpu: z.array(GPUDeviceSchema).optional(),
    network: NetworkMetricsSchema,
    disk: DiskMetricsSchema.optional(),
    capabilities: z.array(z.string()),
  }),
  status: z.enum(['healthy', 'degraded', 'overloaded', 'offline']),
  metadata: z.record(z.any()).optional(),
});

export type MCPResourceReport = z.infer<typeof MCPResourceReportSchema>;
export type CPUMetrics = z.infer<typeof CPUMetricsSchema>;
export type MemoryMetrics = z.infer<typeof MemoryMetricsSchema>;
export type GPUDevice = z.infer<typeof GPUDeviceSchema>;
export type NetworkMetrics = z.infer<typeof NetworkMetricsSchema>;
export type DiskMetrics = z.infer<typeof DiskMetricsSchema>;

// Resource allocation request schema
export const ResourceAllocationRequestSchema = z.object({
  requestId: z.string(),
  agentId: z.string(),
  requirements: z.object({
    cpu: z.object({
      cores: z.number().positive().optional(),
      minUsage: z.number().min(0).max(100).optional(),
    }).optional(),
    memory: z.object({
      minimum: z.number().positive(),
      preferred: z.number().positive().optional(),
    }),
    gpu: z.object({
      required: z.boolean(),
      minMemory: z.number().positive().optional(),
      count: z.number().positive().optional(),
    }).optional(),
    network: z.object({
      minBandwidth: z.number().positive().optional(),
      maxLatency: z.number().positive().optional(),
    }).optional(),
  }),
  constraints: z.object({
    preferredServers: z.array(z.string()).optional(),
    excludedServers: z.array(z.string()).optional(),
    maxCost: z.number().positive().optional(),
  }).optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  duration: z.number().positive().optional(), // Expected duration in seconds
});

export type ResourceAllocationRequest = z.infer<typeof ResourceAllocationRequestSchema>;

// Resource allocation response schema
export const ResourceAllocationResponseSchema = z.object({
  requestId: z.string(),
  allocated: z.boolean(),
  serverId: z.string().optional(),
  allocation: z.object({
    cpu: z.object({
      cores: z.number(),
      reserved: z.number(),
    }).optional(),
    memory: z.object({
      allocated: z.number(),
    }).optional(),
    gpu: z.object({
      devices: z.array(z.string()),
      memory: z.number(),
    }).optional(),
  }).optional(),
  reason: z.string().optional(), // Reason if allocation failed
  alternativeServers: z.array(z.string()).optional(),
});

export type ResourceAllocationResponse = z.infer<typeof ResourceAllocationResponseSchema>;

/**
 * Resource protocol handler for MCP servers
 */
export class ResourceProtocolHandler {
  private server: Server;
  private resourceReporter?: NodeJS.Timeout;
  private reportInterval: number = 30000; // 30 seconds default

  constructor(server: Server, reportInterval?: number) {
    this.server = server;
    if (reportInterval) {
      this.reportInterval = reportInterval;
    }
  }

  /**
   * Initialize resource protocol handlers
   */
  async initialize(): Promise<void> {
    // Register resource-related tools
    this.server.setRequestHandler({
      method: 'resources/report',
      handler: async (request) => {
        const report = MCPResourceReportSchema.parse(request.params);
        await this.handleResourceReport(report);
        return { success: true };
      },
    });

    this.server.setRequestHandler({
      method: 'resources/query',
      handler: async (request) => {
        const { serverId } = request.params as { serverId?: string };
        return await this.queryResources(serverId);
      },
    });

    this.server.setRequestHandler({
      method: 'resources/allocate',
      handler: async (request) => {
        const allocation = ResourceAllocationRequestSchema.parse(request.params);
        return await this.allocateResources(allocation);
      },
    });

    this.server.setRequestHandler({
      method: 'resources/release',
      handler: async (request) => {
        const { requestId } = request.params as { requestId: string };
        return await this.releaseResources(requestId);
      },
    });

    // Start periodic resource reporting
    this.startResourceReporting();
  }

  /**
   * Start periodic resource reporting
   */
  private startResourceReporting(): void {
    this.resourceReporter = setInterval(async () => {
      try {
        const report = await this.collectResourceMetrics();
        await this.server.notification({
          method: 'resources/status',
          params: report,
        });
      } catch (error) {
        console.error('Failed to report resources:', error);
      }
    }, this.reportInterval);
  }

  /**
   * Stop resource reporting
   */
  public stopResourceReporting(): void {
    if (this.resourceReporter) {
      clearInterval(this.resourceReporter);
      this.resourceReporter = undefined;
    }
  }

  /**
   * Collect current resource metrics
   */
  private async collectResourceMetrics(): Promise<MCPResourceReport> {
    // This is a stub implementation - replace with actual system metrics collection
    const os = await import('os');
    
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const loadAverage = os.loadavg();

    // Calculate CPU usage (simplified)
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

    return {
      serverId: this.server.name || 'mcp-server',
      timestamp: Date.now(),
      resources: {
        cpu: {
          usage: cpuUsage,
          cores: cpus.length,
          loadAverage: loadAverage,
        },
        memory: {
          used: totalMemory - freeMemory,
          total: totalMemory,
          available: freeMemory,
        },
        network: {
          latency: 0, // Placeholder - implement actual network testing
          bandwidth: 1000000000, // 1 Gbps placeholder
        },
        capabilities: this.getServerCapabilities(),
      },
      status: this.determineServerStatus(cpuUsage, (totalMemory - freeMemory) / totalMemory * 100),
    };
  }

  /**
   * Get server capabilities
   */
  private getServerCapabilities(): string[] {
    return [
      'text-generation',
      'code-execution',
      'file-operations',
      'web-search',
      'data-analysis',
    ];
  }

  /**
   * Determine server status based on metrics
   */
  private determineServerStatus(cpuUsage: number, memoryUsage: number): MCPResourceReport['status'] {
    if (cpuUsage > 90 || memoryUsage > 90) {
      return 'overloaded';
    } else if (cpuUsage > 70 || memoryUsage > 70) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Handle incoming resource report
   */
  private async handleResourceReport(report: MCPResourceReport): Promise<void> {
    // Store report in memory or forward to resource manager
    // Implementation depends on integration with resource manager
    console.log(`Received resource report from ${report.serverId}:`, report.status);
  }

  /**
   * Query resources for a specific server or all servers
   */
  private async queryResources(serverId?: string): Promise<MCPResourceReport | MCPResourceReport[]> {
    // Implementation depends on resource manager integration
    // For now, return current server's resources
    const currentReport = await this.collectResourceMetrics();
    return serverId ? currentReport : [currentReport];
  }

  /**
   * Allocate resources for an agent
   */
  private async allocateResources(request: ResourceAllocationRequest): Promise<ResourceAllocationResponse> {
    // Simplified allocation logic - replace with actual resource manager integration
    const currentResources = await this.collectResourceMetrics();
    
    // Check if we can satisfy the request
    const canAllocate = 
      currentResources.status === 'healthy' &&
      currentResources.resources.memory.available >= request.requirements.memory.minimum;

    if (canAllocate) {
      return {
        requestId: request.requestId,
        allocated: true,
        serverId: currentResources.serverId,
        allocation: {
          memory: {
            allocated: request.requirements.memory.minimum,
          },
        },
      };
    } else {
      return {
        requestId: request.requestId,
        allocated: false,
        reason: 'Insufficient resources available',
        alternativeServers: [], // Would be populated by resource manager
      };
    }
  }

  /**
   * Release allocated resources
   */
  private async releaseResources(requestId: string): Promise<{ success: boolean }> {
    // Implementation depends on resource manager integration
    console.log(`Releasing resources for request ${requestId}`);
    return { success: true };
  }
}

/**
 * Helper function to integrate resource protocol with existing MCP server
 */
export function addResourceProtocol(server: Server, options?: { reportInterval?: number }): ResourceProtocolHandler {
  const handler = new ResourceProtocolHandler(server, options?.reportInterval);
  handler.initialize().catch(console.error);
  return handler;
}