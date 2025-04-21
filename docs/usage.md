# Usage

`bunfig` is a smart configuration loader designed specifically for Bun projects. It provides a simple yet powerful way to manage your application's configuration.

## Basic Usage

The simplest way to use bunfig is with the `config` function:

```ts
import { config } from 'bunfig'

interface MyConfig {
  port: number
  host: string
}

// Load config using a name
const myConfig = await config<MyConfig>('my-app')

// Or with explicit options
const myConfig = await config<MyConfig>({
  name: 'my-app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
  },
})
```

## Configuration File Resolution

bunfig will search for your configuration file in the following order:

1. `{name}.config.{ts,js,mjs,cjs,json}`
2. `.{name}.config.{ts,js,mjs,cjs,json}`
3. `{name}.{ts,js,mjs,cjs,json}`
4. `.{name}.{ts,js,mjs,cjs,json}`

For example, if your `name` is "my-app", it will look for:

- `my-app.config.ts`
- `.my-app.config.ts`
- `my-app.ts`
- `.my-app.ts`
(and the same for other supported extensions)

## Advanced Usage

### Using loadConfig Directly

For more control over the configuration loading process, you can use the `loadConfig` function:

```ts
import type { Config } from 'bunfig'
import { loadConfig } from 'bunfig'

interface MyConfig {
  port: number
  host: string
  features: {
    auth: boolean
    api: boolean
  }
}

const options: Config<MyConfig> = {
  name: 'my-app',
  cwd: './config', // custom directory to search in
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    features: {
      auth: false,
      api: true,
    },
  },
}

const config = await loadConfig(options)
```

### Type Generation

bunfig includes a utility to generate TypeScript types for your configuration files:

```ts
import { generateConfigTypes } from 'bunfig'

generateConfigTypes({
  configDir: './config', // directory containing your config files
  generatedDir: './types', // output directory for generated types
})
```

This will generate a type definition file containing all available configuration names based on the files in your config directory.

## API Reference

### `config<T>`(nameOrOptions)

The main function to load configuration.

- `nameOrOptions`: Either a string (config name) or a configuration object
- Returns: `Promise<T>` where T is your config type

### `loadConfig<T>`(options)

Low-level configuration loader with more options.

Options:

- `name`: The name of your configuration
- `cwd?`: Working directory to search for config files (defaults to process.cwd())
- `defaultConfig`: Default configuration values

### generateConfigTypes(options)

Generates TypeScript types for your configuration files.

Options:

- `configDir`: Directory containing configuration files
- `generatedDir`: Output directory for generated type definitions

## Configuration File Format

Your configuration file can be in any of the supported formats. Here's an example using TypeScript:

```ts
// my-app.config.ts
export default {
  port: 4000,
  host: 'localhost',
  features: {
    auth: true,
    api: true,
  },
}
```

The configuration file's values will be deeply merged with your default configuration, with file values taking precedence.

## Best Practices

1. Always define an interface for your configuration
2. Provide sensible default values
3. Use TypeScript for better type safety
4. Keep configuration files in a dedicated directory
5. Use the type generation feature to ensure type safety across your project

## Browser Support

bunfig is primarily designed for Bun projects running in Node.js environments. While the core functionality works in browsers, some features like file system operations are not available in browser environments.

For browser usage, you should:

1. Pre-bundle your configuration during build time
2. Use the browser-safe APIs only
3. Consider using environment-specific configuration loading strategies
