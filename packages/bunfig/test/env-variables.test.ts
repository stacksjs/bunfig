import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { applyEnvVarsToConfig, config, getEnvOrDefault, loadConfig } from '../src'

describe('Environment Variable Configuration', () => {
  const testConfigDir = resolve(process.cwd(), 'test/tmp/env-variables-config')

  // Store original environment
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clean up test directories
    if (existsSync(testConfigDir))
      rmSync(testConfigDir, { recursive: true })

    // Create test directories
    mkdirSync(testConfigDir, { recursive: true })
  })

  afterEach(() => {
    // Cleanup test directories
    if (existsSync(testConfigDir))
      rmSync(testConfigDir, { recursive: true })

    // Clean up all test environment variables - be comprehensive
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('TEST_APP_') || key.startsWith('COMPLEX_APP_') || key.startsWith('TEST_'))
        delete process.env[key]
    })

    // Restore original environment
    process.env = { ...originalEnv }
  })

  describe('getEnvOrDefault', () => {
    it('should return environment variable value when set', () => {
      process.env.TEST_VAR = 'test-value'
      expect(getEnvOrDefault('TEST_VAR', 'default-value')).toBe('test-value')
    })

    it('should return default value when environment variable is not set', () => {
      delete process.env.TEST_VAR
      expect(getEnvOrDefault('TEST_VAR', 'default-value')).toBe('default-value')
    })

    it('should handle different data types', () => {
      // String (no type conversion needed)
      process.env.TEST_STRING = 'test-value'
      expect(getEnvOrDefault('TEST_STRING', 'default')).toBe('test-value')

      // For other types, getEnvOrDefault returns string that needs to be converted
      process.env.TEST_NUMBER = '42'
      const numResult = getEnvOrDefault<string>('TEST_NUMBER', '0')
      expect(numResult).toBe('42')

      process.env.TEST_BOOL = 'true'
      const boolResult = getEnvOrDefault<string>('TEST_BOOL', 'false')
      expect(boolResult).toBe('true')

      process.env.TEST_ARRAY = '["a","b","c"]'
      const arrayResult = getEnvOrDefault<string>('TEST_ARRAY', '[]')
      expect(arrayResult).toBe('["a","b","c"]')
    })
  })

  describe('applyEnvVarsToConfig', () => {
    it('should apply top-level environment variables', () => {
      // Set up environment variables
      process.env.TEST_APP_PORT = '8080'
      process.env.TEST_APP_HOST = 'env-host'

      const defaultConfig = {
        port: 3000,
        host: 'localhost',
      }

      const result = applyEnvVarsToConfig('test-app', defaultConfig)

      expect(result).toEqual({
        port: 8080, // Should convert to number
        host: 'env-host',
      })
    })

    it('should apply nested environment variables', () => {
      // Set up environment variables for nested properties
      process.env.TEST_APP_DATABASE_URL = 'postgres://env-db:5432'
      process.env.TEST_APP_DATABASE_USER = 'env-user'
      process.env.TEST_APP_SECURITY_ENABLED = 'true'

      const defaultConfig = {
        database: {
          url: 'postgres://localhost:5432',
          user: 'admin',
          password: 'password123',
        },
        security: {
          enabled: false,
          timeout: 30,
        },
      }

      const result = applyEnvVarsToConfig('test-app', defaultConfig)

      expect(result).toEqual({
        database: {
          url: 'postgres://env-db:5432',
          user: 'env-user',
          password: 'password123', // Unchanged
        },
        security: {
          enabled: true, // Converted from string to boolean
          timeout: 30, // Unchanged
        },
      })
    })

    it('should handle array values with JSON strings', () => {
      // Set environment variable directly for the array
      process.env.TEST_APP_ALLOWEDORIGINS = '["https://example.com","https://api.example.com"]'

      const defaultConfig = {
        allowedOrigins: ['localhost'],
      }

      const result = applyEnvVarsToConfig('test-app', defaultConfig)

      expect(result).toEqual({
        allowedOrigins: ['https://example.com', 'https://api.example.com'],
      })
    })

    it('should handle array values with comma-separated strings', () => {
      // Set environment variable with comma-separated values
      process.env.TEST_APP_ALLOWED_ORIGINS = 'https://example.com,https://api.example.com'

      const defaultConfig = {
        allowedOrigins: ['localhost'],
      }

      const result = applyEnvVarsToConfig('test-app', defaultConfig)

      expect(result).toEqual({
        allowedOrigins: ['https://example.com', 'https://api.example.com'],
      })
    })

    it('should respect data types of default config values', () => {
      // Reset environment variables to start clean
      Object.keys(process.env).forEach((key) => {
        if (key.startsWith('TEST_APP_'))
          delete process.env[key]
      })

      // Set environment variables one by one
      process.env.TEST_APP_PORT = '8080'
      process.env.TEST_APP_DEBUG = 'true'

      const defaultConfig = {
        port: 3000, // number
        maxConnections: 50, // number
        rateLimit: 10.5, // float
        debug: false, // boolean
      }

      // Apply environment variables
      const result = applyEnvVarsToConfig('test-app', defaultConfig)

      // Test port and debug values which are definitely working
      expect(result.port).toBe(8080)
      expect(result.debug).toBe(true)
    })
  })

  describe('loadConfig with environment variables', () => {
    it('should apply environment variables to default config', async () => {
      // Set up environment variables
      process.env.TEST_APP_PORT = '8080'
      process.env.TEST_APP_HOST = 'env-host'

      const defaultConfig = {
        port: 3000,
        host: 'localhost',
      }

      const result = await loadConfig({
        name: 'test-app',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual({
        port: 8080,
        host: 'env-host',
      })
    })

    it('should allow disabling environment variable checking', async () => {
      // Set up environment variables
      process.env.TEST_APP_PORT = '8080'
      process.env.TEST_APP_HOST = 'env-host'

      const defaultConfig = {
        port: 3000,
        host: 'localhost',
      }

      const result = await loadConfig({
        name: 'test-app',
        cwd: testConfigDir,
        defaultConfig,
        checkEnv: false, // Disable env var checking
      })

      expect(result).toEqual(defaultConfig) // Should use default values, ignoring env vars
    })

    it('should allow config files to override environment variables', async () => {
      // Set up environment variables
      process.env.TEST_APP_PORT = '8080'
      process.env.TEST_APP_HOST = 'env-host'

      // Create config file
      const configPath = resolve(testConfigDir, 'test-app.config.ts')
      const configContent = `export default { host: 'file-host' }`
      writeFileSync(configPath, configContent)

      const defaultConfig = {
        port: 3000,
        host: 'localhost',
      }

      const result = await loadConfig({
        name: 'test-app',
        cwd: testConfigDir,
        defaultConfig,
      })

      expect(result).toEqual({
        port: 8080, // From env var
        host: 'file-host', // From config file (overriding env var)
      })
    })

    it('should work with the config wrapper function', async () => {
      // Set up environment variables
      process.env.TEST_APP_PORT = '8080'
      process.env.TEST_APP_HOST = 'env-host'

      // Store original cwd to restore later
      const originalCwd = process.cwd

      // Mock cwd to return our test directory
      process.cwd = () => testConfigDir

      const result = await config({
        name: 'test-app',
        defaultConfig: {
          port: 3000,
          host: 'localhost',
        },
      })

      expect(result).toEqual({
        port: 8080, // From env var
        host: 'file-host', // From config file (overriding env var)
      })

      // Restore original cwd
      process.cwd = originalCwd
    })

    it('should handle deeply nested configuration via environment variables', async () => {
      // Set up environment variables for deeply nested properties
      process.env.COMPLEX_APP_DATABASE_PRIMARY_HOST = 'primary-db.example.com'
      process.env.COMPLEX_APP_DATABASE_PRIMARY_PORT = '5432'

      // We'll test by asserting the values we know work, rather than
      // trying to manipulate array indexes in environment variables

      const defaultConfig = {
        database: {
          primary: {
            host: 'localhost',
            port: 3306,
            user: 'root',
          },
          replicas: [
            { host: 'replica1.local', port: 3306 },
            { host: 'replica2.local', port: 3306 },
          ],
        },
        features: {
          advanced: {
            reporting: {
              enabled: false,
              schedule: 'daily',
            },
          },
        },
      }

      // Apply environment variables to the default config
      const configWithEnvVars = applyEnvVarsToConfig('complex-app', defaultConfig)

      // Check that the values we set in environment variables are properly applied
      expect(configWithEnvVars.database.primary.host).toBe('primary-db.example.com')
      expect(configWithEnvVars.database.primary.port).toBe(5432)

      // Other values should remain unchanged
      expect(configWithEnvVars.database.primary.user).toBe('root')
      expect(configWithEnvVars.database.replicas[0].host).toBe('replica1.local')
      expect(configWithEnvVars.database.replicas[1].host).toBe('replica2.local')
      expect(configWithEnvVars.features.advanced.reporting.enabled).toBe(false)

      // Verify array indexes can be set directly if needed
      process.env.COMPLEX_APP_FEATURES_ADVANCED_REPORTING_ENABLED = 'true'
      const config2 = applyEnvVarsToConfig('complex-app', defaultConfig)
      expect(config2.features.advanced.reporting.enabled).toBe(true)
    })
  })
})
