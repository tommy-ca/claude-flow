/**
 * Test fixtures for Resource Manager tests
 * Provides common test data, mocks, and utilities
 */

import { vi } from 'vitest';

// Mock resource snapshots for different scenarios
export const RESOURCE_SNAPSHOTS = {
  normal: {
    timestamp: Date.now(),
    cpu: {
      cores: 8,
      usage: 35,
      loadAverage: [0.35, 0.40, 0.45],
      processes: 127
    },
    memory: {
      total: 16384,
      used: 7372,
      free: 9012,
      percentage: 45,
      buffers: 1024,
      cached: 2048
    },
    disk: {
      total: 1000000,
      used: 450000,
      free: 550000,
      percentage: 45,
      filesystem: '/dev/sda1',
      mountPoint: '/'
    },
    network: {
      rx: 1234567,
      tx: 987654,
      total: 2222221,
      interfaces: [
        { name: 'eth0', rx: 1234567, tx: 987654 }
      ]
    }
  },

  highLoad: {
    timestamp: Date.now(),
    cpu: {
      cores: 8,
      usage: 85,
      loadAverage: [0.85, 0.90, 0.95],
      processes: 245
    },
    memory: {
      total: 16384,
      used: 14745,
      free: 1639,
      percentage: 90,
      buffers: 512,
      cached: 1024
    },
    disk: {
      total: 1000000,
      used: 900000,
      free: 100000,
      percentage: 90,
      filesystem: '/dev/sda1',
      mountPoint: '/'
    },
    network: {
      rx: 9876543,
      tx: 8765432,
      total: 18641975,
      interfaces: [
        { name: 'eth0', rx: 9876543, tx: 8765432 }
      ]
    }
  },

  critical: {
    timestamp: Date.now(),
    cpu: {
      cores: 8,
      usage: 96,
      loadAverage: [0.96, 0.98, 0.99],
      processes: 512
    },
    memory: {
      total: 16384,
      used: 15728,
      free: 656,
      percentage: 96,
      buffers: 64,
      cached: 256
    },
    disk: {
      total: 1000000,
      used: 980000,
      free: 20000,
      percentage: 98,
      filesystem: '/dev/sda1',
      mountPoint: '/'
    },
    network: {
      rx: 15000000,
      tx: 12000000,
      total: 27000000,
      interfaces: [
        { name: 'eth0', rx: 15000000, tx: 12000000 }
      ]
    }
  },

  lowLoad: {
    timestamp: Date.now(),
    cpu: {
      cores: 8,
      usage: 15,
      loadAverage: [0.15, 0.20, 0.25],
      processes: 85
    },
    memory: {
      total: 16384,
      used: 3276,
      free: 13108,
      percentage: 20,
      buffers: 2048,
      cached: 4096
    },
    disk: {
      total: 1000000,
      used: 200000,
      free: 800000,
      percentage: 20,
      filesystem: '/dev/sda1',
      mountPoint: '/'
    },
    network: {
      rx: 123456,
      tx: 98765,
      total: 222221,
      interfaces: [
        { name: 'eth0', rx: 123456, tx: 98765 }
      ]
    }
  }
};

// Mock agent configurations
export const AGENT_CONFIGS = {
  researcher: {
    type: 'researcher',
    requirements: {
      cpu: 10,
      memory: 1024,
      disk: 500,
      network: { minBandwidth: 10 }
    },
    capabilities: {
      canSearch: true,
      canAnalyze: true,
      canWrite: false,
      canExecute: false,
      specializations: ['web-search', 'documentation', 'analysis']
    }
  },

  coder: {
    type: 'coder',
    requirements: {
      cpu: 25,
      memory: 2048,
      disk: 1000,
      network: { minBandwidth: 20 }
    },
    capabilities: {
      canSearch: false,
      canAnalyze: true,
      canWrite: true,
      canExecute: true,
      specializations: ['programming', 'debugging', 'testing']
    }
  },

  analyst: {
    type: 'analyst',
    requirements: {
      cpu: 40,
      memory: 4096,
      disk: 2000,
      network: { minBandwidth: 30 }
    },
    capabilities: {
      canSearch: true,
      canAnalyze: true,
      canWrite: true,
      canExecute: false,
      specializations: ['data-analysis', 'reporting', 'visualization']
    }
  },

  tester: {
    type: 'tester',
    requirements: {
      cpu: 20,
      memory: 1536,
      disk: 750,
      network: { minBandwidth: 15 }
    },
    capabilities: {
      canSearch: false,
      canAnalyze: true,
      canWrite: false,
      canExecute: true,
      specializations: ['testing', 'qa', 'automation']
    }
  },

  coordinator: {
    type: 'coordinator',
    requirements: {
      cpu: 30,
      memory: 3072,
      disk: 1500,
      network: { minBandwidth: 25 }
    },
    capabilities: {
      canSearch: true,
      canAnalyze: true,
      canWrite: true,
      canExecute: true,
      specializations: ['coordination', 'planning', 'management']
    }
  }
};

