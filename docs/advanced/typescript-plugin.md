# TypeScript Plugin

bunfig provides a powerful TypeScript language service plugin that enhances the development experience by providing dynamic type information for your configuration files without generating any physical files.

## Overview

The TypeScript plugin provides:

- **Dynamic type generation** for `ConfigNames` based on your config files
- **Type-safe configuration loading** with intellisense support
- **Zero-overhead** integration that works purely in the editor and TypeScript compiler
- **No file generation** - everything works virtually

## Installation

Add the plugin to your `tsconfig.json`:

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

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configDir` | `string` | `"./config"` | Directory to scan for configuration files |
| `extensions` | `string[]` | `[".ts", ".js", ".mjs", ".cjs", ".json"]` | File extensions to include |
| `exclude` | `string[]` | `[]` | Patterns to exclude from scanning |

## Features

### Dynamic ConfigNames Type

The plugin automatically generates a `ConfigNames` type based on configuration files in your project:

```ts
// With config files: config/app.ts, config/database.ts, config/auth.ts
import type { ConfigNames } from 'bunfig'

// ConfigNames is now: 'app' | 'database' | 'auth'
function loadSpecificConfig(name: ConfigNames) {
  // TypeScript will provide autocompletion for 'app', 'database', 'auth'
  return loadConfig({ name, defaultConfig: {} })
}
```

### Type-Safe Configuration Loading

Use `ConfigOf<T>` to get type-safe access to specific configuration types:

```ts
import type { ConfigOf } from 'bunfig'
import { loadConfig } from 'bunfig'

// Get the type of your 'app' configuration
const appConfig = await loadConfig<ConfigOf<'app'>>({
  name: 'app',
  defaultConfig: {
    // This will be type-checked against your config/app.ts file
    port: 3000,
    host: 'localhost',
  } as ConfigOf<'app'>,
})

// appConfig is now fully typed based on your actual config file
console.log(appConfig.port) // TypeScript knows this is a number
```

### ConfigByName Mapping

Access the complete mapping of configuration names to their types:

```ts
import type { ConfigByName } from 'bunfig'

// ConfigByName is a mapping like:
// {
//   'app': AppConfigType,
//   'database': DatabaseConfigType,
//   'auth': AuthConfigType
// }

type AppConfigType = ConfigByName['app']
type DatabaseConfigType = ConfigByName['database']
```

## Editor Integration

### VS Code

The TypeScript plugin works automatically with VS Code when properly configured:

1. **Install the TypeScript plugin** by adding it to your `tsconfig.json`
2. **Restart the TypeScript service** in VS Code (`Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server")
3. **Enjoy autocomplete** for configuration names and types

### Other Editors

Any editor that supports TypeScript language services will work:

- **WebStorm/IntelliJ**: Built-in TypeScript support
- **Vim/Neovim**: With CoC or LSP plugins
- **Emacs**: With tide or lsp-mode
- **Sublime Text**: With LSP-TypeScript

## Configuration File Discovery

The plugin scans your `configDir` for configuration files and extracts type information:

### Supported Patterns

```
config/
├── app.ts                # → 'app'
├── database.config.ts    # → 'database'
├── auth.mjs             # → 'auth'
├── logging.json         # → 'logging'
├── nested/
│   ├── cache.ts         # → 'cache' (flattened)
│   └── redis.config.ts  # → 'redis'
└── _internal.ts         # → ignored (underscore prefix)
```

### File Processing

The plugin processes files to extract default export types:

```ts
// config/app.ts
interface AppConfig {
  port: number
  host: string
  features: string[]
}

const config: AppConfig = {
  port: 3000,
  host: 'localhost',
  features: ['auth', 'logging'],
}

export default config
// Plugin extracts: ConfigByName['app'] = AppConfig
```

### Dynamic Configurations

For dynamic configurations, the plugin infers the return type:

```ts
// config/dynamic.ts
export default {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || 'localhost',
  debug: process.env.NODE_ENV === 'development',
}
// Plugin extracts: { port: number; host: string; debug: boolean }
```

## Advanced Usage

### Conditional Configuration Types

Create type-safe conditional configurations:

