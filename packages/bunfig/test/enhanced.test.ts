import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ConfigLoader, ErrorFactory, globalCache, globalPerformanceMonitor, loadConfigWithResult } from '../src'

describe('Enhanced Configuration Loading', () => {
  const testDir = resolve(process.cwd(), 'test-enhanced')

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
    mkdirSync(testDir, { recursive: true })
    globalCache.clear()
    globalPerformanceMonitor.clearMetrics()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
  })

  describe('loadConfigWithResult', () => {
    it('should load configuration with caching enabled', async () => {
      const configPath = resolve(testDir, 'cached.config.ts')
      writeFileSync(configPath, 'export default { value: "cached-test" }')

      // First load
      const result1 = await loadConfigWithResult({
        name: 'cached',
        cwd: testDir,
        defaultConfig: { value: 'default' },
        cache: { enabled: true, ttl: 5000 },
      })

      expect(result1.config.value).toBe('cached-test')
      expect(result1.source.type).toBe('file')

      // Second load should use cache
      const result2 = await loadConfigWithResult({
        name: 'cached',
        cwd: testDir,
        defaultConfig: { value: 'default' },
        cache: { enabled: true, ttl: 5000 },
      })

      expect(result2.config.value).toBe('cached-test')
    })

    it('should track performance metrics', async () => {
      const configPath = resolve(testDir, 'perf.config.ts')
      writeFileSync(configPath, 'export default { value: "performance-test" }')

      let capturedMetrics: any = null
      const result = await loadConfigWithResult({
        name: 'perf',
        cwd: testDir,
        defaultConfig: { value: 'default' },
        performance: {
          enabled: true,
          onMetrics: (metrics) => {
            capturedMetrics = metrics
          },
        },
      })

      expect(result.config.value).toBe('performance-test')
      expect(result.metrics).toBeDefined()
      expect(result.metrics!.operation).toBe('loadConfig')
      expect(result.metrics!.duration).toBeGreaterThanOrEqual(0) // Allow 0 for very fast operations
      expect(capturedMetrics).toBeDefined()
    })

    it('should validate configuration with schema', async () => {
      const configPath = resolve(testDir, 'schema-valid.config.ts')
      writeFileSync(configPath, 'export default { port: 3000, host: "localhost" }')

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 },
          host: { type: 'string', minLength: 1 },
        },
        required: ['port', 'host'],
      }

      const result = await loadConfigWithResult({
        name: 'schema-valid',
        cwd: testDir,
        defaultConfig: { port: 8080, host: 'default' },
        schema,
      })

      expect(result.config.port).toBe(3000)
      expect(result.config.host).toBe('localhost')
    })

    it('should fail validation with invalid schema', async () => {
      const configPath = resolve(testDir, 'schema-invalid.config.ts')
      writeFileSync(configPath, 'export default { port: "invalid", host: "" }')

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 },
          host: { type: 'string', minLength: 1 },
        },
        required: ['port', 'host'],
      }

      await expect(
        loadConfigWithResult({
          name: 'schema-invalid',
          cwd: testDir,
          defaultConfig: { port: 8080, host: 'default' },
          schema,
        }),
      ).rejects.toThrow()
    })

    it('should use custom validation function', async () => {
      const configPath = resolve(testDir, 'custom-valid.config.ts')
      writeFileSync(configPath, 'export default { apiKey: "test-key", timeout: 5000 }')

      const customValidator = (config: any) => {
        const errors: string[] = []
        if (!config.apiKey || config.apiKey.length < 5) {
          errors.push('apiKey must be at least 5 characters')
        }
        if (config.timeout && config.timeout > 10000) {
          errors.push('timeout cannot exceed 10000ms')
        }
        return errors.length > 0 ? errors : undefined
      }

      const result = await loadConfigWithResult({
        name: 'custom-valid',
        cwd: testDir,
        defaultConfig: { apiKey: '', timeout: 3000 },
        validate: customValidator,
      })

      expect(result.config.apiKey).toBe('test-key')
    })

    it('should fail custom validation', async () => {
      const configPath = resolve(testDir, 'custom-invalid.config.ts')
      writeFileSync(configPath, 'export default { apiKey: "abc", timeout: 15000 }')

      const customValidator = (config: any) => {
        const errors: string[] = []
        if (!config.apiKey || config.apiKey.length < 5) {
          errors.push('apiKey must be at least 5 characters')
        }
        if (config.timeout && config.timeout > 10000) {
          errors.push('timeout cannot exceed 10000ms')
        }
        return errors.length > 0 ? errors : undefined
      }

      await expect(
        loadConfigWithResult({
          name: 'custom-invalid',
          cwd: testDir,
          defaultConfig: { apiKey: '', timeout: 3000 },
          validate: customValidator,
        }),
      ).rejects.toThrow()
    })

    it('should provide detailed result metadata', async () => {
      const configPath = resolve(testDir, 'metadata.config.ts')
      writeFileSync(configPath, 'export default { feature: "metadata-test" }')

      const result = await loadConfigWithResult({
        name: 'metadata',
        cwd: testDir,
        defaultConfig: { feature: 'default' },
        performance: { enabled: true },
      })

      expect(result.config.feature).toBe('metadata-test')
      expect(result.source.type).toBe('file')
      expect(result.source.path).toBe(configPath)
      expect(result.source.priority).toBeGreaterThan(0)
      expect(result.source.timestamp).toBeInstanceOf(Date)
      expect(result.path).toBe(configPath)
      expect(result.metrics).toBeDefined()
    })
  })

  describe('ConfigLoader class', () => {
    it('should work as a standalone service', async () => {
      const loader = new ConfigLoader()
      const configPath = resolve(testDir, 'service.config.ts')
      writeFileSync(configPath, 'export default { service: "test" }')

      const result = await loader.loadConfigWithResult({
        name: 'service',
        cwd: testDir,
        defaultConfig: { service: 'default' },
      })

      expect(result.config.service).toBe('test')
      expect(result.source.type).toBe('file')
    })
  })

  describe('Error Handling', () => {
    it('should provide structured error information', async () => {
      try {
        const error = ErrorFactory.configNotFound('missing-config', ['/path1', '/path2'], 'alias')
        expect(error.code).toBe('CONFIG_NOT_FOUND')
        expect(error.context.configName).toBe('missing-config')
        expect(error.context.alias).toBe('alias')
        expect(error.context.searchPaths).toEqual(['/path1', '/path2'])
      }
      catch {
        // This should not throw in normal cases
        expect(true).toBe(false)
      }
    })

    it('should handle configuration load errors gracefully', async () => {
      const configPath = resolve(testDir, 'invalid.config.ts')
      writeFileSync(configPath, 'export default { invalid syntax')

      // Enhanced API should gracefully fall back to default config instead of throwing
      const result = await loadConfigWithResult({
        name: 'invalid',
        cwd: testDir,
        defaultConfig: { value: 'default' },
      })

      expect(result.config.value).toBe('default')
      expect(result.source.type).toBe('environment') // Falls back to environment/default
    })
  })

  describe('Cache functionality', () => {
    it('should cache and retrieve configurations', () => {
      const config = { test: 'value' }
      globalCache.set('test-key', config)

      const retrieved = globalCache.get('test-key')
      expect(retrieved).toEqual(config)
    })

    it('should handle cache expiration', async () => {
      const config = { test: 'expiring' }
      globalCache.set('expiring-key', config, undefined, 1) // 1ms TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10))

      const retrieved = globalCache.get('expiring-key')
      expect(retrieved).toBeUndefined()
    })

    it('should provide cache statistics', () => {
      globalCache.clear()
      globalCache.set('stat1', { value: 1 })
      globalCache.set('stat2', { value: 2 })

      const stats = globalCache.getStats()
      expect(stats.entries).toBe(2)
      expect(stats.hitRate).toBe(0) // No hits yet
    })
  })

  describe('Performance monitoring', () => {
    it('should track operation performance', async () => {
      const monitor = globalPerformanceMonitor

      await monitor.track('test-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'result'
      })

      const stats = monitor.getStats('test-operation')
      expect(stats.count).toBe(1)
      expect(stats.averageDuration).toBeGreaterThan(0)
    })

    it('should identify slow operations', async () => {
      const monitor = globalPerformanceMonitor

      await monitor.track('slow-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'slow-result'
      })

      const slowOps = monitor.getSlowOperations(30) // 30ms threshold
      expect(slowOps.length).toBeGreaterThan(0)
      expect(slowOps[0].operation).toBe('slow-operation')
    })
  })
})
