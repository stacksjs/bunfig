# Environment Variables

Bunfig automatically checks for environment variables based on the config name. This makes it easy to override configuration values without modifying your config files, which is particularly useful for:

- Different deployment environments (development, staging, production)
- CI/CD pipelines
- Containerized applications
- Secrets management

## How It Works

Environment variables take precedence over default values but are overridden by config files. This priority order allows for flexible configuration:

1. Default values (lowest priority)
2. Environment variables (middle priority)
3. Config files (highest priority)

## Naming Convention

The naming convention for environment variables follows this pattern:

```
[CONFIG_NAME]_[PROPERTY_NAME]
```

For nested properties, use underscores to separate the levels:

```
[CONFIG_NAME]_[NESTED_PROPERTY_PATH]
```

All keys are automatically converted to uppercase with hyphens replaced by underscores.

### Examples

With a config name of "my-app" and the following default configuration:

```ts
const options = {
  name: 'my-app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    database: {
      url: 'postgres://localhost:5432',
      user: 'admin',
    },
    features: {
      logging: {
        enabled: true,
        level: 'info',
      },
    },
  },
}
```

These environment variables would be automatically detected:

```bash
# Top-level properties
MY_APP_PORT=8080
MY_APP_HOST=example.com

# Nested properties
MY_APP_DATABASE_URL=postgres://production:5432
MY_APP_DATABASE_USER=prod_user
MY_APP_FEATURES_LOGGING_ENABLED=false
MY_APP_FEATURES_LOGGING_LEVEL=error
```

## Data Type Conversion

Bunfig automatically converts environment variables to the appropriate type based on the default value:

- **Numbers**: Environment variable values are converted to numbers
- **Booleans**: `"true"` (case-insensitive) is converted to `true`, everything else to `false`
- **Arrays**: Two formats are supported:
  - JSON arrays: `MY_APP_ALLOWED_ORIGINS=["https://example.com","https://api.example.com"]`
  - Comma-separated values: `MY_APP_ALLOWED_ORIGINS=https://example.com,https://api.example.com`
- **Strings**: Used as-is

## Disabling Environment Variable Support

You can disable environment variable checking by setting `checkEnv: false` in your config options:

```ts
const options = {
  name: 'my-app',
  defaultConfig: { /* ... */ },
  checkEnv: false, // Disable environment variable checking
}
```

## Browser Support

In browser environments, environment variables function differently since browser JavaScript doesn't have direct access to system environment variables. In this context:

- Server-side environment variables can be embedded during build time
- You can pass environment configuration via the API endpoint specified in `loadConfig`

For browser applications, consider using environment variables during your build process to configure the endpoint URL:

```ts
const config = await loadConfig({
  name: 'my-app',
  endpoint: process.env.API_ENDPOINT || '/api/config',
  defaultConfig: { /* ... */ },
})
```

## Best Practices

1. **Use environment variables for environment-specific settings**: ports, hosts, API keys, feature flags
2. **Don't use environment variables for complex objects**: They work best for primitive values or simple arrays
3. **Document your environment variables**: Include all supported environment variables in your README
4. **Provide sensible defaults**: Make sure your application works with the default configuration

## Example: Complete Configuration Flow

```ts
// 1. Default configuration in code
const defaultConfig = {
  port: 3000,
  debug: false,
  api: {
    url: 'https://api.example.com',
    timeout: 5000,
  },
}

// 2. Environment variables can override defaults
// MY_APP_PORT=8080
// MY_APP_API_URL=https://staging-api.example.com

// 3. Config file has highest priority (my-app.config.ts)
export default {
  debug: true,
  api: {
    timeout: 10000,
  },
}

// Final resolved configuration:
// {
//   port: 8080,              // From environment variable
//   debug: true,             // From config file
//   api: {
//     url: 'https://staging-api.example.com', // From environment variable
//     timeout: 10000,        // From config file
//   },
// }
```
