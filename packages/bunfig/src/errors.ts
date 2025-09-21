/**
 * Base error class for all bunfig errors
 */
export abstract class BunfigError extends Error {
  abstract readonly code: string
  readonly timestamp: Date
  readonly context: Record<string, unknown>

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message)
    this.name = this.constructor.name
    this.timestamp = new Date()
    this.context = context

    // Maintain proper stack trace for where our error was thrown (Node.js only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    }
  }

  /**
   * Create a user-friendly error message with context
   */
  toString(): string {
    const contextStr = Object.keys(this.context).length > 0
      ? ` (${Object.entries(this.context).map(([k, v]) => `${k}: ${v}`).join(', ')})`
      : ''

    return `${this.name} [${this.code}]: ${this.message}${contextStr}`
  }
}

/**
 * Configuration file not found error
 */
export class ConfigNotFoundError extends BunfigError {
  readonly code = 'CONFIG_NOT_FOUND'

  constructor(
    configName: string,
    searchPaths: string[],
    alias?: string,
  ) {
    const aliasStr = alias ? ` or alias "${alias}"` : ''
    super(
      `Configuration "${configName}"${aliasStr} not found`,
      {
        configName,
        alias,
        searchPaths,
        searchPathCount: searchPaths.length,
      },
    )
  }
}

/**
 * Configuration file syntax or loading error
 */
export class ConfigLoadError extends BunfigError {
  readonly code = 'CONFIG_LOAD_ERROR'

  constructor(
    configPath: string,
    cause: Error,
    configName?: string,
  ) {
    super(
      `Failed to load configuration from "${configPath}": ${cause.message}`,
      {
        configPath,
        configName,
        originalError: cause.name,
        originalMessage: cause.message,
      },
    )

    // Preserve the original error as the cause
    this.cause = cause
  }
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends BunfigError {
  readonly code = 'CONFIG_VALIDATION_ERROR'

  constructor(
    configPath: string,
    validationErrors: string[],
    configName?: string,
  ) {
    super(
      `Configuration validation failed for "${configPath}"`,
      {
        configPath,
        configName,
        validationErrors,
        errorCount: validationErrors.length,
      },
    )
  }
}

/**
 * Configuration merge error
 */
export class ConfigMergeError extends BunfigError {
  readonly code = 'CONFIG_MERGE_ERROR'

  constructor(
    sourcePath: string,
    targetPath: string,
    cause: Error,
    configName?: string,
  ) {
    super(
      `Failed to merge configuration from "${sourcePath}" with "${targetPath}": ${cause.message}`,
      {
        sourcePath,
        targetPath,
        configName,
        originalError: cause.name,
        originalMessage: cause.message,
      },
    )

    this.cause = cause
  }
}

/**
 * Environment variable parsing error
 */
export class EnvVarError extends BunfigError {
  readonly code = 'ENV_VAR_ERROR'

  constructor(
    envKey: string,
    envValue: string,
    expectedType: string,
    configName?: string,
  ) {
    super(
      `Failed to parse environment variable "${envKey}" with value "${envValue}" as ${expectedType}`,
      {
        envKey,
        envValue,
        expectedType,
        configName,
      },
    )
  }
}

/**
 * File system operation error
 */
export class FileSystemError extends BunfigError {
  readonly code = 'FILE_SYSTEM_ERROR'

  constructor(
    operation: string,
    path: string,
    cause: Error,
  ) {
    super(
      `File system ${operation} failed for "${path}": ${cause.message}`,
      {
        operation,
        path,
        originalError: cause.name,
        originalMessage: cause.message,
      },
    )

    this.cause = cause
  }
}

/**
 * Type generation error
 */
export class TypeGenerationError extends BunfigError {
  readonly code = 'TYPE_GENERATION_ERROR'

  constructor(
    configDir: string,
    outputPath: string,
    cause: Error,
  ) {
    super(
      `Failed to generate types from "${configDir}" to "${outputPath}": ${cause.message}`,
      {
        configDir,
        outputPath,
        originalError: cause.name,
        originalMessage: cause.message,
      },
    )

    this.cause = cause
  }
}

/**
 * Schema validation error for runtime type checking
 */
export class SchemaValidationError extends BunfigError {
  readonly code = 'SCHEMA_VALIDATION_ERROR'

  constructor(
    schemaPath: string,
    validationErrors: Array<{ path: string, message: string }>,
    configName?: string,
  ) {
    super(
      `Schema validation failed${configName ? ` for config "${configName}"` : ''}`,
      {
        schemaPath,
        configName,
        validationErrors,
        errorCount: validationErrors.length,
      },
    )
  }
}

/**
 * Browser-specific configuration loading error
 */
export class BrowserConfigError extends BunfigError {
  readonly code = 'BROWSER_CONFIG_ERROR'

