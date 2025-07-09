/**
 * Simple Resource Detector Test - JavaScript version
 * Tests basic resource detection functionality without external dependencies
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock systeminformation and node-os-utils
jest.mock('systeminformation', () => ({
  cpu: jest.fn().mockResolvedValue({
    manufacturer: 'Test',
    brand: 'Test CPU',
    cores: 4,
    physicalCores: 4,
    speed: 2.5,
    speedMax: 3.2,
    speedMin: 0.8
  }),
  mem: jest.fn().mockResolvedValue({
    total: 16777216000,
    available: 8388608000,
    used: 8388608000,
    active: 4194304000,
    free: 4194304000
  }),
  fsSize: jest.fn().mockResolvedValue([{
    fs: '/dev/sda1',
    type: 'ext4',
    size: 1000000000000,
    used: 500000000000,
    available: 500000000000,
    use: 50.0,
    mount: '/'
  }]),
  networkInterfaces: jest.fn().mockResolvedValue([{
    iface: 'eth0',
    ifaceName: 'Ethernet',
    ip4: '192.168.1.100',
    ip6: '::1',
    mac: '00:11:22:33:44:55',
    internal: false,
    virtual: false,
    operstate: 'up',
    type: 'wired',
    duplex: 'full',
    mtu: 1500,
    speed: 1000,
    dhcp: true,
    dnsSuffix: 'local'
  }])
}));

jest.mock('node-os-utils', () => ({
  cpu: {
    usage: jest.fn().mockResolvedValue(45.5),
    count: jest.fn().mockReturnValue(4),
    model: jest.fn().mockReturnValue('Test CPU'),
    loadavg: jest.fn().mockReturnValue([0.5, 0.8, 1.2])
  },
  mem: {
    info: jest.fn().mockResolvedValue({
      totalMemMb: 16384,
      usedMemMb: 8192,
      freeMemMb: 8192,
      freeMemPercentage: 50.0
    })
  },
  netstat: {
    stats: jest.fn().mockResolvedValue([{
      interface: 'eth0',
      inputMb: 1024,
      outputMb: 512
    }])
  }
}));

// Simple ResourceDetector implementation for testing
class SimpleResourceDetector {
  constructor() {
    this.initialized = false;
    this.platform = process.platform;
  }

  async initialize() {
    this.initialized = true;
    return true;
  }

  async shutdown() {
    this.initialized = false;
    return true;
  }

  isInitialized() {
    return this.initialized;
  }

  async getCPUInfo() {
    if (!this.initialized) {
      throw new Error('ResourceDetector not initialized');
    }

    const si = require('systeminformation');
    const osUtils = require('node-os-utils');
    
    const [cpuInfo, cpuUsage] = await Promise.all([
      si.cpu(),
      osUtils.cpu.usage()
    ]);

    return {
      cores: cpuInfo.cores,
      physicalCores: cpuInfo.physicalCores,
      manufacturer: cpuInfo.manufacturer,
      brand: cpuInfo.brand,
      speed: cpuInfo.speed,
      usage: cpuUsage,
      available: cpuInfo.cores * (1 - cpuUsage / 100)
    };
  }

  async getMemoryInfo() {
    if (!this.initialized) {
      throw new Error('ResourceDetector not initialized');
    }

    const si = require('systeminformation');
    const memInfo = await si.mem();

    return {
      total: memInfo.total,
      used: memInfo.used,
      available: memInfo.available,
      usage: (memInfo.used / memInfo.total) * 100,
      free: memInfo.free || (memInfo.total - memInfo.used)
    };
  }

  async getDiskInfo() {
    if (!this.initialized) {
      throw new Error('ResourceDetector not initialized');
    }

    const si = require('systeminformation');
    const fsInfo = await si.fsSize();

    return fsInfo.map(fs => ({
      filesystem: fs.fs,
      type: fs.type,
      size: fs.size,
      used: fs.used,
      available: fs.available,
      usage: fs.use,
      mount: fs.mount
    }));
  }

  async getNetworkInfo() {
    if (!this.initialized) {
      throw new Error('ResourceDetector not initialized');
    }

    const si = require('systeminformation');
    const interfaces = await si.networkInterfaces();

    return interfaces.map(iface => ({
      name: iface.iface,
      displayName: iface.ifaceName,
      ip4: iface.ip4,
      ip6: iface.ip6,
      mac: iface.mac,
      internal: iface.internal,
      virtual: iface.virtual,
      operstate: iface.operstate,
      type: iface.type,
      speed: iface.speed,
      mtu: iface.mtu
    }));
  }

  async getResourceMetrics() {
    if (!this.initialized) {
      throw new Error('ResourceDetector not initialized');
    }

    const [cpu, memory, disk, network] = await Promise.all([
      this.getCPUInfo(),
      this.getMemoryInfo(),
      this.getDiskInfo(),
      this.getNetworkInfo()
    ]);

    return {
      timestamp: Date.now(),
      cpu,
      memory,
      disk,
      network,
      platform: this.platform
    };
  }
}

describe('Resource Detector - Simple Tests', () => {
  let detector;

  beforeEach(() => {
    detector = new SimpleResourceDetector();
  });

  afterEach(async () => {
    if (detector && detector.isInitialized()) {
      await detector.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(detector.isInitialized()).toBe(false);
      
      const result = await detector.initialize();
      
      expect(result).toBe(true);
      expect(detector.isInitialized()).toBe(true);
    });

    test('should shutdown successfully', async () => {
      await detector.initialize();
      expect(detector.isInitialized()).toBe(true);
      
      const result = await detector.shutdown();
      
      expect(result).toBe(true);
      expect(detector.isInitialized()).toBe(false);
    });
  });

  describe('CPU Detection', () => {
    test('should detect CPU information', async () => {
      await detector.initialize();
      
      const cpuInfo = await detector.getCPUInfo();
      
      expect(cpuInfo).toHaveProperty('cores');
      expect(cpuInfo).toHaveProperty('physicalCores');
      expect(cpuInfo).toHaveProperty('manufacturer');
      expect(cpuInfo).toHaveProperty('brand');
      expect(cpuInfo).toHaveProperty('usage');
      expect(cpuInfo).toHaveProperty('available');
      
      expect(cpuInfo.cores).toBe(4);
      expect(cpuInfo.physicalCores).toBe(4);
      expect(cpuInfo.manufacturer).toBe('Test');
      expect(cpuInfo.brand).toBe('Test CPU');
      expect(cpuInfo.usage).toBe(45.5);
      expect(cpuInfo.available).toBeCloseTo(2.18, 1);
    });

    test('should fail CPU detection when not initialized', async () => {
      await expect(detector.getCPUInfo()).rejects.toThrow('ResourceDetector not initialized');
    });
  });

  describe('Memory Detection', () => {
    test('should detect memory information', async () => {
      await detector.initialize();
      
      const memInfo = await detector.getMemoryInfo();
      
      expect(memInfo).toHaveProperty('total');
      expect(memInfo).toHaveProperty('used');
      expect(memInfo).toHaveProperty('available');
      expect(memInfo).toHaveProperty('usage');
      expect(memInfo).toHaveProperty('free');
      
      expect(memInfo.total).toBe(16777216000);
      expect(memInfo.used).toBe(8388608000);
      expect(memInfo.available).toBe(8388608000);
      expect(memInfo.usage).toBe(50);
    });

    test('should fail memory detection when not initialized', async () => {
      await expect(detector.getMemoryInfo()).rejects.toThrow('ResourceDetector not initialized');
    });
  });

  describe('Disk Detection', () => {
    test('should detect disk information', async () => {
      await detector.initialize();
      
      const diskInfo = await detector.getDiskInfo();
      
      expect(Array.isArray(diskInfo)).toBe(true);
      expect(diskInfo.length).toBe(1);
      
      const disk = diskInfo[0];
      expect(disk).toHaveProperty('filesystem');
      expect(disk).toHaveProperty('type');
      expect(disk).toHaveProperty('size');
      expect(disk).toHaveProperty('used');
      expect(disk).toHaveProperty('available');
      expect(disk).toHaveProperty('usage');
      expect(disk).toHaveProperty('mount');
      
      expect(disk.filesystem).toBe('/dev/sda1');
      expect(disk.type).toBe('ext4');
      expect(disk.size).toBe(1000000000000);
      expect(disk.used).toBe(500000000000);
      expect(disk.available).toBe(500000000000);
      expect(disk.usage).toBe(50.0);
      expect(disk.mount).toBe('/');
    });

    test('should fail disk detection when not initialized', async () => {
      await expect(detector.getDiskInfo()).rejects.toThrow('ResourceDetector not initialized');
    });
  });

  describe('Network Detection', () => {
    test('should detect network information', async () => {
      await detector.initialize();
      
      const networkInfo = await detector.getNetworkInfo();
      
      expect(Array.isArray(networkInfo)).toBe(true);
      expect(networkInfo.length).toBe(1);
      
      const iface = networkInfo[0];
      expect(iface).toHaveProperty('name');
      expect(iface).toHaveProperty('displayName');
      expect(iface).toHaveProperty('ip4');
      expect(iface).toHaveProperty('mac');
      expect(iface).toHaveProperty('operstate');
      expect(iface).toHaveProperty('type');
      expect(iface).toHaveProperty('speed');
      
      expect(iface.name).toBe('eth0');
      expect(iface.displayName).toBe('Ethernet');
      expect(iface.ip4).toBe('192.168.1.100');
      expect(iface.mac).toBe('00:11:22:33:44:55');
      expect(iface.operstate).toBe('up');
      expect(iface.type).toBe('wired');
      expect(iface.speed).toBe(1000);
    });

    test('should fail network detection when not initialized', async () => {
      await expect(detector.getNetworkInfo()).rejects.toThrow('ResourceDetector not initialized');
    });
  });

  describe('Complete Resource Metrics', () => {
    test('should get complete resource metrics', async () => {
      await detector.initialize();
      
      const metrics = await detector.getResourceMetrics();
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('disk');
      expect(metrics).toHaveProperty('network');
      expect(metrics).toHaveProperty('platform');
      
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.cpu.cores).toBe(4);
      expect(metrics.memory.total).toBe(16777216000);
      expect(Array.isArray(metrics.disk)).toBe(true);
      expect(Array.isArray(metrics.network)).toBe(true);
      expect(metrics.platform).toBe(process.platform);
    });

    test('should fail to get metrics when not initialized', async () => {
      await expect(detector.getResourceMetrics()).rejects.toThrow('ResourceDetector not initialized');
    });
  });

  describe('Error Handling', () => {
    test('should handle CPU detection errors gracefully', async () => {
      await detector.initialize();
      
      // Mock a failure
      const si = require('systeminformation');
      si.cpu.mockRejectedValueOnce(new Error('CPU detection failed'));
      
      await expect(detector.getCPUInfo()).rejects.toThrow('CPU detection failed');
    });

    test('should handle memory detection errors gracefully', async () => {
      await detector.initialize();
      
      // Mock a failure
      const si = require('systeminformation');
      si.mem.mockRejectedValueOnce(new Error('Memory detection failed'));
      
      await expect(detector.getMemoryInfo()).rejects.toThrow('Memory detection failed');
    });
  });
});