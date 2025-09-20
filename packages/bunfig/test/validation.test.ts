import { describe, expect, it } from 'bun:test'
import { ConfigValidator } from '../src/services/validator'

describe('Configuration Validation', () => {
  const validator = new ConfigValidator()

  describe('JSON Schema validation', () => {
    it('should validate simple object schema', async () => {
      const config = {
        port: 3000,
        host: 'localhost',
        enabled: true,
      }

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 },
          host: { type: 'string', minLength: 1 },
          enabled: { type: 'boolean' },
        },
        required: ['port', 'host'],
      }

      const result = await validator.validateConfiguration(config, schema)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation for missing required fields', async () => {
      const config = {
        port: 3000,
        // missing required 'host' field
      }

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number' },
          host: { type: 'string' },
        },
        required: ['port', 'host'],
      }

      const result = await validator.validateConfiguration(config, schema, {
        validateRequired: true,
        validateTypes: true,
      })
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Missing required property')
      expect(result.errors[0].path).toBe('host')
    })

    it('should validate array schemas', async () => {
      const config = {
        tags: ['web', 'api', 'service'],
        limits: [10, 20, 30],
      }

      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          limits: {
            type: 'array',
            items: { type: 'number', minimum: 1 },
          },
        },
      }

      const result = await validator.validateConfiguration(config, schema)
      expect(result.isValid).toBe(true)
    })

    it('should validate enum values', async () => {
      const config = {
        environment: 'production',
        logLevel: 'info',
      }

      const schema = {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            enum: ['development', 'staging', 'production'],
          },
          logLevel: {
            type: 'string',
            enum: ['error', 'warn', 'info', 'debug'],
          },
        },
      }

      const result = await validator.validateConfiguration(config, schema)
      expect(result.isValid).toBe(true)
    })

    it('should fail validation for invalid enum values', async () => {
      const config = {
        environment: 'invalid-env',
      }

      const schema = {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            enum: ['development', 'staging', 'production'],
          },
        },
      }

      const result = await validator.validateConfiguration(config, schema)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].message).toContain('must be one of')
    })

    it('should validate string patterns', async () => {
      const config = {
        email: 'test@example.com',
        version: '1.2.3',
      }

      const schema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            pattern: '^[\\w-]+@[\\w-]+\\.[a-z]{2,}$',
          },
          version: {
            type: 'string',
            pattern: '^\\d+\\.\\d+\\.\\d+$',
          },
        },
      }

      const result = await validator.validateConfiguration(config, schema)
      expect(result.isValid).toBe(true)
    })

    it('should validate nested objects', async () => {
      const config = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret',
          },
        },
      }

      const schema = {
        type: 'object',
        properties: {
          database: {
            type: 'object',
            properties: {
              host: { type: 'string' },
              port: { type: 'number', minimum: 1, maximum: 65535 },
              credentials: {
                type: 'object',
                properties: {
                  username: { type: 'string', minLength: 1 },
                  password: { type: 'string', minLength: 1 },
                },
                required: ['username', 'password'],
              },
            },
            required: ['host', 'port'],
          },
        },
      }

      const result = await validator.validateConfiguration(config, schema)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Custom rules validation', () => {
    it('should validate with custom rules', async () => {
      const config = {
        port: 3000,
        host: 'localhost',
        timeout: 5000,
      }

      const rules = [
        {
          path: 'port',
          required: true,
          type: 'number' as const,
          min: 1,
          max: 65535,
        },
        {
          path: 'host',
          required: true,
          type: 'string' as const,
          min: 1,
        },
        {
          path: 'timeout',
          type: 'number' as const,
          min: 0,
          max: 30000,
        },
      ]

      const result = await validator.validateConfiguration(config, rules)
      expect(result.isValid).toBe(true)
    })

    it('should fail validation with custom rules', async () => {
      const config = {
        port: 99999, // Too high
        host: '', // Empty string
      }

      const rules = [
        {
          path: 'port',
          required: true,
          type: 'number' as const,
          min: 1,
          max: 65535,
        },
        {
          path: 'host',
          required: true,
          type: 'string' as const,
          min: 1,
        },
      ]

      const result = await validator.validateConfiguration(config, rules)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('should validate with custom validator function', async () => {
      const config = {
        email: 'invalid-email',
      }

      const rules = [
        {
          path: 'email',
          validator: (value: unknown) => {
            if (typeof value !== 'string') {
              return 'Email must be a string'
            }
            if (!value.includes('@')) {
              return 'Email must contain @ symbol'
            }
            return null
          },
        },
      ]

      const result = await validator.validateConfiguration(config, rules)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].message).toContain('@ symbol')
    })

    it('should validate enum with custom rules', async () => {
      const config = {
        level: 'medium',
      }

      const rules = [
        {
          path: 'level',
          enum: ['low', 'medium', 'high'],
        },
      ]

      const result = await validator.validateConfiguration(config, rules)
      expect(result.isValid).toBe(true)
    })

    it('should validate pattern with custom rules', async () => {
      const config = {
        code: 'ABC123',
      }

      const rules = [
        {
          path: 'code',
          pattern: /^[A-Z]{3}\d{3}$/,
        },
      ]

      const result = await validator.validateConfiguration(config, rules)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Common validation rules', () => {
    it('should provide server validation rules', () => {
      const rules = ConfigValidator.createCommonRules()

      expect(rules.server).toBeDefined()
      expect(rules.server.some(rule => rule.path === 'port')).toBe(true)
      expect(rules.server.some(rule => rule.path === 'host')).toBe(true)
    })

    it('should provide database validation rules', () => {
      const rules = ConfigValidator.createCommonRules()

      expect(rules.database).toBeDefined()
      expect(rules.database.some(rule => rule.path === 'url')).toBe(true)
      expect(rules.database.some(rule => rule.path === 'pool')).toBe(true)
    })

    it('should provide API validation rules', () => {
      const rules = ConfigValidator.createCommonRules()

      expect(rules.api).toBeDefined()
      expect(rules.api.some(rule => rule.path === 'baseUrl')).toBe(true)
      expect(rules.api.some(rule => rule.path === 'timeout')).toBe(true)
    })
  })

  describe('Validation options', () => {
    it('should stop on first error when configured', async () => {
      const config = {
        port: 'invalid', // Wrong type
        host: '', // Too short
      }

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number' },
          host: { type: 'string', minLength: 1 },
        },
      }

      const result = await validator.validateConfiguration(config, schema, {
        stopOnFirstError: true,
      })

      expect(result.isValid).toBe(false)
      // Should only have one error due to stopOnFirstError
      expect(result.errors).toHaveLength(1)
    })

    it('should collect all errors when not stopping on first', async () => {
      const config = {
        port: 'invalid', // Wrong type
        host: '', // Too short
      }

      const schema = {
        type: 'object',
        properties: {
          port: { type: 'number' },
          host: { type: 'string', minLength: 1 },
        },
      }

      const result = await validator.validateConfiguration(config, schema, {
        stopOnFirstError: false,
        validateTypes: true,
        validateRequired: true,
      })

      expect(result.isValid).toBe(false)
      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('TypeScript interface generation', () => {
    it('should generate rules from interface-like code', () => {
      const interfaceCode = `
        interface ServerConfig {
          port: number
          host: string
          ssl?: boolean
        }
      `

      const rules = validator.generateRulesFromInterface(interfaceCode)

      expect(rules).toHaveLength(3)
      expect(rules.some(rule => rule.path === 'port' && rule.required)).toBe(true)
      expect(rules.some(rule => rule.path === 'host' && rule.required)).toBe(true)
      expect(rules.some(rule => rule.path === 'ssl' && !rule.required)).toBe(true)
    })
  })
})