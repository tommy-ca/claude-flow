/**
 * Memory Class
 * 
 * Manages collective memory for the Hive Mind swarm,
 * providing persistent storage, retrieval, and learning capabilities.
 */

import { EventEmitter } from 'events';
import { DatabaseManager } from './DatabaseManager';
import { MCPToolWrapper } from '../integration/MCPToolWrapper';
import {
  MemoryEntry,
  MemoryNamespace,
  MemoryStats,
  MemorySearchOptions,
  MemoryPattern
} from '../types';

export class Memory extends EventEmitter {
  private swarmId: string;
  private db: DatabaseManager;
  private mcpWrapper: MCPToolWrapper;
  private cache: Map<string, MemoryEntry>;
  private namespaces: Map<string, MemoryNamespace>;
  private accessPatterns: Map<string, number>;
  private isActive: boolean = false;

  constructor(swarmId: string) {
    super();
    this.swarmId = swarmId;
    this.cache = new Map();
    this.namespaces = new Map();
    this.accessPatterns = new Map();
    
    this.initializeNamespaces();
  }

  /**
   * Initialize memory system
   */
  async initialize(): Promise<void> {
    this.db = await DatabaseManager.getInstance();
    this.mcpWrapper = new MCPToolWrapper();
    
    // Load existing memory entries
    await this.loadMemoryFromDatabase();
    
    // Start memory management loops
    this.startCacheManager();
    this.startPatternAnalyzer();
    this.startMemoryOptimizer();
    
    this.isActive = true;
    this.emit('initialized');
  }

  /**
   * Store a memory entry
   */
  async store(key: string, value: any, namespace: string = 'default', ttl?: number): Promise<void> {
    const entry: MemoryEntry = {
      key,
      namespace,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      ttl,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessedAt: new Date()
    };
    
    // Store in database
    await this.db.storeMemory({
      key,
      namespace,
      value: entry.value,
      ttl,
      metadata: JSON.stringify({ swarmId: this.swarmId })
    });
    
    // Store in MCP memory for cross-session persistence
    await this.mcpWrapper.storeMemory({
      action: 'store',
      key: `${this.swarmId}/${namespace}/${key}`,
      value: entry.value,
      namespace: 'hive-mind',
      ttl
    });
    
    // Update cache
    this.cache.set(this.getCacheKey(key, namespace), entry);
    
    // Update namespace stats
    this.updateNamespaceStats(namespace, 'store');
    
    this.emit('memoryStored', { key, namespace });
  }

  /**
   * Retrieve a memory entry
   */
  async retrieve(key: string, namespace: string = 'default'): Promise<any> {
    const cacheKey = this.getCacheKey(key, namespace);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      this.updateAccessStats(entry);
      return this.parseValue(entry.value);
    }
    
    // Check database
    const dbEntry = await this.db.getMemory(key, namespace);
    if (dbEntry) {
      const entry: MemoryEntry = {
        key: dbEntry.key,
        namespace: dbEntry.namespace,
        value: dbEntry.value,
        ttl: dbEntry.ttl,
        createdAt: new Date(dbEntry.created_at),
        accessCount: dbEntry.access_count,
        lastAccessedAt: new Date(dbEntry.last_accessed_at)
      };
      
      // Update cache
      this.cache.set(cacheKey, entry);
      this.updateAccessStats(entry);
      
      return this.parseValue(entry.value);
    }
    
    // Check MCP memory as fallback
    const mcpValue = await this.mcpWrapper.retrieveMemory({
      action: 'retrieve',
      key: `${this.swarmId}/${namespace}/${key}`,
      namespace: 'hive-mind'
    });
    
    if (mcpValue) {
      // Restore to database
      await this.store(key, mcpValue, namespace);
      return this.parseValue(mcpValue);
    }
    
