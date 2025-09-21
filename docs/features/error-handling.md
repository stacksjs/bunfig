# Error Handling

bunfig provides comprehensive error handling to help you debug configuration issues and implement robust error recovery strategies. All errors are structured, typed, and include detailed context about what went wrong.

## Error Types

bunfig uses a hierarchy of error types that provide specific information about different failure scenarios:

### ConfigNotFoundError

Thrown when no configuration file can be found in any of the search locations.

```ts
import { ConfigNotFoundError } from 'bunfig'

try {
  const config = await loadConfig({ name: 'my-app' })
} catch (error) {
  if (error instanceof ConfigNotFoundError) {
    console.log(`Configuration "${error.context.configName}" not found`)
    console.log(`Searched ${error.context.searchPathCount} locations:`)
    error.context.searchPaths.forEach(path => console.log(`  - ${path}`))
  }
}
```

### ConfigLoadError

Thrown when a configuration file is found but cannot be loaded due to syntax errors, invalid exports, or other loading issues.

```ts
import { ConfigLoadError } from 'bunfig'

try {
  const config = await loadConfig({ name: 'my-app' })
} catch (error) {
  if (error instanceof ConfigLoadError) {
    console.log(`Failed to load config from: ${error.context.configPath}`)
    console.log(`Error: ${error.context.originalMessage}`)

    // Check specific error types
    if (error.message.includes('syntax error')) {
      console.log('Fix the syntax in your configuration file')
    } else if (error.message.includes('must export')) {
      console.log('Ensure your config file exports a default object')
    }
  }
}
```

### ValidationError

Thrown when configuration validation fails (when using schemas or validation rules).

```ts
import { ValidationError } from 'bunfig'

try {
  const config = await loadConfig({
    name: 'my-app',
    schema: validationSchema
  })
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed: ${error.context.errors.length} errors found`)

    error.context.errors.forEach(err => {
      console.log(`❌ ${err.path}: ${err.message}`)
      if (err.expected) console.log(`   Expected: ${err.expected}`)
      if (err.actual !== undefined) console.log(`   Actual: ${err.actual}`)
    })
  }
}
```

### FileSystemError

Thrown when file system operations fail (permissions, disk space, etc.).

```ts
import { FileSystemError } from 'bunfig'

try {
  const config = await loadConfig({ name: 'my-app' })
} catch (error) {
  if (error instanceof FileSystemError) {
    console.log(`File system error: ${error.message}`)
    console.log(`Operation: ${error.context.operation}`)
    console.log(`Path: ${error.context.path}`)

    if (error.message.includes('EACCES')) {
      console.log('Permission denied - check file permissions')
    } else if (error.message.includes('ENOSPC')) {
      console.log('No space left on device')
    }
  }
}
```

## Error Context

All bunfig errors include rich context information to help with debugging:

```ts
interface ErrorContext {
  timestamp: Date
  configName?: string
  searchPaths?: string[]
  searchPathCount?: number
  configPath?: string
  originalError?: Error
  originalMessage?: string
  operation?: string
  path?: string
  errors?: ValidationError[]
}
```

## Error Recovery Strategies

### Graceful Fallbacks

Implement fallback configurations when loading fails:

```ts
async function loadConfigWithFallback<T>(
  name: string,
  fallbackConfig: T
): Promise<T> {
  try {
    const result = await loadConfig({
      name,
      defaultConfig: fallbackConfig
    })
    return result
  } catch (error) {
    if (error instanceof ConfigNotFoundError) {
      console.warn(`No ${name} config found, using defaults`)
      return fallbackConfig
    }

    if (error instanceof ValidationError) {
      console.warn(`${name} config validation failed, using defaults`)
      console.warn('Validation errors:', error.context.errors)
      return fallbackConfig
    }

    // Re-throw unexpected errors
    throw error
  }
}

