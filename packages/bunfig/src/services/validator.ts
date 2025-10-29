import { existsSync } from 'node:fs'
import { globalPerformanceMonitor } from '../cache'
import { SchemaValidationError } from '../errors'

/**
 * Validation rule for configuration properties
 */
export interface ValidationRule {
  /** Property path (dot notation) */
  path: string
  /** Whether the property is required */
  required?: boolean
  /** Expected type */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
  /** Minimum value/length */
  min?: number
  /** Maximum value/length */
  max?: number
  /** Regular expression pattern for strings */
  pattern?: RegExp
  /** Allowed values */
  enum?: unknown[]
  /** Custom validation function */
  validator?: (value: unknown) => string | null
  /** Error message for validation failure */
  message?: string
}

/**
 * Schema validation options
 */
export interface ValidationOptions {
  /** Whether to stop on first error */
  stopOnFirstError?: boolean
  /** Whether to validate required fields */
  validateRequired?: boolean
  /** Whether to validate types */
  validateTypes?: boolean
  /** Custom validation rules */
  customRules?: ValidationRule[]
  /** Track performance */
  trackPerformance?: boolean
  /** Verbose logging */
  verbose?: boolean
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean
  /** Validation errors */
  errors: ValidationError[]
  /** Validation warnings */
  warnings: ValidationError[]
  /** Performance metrics if tracked */
  metrics?: any
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Property path */
  path: string
  /** Error message */
  message: string
  /** Expected value/type */
  expected?: string
  /** Actual value */
  actual?: unknown
  /** Rule that failed */
  rule?: string
}

/**
 * JSON Schema support
 */
interface JSONSchema {
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  enum?: unknown[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  additionalProperties?: boolean | JSONSchema
  [key: string]: unknown
}

/**
 * URL pattern regex for API validation rules
 */
const URL_PATTERN = /^https?:\/\//

/**
 * Configuration validator service
 */
export class ConfigValidator {
  /**
   * Validate configuration against schema
   */
  async validateConfiguration<T>(
    config: T,
    schema: string | JSONSchema | ValidationRule[],
    options: ValidationOptions = {},
  ): Promise<ValidationResult> {
    const {
      stopOnFirstError = false,
      validateRequired = true,
      validateTypes = true,
      customRules = [],
      trackPerformance = true,
      verbose = false,
    } = options

    const operation = async (): Promise<ValidationResult> => {
      const errors: ValidationError[] = []
      const warnings: ValidationError[] = []

      // Create options object with defaults applied
      const resolvedOptions: ValidationOptions = {
        stopOnFirstError,
        validateRequired,
        validateTypes,
        customRules,
        trackPerformance,
        verbose,
      }

      try {
        if (typeof schema === 'string') {
          // Load schema from file
          return await this.validateWithSchemaFile(config, schema, resolvedOptions)
        }
        else if (Array.isArray(schema)) {
          // Validate with custom rules
          return this.validateWithRules(config, [...schema, ...customRules], resolvedOptions)
        }
        else {
          // Validate with JSON schema
          return this.validateWithJSONSchema(config, schema, resolvedOptions)
        }
      }
      catch (error) {
        errors.push({
          path: '',
          message: `Validation failed: ${error}`,
          rule: 'system',
        })

        return { isValid: false, errors, warnings }
      }
    }

    if (trackPerformance) {
      const result = await globalPerformanceMonitor.track(
        'validateConfiguration',
        operation,
      )
      return result
    }

    return operation()
  }

  /**
   * Validate configuration with schema file
   */
  private async validateWithSchemaFile<T>(
    config: T,
    schemaPath: string,
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    try {
      if (!existsSync(schemaPath)) {
        throw new SchemaValidationError(
          schemaPath,
          [{ path: '', message: 'Schema file does not exist' }],
        )
      }

      const schemaModule = await import(schemaPath)
      const schema = schemaModule.default || schemaModule

      if (Array.isArray(schema)) {
        return this.validateWithRules(config, schema, options)
      }
      else {
        return this.validateWithJSONSchema(config, schema, options)
      }
    }
    catch (error) {
      throw new SchemaValidationError(
        schemaPath,
        [{ path: '', message: `Failed to load schema: ${error}` }],
      )
    }
  }

