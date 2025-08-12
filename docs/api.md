# API Reference

This document provides detailed information about bunfig's API.

## Core Functions

### `config<T>`

The main function to load configuration.

```ts
async function config<T>(
  nameOrOptions: string | Config<T> = { defaultConfig: {} as T }
): Promise<T>
```

#### Parameters

- `nameOrOptions`: Either a string (config name) or a configuration object
  - When string: Uses default options with the given name
  - When object: Uses the provided configuration options

#### Example

```ts
// Using name only
const config1 = await config<MyConfig>('my-app')

// Using full options
const config2 = await config<MyConfig>({
  name: 'my-app',
  defaultConfig: {
    port: 3000,
  },
})

// Using an alias
const config3 = await config<MyConfig>({
  name: 'my-app',
  alias: 'app',
  defaultConfig: {
    port: 3000,
  },
})
```

### `loadConfig<T>`

Low-level configuration loader with more control over the loading process.

```ts
async function loadConfig<T>({
  name,
  alias,
  cwd,
  defaultConfig,
  checkEnv,
  verbose,
  arrayStrategy, // 'replace' | 'merge' (default 'replace')
}: Config<T>): Promise<T>
```

#### Parameters

- `name`: The name of your configuration
- `alias`: An alternative name to check for config files (optional)
- `cwd`: Working directory to search for config files (defaults to process.cwd())
- `defaultConfig`: Default configuration values
- `arrayStrategy`: Controls how arrays are merged. Defaults to `'replace'` (user-provided arrays replace defaults). Set to `'merge'` to concatenate arrays using bunfig's smart merge.

#### Example

```ts
const config = await loadConfig<MyConfig>({
  name: 'my-app',
  cwd: './config',
  defaultConfig: {
    port: 3000,
  },
})

// With alias
const tlsConfig = await loadConfig<TlsConfig>({
  name: 'tlsx',
  alias: 'tls',
  defaultConfig: {
    domain: 'example.com',
  },
})
```

### `generateConfigTypes`

Generates TypeScript types for your configuration files.

```ts
function generateConfigTypes(options: {
  configDir: string
  generatedDir: string
}): void
```

#### Parameters

- `options.configDir`: Directory containing configuration files
- `options.generatedDir`: Output directory for generated type definitions

#### Example

```ts
generateConfigTypes({
  configDir: './config',
  generatedDir: './types',
})
```

## Types

### `Config<T>`

The main configuration options interface.

```ts
interface Config<T> {
  name: string
  alias?: string
  cwd?: string
  endpoint?: string // browser
  headers?: Record<string, string> // browser
  defaultConfig: T
  checkEnv?: boolean
  verbose?: boolean
  arrayStrategy?: 'replace' | 'merge'
}
```

### `ConfigNames`

Represents valid configuration names.

- With the build plugin active, it resolves to a string-literal union inferred from your `config` directory (via a virtual module).
- Without the plugin, it safely falls back to `string` using an ambient declaration shipped with bunfig.

```ts
// With plugin: type could be 'app' | 'auth' | 'database'
// Without plugin: type is string
```

If your TS setup needs it, you can explicitly reference the fallback types:

```ts
/// <reference types="bunfig" />
```

