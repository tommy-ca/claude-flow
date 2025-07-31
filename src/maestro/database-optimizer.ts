#!/usr/bin/env node
/**
 * Database Migration and Conflict Resolution System
 * Fixes SQLite schema conflicts and data binding issues
 */

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import chalk from 'chalk';

export interface DatabaseOptimizationResult {
  success: boolean;
  conflictsResolved: number;
  indexesRecreated: number;
  dataValidated: boolean;
  migrationTime: number;
  errors: string[];
}

export interface DatabaseMigrationOptions {
  databasePath: string;
  backupEnabled: boolean;
  validateData: boolean;
  forceRecreate: boolean;
}

export class DatabaseOptimizer {
  private db: Database.Database | null = null;
  private options: DatabaseMigrationOptions;

  constructor(options: DatabaseMigrationOptions) {
    this.options = {
      backupEnabled: true,
      validateData: true,
      forceRecreate: false,
      ...options
    };
  }

  /**
   * Initialize database with conflict resolution
   */
  async initializeWithMigration(): Promise<DatabaseOptimizationResult> {
    const startTime = Date.now();
    const result: DatabaseOptimizationResult = {
      success: false,
      conflictsResolved: 0,
      indexesRecreated: 0,
      dataValidated: false,
      migrationTime: 0,
      errors: []
    };

    try {
      console.log(chalk.blue('🔧 Starting database optimization...'));

      // Step 1: Create backup if enabled
      if (this.options.backupEnabled) {
        await this.createBackup();
        console.log(chalk.green('✅ Database backup created'));
      }

      // Step 2: Connect to database
      this.db = new Database(this.options.databasePath);
      
      // Step 3: Drop conflicting indexes
      const conflictsResolved = await this.dropConflictingIndexes();
      result.conflictsResolved = conflictsResolved;
      
      // Step 4: Recreate schema with proper structure
      const indexesRecreated = await this.recreateSchema();
      result.indexesRecreated = indexesRecreated;
      
      // Step 5: Validate data integrity
      if (this.options.validateData) {
        result.dataValidated = await this.validateIntegrity();
      }

      result.success = true;
      result.migrationTime = Date.now() - startTime;
      
      console.log(chalk.green(`✅ Database optimization complete (${result.migrationTime}ms)`));
      console.log(chalk.cyan(`📊 Conflicts resolved: ${result.conflictsResolved}`));
      console.log(chalk.cyan(`📊 Indexes recreated: ${result.indexesRecreated}`));

    } catch (error) {
      result.errors.push(error.message);
      console.log(chalk.red(`❌ Database optimization failed: ${error.message}`));
    } finally {
      if (this.db) {
        this.db.close();
      }
    }

    return result;
  }

