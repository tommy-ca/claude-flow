/**
 * SQLite Wrapper with Windows Fallback Support
 * Provides graceful fallback when better-sqlite3 fails to load
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let Database = null;
let sqliteAvailable = false;
let loadError = null;

/**
 * Try to load better-sqlite3 with comprehensive error handling and timeout
 */
async function tryLoadSQLite() {
  const loadTimeout = 5000; // 5 second timeout for loading SQLite
  
  try {
    console.log('[SQLiteWrapper] Attempting to load SQLite module...');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SQLite module loading timeout')), loadTimeout);
    });

    // Try CommonJS require first (more reliable in Node.js)
    const loadPromise = (async () => {
      try {
        console.log('[SQLiteWrapper] Trying CommonJS require...');
        const require = createRequire(import.meta.url);
        Database = require('better-sqlite3');
        console.log('[SQLiteWrapper] CommonJS require successful');
        sqliteAvailable = true;
        return true;
      } catch (requireErr) {
        console.log('[SQLiteWrapper] CommonJS require failed, trying ES module import...');
        // Fallback to ES module import
        try {
          const module = await import('better-sqlite3');
          Database = module.default;
          console.log('[SQLiteWrapper] ES module import successful');
          sqliteAvailable = true;
          return true;
        } catch (importErr) {
          console.log('[SQLiteWrapper] ES module import failed');
          loadError = importErr;
          throw importErr;
        }
      }
    })();

    // Race between loading and timeout
    await Promise.race([loadPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error('[SQLiteWrapper] Failed to load SQLite:', error.message);
    loadError = error;
    
    // Check for specific Windows errors
    if (error.message.includes('was compiled against a different Node.js version') ||
        error.message.includes('Could not locate the bindings file') ||
        error.message.includes('The specified module could not be found') ||
        error.message.includes('timeout') ||
        error.code === 'MODULE_NOT_FOUND') {
        
        console.warn(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     Windows SQLite Installation Issue                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  The native SQLite module failed to load. This is common on Windows when    ║
║  using 'npx' or when node-gyp build tools are not available.               ║
║                                                                              ║
║  Claude Flow will continue with in-memory storage (non-persistent).         ║
║                                                                              ║
║  To enable persistent storage on Windows:                                    ║
║                                                                              ║
║  Option 1 - Install Windows Build Tools:                                    ║
║  > npm install --global windows-build-tools                                 ║
║  > npm install claude-flow@alpha                                           ║
║                                                                              ║
║  Option 2 - Use Pre-built Binaries:                                        ║
║  > npm config set python python3                                           ║
║  > npm install claude-flow@alpha --build-from-source=false                 ║
║                                                                              ║
║  Option 3 - Use WSL (Windows Subsystem for Linux):                         ║
║  Install WSL and run Claude Flow inside a Linux environment                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
      }
      
      return false;
    }
  }

/**
 * Check if SQLite is available
 */
export async function isSQLiteAvailable() {
  if (sqliteAvailable !== null) {
    return sqliteAvailable;
  }
  
  await tryLoadSQLite();
  return sqliteAvailable;
}

/**
 * Get SQLite Database constructor or null
 */
export async function getSQLiteDatabase() {
  if (!sqliteAvailable && loadError === null) {
    await tryLoadSQLite();
  }
  
  return Database;
}

/**
 * Get the load error if any
 */
export function getLoadError() {
  return loadError;
}

/**
 * Create a SQLite database instance with fallback
 */
export async function createDatabase(dbPath) {
  const DB = await getSQLiteDatabase();
  
  if (!DB) {
    throw new Error('SQLite is not available. Use fallback storage instead.');
  }
  
  try {
    return new DB(dbPath);
  } catch (err) {
    // Additional Windows-specific error handling
    if (err.message.includes('EPERM') || err.message.includes('access denied')) {
      throw new Error(`Cannot create database at ${dbPath}. Permission denied. Try using a different directory or running with administrator privileges.`);
    }
    throw err;
  }
}

/**
 * Check if running on Windows
 */
export function isWindows() {
  return process.platform === 'win32';
}

/**
 * Get platform-specific storage recommendations
 */
export function getStorageRecommendations() {
  if (isWindows()) {
    return {
      recommended: 'in-memory',
      reason: 'Windows native module compatibility',
      alternatives: [
        'Install Windows build tools for SQLite support',
        'Use WSL (Windows Subsystem for Linux)',
        'Use Docker container with Linux'
      ]
    };
  }
  
  return {
    recommended: 'sqlite',
    reason: 'Best performance and persistence',
    alternatives: ['in-memory for testing']
  };
}

// Pre-load SQLite on module import
tryLoadSQLite().catch(() => {
  // Silently handle initial load failure
});

export default {
  isSQLiteAvailable,
  getSQLiteDatabase,
  getLoadError,
  createDatabase,
  isWindows,
  getStorageRecommendations
};