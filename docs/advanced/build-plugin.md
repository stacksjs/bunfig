# Build Plugin

bunfig provides a build plugin that integrates with your bundler to generate runtime type information for configuration files. This enables dynamic, type-safe configuration loading in your applications.

## Overview

The build plugin:

- **Generates virtual modules** with configuration type information
- **Integrates with bundlers** like Bun, Vite, and Webpack
- **Provides runtime types** for dynamic configuration loading
- **Enables type safety** for dynamically resolved configuration names

## Installation

### Bun

```ts
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

### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { bunfigPlugin } from 'bunfig'

export default defineConfig({
  plugins: [
    bunfigPlugin({
      configDir: './config',
    }),
  ],
})
```

### Webpack

```js
// webpack.config.js
const { bunfigPlugin } = require('bunfig')

module.exports = {
  // ... other config
  plugins: [
    bunfigPlugin({
      configDir: './config',
    }),
  ],
}
```

## Plugin Options

```ts
interface PluginOptions {
  /** Directory to scan for configuration files */
  configDir?: string

  /** File extensions to include */
  extensions?: string[]

  /** Patterns to exclude from scanning */
  exclude?: string[]

  /** Custom virtual module name */
  virtualModuleName?: string

  /** Generate physical type files alongside virtual modules */
  generateTypes?: boolean

  /** Output directory for generated type files */
  typesOutputDir?: string
}
```

### Default Configuration

```ts
{
  configDir: './config',
  extensions: ['.ts', '.js', '.mjs', '.cjs', '.json'],
  exclude: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
  virtualModuleName: 'virtual:bunfig-types',
  generateTypes: false,
  typesOutputDir: './src/generated'
}
```

## Generated Types

The plugin generates a virtual module that exports type information about your configuration files:

### Virtual Module Structure

```ts
// virtual:bunfig-types (generated)
export type ConfigNames = 'app' | 'database' | 'auth' | 'logging'

export interface ConfigByName {
  'app': AppConfigType
  'database': DatabaseConfigType
  'auth': AuthConfigType
  'logging': LoggingConfigType
}

export type ConfigOf<T extends ConfigNames> = ConfigByName[T]
```

### Usage in Your Code

```ts
// src/config-loader.ts
import type { ConfigNames, ConfigOf } from 'virtual:bunfig-types'
import { loadConfig } from 'bunfig'

// Type-safe configuration loading
export async function loadAppConfig<T extends ConfigNames>(
  name: T
): Promise<ConfigOf<T>> {
  return loadConfig<ConfigOf<T>>({
    name,
    defaultConfig: {} as ConfigOf<T>,
  })
}

// Usage with full type safety
const appConfig = await loadAppConfig('app') // Typed as AppConfigType
const dbConfig = await loadAppConfig('database') // Typed as DatabaseConfigType
```

## Configuration File Processing

### File Discovery

The plugin scans your `configDir` and processes configuration files:

```
config/
├── app.ts                # → ConfigNames includes 'app'
├── database.config.ts    # → ConfigNames includes 'database'
├── auth.mjs             # → ConfigNames includes 'auth'
├── logging.json         # → ConfigNames includes 'logging'
├── features/
│   ├── payments.ts      # → ConfigNames includes 'payments'
│   └── notifications.ts # → ConfigNames includes 'notifications'
└── _internal.ts         # → ignored (underscore prefix)
```

### Type Extraction

The plugin analyzes configuration files to extract type information:

```ts
// config/app.ts
interface AppConfig {
  server: {
    port: number
    host: string
  }
  database: {
    url: string
    pool: number
  }
  features: string[]
}

const config: AppConfig = {
  server: {
    port: 3000,
    host: 'localhost',
  },
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
  },
  features: ['auth', 'logging'],
}

export default config

// Plugin extracts: ConfigByName['app'] = AppConfig
```

### Dynamic Configuration Support

For configurations with conditional logic:

```ts
// config/dynamic.ts
interface BaseConfig {
  port: number
  host: string
}

interface DevConfig extends BaseConfig {
  debug: true
  hotReload: boolean
}

interface ProdConfig extends BaseConfig {
  debug: false
  ssl: boolean
}

type AppConfig = DevConfig | ProdConfig

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

// Plugin extracts: ConfigByName['dynamic'] = DevConfig | ProdConfig
```

## Runtime Integration

### Dynamic Configuration Loading

Create type-safe configuration loaders that work with dynamic names:

```ts
// src/config-manager.ts
import type { ConfigNames, ConfigOf } from 'virtual:bunfig-types'
import { loadConfig } from 'bunfig'

export class ConfigManager {
  private cache = new Map<string, any>()

  async load<T extends ConfigNames>(name: T): Promise<ConfigOf<T>> {
    if (this.cache.has(name)) {
      return this.cache.get(name)
    }

    const config = await loadConfig<ConfigOf<T>>({
      name,
      defaultConfig: {} as ConfigOf<T>,
    })

    this.cache.set(name, config)
    return config
  }

  async loadMultiple<T extends ConfigNames[]>(
    names: T
  ): Promise<{ [K in T[number]]: ConfigOf<K> }> {
    const configs = await Promise.all(
      names.map(async (name) => [name, await this.load(name)] as const)
    )

    return Object.fromEntries(configs) as any
  }
}

// Usage
const manager = new ConfigManager()

// Load single config with type safety
const appConfig = await manager.load('app') // ConfigOf<'app'>
const dbConfig = await manager.load('database') // ConfigOf<'database'>

// Load multiple configs
const configs = await manager.loadMultiple(['app', 'database', 'auth'])
// Type: { app: ConfigOf<'app'>, database: ConfigOf<'database'>, auth: ConfigOf<'auth'> }
```