// Usage
const config = await loadConfigWithFallback('my-app', {
  port: 3000,
  host: 'localhost'
})
```

### Partial Configuration Loading

Load configuration with partial error recovery:

```ts
async function loadConfigPartial<T>(
  name: string,
  defaultConfig: T
): Promise<{ config: T; warnings: string[] }> {
  const warnings: string[] = []

  try {
    const result = await loadConfig({
      name,
      defaultConfig,
      // Use permissive validation
      validate: (config) => {
        const errors: string[] = []

        // Check critical fields only
        if (!config.port || typeof config.port !== 'number') {
          errors.push('port must be a number')
        }

        // Warn about non-critical issues
        if (!config.timeout) {
          warnings.push('timeout not specified, using default')
          config.timeout = 30000
        }

        return errors.length > 0 ? errors : undefined
      }
    })

    return { config: result, warnings }
  } catch (error) {
    if (error instanceof ValidationError) {
      // Fix what we can, warn about the rest
      const config = { ...defaultConfig }

      error.context.errors?.forEach(err => {
        warnings.push(`${err.path}: ${err.message}`)
      })

      return { config, warnings }
    }

    throw error
  }
}
```

### Retry Logic

Implement retry logic for transient errors:

```ts
async function loadConfigWithRetry<T>(
  name: string,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await loadConfig({ name })
    } catch (error) {
      lastError = error as Error

      // Don't retry for permanent errors
      if (error instanceof ConfigNotFoundError ||
          error instanceof ValidationError) {
        throw error
      }

      // Retry for file system or temporary errors
      if (error instanceof FileSystemError ||
          error instanceof ConfigLoadError) {
        if (attempt < maxRetries) {
          console.warn(`Config load attempt ${attempt} failed, retrying in ${retryDelay}ms`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }
      }

      throw error
    }
  }

  throw lastError!
}
```

## Development vs Production Error Handling

### Development Mode

In development, provide detailed error information:

```ts
async function loadConfigDev<T>(name: string): Promise<T> {
  try {
    return await loadConfig({
      name,
      verbose: true, // Enable detailed logging
      trackPerformance: true
    })
  } catch (error) {
    // Detailed error reporting for development
    console.error('🚨 Configuration Loading Failed')
    console.error('================================')

    if (error instanceof ConfigNotFoundError) {
      console.error(`Config "${name}" not found. Searched these locations:`)
      error.context.searchPaths?.forEach((path, i) => {
        console.error(`  ${i + 1}. ${path}`)
      })
      console.error('\nTry creating one of these files:')
      console.error(`  • ${name}.config.ts`)
      console.error(`  • ${name}.config.js`)
      console.error(`  • .${name}.config.ts`)
    } else if (error instanceof ConfigLoadError) {
      console.error(`File: ${error.context.configPath}`)
      console.error(`Error: ${error.context.originalMessage}`)
      console.error('\nCommon fixes:')
      console.error('  • Check file syntax')
      console.error('  • Ensure default export exists')
      console.error('  • Verify all imports are valid')
    } else if (error instanceof ValidationError) {
      console.error('Validation errors:')
      error.context.errors?.forEach(err => {
        console.error(`  ❌ ${err.path}: ${err.message}`)
      })
    }

    throw error
  }
}
```

### Production Mode

In production, log errors securely and provide fallbacks:

```ts
async function loadConfigProd<T>(
  name: string,
  fallback: T,
  logger?: any
): Promise<T> {
  try {
    return await loadConfig({
      name,
      verbose: false, // Disable verbose logging
      checkEnv: true  // Enable env var fallbacks
    })
  } catch (error) {
    // Secure logging - don't expose file paths or system details
    const errorId = Math.random().toString(36).substring(7)

    if (logger) {
      logger.error('Configuration loading failed', {
        errorId,
        configName: name,
        errorType: error.constructor.name,
        // Don't log full paths or sensitive details
        message: error.message
      })
    }

    // Use fallback configuration
    console.warn(`Using fallback configuration (Error ID: ${errorId})`)
    return fallback
  }
}
```

## Error Monitoring and Alerting

### Error Metrics

Track configuration loading errors for monitoring:

```ts
class ConfigErrorTracker {
  private errorCounts = new Map<string, number>()

  async loadConfigWithTracking<T>(name: string): Promise<T> {
    try {
      return await loadConfig({ name })
    } catch (error) {
      this.trackError(name, error)
      throw error
    }
  }

  private trackError(configName: string, error: Error) {
    const errorKey = `${configName}:${error.constructor.name}`
    const count = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, count + 1)

