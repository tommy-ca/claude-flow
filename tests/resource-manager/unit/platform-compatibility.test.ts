/**
 * Unit tests for Platform Compatibility
 * Tests cross-platform resource detection and management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, MOCK_RESPONSES } from '../test-config';

// These imports will fail initially (TDD approach)
import {
  PlatformCompatibility,
  PlatformDetector,
  PlatformAdapter,
  CommandExecutor,
  ResourceParser,
  PlatformCapabilities,
  SystemInfo,
  CompatibilityLayer
} from '../../../src/resource-manager/utils/platform-compatibility';

describe('PlatformCompatibility', () => {
  let compatibility: PlatformCompatibility;
  let mockExecutor: CommandExecutor;

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn(),
      isCommandAvailable: vi.fn().mockResolvedValue(true),
      getCommandPath: vi.fn().mockResolvedValue('/usr/bin/test')
    };
    
    compatibility = new PlatformCompatibility(mockExecutor);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform Detection', () => {
    it('should detect Linux platform correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: false
      });

      const platform = compatibility.detectPlatform();

      expect(platform).toMatchObject({
        name: 'linux',
        version: expect.any(String),
        arch: expect.any(String),
        distro: expect.any(String)
      });
    });

    it('should detect macOS platform correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: false
      });

      const platform = compatibility.detectPlatform();

      expect(platform).toMatchObject({
        name: 'darwin',
        version: expect.any(String),
        arch: expect.any(String),
        codename: expect.any(String)
      });
    });

    it('should detect Windows platform correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: false
      });

      const platform = compatibility.detectPlatform();

      expect(platform).toMatchObject({
        name: 'win32',
        version: expect.any(String),
        arch: expect.any(String),
        edition: expect.any(String)
      });
    });

    it('should detect system capabilities', async () => {
      const capabilities = await compatibility.detectCapabilities();

      expect(capabilities).toMatchObject({
        hasSystemMonitoring: expect.any(Boolean),
        hasProcessManagement: expect.any(Boolean),
        hasNetworkMonitoring: expect.any(Boolean),
        hasContainerSupport: expect.any(Boolean),
        supportedCommands: expect.any(Array),
        limitations: expect.any(Array)
      });
    });

    it('should handle unsupported platform gracefully', () => {
      Object.defineProperty(process, 'platform', {
        value: 'unsupported',
        writable: false
      });

      expect(() => compatibility.detectPlatform())
        .toThrow('Unsupported platform: unsupported');
    });
  });

  describe('Linux Platform Support', () => {
    let linuxAdapter: PlatformAdapter;

    beforeEach(() => {
      linuxAdapter = compatibility.getAdapter('linux');
    });

    it('should detect CPU usage on Linux', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.linux.cpu);

      const cpuUsage = await linuxAdapter.getCPUUsage();

      expect(cpuUsage).toMatchObject({
        usage: expect.any(Number),
        cores: expect.any(Number),
        loadAverage: expect.arrayContaining([
          expect.any(Number),
          expect.any(Number),
          expect.any(Number)
        ])
      });
    });

    it('should detect memory usage on Linux', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.linux.memory);

      const memoryUsage = await linuxAdapter.getMemoryUsage();

      expect(memoryUsage).toMatchObject({
        total: 16384,
        used: 8192,
        free: 4096,
        available: 7680,
        buffers: 4096,
        cached: 4096
      });
    });

    it('should detect disk usage on Linux', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.linux.disk);

      const diskUsage = await linuxAdapter.getDiskUsage();

      expect(diskUsage).toMatchObject({
        filesystem: '/dev/sda1',
        total: expect.any(Number),
        used: expect.any(Number),
        free: expect.any(Number),
        percentage: 50,
        mountPoint: '/'
      });
    });

    it('should detect network usage on Linux', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.linux.network);

      const networkUsage = await linuxAdapter.getNetworkUsage();

      expect(networkUsage).toMatchObject({
        interfaces: expect.arrayContaining([
          expect.objectContaining({
            name: 'eth0',
            rx: expect.any(Number),
            tx: expect.any(Number)
          })
        ])
      });
    });

    it('should handle missing commands on Linux', async () => {
      mockExecutor.isCommandAvailable.mockResolvedValue(false);

      await expect(linuxAdapter.getCPUUsage())
        .rejects.toThrow('Required command not available');
    });

    it('should support different Linux distributions', async () => {
      const distributions = ['ubuntu', 'centos', 'debian', 'fedora'];

      for (const distro of distributions) {
        linuxAdapter.setDistribution(distro);
        
        const commands = linuxAdapter.getCommands();
        expect(commands).toHaveProperty('cpu');
        expect(commands).toHaveProperty('memory');
      }
    });

    it('should handle systemd vs init systems', async () => {
      // Test systemd
      mockExecutor.isCommandAvailable
        .mockResolvedValueOnce(true) // systemctl available
        .mockResolvedValueOnce(false); // service not available

      let serviceManager = await linuxAdapter.getServiceManager();
      expect(serviceManager.type).toBe('systemd');

      // Test init
      mockExecutor.isCommandAvailable
        .mockResolvedValueOnce(false) // systemctl not available
        .mockResolvedValueOnce(true); // service available

      serviceManager = await linuxAdapter.getServiceManager();
      expect(serviceManager.type).toBe('init');
    });
  });

  describe('macOS Platform Support', () => {
    let macosAdapter: PlatformAdapter;

    beforeEach(() => {
      macosAdapter = compatibility.getAdapter('darwin');
    });

    it('should detect CPU usage on macOS', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.darwin.cpu);

      const cpuUsage = await macosAdapter.getCPUUsage();

      expect(cpuUsage).toMatchObject({
        usage: expect.any(Number),
        cores: expect.any(Number),
        loadAverage: expect.arrayContaining([
          expect.any(Number),
          expect.any(Number),
          expect.any(Number)
        ])
      });
    });

    it('should detect memory usage on macOS', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.darwin.memory);

      const memoryUsage = await macosAdapter.getMemoryUsage();

      expect(memoryUsage).toMatchObject({
        total: expect.any(Number),
        used: expect.any(Number),
        free: expect.any(Number),
        wired: expect.any(Number),
        compressed: expect.any(Number)
      });
    });

    it('should detect disk usage on macOS', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.darwin.disk);

      const diskUsage = await macosAdapter.getDiskUsage();

      expect(diskUsage).toMatchObject({
        filesystem: '/dev/disk1s1',
        total: expect.any(Number),
        used: expect.any(Number),
        free: expect.any(Number),
        percentage: 50,
        mountPoint: '/'
      });
    });

    it('should handle macOS version differences', async () => {
      const versions = ['10.15', '11.0', '12.0', '13.0'];

      for (const version of versions) {
        macosAdapter.setVersion(version);
        
        const commands = macosAdapter.getCommands();
        expect(commands).toHaveProperty('cpu');
        
        // Some commands might differ between versions
        if (parseFloat(version) >= 11.0) {
          expect(commands.memory).toContain('vm_stat');
        }
      }
    });

    it('should support Apple Silicon and Intel architectures', async () => {
      // Test Apple Silicon
      macosAdapter.setArchitecture('arm64');
      let archCommands = macosAdapter.getArchSpecificCommands();
      expect(archCommands).toHaveProperty('performance');

      // Test Intel
      macosAdapter.setArchitecture('x64');
      archCommands = macosAdapter.getArchSpecificCommands();
      expect(archCommands).toHaveProperty('thermal');
    });

    it('should handle SIP (System Integrity Protection)', async () => {
      mockExecutor.execute.mockRejectedValue(new Error('Operation not permitted'));

      const fallbackResult = await macosAdapter.getCPUUsageWithFallback();
      
      expect(fallbackResult).toMatchObject({
        usage: expect.any(Number),
        method: 'fallback',
        limitations: expect.arrayContaining(['sip-restricted'])
      });
    });
  });

  describe('Windows Platform Support', () => {
    let windowsAdapter: PlatformAdapter;

    beforeEach(() => {
      windowsAdapter = compatibility.getAdapter('win32');
    });

    it('should detect CPU usage on Windows', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.win32.cpu);

      const cpuUsage = await windowsAdapter.getCPUUsage();

      expect(cpuUsage).toMatchObject({
        usage: 25,
        cores: expect.any(Number),
        processes: expect.any(Number)
      });
    });

    it('should detect memory usage on Windows', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.win32.memory);

      const memoryUsage = await windowsAdapter.getMemoryUsage();

      expect(memoryUsage).toMatchObject({
        total: 16384,
        used: 8192,
        free: 8192,
        committed: expect.any(Number),
        available: expect.any(Number)
      });
    });

    it('should detect disk usage on Windows', async () => {
      mockExecutor.execute.mockResolvedValue(MOCK_RESPONSES.win32.disk);

      const diskUsage = await windowsAdapter.getDiskUsage();

      expect(diskUsage).toMatchObject({
        drives: expect.arrayContaining([
          expect.objectContaining({
            letter: expect.any(String),
            total: expect.any(Number),
            free: expect.any(Number),
            percentage: expect.any(Number)
          })
        ])
      });
    });

    it('should handle PowerShell vs Command Prompt', async () => {
      // Test PowerShell available
      mockExecutor.isCommandAvailable
        .mockResolvedValueOnce(true); // powershell available

      let shell = await windowsAdapter.getPreferredShell();
      expect(shell.type).toBe('powershell');

      // Test Command Prompt fallback
      mockExecutor.isCommandAvailable
        .mockResolvedValueOnce(false) // powershell not available
        .mockResolvedValueOnce(true); // cmd available

      shell = await windowsAdapter.getPreferredShell();
      expect(shell.type).toBe('cmd');
    });

    it('should handle Windows version differences', async () => {
      const versions = ['10.0', '11.0', '2019', '2022'];

      for (const version of versions) {
        windowsAdapter.setVersion(version);
        
        const commands = windowsAdapter.getCommands();
        expect(commands).toHaveProperty('cpu');
        
        // Server versions might have different commands
        if (version.includes('20')) {
          expect(commands).toHaveProperty('perfmon');
        }
      }
    });

    it('should handle UAC (User Account Control) restrictions', async () => {
      mockExecutor.execute.mockRejectedValue(new Error('Access denied'));

      const result = await windowsAdapter.getCPUUsageWithElevation();
      
      expect(result).toMatchObject({
        usage: expect.any(Number),
        elevated: expect.any(Boolean),
        warnings: expect.arrayContaining(['uac-restricted'])
      });
    });

    it('should support WMI queries', async () => {
      const wmiQuery = 'SELECT * FROM Win32_Processor';
      mockExecutor.execute.mockResolvedValue(`
        LoadPercentage=25
        Name=Intel Core i7
        NumberOfCores=8
      `);

      const result = await windowsAdapter.executeWMIQuery(wmiQuery);

      expect(result).toMatchObject({
        LoadPercentage: '25',
        Name: 'Intel Core i7',
        NumberOfCores: '8'
      });
    });
  });

  describe('Cross-Platform Resource Parsing', () => {
    let parser: ResourceParser;

    beforeEach(() => {
      parser = compatibility.getParser();
    });

    it('should parse CPU data consistently across platforms', () => {
      const linuxData = parser.parseCPU(MOCK_RESPONSES.linux.cpu, 'linux');
      const macosData = parser.parseCPU(MOCK_RESPONSES.darwin.cpu, 'darwin');
      const windowsData = parser.parseCPU(MOCK_RESPONSES.win32.cpu, 'win32');

      [linuxData, macosData, windowsData].forEach(data => {
        expect(data).toMatchObject({
          usage: expect.any(Number),
          cores: expect.any(Number)
        });
        expect(data.usage).toBeGreaterThanOrEqual(0);
        expect(data.usage).toBeLessThanOrEqual(100);
      });
    });

    it('should parse memory data consistently across platforms', () => {
      const linuxData = parser.parseMemory(MOCK_RESPONSES.linux.memory, 'linux');
      const macosData = parser.parseMemory(MOCK_RESPONSES.darwin.memory, 'darwin');
      const windowsData = parser.parseMemory(MOCK_RESPONSES.win32.memory, 'win32');

      [linuxData, macosData, windowsData].forEach(data => {
        expect(data).toMatchObject({
          total: expect.any(Number),
          used: expect.any(Number),
          free: expect.any(Number),
          percentage: expect.any(Number)
        });
        expect(data.percentage).toBeGreaterThanOrEqual(0);
        expect(data.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should normalize unit differences', () => {
      const memoryKB = parser.parseMemory('Total: 16777216 KB\nUsed: 8388608 KB', 'linux');
      const memoryMB = parser.parseMemory('Total: 16384 MB\nUsed: 8192 MB', 'darwin');
      const memoryGB = parser.parseMemory('Total: 16 GB\nUsed: 8 GB', 'win32');

      expect(memoryKB.total).toBeCloseTo(memoryMB.total, -2);
      expect(memoryMB.total).toBeCloseTo(memoryGB.total, -2);
    });

    it('should handle malformed platform-specific output', () => {
      const malformedOutputs = [
        'corrupted data',
        '',
        'unexpected format: no numbers',
        'partial output\nincomplete'
      ];

      malformedOutputs.forEach(output => {
        expect(() => parser.parseCPU(output, 'linux'))
          .toThrow('Failed to parse CPU data');
      });
    });
  });

  describe('Platform-Specific Command Execution', () => {
    it('should execute commands with appropriate shell on each platform', async () => {
      const commands = {
        linux: 'ps aux | grep node',
        darwin: 'ps aux | grep node',
        win32: 'tasklist | findstr node'
      };

      for (const [platform, command] of Object.entries(commands)) {
        const adapter = compatibility.getAdapter(platform as any);
        mockExecutor.execute.mockResolvedValue('mock output');

        await adapter.executeCommand(command);

        expect(mockExecutor.execute).toHaveBeenCalledWith(
          command,
          expect.objectContaining({
            shell: expect.any(String)
          })
        );
      }
    });

    it('should handle command timeouts per platform', async () => {
      const adapter = compatibility.getAdapter('linux');
      
      mockExecutor.execute.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(adapter.executeCommand('slow command', { timeout: 1000 }))
        .rejects.toThrow('Command timeout');
    });

    it('should handle permission errors gracefully', async () => {
      const adapter = compatibility.getAdapter('linux');
      
      mockExecutor.execute.mockRejectedValue(new Error('Permission denied'));

      const result = await adapter.executeCommandWithFallback('restricted command');
      
      expect(result).toMatchObject({
        success: false,
        error: 'Permission denied',
        fallback: expect.any(String)
      });
    });
  });

  describe('System Information Collection', () => {
    it('should collect comprehensive system information', async () => {
      const systemInfo = await compatibility.getSystemInfo();

      expect(systemInfo).toMatchObject({
        platform: expect.any(String),
        architecture: expect.any(String),
        nodeVersion: expect.any(String),
        totalMemory: expect.any(Number),
        cpuInfo: expect.objectContaining({
          model: expect.any(String),
          cores: expect.any(Number),
          speed: expect.any(Number)
        }),
        networkInterfaces: expect.any(Object),
        uptime: expect.any(Number)
      });
    });

    it('should detect virtualization and containerization', async () => {
      const virtualizationInfo = await compatibility.getVirtualizationInfo();

      expect(virtualizationInfo).toMatchObject({
        isVirtualized: expect.any(Boolean),
        isContainerized: expect.any(Boolean),
        platform: expect.any(String),
        details: expect.any(Object)
      });
    });

    it('should provide platform-specific optimization hints', async () => {
      const hints = await compatibility.getOptimizationHints();

      expect(hints).toMatchObject({
        monitoring: expect.objectContaining({
          recommendedInterval: expect.any(Number),
          efficientCommands: expect.any(Array)
        }),
        performance: expect.objectContaining({
          suggestions: expect.any(Array),
          limitations: expect.any(Array)
        })
      });
    });
  });

  describe('Compatibility Layer Features', () => {
    it('should provide unified resource monitoring API', async () => {
      const monitor = compatibility.createResourceMonitor();

      const snapshot = await monitor.getSnapshot();

      expect(snapshot).toMatchObject({
        cpu: expect.objectContaining({
          usage: expect.any(Number),
          cores: expect.any(Number)
        }),
        memory: expect.objectContaining({
          total: expect.any(Number),
          used: expect.any(Number),
          free: expect.any(Number)
        }),
        disk: expect.objectContaining({
          total: expect.any(Number),
          used: expect.any(Number),
          free: expect.any(Number)
        }),
        network: expect.objectContaining({
          rx: expect.any(Number),
          tx: expect.any(Number)
        })
      });
    });

    it('should handle platform-specific limitations', async () => {
      const limitations = await compatibility.getPlatformLimitations();

      expect(limitations).toMatchObject({
        monitoring: expect.objectContaining({
          restrictedCommands: expect.any(Array),
          requiresElevation: expect.any(Array),
          notAvailable: expect.any(Array)
        }),
        performance: expect.objectContaining({
          maxMonitoringFrequency: expect.any(Number),
          resourceOverhead: expect.any(Number)
        })
      });
    });

    it('should provide platform-specific error handling', async () => {
      const errorHandler = compatibility.getErrorHandler();

      const platformError = new Error('Platform-specific error');
      const handledError = errorHandler.handleError(platformError, 'memory');

      expect(handledError).toMatchObject({
        originalError: platformError,
        platformSpecific: true,
        fallbackAction: expect.any(String),
        userMessage: expect.any(String)
      });
    });

    it('should support feature detection', async () => {
      const features = await compatibility.detectFeatures();

      expect(features).toMatchObject({
        realTimeMonitoring: expect.any(Boolean),
        processManagement: expect.any(Boolean),
        networkMonitoring: expect.any(Boolean),
        containerSupport: expect.any(Boolean),
        performanceCounters: expect.any(Boolean)
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should cache command results appropriately', async () => {
      const adapter = compatibility.getAdapter('linux');
      
      // First call
      mockExecutor.execute.mockResolvedValue('cached result');
      await adapter.getCPUUsage();

      // Second call should use cache
      const startTime = Date.now();
      await adapter.getCPUUsage();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10); // Should be very fast
      expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    });

    it('should batch multiple resource queries', async () => {
      const adapter = compatibility.getAdapter('linux');
      
      mockExecutor.execute
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.cpu)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.memory)
        .mockResolvedValueOnce(MOCK_RESPONSES.linux.disk);

      const results = await adapter.batchQuery(['cpu', 'memory', 'disk']);

      expect(results).toMatchObject({
        cpu: expect.any(Object),
        memory: expect.any(Object),
        disk: expect.any(Object)
      });
    });

    it('should optimize monitoring frequency per platform', async () => {
      const platforms = ['linux', 'darwin', 'win32'];
      
      for (const platform of platforms) {
        const adapter = compatibility.getAdapter(platform as any);
        const optimalFrequency = await adapter.getOptimalMonitoringFrequency();
        
        expect(optimalFrequency).toBeGreaterThan(0);
        expect(optimalFrequency).toBeLessThan(60000); // Less than 1 minute
      }
    });
  });
});