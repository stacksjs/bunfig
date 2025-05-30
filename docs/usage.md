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

// Using an alias for alternative config file names
const myConfig = await config<MyConfig>({
  name: 'my-app',
  alias: 'app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
  },
})
```

## Configuration File Resolution

bunfig searches for your configuration files in the following priority order:

### 1. Local Directory (Project-specific configs)

First, bunfig looks in your project directory for:

1. `{name}.config.{ts,js,mjs,cjs,json}`
2. `.{name}.config.{ts,js,mjs,cjs,json}`
3. `{name}.{ts,js,mjs,cjs,json}`
4. `.{name}.{ts,js,mjs,cjs,json}`

### 2. Home Directory (Global configs)

If no local configuration is found, bunfig checks your home directory following the XDG Base Directory specification:

1. `~/.config/{name}/config.{ts,js,mjs,cjs,json}`
2. `~/.config/{name}/{name}.config.{ts,js,mjs,cjs,json}`

This allows you to store global configuration settings that apply across all your projects using the same configuration name.

### 3. Package.json sections

If no file-based configuration is found, bunfig looks for a configuration section in your package.json file.

For example, if your `name` is "my-app", it will look for:

**Local directory:**
- `my-app.config.ts`
- `.my-app.config.ts`
- `my-app.ts`
- `.my-app.ts`
(and the same for other supported extensions)

**Home directory (if no local file found):**
- `~/.config/my-app/config.ts`
- `~/.config/my-app/my-app.config.ts`
(and the same for other supported extensions)

**Package.json:**
```json
{
  "my-app": {
    "port": 4000,
    "host": "example.com"
  }
}
```

When you specify an alias, bunfig will also check for files with the alias name using the same patterns if no file with the primary name is found.

## Configuration Aliases

You can use aliases to provide alternative configuration file names:

```ts
const tlsConfig = await loadConfig({
  name: 'tlsx',
  alias: 'tls',
  defaultConfig: {
    domain: 'example.com',
    port: 443,
  },
})
```

This is useful for:

- Maintaining backward compatibility when renaming configurations
- Supporting multiple naming conventions
- Providing fallbacks for different environments

When both a primary config file and an alias config file exist, the primary file takes precedence.

**Alias resolution applies to both local and home directories:**

- Local: `tlsx.config.ts` → `tls.config.ts`
- Home: `~/.config/tlsx/config.ts` → `~/.config/tlsx/tls.config.ts` → `~/.config/tls/config.ts` → `~/.config/tls/tls.config.ts`

The alias feature also works when looking for config in package.json - if a section with the primary name isn't found, bunfig will look for a section with the alias name.

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
- `alias`: An alternative name to check for config files (optional)
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
// my-app.config.ts (local)
export default {
  port: 4000,
  host: 'localhost',
  features: {
    auth: true,
    api: true,
  },
}
```

Or in your home directory:

```ts
// ~/.config/my-app/config.ts (global)
export default {
  port: 8080,
  host: 'production.example.com',
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
6. Use aliases for backward compatibility when renaming configurations
7. Use home directory configs (`~/.config/$name/`) for global settings that apply across projects
8. Use local configs for project-specific overrides

## Browser Support

bunfig is primarily designed for Bun projects running in Node.js environments. While the core functionality works in browsers, some features like file system operations are not available in browser environments.

For browser usage, you should:

1. Pre-bundle your configuration during build time
2. Use the browser-safe APIs only
3. Consider using environment-specific configuration loading strategies