```ts
// config/app.ts
interface BaseConfig {
  port: number
  host: string
}

interface DevelopmentConfig extends BaseConfig {
  debug: true
  hotReload: boolean
}

interface ProductionConfig extends BaseConfig {
  debug: false
  ssl: boolean
}

type AppConfig = DevelopmentConfig | ProductionConfig

const config: AppConfig = process.env.NODE_ENV === 'production'
  ? {
      port: 8080,
      host: '0.0.0.0',
      debug: false,
      ssl: true,
    }
  : {
      port: 3000,
      host: 'localhost',
      debug: true,
      hotReload: true,
    }

export default config
```

### Generic Configuration Factory

Create reusable configuration factories with proper typing:

```ts
// config/database.ts
interface DatabaseConfig<T extends string = string> {
  type: T
  host: string
  port: number
  name: string
}

interface PostgresConfig extends DatabaseConfig<'postgres'> {
  ssl: boolean
  pool: number
}

interface MySQLConfig extends DatabaseConfig<'mysql'> {
  charset: string
  timezone: string
}

function createDatabaseConfig<T extends 'postgres' | 'mysql'>(
  type: T
): T extends 'postgres' ? PostgresConfig : MySQLConfig {
  if (type === 'postgres') {
    return {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      name: 'myapp',
      ssl: false,
      pool: 10,
    } as any
  } else {
    return {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      name: 'myapp',
      charset: 'utf8mb4',
      timezone: 'UTC',
    } as any
  }
}

export default createDatabaseConfig(
  (process.env.DB_TYPE as 'postgres' | 'mysql') || 'postgres'
)
```

### Namespace Support

Organize configurations with namespaces:

```ts
// config/api.ts
export default {
  server: {
    port: 3000,
    host: 'localhost',
  },
  cors: {
    origins: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
}

// Usage with type safety
import type { ConfigOf } from 'bunfig'

type ApiConfig = ConfigOf<'api'>
// TypeScript knows: { server: {...}, cors: {...}, rateLimit: {...} }

const config = await loadConfig<ApiConfig>({
  name: 'api',
  defaultConfig: {} as ApiConfig,
})

// Full autocompletion available
config.server.port // number
config.cors.origins // string[]
config.rateLimit.max // number
```

## Troubleshooting

### Plugin Not Working

1. **Check tsconfig.json**: Ensure the plugin is properly configured
2. **Restart TypeScript**: Restart your editor's TypeScript service
3. **Verify file structure**: Ensure config files are in the specified directory
4. **Check console**: Look for TypeScript errors in your editor's output

### Types Not Updating

1. **File changes**: The plugin watches for file changes automatically
2. **Cache issues**: Restart the TypeScript service to clear cache
3. **Path resolution**: Verify `configDir` points to the correct directory

### Editor Support Issues

```json
// tsconfig.json - Ensure proper configuration
{
  "compilerOptions": {
    "types": ["bunfig"],
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "plugins": [
    {
      "name": "bunfig/ts-plugin",
      "configDir": "./config"
    }
  ]
}
```

### Missing Type Definitions

If you see errors about missing `virtual:bunfig-types`:

```ts
// Add this reference to your main TypeScript file
/// <reference types="bunfig" />

// Or add to tsconfig.json
{
  "compilerOptions": {
    "types": ["bunfig"]
  }
}
```

## Performance Considerations

The TypeScript plugin is designed for optimal performance:

- **Lazy loading**: Types are generated only when requested
- **Incremental updates**: Only changed files are reprocessed
- **Memory efficient**: Minimal memory footprint
- **Fast startup**: Quick initialization time

### Large Projects

For projects with many configuration files:

```json
{
  "plugins": [
    {
      "name": "bunfig/ts-plugin",
      "configDir": "./config",
      "exclude": ["**/*.test.ts", "**/temp/**"]
    }
  ]
}
```

## Comparison with Build Plugin

| Feature | TypeScript Plugin | Build Plugin |
|---------|------------------|--------------|
| **File generation** | None | Generates type files |
| **Build integration** | Editor only | Build process |
| **Runtime types** | No | Yes |
| **Setup complexity** | Low | Medium |
| **Performance** | High | Medium |
| **Use case** | Development | Production builds |

## Related Features

- [Build Plugin](./build-plugin.md) - Generates runtime type information
- [Type Safety](../features/type-safety.md) - Overview of bunfig's type system
- [Configuration Loading](../features/configuration-loading.md) - How configurations are loaded and typed