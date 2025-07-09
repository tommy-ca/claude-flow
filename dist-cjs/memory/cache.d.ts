/**
 * Memory cache implementation with LRU eviction
 */
import type { MemoryEntry } from '../utils/types.js';
import type { ILogger } from '../core/logger.js';
/**
 * LRU cache for memory entries
 */
export declare class MemoryCache {
    private maxSize;
    private logger;
    private cache;
    private currentSize;
    private hits;
    private misses;
    constructor(maxSize: number, logger: ILogger);
    /**
     * Gets an entry from the cache
     */
    get(id: string): MemoryEntry | undefined;
    /**
     * Sets an entry in the cache
     */
    set(id: string, data: MemoryEntry, dirty?: boolean): void;
    /**
     * Deletes an entry from the cache
     */
    delete(id: string): void;
    /**
     * Gets entries by prefix
     */
    getByPrefix(prefix: string): MemoryEntry[];
    /**
     * Gets all dirty entries
     */
    getDirtyEntries(): MemoryEntry[];
    /**
     * Marks entries as clean
     */
    markClean(ids: string[]): void;
    /**
     * Gets all entries
     */
    getAllEntries(): MemoryEntry[];
    /**
     * Gets cache metrics
     */
    getMetrics(): {
        size: number;
        entries: number;
        hitRate: number;
        maxSize: number;
    };
    /**
     * Clears the cache
     */
    clear(): void;
    /**
     * Performs cache maintenance
     */
    performMaintenance(): void;
    private calculateSize;
    private evict;
}
//# sourceMappingURL=cache.d.ts.map