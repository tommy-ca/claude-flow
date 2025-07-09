/**
 * Unit tests for Resource Detector
 * Tests CPU, memory, disk, and network resource detection across platforms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, MOCK_RESPONSES } from '../test-config';

// These imports will fail initially (TDD approach)
import {
  ResourceDetector,
  CPUDetector,
  MemoryDetector,
  DiskDetector,
  NetworkDetector,
  ResourceSnapshot,
  ResourceType,
  PlatformAdapter
} from '../../../src/resource-manager/core/resource-detector';

describe('ResourceDetector', () => {
  let detector: ResourceDetector;
  let mockPlatformAdapter: PlatformAdapter;

  beforeEach(() => {
    // Mock platform adapter for consistent testing
    mockPlatformAdapter = {
      platform: process.platform as 'linux' | 'darwin' | 'win32',
      executeCommand: vi.fn()
    };
    
    detector = new ResourceDetector(mockPlatformAdapter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cross-Platform Detection', () => {
    it('should detect current platform correctly', () => {
      expect(detector.getPlatform()).toBe(process.platform);
    });

    it('should support Linux platform', () => {
      mockPlatformAdapter.platform = 'linux';
      expect(detector.isSupported()).toBe(true);
    });

    it('should support macOS platform', () => {
      mockPlatformAdapter.platform = 'darwin';
      expect(detector.isSupported()).toBe(true);
    });

    it('should support Windows platform', () => {
      mockPlatformAdapter.platform = 'win32';
      expect(detector.isSupported()).toBe(true);
    });

    it('should throw error for unsupported platform', () => {
      mockPlatformAdapter.platform = 'unsupported' as any;
      expect(() => detector.detectAll()).rejects.toThrow('Unsupported platform');
    });
  });

  describe('Complete Resource Detection', () => {
    it('should detect all resource types in a single call', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.cpu)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.memory)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);

      const snapshot = await detector.detectAll();

      expect(snapshot).toMatchObject({
        timestamp: expect.any(Number),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
          cores: expect.any(Number),
          loadAverage: expect.arrayContaining([
            expect.any(Number),
            expect.any(Number),
            expect.any(Number)
          ])
        }),
        memory: expect.objectContaining({
          total: expect.any(Number),
          used: expect.any(Number),
          free: expect.any(Number),
          percentage: expect.any(Number)
        }),
        disk: expect.objectContaining({
          total: expect.any(Number),
          used: expect.any(Number),
          free: expect.any(Number),
          percentage: expect.any(Number)
        }),
        network: expect.objectContaining({
          rx: expect.any(Number),
          tx: expect.any(Number),
          total: expect.any(Number)
        })
      });
    });

    it('should handle partial detection failures gracefully', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.cpu)
        .mockRejectedValueOnce(new Error('Memory detection failed'))
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);

      const snapshot = await detector.detectAll({ failOnError: false });

      expect(snapshot.cpu).toBeDefined();
      expect(snapshot.memory).toBeNull();
      expect(snapshot.disk).toBeDefined();
      expect(snapshot.network).toBeDefined();
    });

    it('should respect detection timeout', async () => {
      mockPlatformAdapter.executeCommand
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10000)));

      await expect(detector.detectAll({ timeout: 1000 }))
        .rejects.toThrow('Resource detection timeout');
    });
  });

  describe('Resource History and Averaging', () => {
    it('should maintain resource history', async () => {
      const snapshots = [];
      
      for (let i = 0; i < 5; i++) {
        mockPlatformAdapter.executeCommand
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.cpu)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.memory)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);
        
        const snapshot = await detector.detectAll();
        snapshots.push(snapshot);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const history = detector.getHistory();
      expect(history).toHaveLength(5);
      expect(history).toEqual(snapshots);
    });

    it('should calculate moving average of resources', async () => {
      // Create multiple snapshots with known values
      const mockSnapshots = [30, 40, 50, 60, 70].map(cpu => ({
        ...TEST_CONFIG.mocks.generateCpuLoad(cpu),
        ...TEST_CONFIG.mocks.generateMemoryUsage(cpu + 5)
      }));

      for (const mock of mockSnapshots) {
        mockPlatformAdapter.executeCommand
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.cpu)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.memory)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);
        
        await detector.detectAll();
      }

      const average = detector.getMovingAverage(3); // Last 3 readings
      expect(average.cpu.usage).toBeCloseTo(60, 1); // Average of 50, 60, 70
    });

    it('should limit history size to prevent memory leaks', async () => {
      detector.setMaxHistorySize(10);

      for (let i = 0; i < 20; i++) {
        mockPlatformAdapter.executeCommand
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.cpu)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.memory)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);
        
        await detector.detectAll();
      }

      expect(detector.getHistory()).toHaveLength(10);
    });
  });
});

describe('CPUDetector', () => {
  let cpuDetector: CPUDetector;
  let mockPlatformAdapter: PlatformAdapter;

  beforeEach(() => {
    mockPlatformAdapter = {
      platform: 'linux',
      executeCommand: vi.fn()
    };
    cpuDetector = new CPUDetector(mockPlatformAdapter);
  });

  describe('Linux CPU Detection', () => {
    it('should parse /proc/stat correctly', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.linux.cpu);

      const result = await cpuDetector.detect();

      expect(result).toMatchObject({
        cores: expect.any(Number),
        usage: expect.any(Number),
        loadAverage: expect.arrayContaining([
          expect.any(Number),
          expect.any(Number),
          expect.any(Number)
        ])
      });
      expect(result.usage).toBeGreaterThanOrEqual(0);
      expect(result.usage).toBeLessThanOrEqual(100);
    });

    it('should handle multi-core systems', async () => {
      const multiCoreStat = `cpu  2255 34 2290 22625563 6290 127 456 0 0 0
cpu0 1132 34 1441 11311718 3675 127 438 0 0 0
cpu1 1123 0 849 11313845 2615 0 18 0 0 0
cpu2 1000 0 800 11000000 2000 0 10 0 0 0
cpu3 900 0 700 10000000 1800 0 8 0 0 0`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(multiCoreStat);

      const result = await cpuDetector.detect();
      expect(result.cores).toBe(4);
    });
  });

  describe('macOS CPU Detection', () => {
    beforeEach(() => {
      mockPlatformAdapter.platform = 'darwin';
    });

    it('should parse top command output correctly', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.darwin.cpu);

      const result = await cpuDetector.detect();

      expect(result.usage).toBeCloseTo(4.0, 1); // 2.5% user + 1.5% sys
    });

    it('should get system load averages', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValueOnce(MOCK_RESPONSES.darwin.cpu)
        .mockResolvedValueOnce('load averages: 1.52 1.68 1.84');

      const result = await cpuDetector.detect();

      expect(result.loadAverage).toEqual([1.52, 1.68, 1.84]);
    });
  });

  describe('Windows CPU Detection', () => {
    beforeEach(() => {
      mockPlatformAdapter.platform = 'win32';
    });

    it('should parse wmic output correctly', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.win32.cpu);

      const result = await cpuDetector.detect();

      expect(result.usage).toBe(25);
    });

    it('should handle multiple CPU entries', async () => {
      const multiCpuOutput = `LoadPercentage
25
30
20
35`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(multiCpuOutput);

      const result = await cpuDetector.detect();

      expect(result.usage).toBeCloseTo(27.5, 1); // Average of all CPUs
      expect(result.cores).toBe(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution failures', async () => {
      mockPlatformAdapter.executeCommand
        .mockRejectedValue(new Error('Command failed'));

      await expect(cpuDetector.detect())
        .rejects.toThrow('Failed to detect CPU usage');
    });

    it('should handle malformed output', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue('invalid output');

      await expect(cpuDetector.detect())
        .rejects.toThrow('Failed to parse CPU data');
    });
  });
});

describe('MemoryDetector', () => {
  let memoryDetector: MemoryDetector;
  let mockPlatformAdapter: PlatformAdapter;

  beforeEach(() => {
    mockPlatformAdapter = {
      platform: 'linux',
      executeCommand: vi.fn()
    };
    memoryDetector = new MemoryDetector(mockPlatformAdapter);
  });

  describe('Linux Memory Detection', () => {
    it('should parse free command output correctly', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.linux.memory);

      const result = await memoryDetector.detect();

      expect(result).toMatchObject({
        total: 16384,
        used: 8192,
        free: 4096,
        percentage: 50
      });
    });

    it('should calculate percentage correctly', async () => {
      const customMemory = `              total        used        free      shared  buff/cache   available
Mem:          32768       24576        4096        1024        4096        7168`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(customMemory);

      const result = await memoryDetector.detect();

      expect(result.percentage).toBeCloseTo(75, 1);
    });
  });

  describe('macOS Memory Detection', () => {
    beforeEach(() => {
      mockPlatformAdapter.platform = 'darwin';
    });

    it('should parse vm_stat output correctly', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.darwin.memory);

      const result = await memoryDetector.detect();

      expect(result).toMatchObject({
        total: expect.any(Number),
        used: expect.any(Number),
        free: expect.any(Number),
        percentage: expect.any(Number)
      });
    });
  });

  describe('Windows Memory Detection', () => {
    beforeEach(() => {
      mockPlatformAdapter.platform = 'win32';
    });

    it('should parse wmic memory output correctly', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.win32.memory);

      const result = await memoryDetector.detect();

      expect(result).toMatchObject({
        total: 16384, // KB to MB conversion
        used: 8192,
        free: 8192,
        percentage: 50
      });
    });
  });

  describe('Memory Pressure Detection', () => {
    it('should detect memory pressure correctly', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.linux.memory);

      const result = await memoryDetector.detect();
      const pressure = memoryDetector.getMemoryPressure(result);

      expect(pressure).toBe('normal'); // 50% usage
    });

    it('should detect high memory pressure', async () => {
      const highMemory = `              total        used        free      shared  buff/cache   available
Mem:          16384       14745         819         512         819        1024`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(highMemory);

      const result = await memoryDetector.detect();
      const pressure = memoryDetector.getMemoryPressure(result);

      expect(pressure).toBe('high'); // 90% usage
    });

    it('should detect critical memory pressure', async () => {
      const criticalMemory = `              total        used        free      shared  buff/cache   available
Mem:          16384       15728         328         164         328         328`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(criticalMemory);

      const result = await memoryDetector.detect();
      const pressure = memoryDetector.getMemoryPressure(result);

      expect(pressure).toBe('critical'); // 96% usage
    });
  });
});

describe('DiskDetector', () => {
  let diskDetector: DiskDetector;
  let mockPlatformAdapter: PlatformAdapter;

  beforeEach(() => {
    mockPlatformAdapter = {
      platform: 'linux',
      executeCommand: vi.fn()
    };
    diskDetector = new DiskDetector(mockPlatformAdapter);
  });

  describe('Disk Space Detection', () => {
    it('should parse df output correctly on Linux', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.linux.disk);

      const result = await diskDetector.detect();

      expect(result).toMatchObject({
        total: expect.any(Number),
        used: expect.any(Number),
        free: expect.any(Number),
        percentage: 50
      });
    });

    it('should handle multiple disk partitions', async () => {
      const multiDisk = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       1.0T  500G  500G  50% /
/dev/sda2       500G  400G  100G  80% /home
/dev/sdb1       2.0T  1.5T  500G  75% /data`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(multiDisk);

      const result = await diskDetector.detect();
      const partitions = await diskDetector.detectAllPartitions();

      expect(partitions).toHaveLength(3);
      expect(partitions[0].mountPoint).toBe('/');
      expect(partitions[1].percentage).toBe(80);
      expect(partitions[2].total).toBeGreaterThan(1000000); // 2TB in MB
    });

    it('should filter out virtual filesystems', async () => {
      const mixedFilesystems = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       1.0T  500G  500G  50% /
tmpfs           8.0G     0  8.0G   0% /dev/shm
devtmpfs        8.0G     0  8.0G   0% /dev
/dev/sda2       500G  250G  250G  50% /home`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(mixedFilesystems);

      const partitions = await diskDetector.detectAllPartitions({ includeVirtual: false });

      expect(partitions).toHaveLength(2);
      expect(partitions.every(p => !p.filesystem.includes('tmpfs'))).toBe(true);
    });
  });

  describe('Platform-Specific Parsing', () => {
    it('should parse macOS df output', async () => {
      mockPlatformAdapter.platform = 'darwin';
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.darwin.disk);

      const result = await diskDetector.detect();

      expect(result.percentage).toBe(50);
    });

    it('should parse Windows wmic output', async () => {
      mockPlatformAdapter.platform = 'win32';
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.win32.disk);

      const result = await diskDetector.detect();

      expect(result.percentage).toBe(50);
      expect(result.total).toBeCloseTo(1048576, -3); // 1TB in MB
    });
  });

  describe('Disk Health Monitoring', () => {
    it('should detect disk health issues', async () => {
      const unhealthyDisk = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       1.0T  950G   50G  95% /`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(unhealthyDisk);

      const result = await diskDetector.detect();
      const health = diskDetector.getDiskHealth(result);

      expect(health.status).toBe('critical');
      expect(health.warnings).toContain('Disk space critically low');
    });

    it('should track disk usage trends', async () => {
      const usageSnapshots = [50, 55, 60, 65, 70];

      for (const usage of usageSnapshots) {
        const mockDisk = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       1.0T  ${usage}0G  ${100 - usage}0G  ${usage}% /`;

        mockPlatformAdapter.executeCommand
          .mockResolvedValue(mockDisk);

        await diskDetector.detect();
      }

      const trend = diskDetector.getUsageTrend();
      expect(trend.direction).toBe('increasing');
      expect(trend.ratePerHour).toBeGreaterThan(0);
    });
  });
});

describe('NetworkDetector', () => {
  let networkDetector: NetworkDetector;
  let mockPlatformAdapter: PlatformAdapter;

  beforeEach(() => {
    mockPlatformAdapter = {
      platform: 'linux',
      executeCommand: vi.fn()
    };
    networkDetector = new NetworkDetector(mockPlatformAdapter);
  });

  describe('Network Traffic Detection', () => {
    it('should detect network throughput on Linux', async () => {
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.linux.network);

      const result = await networkDetector.detect();

      expect(result).toMatchObject({
        rx: expect.any(Number),
        tx: expect.any(Number),
        total: expect.any(Number)
      });
      expect(result.total).toBe(result.rx + result.tx);
    });

    it('should calculate bandwidth usage over time', async () => {
      // First reading
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(`eth0      Link encap:Ethernet  HWaddr 00:00:00:00:00:00
          RX bytes:1000000 TX bytes:500000`);

      await networkDetector.detect();

      // Wait and take second reading
      await new Promise(resolve => setTimeout(resolve, 1000));

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(`eth0      Link encap:Ethernet  HWaddr 00:00:00:00:00:00
          RX bytes:2000000 TX bytes:1000000`);

      const result = await networkDetector.detect();
      const bandwidth = networkDetector.getBandwidthUsage();

      expect(bandwidth.rxRate).toBeGreaterThan(0);
      expect(bandwidth.txRate).toBeGreaterThan(0);
    });

    it('should detect multiple network interfaces', async () => {
      const multiInterface = `eth0      Link encap:Ethernet  HWaddr 00:00:00:00:00:00
          RX bytes:1234567890 TX bytes:987654321
eth1      Link encap:Ethernet  HWaddr 00:00:00:00:00:01
          RX bytes:567890123 TX bytes:345678901
lo        Link encap:Local Loopback
          RX bytes:123456 TX bytes:123456`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValue(multiInterface);

      const interfaces = await networkDetector.detectAllInterfaces();

      expect(interfaces).toHaveLength(3);
      expect(interfaces.find(i => i.name === 'eth0')).toBeDefined();
      expect(interfaces.find(i => i.name === 'lo')?.isLoopback).toBe(true);
    });
  });

  describe('Network Health Monitoring', () => {
    it('should detect network congestion', async () => {
      // Simulate high network usage
      const readings = [
        { rx: 1000000000, tx: 800000000 },
        { rx: 1100000000, tx: 880000000 },
        { rx: 1200000000, tx: 960000000 }
      ];

      for (const reading of readings) {
        mockPlatformAdapter.executeCommand
          .mockResolvedValue(`eth0      Link encap:Ethernet  HWaddr 00:00:00:00:00:00
          RX bytes:${reading.rx} TX bytes:${reading.tx}`);

        await networkDetector.detect();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const health = networkDetector.getNetworkHealth();
      expect(health.congestion).toBe('high');
    });

    it('should detect packet loss patterns', async () => {
      // This would require more sophisticated monitoring
      const stats = await networkDetector.getNetworkStatistics();
      
      expect(stats).toMatchObject({
        packetLoss: expect.any(Number),
        latency: expect.any(Number),
        jitter: expect.any(Number)
      });
    });
  });

  describe('Platform-Specific Network Detection', () => {
    it('should parse macOS netstat output', async () => {
      mockPlatformAdapter.platform = 'darwin';
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.darwin.network);

      const result = await networkDetector.detect();

      expect(result.rx).toBeGreaterThan(0);
      expect(result.tx).toBeGreaterThan(0);
    });

    it('should parse Windows netstat output', async () => {
      mockPlatformAdapter.platform = 'win32';
      mockPlatformAdapter.executeCommand
        .mockResolvedValue(MOCK_RESPONSES.win32.network);

      const result = await networkDetector.detect();

      expect(result.rx).toBe(1234567890);
      expect(result.tx).toBe(987654321);
    });
  });
});

describe('Resource Pressure Prevention', () => {
  let detector: ResourceDetector;
  let mockPlatformAdapter: PlatformAdapter;

  beforeEach(() => {
    mockPlatformAdapter = {
      platform: 'linux',
      executeCommand: vi.fn()
    };
    detector = new ResourceDetector(mockPlatformAdapter);
  });

  it('should predict resource exhaustion', async () => {
    // Simulate increasing resource usage
    const usagePattern = [30, 40, 50, 60, 70, 80];

    for (const usage of usagePattern) {
      const mockCpu = `cpu  ${usage * 1000} 34 2290 ${(100 - usage) * 1000} 6290 127 456 0 0 0`;
      const mockMemory = `              total        used        free      shared  buff/cache   available
Mem:          16384       ${Math.floor(16384 * usage / 100)}        ${Math.floor(16384 * (100 - usage) / 100)}         512        1024        2048`;

      mockPlatformAdapter.executeCommand
        .mockResolvedValueOnce(mockCpu)
        .mockResolvedValueOnce(mockMemory)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);

      await detector.detectAll();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const prediction = detector.predictResourceExhaustion();

    expect(prediction.cpu.willExhaust).toBe(true);
    expect(prediction.cpu.timeToExhaustion).toBeLessThan(3600000); // Less than 1 hour
    expect(prediction.memory.willExhaust).toBe(true);
  });

  it('should recommend preventive actions', async () => {
    // Set up high resource usage
    const highUsage = `              total        used        free      shared  buff/cache   available
Mem:          16384       14745         819         512         819        1024`;

    mockPlatformAdapter.executeCommand
      .mockResolvedValueOnce(MOCK_RESPONSES.linux.cpu)
      .mockResolvedValueOnce(highUsage)
      .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
      .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);

    await detector.detectAll();

    const recommendations = detector.getResourceRecommendations();

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: 'memory',
        action: 'reduce_agent_count',
        urgency: 'high'
      })
    );
  });

  it('should implement resource throttling', async () => {
    const throttler = detector.getResourceThrottler();

    // Configure throttling rules
    throttler.addRule({
      resource: 'cpu',
      threshold: 80,
      action: 'limit_new_agents'
    });

    throttler.addRule({
      resource: 'memory',
      threshold: 85,
      action: 'pause_deployments'
    });

    // Simulate high CPU usage
    const highCpu = `cpu  80000 34 2290 20000 6290 127 456 0 0 0`;
    mockPlatformAdapter.executeCommand
      .mockResolvedValueOnce(highCpu)
      .mockResolvedValueOnce(MOCK_RESPONSES.linux.memory)
      .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
      .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);

    await detector.detectAll();

    const actions = throttler.getRequiredActions();
    expect(actions).toContain('limit_new_agents');
  });
});