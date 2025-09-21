# Configuration Validation

bunfig provides comprehensive configuration validation through JSON Schema and custom validation rules, ensuring your configurations are correct and safe before use.

## Overview

The validation system offers:

- **JSON Schema support** for standard validation patterns
- **Custom validation rules** for domain-specific requirements
- **Custom validation functions** for complex business logic
- **Detailed error reporting** with paths and context
- **Performance optimized** validation with caching

## JSON Schema Validation

Use standard JSON Schema for type and structure validation:

```ts
import { loadConfigEnhanced } from 'bunfig'

const schema = {
  type: 'object',
  properties: {
    server: {
      type: 'object',
      properties: {
        port: { type: 'number', minimum: 1, maximum: 65535 },
        host: { type: 'string', minLength: 1 },
        ssl: { type: 'boolean' }
      },
      required: ['port', 'host']
    },
    database: {
      type: 'object',
      properties: {
        url: { type: 'string', pattern: '^postgresql://' },
        pool: { type: 'number', minimum: 1, maximum: 100 }
      },
      required: ['url']
    }
  },
  required: ['server']
}

const result = await loadConfigEnhanced({
  name: 'app',
  defaultConfig: {},
  schema
})
```

### Supported JSON Schema Features

#### Type Validation

```ts
const schema = {
  type: 'object',
  properties: {
    port: { type: 'number' },
    host: { type: 'string' },
    enabled: { type: 'boolean' },
    tags: { type: 'array' },
    metadata: { type: 'object' }
  }
}
```

#### String Validation

```ts
const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 3,
      maxLength: 50,
      pattern: '^[a-zA-Z0-9-_]+$'
    },
    email: {
      type: 'string',
      pattern: '^[\\w-]+@[\\w-]+\\.[a-z]{2,}$'
    }
  }
}
```

#### Number Validation

```ts
const schema = {
  type: 'object',
  properties: {
    port: {
      type: 'number',
      minimum: 1,
      maximum: 65535
    },
    timeout: {
      type: 'number',
      minimum: 0,
      maximum: 30000
    }
  }
}
```

#### Array Validation

```ts
const schema = {
  type: 'object',
  properties: {
    tags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 10
    },
    servers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          host: { type: 'string' },
          port: { type: 'number' }
        },
        required: ['host', 'port']
      }
    }
  }
}
```

#### Enum Validation

```ts
const schema = {
  type: 'object',
  properties: {
    environment: {
      type: 'string',
      enum: ['development', 'staging', 'production']
    },
    logLevel: {
      type: 'string',
      enum: ['error', 'warn', 'info', 'debug']
    }
  }
}
```

## Custom Validation Rules

Use bunfig's custom rule system for more flexible validation:

```ts
import { loadConfigEnhanced } from 'bunfig'

const rules = [
  {
    path: 'server.port',
    required: true,
    type: 'number' as const,
    min: 1,
    max: 65535,
    message: 'Server port must be between 1 and 65535'
  },
  {
    path: 'server.host',
    required: true,
    type: 'string' as const,
    min: 1,
    pattern: /^[a-z0-9.-]+$/i,
    message: 'Host must contain only letters, numbers, dots, and hyphens'
  },
  {
    path: 'database.pool',
    type: 'number' as const,
    min: 1,
    max: 100,
    message: 'Database pool size must be between 1 and 100'
  },
  {
    path: 'features',
    type: 'array' as const,
    enum: ['auth', 'logging', 'metrics', 'cache'],
    message: 'Features must be from the allowed list'
  }
]

const result = await loadConfigEnhanced({
  name: 'app',
  defaultConfig: {},
  schema: rules
})
```

### Rule Properties

```ts
interface ValidationRule {
  /** Property path in dot notation */
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

  /** Custom error message */
  message?: string
}
```

## Custom Validation Functions

For complex validation logic, use custom validation functions:

```ts
function customValidator(config: any) {
  const errors: string[] = []

  // Business logic validation
  if (config.ssl && !config.cert) {
    errors.push('SSL configuration requires a certificate')
  }

  if (config.database?.pool > config.database?.maxConnections) {
    errors.push('Database pool size cannot exceed max connections')
  }

  // Environment-specific validation
  if (config.environment === 'production') {
    if (!config.logging?.level || config.logging.level === 'debug') {
      errors.push('Production environment cannot use debug logging')
    }

    if (!config.security?.enabled) {
      errors.push('Security must be enabled in production')
    }
  }

  // Cross-field validation
  if (config.cache?.enabled && !config.cache?.ttl) {
    errors.push('Cache TTL is required when cache is enabled')
  }

  return errors.length > 0 ? errors : undefined
}

const result = await loadConfigEnhanced({
  name: 'app',
  defaultConfig: {},
  validate: customValidator
})
```

## ConfigValidator Service

Use the ConfigValidator service directly for advanced scenarios:

```ts
import { ConfigValidator } from 'bunfig'

const validator = new ConfigValidator()

// Validate with JSON Schema
const schemaResult = await validator.validateConfiguration(
  config,
  jsonSchema,
  {
    validateRequired: true,
    validateTypes: true,
    stopOnFirstError: false
  }
)

// Validate with custom rules
const rulesResult = await validator.validateConfiguration(
  config,
  customRules,
  {
    stopOnFirstError: true
  }
)

// Check results
if (!schemaResult.isValid) {
  console.log('Schema validation errors:', schemaResult.errors)
}
```

### Validation Options

```ts
interface ValidationOptions {
  /** Whether to stop on first error */
  stopOnFirstError?: boolean

  /** Whether to validate required fields */
  validateRequired?: boolean

  /** Whether to validate types */
  validateTypes?: boolean

  /** Custom validation rules to add */
  customRules?: ValidationRule[]

  /** Track performance metrics */
  trackPerformance?: boolean

  /** Enable verbose logging */
  verbose?: boolean
}
```

## Common Validation Patterns

### Server Configuration

```ts
const serverRules = [
  { path: 'port', required: true, type: 'number', min: 1, max: 65535 },
  { path: 'host', required: true, type: 'string', min: 1 },
  { path: 'ssl', type: 'boolean' },
  { path: 'cors.enabled', type: 'boolean' },
  { path: 'cors.origins', type: 'array' }
]
```

### Database Configuration

```ts
const databaseRules = [
  {
    path: 'url',
    required: true,
    type: 'string',
    pattern: /^(postgresql|mysql|sqlite):\/\//,
    message: 'Database URL must use a supported protocol'
  },
  { path: 'pool', type: 'number', min: 1, max: 100 },
  { path: 'timeout', type: 'number', min: 0 },
  { path: 'ssl', type: 'boolean' }
]
```

### API Configuration

```ts
const apiRules = [
  {
    path: 'baseUrl',
    required: true,
    type: 'string',
    pattern: /^https?:\/\//,
    message: 'Base URL must be a valid HTTP/HTTPS URL'
  },
  { path: 'timeout', type: 'number', min: 0 },
  { path: 'retries', type: 'number', min: 0, max: 10 },
  { path: 'rateLimit.enabled', type: 'boolean' },
  { path: 'rateLimit.requests', type: 'number', min: 1 }
]
```

## Using Common Rules

bunfig provides pre-built validation rules for common patterns:

```ts
import { ConfigValidator } from 'bunfig'

const commonRules = ConfigValidator.createCommonRules()

// Use server rules
const serverResult = await validator.validateConfiguration(
  serverConfig,
  commonRules.server
)

// Use database rules
const dbResult = await validator.validateConfiguration(
  databaseConfig,
  commonRules.database
)

// Use API rules
const apiResult = await validator.validateConfiguration(
  apiConfig,
  commonRules.api
)
```

## Error Handling

Validation errors provide detailed information for debugging:

