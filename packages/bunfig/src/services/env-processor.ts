import type { ConfigSource } from '../types'
import process from 'node:process'
import { globalPerformanceMonitor } from '../cache'
import { EnvVarError, ErrorFactory } from '../errors'

/**
 * Environment variable processing options
 */
export interface EnvProcessingOptions {
  /** Prefix for environment variables */
  prefix?: string
  /** Whether to use camelCase conversion */
  useCamelCase?: boolean
  /** Whether to use backward compatibility format */
  useBackwardCompatibility?: boolean
  /** Custom type parsers */
  customParsers?: Record<string, (value: string) => unknown>
  /** Verbose logging */
  verbose?: boolean
  /** Track performance */
  trackPerformance?: boolean
}

/**
 * Environment variable type parser
 */
export interface TypeParser {
  /** Check if value should be parsed by this parser */
  canParse: (value: string, expectedType?: string) => boolean
  /** Parse the value */
  parse: (value: string) => unknown
  /** Parser name for error messages */
  name: string
}

/**
 * Environment variable processor service
 */
export class EnvProcessor {
  private readonly defaultParsers: TypeParser[]

  constructor() {
    this.defaultParsers = [
      {
        name: 'boolean',
        canParse: (value, expectedType) =>
          expectedType === 'boolean'
          || ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase()),
        parse: (value) => {
          const lower = value.toLowerCase()
          return ['true', '1', 'yes'].includes(lower)
        },
      },
      {
        name: 'number',
        canParse: (value, expectedType) =>
          expectedType === 'number'
          || (!Number.isNaN(Number(value)) && !Number.isNaN(Number.parseFloat(value))),
        parse: (value) => {
          const num = Number(value)
          if (Number.isNaN(num)) {
            throw new TypeError(`Cannot parse "${value}" as number`)
          }
          return num
        },
      },
      {
        name: 'array',
        canParse: (value, expectedType) =>
          expectedType === 'array'
          || value.startsWith('[')
          || value.includes(','),
        parse: (value) => {
          try {
            // Try JSON parsing first
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) {
              return parsed
            }
          }
          catch {
            // Fall back to comma-separated values
          }

          return value.split(',').map(item => item.trim())
        },
      },
      {
        name: 'json',
        canParse: (value, expectedType) =>
          expectedType === 'object'
          || ((value.startsWith('{') && value.endsWith('}'))
            || (value.startsWith('[') && value.endsWith(']'))),
        parse: (value) => {
          try {
            return JSON.parse(value)
          }
          catch (error) {
            throw new Error(`Cannot parse "${value}" as JSON: ${error}`)
          }
        },
      },
    ]
  }

  /**
   * Apply environment variables to configuration
   */
  async applyEnvironmentVariables<T extends Record<string, any>>(
    configName: string,
    config: T,
    options: EnvProcessingOptions = {},
  ): Promise<{ config: T, source: ConfigSource }> {
    const {
      prefix,
      useCamelCase = true,
      useBackwardCompatibility = true,
      customParsers = {},
      verbose = false,
      trackPerformance = true,
    } = options

    const operation = async () => {
      if (!configName) {
        return {
          config,
          source: { type: 'environment', priority: 50, timestamp: new Date() } as ConfigSource,
        }
      }

      const envPrefix = prefix || this.generateEnvPrefix(configName)
      const result = { ...config }

      // Process the configuration object recursively
      this.processObject(result, [], envPrefix, {
        useCamelCase,
        useBackwardCompatibility,
        customParsers,
        verbose,
        configName,
      })

      const source: ConfigSource = {
        type: 'environment',
        priority: 50,
        timestamp: new Date(),
      }

      return { config: result as T, source }
    }

    if (trackPerformance) {
      return globalPerformanceMonitor.track(
        'applyEnvironmentVariables',
        operation,
        { configName },
      )
    }

    return operation()
  }

  /**
   * Generate environment variable prefix from config name
   */
  private generateEnvPrefix(configName: string): string {
    return configName.toUpperCase().replace(/-/g, '_')
  }

  /**
   * Format a key for environment variable naming
   */
  private formatEnvKey(key: string, useCamelCase: boolean): string {
    if (!useCamelCase) {
      return key.toUpperCase()
    }

    // Convert camelCase to UPPER_SNAKE_CASE
    return key.replace(/([A-Z])/g, '_$1').toUpperCase()
  }

  /**
   * Process object recursively for environment variable replacement
   */
  private processObject(
    obj: Record<string, any>,
    path: string[],
    envPrefix: string,
    options: {
      useCamelCase: boolean
      useBackwardCompatibility: boolean
      customParsers: Record<string, (value: string) => unknown>
      verbose: boolean
      configName: string
    },
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const envPath = [...path, key]

      // Generate environment variable key
      const formattedKeys = envPath.map(k => this.formatEnvKey(k, options.useCamelCase))
      const envKey = `${envPrefix}_${formattedKeys.join('_')}`

      // Backward compatibility key (without extra underscores)
      const oldEnvKey = options.useBackwardCompatibility
        ? `${envPrefix}_${envPath.map(p => p.toUpperCase()).join('_')}`
        : null

      // Use a safer logging approach
      if (options.verbose) {
        // We would log this information in a production-safe way
        // For example: logger.info(`Checking environment variable ${envKey} for config ${options.configName}.${envPath.join('.')}`)
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Process nested objects recursively
        this.processObject(value, envPath, envPrefix, options)
      }
      else {
        // Check for environment variable (try both formats)
        const envValue = process.env[envKey] || (oldEnvKey ? process.env[oldEnvKey] : undefined)

        if (envValue !== undefined) {
          if (options.verbose) {
            const _usedKey = process.env[envKey] ? envKey : oldEnvKey
            // We would log this information in a production-safe way
            // For example: logger.info(`Using environment variable ${_usedKey} for config ${options.configName}.${envPath.join('.')}`)
          }

          try {
            obj[key] = this.parseEnvironmentValue(
              envValue,
              typeof value,
              envKey,
              options.customParsers,
              options.configName,
            )
          }
          catch (error) {
            if (error instanceof EnvVarError) {
              throw error
            }
            throw ErrorFactory.envVar(envKey, envValue, typeof value, options.configName)
          }
        }
      }
    }
  }

  /**
   * Parse environment variable value based on expected type
   */
  private parseEnvironmentValue(
    envValue: string,
    expectedType: string,
    envKey: string,
    customParsers: Record<string, (value: string) => unknown>,
    configName?: string,
  ): unknown {
    // Try custom parsers first
    for (const [_parserName, parser] of Object.entries(customParsers)) {
      try {
        return parser(envValue)
      }
      catch {
        // Custom parser failed, continue to default parsers
        continue
      }
    }

    // Try default parsers
    for (const parser of this.defaultParsers) {
      if (parser.canParse(envValue, expectedType)) {
        try {
          return parser.parse(envValue)
        }
        catch {
          throw ErrorFactory.envVar(
            envKey,
            envValue,
            `${expectedType} (via ${parser.name} parser)`,
            configName,
          )
        }
      }
    }

    // Default to string if no parser matches
    return envValue
  }

  /**
   * Get all environment variables with a specific prefix
   */
  getEnvironmentVariables(prefix: string): Record<string, string> {
    const envVars: Record<string, string> = {}
    const upperPrefix = prefix.toUpperCase()

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(upperPrefix) && value !== undefined) {
        envVars[key] = value
      }
    }

    return envVars
  }

  /**
   * Validate environment variable format
   */
  validateEnvironmentVariable(
    key: string,
    value: string,
    expectedType?: string,
  ): { isValid: boolean, errors: string[] } {
    const errors: string[] = []

    // Check key format
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      errors.push(`Environment variable key "${key}" should only contain uppercase letters, numbers, and underscores`)
    }

    // Check value can be parsed if type is specified
    if (expectedType) {
      try {
        this.parseEnvironmentValue(key, value, expectedType, {})
      }
      catch (error) {
        errors.push(`Cannot parse value "${value}" as ${expectedType}: ${error}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Generate environment variable documentation
   */
  generateEnvVarDocs<T extends Record<string, any>>(
    configName: string,
    defaultConfig: T,
    options: { prefix?: string, format?: 'text' | 'markdown' | 'json' } = {},
  ): string {
    const { prefix, format = 'text' } = options
    const envPrefix = prefix || this.generateEnvPrefix(configName)
    const envVars: Array<{
      key: string
      type: string
      description: string
      example: string
    }> = []

    this.extractEnvVarInfo(defaultConfig, [], envPrefix, envVars)

    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(envVars, configName)
      case 'json':
        return JSON.stringify(envVars, null, 2)
      default:
        return this.formatAsText(envVars, configName)
    }
  }

  /**
   * Extract environment variable information from config
   */
  private extractEnvVarInfo(
    obj: Record<string, any>,
    path: string[],
    prefix: string,
    envVars: Array<{ key: string, type: string, description: string, example: string }>,
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const envPath = [...path, key]
      const envKey = `${prefix}_${envPath.map(k => this.formatEnvKey(k, true)).join('_')}`

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractEnvVarInfo(value, envPath, prefix, envVars)
      }
      else {
        envVars.push({
          key: envKey,
          type: Array.isArray(value) ? 'array' : typeof value,
          description: `Configuration for ${envPath.join('.')}`,
          example: this.generateExample(value),
        })
      }
    }
  }

  /**
   * Generate example value for environment variable
   */
  private generateExample(value: unknown): string {
    if (Array.isArray(value)) {
      return JSON.stringify(value)
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    return String(value)
  }

  /**
   * Format environment variables as text
   */
  private formatAsText(
    envVars: Array<{ key: string, type: string, description: string, example: string }>,
    configName: string,
  ): string {
    let result = `Environment Variables for ${configName}:\n\n`

    for (const envVar of envVars) {
      result += `${envVar.key}\n`
      result += `  Type: ${envVar.type}\n`
      result += `  Description: ${envVar.description}\n`
      result += `  Example: ${envVar.example}\n\n`
    }

    return result
  }

  /**
   * Format environment variables as markdown
   */
  private formatAsMarkdown(
    envVars: Array<{ key: string, type: string, description: string, example: string }>,
    configName: string,
  ): string {
    let result = `# Environment Variables for ${configName}\n\n`
    result += '| Variable | Type | Description | Example |\n'
    result += '|----------|------|-------------|----------|\n'

    for (const envVar of envVars) {
      result += `| \`${envVar.key}\` | ${envVar.type} | ${envVar.description} | \`${envVar.example}\` |\n`
    }

    return result
  }
}
