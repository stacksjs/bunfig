# Multiple Formats

bunfig supports a wide variety of configuration file formats, making it flexible and compatible with different project setups and preferences.

## Supported Formats

bunfig supports the following configuration file formats:

- **TypeScript** (`.ts`, `.mts`, `.cts`)
- **JavaScript** (`.js`, `.mjs`, `.cjs`)
- **JSON** (`.json`)

All formats support both default exports and named exports, giving you flexibility in how you structure your configuration files.

## Format Priority

When multiple configuration files exist with the same base name, bunfig follows this priority order:

1. **TypeScript** files (`.ts`, `.mts`, `.cts`)
2. **JavaScript** files (`.js`, `.mjs`, `.cjs`)
3. **JSON** files (`.json`)

Within each category, the order is:
- `.ts` > `.mts` > `.cts`
- `.js` > `.mjs` > `.cjs`

## TypeScript Configuration

### Default Export

```ts
// my-app.config.ts
export default {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
  },
  features: ['auth', 'logging'],
}
```

### Named Export

```ts
// my-app.config.ts
export const config = {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
  },
}
```

### With Type Definitions

```ts
// my-app.config.ts
interface AppConfig {
  port: number
  host: string
  database: {
    url: string
    pool: number
  }
  features?: string[]
}

const config: AppConfig = {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
  },
  features: ['auth', 'logging'],
}

export default config
```

### Dynamic Configuration

```ts
// my-app.config.ts
export default {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || 'localhost',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/myapp',
    pool: Number(process.env.DB_POOL_SIZE) || 10,
  },
  features: process.env.NODE_ENV === 'production'
    ? ['auth', 'logging', 'monitoring']
    : ['auth', 'logging'],
}
```

## JavaScript Configuration

### ES Modules (.mjs)

```js
// my-app.config.mjs
export default {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
  },
}
```

### CommonJS (.cjs)

```js
// my-app.config.cjs
module.exports = {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
  },
}
```

### Regular JavaScript (.js)

```js
// my-app.config.js
// Uses project's module type (package.json "type" field)

// If "type": "module" in package.json
export default {
  port: 3000,
  host: 'localhost',
}

// If "type": "commonjs" or no type specified
module.exports = {
  port: 3000,
  host: 'localhost',
}
```

## JSON Configuration

### Basic JSON

```json
{
  "port": 3000,
  "host": "localhost",
  "database": {
    "url": "postgresql://localhost:5432/myapp",
    "pool": 10
  },
  "features": ["auth", "logging"]
}
```

### JSON with Comments (JSONC)

bunfig supports JSON with comments when using appropriate tooling:

```jsonc
{
  // Server configuration
  "port": 3000,
  "host": "localhost",

  /* Database settings */
  "database": {
    "url": "postgresql://localhost:5432/myapp",
    "pool": 10
  },

  "features": [
    "auth",     // Authentication module
    "logging"   // Logging module
  ]
}
```

## Module Types

### ES Modules (.mts)

```ts
// my-app.config.mts
import type { Config } from './types.js'

const config: Config = {
  port: 3000,
  host: 'localhost',
}

export default config
```

### CommonJS (.cts)

```ts
// my-app.config.cts
import type { Config } from './types'

const config: Config = {
  port: 3000,
  host: 'localhost',
}

export = config
```

## Advanced Patterns

### Environment-Specific Configurations

```ts
// my-app.config.ts
const baseConfig = {
  host: 'localhost',
  features: ['auth'],
}

const envConfigs = {
  development: {
    ...baseConfig,
    port: 3000,
    debug: true,
  },
  production: {
    ...baseConfig,
    port: 8080,
    debug: false,
    features: [...baseConfig.features, 'monitoring'],
  },
  test: {
    ...baseConfig,
    port: 3001,
    database: {
      url: ':memory:',
    },
  },
}

export default envConfigs[process.env.NODE_ENV as keyof typeof envConfigs] || envConfigs.development
```

### Conditional Exports

```ts
// my-app.config.ts
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export default {
  port: 3000,
  host: 'localhost',
  ...(isDevelopment && {
    debug: true,
    hotReload: true,
  }),
  ...(isProduction && {
    minify: true,
    compression: true,
  }),
}
```

