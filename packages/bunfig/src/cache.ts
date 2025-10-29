import type { CacheOptions, PerformanceMetrics } from './types'
import { existsSync, statSync } from 'node:fs'

/**
 * Cache entry with metadata
 */
interface CacheEntry<T = unknown> {
  value: T
  timestamp: Date
  ttl: number
  hits: number
  size: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number
  maxSize: number
  hitRate: number
  totalHits: number
  totalMisses: number
  entries: number
  oldestEntry?: Date
  newestEntry?: Date
}

/**
 * Configuration cache implementation
 */
export class ConfigCache {
  private cache = new Map<string, CacheEntry>()
  private totalHits = 0
  private totalMisses = 0
  private readonly options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      keyPrefix: 'bunfig:',
      ...options,
    }
  }

  /**
   * Generate cache key for configuration
   */
  private generateKey(configName: string, configPath?: string): string {
    const pathKey = configPath ? `:${configPath}` : ''
    return `${this.options.keyPrefix}${configName}${pathKey}`
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now()
    const age = now - entry.timestamp.getTime()
    const expired = age > entry.ttl
    return expired
  }

  /**
   * Estimate size of value for cache management
   */
  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length
    }
    catch {
      return 1000 // Fallback estimate for non-serializable values
    }
  }

  /**
   * Evict old entries when cache is full
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.options.maxSize) {
      return
    }

    // Sort entries by last access time (LRU eviction)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())

    // Remove oldest entries until we're under the limit
    const toRemove = entries.length - this.options.maxSize + 1
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  /**
   * Set cache entry
   */
  set<T>(
    configName: string,
    value: T,
    configPath?: string,
    customTtl?: number,
  ): void {
    if (!this.options.enabled) {
      return
    }

    const key = this.generateKey(configName, configPath)
    const ttl = customTtl ?? this.options.ttl
    const size = this.estimateSize(value)

    this.cache.set(key, {
      value,
      timestamp: new Date(),
      ttl,
      hits: 0,
      size,
    })

    this.evictIfNeeded()
  }

  /**
   * Get cache entry
   */
  get<T>(configName: string, configPath?: string): T | undefined {
    if (!this.options.enabled) {
      this.totalMisses++
      return undefined
    }

    const key = this.generateKey(configName, configPath)
    const entry = this.cache.get(key)

    if (!entry) {
      this.totalMisses++
      return undefined
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.totalMisses++
      return undefined
    }

    // Update access statistics
    entry.hits++
    this.totalHits++

    return entry.value as T
  }

  /**
   * Check if file has changed since cached
   */
  isFileModified(configPath: string, cachedTimestamp: Date): boolean {
    try {
      if (!existsSync(configPath)) {
        return true // File was deleted
      }

      const stats = statSync(configPath)
      return stats.mtime > cachedTimestamp
    }
    catch {
      // If we can't check the file, assume it's modified
      return true
    }
  }

  /**
   * Get cache entry with file modification check
   */
  getWithFileCheck<T>(configName: string, configPath: string): T | undefined {
    const cached = this.get<{ value: T, fileTimestamp: Date }>(configName, configPath)

    if (!cached) {
      return undefined
    }

    // Check if file has been modified since cache
    if (this.isFileModified(configPath, cached.fileTimestamp)) {
      this.delete(configName, configPath)
      return undefined
    }

    return cached.value
  }

  /**
   * Set cache entry with file timestamp
   */
  setWithFileCheck<T>(configName: string, value: T, configPath: string, customTtl?: number): void {
    try {
      const stats = existsSync(configPath) ? statSync(configPath) : null
      const fileTimestamp = stats ? stats.mtime : new Date()

      this.set(
        configName,
        { value, fileTimestamp },
        configPath,
        customTtl,
      )
    }
    catch {
      // If we can't get file stats, cache without file check
      this.set(configName, value, configPath, customTtl)
    }
  }

  /**
   * Delete cache entry
   */
  delete(configName: string, configPath?: string): boolean {
    const key = this.generateKey(configName, configPath)
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.totalHits = 0
    this.totalMisses = 0
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    let cleaned = 0
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        cleaned++
      }
    }
    return cleaned
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0)
    const timestamps = entries.map(entry => entry.timestamp).sort()

    return {
      size: totalSize,
      maxSize: this.options.maxSize,
      hitRate: this.totalHits + this.totalMisses > 0
        ? this.totalHits / (this.totalHits + this.totalMisses)
        : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      entries: this.cache.size,
      oldestEntry: timestamps[0],
      newestEntry: timestamps[timestamps.length - 1],
    }
  }

  /**
   * Export cache data for persistence
   */
  export(): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    for (const [key, entry] of this.cache.entries()) {
      data[key] = {
        value: entry.value,
        timestamp: entry.timestamp.toISOString(),
        ttl: entry.ttl,
        hits: entry.hits,
        size: entry.size,
      }
    }
    return data
  }

  /**
   * Import cache data from persistence
   */
  import(data: Record<string, unknown>): void {
    this.cache.clear()
    for (const [key, entryData] of Object.entries(data)) {
      if (typeof entryData === 'object' && entryData !== null) {
        const entry = entryData as Record<string, unknown>
        this.cache.set(key, {
          value: entry.value,
          timestamp: new Date(entry.timestamp as string),
          ttl: entry.ttl as number,
          hits: entry.hits as number,
          size: entry.size as number,
        })
      }
    }
  }
}

