# Types

## Core Types

### Config

The main configuration options interface.

```typescript
interface Config<T> {
  // Name of the configuration file (e.g., 'my-app.config.ts')
  name?: string

  // Working directory for config lookup (default: process.cwd())
  cwd?: string

  // Directory for configuration files (default: './config')
  configDir?: string

  // Directory for generated files (default: './src/generated')
  generatedDir?: string

  // API endpoint for browser environments
  endpoint?: string

  // Headers for API requests
  headers?: Record<string, string>

  // Default configuration values
  defaultConfig: T
}
```

Example usage:

```typescript
interface AppConfig {
  port: number
  host: string
}

const config: Config<AppConfig> = {
  name: 'my-app',
  defaultConfig: {
    port: 3000,
    host: 'localhost'
  }
}
```

### GenerateOptions

Options for type generation.

```typescript
interface GenerateOptions {
  // Source directory containing config files
  configDir: string

  // Output directory for generated types
  generatedDir: string
}
```

Example usage:

```typescript
const options: GenerateOptions = {
  configDir: './config',
  generatedDir: './src/generated'
}
```

## Error Types

### ConfigError

Base error class for configuration errors.

```typescript
class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}
```

### ConfigValidationError

Error thrown when configuration validation fails.

```typescript
class ConfigValidationError extends ConfigError {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigValidationError'
  }
}
```

### ConfigFileNotFoundError

Error thrown when a configuration file cannot be found.

```typescript
class ConfigFileNotFoundError extends ConfigError {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigFileNotFoundError'
  }
}
```

Example error handling:

```typescript
try {
  const config = await loadConfig({
    name: 'app',
    defaultConfig: {
      port: 3000
    }
  })
}
catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('Validation failed:', error.message)
  }
  else if (error instanceof ConfigFileNotFoundError) {
    console.error('Config file not found:', error.message)
  }
}
```

## Best Practices

### 1. Use Type Parameters

```typescript
// Good ✅
const config = await loadConfig<AppConfig>({
  name: 'app',
  defaultConfig: {
    port: 3000,
    host: 'localhost'
  }
})

// Avoid ❌
const config = await loadConfig({
  name: 'app',
  defaultConfig: {
    port: 3000
  }
})
```

### 2. Environment-Specific Configs

```typescript
type Environment = 'development' | 'production'

interface AppConfig {
  port: number
  debug: boolean
}

type EnvConfig = Record<Environment, AppConfig>

const config: Config<EnvConfig> = {
  name: 'app',
  defaultConfig: {
    development: {
      port: 3000,
      debug: true
    },
    production: {
      port: 80,
      debug: false
    }
  }
}
```

### 3. Type Guards

```typescript
function isConfig<T>(value: unknown): value is Config<T> {
  return (
    typeof value === 'object'
    && value !== null
    && 'defaultConfig' in value
    && typeof value.defaultConfig === 'object'
  )
}
```
