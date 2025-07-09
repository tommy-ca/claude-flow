/**
 * Test configuration for Resource Manager test suite
 */

export const TEST_CONFIG = {
  // Resource thresholds for testing
  resources: {
    cpu: {
      high: 80,
      medium: 50,
      low: 20,
      critical: 95
    },
    memory: {
      high: 85,
      medium: 60,
      low: 30,
      critical: 95
    },
    disk: {
      high: 90,
      medium: 70,
      low: 40,
      critical: 95
    },
    network: {
      high: 80,
      medium: 50,
      low: 20,
      critical: 90
    }
  },

  // Agent deployment configurations
  agents: {
    maxConcurrent: 10,
    minRequired: 1,
    deploymentTimeout: 5000,
    healthCheckInterval: 1000,
    resourceCheckInterval: 500
  },

  // Platform-specific settings
  platforms: {
    linux: {
      cpuCommand: 'cat /proc/stat',
      memoryCommand: 'free -m',
      diskCommand: 'df -h',
      networkCommand: 'ifstat'
    },
    darwin: {
      cpuCommand: 'top -l 1',
      memoryCommand: 'vm_stat',
      diskCommand: 'df -h',
      networkCommand: 'netstat -i'
    },
    win32: {
      cpuCommand: 'wmic cpu get loadpercentage',
      memoryCommand: 'wmic OS get TotalVisibleMemorySize,FreePhysicalMemory',
      diskCommand: 'wmic logicaldisk get size,freespace',
      networkCommand: 'netstat -e'
    }
  },

  // Test timeouts
  timeouts: {
    unit: 5000,
    integration: 30000,
    performance: 60000,
    e2e: 120000
  },

  // Mock data generators
  mocks: {
    generateCpuLoad: (percentage: number) => ({
      cores: 8,
      usage: percentage,
      loadAverage: [percentage / 100, percentage / 100, percentage / 100]
    }),
    generateMemoryUsage: (percentage: number) => ({
      total: 16384,
      used: Math.floor(16384 * percentage / 100),
      free: Math.floor(16384 * (100 - percentage) / 100),
      percentage
    }),
    generateDiskUsage: (percentage: number) => ({
      total: 1000,
      used: Math.floor(1000 * percentage / 100),
      free: Math.floor(1000 * (100 - percentage) / 100),
      percentage
    }),
    generateNetworkStats: (throughput: number) => ({
      rx: throughput * 0.6,
      tx: throughput * 0.4,
      total: throughput
    })
  }
};

export const TEST_FIXTURES = {
  // Sample resource states
  normalState: {
    cpu: 30,
    memory: 45,
    disk: 50,
    network: 25
  },
  highLoadState: {
    cpu: 75,
    memory: 80,
    disk: 85,
    network: 70
  },
  criticalState: {
    cpu: 95,
    memory: 96,
    disk: 98,
    network: 92
  },

  // Sample agent configurations
  lightweightAgent: {
    name: 'researcher',
    requiredResources: {
      cpu: 10,
      memory: 512,
      disk: 100
    }
  },
  standardAgent: {
    name: 'coder',
    requiredResources: {
      cpu: 25,
      memory: 1024,
      disk: 500
    }
  },
  heavyweightAgent: {
    name: 'analyzer',
    requiredResources: {
      cpu: 50,
      memory: 2048,
      disk: 1000
    }
  }
};

export const MOCK_RESPONSES = {
  // Mock system command responses
  linux: {
    cpu: `cpu  2255 34 2290 22625563 6290 127 456 0 0 0
cpu0 1132 34 1441 11311718 3675 127 438 0 0 0`,
    memory: `              total        used        free      shared  buff/cache   available
Mem:          16384        8192        4096         512        4096        7680`,
    disk: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       1.0T  500G  500G  50% /`,
    network: `eth0      Link encap:Ethernet  HWaddr 00:00:00:00:00:00
          RX bytes:1234567890 TX bytes:987654321`
  },
  darwin: {
    cpu: `CPU usage: 2.5% user, 1.5% sys, 96.0% idle`,
    memory: `Mach Virtual Memory Statistics: (page size of 4096 bytes)
Pages free:                               524288.
Pages active:                            1048576.`,
    disk: `Filesystem     Size   Used  Avail Capacity  Mounted on
/dev/disk1s1  1.0Ti  500Gi  500Gi    50%    /`,
    network: `Name  Mtu   Network       Address            Ipkts Ierrs    Opkts Oerrs  Coll
en0   1500  <Link#4>      00:00:00:00:00:00  12345     0    98765     0     0`
  },
  win32: {
    cpu: `LoadPercentage
25`,
    memory: `TotalVisibleMemorySize  FreePhysicalMemory
16777216                8388608`,
    disk: `Size         FreeSpace
1099511627776 549755813888`,
    network: `Interface Statistics
                       Received            Sent
Bytes                1234567890       987654321`
  }
};