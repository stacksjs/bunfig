---
title: Type Safety
description: Leverage TypeScript for fully typed configuration with bunfig
---

# Type Safety

bunfig is built with TypeScript in mind, providing excellent type safety and IDE autocompletion for your configuration.

## Basic Typing

### Define Your Config Interface

```typescript
interface AppConfig {
  server: {
    port: number
    host: string
    ssl?: {
      enabled: boolean
      cert?: string
      key?: string
    }
  }
  database: {
    url: string
    pool: number
    ssl: boolean
  }
  features: {
    darkMode: boolean
    analytics: boolean
    beta: string[]
  }
}
```

### Load with Type Parameter

```typescript
import { loadConfig } from 'bunfig'

const config = await loadConfig<AppConfig>({
  name: 'app',
})

// Full type safety
config.server.port // number
config.database.url // string
config.features.beta // string[]
config.server.ssl?.enabled // boolean | undefined
```

## Type Inference from Defaults

When you provide `defaultConfig`, TypeScript can infer the type:

```typescript
const config = await loadConfig({
  name: 'app',
  defaultConfig: {
    server: {
      port: 3000,
      host: 'localhost',
    },
    debug: false,
  },
})

// TypeScript infers:
// config.server.port is number
// config.server.host is string
// config.debug is boolean
```

## Config Type Helper

Use the `Config` type for better organization:

```typescript
import type { Config } from 'bunfig'

interface MyAppConfig {
  port: number
  host: string
}

// Config<T> represents the loadConfig options
const options: Config<MyAppConfig> = {
  name: 'app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
  },
}

const config = await loadConfig(options)
```

## Partial and Required Types

### Handle Optional Values

```typescript
interface AppConfig {
  required: {
    apiKey: string
    endpoint: string
  }
  optional?: {
    timeout?: number
    retries?: number
  }
}

const config = await loadConfig<AppConfig>({
  name: 'app',
  defaultConfig: {
    required: {
      apiKey: '',
      endpoint: '',
    },
  },
})

// Use optional chaining for optional fields
const timeout = config.optional?.timeout ?? 30000
```

### Strict Required Fields

```typescript
import { loadConfig } from 'bunfig'

interface StrictConfig {
  apiKey: string
  secret: string
}

const config = await loadConfig<StrictConfig>({
  name: 'secrets',
})

// TypeScript requires these fields to exist
// Runtime validation should also check for them
if (!config.apiKey || !config.secret) {
  throw new Error('Missing required configuration')
}
```

## Dynamic Config Types with Build Plugin

bunfig provides a build plugin that generates types from your config files:

### Setup the Build Plugin

```typescript
// build.ts
import { bunfigPlugin } from 'bunfig'

await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  target: 'bun',
  plugins: [
    bunfigPlugin({
      configDir: './config',
    }),
  ],
})
```

### Use Generated Types

```typescript
import type { ConfigNames, ConfigOf } from 'bunfig'
import { loadConfig } from 'bunfig'

// ConfigNames is a union of all config file names
// e.g., 'app' | 'database' | 'cache'
function load<N extends ConfigNames>(name: N): Promise<ConfigOf<N>> {
  return loadConfig({ name })
}

// Full type safety based on your actual config files
const appConfig = await load('app')
const dbConfig = await load('database')
```

## TypeScript Language Service Plugin

For editor support without building:

### Configure tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["bunfig"]
  },
  "plugins": [
    {
      "name": "bunfig/ts-plugin",
      "configDir": "./config"
    }
  ]
}
```

### Benefits

- Real-time type checking in your editor
- Autocompletion for config names
- No build step required

## Type Guards

Create type guards for runtime validation:

```typescript
interface ServerConfig {
  port: number
  host: string
  ssl?: {
    enabled: boolean
    cert: string
    key: string
  }
}

function isValidServerConfig(config: unknown): config is ServerConfig {
  if (typeof config !== 'object' || config === null) {
    return false
  }

  const c = config as Record<string, unknown>

  if (typeof c.port !== 'number' || c.port < 0 || c.port > 65535) {
    return false
  }

  if (typeof c.host !== 'string' || c.host.length === 0) {
    return false
  }

  if (c.ssl !== undefined) {
    if (typeof c.ssl !== 'object' || c.ssl === null) {
      return false
    }
    const ssl = c.ssl as Record<string, unknown>
    if (
      typeof ssl.enabled !== 'boolean' ||
      typeof ssl.cert !== 'string' ||
      typeof ssl.key !== 'string'
    ) {
      return false
    }
  }

  return true
}

// Usage
const rawConfig = await loadConfig({ name: 'server' })

if (!isValidServerConfig(rawConfig)) {
  throw new Error('Invalid server configuration')
}

// rawConfig is now typed as ServerConfig
```

## Zod Integration

Use Zod for schema validation with types:

```typescript
import { z } from 'zod'
import { loadConfig } from 'bunfig'

// Define schema
const AppConfigSchema = z.object({
  server: z.object({
    port: z.number().min(1).max(65535),
    host: z.string().min(1),
    ssl: z.object({
      enabled: z.boolean(),
      cert: z.string().optional(),
      key: z.string().optional(),
    }).optional(),
  }),
  database: z.object({
    url: z.string().url(),
    pool: z.number().min(1).max(100),
  }),
})

// Infer type from schema
type AppConfig = z.infer<typeof AppConfigSchema>

// Load and validate
const rawConfig = await loadConfig({ name: 'app' })
const config = AppConfigSchema.parse(rawConfig)

// config is fully typed as AppConfig
```

## Conditional Types

Handle different config shapes based on environment:

```typescript
interface BaseConfig {
  appName: string
  version: string
}

interface DevConfig extends BaseConfig {
  debug: true
  mockServices: boolean
  hotReload: boolean
}

interface ProdConfig extends BaseConfig {
  debug: false
  monitoring: {
    enabled: boolean
    endpoint: string
  }
}

type AppConfig = DevConfig | ProdConfig

function isDev(config: AppConfig): config is DevConfig {
  return config.debug === true
}

const config = await loadConfig<AppConfig>({
  name: 'app',
})

if (isDev(config)) {
  // TypeScript knows config is DevConfig
  console.log('Mock services:', config.mockServices)
} else {
  // TypeScript knows config is ProdConfig
  console.log('Monitoring:', config.monitoring.endpoint)
}
```

## Readonly Configuration

Make config immutable:

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P]
}

interface MutableAppConfig {
  server: {
    port: number
    host: string
  }
}

type AppConfig = DeepReadonly<MutableAppConfig>

const config = await loadConfig<AppConfig>({
  name: 'app',
})

// TypeScript error: Cannot assign to 'port' because it is a read-only property
// config.server.port = 8080
```

## Namespace Organization

Organize large configs with namespaces:

```typescript
namespace Config {
  export interface Server {
    port: number
    host: string
    timeout: number
  }

  export interface Database {
    url: string
    pool: number
    ssl: boolean
  }

  export interface Cache {
    driver: 'redis' | 'memory'
    ttl: number
  }

  export interface App {
    server: Server
    database: Database
    cache: Cache
  }
}

const config = await loadConfig<Config.App>({
  name: 'app',
})
```

## Next Steps

- Learn about [Environment Variables](/guide/env)
- Explore [Config Loading Patterns](/guide/loading)
- Check out [Advanced Features](/advanced/build-plugin)