```ts
import { ValidationError } from 'bunfig'

try {
  const result = await loadConfigEnhanced({
    name: 'app',
    defaultConfig: {},
    schema: validationRules
  })
}
catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed for ${error.context.configName}`)
    console.log(`Total errors: ${error.context.errors.length}`)

    error.context.errors.forEach((err) => {
      console.log(`- ${err.path}: ${err.message}`)
      console.log(`  Expected: ${err.expected}`)
      console.log(`  Actual: ${err.actual}`)
      console.log(`  Rule: ${err.rule}`)
    })
  }
}
```

### Error Context

Validation errors include comprehensive context:

```ts
interface ValidationError {
  path: string // Property path where error occurred
  message: string // Human-readable error message
  expected?: string // Expected value or type
  actual?: unknown // Actual value that failed
  rule?: string // Validation rule that failed
}
```

## Performance Optimization

### Validation Caching

Validation results are automatically cached based on configuration content:

```ts
const result = await loadConfigEnhanced({
  name: 'app',
  defaultConfig: {},
  schema: validationSchema,
  cache: {
    enabled: true,
    ttl: 5000 // Cache validation results for 5 seconds
  }
})
```

### Optimized Rule Sets

Create optimized rule sets for better performance:

```ts
// Separate critical from non-critical validations
const criticalRules = [
  { path: 'server.port', required: true, type: 'number' },
  { path: 'database.url', required: true, type: 'string' }
]

const nonCriticalRules = [
  { path: 'logging.level', type: 'string', enum: ['error', 'warn', 'info'] },
  { path: 'features', type: 'array' }
]

// Validate critical rules first with stopOnFirstError
const criticalResult = await validator.validateConfiguration(
  config,
  criticalRules,
  { stopOnFirstError: true }
)

if (criticalResult.isValid) {
  // Only validate non-critical if critical passes
  const fullResult = await validator.validateConfiguration(
    config,
    [...criticalRules, ...nonCriticalRules]
  )
}
```

## TypeScript Integration

Generate validation rules from TypeScript interfaces:

```ts
const interfaceCode = `
  interface ServerConfig {
    port: number
    host: string
    ssl?: boolean
    cors?: {
      enabled: boolean
      origins: string[]
    }
  }
`

const rules = validator.generateRulesFromInterface(interfaceCode)
const result = await validator.validateConfiguration(config, rules)
```

## Best Practices

### Schema Organization

Organize schemas by feature or module:

```ts
// schemas/server.ts
export const serverSchema = {
  type: 'object',
  properties: {
    port: { type: 'number', minimum: 1, maximum: 65535 },
    host: { type: 'string', minLength: 1 }
  },
  required: ['port', 'host']
}

// schemas/database.ts
export const databaseSchema = {
  type: 'object',
  properties: {
    url: { type: 'string', pattern: '^postgresql://' },
    pool: { type: 'number', minimum: 1, maximum: 100 }
  },
  required: ['url']
}

// schemas/index.ts
export const appSchema = {
  type: 'object',
  properties: {
    server: serverSchema,
    database: databaseSchema
  }
}
```

### Validation Composition

Compose validation rules for reusability:

```ts
const baseServerRules = [
  { path: 'port', required: true, type: 'number', min: 1, max: 65535 },
  { path: 'host', required: true, type: 'string', min: 1 }
]

const httpsServerRules = [
  ...baseServerRules,
  { path: 'ssl', required: true, type: 'boolean' },
  { path: 'cert', required: true, type: 'string', min: 1 },
  { path: 'key', required: true, type: 'string', min: 1 }
]

const loadBalancedServerRules = [
  ...baseServerRules,
  { path: 'upstream', required: true, type: 'array', min: 1 },
  { path: 'strategy', required: true, type: 'string', enum: ['round-robin', 'least-conn'] }
]
```

### Error Recovery

Implement graceful error recovery:

```ts
async function loadConfigWithFallback(name: string, fallbackConfig: any) {
  try {
    return await loadConfigEnhanced({
      name,
      defaultConfig: {},
      schema: validationSchema
    })
  }
  catch (error) {
    if (error instanceof ValidationError) {
      console.warn(`Validation failed for ${name}, using fallback config`)
      console.warn('Validation errors:', error.context.errors)
      return { config: fallbackConfig }
    }
    throw error
  }
}
```

## Related Features

- [Configuration Loading](./configuration-loading.md) - Complete configuration loading API
- [Error Handling](../api.md#error-handling) - Structured error handling
- [Type Safety](./type-safety.md) - TypeScript integration
- [Performance](../advanced/performance.md) - Performance optimization