### Factory Pattern

```ts
// my-app.config.ts
interface ConfigOptions {
  env: 'development' | 'production' | 'test'
  debug?: boolean
}

function createConfig(options: ConfigOptions) {
  return {
    port: options.env === 'production' ? 8080 : 3000,
    host: 'localhost',
    debug: options.debug ?? options.env === 'development',
    features: options.env === 'production'
      ? ['auth', 'logging', 'monitoring']
      : ['auth', 'logging'],
  }
}

export default createConfig({
  env: (process.env.NODE_ENV as any) || 'development',
  debug: process.env.DEBUG === 'true',
})
```

## File Naming Conventions

bunfig supports multiple naming conventions for configuration files:

### Standard Patterns

```
my-app.config.ts      # Standard format
.my-app.config.ts     # Hidden/dotfile format
my-app.ts             # Short format
.my-app.ts            # Hidden short format
```

### Directory-Based

```
config/
├── my-app.ts         # Preferred in config directory
├── my-app.config.ts  # Alternative in config directory
├── .my-app.ts        # Hidden format
└── .my-app.config.ts # Hidden standard format

.config/
├── my-app.ts         # Same patterns as config/
└── my-app.config.ts
```

### Custom Directory

```ts
const config = await loadConfig({
  name: 'my-app',
  configDir: './settings', // Custom config directory
  defaultConfig: { /* ... */ },
})
```

```
settings/
├── my-app.ts
├── my-app.config.ts
└── other-configs.ts
```

## Format-Specific Features

### TypeScript Benefits

- **Type checking** at configuration load time
- **IntelliSense** support in editors
- **Import/export** of shared types and utilities
- **Conditional logic** with full TypeScript features

### JavaScript Benefits

- **Dynamic configuration** with runtime logic
- **Module imports** for shared utilities
- **Environment variable** integration
- **Compatibility** with existing JavaScript tooling

### JSON Benefits

- **Simple syntax** for basic configurations
- **Easy parsing** and validation
- **Tool compatibility** with configuration editors
- **Version control** friendly format

## Best Practices

### 1. Choose the Right Format

- **TypeScript**: For complex configurations with type safety
- **JavaScript**: For dynamic configurations with runtime logic
- **JSON**: For simple, static configurations

### 2. Consistent Naming

Use consistent naming patterns across your project:

```ts
// Good - consistent pattern
my-app.config.ts
my-api.config.ts
my-cli.config.ts

// Avoid - mixed patterns
my-app.config.ts
api-config.js
cli.json
```

### 3. Type Safety

When using TypeScript, define and use interfaces:

```ts
// config-types.ts
export interface AppConfig {
  port: number
  host: string
  database: DatabaseConfig
}

export interface DatabaseConfig {
  url: string
  pool: number
}

// my-app.config.ts
import type { AppConfig } from './config-types.ts'

const config: AppConfig = {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
  },
}

export default config
```

### 4. Environment Variables

Integrate environment variables appropriately for each format:

```ts
// TypeScript/JavaScript
export default {
  port: Number(process.env.PORT) || 3000,
  debug: process.env.DEBUG === 'true',
}
```

```json
// JSON (use templating tools or build-time replacement)
{
  "port": "${PORT:-3000}",
  "debug": "${DEBUG:-false}"
}
```

## Troubleshooting

### Format Not Recognized

1. Check file extension spelling
2. Verify the file is in a searched directory
3. Ensure proper export syntax for the format

### Module Loading Errors

1. Check package.json "type" field for .js files
2. Verify import/export syntax matches module type
3. Ensure TypeScript configuration is correct for .ts files

### Precedence Issues

1. Remember the format priority order
2. Check for multiple files with the same base name
3. Use specific extensions to avoid conflicts

## Related Features

- [Configuration Loading](./configuration-loading.md) - How bunfig discovers and loads configurations
- [Type Safety](./type-safety.md) - TypeScript integration and type generation
- [Home Directory Support](./home-directory.md) - Global configuration file locations