/**
 * Performance monitor for tracking configuration loading performance
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private readonly maxMetrics = 1000

  /**
   * Track operation performance
   */
  async track<T>(
    operation: string,
    fn: () => Promise<T>,
    context: Partial<PerformanceMetrics> = {},
  ): Promise<T> {
    const start = performance.now()
    const startTime = new Date()

    try {
      const result = await fn()
      const duration = performance.now() - start

      this.recordMetric({
        operation,
        duration,
        timestamp: startTime,
        ...context,
      })

      return result
    }
    catch (error) {
      const duration = performance.now() - start

      this.recordMetric({
        operation: `${operation}:error`,
        duration,
        timestamp: startTime,
        ...context,
      })

      throw error
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric)

    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Get performance statistics
   */
  getStats(operation?: string): {
    count: number
    averageDuration: number
    minDuration: number
    maxDuration: number
    totalDuration: number
    recentMetrics: PerformanceMetrics[]
  } {
    const filteredMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
        recentMetrics: [],
      }
    }

    const durations = filteredMetrics.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)

    return {
      count: filteredMetrics.length,
      averageDuration: totalDuration / filteredMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration,
      recentMetrics: filteredMetrics.slice(-10), // Last 10 metrics
    }
  }

  /**
   * Get all recorded metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Get slow operations above threshold
   */
  getSlowOperations(threshold: number): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > threshold)
  }
}

/**
 * Global cache and performance monitor instances
 */
export const globalCache: ConfigCache = new ConfigCache()
export const globalPerformanceMonitor: PerformanceMonitor = new PerformanceMonitor()

/**
 * Create cache key from configuration parameters
 */
function createKey(configName: string, options: Record<string, unknown> = {}): string {
  const sortedKeys = Object.keys(options).sort()
  const optionsStr = sortedKeys.map(key => `${key}:${options[key]}`).join('|')
  return optionsStr ? `${configName}:${optionsStr}` : configName
}

/**
 * Check if two cache entries are equivalent
 */
function isEquivalent(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  catch {
    return a === b
  }
}

/**
 * Estimate memory usage of cache
 */
function estimateMemoryUsage(cache: ConfigCache): number {
  const stats = cache.getStats()
  return stats.size * 2 // Rough estimate including overhead
}

/**
 * Utility functions for cache management
 */
export const CacheUtils: {
  createKey: typeof createKey
  isEquivalent: typeof isEquivalent
  estimateMemoryUsage: typeof estimateMemoryUsage
} = {
  createKey,
  isEquivalent,
  estimateMemoryUsage,
}
