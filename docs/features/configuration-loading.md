# Configuration Loading

bunfig provides a powerful and flexible configuration loading system that automatically finds and loads your configuration files from multiple possible locations and formats.

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

## Supported Formats

bunfig supports multiple configuration file formats:

- TypeScript (`.ts`)
- JavaScript (`.js`, `.mjs`, `.cjs`)
- JSON (`.json`)

## Deep Merging

When loading configuration, bunfig intelligently merges your default configuration with the values from your configuration file:

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

// my-app.config.ts
export default {
  server: {
    port: 8080,
  },
  features: {
    auth: true,
  },
}

// Result after merging
const result = {
  server: {
    port: 8080, // From config file
    host: 'localhost', // From default config
  },
  features: {
    auth: true, // From config file
  },
}
```

## Error Handling

bunfig handles various error scenarios gracefully:

- Missing configuration files: Returns the default configuration
- Invalid file formats: Skips the file and continues searching
- Type mismatches: Returns the default configuration
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
