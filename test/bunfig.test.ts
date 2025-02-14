import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { config, deepMerge, generateConfigTypes, loadConfig } from '../src'

describe('bunfig', () => {
  const testConfigDir = resolve(process.cwd(), 'test/tmp/config')
  const testGeneratedDir = resolve(process.cwd(), 'test/tmp/generated')

  beforeEach(() => {
    // Clean up test directories
    if (existsSync(testConfigDir))
      rmSync(testConfigDir, { recursive: true })
    if (existsSync(testGeneratedDir))
      rmSync(testGeneratedDir, { recursive: true })

    // Create test directories
    mkdirSync(testConfigDir, { recursive: true })
    mkdirSync(testGeneratedDir, { recursive: true })
  })

  afterEach(() => {
    // Cleanup test directories
    if (existsSync(testConfigDir))
      rmSync(testConfigDir, { recursive: true })
    if (existsSync(testGeneratedDir))
      rmSync(testGeneratedDir, { recursive: true })
  })

  describe('loadConfig', () => {
    it('should load default config when no config file exists', async () => {
      const defaultConfig = { port: 3000, host: 'localhost' }
      const result = await loadConfig({
        name: 'test-app',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual(defaultConfig)
    })

    it('should merge config file with defaults', async () => {
      const configPath = resolve(testConfigDir, 'merge-test.config.ts')
      const configContent = `export default { host: 'custom-host' }`

      writeFileSync(configPath, configContent)

      const defaultConfig = { port: 3000, host: 'localhost' }
      const result = await loadConfig({
        name: 'merge-test',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual({ port: 3000, host: 'custom-host' })
    })

    it('should try all config file patterns', async () => {
      const configPath = resolve(testConfigDir, '.pattern-test.config.ts')
      const configContent = `export default { host: 'from-dot-file' }`

      writeFileSync(configPath, configContent)

      const defaultConfig = { port: 3000, host: 'localhost' }
      const result = await loadConfig({
        name: 'pattern-test',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual({ port: 3000, host: 'from-dot-file' })
    })

    it('should handle invalid config file gracefully', async () => {
      // Clean up any existing files first
      if (existsSync(testConfigDir))
        rmSync(testConfigDir, { recursive: true })

      // Create a fresh directory
      mkdirSync(testConfigDir, { recursive: true })

      // Create an invalid config file
      const configPath = resolve(testConfigDir, 'invalid-test.config.ts')
      const configContent = 'export default "not an object";'

      writeFileSync(configPath, configContent)

      // Wait for file system operations to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Log directory contents after cleanup and file creation
      console.error('Test directory contents after cleanup:', readdirSync(testConfigDir))

      const defaultConfig = { port: 3000, host: 'localhost' }
      const result = await loadConfig({
        name: 'invalid-test',
        cwd: testConfigDir,
        defaultConfig,
      })

      // Log the actual result for debugging
      console.error('Actual result:', result)

      expect(result).toEqual(defaultConfig)
    })

    it('should handle browser environment', async () => {
      // Mock window to simulate browser environment
      const originalWindow = globalThis.window
      // @ts-expect-error - mocking window
      globalThis.window = {}

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ host: 'api-host' }),
        }),
      )
      // @ts-expect-error - mocking fetch
      globalThis.fetch = mockFetch

      const defaultConfig = { port: 3000, host: 'localhost' }
      const result = await loadConfig({
        name: 'test-app',
        endpoint: '/api/config',
        defaultConfig,
      })

      expect(result).toEqual({ port: 3000, host: 'api-host' })
      expect(mockFetch).toHaveBeenCalledWith('/api/config', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      // Restore window
      globalThis.window = originalWindow
    })

    it('should handle browser fetch errors', async () => {
      // Mock window to simulate browser environment
      const originalWindow = globalThis.window
      // @ts-expect-error - mocking window
      globalThis.window = {}

      const consoleSpy = spyOn(console, 'error')
      const mockFetch = mock(() => Promise.reject(new Error('Network error')))

      globalThis.fetch = mockFetch

      const defaultConfig = { port: 3000, host: 'localhost' }
      const result = await loadConfig({
        name: 'test-app',
        endpoint: '/api/config',
        defaultConfig,
      })

      expect(result).toEqual(defaultConfig)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load client config:', expect.any(Error))

      // Restore window
      globalThis.window = originalWindow
      consoleSpy.mockRestore()
    })

    it('should handle non-200 responses in browser', async () => {
      // Mock window to simulate browser environment
      const originalWindow = globalThis.window
      // @ts-expect-error - mocking window
      globalThis.window = {}

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        }),
      )
      // @ts-expect-error - mocking fetch
      globalThis.fetch = mockFetch

      const defaultConfig = { port: 3000, host: 'localhost' }
      const result = await loadConfig({
        name: 'test-app',
        endpoint: '/api/config',
        defaultConfig,
      })

      expect(result).toEqual(defaultConfig)

      // Restore window
      globalThis.window = originalWindow
    })

    it('should handle custom headers in browser', async () => {
      // Mock window to simulate browser environment
      const originalWindow = globalThis.window
      // @ts-expect-error - mocking window
      globalThis.window = {}

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ host: 'api-host' }),
        }),
      )
      // @ts-expect-error - mocking fetch
      globalThis.fetch = mockFetch

      const defaultConfig = { port: 3000, host: 'localhost' }
      const customHeaders = {
        'Authorization': 'Bearer token',
        'X-Custom-Header': 'value',
      }

      const result = await loadConfig({
        name: 'test-app',
        endpoint: '/api/config',
        headers: customHeaders,
        defaultConfig,
      })

      expect(result).toEqual({ port: 3000, host: 'api-host' })
      expect(mockFetch).toHaveBeenCalledWith('/api/config', {
        method: 'GET',
        headers: {
          ...customHeaders,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      // Restore window
      globalThis.window = originalWindow
    })
  })

  describe('config function', () => {
    it('should handle string input', async () => {
      const configPath = resolve(testConfigDir, 'simple.config.ts')
      const configContent = `export default { value: 'test' }`

      writeFileSync(configPath, configContent)

      const result = await config<{ value: string }>({
        name: 'simple',
        cwd: testConfigDir,
        defaultConfig: { value: 'default' },
      })

      expect(result).toEqual({ value: 'test' })
    })

    it('should handle string input with no config file', async () => {
      const result = await config('non-existent')
      expect(result).toEqual({})
    })
  })

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const target = { a: 1, b: { c: 2 } }
      const source = { b: { d: 3 }, e: 4 }
      const result = deepMerge(target, source)

      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4,
      })
    })

    it('should handle arrays', () => {
      const target = [1, 2, { a: 1 }]
      const source = [3, 4, { b: 2 }]
      const result = deepMerge(target, source)

      expect(result).toEqual([3, 4, { a: 1, b: 2 }])
    })

    it('should handle null and undefined values', () => {
      const target = { a: 1, b: 2 }
      const source = { a: null, c: undefined }
      const result = deepMerge(target, source)

      expect(result).toEqual({ a: null, b: 2, c: undefined })
    })

    it('should handle empty objects', () => {
      const target = {}
      const source = {}
      const result = deepMerge(target, source)

      expect(result).toEqual({})
    })

    it('should handle nested arrays', () => {
      const target = { arr: [1, 2, [3, 4]] }
      const source = { arr: [5, 6, [7, 8]] }
      const result = deepMerge(target, source)

      expect(result).toEqual({ arr: [5, 6, [7, 8]] })
    })

    it('should handle mixed types', () => {
      const target = { a: [1, 2], b: { c: 3 } }
      const source = { a: { d: 4 }, b: [5, 6] }
      const result = deepMerge(target, source)

      expect(result).toEqual({ a: { d: 4 }, b: [5, 6] })
    })
  })

  describe('generateConfigTypes', () => {
    it('should generate config types', () => {
      // Create some test config files
      writeFileSync(resolve(testConfigDir, 'app.ts'), 'export default {}')
      writeFileSync(resolve(testConfigDir, 'test.ts'), 'export default {}')

      generateConfigTypes({
        configDir: testConfigDir,
        generatedDir: testGeneratedDir,
      })

      const typesFile = resolve(testGeneratedDir, 'config-types.ts')
      expect(existsSync(typesFile)).toBe(true)

      const content = readFileSync(typesFile, 'utf-8')
      expect(content).toContain('export type ConfigNames = \'app\' | \'test\'')
    })

    it('should handle empty config directory', () => {
      generateConfigTypes({
        configDir: testConfigDir,
        generatedDir: testGeneratedDir,
      })

      const typesFile = resolve(testGeneratedDir, 'config-types.ts')
      expect(existsSync(typesFile)).toBe(true)

      const content = readFileSync(typesFile, 'utf-8')
      expect(content).toContain('export type ConfigNames = string')
    })

    it('should handle non-existent config directory', () => {
      generateConfigTypes({
        configDir: resolve(testConfigDir, 'non-existent'),
        generatedDir: testGeneratedDir,
      })

      const typesFile = resolve(testGeneratedDir, 'config-types.ts')
      expect(existsSync(typesFile)).toBe(true)

      const content = readFileSync(typesFile, 'utf-8')
      expect(content).toContain('export type ConfigNames = string')
    })

    it('should handle various file extensions', () => {
      writeFileSync(resolve(testConfigDir, 'app.ts'), 'export default {}')
      writeFileSync(resolve(testConfigDir, 'test.js'), 'export default {}')
      writeFileSync(resolve(testConfigDir, 'other.json'), '{}')

      generateConfigTypes({
        configDir: testConfigDir,
        generatedDir: testGeneratedDir,
      })

      const typesFile = resolve(testGeneratedDir, 'config-types.ts')
      const content = readFileSync(typesFile, 'utf-8')
      const matches = content.match(/ConfigNames = '(.+)'/)?.[1]
      expect(matches?.includes('app')).toBe(true)
      expect(matches?.includes('test')).toBe(true)
      expect(matches?.includes('other')).toBe(true)
    })
  })
})
