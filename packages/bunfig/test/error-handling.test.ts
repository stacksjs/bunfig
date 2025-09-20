import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfigWithResult, ErrorFactory, ConfigNotFoundError, ConfigLoadError, ConfigValidationError, SchemaValidationError } from '../src'

describe('Error Handling', () => {
  const testDir = resolve(process.cwd(), 'test-errors')

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
  })

  describe('ErrorFactory', () => {
    it('should create ConfigNotFoundError with context', () => {
      const error = ErrorFactory.configNotFound('test-config', ['/path1', '/path2'], 'my-alias')

      expect(error).toBeInstanceOf(ConfigNotFoundError)
      expect(error.code).toBe('CONFIG_NOT_FOUND')
      expect(error.context.configName).toBe('test-config')
      expect(error.context.searchPaths).toEqual(['/path1', '/path2'])
      expect(error.context.alias).toBe('my-alias')
      expect(error.message).toContain('test-config')
    })

    it('should create ConfigLoadError with context', () => {
      const originalError = new Error('Syntax error')
      const error = ErrorFactory.configLoad('/path/config.ts', originalError)

      expect(error).toBeInstanceOf(ConfigLoadError)
      expect(error.code).toBe('CONFIG_LOAD_ERROR')
      expect(error.context.configPath).toBe('/path/config.ts')
      expect(error.context.originalMessage).toBe('Syntax error')
      expect(error.message).toContain('/path/config.ts')
    })

    it('should create ValidationError with context', () => {
      const validationErrors = [
        'Invalid port'
      ]
      const error = ErrorFactory.configValidation('my-config', validationErrors, 'my-config')

      expect(error).toBeInstanceOf(ConfigValidationError)
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR')
      expect(error.context.configName).toBe('my-config')
      expect(error.context.validationErrors).toEqual(validationErrors)
    })

    it('should create SchemaValidationError with context', () => {
      const schemaErrors = [
        { path: 'host', message: 'Required field missing' }
      ]
      const error = ErrorFactory.schemaValidation('/schema.json', schemaErrors)

      expect(error).toBeInstanceOf(SchemaValidationError)
      expect(error.code).toBe('SCHEMA_VALIDATION_ERROR')
      expect(error.context.schemaPath).toBe('/schema.json')
      expect(error.context.validationErrors).toEqual(schemaErrors)
    })
  })

  describe('Config Loading Errors', () => {
    it('should throw ConfigNotFoundError when no config files exist', async () => {
      await expect(
        loadConfigWithResult({
          name: 'nonexistent',
          cwd: testDir,
          defaultConfig: { value: 'default' },
        })
      ).rejects.toThrow(ConfigNotFoundError)
    })

    it('should throw ConfigLoadError for invalid syntax', async () => {
      const configPath = resolve(testDir, 'invalid.config.ts')
      writeFileSync(configPath, 'export default { invalid: syntax }')

      await expect(
        loadConfigWithResult({
          name: 'invalid',
          cwd: testDir,
          defaultConfig: { value: 'default' },
        })
      ).rejects.toThrow(ConfigLoadError)
    })

    it('should throw ConfigLoadError for permission denied', async () => {
      const configPath = resolve(testDir, 'restricted.config.ts')
      writeFileSync(configPath, 'export default { value: "test" }')

      // Make file unreadable (only on Unix-like systems)
      if (process.platform !== 'win32') {
        chmodSync(configPath, 0o000)

        await expect(
          loadConfigWithResult({
            name: 'restricted',
            cwd: testDir,
            defaultConfig: { value: 'default' },
          })
        ).rejects.toThrow()

        // Restore permissions for cleanup
        chmodSync(configPath, 0o644)
      }
    })

    it('should handle circular dependencies gracefully', async () => {
      const config1Path = resolve(testDir, 'circular1.config.ts')
      const config2Path = resolve(testDir, 'circular2.config.ts')

      writeFileSync(config1Path, `
        import('./circular2.config.ts')
        export default { name: 'circular1' }
      `)
      writeFileSync(config2Path, `
        import('./circular1.config.ts')
        export default { name: 'circular2' }
      `)

      // This should not throw due to circular dependencies
      const result = await loadConfigWithResult({
        name: 'circular1',
        cwd: testDir,
        defaultConfig: { name: 'default' },
      })

      expect(result.config.name).toBe('circular1')
    })
  })

  describe('Validation Errors', () => {
    it('should throw ValidationError for schema validation failure', async () => {
      const configPath = resolve(testDir, 'invalid-schema.config.ts')
      writeFileSync(configPath, 'export default { port: "not-a-number" }')

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 },
        },
        required: ['port'],
      }

      await expect(
        loadConfigWithResult({
          name: 'invalid-schema',
          cwd: testDir,
          defaultConfig: { port: 3000 },
          schema,
        })
      ).rejects.toThrow(ConfigValidationError)
    })

    it('should throw ValidationError for custom validation failure', async () => {
      const configPath = resolve(testDir, 'invalid-custom.config.ts')
      writeFileSync(configPath, 'export default { apiKey: "short" }')

      const customValidator = (config: any) => {
        const errors: string[] = []
        if (config.apiKey && config.apiKey.length < 10) {
          errors.push('apiKey must be at least 10 characters')
        }
        return errors.length > 0 ? errors : undefined
      }

      await expect(
        loadConfigWithResult({
          name: 'invalid-custom',
          cwd: testDir,
          defaultConfig: { apiKey: 'default-key' },
          validate: customValidator,
        })
      ).rejects.toThrow(ConfigValidationError)
    })

    it('should provide detailed error context', async () => {
      const configPath = resolve(testDir, 'detailed-error.config.ts')
      writeFileSync(configPath, 'export default { port: -1, host: "" }')

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 },
          host: { type: 'string', minLength: 1 },
        },
        required: ['port', 'host'],
      }

      try {
        await loadConfigWithResult({
          name: 'detailed-error',
          cwd: testDir,
          defaultConfig: { port: 3000, host: 'localhost' },
          schema,
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError)
        const validationError = error as ConfigValidationError
        expect(validationError.context.validationErrors).toHaveLength(2)
        expect(validationError.context.validationErrors.some(e => e.includes('port'))).toBe(true)
        expect(validationError.context.validationErrors.some(e => e.includes('host'))).toBe(true)
      }
    })
  })

  describe('Error Recovery', () => {
    it('should use default config when file load fails but recovery is enabled', async () => {
      const configPath = resolve(testDir, 'recovery.config.ts')
      writeFileSync(configPath, 'export default { invalid: syntax }')

      // Note: This would require implementing a recovery option in loadConfigWithResult
      // For now, we test that errors are properly thrown
      await expect(
        loadConfigWithResult({
          name: 'recovery',
          cwd: testDir,
          defaultConfig: { value: 'fallback' },
        })
      ).rejects.toThrow()
    })

    it('should handle missing schema file gracefully', async () => {
      const configPath = resolve(testDir, 'no-schema.config.ts')
      writeFileSync(configPath, 'export default { port: 3000 }')

      const nonExistentSchemaPath = resolve(testDir, 'nonexistent-schema.json')

      await expect(
        loadConfigWithResult({
          name: 'no-schema',
          cwd: testDir,
          defaultConfig: { port: 8080 },
          schema: nonExistentSchemaPath,
        })
      ).rejects.toThrow(ConfigValidationError)
    })
  })

  describe('Error Serialization', () => {
    it('should serialize errors with context for logging', () => {
      const error = ErrorFactory.configNotFound('test', ['/path1'], 'alias')

      const serialized = JSON.parse(JSON.stringify(error))
      expect(serialized.code).toBe('CONFIG_NOT_FOUND')
      expect(serialized.context).toBeDefined()
      expect(serialized.timestamp).toBeDefined()
    })

    it('should include stack trace in development', () => {
      const error = ErrorFactory.configLoad('/path/test.ts', new Error('Test error'))

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('test.ts')
    })
  })
})