    // Alert if error count exceeds threshold
    if (count + 1 >= 5) {
      this.sendAlert(configName, error, count + 1)
    }
  }

  private sendAlert(configName: string, error: Error, count: number) {
    // Send to monitoring system
    console.error(`ALERT: Config ${configName} failed ${count} times: ${error.message}`)
  }

  getErrorStats() {
    return Object.fromEntries(this.errorCounts)
  }
}
```

### Health Checks

Implement configuration health checks:

```ts
async function checkConfigHealth(configName: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  issues: string[]
  lastCheck: Date
}> {
  const issues: string[] = []
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  try {
    const config = await loadConfig({
      name: configName,
      // Quick validation
      validate: (cfg) => {
        const errors: string[] = []

        // Check for required fields
        if (!cfg || typeof cfg !== 'object') {
          errors.push('Configuration is not an object')
        }

        return errors.length > 0 ? errors : undefined
      }
    })

    // Check if using fallback values
    if (JSON.stringify(config) === JSON.stringify({})) {
      issues.push('Using empty configuration (possible fallback)')
      status = 'degraded'
    }

  } catch (error) {
    if (error instanceof ConfigNotFoundError) {
      issues.push('Configuration file not found')
      status = 'degraded'
    } else if (error instanceof ValidationError) {
      issues.push(`Validation failed: ${error.context.errors?.length} errors`)
      status = 'unhealthy'
    } else {
      issues.push(`Loading failed: ${error.message}`)
      status = 'unhealthy'
    }
  }

  return {
    status,
    issues,
    lastCheck: new Date()
  }
}
```

## Testing Error Scenarios

### Unit Testing Error Handling

```ts
import { describe, it, expect } from 'bun:test'
import { ConfigNotFoundError, ValidationError } from 'bunfig'

describe('Config Error Handling', () => {
  it('should handle missing config gracefully', async () => {
    const result = await loadConfigWithFallback('nonexistent', { port: 3000 })
    expect(result.port).toBe(3000)
  })

  it('should retry on file system errors', async () => {
    let attempts = 0
    const mockLoadConfig = async () => {
      attempts++
      if (attempts < 3) {
        throw new FileSystemError('EACCES: permission denied')
      }
      return { port: 3000 }
    }

    const result = await loadConfigWithRetry('test-app')
    expect(attempts).toBe(3)
    expect(result.port).toBe(3000)
  })

  it('should provide detailed validation errors', async () => {
    try {
      await loadConfig({
        name: 'test',
        schema: {
          type: 'object',
          properties: {
            port: { type: 'number', minimum: 1 }
          },
          required: ['port']
        }
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.context.errors).toHaveLength(1)
      expect(error.context.errors[0].path).toBe('port')
    }
  })
})
```

## Best Practices

### 1. Always Handle Expected Errors

```ts
// ❌ Don't ignore errors
const config = await loadConfig({ name: 'app' })

// ✅ Handle expected error scenarios
try {
  const config = await loadConfig({ name: 'app' })
} catch (error) {
  if (error instanceof ConfigNotFoundError) {
    // Handle missing config
  } else if (error instanceof ValidationError) {
    // Handle validation errors
  } else {
    // Re-throw unexpected errors
    throw error
  }
}
```

### 2. Provide Meaningful Default Values

```ts
// ✅ Always provide sensible defaults
const config = await loadConfig({
  name: 'app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    timeout: 30000,
    retries: 3
  }
})
```

### 3. Use Structured Logging

```ts
// ✅ Structure your error logs
logger.error('Config loading failed', {
  configName: 'app',
  errorType: error.constructor.name,
  searchPaths: error.context?.searchPaths?.length || 0,
  timestamp: new Date().toISOString()
})
```

### 4. Implement Circuit Breakers

```ts
class ConfigCircuitBreaker {
  private failures = 0
  private lastFailure?: Date
  private readonly threshold = 5
  private readonly timeout = 60000 // 1 minute

  async loadConfig<T>(name: string): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open')
    }

    try {
      const result = await loadConfig({ name })
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const timeSinceLastFailure = Date.now() - (this.lastFailure?.getTime() || 0)
      return timeSinceLastFailure < this.timeout
    }
    return false
  }

  private onSuccess() {
    this.failures = 0
    this.lastFailure = undefined
  }

  private onFailure() {
    this.failures++
    this.lastFailure = new Date()
  }
}
```

## Related Features

- [Configuration Loading](./configuration-loading.md) - Complete configuration loading guide
- [Validation](./validation.md) - Configuration validation and schema
- [Type Safety](./type-safety.md) - TypeScript integration and type safety