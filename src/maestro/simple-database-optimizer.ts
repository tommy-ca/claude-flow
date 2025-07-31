#!/usr/bin/env node
/**
 * Simplified Database Optimizer
 * Following KISS and SOLID principles
 */

import { promises as fs } from 'fs';
import Database from 'better-sqlite3';
import { IDatabaseOptimizer } from './interfaces';
import { DatabaseConfig, DatabaseResult } from './types';

/**
 * Simple Database Backup Manager - Single Responsibility
 */
class BackupManager {
  async createBackup(databasePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${databasePath}.backup-${timestamp}`;
    
    try {
      await fs.copyFile(databasePath, backupPath);
    } catch (error) {
      // Database might not exist yet, which is acceptable
      console.warn(`Backup skipped: ${error.message}`);
    }
  }
}

/**
 * Simple Schema Manager - Single Responsibility
 */
class SchemaManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  recreateTables(): number {
    const tables = [
      {
        name: 'agents',
        sql: `
          CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'idle',
            swarm_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now')),
            metadata TEXT
          )
        `
      },
      {
        name: 'tasks',
        sql: `
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            swarm_id TEXT,
            agent_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            completed_at INTEGER,
            metadata TEXT
          )
        `
      },
      {
        name: 'memory_entries',
        sql: `
          CREATE TABLE IF NOT EXISTS memory_entries (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL,
            namespace TEXT DEFAULT 'default',
            ttl INTEGER,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            accessed_at INTEGER DEFAULT (strftime('%s', 'now'))
          )
        `
      }
    ];

    // Drop and recreate tables
    tables.forEach(table => {
      this.db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
      this.db.prepare(table.sql).run();
    });

    return tables.length;
  }

  createIndexes(): number {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_agents_swarm ON agents(swarm_id)',
      'CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_swarm ON tasks(swarm_id)',
      'CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory_entries(namespace)'
    ];

    indexes.forEach(indexSql => {
      this.db.prepare(indexSql).run();
    });

    return indexes.length;
  }

  validateIntegrity(): boolean {
    try {
      // Simple validation - check if tables exist
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();

      const requiredTables = ['agents', 'tasks', 'memory_entries'];
      const existingTables = tables.map((t: any) => t.name);
      
      return requiredTables.every(table => existingTables.includes(table));
    } catch (error) {
      return false;
    }
  }
}

/**
 * Simple Conflict Resolver - Single Responsibility
 */
class ConflictResolver {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  resolveIndexConflicts(): number {
    const conflictingIndexes = [
      'idx_agents_swarm',
      'idx_agents_status', 
      'idx_tasks_status',
      'idx_tasks_swarm',
      'idx_memory_namespace'
    ];

    let resolved = 0;
    
    conflictingIndexes.forEach(indexName => {
      try {
        this.db.prepare(`DROP INDEX IF EXISTS ${indexName}`).run();
        resolved++;
      } catch (error) {
        // Index might not exist, continue
      }
    });

    return resolved;
  }
}

/**
 * Simple Database Optimizer - Composition over Inheritance
 */
export class SimpleDatabaseOptimizer implements IDatabaseOptimizer {
  private backupManager: BackupManager;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = {
      backupEnabled: true,
      validateData: true,
      forceRecreate: false,
      ...config
    };
    this.backupManager = new BackupManager();
  }

  async initializeWithMigration(): Promise<DatabaseResult> {
    const startTime = Date.now();
    const result: DatabaseResult = {
      success: false,
      conflictsResolved: 0,
      indexesRecreated: 0,
      dataValidated: false,
      migrationTime: 0,
      errors: []
    };

    try {
      // Step 1: Create backup if enabled
      if (this.config.backupEnabled) {
        await this.backupManager.createBackup(this.config.databasePath);
      }

      // Step 2: Initialize database
      const db = new Database(this.config.databasePath);
      
      try {
        // Step 3: Resolve conflicts
        const conflictResolver = new ConflictResolver(db);
        result.conflictsResolved = conflictResolver.resolveIndexConflicts();

        // Step 4: Recreate schema
        const schemaManager = new SchemaManager(db);
        schemaManager.recreateTables();
        result.indexesRecreated = schemaManager.createIndexes();

        // Step 5: Validate integrity
        if (this.config.validateData) {
          result.dataValidated = schemaManager.validateIntegrity();
        }

        result.success = true;
        result.migrationTime = Date.now() - startTime;

      } finally {
        db.close();
      }

    } catch (error) {
      result.errors.push(error.message);
    }

    return result;
  }

  async createBackup(): Promise<void> {
    await this.backupManager.createBackup(this.config.databasePath);
  }

  async validateIntegrity(): Promise<boolean> {
    try {
      const db = new Database(this.config.databasePath);
      const schemaManager = new SchemaManager(db);
      const isValid = schemaManager.validateIntegrity();
      db.close();
      return isValid;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Factory function following Dependency Inversion Principle
 */
export function createSimpleDatabaseOptimizer(config: DatabaseConfig): SimpleDatabaseOptimizer {
  return new SimpleDatabaseOptimizer(config);
}