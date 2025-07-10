/**
 * MCP Feature Integration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpFeatureAdapter } from '../adapters/McpFeatureAdapter.js';
import { DefaultFeatureRegistry } from '../core/FeatureRegistry.js';
import { IFeature, FeatureCategory } from '../types/IFeature.js';
import type { ILogger } from '../../core/logger.js';

// Mock logger
const mockLogger: ILogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

// Mock feature
const createMockFeature = (id: string, enabled = false): IFeature => ({
  id,
  name: `Feature ${id}`,
  description: `Description for ${id}`,
  version: '1.0.0',
  category: FeatureCategory.CORE,
  enabled,
  dependencies: [],
  lifecycle: {},
  metadata: {
    tags: ['test'],
    experimental: false,
  },
});

describe('MCP Feature Integration', () => {
  let registry: DefaultFeatureRegistry;
  let adapter: McpFeatureAdapter;

  beforeEach(() => {
    registry = new DefaultFeatureRegistry();
    adapter = new McpFeatureAdapter(registry, undefined, mockLogger);
    vi.clearAllMocks();
  });

  describe('McpFeatureAdapter', () => {
    it('should create feature tools', () => {
      const tools = adapter.getTools();
      expect(tools).toHaveLength(5);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('features/list');
      expect(toolNames).toContain('features/enable');
      expect(toolNames).toContain('features/disable');
      expect(toolNames).toContain('features/config');
      expect(toolNames).toContain('features/status');
    });

    it('should list features through MCP tool', async () => {
      // Register test features
      registry.register(createMockFeature('test-1', true));
      registry.register(createMockFeature('test-2', false));
      
      const tools = adapter.getTools();
      const listTool = tools.find(t => t.name === 'features/list');
      expect(listTool).toBeDefined();
      
      const result = await listTool!.handler({}, { featureRegistry: registry } as any);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('total', 2);
      expect(result.features).toHaveLength(2);
      expect(result.features[0]).toHaveProperty('id', 'test-1');
      expect(result.features[0]).toHaveProperty('enabled', true);
    });

    it('should filter features by category', async () => {
      // Register features with different categories
      const feature1 = createMockFeature('core-1');
      const feature2 = createMockFeature('exp-1');
      feature2.category = FeatureCategory.EXPERIMENTAL;
      
      registry.register(feature1);
      registry.register(feature2);
      
      const tools = adapter.getTools();
      const listTool = tools.find(t => t.name === 'features/list');
      
      const result = await listTool!.handler(
        { category: 'experimental' }, 
        { featureRegistry: registry } as any
      );
      
      expect(result.total).toBe(1);
      expect(result.features[0].id).toBe('exp-1');
    });

    it('should get feature status', async () => {
      const feature = createMockFeature('status-test', true);
      feature.dependencies = ['dep-1', 'dep-2'];
      registry.register(feature);
      
      const tools = adapter.getTools();
      const statusTool = tools.find(t => t.name === 'features/status');
      
      const result = await statusTool!.handler(
        { featureId: 'status-test' },
        { featureRegistry: registry } as any
      );
      
      expect(result.success).toBe(true);
      expect(result.feature.id).toBe('status-test');
      expect(result.dependencies.required).toEqual(['dep-1', 'dep-2']);
    });

    it('should enrich responses with feature metadata', () => {
      const feature = createMockFeature('enrich-test', true);
      registry.register(feature);
      
      const response = { data: 'test' };
      const enriched = adapter.enrichResponse(response, ['enrich-test']);
      
      expect(enriched).toHaveProperty('_metadata');
      expect(enriched._metadata.features['enrich-test']).toEqual({
        enabled: false, // No feature manager, so defaults to false
        version: '1.0.0',
        experimental: false,
      });
    });

    it('should check tool feature requirements', async () => {
      const feature = createMockFeature('advanced-swarm', true);
      registry.register(feature);
      
      const check = await adapter.checkToolFeatures('swarm/advanced-orchestration');
      
      expect(check.requiredFeatures).toContain('advanced-swarm');
      expect(check.requiredFeatures).toContain('neural-patterns');
      expect(check.missingFeatures).toContain('neural-patterns'); // Not registered
      expect(check.allowed).toBe(false);
    });

    it('should discover features with filters', async () => {
      const feature1 = createMockFeature('discover-1');
      feature1.metadata!.tags = ['ai', 'experimental'];
      feature1.metadata!.experimental = true;
      
      const feature2 = createMockFeature('discover-2');
      feature2.metadata!.tags = ['core', 'stable'];
      feature2.metadata!.experimental = false;
      
      registry.register(feature1);
      registry.register(feature2);
      
      // Test tag filtering
      const tagFiltered = await adapter.discoverFeatures({ tags: ['ai'] });
      expect(tagFiltered).toHaveLength(1);
      expect(tagFiltered[0].id).toBe('discover-1');
      
      // Test experimental filtering
      const expFiltered = await adapter.discoverFeatures({ experimental: false });
      expect(expFiltered).toHaveLength(1);
      expect(expFiltered[0].id).toBe('discover-2');
    });
  });

  describe('Feature Tool Handlers', () => {
    it('should handle missing feature registry', async () => {
      const tools = adapter.getTools();
      const listTool = tools.find(t => t.name === 'features/list');
      
      // Call without context should use constructor-provided registry
      const result = await listTool!.handler({});
      expect(result.success).toBe(true);
      expect(result.features).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const tools = adapter.getTools();
      const statusTool = tools.find(t => t.name === 'features/status');
      
      await expect(
        statusTool!.handler(
          { featureId: 'non-existent' },
          { featureRegistry: registry } as any
        )
      ).rejects.toThrow('Feature not found: non-existent');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});