/**
 * HiveMind Initialization Timeout Tests
 * 
 * Tests to ensure HiveMind initialization completes within reasonable timeouts
 * and handles failures gracefully.
 */

import { HiveMind } from '../core/HiveMind.js';
import { MaestroHiveCoordinator } from '../../maestro-hive/coordinator.js';
import type { HiveMindConfig, MaestroHiveConfig } from '../types.js';

describe('HiveMind Initialization Timeout Tests', () => {
  const FAST_TIMEOUT = 5000; // 5 seconds for fast initialization
  const SAFE_TIMEOUT = 30000; // 30 seconds for safe initialization

  // Test configuration for fast initialization
  const testConfig: HiveMindConfig = {
    name: 'test-swarm',
    topology: 'hierarchical',
    maxAgents: 3, // Reduced for faster initialization
    queenMode: 'centralized',
    memoryTTL: 3600,
    consensusThreshold: 0.6,
    autoSpawn: false, // Disable auto-spawn for faster init
    enableConsensus: false, // Disable for faster init
    enableMemory: true,
    enableCommunication: true,
    enabledFeatures: ['basic'],
    createdAt: new Date()
  };

  // Test configuration for Maestro
  const maestroConfig: MaestroHiveConfig = {
    name: 'maestro-test-swarm',
    topology: 'hierarchical',
    maxAgents: 3,
    queenMode: 'centralized',
    memoryTTL: 3600,
    consensusThreshold: 0.6,
    autoSpawn: false,
    enableConsensus: false,
    enableMemory: true,
    enableCommunication: true,
    enableSpecsDriven: false,
    workflowDirectory: './test-workflows',
    qualityThreshold: 0.7,
    autoValidation: false,
    consensusRequired: false,
    defaultAgentTypes: ['coordinator', 'coder'],
    agentCapabilities: {
      coordinator: ['task_management'],
      coder: ['code_generation']
    }
  };

  beforeEach(() => {
    // Clean up any existing instances
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup after each test
    jest.clearAllTimers();
  });

  test('HiveMind should initialize within 5 seconds', async () => {
    const startTime = Date.now();
    let hiveMind: HiveMind | null = null;
    let swarmId: string | null = null;

    try {
      hiveMind = new HiveMind(testConfig);
      
      // Test initialization with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout: HiveMind initialization took longer than 5 seconds')), FAST_TIMEOUT);
      });

      swarmId = await Promise.race([
        hiveMind.initialize(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      
      expect(swarmId).toBeDefined();
      expect(swarmId).toBeTruthy();
      expect(duration).toBeLessThan(FAST_TIMEOUT);
      
      console.log(`✅ HiveMind initialized successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ HiveMind initialization failed after ${duration}ms:`, error.message);
      
      if (error.message.includes('timeout')) {
        console.log('🔍 Timeout analysis:');
        console.log('- Database initialization may be slow');
        console.log('- SQLite loading may be taking too long'); 
        console.log('- Network dependencies may be causing delays');
        console.log('- Consider checking system resources');
      }
      
      throw error;
    } finally {
      // Cleanup
      if (hiveMind) {
        try {
          await hiveMind.shutdown();
        } catch (cleanupError) {
          console.warn('Cleanup warning:', cleanupError.message);
        }
      }
    }
  }, SAFE_TIMEOUT);

  test('MaestroHiveCoordinator should initialize within 5 seconds', async () => {
    const startTime = Date.now();
    let coordinator: MaestroHiveCoordinator | null = null;
    let swarmId: string | null = null;

    try {
      coordinator = new MaestroHiveCoordinator(maestroConfig);
      
      // Test initialization with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout: Maestro initialization took longer than 5 seconds')), FAST_TIMEOUT);
      });

      swarmId = await Promise.race([
        coordinator.initializeSwarm(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      
      expect(swarmId).toBeDefined();
      expect(swarmId).toBeTruthy();
      expect(duration).toBeLessThan(FAST_TIMEOUT);
      
      console.log(`✅ MaestroHiveCoordinator initialized successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ MaestroHiveCoordinator initialization failed after ${duration}ms:`, error.message);
      
      if (error.message.includes('timeout')) {
        console.log('🔍 Timeout analysis for Maestro:');
        console.log('- HiveMind core initialization may be slow');
        console.log('- Database setup may be taking too long');
        console.log('- Subsystem initialization may be blocking');
        console.log('- Try reducing maxAgents or disabling features');
      }
      
      throw error;
    } finally {
      // Cleanup
      if (coordinator) {
        try {
          await coordinator.shutdown();
        } catch (cleanupError) {
          console.warn('Cleanup warning:', cleanupError.message);
        }
      }
    }
  }, SAFE_TIMEOUT);

  test('Initialization should handle SQLite loading timeouts gracefully', async () => {
    const startTime = Date.now();
    let hiveMind: HiveMind | null = null;

    try {
      // Create a config that might stress the system
      const stressConfig = {
        ...testConfig,
        maxAgents: 1, // Minimal to avoid agent spawning delays
        autoSpawn: false,
        enableConsensus: false,
        enableMemory: true, // This will test database initialization
      };

      hiveMind = new HiveMind(stressConfig);
      
      // Should either succeed or fail gracefully (fallback to in-memory)
      const swarmId = await hiveMind.initialize();
      
      const duration = Date.now() - startTime;
      
      expect(swarmId).toBeDefined();
      expect(duration).toBeLessThan(10000); // Allow 10 seconds for stress test
      
      console.log(`✅ Stress test passed in ${duration}ms`);
      console.log('- Initialization completed (either SQLite or in-memory fallback)');
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Stress test failed after ${duration}ms:`, error.message);
      
      // Analyze the type of failure
      if (error.message.includes('timeout')) {
        console.log('🔍 Stress test timeout analysis:');
        console.log('- Database initialization may need optimization');
        console.log('- In-memory fallback may not be working correctly');
        console.log('- System may be under heavy load');
      }
      
      throw error;
    } finally {
      if (hiveMind) {
        try {
          await hiveMind.shutdown();
        } catch (cleanupError) {
          console.warn('Cleanup warning:', cleanupError.message);
        }
      }
    }
  }, SAFE_TIMEOUT);

  test('Multiple concurrent initializations should not cause deadlocks', async () => {
    const startTime = Date.now();
    const coordinators: MaestroHiveCoordinator[] = [];
    const swarmIds: string[] = [];

    try {
      // Create multiple coordinators with different configs
      const configs = [
        { ...maestroConfig, name: 'concurrent-test-1' },
        { ...maestroConfig, name: 'concurrent-test-2' },
        { ...maestroConfig, name: 'concurrent-test-3' }
      ];

      const initPromises = configs.map(async (config, index) => {
        const coordinator = new MaestroHiveCoordinator(config);
        coordinators.push(coordinator);
        
        const swarmId = await coordinator.initializeSwarm();
        swarmIds.push(swarmId);
        
        return { coordinator, swarmId, index };
      });

      // Test concurrent initialization with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Concurrent initialization timeout')), 15000);
      });

      const results = await Promise.race([
        Promise.all(initPromises),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(swarmIds).toHaveLength(3);
      expect(duration).toBeLessThan(15000);
      
      // Verify all swarm IDs are unique
      const uniqueIds = new Set(swarmIds);
      expect(uniqueIds.size).toBe(3);
      
      console.log(`✅ Concurrent initialization test passed in ${duration}ms`);
      console.log(`- Successfully initialized ${results.length} swarms concurrently`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Concurrent initialization failed after ${duration}ms:`, error.message);
      throw error;
    } finally {
      // Cleanup all coordinators
      await Promise.all(coordinators.map(async (coordinator) => {
        try {
          await coordinator.shutdown();
        } catch (cleanupError) {
          console.warn('Cleanup warning:', cleanupError.message);
        }
      }));
    }
  }, SAFE_TIMEOUT);

  test('Initialization should provide detailed progress logging', async () => {
    const logs: string[] = [];
    const originalConsoleLog = console.log;
    
    // Capture console logs
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      originalConsoleLog(...args);
    };

    let coordinator: MaestroHiveCoordinator | null = null;

    try {
      coordinator = new MaestroHiveCoordinator(maestroConfig);
      await coordinator.initializeSwarm();

      // Verify we got progress logs
      const progressLogs = logs.filter(log => 
        log.includes('[HiveMind]') || 
        log.includes('[DatabaseManager]') ||
        log.includes('[SQLiteWrapper]')
      );

      expect(progressLogs.length).toBeGreaterThan(3);
      
      // Check for key initialization steps
      const hasDbInit = logs.some(log => log.includes('database initialization'));
      const hasSubsystemInit = logs.some(log => log.includes('subsystem'));
      const hasCompletion = logs.some(log => log.includes('successfully'));

      expect(hasDbInit || hasSubsystemInit || hasCompletion).toBe(true);
      
      console.log(`✅ Progress logging test passed with ${progressLogs.length} progress logs`);
    } finally {
      // Restore console.log
      console.log = originalConsoleLog;
      
      if (coordinator) {
        try {
          await coordinator.shutdown();
        } catch (cleanupError) {
          console.warn('Cleanup warning:', cleanupError.message);
        }
      }
    }
  }, SAFE_TIMEOUT);
});