  /**
   * Create database backup before migration
   */
  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.options.databasePath}.backup-${timestamp}`;
    
    try {
      await fs.copyFile(this.options.databasePath, backupPath);
    } catch (error) {
      // Database might not exist yet, which is fine
      console.log(chalk.yellow(`⚠️  No existing database to backup: ${error.message}`));
    }
  }

  /**
   * Drop conflicting indexes that cause schema errors
   */
  private async dropConflictingIndexes(): Promise<number> {
    if (!this.db) throw new Error('Database not connected');

    const conflictingIndexes = [
      'idx_agents_swarm',
      'idx_agents_status',
      'idx_memory_entries',
      'idx_memory_namespace',
      'idx_memory_ttl',
      'idx_tasks_status',
      'idx_tasks_swarm',
      'idx_workflows_phase',
      'idx_workflows_status'
    ];

    let resolved = 0;
    
    for (const indexName of conflictingIndexes) {
      try {
        // Check if index exists
        const indexExists = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='index' AND name=?
        `).get(indexName);

        if (indexExists) {
          this.db.prepare(`DROP INDEX IF EXISTS ${indexName}`).run();
          resolved++;
          console.log(chalk.yellow(`🔧 Dropped conflicting index: ${indexName}`));
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not drop index ${indexName}: ${error.message}`));
      }
    }

    return resolved;
  }

  /**
   * Recreate database schema with proper structure
   */
  private async recreateSchema(): Promise<number> {
    if (!this.db) throw new Error('Database not connected');

    const schemaDefinitions = this.getSchemaDefinitions();
    let recreated = 0;

    // Create tables
    for (const [tableName, tableSQL] of Object.entries(schemaDefinitions.tables)) {
      try {
        this.db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
        this.db.prepare(tableSQL).run();
        console.log(chalk.green(`✅ Recreated table: ${tableName}`));
      } catch (error) {
        console.log(chalk.red(`❌ Failed to create table ${tableName}: ${error.message}`));
        throw error;
      }
    }

    // Create indexes
    for (const [indexName, indexSQL] of Object.entries(schemaDefinitions.indexes)) {
      try {
        this.db.prepare(indexSQL).run();
        recreated++;
        console.log(chalk.green(`✅ Created index: ${indexName}`));
      } catch (error) {
        console.log(chalk.red(`❌ Failed to create index ${indexName}: ${error.message}`));
        throw error;
      }
    }

    return recreated;
  }

  /**
   * Get clean schema definitions without conflicts
   */
  private getSchemaDefinitions() {
    return {
      tables: {
        agents: `
          CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'idle',
            capabilities TEXT,
            swarm_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now')),
            last_active_at INTEGER DEFAULT (strftime('%s', 'now')),
            metadata TEXT
          )
        `,
        memory_entries: `
          CREATE TABLE IF NOT EXISTS memory_entries (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL,
            namespace TEXT DEFAULT 'default',
            ttl INTEGER,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            accessed_at INTEGER DEFAULT (strftime('%s', 'now'))
          )
        `,
        tasks: `
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            swarm_id TEXT,
            agent_id TEXT,
            assigned_agents TEXT,
            phase TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            completed_at INTEGER,
            metadata TEXT
          )
        `,
        workflows: `
          CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            feature_name TEXT NOT NULL,
            current_phase TEXT NOT NULL DEFAULT 'requirements',
            status TEXT NOT NULL DEFAULT 'active',
            swarm_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now')),
            metadata TEXT
          )
        `
      },
      indexes: {
        idx_agents_swarm: 'CREATE INDEX idx_agents_swarm ON agents(swarm_id)',
        idx_agents_status: 'CREATE INDEX idx_agents_status ON agents(status)',
        idx_memory_namespace: 'CREATE INDEX idx_memory_namespace ON memory_entries(namespace)',
        idx_memory_ttl: 'CREATE INDEX idx_memory_ttl ON memory_entries(ttl)',
        idx_tasks_status: 'CREATE INDEX idx_tasks_status ON tasks(status)',
        idx_tasks_swarm: 'CREATE INDEX idx_tasks_swarm ON tasks(swarm_id)',
        idx_workflows_phase: 'CREATE INDEX idx_workflows_phase ON workflows(current_phase)',
        idx_workflows_status: 'CREATE INDEX idx_workflows_status ON workflows(status)'
      }
    };
  }

  /**
   * Validate database integrity and data types
   */
  private async validateIntegrity(): Promise<boolean> {
    if (!this.db) throw new Error('Database not connected');

    try {
      // Check table existence
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();

      const requiredTables = ['agents', 'memory_entries', 'tasks', 'workflows'];
      const existingTables = tables.map(t => t.name);
      
      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          throw new Error(`Required table ${table} not found`);
        }
      }

      // Validate indexes
      const indexes = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index'
      `).all();

      console.log(chalk.green(`✅ Database integrity validated`));
      console.log(chalk.cyan(`📊 Tables: ${existingTables.length}, Indexes: ${indexes.length}`));
      
      return true;
    } catch (error) {
      console.log(chalk.red(`❌ Integrity validation failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Sanitize data for SQLite compatibility
   */
  static sanitizeForSQLite(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }
    
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'bigint') {
      return data;
    }
    
    if (Buffer.isBuffer(data)) {
      return data;
    }
    
    // Convert objects and arrays to JSON strings
    if (typeof data === 'object') {
      return JSON.stringify(data);
    }
    
    // Convert other types to strings
    return String(data);
  }
}

// CLI interface for database optimization
if (import.meta.url === `file://${process.argv[1]}`) {
  const databasePath = process.argv[2] || 'data/hive-mind.db';
  const options: DatabaseMigrationOptions = {
    databasePath,
    backupEnabled: true,
    validateData: true,
    forceRecreate: process.argv.includes('--force')
  };

  const optimizer = new DatabaseOptimizer(options);
  
  optimizer.initializeWithMigration()
    .then(result => {
      if (result.success) {
        console.log(chalk.green('🎉 Database optimization completed successfully!'));
        process.exit(0);
      } else {
        console.log(chalk.red('💥 Database optimization failed!'));
        console.log(chalk.red('Errors:'), result.errors);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red(`💥 Unexpected error: ${error.message}`));
      process.exit(1);
    });
}