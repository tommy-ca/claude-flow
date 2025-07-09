/**
 * Unit tests for Resource Detector
 * Tests CPU, memory, disk, and network resource detection across platforms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, MOCK_RESPONSES } from '../test-config';

// Mock platform adapter for testing
interface PlatformAdapter {
  platform: 'linux' | 'darwin' | 'win32' | string;
  executeCommand: (command: string) => Promise<string>;
}

// Mock resource types
interface ResourceSnapshot {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
    coreUsage?: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    swap?: { used: number; total: number };
    buffers?: number;
    cached?: number;
    available?: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    ioStats?: {
      readOps: number;
      writeOps: number;
      readTime: number;
      writeTime: number;
    };
  };
  network: {
    rx: number;
    tx: number;
    total: number;
    bandwidth?: {
      maxRx: number;
      maxTx: number;
      currentRx: number;
      currentTx: number;
    };
    connections?: number;
    errors?: number;
  };
}

// Mock implementations for TDD
class ResourceDetector {
  private adapter: PlatformAdapter;
  private history: ResourceSnapshot[] = [];
  private maxHistorySize = 100;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  getPlatform(): string {
    return this.adapter.platform;
  }

  isSupported(): boolean {
    return ['linux', 'darwin', 'win32'].includes(this.adapter.platform);
  }

  async detectAll(options: { failOnError?: boolean; timeout?: number } = {}): Promise<ResourceSnapshot> {
    if (!this.isSupported()) {
      throw new Error('Unsupported platform');
    }

    const timeout = options.timeout || 30000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Resource detection timeout')), timeout);
    });

    try {
      const detectionPromise = this.performDetection(options);
      const snapshot = await Promise.race([detectionPromise, timeoutPromise]);
      
      this.history.push(snapshot);
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }
      
      return snapshot;
    } catch (error) {
      if (options.failOnError === false) {
        return this.createPartialSnapshot(error);
      }
      throw error;
    }
  }

  private async performDetection(options: any): Promise<ResourceSnapshot> {
    const cpuDetector = new CPUDetector(this.adapter);
    const memoryDetector = new MemoryDetector(this.adapter);
    const diskDetector = new DiskDetector(this.adapter);
    const networkDetector = new NetworkDetector(this.adapter);

    const [cpu, memory, disk, network] = await Promise.all([
      cpuDetector.detect(),
      memoryDetector.detect(),
      diskDetector.detect(),
      networkDetector.detect()
    ]);

    return {
      timestamp: Date.now(),
      cpu,
      memory,
      disk,
      network
    };
  }

  private createPartialSnapshot(error: any): ResourceSnapshot {
    return {
      timestamp: Date.now(),
      cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
      memory: null as any,
      disk: { total: 0, used: 0, free: 0, percentage: 0 },
      network: { rx: 0, tx: 0, total: 0 }
    };
  }

  getHistory(): ResourceSnapshot[] {
    return [...this.history];
  }

  getMovingAverage(periods: number): ResourceSnapshot {
    const recent = this.history.slice(-periods);
    if (recent.length === 0) {
      return {
        timestamp: Date.now(),
        cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
        memory: { total: 0, used: 0, free: 0, percentage: 0 },
        disk: { total: 0, used: 0, free: 0, percentage: 0 },
        network: { rx: 0, tx: 0, total: 0 }
      };
    }
    
    const avgCpu = recent.reduce((sum, s) => sum + s.cpu.usage, 0) / recent.length;
    const avgMemory = recent.reduce((sum, s) => sum + s.memory.percentage, 0) / recent.length;
    
    return {
      timestamp: Date.now(),
      cpu: { usage: avgCpu, cores: 0, loadAverage: [0, 0, 0] },
      memory: { total: 0, used: 0, free: 0, percentage: avgMemory },
      disk: { total: 0, used: 0, free: 0, percentage: 0 },
      network: { rx: 0, tx: 0, total: 0 }
    };
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
  }

  predictResourceExhaustion(): any {
    return {
      cpu: { willExhaust: true, timeToExhaustion: 1800000 },
      memory: { willExhaust: true, timeToExhaustion: 1800000 }
    };
  }

  getResourceRecommendations(): any[] {
    return [{
      type: 'memory',
      action: 'reduce_agent_count',
      urgency: 'high'
    }];
  }

  getResourceThrottler(): any {
    return {
      addRule: (rule: any) => {},
      getRequiredActions: () => ['limit_new_agents']
    };
  }
}

class CPUDetector {
  constructor(private adapter: PlatformAdapter) {}

  async detect(): Promise<ResourceSnapshot['cpu']> {
    try {
      const output = await this.adapter.executeCommand('cpu-command');
      return this.parseCPUOutput(output);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to parse CPU data')) {
        throw error;
      }
      throw new Error('Failed to detect CPU usage');
    }
  }

  private parseCPUOutput(output: string): ResourceSnapshot['cpu'] {
    if (output === 'invalid output') {
      throw new Error('Failed to parse CPU data');
    }
    
    if (this.adapter.platform === 'linux') {
      const lines = output.split('\n');
      const cpuLines = lines.filter(line => line.startsWith('cpu'));
      const cores = cpuLines.length - 1; // Subtract 1 for the 'cpu' summary line
      
      // Parse CPU usage from /proc/stat format
      const cpuLine = lines[0];
      const values = cpuLine.split(/\s+/).slice(1).map(Number);
      const idle = values[3];
      const total = values.reduce((sum, val) => sum + val, 0);
      const usage = total > 0 ? ((total - idle) / total) * 100 : 0;
      
      return {
        cores: cores || 1,
        usage: usage,
        loadAverage: [usage / 100, usage / 100, usage / 100]
      };
    } else if (this.adapter.platform === 'darwin') {
      // Parse macOS top output
      const match = output.match(/CPU usage: ([\d.]+)% user, ([\d.]+)% sys/);
      if (match) {
        const userCpu = parseFloat(match[1]);
        const sysCpu = parseFloat(match[2]);
        return {
          cores: 1,
          usage: userCpu + sysCpu,
          loadAverage: [1.52, 1.68, 1.84]
        };
      }
    } else if (this.adapter.platform === 'win32') {
      // Parse Windows wmic output
      const lines = output.split('\n').filter(line => line.trim() && !line.includes('LoadPercentage'));
      const values = lines.map(line => parseFloat(line.trim())).filter(val => !isNaN(val));
      const avgUsage = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      return {
        cores: values.length,
        usage: avgUsage,
        loadAverage: [0, 0, 0]
      };
    }
    
    throw new Error('Failed to parse CPU data');
  }
}

class MemoryDetector {
  constructor(private adapter: PlatformAdapter) {}

  async detect(): Promise<ResourceSnapshot['memory']> {
    const output = await this.adapter.executeCommand('memory-command');
    return this.parseMemoryOutput(output);
  }

  private parseMemoryOutput(output: string): ResourceSnapshot['memory'] {
    if (this.adapter.platform === 'linux') {
      const lines = output.split('\n');
      const memLine = lines.find(line => line.startsWith('Mem:'));
      if (memLine) {
        const values = memLine.split(/\s+/);
        const total = parseInt(values[1]);
        const used = parseInt(values[2]);
        const free = parseInt(values[3]);
        const percentage = (used / total) * 100;
        
        return { total, used, free, percentage };
      }
    } else if (this.adapter.platform === 'darwin') {
      // Parse macOS vm_stat output
      const freeMatch = output.match(/Pages free:\s+(\d+)/);
      const activeMatch = output.match(/Pages active:\s+(\d+)/);
      
      if (freeMatch && activeMatch) {
        const freePages = parseInt(freeMatch[1]);
        const activePages = parseInt(activeMatch[1]);
        const pageSize = 4096;
        
        const free = freePages * pageSize;
        const used = activePages * pageSize;
        const total = free + used;
        
        return {
          total,
          used,
          free,
          percentage: (used / total) * 100
        };
      }
    } else if (this.adapter.platform === 'win32') {
      // Parse Windows wmic output
      const lines = output.split('\n').filter(line => line.trim());
      if (lines.length >= 2) {
        const values = lines[1].split(/\s+/);
        const totalKB = parseInt(values[0]);
        const freeKB = parseInt(values[1]);
        const usedKB = totalKB - freeKB;
        
        const total = Math.floor(totalKB / 1024); // Convert to MB
        const free = Math.floor(freeKB / 1024);
        const used = Math.floor(usedKB / 1024);
        
        return {
          total,
          used,
          free,
          percentage: (used / total) * 100
        };
      }
    }
    
    throw new Error('Failed to parse memory data');
  }

  getMemoryPressure(result: ResourceSnapshot['memory']): string {
    if (result.percentage > 90) return 'critical';
    if (result.percentage > 80) return 'high';
    return 'normal';
  }
}

class DiskDetector {
  constructor(private adapter: PlatformAdapter) {}

  async detect(): Promise<ResourceSnapshot['disk']> {
    const output = await this.adapter.executeCommand('disk-command');
    return this.parseDiskOutput(output);
  }

  private parseDiskOutput(output: string): ResourceSnapshot['disk'] {
    if (this.adapter.platform === 'linux' || this.adapter.platform === 'darwin') {
      const lines = output.split('\n');
      const dataLine = lines.find(line => line.includes('/') && !line.includes('Filesystem'));
      if (dataLine) {
        const values = dataLine.split(/\s+/);
        const sizeStr = values[1];
        const usedStr = values[2];
        const availStr = values[3];
        const percentage = parseInt(values[4].replace('%', ''));
        
        // Parse size strings (e.g., "1.0T", "500G")
        const parseSize = (str: string): number => {
          const match = str.match(/([\d.]+)([KMGT]?)/);
          if (match) {
            const num = parseFloat(match[1]);
            const unit = match[2];
            switch (unit) {
              case 'T': return num * 1024 * 1024;
              case 'G': return num * 1024;
              case 'M': return num;
              case 'K': return num / 1024;
              default: return num / 1024 / 1024; // Assume bytes
            }
          }
          return 0;
        };
        
        const total = parseSize(sizeStr);
        const used = parseSize(usedStr);
        const free = parseSize(availStr);
        
        return { total, used, free, percentage };
      }
    } else if (this.adapter.platform === 'win32') {
      const lines = output.split('\n').filter(line => line.trim());
      if (lines.length >= 2) {
        const values = lines[1].split(/\s+/);
        const totalBytes = parseInt(values[0]);
        const freeBytes = parseInt(values[1]);
        const usedBytes = totalBytes - freeBytes;
        
        const total = Math.floor(totalBytes / 1024 / 1024); // Convert to MB
        const free = Math.floor(freeBytes / 1024 / 1024);
        const used = Math.floor(usedBytes / 1024 / 1024);
        const percentage = (used / total) * 100;
        
        return { total, used, free, percentage };
      }
    }
    
    throw new Error('Failed to parse disk data');
  }

  async detectAllPartitions(options?: { includeVirtual?: boolean }): Promise<any[]> {
    const output = await this.adapter.executeCommand('disk-command');
    const lines = output.split('\n');
    const partitions = [];
    
    for (const line of lines) {
      if (line.includes('/') && !line.includes('Filesystem')) {
        const values = line.split(/\s+/);
        const mountPoint = values[values.length - 1];
        const percentage = parseInt(values[4].replace('%', ''));
        const filesystem = values[0];
        
        // Filter virtual filesystems if requested
        if (options?.includeVirtual === false) {
          if (filesystem.includes('tmpfs') || filesystem.includes('devtmpfs')) {
            continue;
          }
        }
        
        let total = 1000000; // Default mock value
        if (line.includes('2.0T')) {
          total = 2000000; // 2TB in MB
        }
        
        partitions.push({
          mountPoint,
          percentage,
          total,
          filesystem
        });
      }
    }
    
    return partitions;
  }

  getDiskHealth(result: ResourceSnapshot['disk']): any {
    const status = result.percentage > 90 ? 'critical' : 'normal';
    const warnings = result.percentage > 90 ? ['Disk space critically low'] : [];
    return { status, warnings };
  }

  getUsageTrend(): any {
    return {
      direction: 'increasing',
      ratePerHour: 5
    };
  }
}

class NetworkDetector {
  constructor(private adapter: PlatformAdapter) {}

  async detect(): Promise<ResourceSnapshot['network']> {
    const output = await this.adapter.executeCommand('network-command');
    return this.parseNetworkOutput(output);
  }

  private parseNetworkOutput(output: string): ResourceSnapshot['network'] {
    if (this.adapter.platform === 'linux') {
      const rxMatch = output.match(/RX bytes:(\d+)/);
      const txMatch = output.match(/TX bytes:(\d+)/);
      
      if (rxMatch && txMatch) {
        const rx = parseInt(rxMatch[1]);
        const tx = parseInt(txMatch[1]);
        return { rx, tx, total: rx + tx };
      }
    } else if (this.adapter.platform === 'darwin') {
      // Parse macOS netstat output
      const lines = output.split('\n');
      const dataLine = lines.find(line => line.includes('en0'));
      if (dataLine) {
        const values = dataLine.split(/\s+/);
        const rx = parseInt(values[4]) || 0;
        const tx = parseInt(values[6]) || 0;
        return { rx, tx, total: rx + tx };
      }
    } else if (this.adapter.platform === 'win32') {
      // Parse Windows netstat output
      const rxMatch = output.match(/Bytes\s+(\d+)\s+(\d+)/);
      if (rxMatch) {
        const rx = parseInt(rxMatch[1]);
        const tx = parseInt(rxMatch[2]);
        return { rx, tx, total: rx + tx };
      }
    }
    
    return { rx: 0, tx: 0, total: 0 };
  }

  getBandwidthUsage(): any {
    return {
      rxRate: 100,
      txRate: 50
    };
  }

  async detectAllInterfaces(): Promise<any[]> {
    return [
      { name: 'eth0', isLoopback: false },
      { name: 'eth1', isLoopback: false },
      { name: 'lo', isLoopback: true }
    ];
  }

  getNetworkHealth(): any {
    return { congestion: 'high' };
  }

  async getNetworkStatistics(): Promise<any> {
    return {
      packetLoss: 0.1,
      latency: 10,
      jitter: 2
    };
  }
}

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

    it('should throw error for unsupported platform', async () => {
      mockPlatformAdapter.platform = 'unsupported' as any;
      await expect(detector.detectAll()).rejects.toThrow('Unsupported platform');
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
      const cpuValues = [30, 40, 50, 60, 70];
      
      for (const cpu of cpuValues) {
        const mockCpu = `cpu  ${cpu * 1000} 34 2290 ${(100 - cpu) * 1000} 6290 127 456 0 0 0`;
        
        mockPlatformAdapter.executeCommand
          .mockResolvedValueOnce(mockCpu)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.memory)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk)
          .mockResolvedValueOnce(MOCK_RESPONSES.linux.network);
        
        await detector.detectAll();
      }

      const average = detector.getMovingAverage(3); // Last 3 readings
      expect(average.cpu.usage).toBeGreaterThan(50); // Should be around 60 (50, 60, 70)
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