// Mock pressure thresholds
export const PRESSURE_THRESHOLDS = {
  cpu: {
    normal: 60,
    moderate: 75,
    high: 85,
    critical: 95
  },
  memory: {
    normal: 70,
    moderate: 80,
    high: 90,
    critical: 95
  },
  disk: {
    normal: 75,
    moderate: 85,
    high: 92,
    critical: 98
  },
  network: {
    normal: 60,
    moderate: 75,
    high: 85,
    critical: 92
  }
};

// Test utilities
export class TestUtils {
  static generateResourceSnapshot(overrides: any = {}) {
    return {
      ...RESOURCE_SNAPSHOTS.normal,
      ...overrides,
      timestamp: Date.now()
    };
  }

  static generateAgentInstance(type: string, overrides: any = {}) {
    const config = AGENT_CONFIGS[type as keyof typeof AGENT_CONFIGS];
    return {
      id: `agent-${type}-${Date.now()}`,
      type,
      status: 'ready',
      createdAt: Date.now(),
      resourceAllocation: config.requirements,
      ...overrides
    };
  }

  static generateAllocationResult(success: boolean, overrides: any = {}) {
    if (success) {
      return {
        success: true,
        allocated: {
          cpu: 20,
          memory: 2048,
          disk: 1000
        },
        reservationId: `res-${Date.now()}`,
        ...overrides
      };
    } else {
      return {
        success: false,
        reason: 'Insufficient resources',
        shortage: {
          cpu: 5,
          memory: 512
        },
        ...overrides
      };
    }
  }

  static generatePressureReading(levels: any = {}) {
    return {
      cpu: levels.cpu || 'normal',
      memory: levels.memory || 'normal',
      disk: levels.disk || 'normal',
      network: levels.network || 'normal',
      overall: levels.overall || 'normal',
      compositeScore: this.calculateCompositeScore(levels),
      timestamp: Date.now()
    };
  }

  static calculateCompositeScore(levels: any) {
    const weights = { cpu: 0.3, memory: 0.3, disk: 0.2, network: 0.2 };
    const scores = {
      normal: 0.2,
      moderate: 0.5,
      high: 0.8,
      critical: 1.0
    };

    let weightedSum = 0;
    Object.keys(weights).forEach(resource => {
      const level = levels[resource] || 'normal';
      weightedSum += weights[resource as keyof typeof weights] * scores[level as keyof typeof scores];
    });

    return weightedSum;
  }

  static createMockResourceDetector() {
    return {
      detectAll: vi.fn(),
      detectCPU: vi.fn(),
      detectMemory: vi.fn(),
      detectDisk: vi.fn(),
      detectNetwork: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      getMovingAverage: vi.fn(),
      isSupported: vi.fn().mockReturnValue(true),
      getPlatform: vi.fn().mockReturnValue(process.platform),
      setMaxHistorySize: vi.fn(),
      predictResourceExhaustion: vi.fn(),
      getResourceRecommendations: vi.fn().mockReturnValue([])
    };
  }

  static createMockAgentFactory() {
    return {
      createAgent: vi.fn(),
      destroyAgent: vi.fn(),
      getAvailableAgentTypes: vi.fn().mockReturnValue(['researcher', 'coder', 'analyst', 'tester', 'coordinator']),
      getAgentRequirements: vi.fn((type: string) => AGENT_CONFIGS[type as keyof typeof AGENT_CONFIGS]?.requirements),
      getAgentCapabilities: vi.fn((type: string) => AGENT_CONFIGS[type as keyof typeof AGENT_CONFIGS]?.capabilities),
      deployAgents: vi.fn(),
      deployAndStart: vi.fn(),
      createAgentPool: vi.fn(),
      setDeploymentStrategy: vi.fn(),
      setResourceBuffer: vi.fn(),
      setAgentLimits: vi.fn(),
      setGlobalLimits: vi.fn(),
      startAgent: vi.fn(),
      stopAgent: vi.fn(),
      configureHealthCheck: vi.fn(),
      createChannel: vi.fn(),
      sendMessage: vi.fn(),
      broadcast: vi.fn(),
      onMessage: vi.fn()
    };
  }

