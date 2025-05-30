import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { loadConfig } from '../src'

describe('Home Config Directory Integration Tests', () => {
  const testCwd = resolve(process.cwd(), 'test/tmp/home-config-integration')

  // Generate unique test name for each test run
  const generateTestName = () => `bunfig-test-${Date.now()}-${Math.random().toString(36).substring(7)}`

  beforeEach(() => {
    // Clean up test directories
    if (existsSync(testCwd))
      rmSync(testCwd, { recursive: true })

    // Create test directories
    mkdirSync(testCwd, { recursive: true })
  })

  afterEach(() => {
    // Cleanup test directories
    if (existsSync(testCwd))
      rmSync(testCwd, { recursive: true })
  })

  // Helper to clean up home config for a specific test name
  const cleanupHomeConfig = (testName: string) => {
    const testHomeConfigDir = resolve(homedir(), '.config', testName)
    if (existsSync(testHomeConfigDir))
      rmSync(testHomeConfigDir, { recursive: true })
  }

  describe('Real home config loading', () => {
    it('should load config from real ~/.config/$name/config.ts', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        const configPath = resolve(testHomeConfigDir, 'config.ts')
        const configContent = `export default {
          source: 'home-config',
          port: 8080
        }`
        writeFileSync(configPath, configContent)

        const defaultConfig = { source: 'default', port: 3000, debug: true }
        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig,
        })

        expect(result).toEqual({
          source: 'home-config',
          port: 8080,
          debug: true,
        })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })

    it('should prefer local config over home config', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        // Create home config
        const homeConfigPath = resolve(testHomeConfigDir, 'config.ts')
        writeFileSync(
          homeConfigPath,
          `export default { source: 'home', priority: 'low' }`,
        )

        // Create local config
        const localConfigPath = resolve(testCwd, `${testName}.config.ts`)
        writeFileSync(
          localConfigPath,
          `export default { source: 'local', priority: 'high' }`,
        )

        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig: { source: 'default', priority: 'none' },
        })

        // Should prefer local config
        expect(result).toEqual({ source: 'local', priority: 'high' })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })

    it('should use home config when no local config exists', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        // Only create home config (no local config)
        const homeConfigPath = resolve(testHomeConfigDir, 'config.ts')
        writeFileSync(
          homeConfigPath,
          `export default {
            database: { host: 'home-db.example.com' },
            features: ['feature1', 'feature2']
          }`,
        )

        const defaultConfig = {
          database: { host: 'localhost', port: 3306 },
          features: [] as string[],
          debug: false,
        }
        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig,
        })

        expect(result).toEqual({
          database: {
            host: 'home-db.example.com',
            port: 3306,
          },
          features: ['feature1', 'feature2'],
          debug: false,
        })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })

    it('should handle different file extensions in home config', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        const homeConfigPath = resolve(testHomeConfigDir, 'config.json')
        writeFileSync(
          homeConfigPath,
          JSON.stringify({
            source: 'home-json',
            database: { host: 'json-db.example.com' },
          }),
        )

        const defaultConfig = {
          source: 'default',
          database: { host: 'localhost', port: 3306 },
        }
        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig,
        })

        expect(result).toEqual({
          source: 'home-json',
          database: {
            host: 'json-db.example.com',
            port: 3306,
          },
        })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })

    it('should handle missing home config directory gracefully', async () => {
      const testName = generateTestName()

      // Don't create any home config files
      const result = await loadConfig({
        name: testName,
        cwd: testCwd,
        defaultConfig: { source: 'default', config: 'value' },
      })

      expect(result).toEqual({ source: 'default', config: 'value' })
    })
  })

  describe('Home config patterns', () => {
    it('should try config.* pattern first', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        // Create both config.ts and $testName.config.ts
        writeFileSync(
          resolve(testHomeConfigDir, 'config.ts'),
          `export default { source: 'config.ts', priority: 1 }`,
        )
        writeFileSync(
          resolve(testHomeConfigDir, `${testName}.config.ts`),
          `export default { source: '${testName}.config.ts', priority: 2 }`,
        )

        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig: { source: 'default', priority: 0 },
        })

        // Should prefer config.ts over $name.config.ts
        expect(result).toEqual({ source: 'config.ts', priority: 1 })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })

    it('should fallback to $name.config.* pattern', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        // Only create the fallback pattern
        writeFileSync(
          resolve(testHomeConfigDir, `${testName}.config.ts`),
          `export default { source: '${testName}.config.ts' }`,
        )

        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig: { source: 'default' },
        })

        expect(result).toEqual({ source: `${testName}.config.ts` })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })
  })

  describe('Home config with aliases', () => {
    it('should check alias patterns in home config', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        // Create config using the alias pattern
        writeFileSync(
          resolve(testHomeConfigDir, 'myalias.config.ts'),
          `export default { source: 'alias-config' }`,
        )

        const result = await loadConfig({
          name: testName,
          alias: 'myalias',
          cwd: testCwd,
          defaultConfig: { source: 'default' },
        })

        expect(result).toEqual({ source: 'alias-config' })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })
  })

  describe('Error handling', () => {
    it('should handle invalid home config file gracefully', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        // Create invalid config file
        writeFileSync(
          resolve(testHomeConfigDir, 'config.ts'),
          `export default "not an object"`,
        )

        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig: { source: 'default', valid: true },
        })

        // Should fallback to default config
        expect(result).toEqual({ source: 'default', valid: true })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })

    it('should handle corrupted config file gracefully', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        // Create syntactically invalid config file
        writeFileSync(
          resolve(testHomeConfigDir, 'config.ts'),
          `export default { invalid: syntax: error }`,
        )

        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig: { source: 'default', valid: true },
        })

        // Should fallback to default config
        expect(result).toEqual({ source: 'default', valid: true })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })

    it('should handle empty config name gracefully', async () => {
      const result = await loadConfig({
        name: '',
        cwd: testCwd,
        defaultConfig: { source: 'default' },
      })

      // Should use default config when name is empty
      expect(result).toEqual({ source: 'default' })
    })
  })

  describe('Verbose logging', () => {
    it('should work with verbose logging enabled', async () => {
      const testName = generateTestName()
      const testHomeConfigDir = resolve(homedir(), '.config', testName)

      try {
        mkdirSync(testHomeConfigDir, { recursive: true })

        const homeConfigPath = resolve(testHomeConfigDir, 'config.ts')
        writeFileSync(
          homeConfigPath,
          `export default { source: 'home-verbose' }`,
        )

        const result = await loadConfig({
          name: testName,
          cwd: testCwd,
          defaultConfig: { source: 'default' },
          verbose: true,
        })

        expect(result).toEqual({ source: 'home-verbose' })
      }
      finally {
        cleanupHomeConfig(testName)
      }
    })
  })
})