    return null;
  }

  /**
   * Search memory entries
   */
  async search(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    
    // Search in cache first
    for (const [cacheKey, entry] of this.cache) {
      if (this.matchesSearch(entry, options)) {
        results.push(entry);
      }
    }
    
    // If not enough results, search database
    if (results.length < (options.limit || 10)) {
      const dbResults = await this.db.searchMemory(options);
      
      for (const dbEntry of dbResults) {
        const entry: MemoryEntry = {
          key: dbEntry.key,
          namespace: dbEntry.namespace,
          value: dbEntry.value,
          ttl: dbEntry.ttl,
          createdAt: new Date(dbEntry.created_at),
          accessCount: dbEntry.access_count,
          lastAccessedAt: new Date(dbEntry.last_accessed_at)
        };
        
        if (!results.find(r => r.key === entry.key && r.namespace === entry.namespace)) {
          results.push(entry);
        }
      }
    }
    
    // Sort by relevance
    return this.sortByRelevance(results, options);
  }

  /**
   * Delete a memory entry
   */
  async delete(key: string, namespace: string = 'default'): Promise<void> {
    const cacheKey = this.getCacheKey(key, namespace);
    
    // Remove from cache
    this.cache.delete(cacheKey);
    
    // Remove from database
    await this.db.deleteMemory(key, namespace);
    
    // Remove from MCP memory
    await this.mcpWrapper.deleteMemory({
      action: 'delete',
      key: `${this.swarmId}/${namespace}/${key}`,
      namespace: 'hive-mind'
    });
    
    this.emit('memoryDeleted', { key, namespace });
  }

  /**
   * List all entries in a namespace
   */
  async list(namespace: string = 'default', limit: number = 100): Promise<MemoryEntry[]> {
    const entries = await this.db.listMemory(namespace, limit);
    
    return entries.map(dbEntry => ({
      key: dbEntry.key,
      namespace: dbEntry.namespace,
      value: dbEntry.value,
      ttl: dbEntry.ttl,
      createdAt: new Date(dbEntry.created_at),
      accessCount: dbEntry.access_count,
      lastAccessedAt: new Date(dbEntry.last_accessed_at)
    }));
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const stats = await this.db.getMemoryStats();
    
    const byNamespace: Record<string, any> = {};
    for (const ns of this.namespaces.values()) {
      const nsStats = await this.db.getNamespaceStats(ns.name);
      byNamespace[ns.name] = nsStats;
    }
    
    return {
      totalEntries: stats.totalEntries,
      totalSize: stats.totalSize,
      byNamespace,
      cacheHitRate: this.calculateCacheHitRate(),
      avgAccessTime: this.calculateAvgAccessTime(),
      hotKeys: await this.getHotKeys()
    };
  }

  /**
   * Learn patterns from memory access
   */
  async learnPatterns(): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];
    
    // Analyze access patterns
    const accessData = Array.from(this.accessPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20 accessed keys
    
    // Identify co-access patterns
    const coAccessPatterns = await this.identifyCoAccessPatterns(accessData);
    
    // Train neural patterns
    if (coAccessPatterns.length > 0) {
      await this.mcpWrapper.trainNeural({
        pattern_type: 'prediction',
        training_data: JSON.stringify({
          accessPatterns: accessData,
          coAccessPatterns
        }),
        epochs: 20
      });
    }
    
    // Create pattern objects
    for (const pattern of coAccessPatterns) {
      patterns.push({
        type: 'co-access',
        keys: pattern.keys,
        confidence: pattern.confidence,
        frequency: pattern.frequency
      });
    }
    
    return patterns;
  }

  /**
   * Predict next memory access
   */
  async predictNextAccess(currentKey: string): Promise<string[]> {
    const prediction = await this.mcpWrapper.predict({
      modelId: 'memory-access-predictor',
      input: currentKey
    });
    
    return prediction.predictions || [];
  }

  /**
   * Compress memory entries
   */
  async compress(namespace?: string): Promise<void> {
    const entries = namespace 
      ? await this.list(namespace)
      : await this.db.getAllMemoryEntries();
    
    for (const entry of entries) {
      if (this.shouldCompress(entry)) {
        const compressed = await this.compressEntry(entry);
        await this.store(
          entry.key,
          compressed,
          entry.namespace,
          entry.ttl
        );
      }
    }
    
    this.emit('memoryCompressed', { namespace });
  }

  /**
   * Backup memory to external storage
   */
  async backup(path: string): Promise<void> {
    const allEntries = await this.db.getAllMemoryEntries();
    
    const backup = {
      swarmId: this.swarmId,
      timestamp: new Date(),
      entries: allEntries,
      namespaces: Array.from(this.namespaces.values()),
      patterns: await this.learnPatterns()
    };
    
    // Store backup using MCP
    await this.mcpWrapper.storeMemory({
      action: 'store',
      key: `backup/${this.swarmId}/${Date.now()}`,
      value: JSON.stringify(backup),
      namespace: 'hive-mind-backups'
    });
    
    this.emit('memoryBackedUp', { path, entryCount: allEntries.length });
  }

  /**
   * Restore memory from backup
   */
  async restore(backupId: string): Promise<void> {
    const backupData = await this.mcpWrapper.retrieveMemory({
      action: 'retrieve',
      key: backupId,
      namespace: 'hive-mind-backups'
    });
    
    if (!backupData) {
      throw new Error('Backup not found');
    }
    
    const backup = JSON.parse(backupData);
    
    // Clear existing memory
    await this.db.clearMemory(this.swarmId);
    this.cache.clear();
    
    // Restore entries
    for (const entry of backup.entries) {
      await this.store(
        entry.key,
        entry.value,
        entry.namespace,
        entry.ttl
      );
    }
    
    this.emit('memoryRestored', { backupId, entryCount: backup.entries.length });
  }

  /**
   * Initialize default namespaces
   */
  private initializeNamespaces(): void {
    const defaultNamespaces: MemoryNamespace[] = [
      {
        name: 'default',
        description: 'Default memory namespace',
        retentionPolicy: 'persistent',
        maxEntries: 10000
      },
      {
        name: 'task-results',
        description: 'Task execution results',
        retentionPolicy: 'time-based',
        ttl: 86400 * 7 // 7 days
      },
      {
        name: 'agent-state',
        description: 'Agent state and context',
        retentionPolicy: 'time-based',
        ttl: 86400 // 1 day
      },
      {
        name: 'learning-data',
        description: 'Machine learning training data',
        retentionPolicy: 'persistent',
        maxEntries: 50000
      },
      {
        name: 'performance-metrics',
        description: 'Performance and optimization data',
        retentionPolicy: 'time-based',
        ttl: 86400 * 30 // 30 days
      },
      {
        name: 'decisions',
        description: 'Strategic decisions and rationale',
        retentionPolicy: 'persistent',
        maxEntries: 10000
      }
    ];
    
    for (const ns of defaultNamespaces) {
      this.namespaces.set(ns.name, ns);
    }
  }

  /**
   * Load memory from database
   */
  private async loadMemoryFromDatabase(): Promise<void> {
    const recentEntries = await this.db.getRecentMemoryEntries(100);
    
    for (const dbEntry of recentEntries) {
      const entry: MemoryEntry = {
        key: dbEntry.key,
        namespace: dbEntry.namespace,
        value: dbEntry.value,
        ttl: dbEntry.ttl,
        createdAt: new Date(dbEntry.created_at),
        accessCount: dbEntry.access_count,
        lastAccessedAt: new Date(dbEntry.last_accessed_at)
      };
      
      const cacheKey = this.getCacheKey(entry.key, entry.namespace);
      this.cache.set(cacheKey, entry);
    }
  }

  /**
   * Start cache manager
   */
  private startCacheManager(): void {
    setInterval(async () => {
      if (!this.isActive) return;
      
      // Evict expired entries
      await this.evictExpiredEntries();
      
      // Manage cache size
      await this.manageCacheSize();
      
    }, 60000); // Every minute
  }

  /**
   * Start pattern analyzer
   */
  private startPatternAnalyzer(): void {
    setInterval(async () => {
      if (!this.isActive) return;
      
      // Learn access patterns
      const patterns = await this.learnPatterns();
      
      // Store patterns for future use
      if (patterns.length > 0) {
        await this.store(
          'access-patterns',
          patterns,
          'learning-data',
          86400 // 1 day
        );
      }
      
    }, 300000); // Every 5 minutes
  }

  /**
   * Start memory optimizer
   */
  private startMemoryOptimizer(): void {
    setInterval(async () => {
      if (!this.isActive) return;
      
      // Compress old entries
      await this.compressOldEntries();
      
      // Optimize namespaces
      await this.optimizeNamespaces();
      
    }, 3600000); // Every hour
  }

  /**
   * Helper methods
   */
  
  private getCacheKey(key: string, namespace: string): string {
    return `${namespace}:${key}`;
  }

  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private updateAccessStats(entry: MemoryEntry): void {
    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    
    const cacheKey = this.getCacheKey(entry.key, entry.namespace);
    this.accessPatterns.set(cacheKey, (this.accessPatterns.get(cacheKey) || 0) + 1);
    
    // Update in database asynchronously
    this.db.updateMemoryAccess(entry.key, entry.namespace).catch(err => {
      this.emit('error', err);
    });
  }

  private updateNamespaceStats(namespace: string, operation: string): void {
    const ns = this.namespaces.get(namespace);
    if (ns) {
      ns.lastOperation = operation;
      ns.lastOperationTime = new Date();
    }
  }

  private matchesSearch(entry: MemoryEntry, options: MemorySearchOptions): boolean {
    if (options.namespace && entry.namespace !== options.namespace) {
      return false;
    }
    
    if (options.pattern) {
      const regex = new RegExp(options.pattern, 'i');
      return regex.test(entry.key) || regex.test(entry.value);
    }
    
    if (options.keyPrefix && !entry.key.startsWith(options.keyPrefix)) {
      return false;
    }
    
    if (options.minAccessCount && entry.accessCount < options.minAccessCount) {
      return false;
    }
    
    return true;
  }

  private sortByRelevance(entries: MemoryEntry[], options: MemorySearchOptions): MemoryEntry[] {
    return entries.sort((a, b) => {
      // Sort by access count (most accessed first)
      if (options.sortBy === 'access') {
        return b.accessCount - a.accessCount;
      }
      
      // Sort by recency (most recent first)
      if (options.sortBy === 'recent') {
        return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
      }
      
      // Default: sort by creation time
      return b.createdAt.getTime() - a.createdAt.getTime();
    }).slice(0, options.limit || 10);
  }

  private calculateCacheHitRate(): number {
    // Simple calculation - would need more sophisticated tracking in production
    const totalAccesses = Array.from(this.accessPatterns.values()).reduce((a, b) => a + b, 0);
    const cacheHits = this.cache.size;
    
    return totalAccesses > 0 ? (cacheHits / totalAccesses) * 100 : 0;
  }

  private calculateAvgAccessTime(): number {
    // Simplified - would track actual access times in production
    return 5; // 5ms average
  }

  private async getHotKeys(): Promise<string[]> {
    return Array.from(this.accessPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => key);
  }

  private async identifyCoAccessPatterns(accessData: [string, number][]): Promise<any[]> {
    // Simplified co-access pattern detection
    const patterns: any[] = [];
    
    for (let i = 0; i < accessData.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 5, accessData.length); j++) {
        if (Math.abs(accessData[i][1] - accessData[j][1]) < 10) {
          patterns.push({
            keys: [accessData[i][0], accessData[j][0]],
            confidence: 0.8,
            frequency: Math.min(accessData[i][1], accessData[j][1])
          });
        }
      }
    }
    
    return patterns;
  }

  private shouldCompress(entry: MemoryEntry): boolean {
    // Compress if: large size, old, and rarely accessed
    const ageInDays = (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const isOld = ageInDays > 7;
    const isLarge = entry.value.length > 10000;
    const isRarelyAccessed = entry.accessCount < 5;
    
    return isOld && isLarge && isRarelyAccessed;
  }

  private async compressEntry(entry: MemoryEntry): Promise<string> {
    // Simple compression - in production would use proper compression
    const compressed = {
      _compressed: true,
      _original_length: entry.value.length,
      data: entry.value // Would actually compress here
    };
    
    return JSON.stringify(compressed);
  }

  private async evictExpiredEntries(): Promise<void> {
    const now = Date.now();
    const toEvict: string[] = [];
    
    for (const [cacheKey, entry] of this.cache) {
      if (entry.ttl && entry.createdAt.getTime() + (entry.ttl * 1000) < now) {
        toEvict.push(cacheKey);
      }
    }
    
    for (const key of toEvict) {
      const entry = this.cache.get(key)!;
      await this.delete(entry.key, entry.namespace);
    }
  }

  private async manageCacheSize(): Promise<void> {
    const maxCacheSize = 1000;
    
    if (this.cache.size > maxCacheSize) {
      // Evict least recently used entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime());
      
      const toEvict = entries.slice(0, entries.length - maxCacheSize);
      
      for (const [cacheKey] of toEvict) {
        this.cache.delete(cacheKey);
      }
    }
  }

  private async compressOldEntries(): Promise<void> {
    const oldEntries = await this.db.getOldMemoryEntries(30); // 30 days old
    
    for (const entry of oldEntries) {
      if (this.shouldCompress(entry)) {
        const compressed = await this.compressEntry(entry);
        await this.store(
          entry.key,
          compressed,
          entry.namespace,
          entry.ttl
        );
      }
    }
  }

  private async optimizeNamespaces(): Promise<void> {
    for (const namespace of this.namespaces.values()) {
      const stats = await this.db.getNamespaceStats(namespace.name);
      
      // Apply retention policies
      if (namespace.retentionPolicy === 'time-based' && namespace.ttl) {
        await this.db.deleteOldEntries(namespace.name, namespace.ttl);
      }
      
      if (namespace.retentionPolicy === 'size-based' && namespace.maxEntries) {
        if (stats.entries > namespace.maxEntries) {
          await this.db.trimNamespace(namespace.name, namespace.maxEntries);
        }
      }
    }
  }

  /**
   * Shutdown memory system
   */
  async shutdown(): Promise<void> {
    this.isActive = false;
    
    // Save cache to database
    for (const entry of this.cache.values()) {
      await this.db.updateMemoryEntry(entry);
    }
    
    this.emit('shutdown');
  }
}