  static createMockResourceAllocator() {
    return {
      allocate: vi.fn(),
      release: vi.fn(),
      getAvailableResources: vi.fn(),
      getActiveAllocations: vi.fn().mockReturnValue([]),
      reserve: vi.fn(),
      reserveRecurring: vi.fn(),
      cancelReservation: vi.fn(),
      processReservations: vi.fn(),
      setStrategy: vi.fn(),
      setPolicy: vi.fn(),
      setQuota: vi.fn(),
      getOptimizer: vi.fn(),
      getMetrics: vi.fn(),
      getUtilizationTrends: vi.fn(),
      generateReport: vi.fn(),
      validateState: vi.fn().mockReturnValue(true),
      repairState: vi.fn(),
      reset: vi.fn()
    };
  }

  static createMockPressureDetector() {
    return {
      detectPressure: vi.fn(),
      detectPressureBatch: vi.fn(),
      getThresholds: vi.fn().mockReturnValue(PRESSURE_THRESHOLDS),
      setThresholds: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      getTrends: vi.fn(),
      getPatterns: vi.fn(),
      getPredictor: vi.fn(),
      onAlert: vi.fn(),
      getMitigationActions: vi.fn().mockReturnValue([]),
      enableAutoThrottling: vi.fn(),
      getThrottler: vi.fn(),
      getScaler: vi.fn(),
      getMigrator: vi.fn(),
      setAllocator: vi.fn(),
      getCPUPressureDetail: vi.fn(),
      getMemoryPressureDetail: vi.fn(),
      getDiskPressureDetail: vi.fn(),
      getNetworkPressureDetail: vi.fn(),
      setAdaptiveMonitoring: vi.fn(),
      getMonitoringInterval: vi.fn().mockReturnValue(5000),
      reset: vi.fn()
    };
  }

  static createMockPlatformAdapter() {
    return {
      platform: process.platform,
      executeCommand: vi.fn(),
      isCommandAvailable: vi.fn().mockReturnValue(true),
      getCommandPath: vi.fn().mockReturnValue('/usr/bin/test'),
      getCPUUsage: vi.fn(),
      getMemoryUsage: vi.fn(),
      getDiskUsage: vi.fn(),
      getNetworkUsage: vi.fn(),
      getCommands: vi.fn(),
      setDistribution: vi.fn(),
      setVersion: vi.fn(),
      setArchitecture: vi.fn(),
      getServiceManager: vi.fn(),
      getArchSpecificCommands: vi.fn(),
      getCPUUsageWithFallback: vi.fn(),
      getPreferredShell: vi.fn(),
      getCPUUsageWithElevation: vi.fn(),
      executeWMIQuery: vi.fn(),
      executeCommandWithFallback: vi.fn(),
      detectAllPartitions: vi.fn(),
      detectAllInterfaces: vi.fn(),
      batchQuery: vi.fn(),
      getOptimalMonitoringFrequency: vi.fn().mockReturnValue(5000)
    };
  }

  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static mockConsole() {
    const originalConsole = { ...console };
    
    Object.keys(console).forEach(key => {
      if (typeof console[key as keyof Console] === 'function') {
        (console as any)[key] = vi.fn();
      }
    });

    return {
      restore: () => {
        Object.assign(console, originalConsole);
      }
    };
  }

  static createResourceHistory(pattern: 'increasing' | 'decreasing' | 'stable' | 'oscillating', length: number = 10) {
    const history = [];
    const baseTime = Date.now() - (length * 60000); // Start from 'length' minutes ago

    for (let i = 0; i < length; i++) {
      let cpuUsage: number;
      
      switch (pattern) {
        case 'increasing':
          cpuUsage = 30 + (i * 5);
          break;
        case 'decreasing':
          cpuUsage = 80 - (i * 5);
          break;
        case 'stable':
          cpuUsage = 45 + (Math.random() * 10 - 5); // ±5% variation
          break;
        case 'oscillating':
          cpuUsage = 45 + (Math.sin(i * 0.5) * 20);
          break;
        default:
          cpuUsage = 45;
      }

      history.push({
        timestamp: baseTime + (i * 60000),
        cpu: { usage: Math.max(0, Math.min(100, cpuUsage)) },
        memory: { percentage: Math.max(0, Math.min(100, cpuUsage + Math.random() * 10 - 5)) },
        disk: { percentage: Math.max(0, Math.min(100, cpuUsage + Math.random() * 10 - 5)) },
        network: { total: Math.max(0, cpuUsage * 1000 + Math.random() * 500 - 250) }
      });
    }

    return history;
  }