  /**
   * Validate configuration with JSON schema
   */
  private validateWithJSONSchema<T>(
    config: T,
    schema: JSONSchema,
    options: ValidationOptions,
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    this.validateObjectAgainstSchema(config, schema, '', errors, warnings, options)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate object against JSON schema recursively
   */
  private validateObjectAgainstSchema(
    value: unknown,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    options: ValidationOptions,
  ): void {
    // Type validation
    if (options.validateTypes && schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type]

      if (!expectedTypes.includes(actualType)) {
        errors.push({
          path,
          message: `Expected type ${expectedTypes.join(' or ')}, got ${actualType}`,
          expected: expectedTypes.join(' or '),
          actual: actualType,
          rule: 'type',
        })

        if (options.stopOnFirstError)
          return
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        expected: schema.enum.join(', '),
        actual: value,
        rule: 'enum',
      })

      if (options.stopOnFirstError)
        return
    }

    // String validations
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path,
          message: `String length must be at least ${schema.minLength}`,
          expected: `>= ${schema.minLength}`,
          actual: value.length,
          rule: 'minLength',
        })
      }

      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path,
          message: `String length must not exceed ${schema.maxLength}`,
          expected: `<= ${schema.maxLength}`,
          actual: value.length,
          rule: 'maxLength',
        })
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern)
        if (!regex.test(value)) {
          errors.push({
            path,
            message: `String does not match pattern ${schema.pattern}`,
            expected: schema.pattern,
            actual: value,
            rule: 'pattern',
          })
        }
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          path,
          message: `Value must be at least ${schema.minimum}`,
          expected: `>= ${schema.minimum}`,
          actual: value,
          rule: 'minimum',
        })
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          path,
          message: `Value must not exceed ${schema.maximum}`,
          expected: `<= ${schema.maximum}`,
          actual: value,
          rule: 'maximum',
        })
      }
    }

    // Array validations
    if (Array.isArray(value) && schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`
        this.validateObjectAgainstSchema(
          value[i],
          schema.items,
          itemPath,
          errors,
          warnings,
          options,
        )

        if (options.stopOnFirstError && errors.length > 0)
          return
      }
    }

    // Object validations
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>

      // Required properties
      if (options.validateRequired && schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in obj)) {
            errors.push({
              path: path ? `${path}.${requiredProp}` : requiredProp,
              message: `Missing required property '${requiredProp}'`,
              expected: 'required',
              rule: 'required',
            })

            if (options.stopOnFirstError)
              return
          }
        }
      }

      // Property validation
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in obj) {
            const propPath = path ? `${path}.${propName}` : propName
            this.validateObjectAgainstSchema(
              obj[propName],
              propSchema,
              propPath,
              errors,
              warnings,
              options,
            )

            if (options.stopOnFirstError && errors.length > 0)
              return
          }
        }
      }

      // Additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(schema.properties || {}))
        for (const propName of Object.keys(obj)) {
          if (!allowedProps.has(propName)) {
            warnings.push({
              path: path ? `${path}.${propName}` : propName,
              message: `Additional property '${propName}' is not allowed`,
              rule: 'additionalProperties',
            })
          }
        }
      }
    }
  }

  /**
   * Validate configuration with custom rules
   */
  private validateWithRules<T>(
    config: T,
    rules: ValidationRule[],
    options: ValidationOptions,
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    for (const rule of rules) {
      try {
        const value = this.getValueByPath(config, rule.path)
        const ruleErrors = this.validateWithRule(value, rule, rule.path)

        errors.push(...ruleErrors)

        if (options.stopOnFirstError && errors.length > 0) {
          break
        }
      }
      catch (error) {
        errors.push({
          path: rule.path,
          message: `Rule validation failed: ${error}`,
          rule: 'system',
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate value against a single rule
   */
  private validateWithRule(value: unknown, rule: ValidationRule, path: string): ValidationError[] {
    const errors: ValidationError[] = []

    // Required validation
    if (rule.required && (value === undefined || value === null)) {
      errors.push({
        path,
        message: rule.message || `Property '${path}' is required`,
        expected: 'required',
        rule: 'required',
      })
      return errors
    }

    // Skip other validations if value is undefined/null and not required
    if (value === undefined || value === null) {
      return errors
    }

    // Type validation
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== rule.type) {
        errors.push({
          path,
          message: rule.message || `Expected type ${rule.type}, got ${actualType}`,
          expected: rule.type,
          actual: actualType,
          rule: 'type',
        })
      }
    }

    // Min/Max validation
    if (rule.min !== undefined) {
      const length = Array.isArray(value)
        ? value.length
        : typeof value === 'string'
          ? value.length
          : typeof value === 'number' ? value : 0

      if (length < rule.min) {
        errors.push({
          path,
          message: rule.message || `Value must be at least ${rule.min}`,
          expected: `>= ${rule.min}`,
          actual: length,
          rule: 'min',
        })
      }
    }

    if (rule.max !== undefined) {
      const length = Array.isArray(value)
        ? value.length
        : typeof value === 'string'
          ? value.length
          : typeof value === 'number' ? value : 0

      if (length > rule.max) {
        errors.push({
          path,
          message: rule.message || `Value must not exceed ${rule.max}`,
          expected: `<= ${rule.max}`,
          actual: length,
          rule: 'max',
        })
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({
          path,
          message: rule.message || `Value does not match pattern ${rule.pattern}`,
          expected: rule.pattern.toString(),
          actual: value,
          rule: 'pattern',
        })
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        path,
        message: rule.message || `Value must be one of: ${rule.enum.join(', ')}`,
        expected: rule.enum.join(', '),
        actual: value,
        rule: 'enum',
      })
    }

    // Custom validation
    if (rule.validator) {
      const customError = rule.validator(value)
      if (customError) {
        errors.push({
          path,
          message: rule.message || customError,
          rule: 'custom',
        })
      }
    }

    return errors
  }

  /**
   * Get value by dot notation path
   */
  private getValueByPath(obj: unknown, path: string): unknown {
    if (!path)
      return obj

    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key]
      }
      else {
        return undefined
      }
    }

    return current
  }

  /**
   * Generate validation rules from TypeScript interface
   */
  generateRulesFromInterface(interfaceCode: string): ValidationRule[] {
    // This is a simplified implementation
    // In a real scenario, you'd use TypeScript compiler API
    const rules: ValidationRule[] = []

    // Extract properties from interface definition
    const propertyMatches = interfaceCode.matchAll(/(\w+)(\?)?:\s*(\w+)/g)

    for (const match of propertyMatches) {
      const [, propName, optional, typeName] = match

      rules.push({
        path: propName,
        required: !optional,
        type: this.mapTypeScriptType(typeName),
      })
    }

    return rules
  }

  /**
   * Map TypeScript type to validation type
   */
  private mapTypeScriptType(tsType: string): ValidationRule['type'] {
    switch (tsType.toLowerCase()) {
      case 'string':
        return 'string'
      case 'number':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'array':
        return 'array'
      case 'object':
        return 'object'
      default:
        return 'object'
    }
  }

  /**
   * Create validation rules for common patterns
   */
  static createCommonRules(): Record<string, ValidationRule[]> {
    return {
      server: [
        { path: 'port', required: true, type: 'number', min: 1, max: 65535 },
        { path: 'host', required: true, type: 'string', min: 1 },
        { path: 'ssl', type: 'boolean' },
      ],
      database: [
        { path: 'url', required: true, type: 'string', min: 1 },
        { path: 'pool', type: 'number', min: 1, max: 100 },
        { path: 'timeout', type: 'number', min: 0 },
      ],
      api: [
        { path: 'baseUrl', required: true, type: 'string', pattern: URL_PATTERN },
        { path: 'timeout', type: 'number', min: 0 },
        { path: 'retries', type: 'number', min: 0, max: 10 },
      ],
    }
  }
}
