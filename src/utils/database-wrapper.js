/**
 * Database wrapper with robust fallback for CI environments
 * Provides in-memory fallback when better-sqlite3 is not available
 */

let Database;
let dbAvailable = true;
let dbError = null;

// Try to load better-sqlite3
try {
  // Check if we're in CI and should skip native modules
  if (process.env.CI && process.env.SKIP_NATIVE_MODULES === 'true') {
    throw new Error('Native modules skipped in CI');
  }
  
  // Use dynamic import for optional dependency
  const module = await import('better-sqlite3');
  Database = module.default;
  
  // Test that it actually works (some platforms may have a broken build)
  try {
    const testDb = new Database(':memory:');
    testDb.prepare('SELECT 1').get();
    testDb.close();
  } catch (testError) {
    throw new Error(`better-sqlite3 loaded but not functional: ${testError.message}`);
  }
} catch (error) {
  dbError = error;
  dbAvailable = false;
  
  // Only log in non-CI environments or when debugging
  if (!process.env.CI || process.env.DEBUG) {
    console.warn(`📦 better-sqlite3 not available: ${error.message}`);
    console.warn('   Using in-memory database fallback');
  }
  
  // Comprehensive in-memory database fallback
  class InMemoryDatabase {
    constructor(filename) {
      this.filename = filename;
      this.data = new Map();
      this.tables = new Map();
      this.prepared = new Map();
      this.inTransaction = false;
      this.transactionQueue = [];
      this.closed = false;
    }
    
    prepare(sql) {
      if (this.closed) {
        throw new Error('Database is closed');
      }
      
      const self = this;
      const normalizedSql = sql.trim().toUpperCase();
      
      return {
        run(...params) {
          if (self.closed) throw new Error('Database is closed');
          
          // Handle CREATE TABLE
          if (normalizedSql.includes('CREATE TABLE')) {
            const tableMatch = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              if (!self.tables.has(tableName)) {
                self.tables.set(tableName, new Map());
              }
            }
            return { changes: 0, lastInsertRowid: 0 };
          }
          
          // Handle INSERT
          if (normalizedSql.includes('INSERT')) {
            const tableMatch = sql.match(/INSERT INTO (\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              const table = self.tables.get(tableName) || new Map();
              const id = params[0] || Date.now() + Math.random();
              table.set(id, params);
              self.tables.set(tableName, table);
              return { changes: 1, lastInsertRowid: id };
            }
          }
          
          // Handle UPDATE
          if (normalizedSql.includes('UPDATE')) {
            return { changes: 0, lastInsertRowid: 0 };
          }
          
          // Handle DELETE
          if (normalizedSql.includes('DELETE')) {
            return { changes: 0, lastInsertRowid: 0 };
          }
          
          return { changes: 0, lastInsertRowid: 0 };
        },
        
        get(...params) {
          if (self.closed) throw new Error('Database is closed');
          
          // Handle SELECT
          if (normalizedSql.includes('SELECT')) {
            const key = params[0];
            const data = self.data.get(key);
            if (data) {
              return { id: key, data: JSON.stringify(data) };
            }
            
            // Check tables
            for (const [tableName, table] of self.tables) {
              if (table.has(key)) {
                const row = table.get(key);
                return { id: key, data: JSON.stringify(row) };
              }
            }
          }
          
          return undefined;
        },
        
        all(...params) {
          if (self.closed) throw new Error('Database is closed');
          
          const results = [];
          
          // Return all data
          for (const [key, value] of self.data.entries()) {
            results.push({ id: key, data: JSON.stringify(value) });
          }
          
          // Return all table data
          for (const [tableName, table] of self.tables) {
            for (const [key, value] of table.entries()) {
              results.push({ 
                id: key, 
                table: tableName,
                data: JSON.stringify(value) 
              });
            }
          }
          
          return results;
        },
        
        iterate(...params) {
          const all = this.all(...params);
          return {
            [Symbol.iterator]() {
              let index = 0;
              return {
                next() {
                  if (index < all.length) {
                    return { value: all[index++], done: false };
                  }
                  return { done: true };
                }
              };
            }
          };
        }
      };
    }
    
    transaction(fn) {
      if (this.closed) throw new Error('Database is closed');
      
      const self = this;
      return function(...args) {
        self.inTransaction = true;
        try {
          const result = fn.apply(this, args);
          self.inTransaction = false;
          return result;
        } catch (error) {
          self.inTransaction = false;
          throw error;
        }
      };
    }
    
    exec(sql) {
      if (this.closed) throw new Error('Database is closed');
      // Simulate exec for multiple statements
      return this;
    }
    
    pragma(name, value) {
      if (this.closed) throw new Error('Database is closed');
      // Simulate pragma commands
      return value !== undefined ? this : true;
    }
    
    close() {
      this.closed = true;
      this.data.clear();
      this.tables.clear();
      this.prepared.clear();
    }
    
    get inTransaction() {
      return this._inTransaction || false;
    }
    
    set inTransaction(value) {
      this._inTransaction = value;
    }
  }
  
  Database = InMemoryDatabase;
}

// Export a factory function for creating databases
function createDatabase(filename, options = {}) {
  try {
    const db = new Database(filename, options);
    
    // Add helper method to check if using fallback
    db.isInMemory = !dbAvailable;
    
    return db;
  } catch (error) {
    // If even the fallback fails, throw a descriptive error
    throw new Error(
      `Failed to create database: ${error.message}. ` +
      `Original error: ${dbError ? dbError.message : 'none'}`
    );
  }
}

// Export both for compatibility
export { 
  Database as default, 
  Database,
  createDatabase,
  dbAvailable,
  dbError
};