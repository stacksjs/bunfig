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

  // Helper to clean up root-level home dotfiles for a specific test name/alias
  const cleanupHomeDotfiles = (testName: string, alias?: string) => {
    const home = homedir()
    const homeConfigDir = resolve(home, '.config')

    // Clean up root-level dotfiles (~/.<name>.config.* and ~/.<name>.*)
    const rootFiles = [
      `.${testName}.config.ts`,
      `.${testName}.config.js`,
      `.${testName}.config.mjs`,
      `.${testName}.config.cjs`,
      `.${testName}.config.json`,
      `.${testName}.ts`,
      `.${testName}.js`,
      `.${testName}.mjs`,
      `.${testName}.cjs`,
      `.${testName}.json`,
    ]
    if (alias) {
      rootFiles.push(
        `.${alias}.config.ts`,
        `.${alias}.config.js`,
        `.${alias}.config.mjs`,
        `.${alias}.config.cjs`,
        `.${alias}.config.json`,
        `.${alias}.ts`,
        `.${alias}.js`,
        `.${alias}.mjs`,
        `.${alias}.cjs`,
        `.${alias}.json`,
      )
    }
    for (const f of rootFiles) {
      const p = resolve(home, f)
      if (existsSync(p))
        rmSync(p)
    }

    // Clean up ~/.config dotfiles (~/.config/.<name>.config.*)
    const configDirFiles = [`.${testName}.config.ts`, `.${testName}.config.js`, `.${testName}.config.mjs`, `.${testName}.config.cjs`, `.${testName}.config.json`]
    if (alias) {
      configDirFiles.push(`.${alias}.config.ts`, `.${alias}.config.js`, `.${alias}.config.mjs`, `.${alias}.config.cjs`, `.${alias}.config.json`)
    }
    for (const f of configDirFiles) {
      const p = resolve(homeConfigDir, f)
      if (existsSync(p))
        rmSync(p)
    }
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
        cleanupHomeDotfiles(testName)
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

  describe('Dotfile config patterns', () => {
    describe('~/.config/.<name>.config.* patterns', () => {
      it('should load config from ~/.config/.<name>.config.ts', async () => {
        const testName = generateTestName()
        const homeConfigDir = resolve(homedir(), '.config')

        try {
          mkdirSync(homeConfigDir, { recursive: true })

          const configPath = resolve(homeConfigDir, `.${testName}.config.ts`)
          writeFileSync(configPath, `export default { source: 'config-dir-dotfile', value: 42 }`)

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', value: 0 },
          })

          expect(result).toEqual({ source: 'config-dir-dotfile', value: 42 })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })

      it('should load config from ~/.config/.<alias>.config.ts when using alias', async () => {
        const testName = generateTestName()
        const testAlias = `${testName}-alias`
        const homeConfigDir = resolve(homedir(), '.config')

        try {
          mkdirSync(homeConfigDir, { recursive: true })

          const configPath = resolve(homeConfigDir, `.${testAlias}.config.ts`)
          writeFileSync(configPath, `export default { source: 'config-dir-alias-dotfile', alias: true }`)

          const result = await loadConfig({
            name: testName,
            alias: testAlias,
            cwd: testCwd,
            defaultConfig: { source: 'default', alias: false },
          })

          expect(result).toEqual({ source: 'config-dir-alias-dotfile', alias: true })
        }
        finally {
          cleanupHomeDotfiles(testName, testAlias)
        }
      })

      it('should handle different extensions for ~/.config/.<name>.config.*', async () => {
        const testName = generateTestName()
        const homeConfigDir = resolve(homedir(), '.config')

        try {
          mkdirSync(homeConfigDir, { recursive: true })

          const configPath = resolve(homeConfigDir, `.${testName}.config.json`)
          writeFileSync(configPath, JSON.stringify({ source: 'config-dir-dotfile-json', format: 'json' }))

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', format: 'unknown' },
          })

          expect(result).toEqual({ source: 'config-dir-dotfile-json', format: 'json' })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })
    })

    describe('~/.<name>.* patterns (without .config suffix)', () => {
      it('should load config from ~/.<name>.ts', async () => {
        const testName = generateTestName()
        const homeDir = homedir()

        try {
          const configPath = resolve(homeDir, `.${testName}.ts`)
          writeFileSync(configPath, `export default { source: 'home-root-dotfile', simple: true }`)

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', simple: false },
          })

          expect(result).toEqual({ source: 'home-root-dotfile', simple: true })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })

      it('should load config from ~/.<alias>.ts when using alias', async () => {
        const testName = generateTestName()
        const testAlias = `${testName}-alias`
        const homeDir = homedir()

        try {
          const configPath = resolve(homeDir, `.${testAlias}.ts`)
          writeFileSync(configPath, `export default { source: 'home-root-alias-dotfile', aliased: true }`)

          const result = await loadConfig({
            name: testName,
            alias: testAlias,
            cwd: testCwd,
            defaultConfig: { source: 'default', aliased: false },
          })

          expect(result).toEqual({ source: 'home-root-alias-dotfile', aliased: true })
        }
        finally {
          cleanupHomeDotfiles(testName, testAlias)
        }
      })

      it('should handle different extensions for ~/.<name>.*', async () => {
        const testName = generateTestName()
        const homeDir = homedir()

        try {
          const configPath = resolve(homeDir, `.${testName}.json`)
          writeFileSync(configPath, JSON.stringify({ source: 'home-root-dotfile-json', extension: 'json' }))

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', extension: 'unknown' },
          })

          expect(result).toEqual({ source: 'home-root-dotfile-json', extension: 'json' })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })
    })

    describe('Config loading priority', () => {
      it('should prefer ~/.config/.<name>.config.* over ~/.<name>.*', async () => {
        const testName = generateTestName()
        const homeDir = homedir()
        const homeConfigDir = resolve(homeDir, '.config')

        try {
          mkdirSync(homeConfigDir, { recursive: true })

          // Create both patterns
          const configDirPath = resolve(homeConfigDir, `.${testName}.config.ts`)
          const rootPath = resolve(homeDir, `.${testName}.ts`)

          writeFileSync(configDirPath, `export default { source: 'config-dir-dotfile', priority: 'high' }`)
          writeFileSync(rootPath, `export default { source: 'home-root-dotfile', priority: 'low' }`)

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', priority: 'none' },
          })

          // Should prefer ~/.config/.<name>.config.* over ~/.<name>.*
          expect(result).toEqual({ source: 'config-dir-dotfile', priority: 'high' })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })

      it('should prefer ~/.<name>.config.* over ~/.<name>.*', async () => {
        const testName = generateTestName()
        const homeDir = homedir()

        try {
          // Create both patterns in home root
          const configPath = resolve(homeDir, `.${testName}.config.ts`)
          const simplePath = resolve(homeDir, `.${testName}.ts`)

          writeFileSync(configPath, `export default { source: 'home-config-dotfile', priority: 'high' }`)
          writeFileSync(simplePath, `export default { source: 'home-simple-dotfile', priority: 'low' }`)

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', priority: 'none' },
          })

          // Should prefer ~/.<name>.config.* over ~/.<name>.*
          expect(result).toEqual({ source: 'home-config-dotfile', priority: 'high' })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })

      it('should prefer local config over all dotfile patterns', async () => {
        const testName = generateTestName()
        const homeDir = homedir()
        const homeConfigDir = resolve(homeDir, '.config')

        try {
          mkdirSync(homeConfigDir, { recursive: true })

          // Create local config
          const localConfigPath = resolve(testCwd, `${testName}.config.ts`)
          writeFileSync(localConfigPath, `export default { source: 'local', priority: 'highest' }`)

          // Create all dotfile patterns
          const configDirPath = resolve(homeConfigDir, `.${testName}.config.ts`)
          const homeConfigPath = resolve(homeDir, `.${testName}.config.ts`)
          const homeSimplePath = resolve(homeDir, `.${testName}.ts`)

          writeFileSync(configDirPath, `export default { source: 'config-dir-dotfile', priority: 'high' }`)
          writeFileSync(homeConfigPath, `export default { source: 'home-config-dotfile', priority: 'medium' }`)
          writeFileSync(homeSimplePath, `export default { source: 'home-simple-dotfile', priority: 'low' }`)

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', priority: 'none' },
          })

          // Should prefer local config over all dotfile patterns
          expect(result).toEqual({ source: 'local', priority: 'highest' })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })
    })

    describe('Error handling for dotfile patterns', () => {
      it('should handle invalid ~/.config/.<name>.config.* gracefully', async () => {
        const testName = generateTestName()
        const homeConfigDir = resolve(homedir(), '.config')

        try {
          mkdirSync(homeConfigDir, { recursive: true })

          const configPath = resolve(homeConfigDir, `.${testName}.config.ts`)
          writeFileSync(configPath, `export default "invalid config"`)

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', valid: true },
          })

          expect(result).toEqual({ source: 'default', valid: true })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })

      it('should handle invalid ~/.<name>.* gracefully', async () => {
        const testName = generateTestName()
        const homeDir = homedir()

        try {
          const configPath = resolve(homeDir, `.${testName}.ts`)
          writeFileSync(configPath, `export default null`)

          const result = await loadConfig({
            name: testName,
            cwd: testCwd,
            defaultConfig: { source: 'default', valid: true },
          })

          expect(result).toEqual({ source: 'default', valid: true })
        }
        finally {
          cleanupHomeDotfiles(testName)
        }
      })
    })
  })
})