  constructor(
    endpoint: string,
    status: number,
    statusText: string,
    configName?: string,
  ) {
    super(
      `Failed to fetch configuration from "${endpoint}": ${status} ${statusText}`,
      {
        endpoint,
        status,
        statusText,
        configName,
      },
    )
  }
}

/**
 * Plugin operation error
 */
export class PluginError extends BunfigError {
  readonly code = 'PLUGIN_ERROR'

  constructor(
    pluginName: string,
    operation: string,
    cause: Error,
  ) {
    super(
      `Plugin "${pluginName}" failed during ${operation}: ${cause.message}`,
      {
        pluginName,
        operation,
        originalError: cause.name,
        originalMessage: cause.message,
      },
    )

    this.cause = cause
  }
}

/**
 * Type utilities for error handling
 */
export type BunfigErrorType =
  | ConfigNotFoundError
  | ConfigLoadError
  | ConfigValidationError
  | ConfigMergeError
  | EnvVarError
  | FileSystemError
  | TypeGenerationError
  | SchemaValidationError
  | BrowserConfigError
  | PluginError

/**
 * Error factory functions for common error patterns
 */
export const ErrorFactory = {
  configNotFound(configName: string, searchPaths: string[], alias?: string): ConfigNotFoundError {
    return new ConfigNotFoundError(configName, searchPaths, alias)
  },

  configLoad(configPath: string, cause: Error, configName?: string): ConfigLoadError {
    return new ConfigLoadError(configPath, cause, configName)
  },

  configValidation(configPath: string, errors: string[], configName?: string): ConfigValidationError {
    return new ConfigValidationError(configPath, errors, configName)
  },

  configMerge(sourcePath: string, targetPath: string, cause: Error, configName?: string): ConfigMergeError {
    return new ConfigMergeError(sourcePath, targetPath, cause, configName)
  },

  envVar(envKey: string, envValue: string, expectedType: string, configName?: string): EnvVarError {
    return new EnvVarError(envKey, envValue, expectedType, configName)
  },

  fileSystem(operation: string, path: string, cause: Error): FileSystemError {
    return new FileSystemError(operation, path, cause)
  },

  typeGeneration(configDir: string, outputPath: string, cause: Error): TypeGenerationError {
    return new TypeGenerationError(configDir, outputPath, cause)
  },

  schemaValidation(
    schemaPath: string,
    errors: Array<{ path: string, message: string }>,
    configName?: string,
  ): SchemaValidationError {
    return new SchemaValidationError(schemaPath, errors, configName)
  },

  browserConfig(endpoint: string, status: number, statusText: string, configName?: string): BrowserConfigError {
    return new BrowserConfigError(endpoint, status, statusText, configName)
  },

  plugin(pluginName: string, operation: string, cause: Error): PluginError {
    return new PluginError(pluginName, operation, cause)
  },
} as const

/**
 * Error recovery utilities
 */
export interface ErrorRecoveryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Delay between retries in milliseconds */
  retryDelay?: number
  /** Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean
  /** Fallback value to use when all retries fail */
  fallback?: unknown
}

/**
 * Retry a function with error recovery
 */
export async function withErrorRecovery<T>(
  fn: () => Promise<T>,
  options: ErrorRecoveryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    isRetryable = () => true,
    fallback,
  } = options

  // Initialize lastError to ensure it's always defined
  let lastError: Error = new Error('Unknown error occurred')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on the last attempt or if error is not retryable
      if (attempt === maxRetries || !isRetryable(lastError)) {
        break
      }

      // Wait before retrying
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  // If we have a fallback, return it instead of throwing
  if (fallback !== undefined) {
    return fallback as T
  }

  // Ensure we're throwing an Error object to satisfy no-throw-literal rule
  throw lastError instanceof Error ? lastError : new Error(`Unknown error: ${String(lastError)}`)
}

/**
 * Check if error is a specific bunfig error type
 */
export function isBunfigError(error: unknown): error is BunfigError {
  return error instanceof BunfigError
}

/**
 * Check if error is a specific bunfig error type
 */
export function isConfigNotFoundError(error: unknown): error is ConfigNotFoundError {
  return error instanceof ConfigNotFoundError
}

/**
 * Check if error is retryable (network errors, temporary file system issues, etc.)
 */
export function isRetryableError(error: Error): boolean {
  if (isBunfigError(error)) {
    // Retry file system errors and browser config errors, but not validation or syntax errors
    return error.code === 'FILE_SYSTEM_ERROR' || error.code === 'BROWSER_CONFIG_ERROR'
  }

  // Retry on common temporary errors
  const retryableMessages = [
    'ENOENT',
    'EACCES',
    'EMFILE',
    'ENFILE',
    'EBUSY',
    'network',
    'timeout',
    'connection',
  ]

  return retryableMessages.some(msg =>
    error.message.toLowerCase().includes(msg.toLowerCase()),
  )
}