or in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["bunfig"]
  }
}
```

### `ConfigByName` and `ConfigOf<N>`

With the build plugin active, bunfig exposes a mapping between configuration names and their default export types via a virtual module.

- `ConfigByName`: `{ 'name': typeof import('/abs/path/config/name.ext').default, ... }`
- `ConfigOf<N extends ConfigNames>`: picks the config type for a given `N`.

These enable narrow typing without generating files:

```ts
import type { ConfigOf } from 'bunfig'
const cfg = await loadConfig<ConfigOf<'app'>>({ name: 'app', defaultConfig: { /* ... */ } as ConfigOf<'app'> })
```

Without the plugin, these types fall back to broad shapes so the code continues to typecheck.

## Utility Functions

### `tryLoadConfig<T>`

Attempts to load a config file from a specific path.

```ts
async function tryLoadConfig<T>(
  configPath: string,
  defaultConfig: T,
  arrayStrategy?: 'replace' | 'merge'
): Promise<T | null>
```

#### Parameters

- `configPath`: Path to the configuration file
- `defaultConfig`: Default configuration to merge with

#### Returns

- The merged configuration if successful
- `null` if the file doesn't exist or is invalid

## Constants

### `defaultConfigDir`

The default directory for configuration files.

```ts
const defaultConfigDir: string = resolve(process.cwd(), 'config')
```

### `defaultGeneratedDir`

The default directory for generated files.

```ts
const defaultGeneratedDir: string = resolve(process.cwd(), 'src/generated')
```

## Configuration File Resolution

bunfig searches for configuration files in the following priority order:

### 1. Local Directory Resolution

In your project directory, bunfig looks for:

1. `{name}.config.{ts,js,mjs,cjs,json}`
2. `.{name}.config.{ts,js,mjs,cjs,json}`
3. `{name}.{ts,js,mjs,cjs,json}`
4. `.{name}.{ts,js,mjs,cjs,json}`

### 2. Home Directory Resolution

If no local configuration file is found, bunfig checks your home directory following the XDG Base Directory specification:

1. `~/.config/{name}/config.{ts,js,mjs,cjs,json}`
2. `~/.config/{name}/{name}.config.{ts,js,mjs,cjs,json}`

This allows you to store global configuration settings that apply across all your projects using the same configuration name.

### 3. Package.json Configuration

If no file-based configuration is found, bunfig looks for a configuration section in your package.json file.

If an alias is provided, it will also check for files with the alias name using the same patterns if no file with the primary name is found.

### Resolution Examples

For a configuration with name "my-app":

**Local directory (project-specific):**
- `my-app.config.ts`
- `.my-app.config.ts`
- `my-app.ts`
- `.my-app.ts`

**Home directory (global, if no local file found):**
- `~/.config/my-app/config.ts`
- `~/.config/my-app/my-app.config.ts`

**Package.json (if no file-based config found):**
```json
{
  "my-app": {
    "port": 4000,
    "host": "example.com"
  }
}
```

The first file found in this order will be used. The contents will be deeply merged with the default configuration.

## Error Handling

All functions that load configuration files handle errors gracefully:

- Missing files return the default configuration
- Invalid files are skipped
- Type mismatches are handled by returning the default configuration
- File system errors are caught and handled appropriately

## Best Practices

1. Always provide type information when using `config` or `loadConfig`:

   ```ts
   const config = await config<MyConfig>('my-app')
   ```

2. Use the type generation feature to ensure type safety:

   ```ts
   generateConfigTypes({
     configDir: './config',
     generatedDir: './types',
   })
   ```

3. Provide default values for all configuration options:

   ```ts
   const config = await config<MyConfig>({
     name: 'my-app',
     defaultConfig: {
       // Always provide defaults
       port: 3000,
       host: 'localhost',
     },
   })
   ```

4. Use TypeScript for configuration files when possible:

   ```ts
   // my-app.config.ts (local)
   export default {
     port: 3000,
     host: 'localhost',
   }

   // ~/.config/my-app/config.ts (global)
   export default {
     port: 8080,
     host: 'production.example.com',
   }
   ```

5. Use aliases for backward compatibility or alternative naming:

   ```ts
   const config = await config<MyConfig>({
     name: 'new-name',
     alias: 'old-name',
     defaultConfig: {
       // ...
     },
   })
   ```

6. Use home directory configs for global settings that apply across projects:

   ```ts
   // ~/.config/my-tool/config.ts - applies to all projects using 'my-tool'
   export default {
     globalSettings: true,
     defaultTheme: 'dark',
   }
   ```

7. Use local configs for project-specific overrides:

   ```ts
   // ./my-tool.config.ts - overrides global settings for this project
   export default {
     defaultTheme: 'light', // Override global setting
     projectSpecific: true,
   }
   ```