### Configuration Factory

Build a factory for creating typed configuration instances:

```ts
// src/config-factory.ts
import type { ConfigNames, ConfigOf } from 'virtual:bunfig-types'
import { loadConfig } from 'bunfig'

export interface ConfigFactory {
  create<T extends ConfigNames>(
    name: T,
    overrides?: Partial<ConfigOf<T>>
  ): Promise<ConfigOf<T>>
}

export class DefaultConfigFactory implements ConfigFactory {
  async create<T extends ConfigNames>(
    name: T,
    overrides?: Partial<ConfigOf<T>>
  ): Promise<ConfigOf<T>> {
    const baseConfig = await loadConfig<ConfigOf<T>>({
      name,
      defaultConfig: {} as ConfigOf<T>,
    })

    if (overrides) {
      return { ...baseConfig, ...overrides }
    }

    return baseConfig
  }
}

// Usage
const factory = new DefaultConfigFactory()

const customAppConfig = await factory.create('app', {
  server: { port: 4000 }, // Type-checked against ConfigOf<'app'>
})
```

## Advanced Features

### Custom Virtual Module Names

Use custom virtual module names for organization:

```ts
// build.ts
bunfigPlugin({
  configDir: './config',
  virtualModuleName: 'virtual:my-app-configs',
})

// Usage
import type { ConfigNames } from 'virtual:my-app-configs'
```

### Physical Type Generation

Generate physical TypeScript files alongside virtual modules:

```ts
// build.ts
bunfigPlugin({
  configDir: './config',
  generateTypes: true,
  typesOutputDir: './src/generated',
})
```

This creates:

```
src/generated/
├── config-types.ts      # Generated type definitions
└── config-names.ts      # Generated name constants
```

### Multiple Configuration Directories

Handle multiple configuration directories:

```ts
// build.ts
import { bunfigPlugin } from 'bunfig'

// Multiple plugins for different config directories
const plugins = [
  bunfigPlugin({
    configDir: './config/app',
    virtualModuleName: 'virtual:app-configs',
  }),
  bunfigPlugin({
    configDir: './config/features',
    virtualModuleName: 'virtual:feature-configs',
  }),
]

await Bun.build({
  entrypoints: ['src/index.ts'],
  plugins,
})
```

### Custom File Processing

Extend the plugin with custom file processing:

```ts
// build.ts
bunfigPlugin({
  configDir: './config',
  extensions: ['.ts', '.js', '.yaml', '.toml'], // Custom extensions
  exclude: ['**/legacy/**', '**/*.old.*'], // Custom exclusions
})
```

## Development Workflow

### Hot Module Replacement

The plugin supports HMR for configuration changes:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    bunfigPlugin({
      configDir: './config',
    }),
  ],
  server: {
    watch: {
      include: ['config/**/*'], // Watch config directory
    },
  },
})
```

### Type Checking Integration

Integrate with TypeScript for build-time type checking:

```ts
// scripts/type-check.ts
import { bunfigPlugin } from 'bunfig'

// Generate types for type checking
bunfigPlugin({
  configDir: './config',
  generateTypes: true,
  typesOutputDir: './temp/types',
})

// Run TypeScript compiler with generated types
// tsc --noEmit --project tsconfig.json
```

## Performance Optimization

### Lazy Loading

Implement lazy loading for large configuration sets:

```ts
// src/config-registry.ts
import type { ConfigNames } from 'virtual:bunfig-types'

class ConfigRegistry {
  private loaders = new Map<ConfigNames, () => Promise<any>>()

  register<T extends ConfigNames>(
    name: T,
    loader: () => Promise<ConfigOf<T>>
  ) {
    this.loaders.set(name, loader)
  }

  async get<T extends ConfigNames>(name: T): Promise<ConfigOf<T>> {
    const loader = this.loaders.get(name)
    if (!loader) {
      throw new Error(`Config '${name}' not registered`)
    }
    return loader()
  }
}

// Register lazy loaders
const registry = new ConfigRegistry()

registry.register('app', () => import('./configs/app').then(m => m.default))
registry.register('database', () => import('./configs/database').then(m => m.default))

// Use when needed
const appConfig = await registry.get('app')
```

### Bundle Splitting

Split configurations into separate chunks:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [bunfigPlugin({ configDir: './config' })],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          configs: ['virtual:bunfig-types'],
        },
      },
    },
  },
})
```

## Troubleshooting

### Plugin Not Working

1. **Check bundler compatibility**: Ensure your bundler supports virtual modules
2. **Verify configuration**: Check plugin options and file paths
3. **Restart build**: Clear cache and restart the build process

### Types Not Generated

1. **File discovery**: Verify files are in the correct directory
2. **File format**: Ensure files have proper exports
3. **Build process**: Check that the plugin runs during build

### Runtime Errors

1. **Virtual module resolution**: Ensure your bundler resolves virtual modules
2. **Type imports**: Check import statements and module resolution
3. **Build output**: Verify the plugin output in build logs

## Comparison with TypeScript Plugin

| Feature | Build Plugin | TypeScript Plugin |
|---------|--------------|------------------|
| **Runtime types** | ✅ Yes | ❌ No |
| **Build integration** | ✅ Required | ❌ Not needed |
| **Physical files** | ⚙️ Optional | ❌ No |
| **Bundle size** | 📈 Adds to bundle | 📉 Zero impact |
| **Development** | ⚙️ Build required | ✅ Instant |
| **Production** | ✅ Optimized | ❌ Not available |

## Related Features

- [TypeScript Plugin](./typescript-plugin.md) - Editor-only type generation
- [Type Safety](../features/type-safety.md) - Overview of bunfig's type system
- [Configuration Loading](../features/configuration-loading.md) - Runtime configuration loading