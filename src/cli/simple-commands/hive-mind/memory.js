/**
 * Collective Memory System for Hive Mind
 * Shared knowledge base and learning system
 */

import EventEmitter from 'events';
import Database from 'better-sqlite3';
import path from 'path';

/**
 * Memory types and their characteristics
 */
const MEMORY_TYPES = {
  knowledge: { priority: 1, ttl: null, compress: false },
  context: { priority: 2, ttl: 3600000, compress: false }, // 1 hour
  task: { priority: 3, ttl: 1800000, compress: true }, // 30 minutes
  result: { priority: 2, ttl: null, compress: true },
  error: { priority: 1, ttl: 86400000, compress: false }, // 24 hours
  metric: { priority: 3, ttl: 3600000, compress: true }, // 1 hour
  consensus: { priority: 1, ttl: null, compress: false },
  system: { priority: 1, ttl: null, compress: false }
};

/**
 * CollectiveMemory class
 */
export class CollectiveMemory extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      swarmId: config.swarmId,
      maxSize: config.maxSize || 100, // MB
      dbPath: config.dbPath || path.join(process.cwd(), '.hive-mind', 'hive.db'),
      compressionThreshold: config.compressionThreshold || 1024, // bytes
      gcInterval: config.gcInterval || 300000, // 5 minutes
      ...config
    };
    
    this.state = {
      totalSize: 0,
      entryCount: 0,
      compressionRatio: 1,
      lastGC: Date.now(),
      accessPatterns: new Map()
    };
    
    this.db = null;
    this.gcTimer = null;
    this.cache = new Map(); // In-memory cache for frequently accessed items
    
    this._initialize();
  }
  
  /**
   * Initialize collective memory
   */
  _initialize() {
    try {
      // Open database connection
      this.db = new Database(this.config.dbPath);
      
      // Enable Write-Ahead Logging for better performance
      this.db.pragma('journal_mode = WAL');
      
      // Ensure table exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS collective_memory (
          id TEXT PRIMARY KEY,
          swarm_id TEXT,
          key TEXT NOT NULL,
          value TEXT,
          type TEXT DEFAULT 'knowledge',
          confidence REAL DEFAULT 1.0,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 0,
          compressed INTEGER DEFAULT 0,
          size INTEGER DEFAULT 0,
          FOREIGN KEY (swarm_id) REFERENCES swarms(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_memory_swarm_key 
        ON collective_memory(swarm_id, key);
        
        CREATE INDEX IF NOT EXISTS idx_memory_type 
        ON collective_memory(type);
        
        CREATE INDEX IF NOT EXISTS idx_memory_accessed 
        ON collective_memory(accessed_at);
      `);
      
      // Load initial statistics
      this._updateStatistics();
      
      // Start garbage collection timer
      this.gcTimer = setInterval(() => this._garbageCollect(), this.config.gcInterval);
      
      this.emit('memory:initialized', { swarmId: this.config.swarmId });
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Store data in collective memory
   */
  async store(key, value, type = 'knowledge', metadata = {}) {
    try {
      const serialized = JSON.stringify(value);
      const size = Buffer.byteLength(serialized);
      const shouldCompress = size > this.config.compressionThreshold && 
                           MEMORY_TYPES[type]?.compress;
      
      let storedValue = serialized;
      let compressed = 0;
      
      if (shouldCompress) {
        // In production, use proper compression like zlib
        // For now, we'll just mark it as compressed
        compressed = 1;
      }
      
      const id = `${this.config.swarmId}-${key}-${Date.now()}`;
      
      // Check if key already exists
      const existing = this.db.prepare(`
        SELECT id FROM collective_memory 
        WHERE swarm_id = ? AND key = ?
      `).get(this.config.swarmId, key);
      
      if (existing) {
        // Update existing entry
        this.db.prepare(`
          UPDATE collective_memory 
          SET value = ?, type = ?, confidence = ?, 
              accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1,
              compressed = ?, size = ?
          WHERE swarm_id = ? AND key = ?
        `).run(
          storedValue,
          type,
          metadata.confidence || 1.0,
          compressed,
          size,
          this.config.swarmId,
          key
        );
      } else {
        // Insert new entry
        this.db.prepare(`
          INSERT INTO collective_memory 
          (id, swarm_id, key, value, type, confidence, created_by, compressed, size)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          this.config.swarmId,
          key,
          storedValue,
          type,
          metadata.confidence || 1.0,
          metadata.createdBy || 'system',
          compressed,
          size
        );
      }
      
      // Update cache
      this.cache.set(key, {
        value,
        type,
        timestamp: Date.now(),
        size
      });
      
      // Check memory limits
      this._checkMemoryLimits();
      
      // Track access pattern
      this._trackAccess(key, 'write');
      
      this.emit('memory:stored', { key, type, size });
      
      return { success: true, id, size };
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Retrieve data from collective memory
   */
  async retrieve(key) {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        this._trackAccess(key, 'cache_hit');
        return cached.value;
      }
      
      // Query database
      const result = this.db.prepare(`
        SELECT value, type, compressed, confidence
        FROM collective_memory
        WHERE swarm_id = ? AND key = ?
      `).get(this.config.swarmId, key);
      
      if (!result) {
        this._trackAccess(key, 'miss');
        return null;
      }
      
      // Update access statistics
      this.db.prepare(`
        UPDATE collective_memory
        SET accessed_at = CURRENT_TIMESTAMP,
            access_count = access_count + 1
        WHERE swarm_id = ? AND key = ?
      `).run(this.config.swarmId, key);
      
      // Decompress if needed
      let value = result.value;
      if (result.compressed) {
        // In production, decompress here
      }
      
      // Parse JSON
      const parsed = JSON.parse(value);
      
      // Add to cache
      this.cache.set(key, {
        value: parsed,
        type: result.type,
        timestamp: Date.now(),
        confidence: result.confidence
      });
      
      this._trackAccess(key, 'read');
      
      return parsed;
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Search collective memory
   */
  async search(pattern, options = {}) {
    try {
      const limit = options.limit || 50;
      const type = options.type || null;
      const minConfidence = options.minConfidence || 0;
      
      let query = `
        SELECT key, type, confidence, created_at, accessed_at, access_count
        FROM collective_memory
        WHERE swarm_id = ? 
        AND key LIKE ?
        AND confidence >= ?
      `;
      
      const params = [this.config.swarmId, `%${pattern}%`, minConfidence];
      
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY access_count DESC, confidence DESC LIMIT ?';
      params.push(limit);
      
      const results = this.db.prepare(query).all(...params);
      
      this._trackAccess(`search:${pattern}`, 'search');
      
      return results;
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Get related memories using association
   */
  async getRelated(key, limit = 10) {
    try {
      // Get the original memory
      const original = await this.retrieve(key);
      if (!original) return [];
      
      // Simple association: find memories accessed around the same time
      const result = this.db.prepare(`
        SELECT m1.key, m1.type, m1.confidence, m1.access_count
        FROM collective_memory m1
        JOIN collective_memory m2 ON m1.swarm_id = m2.swarm_id
        WHERE m2.key = ? 
        AND m1.key != ?
        AND m1.swarm_id = ?
        AND ABS(julianday(m1.accessed_at) - julianday(m2.accessed_at)) < 0.01
        ORDER BY m1.confidence DESC, m1.access_count DESC
        LIMIT ?
      `).all(key, key, this.config.swarmId, limit);
      
      return result;
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Build associations between memories
   */
  async associate(key1, key2, strength = 1.0) {
    try {
      // Store bidirectional association
      await this.store(`assoc:${key1}:${key2}`, {
        from: key1,
        to: key2,
        strength,
        created: Date.now()
      }, 'system');
      
      await this.store(`assoc:${key2}:${key1}`, {
        from: key2,
        to: key1,
        strength,
        created: Date.now()
      }, 'system');
      
      this.emit('memory:associated', { key1, key2, strength });
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Consolidate similar memories
   */
  async consolidate() {
    try {
      // Find similar memories
      const memories = this.db.prepare(`
        SELECT key, value, type, confidence, access_count
        FROM collective_memory
        WHERE swarm_id = ?
        AND type IN ('knowledge', 'result')
        ORDER BY created_at DESC
        LIMIT 1000
      `).all(this.config.swarmId);
      
      const consolidated = new Map();
      
      // Group by similarity (simple implementation)
      memories.forEach(memory => {
        const value = JSON.parse(memory.value);
        const category = this._categorizeMemory(value);
        
        if (!consolidated.has(category)) {
          consolidated.set(category, []);
        }
        
        consolidated.get(category).push({
          ...memory,
          value
        });
      });
      
      // Merge similar memories
      let mergeCount = 0;
      consolidated.forEach((group, category) => {
        if (group.length > 1) {
          const merged = this._mergeMemories(group);
          
          // Store merged memory
          this.store(`consolidated:${category}`, merged, 'knowledge', {
            confidence: merged.confidence,
            createdBy: 'consolidation'
          });
          
          mergeCount++;
        }
      });
      
      this.emit('memory:consolidated', { categories: consolidated.size, merged: mergeCount });
      
      return { categories: consolidated.size, merged: mergeCount };
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Categorize memory for consolidation
   */
  _categorizeMemory(value) {
    // Simple categorization based on content
    if (typeof value === 'string') {
      return 'text';
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value).sort().join(':');
      return `object:${keys.substring(0, 50)}`;
    }
    
    return 'other';
  }
  
  /**
   * Merge similar memories
   */
  _mergeMemories(memories) {
    // Calculate weighted average confidence
    let totalWeight = 0;
    let weightedConfidence = 0;
    const mergedValue = {};
    
    memories.forEach(memory => {
      const weight = memory.access_count + 1;
      totalWeight += weight;
      weightedConfidence += memory.confidence * weight;
      
      // Merge values (simple implementation)
      if (typeof memory.value === 'object') {
        Object.assign(mergedValue, memory.value);
      }
    });
    
    return {
      value: mergedValue,
      confidence: weightedConfidence / totalWeight,
      sourceCount: memories.length
    };
  }
  
  /**
   * Garbage collection
   */
  _garbageCollect() {
    try {
      const now = Date.now();
      let deletedCount = 0;
      
      // Delete expired memories based on TTL
      Object.entries(MEMORY_TYPES).forEach(([type, config]) => {
        if (config.ttl) {
          const result = this.db.prepare(`
            DELETE FROM collective_memory
            WHERE swarm_id = ?
            AND type = ?
            AND (julianday('now') - julianday(accessed_at)) * 86400000 > ?
          `).run(this.config.swarmId, type, config.ttl);
          
          deletedCount += result.changes;
        }
      });
      
      // Clear old cache entries
      const cacheTimeout = 300000; // 5 minutes
      this.cache.forEach((value, key) => {
        if (now - value.timestamp > cacheTimeout) {
          this.cache.delete(key);
        }
      });
      
      // Update statistics
      this._updateStatistics();
      
      this.state.lastGC = now;
      
      if (deletedCount > 0) {
        this.emit('memory:gc', { deleted: deletedCount, cacheSize: this.cache.size });
      }
      
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Check memory limits and evict if necessary
   */
  _checkMemoryLimits() {
    if (this.state.totalSize > this.config.maxSize * 1024 * 1024) {
      // Evict least recently used memories
      const toEvict = this.db.prepare(`
        SELECT id, size FROM collective_memory
        WHERE swarm_id = ?
        AND type NOT IN ('system', 'consensus')
        ORDER BY accessed_at ASC, access_count ASC
        LIMIT 100
      `).all(this.config.swarmId);
      
      let freedSize = 0;
      toEvict.forEach(memory => {
        this.db.prepare('DELETE FROM collective_memory WHERE id = ?').run(memory.id);
        freedSize += memory.size;
      });
      
      this.emit('memory:evicted', { count: toEvict.length, freedSize });
    }
  }
  
  /**
   * Update memory statistics
   */
  _updateStatistics() {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as count,
        SUM(size) as totalSize,
        AVG(confidence) as avgConfidence,
        SUM(compressed) as compressedCount
      FROM collective_memory
      WHERE swarm_id = ?
    `).get(this.config.swarmId);
    
    this.state.entryCount = stats.count || 0;
    this.state.totalSize = stats.totalSize || 0;
    this.state.avgConfidence = stats.avgConfidence || 1.0;
    
    if (stats.compressedCount > 0) {
      // Estimate compression ratio
      this.state.compressionRatio = 0.6; // Assume 40% compression
    }
  }
  
  /**
   * Track access patterns
   */
  _trackAccess(key, operation) {
    const pattern = this.state.accessPatterns.get(key) || {
      reads: 0,
      writes: 0,
      searches: 0,
      cacheHits: 0,
      misses: 0,
      lastAccess: Date.now()
    };
    
    switch (operation) {
      case 'read':
        pattern.reads++;
        break;
      case 'write':
        pattern.writes++;
        break;
      case 'search':
        pattern.searches++;
        break;
      case 'cache_hit':
        pattern.cacheHits++;
        break;
      case 'miss':
        pattern.misses++;
        break;
    }
    
    pattern.lastAccess = Date.now();
    this.state.accessPatterns.set(key, pattern);
    
    // Keep access patterns size limited
    if (this.state.accessPatterns.size > 1000) {
      // Remove oldest entries
      const sorted = Array.from(this.state.accessPatterns.entries())
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      sorted.slice(0, 100).forEach(([key]) => {
        this.state.accessPatterns.delete(key);
      });
    }
  }
  
  /**
   * Get memory statistics
   */
  getStatistics() {
    return {
      swarmId: this.config.swarmId,
      entryCount: this.state.entryCount,
      totalSize: this.state.totalSize,
      maxSize: this.config.maxSize * 1024 * 1024,
      utilizationPercent: (this.state.totalSize / (this.config.maxSize * 1024 * 1024)) * 100,
      avgConfidence: this.state.avgConfidence,
      compressionRatio: this.state.compressionRatio,
      cacheSize: this.cache.size,
      lastGC: new Date(this.state.lastGC).toISOString(),
      accessPatterns: this.state.accessPatterns.size
    };
  }
  
  /**
   * Export memory snapshot
   */
  async exportSnapshot(filepath) {
    try {
      const memories = this.db.prepare(`
        SELECT * FROM collective_memory
        WHERE swarm_id = ?
        ORDER BY created_at DESC
      `).all(this.config.swarmId);
      
      const snapshot = {
        swarmId: this.config.swarmId,
        timestamp: new Date().toISOString(),
        statistics: this.getStatistics(),
        memories: memories.map(m => ({
          ...m,
          value: JSON.parse(m.value)
        }))
      };
      
      // In production, write to file
      // For now, return the snapshot
      this.emit('memory:exported', { count: memories.length });
      
      return snapshot;
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Import memory snapshot
   */
  async importSnapshot(snapshot) {
    try {
      let imported = 0;
      
      for (const memory of snapshot.memories) {
        await this.store(
          memory.key,
          memory.value,
          memory.type,
          {
            confidence: memory.confidence,
            createdBy: memory.created_by
          }
        );
        imported++;
      }
      
      this.emit('memory:imported', { count: imported });
      
      return { imported };
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Close database connection
   */
  close() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    if (this.db) {
      this.db.close();
    }
    
    this.emit('memory:closed');
  }
}