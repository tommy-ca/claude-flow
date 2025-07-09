/**
 * Unit tests for Pressure Detector
 * Tests resource pressure detection and prevention mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, TEST_FIXTURES } from '../test-config';

// These imports will fail initially (TDD approach)
import {
  PressureDetector,
  PressureLevel,
  PressureThresholds,
  PressureAlert,
  PressureHistory,
  PressurePredictor,
  PressureMonitor,
  PressureMetrics,
  ThrottleAction,
  PressureResponse
} from '../../../src/resource-manager/monitors/pressure-detector';

import {
  ResourceSnapshot,
  ResourceType,
  ResourceMetrics
} from '../../../src/resource-manager/types/resources';

describe('PressureDetector', () => {
  let detector: PressureDetector;
  let mockResourceSnapshot: ResourceSnapshot;

  beforeEach(() => {
    detector = new PressureDetector();
    
    mockResourceSnapshot = {
      timestamp: Date.now(),
      cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
      memory: TEST_CONFIG.mocks.generateMemoryUsage(45),
      disk: TEST_CONFIG.mocks.generateDiskUsage(50),
      network: TEST_CONFIG.mocks.generateNetworkStats(100)
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    detector.reset();
  });

  describe('Basic Pressure Detection', () => {
    it('should detect normal pressure levels', () => {
      const pressures = detector.detectPressure(mockResourceSnapshot);

      expect(pressures).toMatchObject({
        cpu: 'normal',
        memory: 'normal',
        disk: 'normal',
        network: 'normal',
        overall: 'normal'
      });
    });

    it('should detect high CPU pressure', () => {
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(85);

      const pressures = detector.detectPressure(mockResourceSnapshot);

      expect(pressures.cpu).toBe('high');
      expect(pressures.overall).toBe('high');
    });

    it('should detect critical memory pressure', () => {
      mockResourceSnapshot.memory = TEST_CONFIG.mocks.generateMemoryUsage(95);

      const pressures = detector.detectPressure(mockResourceSnapshot);

      expect(pressures.memory).toBe('critical');
      expect(pressures.overall).toBe('critical');
    });

    it('should detect moderate disk pressure', () => {
      mockResourceSnapshot.disk = TEST_CONFIG.mocks.generateDiskUsage(75);

      const pressures = detector.detectPressure(mockResourceSnapshot);

      expect(pressures.disk).toBe('moderate');
      expect(pressures.overall).toBe('moderate');
    });

    it('should calculate composite pressure correctly', () => {
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(70);
      mockResourceSnapshot.memory = TEST_CONFIG.mocks.generateMemoryUsage(80);
      mockResourceSnapshot.disk = TEST_CONFIG.mocks.generateDiskUsage(85);

      const pressures = detector.detectPressure(mockResourceSnapshot);

      expect(pressures.overall).toBe('high');
      expect(pressures.compositeScore).toBeGreaterThan(0.7);
    });
  });

  describe('Pressure Thresholds Configuration', () => {
    it('should use default thresholds', () => {
      const thresholds = detector.getThresholds();

      expect(thresholds).toMatchObject({
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
        }
      });
    });

    it('should allow custom threshold configuration', () => {
      const customThresholds: PressureThresholds = {
        cpu: { normal: 50, moderate: 65, high: 80, critical: 90 },
        memory: { normal: 60, moderate: 75, high: 85, critical: 92 },
        disk: { normal: 70, moderate: 80, high: 90, critical: 95 }
      };

      detector.setThresholds(customThresholds);

      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(70);
      const pressures = detector.detectPressure(mockResourceSnapshot);

      expect(pressures.cpu).toBe('moderate'); // Would be 'normal' with default thresholds
    });

    it('should validate threshold consistency', () => {
      const invalidThresholds = {
        cpu: { normal: 80, moderate: 70, high: 60, critical: 50 } // Invalid: decreasing
      };

      expect(() => detector.setThresholds(invalidThresholds as any))
        .toThrow('Invalid thresholds: values must be in ascending order');
    });

    it('should support dynamic threshold adjustment', () => {
      // Simulate learning from past performance
      const historicalData = [
        { usage: 75, systemStable: true },
        { usage: 80, systemStable: false },
        { usage: 70, systemStable: true }
      ];

      detector.adjustThresholdsFromHistory(historicalData);

      const adjustedThresholds = detector.getThresholds();
      expect(adjustedThresholds.cpu.high).toBeLessThan(85); // Should be lowered
    });
  });

  describe('Pressure History and Trends', () => {
    it('should maintain pressure history', () => {
      const snapshots = [
        { ...mockResourceSnapshot, cpu: TEST_CONFIG.mocks.generateCpuLoad(30) },
        { ...mockResourceSnapshot, cpu: TEST_CONFIG.mocks.generateCpuLoad(50) },
        { ...mockResourceSnapshot, cpu: TEST_CONFIG.mocks.generateCpuLoad(70) },
        { ...mockResourceSnapshot, cpu: TEST_CONFIG.mocks.generateCpuLoad(85) }
      ];

      snapshots.forEach(snapshot => {
        detector.detectPressure(snapshot);
      });

      const history = detector.getHistory();
      expect(history).toHaveLength(4);
      expect(history[0].pressures.cpu).toBe('normal');
      expect(history[3].pressures.cpu).toBe('high');
    });

    it('should detect pressure trends', () => {
      // Simulate increasing pressure
      const usagePattern = [30, 40, 50, 60, 70, 80, 85];
      
      usagePattern.forEach(usage => {
        const snapshot = {
          ...mockResourceSnapshot,
          cpu: TEST_CONFIG.mocks.generateCpuLoad(usage)
        };
        detector.detectPressure(snapshot);
      });

      const trends = detector.getTrends();

      expect(trends.cpu.direction).toBe('increasing');
      expect(trends.cpu.rate).toBeGreaterThan(0);
      expect(trends.cpu.severity).toBe('high');
    });

    it('should detect pressure oscillations', () => {
      // Simulate oscillating pressure
      const oscillatingPattern = [30, 80, 35, 85, 40, 90, 45];
      
      oscillatingPattern.forEach(usage => {
        const snapshot = {
          ...mockResourceSnapshot,
          cpu: TEST_CONFIG.mocks.generateCpuLoad(usage)
        };
        detector.detectPressure(snapshot);
      });

      const patterns = detector.getPatterns();

      expect(patterns.cpu.type).toBe('oscillating');
      expect(patterns.cpu.amplitude).toBeGreaterThan(40);
      expect(patterns.cpu.frequency).toBeGreaterThan(0);
    });

    it('should limit history size', () => {
      detector.setMaxHistorySize(5);

      // Generate more entries than the limit
      for (let i = 0; i < 10; i++) {
        detector.detectPressure(mockResourceSnapshot);
      }

      const history = detector.getHistory();
      expect(history).toHaveLength(5);
    });
  });

  describe('Pressure Prediction', () => {
    let predictor: PressurePredictor;

    beforeEach(() => {
      predictor = detector.getPredictor();
    });

    it('should predict future pressure levels', () => {
      // Build historical data
      const timeline = Array.from({ length: 60 }, (_, i) => ({
        timestamp: Date.now() - (60 - i) * 60000, // Last 60 minutes
        cpu: 30 + i * 0.5, // Gradual increase
        memory: 40 + i * 0.3,
        disk: 50 + i * 0.2
      }));

      timeline.forEach(point => {
        const snapshot = {
          ...mockResourceSnapshot,
          timestamp: point.timestamp,
          cpu: TEST_CONFIG.mocks.generateCpuLoad(point.cpu),
          memory: TEST_CONFIG.mocks.generateMemoryUsage(point.memory),
          disk: TEST_CONFIG.mocks.generateDiskUsage(point.disk)
        };
        detector.detectPressure(snapshot);
      });

      const prediction = predictor.predict(15 * 60000); // 15 minutes ahead

      expect(prediction.cpu).toMatchObject({
        level: expect.any(String),
        confidence: expect.any(Number),
        timeToLevel: expect.any(Number)
      });
      expect(prediction.cpu.confidence).toBeGreaterThan(0.7);
    });

    it('should predict pressure spikes', () => {
      // Historical pattern with spike
      const spikePattern = [
        ...Array(10).fill(30),
        ...Array(3).fill(90),
        ...Array(10).fill(35)
      ];

      spikePattern.forEach((usage, i) => {
        const snapshot = {
          ...mockResourceSnapshot,
          timestamp: Date.now() - (spikePattern.length - i) * 60000,
          cpu: TEST_CONFIG.mocks.generateCpuLoad(usage)
        };
        detector.detectPressure(snapshot);
      });

      const spikeAnalysis = predictor.predictSpikes(30 * 60000); // 30 minutes

      expect(spikeAnalysis.cpu).toMatchObject({
        spikeProbability: expect.any(Number),
        expectedSeverity: expect.any(String),
        timeToSpike: expect.any(Number)
      });
    });

    it('should predict resource exhaustion', () => {
      // Simulate linear increase toward exhaustion
      const exhaustionPattern = Array.from({ length: 20 }, (_, i) => 70 + i * 1.5);

      exhaustionPattern.forEach((usage, i) => {
        const snapshot = {
          ...mockResourceSnapshot,
          timestamp: Date.now() - (exhaustionPattern.length - i) * 60000,
          cpu: TEST_CONFIG.mocks.generateCpuLoad(usage)
        };
        detector.detectPressure(snapshot);
      });

      const exhaustion = predictor.predictExhaustion();

      expect(exhaustion.cpu).toMatchObject({
        willExhaust: true,
        timeToExhaustion: expect.any(Number),
        confidence: expect.any(Number)
      });
      expect(exhaustion.cpu.timeToExhaustion).toBeLessThan(30 * 60000); // Within 30 minutes
    });

    it('should adapt predictions based on workload patterns', () => {
      // Simulate daily pattern
      const dailyPattern = Array.from({ length: 24 }, (_, hour) => {
        const baseLoad = 30;
        const workHours = hour >= 9 && hour <= 17;
        return baseLoad + (workHours ? 40 : 10);
      });

      dailyPattern.forEach((usage, hour) => {
        const snapshot = {
          ...mockResourceSnapshot,
          timestamp: Date.now() - (24 - hour) * 3600000,
          cpu: TEST_CONFIG.mocks.generateCpuLoad(usage)
        };
        detector.detectPressure(snapshot);
      });

      predictor.learnWorkloadPattern();

      const morningPrediction = predictor.predictAtTime(
        new Date().setHours(9, 0, 0, 0)
      );
      const eveningPrediction = predictor.predictAtTime(
        new Date().setHours(20, 0, 0, 0)
      );

      expect(morningPrediction.cpu.level).toBe('moderate');
      expect(eveningPrediction.cpu.level).toBe('normal');
    });
  });

  describe('Pressure Alerts and Notifications', () => {
    it('should generate alerts for high pressure', () => {
      const alerts: PressureAlert[] = [];
      detector.onAlert(alert => alerts.push(alert));

      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(90);
      detector.detectPressure(mockResourceSnapshot);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'high-pressure',
        resource: 'cpu',
        level: 'high',
        timestamp: expect.any(Number),
        message: expect.stringContaining('CPU pressure is high')
      });
    });

    it('should generate alerts for rapid pressure changes', () => {
      const alerts: PressureAlert[] = [];
      detector.onAlert(alert => alerts.push(alert));

      // Sudden pressure spike
      detector.detectPressure(mockResourceSnapshot);
      
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(85);
      detector.detectPressure(mockResourceSnapshot);

      const rapidChangeAlert = alerts.find(a => a.type === 'rapid-change');
      expect(rapidChangeAlert).toBeDefined();
    });

    it('should support alert throttling', () => {
      const alerts: PressureAlert[] = [];
      detector.onAlert(alert => alerts.push(alert));
      detector.setAlertThrottling(1000); // 1 second throttle

      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(90);
      
      // Generate multiple alerts quickly
      for (let i = 0; i < 5; i++) {
        detector.detectPressure(mockResourceSnapshot);
      }

      expect(alerts).toHaveLength(1); // Should be throttled
    });

    it('should prioritize critical alerts', () => {
      const alerts: PressureAlert[] = [];
      detector.onAlert(alert => alerts.push(alert));

      // Generate both high and critical alerts
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(88);
      detector.detectPressure(mockResourceSnapshot);

      mockResourceSnapshot.memory = TEST_CONFIG.mocks.generateMemoryUsage(96);
      detector.detectPressure(mockResourceSnapshot);

      const criticalAlert = alerts.find(a => a.level === 'critical');
      const highAlert = alerts.find(a => a.level === 'high');

      expect(criticalAlert?.priority).toBeGreaterThan(highAlert?.priority || 0);
    });
  });

  describe('Pressure Response and Mitigation', () => {
    it('should suggest mitigation actions for high pressure', () => {
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(88);
      detector.detectPressure(mockResourceSnapshot);

      const actions = detector.getMitigationActions();

      expect(actions).toContainEqual(
        expect.objectContaining({
          type: 'throttle',
          resource: 'cpu',
          action: 'reduce_agent_spawning',
          urgency: 'high'
        })
      );
    });

    it('should implement automatic throttling', () => {
      detector.enableAutoThrottling({
        cpu: { threshold: 85, action: 'pause_deployments' },
        memory: { threshold: 90, action: 'reduce_agent_count' }
      });

      const throttler = detector.getThrottler();

      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(88);
      detector.detectPressure(mockResourceSnapshot);

      const throttleActions = throttler.getActiveActions();
      expect(throttleActions).toContain('pause_deployments');
    });

    it('should coordinate with resource allocator', () => {
      const mockAllocator = {
        pauseAllocations: vi.fn(),
        resumeAllocations: vi.fn(),
        getActiveAllocations: vi.fn().mockReturnValue([])
      };

      detector.setAllocator(mockAllocator);
      detector.enableAutoThrottling({
        memory: { threshold: 85, action: 'pause_allocations' }
      });

      mockResourceSnapshot.memory = TEST_CONFIG.mocks.generateMemoryUsage(90);
      detector.detectPressure(mockResourceSnapshot);

      expect(mockAllocator.pauseAllocations).toHaveBeenCalled();
    });

    it('should implement pressure-based scaling', () => {
      const scaler = detector.getScaler();

      scaler.configure({
        scaleDownThreshold: 30,
        scaleUpThreshold: 80,
        cooldownPeriod: 60000
      });

      // High pressure - should scale down
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(85);
      detector.detectPressure(mockResourceSnapshot);

      const scaleAction = scaler.getRecommendedAction();
      expect(scaleAction).toMatchObject({
        type: 'scale-down',
        resource: 'cpu',
        amount: expect.any(Number)
      });
    });

    it('should handle pressure-based agent migration', () => {
      const migrator = detector.getMigrator();

      // Simulate uneven pressure distribution
      const hotNode = {
        ...mockResourceSnapshot,
        cpu: TEST_CONFIG.mocks.generateCpuLoad(90)
      };
      
      const coldNode = {
        ...mockResourceSnapshot,
        cpu: TEST_CONFIG.mocks.generateCpuLoad(30)
      };

      migrator.addNode('hot', hotNode);
      migrator.addNode('cold', coldNode);

      const migrations = migrator.planMigrations();

      expect(migrations).toContainEqual(
        expect.objectContaining({
          from: 'hot',
          to: 'cold',
          agents: expect.any(Array)
        })
      );
    });
  });

  describe('Resource-Specific Pressure Monitoring', () => {
    it('should monitor CPU pressure with core-specific detail', () => {
      const cpuSnapshot = {
        ...mockResourceSnapshot.cpu,
        coreUsage: [95, 85, 40, 30, 90, 80, 45, 35]
      };

      mockResourceSnapshot.cpu = cpuSnapshot;
      detector.detectPressure(mockResourceSnapshot);

      const cpuDetail = detector.getCPUPressureDetail();

      expect(cpuDetail).toMatchObject({
        overallPressure: 'high',
        hotCores: [0, 1, 4, 5],
        coldCores: [2, 3, 6, 7],
        imbalance: expect.any(Number)
      });
    });

    it('should monitor memory pressure with detailed breakdown', () => {
      const memorySnapshot = {
        ...mockResourceSnapshot.memory,
        swap: { used: 2048, total: 4096 },
        buffers: 1024,
        cached: 2048,
        available: 6144
      };

      mockResourceSnapshot.memory = memorySnapshot;
      detector.detectPressure(mockResourceSnapshot);

      const memoryDetail = detector.getMemoryPressureDetail();

      expect(memoryDetail).toMatchObject({
        overallPressure: 'normal',
        swapPressure: 'moderate',
        availablePressure: 'normal',
        fragments: expect.any(Number)
      });
    });

    it('should monitor disk pressure with I/O metrics', () => {
      const diskSnapshot = {
        ...mockResourceSnapshot.disk,
        ioStats: {
          readOps: 1000,
          writeOps: 800,
          readTime: 5000,
          writeTime: 3000
        }
      };

      mockResourceSnapshot.disk = diskSnapshot;
      detector.detectPressure(mockResourceSnapshot);

      const diskDetail = detector.getDiskPressureDetail();

      expect(diskDetail).toMatchObject({
        spacePressure: 'normal',
        ioPressure: expect.any(String),
        queueDepth: expect.any(Number)
      });
    });

    it('should monitor network pressure with bandwidth analysis', () => {
      const networkSnapshot = {
        ...mockResourceSnapshot.network,
        bandwidth: {
          maxRx: 1000,
          maxTx: 1000,
          currentRx: 800,
          currentTx: 600
        },
        connections: 150,
        errors: 5
      };

      mockResourceSnapshot.network = networkSnapshot;
      detector.detectPressure(mockResourceSnapshot);

      const networkDetail = detector.getNetworkPressureDetail();

      expect(networkDetail).toMatchObject({
        bandwidthPressure: 'moderate',
        connectionPressure: 'normal',
        errorRate: expect.any(Number)
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should optimize pressure detection frequency', () => {
      detector.setAdaptiveMonitoring(true);

      // Low pressure - should reduce monitoring frequency
      detector.detectPressure(mockResourceSnapshot);
      expect(detector.getMonitoringInterval()).toBe(5000); // 5 seconds

      // High pressure - should increase monitoring frequency
      mockResourceSnapshot.cpu = TEST_CONFIG.mocks.generateCpuLoad(88);
      detector.detectPressure(mockResourceSnapshot);
      expect(detector.getMonitoringInterval()).toBe(1000); // 1 second
    });

    it('should cache pressure calculations', () => {
      const startTime = Date.now();
      
      detector.detectPressure(mockResourceSnapshot);
      const firstCall = Date.now() - startTime;

      // Same snapshot - should use cache
      const cacheStartTime = Date.now();
      detector.detectPressure(mockResourceSnapshot);
      const cachedCall = Date.now() - cacheStartTime;

      expect(cachedCall).toBeLessThan(firstCall);
    });

    it('should batch pressure calculations', () => {
      const snapshots = Array.from({ length: 10 }, (_, i) => ({
        ...mockResourceSnapshot,
        timestamp: Date.now() + i * 1000
      }));

      const results = detector.detectPressureBatch(snapshots);

      expect(results).toHaveLength(10);
      expect(results[0]).toMatchObject({
        cpu: expect.any(String),
        memory: expect.any(String),
        disk: expect.any(String)
      });
    });

    it('should handle high-frequency pressure updates', () => {
      const updateCount = 1000;
      const startTime = Date.now();

      for (let i = 0; i < updateCount; i++) {
        detector.detectPressure({
          ...mockResourceSnapshot,
          timestamp: Date.now() + i
        });
      }

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});