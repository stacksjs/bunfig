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
}: Config<T>): Promise<T>
```

#### Parameters

- `name`: The name of your configuration
- `alias`: An alternative name to check for config files (optional)
- `cwd`: Working directory to search for config files (defaults to process.cwd())
- `defaultConfig`: Default configuration values

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
  defaultConfig: T
}
```

### `ConfigNames`

A type representing valid configuration names. This is automatically generated when using `generateConfigTypes`.

```ts
type ConfigNames = string // Or union of available config names if generated
```

## Utility Functions

### `tryLoadConfig<T>`

Attempts to load a config file from a specific path.

```ts
async function tryLoadConfig<T>(
  configPath: string,
  defaultConfig: T
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

bunfig searches for configuration files in the following order:

1. `{name}.config.{ts,js,mjs,cjs,json}`
2. `.{name}.config.{ts,js,mjs,cjs,json}`
3. `{name}.{ts,js,mjs,cjs,json}`
4. `.{name}.{ts,js,mjs,cjs,json}`

If an alias is provided, it will also check for files with the alias name using the same patterns if no file with the primary name is found.

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
   // my-app.config.ts
   export default {
     port: 3000,
     host: 'localhost',
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
