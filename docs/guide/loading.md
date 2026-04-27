---
title: Config Loading Patterns
description: Learn different patterns for loading configuration with bunfig
---

# Config Loading Patterns

This guide covers various patterns for loading configuration with bunfig, from basic usage to advanced scenarios.

## Basic Loading

### Simple Load

```typescript
import { loadConfig } from 'bunfig'

// Load configuration from app.config.ts (or .js, .json, etc.)
const config = await loadConfig({
  name: 'app',
})
```

### With Defaults

```typescript
const config = await loadConfig({
  name: 'app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    debug: false,
  },
})

// Uses defaults if no config file is found
// Merges with config file values if found
```

### With Custom Directory

```typescript
const config = await loadConfig({
  name: 'app',
  cwd: './config', // Look in ./config directory
})
```

## Configuration Merging

bunfig deeply merges configuration from multiple sources in this order (later sources override earlier):

1. Default config
2. Home directory config (`~/.config/$name/`)
3. Project config file
4. Environment variables

```typescript
// defaultConfig
const defaultConfig = {
  server: {
    port: 3000,
    host: 'localhost',
    timeout: 30000,
  },
}

// ~/.config/app/config.ts (user-wide settings)
export default {
  server: {
    timeout: 60000, // User prefers longer timeout
  },
}

// ./app.config.ts (project settings)
export default {
  server: {
    port: 8080, // Project-specific port
  },
}

// Environment: APP_SERVER_HOST=production.example.com

// Result after merging:
{
  server: {
    port: 8080,                        // from project config
    host: 'production.example.com',    // from environment
    timeout: 60000,                    // from home directory config
  },
}
```

## Using Aliases

Specify an alias for backward compatibility or alternative names. `alias` accepts either a single string or an array of strings:

```typescript
// Single alias
const config = await loadConfig({
  name: 'tlsx',
  alias: 'tls', // Falls back to tls.config.ts if tlsx.config.ts not found
  defaultConfig: {
    domain: 'example.com',
    port: 443,
  },
})

// Multiple aliases — tried in array order, first match wins
const pickierConfig = await loadConfig({
  name: 'pickier',
  alias: ['code-style', 'lint'], // Resolves any of pickier.config.ts, code-style.config.ts, or lint.config.ts
  defaultConfig: { /* ... */ },
})
```

The primary `name` always takes priority over any alias. See [Aliases Support](../features/aliases.md) for the full resolution order.

## Custom Config Directory

For projects that organize configs in a specific directory:

```typescript
const config = await loadConfig({
  name: 'database',
  cwd: process.cwd(),
  configDir: 'settings', // Look in ./settings directory
})

// Searches in order:
// ./settings/database.config.ts
// ./settings/database.ts
// ./settings/.database.config.ts
// etc.
```

## Environment-Specific Loading

Load different configs based on environment:

```typescript
// config/development.config.ts
export default {
  database: { url: 'postgresql://localhost:5432/dev' },
  logging: { level: 'debug' },
}

// config/production.config.ts
export default {
  database: { url: process.env.DATABASE_URL },
  logging: { level: 'error' },
}
```

```typescript
import { loadConfig } from 'bunfig'

const env = process.env.NODE_ENV || 'development'

const config = await loadConfig({
  name: env,
  cwd: './config',
  defaultConfig: {
    database: { url: '' },
    logging: { level: 'info' },
  },
})
```

## Conditional Loading

### Check if Config Exists

```typescript
import { loadConfig } from 'bunfig'

try {
  const config = await loadConfig({
    name: 'optional-feature',
  })
  // Config found, enable feature
} catch (error) {
  // No config, feature disabled
  console.log('Optional feature not configured')
}
```

### With Fallback

```typescript
const config = await loadConfig({
  name: 'app',
  defaultConfig: {
    // These values are used if no config file exists
    enabled: false,
    options: {},
  },
})
```

## Multiple Configs

### Load Multiple Independently

```typescript
import { loadConfig } from 'bunfig'

const [serverConfig, dbConfig, cacheConfig] = await Promise.all([
  loadConfig({ name: 'server' }),
  loadConfig({ name: 'database' }),
  loadConfig({ name: 'cache' }),
])
```

### Compose Configs

```typescript
// base.config.ts
export default {
  logging: { level: 'info' },
  monitoring: { enabled: true },
}

// server.config.ts
import baseConfig from './base.config'

export default {
  ...baseConfig,
  server: {
    port: 3000,
    host: 'localhost',
  },
}
```

## Lazy Loading

Load configuration only when needed:

```typescript
let cachedConfig: AppConfig | null = null

async function getConfig(): Promise<AppConfig> {
  if (!cachedConfig) {
    cachedConfig = await loadConfig({ name: 'app' })
  }
  return cachedConfig
}

// Usage
const config = await getConfig()
```

## Singleton Pattern

```typescript
// config.ts
import { loadConfig } from 'bunfig'

let configPromise: Promise<AppConfig> | null = null

export function getConfig(): Promise<AppConfig> {
  if (!configPromise) {
    configPromise = loadConfig<AppConfig>({
      name: 'app',
      defaultConfig: defaultAppConfig,
    })
  }
  return configPromise
}

// Usage in other files
import { getConfig } from './config'

const config = await getConfig()
```

## Factory Pattern

Create configuration loaders for different parts of your app:

```typescript
import { loadConfig } from 'bunfig'

function createConfigLoader<T>(name: string, defaults: T) {
  return async (): Promise<T> => {
    return loadConfig<T>({
      name,
      defaultConfig: defaults,
    })
  }
}

// Create specific loaders
const loadServerConfig = createConfigLoader('server', {
  port: 3000,
  host: 'localhost',
})

const loadDbConfig = createConfigLoader('database', {
  url: 'postgresql://localhost:5432/app',
  pool: 10,
})

// Usage
const serverConfig = await loadServerConfig()
const dbConfig = await loadDbConfig()
```

## Config Validation on Load

Validate configuration immediately after loading:

```typescript
import { loadConfig } from 'bunfig'

interface DatabaseConfig {
  url: string
  pool: number
}

function validateDbConfig(config: DatabaseConfig): void {
  if (!config.url) {
    throw new Error('Database URL is required')
  }
  if (config.pool < 1 || config.pool > 100) {
    throw new Error('Pool size must be between 1 and 100')
  }
}

const config = await loadConfig<DatabaseConfig>({
  name: 'database',
  defaultConfig: {
    url: '',
    pool: 10,
  },
})

validateDbConfig(config)
```

## Watching for Changes

For development, you might want to reload config on changes:

```typescript
import { loadConfig } from 'bunfig'
import { watch } from 'fs'

let currentConfig = await loadConfig({ name: 'app' })

// Watch for changes (development only)
if (process.env.NODE_ENV === 'development') {
  watch('./app.config.ts', async () => {
    console.log('Config changed, reloading...')
    currentConfig = await loadConfig({ name: 'app' })
    // Notify your application of the change
  })
}

export function getConfig() {
  return currentConfig
}
```

## Error Handling

```typescript
import { loadConfig } from 'bunfig'

try {
  const config = await loadConfig({
    name: 'app',
  })
} catch (error) {
  if (error.message.includes('Config was not found')) {
    console.error('Please create an app.config.ts file')
  } else if (error.message.includes('Invalid')) {
    console.error('Configuration file has errors:', error.message)
  } else {
    throw error
  }
}
```

## Next Steps

- Understand [Type Safety](/guide/types)
- Configure [Environment Variables](/guide/env)
- Explore [Advanced Features](/advanced/build-plugin)
