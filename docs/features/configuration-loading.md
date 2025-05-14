# Configuration Loading

bunfig provides a powerful and flexible configuration loading system that automatically finds and loads your configuration files from multiple possible locations and formats.

## Configuration Resolution Order

bunfig resolves configuration in a priority order, giving you flexibility across different environments:

1. Default configuration values (provided in code)
2. Environment variables (automatically detected based on config name)
3. Configuration files (loaded from the filesystem)

This order ensures that values from higher priority sources override lower priority ones, allowing for a layered configuration approach.

## Smart File Resolution

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

## Configuration Aliases

bunfig supports configuration aliases, allowing you to specify an alternative name for your configuration files. This is useful for:

- Maintaining backward compatibility when renaming configurations
- Supporting multiple naming conventions
- Providing fallbacks for different environments

When you specify an alias, bunfig will check for configuration files with both the primary name and the alias name, using the first one it finds:

```ts
const config = await loadConfig({
  name: 'tlsx',
  alias: 'tls',
  defaultConfig: {
    domain: 'example.com',
    port: 443,
  },
})
```

This will check for both `tlsx.config.ts` and `tls.config.ts` (and other variations), using the primary name with higher priority. If no file with the primary name is found, it will use the alias name.

The same alias resolution also applies when looking for configuration in the package.json file. If a section with the primary name doesn't exist, bunfig will look for a section with the alias name.

## Environment Variable Support

bunfig automatically checks for environment variables based on your configuration name, making it easy to override settings in different environments. Environment variables follow this naming pattern:

```
[CONFIG_NAME]_[PROPERTY_NAME]
```

For example, with a config name of "my-app", these environment variables would be recognized:

```bash
MY_APP_PORT=8080
MY_APP_HOST=production.example.com
```

Environment variables are automatically converted to the correct type based on your default configuration. See the [Environment Variables](./environment-variables.md) section for more details.

## Supported Formats

bunfig supports multiple configuration file formats:

- TypeScript (`.ts`)
- JavaScript (`.js`, `.mjs`, `.cjs`)
- JSON (`.json`)

## Deep Merging

When loading configuration, bunfig intelligently merges your default configuration with the values from environment variables and your configuration file:

```ts
// Default configuration
const defaultConfig = {
  server: {
    port: 3000,
    host: 'localhost',
  },
  features: {
    auth: false,
  },
}

// Environment variables
// MY_APP_SERVER_PORT=8080

// my-app.config.ts
export default {
  server: {
    host: 'custom.example.com',
  },
  features: {
    auth: true,
  },
}

// Result after merging
const result = {
  server: {
    port: 8080, // From environment variable
    host: 'custom.example.com', // From config file (overrides env var if set)
  },
  features: {
    auth: true, // From config file
  },
}
```

## Error Handling

bunfig handles various error scenarios gracefully:

- Missing configuration files: Returns the default configuration with environment variables applied
- Invalid file formats: Skips the file and continues searching
- Type mismatches: Returns the default configuration with environment variables applied
- File system errors: Properly caught and handled

## Working Directory Support

You can specify a custom working directory for configuration file resolution:

```ts
const config = await loadConfig<MyConfig>({
  name: 'my-app',
  cwd: './config', // Look in the ./config directory
  defaultConfig: {
    // ...
  },
})
```

This allows you to organize your configuration files in a dedicated directory structure.

## Disabling Features

You can disable certain features of the configuration loader if needed:

```ts
const config = await loadConfig<MyConfig>({
  name: 'my-app',
  defaultConfig: { /* ... */ },
  checkEnv: false, // Disable environment variable loading
})
```
