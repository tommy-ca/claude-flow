/**
 * Resource Detector Tests
 */

import { ResourceDetector, resourceDetector } from '../monitors/resource-detector';

describe('ResourceDetector', () => {
  let detector: ResourceDetector;

  beforeEach(() => {
    detector = ResourceDetector.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = ResourceDetector.getInstance();
      const instance2 = ResourceDetector.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(resourceDetector).toBe(ResourceDetector.getInstance());
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(detector.initialize()).resolves.not.toThrow();
    });
  });

  describe('CPU detection', () => {
    it('should detect CPU resources', async () => {
      await detector.initialize();
      const cpu = await detector.detectCPU();

      expect(cpu).toBeDefined();
      expect(cpu.type).toBe('cpu');
      expect(cpu.id).toMatch(/^cpu-/);
      expect(cpu.cores).toBeGreaterThan(0);
      expect(cpu.threads).toBeGreaterThan(0);
      expect(cpu.usage).toBeGreaterThanOrEqual(0);
      expect(cpu.usage).toBeLessThanOrEqual(100);
      expect(cpu.frequency).toBeDefined();
      expect(cpu.frequency.current).toBeGreaterThan(0);
      expect(cpu.loadAverage).toBeDefined();
      expect(cpu.lastUpdated).toBeInstanceOf(Date);
    });

    it('should include CPU metadata', async () => {
      await detector.initialize();
      const cpu = await detector.detectCPU();

      expect(cpu.metadata).toBeDefined();
      expect(cpu.name).toBeDefined();
      expect(cpu.status).toMatch(/^(available|allocated|reserved|exhausted|error)$/);
    });
  });

  describe('Memory detection', () => {
    it('should detect memory resources', async () => {
      await detector.initialize();
      const memory = await detector.detectMemory();

      expect(memory).toBeDefined();
      expect(memory.type).toBe('memory');
      expect(memory.id).toMatch(/^memory-/);
      expect(memory.total).toBeGreaterThan(0);
      expect(memory.free).toBeGreaterThanOrEqual(0);
      expect(memory.used).toBeGreaterThanOrEqual(0);
      expect(memory.total).toBe(memory.free + memory.used);
      expect(memory.unit).toBe('bytes');
      expect(memory.lastUpdated).toBeInstanceOf(Date);
    });

    it('should include swap information', async () => {
      await detector.initialize();
      const memory = await detector.detectMemory();

      expect(memory.swapTotal).toBeDefined();
      expect(memory.swapUsed).toBeDefined();
      expect(memory.swapFree).toBeDefined();
    });
  });

  describe('Disk detection', () => {
    it('should detect disk resources', async () => {
      await detector.initialize();
      const disks = await detector.detectDisks();

      expect(disks).toBeInstanceOf(Array);
      expect(disks.length).toBeGreaterThan(0);

      const disk = disks[0];
      expect(disk.type).toBe('disk');
      expect(disk.id).toMatch(/^disk-/);
      expect(disk.total).toBeGreaterThan(0);
      expect(disk.free).toBeGreaterThanOrEqual(0);
      expect(disk.used).toBeGreaterThanOrEqual(0);
      expect(disk.path).toBeDefined();
      expect(disk.filesystem).toBeDefined();
      expect(disk.mount).toBeDefined();
      expect(disk.unit).toBe('bytes');
      expect(disk.lastUpdated).toBeInstanceOf(Date);
    });

    it('should filter virtual filesystems', async () => {
      await detector.initialize();
      const disks = await detector.detectDisks();

      // Should not include snap mounts or overlay filesystems
      const snapMounts = disks.filter(d => d.mount.startsWith('/snap'));
      const overlayFS = disks.filter(d => d.filesystem === 'overlay');

      expect(snapMounts).toHaveLength(0);
      expect(overlayFS).toHaveLength(0);
    });
  });

  describe('Network detection', () => {
    it('should detect network resources', async () => {
      await detector.initialize();
      const networks = await detector.detectNetworks();

      expect(networks).toBeInstanceOf(Array);

      if (networks.length > 0) {
        const network = networks[0];
        expect(network.type).toBe('network');
        expect(network.id).toMatch(/^network-/);
        expect(network.interface).toBeDefined();
        expect(network.ip4).toBeDefined();
        expect(network.rx).toBeDefined();
        expect(network.tx).toBeDefined();
        expect(network.unit).toBe('mbps');
        expect(network.lastUpdated).toBeInstanceOf(Date);
      }
    });

    it('should filter loopback and virtual interfaces', async () => {
      await detector.initialize();
      const networks = await detector.detectNetworks();

      // Should not include loopback interfaces
      const loopbacks = networks.filter(n => n.interface === 'lo');
      expect(loopbacks).toHaveLength(0);
    });
  });

  describe('GPU detection', () => {
    it('should detect GPU resources or return empty array', async () => {
      await detector.initialize();
      const gpus = await detector.detectGPUs();

      expect(gpus).toBeInstanceOf(Array);

      if (gpus.length > 0) {
        const gpu = gpus[0];
        expect(gpu.type).toBe('gpu');
        expect(gpu.id).toMatch(/^gpu-/);
        expect(gpu.vendor).toBeDefined();
        expect(gpu.model).toBeDefined();
        expect(gpu.vram).toBeDefined();
        expect(gpu.vram.total).toBeGreaterThanOrEqual(0);
        expect(gpu.utilization).toBeDefined();
        expect(gpu.unit).toBe('MB');
        expect(gpu.lastUpdated).toBeInstanceOf(Date);
      }
    });
  });

  describe('Comprehensive detection', () => {
    it('should detect all resources', async () => {
      await detector.initialize();
      const resources = await detector.detectAll();

      expect(resources).toBeInstanceOf(Array);
      expect(resources.length).toBeGreaterThan(0);

      // Should have at least CPU and memory
      const cpuResources = resources.filter(r => r.type === 'cpu');
      const memoryResources = resources.filter(r => r.type === 'memory');

      expect(cpuResources).toHaveLength(1);
      expect(memoryResources).toHaveLength(1);

      // All resources should have required fields
      resources.forEach(resource => {
        expect(resource.id).toBeDefined();
        expect(resource.type).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.capacity).toBeGreaterThanOrEqual(0);
        expect(resource.available).toBeGreaterThanOrEqual(0);
        expect(resource.status).toMatch(/^(available|allocated|reserved|exhausted|error)$/);
        expect(resource.lastUpdated).toBeInstanceOf(Date);
      });
    });

    it('should handle detection errors gracefully', async () => {
      // This test depends on the environment and might not always fail
      // But it ensures the error handling is in place
      await expect(detector.detectAll()).resolves.not.toThrow();
    });
  });

  describe('System information', () => {
    it('should get system information', async () => {
      await detector.initialize();
      const systemInfo = await detector.getSystemInfo();

      expect(systemInfo).toBeDefined();
      expect(systemInfo.platform).toBeDefined();
      expect(systemInfo.arch).toBeDefined();
      expect(systemInfo.hostname).toBeDefined();
      expect(systemInfo.uptime).toBeGreaterThan(0);
    });
  });

  describe('Resource status determination', () => {
    it('should determine correct resource status', async () => {
      await detector.initialize();
      const cpu = await detector.detectCPU();

      // Status should be based on usage
      if (cpu.usage >= 95) {
        expect(cpu.status).toBe('exhausted');
      } else if (cpu.usage >= 85) {
        expect(cpu.status).toBe('reserved');
      } else if (cpu.usage >= 70) {
        expect(cpu.status).toBe('allocated');
      } else {
        expect(cpu.status).toBe('available');
      }
    });
  });
});
