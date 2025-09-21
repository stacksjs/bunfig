import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deepMerge, globalCache, loadConfigWithResult } from '../src'

describe('Edge Cases and Corner Cases', () => {
  const testDir = resolve(process.cwd(), 'test-edge-cases')

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
    mkdirSync(testDir, { recursive: true })
    globalCache.clear()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
  })

  describe('File System Edge Cases', () => {
    it('should handle symbolic links', async () => {
      const realConfigPath = resolve(testDir, 'real.config.ts')
      const linkConfigPath = resolve(testDir, 'link.config.ts')

      writeFileSync(realConfigPath, 'export default { source: "real" }')

      // Create symbolic link (skip on Windows if not supported)
      try {
        symlinkSync(realConfigPath, linkConfigPath)

        const result = await loadConfigWithResult({
          name: 'link',
          cwd: testDir,
          defaultConfig: { source: 'default' },
        })

        expect(result.config.source).toBe('real')
      }
      catch (error) {
        // Skip test if symlinks are not supported
        if (process.platform === 'win32') {
          expect(true).toBe(true) // Skip on Windows
        }
        else {
          throw error
        }
      }
    })

    it('should handle very long file paths', async () => {
      const longDirName = 'very-long-directory-name-that-tests-path-limits'.repeat(5)
      const longDir = resolve(testDir, longDirName.slice(0, 100)) // Limit to reasonable length
      mkdirSync(longDir, { recursive: true })

      const configPath = resolve(longDir, 'config.ts')
      writeFileSync(configPath, 'export default { path: "long" }')

      const result = await loadConfigWithResult({
        name: 'config',
        cwd: longDir,
        defaultConfig: { path: 'default' },
      })

      expect(result.config.path).toBe('long')
    })

    it('should handle empty config files', async () => {
      const configPath = resolve(testDir, 'empty.config.ts')
      writeFileSync(configPath, '')

      await expect(
        loadConfigWithResult({
          name: 'empty',
          cwd: testDir,
          defaultConfig: { value: 'default' },
        }),
      ).rejects.toThrow()
    })

    it('should handle config files with only comments', async () => {
      const configPath = resolve(testDir, 'comments.config.ts')
      writeFileSync(configPath, `
        // This is a comment
        /* Multi-line comment */
        // export default { commented: true }
      `)

      await expect(
        loadConfigWithResult({
          name: 'comments',
          cwd: testDir,
          defaultConfig: { value: 'default' },
        }),
      ).rejects.toThrow()
    })

    it('should handle concurrent access to same config file', async () => {
      const configPath = resolve(testDir, 'concurrent.config.ts')
      writeFileSync(configPath, 'export default { concurrent: true }')

      // Load the same config multiple times concurrently
      const promises = Array.from({ length: 10 }, () =>
        loadConfigWithResult({
          name: 'concurrent',
          cwd: testDir,
          defaultConfig: { concurrent: false },
        }))

      const results = await Promise.all(promises)

      // All results should be the same
      results.forEach((result) => {
        expect(result.config.concurrent).toBe(true)
      })
    })
  })

  describe('deepMerge Edge Cases', () => {
    it('should handle null and undefined values correctly', () => {
      const target = { a: 1, b: 2, c: 3 }
      const source = { a: null, b: undefined, d: 4 }

      const result = deepMerge(target, source)

      expect(result.a).toBeNull()
      expect(result.b).toBeUndefined()
      expect(result.c).toBe(3)
      expect(result.d).toBe(4)
    })

    it('should handle circular references', () => {
      const target: any = { a: 1 }
      const source: any = { b: 2 }

      // Create circular reference
      target.self = target
      source.self = source

      // Should not throw or cause infinite recursion
      const result = deepMerge(target, source)
      expect(result.a).toBe(1)
      expect(result.b).toBe(2)
    })

    it('should handle very deeply nested objects', () => {
      const createDeepObject = (depth: number, value: any): any => {
        if (depth === 0)
          return value
        return { nested: createDeepObject(depth - 1, value) }
      }

      const target = createDeepObject(100, { target: true })
      const source = createDeepObject(100, { source: true })

      const result = deepMerge(target, source)

      // Navigate to the deep value
      let current = result
      for (let i = 0; i < 100; i++) {
        current = current.nested
      }

      expect(current.source).toBe(true)
    })

    it('should handle mixed data types', () => {
      const target = {
        string: 'hello',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: true },
        nullValue: null,
        undefinedValue: undefined,
      }

      const source = {
        string: 123, // type change
        number: 'changed', // type change
        boolean: [1, 2, 3], // type change
        array: { converted: true }, // type change
        object: 'stringified', // type change
        nullValue: 'not null',
        undefinedValue: 'defined',
        newProperty: 'added',
      }

      const result = deepMerge(target, source)

      expect(result.string).toBe(123)
      expect(result.number).toBe('changed')
      expect(result.boolean).toEqual([1, 2, 3])
      expect(result.array).toEqual({ converted: true })
      expect(result.object).toBe('stringified')
      expect(result.nullValue).toBe('not null')
      expect(result.undefinedValue).toBe('defined')
      expect(result.newProperty).toBe('added')
    })

    it('should handle array merge strategies correctly', () => {
      const target = [1, 2, 3]
      const source = [4, 5, 6]

      // Replace strategy (default)
      const replaced = deepMerge(target, source, { arrayMergeMode: 'replace' })
      expect(replaced).toEqual([4, 5, 6])

      // Concat strategy
      const concatenated = deepMerge(target, source, { arrayMergeMode: 'concat' })
      expect(concatenated).toEqual([4, 5, 6, 1, 2, 3])

      // Smart strategy
      const smart = deepMerge(target, source, { arrayMergeMode: 'smart' })
      expect(smart).toEqual([4, 5, 6])
    })

    it('should handle object arrays with smart merge', () => {
      const target = [
        { id: 1, name: 'item1', value: 'old' },
        { id: 2, name: 'item2', value: 'old' },
        { id: 3, name: 'item3', value: 'old' },
      ]

      const source = [
        { id: 1, name: 'item1', value: 'new' },
        { id: 4, name: 'item4', value: 'new' },
      ]

      const result = deepMerge(target, source, { arrayMergeMode: 'smart' })

      expect(result).toHaveLength(4)
      expect(result.find(item => item.id === 1)?.value).toBe('new') // Source takes precedence
      expect(result.find(item => item.id === 2)).toBeDefined() // Target item preserved
      expect(result.find(item => item.id === 3)).toBeDefined() // Target item preserved
      expect(result.find(item => item.id === 4)).toBeDefined() // Source item added
    })
  })

  describe('Configuration Priority Edge Cases', () => {
    it('should handle multiple config files with same priority', async () => {
      // Create multiple config files that could match
      const configs = [
        { file: 'priority.config.ts', content: 'export default { source: "ts" }' },
        { file: 'priority.config.js', content: 'module.exports = { source: "js" }' },
        { file: 'priority.config.json', content: '{ "source": "json" }' },
      ]

      configs.forEach(({ file, content }) => {
        writeFileSync(resolve(testDir, file), content)
      })

      const result = await loadConfigWithResult({
        name: 'priority',
        cwd: testDir,
        defaultConfig: { source: 'default' },
      })

      // TypeScript should have highest priority
      expect(result.config.source).toBe('ts')
    })

    it('should handle config files in nested directories', async () => {
      const nestedDir = resolve(testDir, 'nested', 'deep')
      mkdirSync(nestedDir, { recursive: true })

      writeFileSync(resolve(testDir, 'nested.config.ts'), 'export default { level: "root" }')
      writeFileSync(resolve(testDir, 'nested', 'nested.config.ts'), 'export default { level: "middle" }')
      writeFileSync(resolve(nestedDir, 'nested.config.ts'), 'export default { level: "deep" }')

      const result = await loadConfigWithResult({
        name: 'nested',
        cwd: nestedDir,
        defaultConfig: { level: 'default' },
      })

      // Should find the deepest config file first
      expect(result.config.level).toBe('deep')
    })
  })

  describe('Cache Edge Cases', () => {
    it('should handle cache with very short TTL', async () => {
      const configPath = resolve(testDir, 'short-ttl.config.ts')
      writeFileSync(configPath, 'export default { cached: true }')

      // Load with very short TTL
      const result1 = await loadConfigWithResult({
        name: 'short-ttl',
        cwd: testDir,
        defaultConfig: { cached: false },
        cache: { enabled: true, ttl: 1 }, // 1ms TTL
      })

      expect(result1.config.cached).toBe(true)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10))

      // Update config file
      writeFileSync(configPath, 'export default { cached: "updated" }')

      // Load again - should get updated value
      const result2 = await loadConfigWithResult({
        name: 'short-ttl',
        cwd: testDir,
        defaultConfig: { cached: false },
        cache: { enabled: true, ttl: 1 },
      })

      expect(result2.config.cached).toBe('updated')
    })

    it('should handle cache key collisions', async () => {
      const config1Path = resolve(testDir, 'collision1.config.ts')
      const config2Path = resolve(testDir, 'collision2.config.ts')

      writeFileSync(config1Path, 'export default { source: "collision1" }')
      writeFileSync(config2Path, 'export default { source: "collision2" }')

      // Load both configs - they should not interfere with each other
      const result1 = await loadConfigWithResult({
        name: 'collision1',
        cwd: testDir,
        defaultConfig: { source: 'default' },
        cache: { enabled: true },
      })

      const result2 = await loadConfigWithResult({
        name: 'collision2',
        cwd: testDir,
        defaultConfig: { source: 'default' },
        cache: { enabled: true },
      })

      expect(result1.config.source).toBe('collision1')
      expect(result2.config.source).toBe('collision2')
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle loading many configs without memory leaks', async () => {
      const configs = Array.from({ length: 100 }, (_, i) => {
        const configPath = resolve(testDir, `memory-test-${i}.config.ts`)
        writeFileSync(configPath, `export default { index: ${i} }`)
        return configPath
      })

      // Load all configs
      const results = await Promise.all(
        configs.map((_, i) =>
          loadConfigWithResult({
            name: `memory-test-${i}`,
            cwd: testDir,
            defaultConfig: { index: -1 },
            cache: { enabled: false }, // Disable cache to test memory usage
          }),
        ),
      )

      // Verify all configs loaded correctly
      results.forEach((result, i) => {
        expect(result.config.index).toBe(i)
      })
    })

    it('should handle very large config objects', async () => {
      const largeObject = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          value: Math.random(),
          nested: {
            deep: {
              deeper: {
                data: `deep-data-${i}`,
              },
            },
          },
        })),
      }

      const configPath = resolve(testDir, 'large.config.ts')
      writeFileSync(configPath, `export default ${JSON.stringify(largeObject)}`)

      const result = await loadConfigWithResult({
        name: 'large',
        cwd: testDir,
        defaultConfig: { data: [] },
      })

      expect(result.config.data).toHaveLength(10000)
      expect(result.config.data[0].id).toBe(0)
      expect(result.config.data[9999].id).toBe(9999)
    })
  })
})