  static createWorkloadProfile(type: 'development' | 'production' | 'testing' | 'research') {
    const profiles = {
      development: {
        coding: 0.6,
        research: 0.2,
        testing: 0.1,
        analysis: 0.1
      },
      production: {
        coding: 0.3,
        research: 0.1,
        testing: 0.3,
        analysis: 0.2,
        coordination: 0.1
      },
      testing: {
        coding: 0.2,
        research: 0.1,
        testing: 0.6,
        analysis: 0.1
      },
      research: {
        coding: 0.1,
        research: 0.7,
        testing: 0.1,
        analysis: 0.1
      }
    };

    return profiles[type];
  }

  static generateMetrics(overrides: any = {}) {
    return {
      timestamp: Date.now(),
      deployments: {
        total: 25,
        successful: 23,
        failed: 2,
        queued: 0
      },
      resources: {
        cpu: {
          total: 800,
          allocated: 320,
          utilization: 0.4
        },
        memory: {
          total: 16384,
          allocated: 8192,
          utilization: 0.5
        },
        disk: {
          total: 1000000,
          allocated: 450000,
          utilization: 0.45
        }
      },
      agents: {
        total: 23,
        active: 20,
        idle: 3,
        failed: 0
      },
      performance: {
        averageDeploymentTime: 2500,
        averageResourceDetectionTime: 150,
        averageAllocationTime: 75,
        throughput: 12.5 // deployments per minute
      },
      ...overrides
    };
  }
}

// Platform-specific mock responses
export const PLATFORM_MOCK_RESPONSES = {
  linux: {
    cpu: `cpu  2255920 34 2290768 22625563 6290 127 456 0 0 0
cpu0 1132960 34 1441238 11311718 3675 127 438 0 0 0
cpu1 1122960 0 849530 11313845 2615 0 18 0 0 0`,
    memory: `              total        used        free      shared  buff/cache   available
Mem:          16384        7372        4096         512        4916        8500`,
    disk: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       931G  418G  466G  45% /
/dev/sda2       100G   23G   72G  25% /home`,
    network: `eth0      Link encap:Ethernet  HWaddr 00:11:22:33:44:55
          RX packets:1234567 errors:0 dropped:0 overruns:0 frame:0
          TX packets:987654 errors:0 dropped:0 overruns:0 carrier:0
          RX bytes:1234567890 (1.2 GB)  TX bytes:987654321 (987.6 MB)`
  },

  darwin: {
    cpu: `Processes: 234 total, 2 running, 232 sleeping, 1086 threads
2023/07/09 10:15:30
Load Avg: 2.15, 2.32, 2.45
CPU usage: 12.34% user, 5.67% sys, 81.99% idle`,
    memory: `Mach Virtual Memory Statistics: (page size of 4096 bytes)
Pages free:                               524288.
Pages active:                            1048576.
Pages inactive:                           262144.
Pages speculative:                        131072.
Pages throttled:                               0.
Pages wired down:                         786432.
Pages purgeable:                           65536.`,
    disk: `Filesystem     512-blocks      Used Available Capacity iused      ifree %iused  Mounted on
/dev/disk1s1   1953458176 878906368 1072598016    45% 2654321 4292312959    0%   /
/dev/disk1s4   1953458176  20971520 1072598016     2%       1 4294967278    0%   /private/var/vm`,
    network: `Name  Mtu   Network       Address            Ipkts Ierrs    Opkts Oerrs  Coll
en0   1500  <Link#4>      a0:b1:c2:d3:e4:f5  1234567     0   987654     0     0
en0   1500  192.168.1     192.168.1.100      1234567     0   987654     0     0`
  },

  win32: {
    cpu: `LoadPercentage
35
38
32
40`,
    memory: `TotalVisibleMemorySize  FreePhysicalMemory
16777216                7340032`,
    disk: `Size         FreeSpace
1073741824000 578437877760
536870912000  322122547200`,
    network: `Interface Statistics

                       Received            Sent

Bytes                1234567890       987654321
Unicast packets        12345678         9876543
Non-unicast packets       12345           98765
Discards                      0               0
Errors                        0               0`
  }
};

export default TestUtils;