import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
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

    it('should correctly merge nested configuration objects', async () => {
      interface DatabaseConfig {
        host: string
        ports: {
          primary: number
          secondary: number
        }
        security: {
          ssl: boolean
          certPath?: string
        }
        username?: string
      }

      interface CacheConfig {
        enabled?: boolean
        ttl: number
      }

      interface TestConfig {
        database: DatabaseConfig
        cache: CacheConfig
      }

      const configPath = resolve(testConfigDir, 'nested-test.config.ts')
      const configContent = `
        export default {
          database: {
            host: 'custom-host',
            ports: {
              primary: 5432
            },
            security: {
              ssl: true
            }
          },
          cache: {
            ttl: 3600
          }
        }
      `

      writeFileSync(configPath, configContent)

      const defaultConfig: TestConfig = {
        database: {
          host: 'localhost',
          ports: {
            primary: 3306,
            secondary: 3307,
          },
          security: {
            ssl: false,
            certPath: '/default/path',
          },
          username: 'default',
        },
        cache: {
          enabled: true,
          ttl: 1800,
        },
      }

      const result = await loadConfig<TestConfig>({
        name: 'nested-test',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual({
        database: {
          host: 'custom-host',
          ports: {
            primary: 5432,
            secondary: 3307,
          },
          security: {
            ssl: true,
            certPath: '/default/path',
          },
          username: 'default',
        },
        cache: {
          enabled: true,
          ttl: 3600,
        },
      })
    })

    it('should correctly merge arrays in configuration when arrayStrategy is set to merge', async () => {
      interface Middleware {
        name: string
        order?: number
        config?: {
          type: string
        }
      }

      interface ArrayTestConfig {
        plugins: string[]
        middleware: Middleware[]
        features: {
          supported: string[]
          experimental?: string[]
        }
      }

      const configPath = resolve(testConfigDir, 'array-test.config.ts')
      const configContent = `
        export default {
          plugins: ['custom-plugin-1', 'custom-plugin-2'],
          middleware: [
            { name: 'custom-mid', order: 1 },
            { name: 'auth', config: { type: 'jwt' } }
          ],
          features: {
            supported: ['feature1', 'feature2']
          }
        }
      `

      writeFileSync(configPath, configContent)

      const defaultConfig: ArrayTestConfig = {
        plugins: ['default-plugin'],
        middleware: [
          { name: 'logger', order: 0 },
          { name: 'auth', config: { type: 'basic' } },
        ],
        features: {
          supported: ['feature3'],
          experimental: ['exp1'],
        },
      }

      const result = await loadConfig<ArrayTestConfig>({
        name: 'array-test',
        cwd: testConfigDir,
        defaultConfig,
        arrayStrategy: 'merge',
      })

      expect(result).toEqual({
        plugins: ['custom-plugin-1', 'custom-plugin-2', 'default-plugin'],
        middleware: [
          { name: 'custom-mid', order: 1 },
          { name: 'auth', config: { type: 'jwt' } },
          { name: 'logger', order: 0 },
        ],
        features: {
          supported: ['feature1', 'feature2', 'feature3'],
          experimental: ['exp1'],
        },
      })
    })

    it('should replace arrays by default (arrayStrategy: replace)', async () => {
      interface Middleware {
        name: string
        order?: number
        config?: {
          type: string
        }
      }

      interface ArrayTestConfig {
        plugins: string[]
        middleware: Middleware[]
        features: {
          supported: string[]
          experimental?: string[]
        }
      }

      const configPath = resolve(testConfigDir, 'array-replace.config.ts')
      const configContent = `
        export default {
          plugins: ['custom-plugin-1', 'custom-plugin-2'],
          middleware: [
            { name: 'custom-mid', order: 1 },
            { name: 'auth', config: { type: 'jwt' } }
          ],
          features: {
            supported: ['feature1', 'feature2']
          }
        }
      `

      writeFileSync(configPath, configContent)

      const defaultConfig: ArrayTestConfig = {
        plugins: ['default-plugin'],
        middleware: [
          { name: 'logger', order: 0 },
          { name: 'auth', config: { type: 'basic' } },
        ],
        features: {
          supported: ['feature3'],
          experimental: ['exp1'],
        },
      }

      const result = await loadConfig<ArrayTestConfig>({
        name: 'array-replace',
        cwd: testConfigDir,
        defaultConfig,
        // arrayStrategy defaults to 'replace'
      })

      expect(result).toEqual({
        plugins: ['custom-plugin-1', 'custom-plugin-2'],
        middleware: [
          { name: 'custom-mid', order: 1 },
          { name: 'auth', config: { type: 'jwt' } },
        ],
        features: {
          supported: ['feature1', 'feature2'],
          experimental: ['exp1'],
        },
      })
    })

    it('should handle deeply nested arrays and objects', async () => {
      interface CacheConfig {
        enabled: boolean
        duration?: number
      }

      interface Endpoint {
        path: string
        methods: string[]
        middleware: string[]
        config: {
          cache: CacheConfig
        }
      }

      interface ApiConfig {
        endpoints: Endpoint[]
        prefix?: string
      }

      interface DeepConfig {
        routes: {
          api: ApiConfig
        }
      }

      const configPath = resolve(testConfigDir, 'deep-nested.config.ts')
      const configContent = `
        export default {
          routes: {
            api: {
              endpoints: [
                {
                  path: '/users',
                  methods: ['GET', 'POST'],
                  middleware: ['auth'],
                  config: {
                    cache: {
                      enabled: true,
                      duration: 3600
                    }
                  }
                }
              ]
            }
          }
        }
      `

      writeFileSync(configPath, configContent)

      const defaultConfig: DeepConfig = {
        routes: {
          api: {
            endpoints: [
              {
                path: '/health',
                methods: ['GET'],
                middleware: ['logger'],
                config: {
                  cache: {
                    enabled: false,
                  },
                },
              },
            ],
            prefix: '/api/v1',
          },
        },
      }

      const result = await loadConfig<DeepConfig>({
        name: 'deep-nested',
        cwd: testConfigDir,
        defaultConfig,
        arrayStrategy: 'merge',
      })

      expect(result).toEqual({
        routes: {
          api: {
            endpoints: [
              {
                path: '/users',
                methods: ['GET', 'POST'],
                middleware: ['auth'],
                config: {
                  cache: {
                    enabled: true,
                    duration: 3600,
                  },
                },
              },
              {
                path: '/health',
                methods: ['GET'],
                middleware: ['logger'],
                config: {
                  cache: {
                    enabled: false,
                  },
                },
              },
            ],
            prefix: '/api/v1',
          },
        },
      })
    })

    it('should handle empty config files', async () => {
      const configPath = resolve(testConfigDir, 'empty.config.ts')
      const configContent = `export default {}`

      writeFileSync(configPath, configContent)

      const defaultConfig = {
        setting: 'default',
        flag: true,
      }

      const result = await loadConfig({
        name: 'empty',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual(defaultConfig)
    })

    it('should handle malformed config files gracefully', async () => {
      const configPath = resolve(testConfigDir, 'malformed.config.ts')
      const configContent = `
        export default {
          incomplete: {
            nested: {
              // missing closing brackets
      `

      writeFileSync(configPath, configContent)

      const defaultConfig = {
        setting: 'default',
        flag: true,
      }

      const result = await loadConfig({
        name: 'malformed',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual(defaultConfig)
    })

    it('should handle undefined and null values in config', async () => {
      const configPath = resolve(testConfigDir, 'nullable.config.ts')
      const configContent = `
        export default {
          definedValue: 'exists',
          nullValue: null,
          undefinedValue: undefined,
          nested: {
            nullValue: null,
            undefinedValue: undefined
          }
        }
      `

      writeFileSync(configPath, configContent)

      const defaultConfig = {
        definedValue: 'default',
        nullValue: 'default',
        undefinedValue: 'default',
        nested: {
          nullValue: 'default',
          undefinedValue: 'default',
          preserved: true,
        },
      }

      const result = await loadConfig({
        name: 'nullable',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual({
        definedValue: 'exists',
        nullValue: 'default',
        undefinedValue: 'default',
        nested: {
          nullValue: 'default',
          undefinedValue: 'default',
          preserved: true,
        },
      })
    })

    it('should handle very large nested objects without stack overflow', async () => {
      interface DeepNestedConfig {
        nested?: DeepNestedConfig
        value?: string
        shallow?: boolean
      }

      const configPath = resolve(testConfigDir, 'large.config.ts')

      // Create a deeply nested object
      let nestedConfig: DeepNestedConfig = { value: 'deep' }
      for (let i = 0; i < 100; i++) {
        nestedConfig = { nested: nestedConfig }
      }

      const configContent = `export default ${JSON.stringify(nestedConfig)}`
      writeFileSync(configPath, configContent)

      const defaultConfig: DeepNestedConfig = { shallow: true }

      const result = await loadConfig<DeepNestedConfig>({
        name: 'large',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toBeTruthy()
      expect(result.shallow).toBe(true)

      // Verify the deepest value is preserved
      let current: DeepNestedConfig = result
      for (let i = 0; i < 100 && current.nested; i++) {
        expect(current.nested).toBeTruthy()
        current = current.nested
      }
      expect(current.value).toBe('deep')
    })

    it('should handle string input with no config file', async () => {
      const result = await config('non-existent')
      expect(result).toEqual({})
    })

    it('should use alias when primary config file does not exist', async () => {
      // Create config file with the alias name
      const aliasConfigPath = resolve(testConfigDir, 'tls.config.ts')
      const configContent = `export default { domain: 'example.com' }`

      writeFileSync(aliasConfigPath, configContent)

      const defaultConfig = {
        domain: 'default.com',
        port: 443,
      }

      const result = await loadConfig({
        name: 'tlsx',
        alias: 'tls',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual({
        domain: 'example.com',
        port: 443,
      })
    })

    it('should use primary name over alias when both exist', async () => {
      // Create config file with the primary name
      const primaryConfigPath = resolve(testConfigDir, 'primary.config.ts')
      writeFileSync(primaryConfigPath, `export default { name: 'primary' }`)

      // Create config file with the alias name
      const aliasConfigPath = resolve(testConfigDir, 'alias.config.ts')
      writeFileSync(aliasConfigPath, `export default { name: 'alias' }`)

      const result = await loadConfig({
        name: 'primary',
        alias: 'alias',
        cwd: testConfigDir,
        defaultConfig: { name: 'default' },
      })

      expect(result).toEqual({ name: 'primary' })
    })

    it('should use alias from package.json when primary is not found', async () => {
      // Create a package.json with the alias configuration
      const packageJsonPath = resolve(testConfigDir, 'package.json')
      const packageJsonContent = JSON.stringify({
        name: 'test-package',
        tlsx: null, // This should be ignored
        tls: { domain: 'from-package.json' },
      })

      writeFileSync(packageJsonPath, packageJsonContent)

      const result = await loadConfig({
        name: 'tlsx',
        alias: 'tls',
        cwd: testConfigDir,
        defaultConfig: { domain: 'default.com', port: 443 },
      })

      expect(result).toEqual({
        domain: 'from-package.json',
        port: 443,
      })
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
      interface TestObject {
        id: number
        value: string
      }

      const target: TestObject[] = [
        { id: 1, value: 'one' },
        { id: 2, value: 'two' },
      ]
      const source: TestObject[] = [
        { id: 3, value: 'three' },
        { id: 4, value: 'four' },
      ]
      const result = deepMerge(target, source)

      expect(result).toEqual([
        { id: 3, value: 'three' },
        { id: 4, value: 'four' },
      ])
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
      interface NestedArrayConfig {
        arr: (number | number[])[]
      }

      const target: NestedArrayConfig = { arr: [1, 2, [3, 4]] }
      const source: NestedArrayConfig = { arr: [5, 6, [7, 8]] }
      const result = deepMerge(target, source)

      expect(result).toEqual({ arr: [5, 6, [7, 8]] })
    })

    it('should handle mixed types with proper type checking', () => {
      interface MixedConfig {
        a: number[] | { d: number }
        b: { c: number } | number[]
      }

      const target: MixedConfig = {
        a: [1, 2],
        b: { c: 3 },
      }
      const source: MixedConfig = {
        a: { d: 4 },
        b: [5, 6],
      }
      const result = deepMerge(target, source)

      expect(result).toEqual({
        a: { d: 4 },
        b: [5, 6],
      })
    })
  })

  describe('generateConfigTypes', () => {
    it('should generate config types', () => {
      // Create test config files
      writeFileSync(resolve(testConfigDir, 'app.ts'), 'export default {}')
      writeFileSync(resolve(testConfigDir, 'test.ts'), 'export default {}')

      // Generate types
      generateConfigTypes({
        configDir: testConfigDir,
        generatedDir: testGeneratedDir,
      })

      const typesFile = resolve(testGeneratedDir, 'config-types.ts')
      expect(existsSync(typesFile)).toBe(true)

      const content = readFileSync(typesFile, 'utf-8')
      // Check that the content includes the expected type definition
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
