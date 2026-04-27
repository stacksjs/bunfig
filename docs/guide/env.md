---
title: Environment Variables
description: Automatic environment variable detection and override in bunfig
---

# Environment Variables

bunfig automatically detects and merges environment variables with your configuration, providing a seamless way to override settings in different environments.

## How It Works

Environment variables are automatically mapped to configuration properties using a naming convention:

```
[CONFIG_NAME]_[PROPERTY_PATH]
```

### Examples

```bash
# For a config named "app"
APP_PORT=8080                          # → config.port = 8080
APP_DATABASE_URL=postgres://...        # → config.database.url = "postgres://..."
APP_SERVER_HOST=0.0.0.0                # → config.server.host = "0.0.0.0"
APP_FEATURES_DARK_MODE=true            # → config.features.darkMode = true
```

### Naming Convention

- Config name is UPPERCASED: `app` → `APP_`
- Property names are UPPERCASED: `serverHost` → `SERVER_HOST`
- Nested properties use underscores: `database.pool.size` → `DATABASE_POOL_SIZE`
- camelCase becomes SNAKE_CASE: `maxRetries` → `MAX_RETRIES`

## Basic Example

```typescript
// app.config.ts
export default {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/dev',
    pool: 10,
  },
}
```

```bash
# .env or shell environment
export APP_PORT=8080
export APP_DATABASE_URL=postgresql://prod:5432/prod
export APP_DATABASE_POOL=50
```

```typescript
import { loadConfig } from 'bunfig'

const config = await loadConfig({ name: 'app' })

console.log(config.port)          // 8080 (from APP_PORT)
console.log(config.database.url)  // "postgresql://prod:5432/prod"
console.log(config.database.pool) // 50 (from APP_DATABASE_POOL)
console.log(config.host)          // "localhost" (unchanged, no env var)
```

## Type Conversion

bunfig automatically converts environment variable values to the appropriate types:

### Numbers

```bash
APP_PORT=8080           # → number: 8080
APP_TIMEOUT=30.5        # → number: 30.5
APP_RETRIES=3           # → number: 3
```

### Booleans

```bash
APP_DEBUG=true          # → boolean: true
APP_DEBUG=false         # → boolean: false
APP_DEBUG=1             # → boolean: true
APP_DEBUG=0             # → boolean: false
APP_ENABLED=yes         # → boolean: true
APP_ENABLED=no          # → boolean: false
```

### Arrays

```bash
# JSON format
APP_HOSTS=["host1.com","host2.com"]

# Comma-separated (when default is an array)
APP_ALLOWED_ORIGINS=https://a.com,https://b.com
```

```typescript
// In your config
export default {
  hosts: [],                    // Empty array default
  allowedOrigins: ['default'],  // Array default signals to parse as array
}

// Result
config.hosts = ['host1.com', 'host2.com']
config.allowedOrigins = ['https://a.com', 'https://b.com']
```

### Objects

```bash
# JSON format for complex objects
APP_DATABASE='{"host":"localhost","port":5432}'
```

## Disabling Environment Variable Loading

If you don't want environment variables to override config:

```typescript
const config = await loadConfig({
  name: 'app',
  checkEnv: false, // Disable environment variable checking
})
```

## Custom Prefix

Use a different prefix for environment variables:

```typescript
// Config name: "myapp"
// Default prefix: MYAPP_
// Custom via aliased config name

const config = await loadConfig({
  name: 'my-custom-app',  // MY_CUSTOM_APP_ prefix
  alias: 'app',           // Still loads from app.config.ts
})
```

## Sensitive Values

For sensitive configuration, use environment variables exclusively:

```typescript
// app.config.ts
export default {
  api: {
    endpoint: 'https://api.example.com',
    // Don't put secrets in config files!
    // apiKey: 'secret',  // BAD!
  },
}
```

```bash
# Set sensitive values via environment
export APP_API_KEY=your-secret-api-key
export APP_DATABASE_PASSWORD=db-password
```

```typescript
interface AppConfig {
  api: {
    endpoint: string
    apiKey?: string  // Will come from environment
  }
  database?: {
    password?: string
  }
}

const config = await loadConfig<AppConfig>({ name: 'app' })

// Access sensitive values from env
const apiKey = config.api.apiKey
if (!apiKey) {
  throw new Error('APP_API_KEY environment variable is required')
}
```

## Priority Order

Environment variables take precedence in this order (highest to lowest):

1. **Environment variables** (highest priority)
2. **Project config file** (`./app.config.ts`)
3. **Home directory config** (`~/.config/app/config.ts`)
4. **Default config** (lowest priority)

```typescript
// Default config
const defaults = {
  port: 3000,
  host: 'localhost',
}

// ~/.config/app/config.ts
export default {
  port: 4000,  // Overrides default
}

// ./app.config.ts
export default {
  host: '0.0.0.0',  // Overrides default
}

// Environment: APP_PORT=8080

// Final result:
{
  port: 8080,      // From environment (highest priority)
  host: '0.0.0.0', // From project config
}
```

## Working with .env Files

bunfig works well with `.env` file loaders like `dotenv`:

```typescript
// Load .env file first
import 'dotenv/config'

// Or with Bun's built-in support
// Bun automatically loads .env files

import { loadConfig } from 'bunfig'

const config = await loadConfig({ name: 'app' })
```

### .env File Example

```bash
# .env
APP_PORT=3000
APP_DATABASE_URL=postgresql://localhost:5432/myapp
APP_DEBUG=true

# .env.production
APP_PORT=80
APP_DATABASE_URL=postgresql://prod-db:5432/myapp
APP_DEBUG=false
```

## Environment-Specific Configs

Combine with environment-specific config files:

```typescript
// Load environment-specific config file
const env = process.env.NODE_ENV || 'development'

const config = await loadConfig({
  name: env,  // Loads development.config.ts or production.config.ts
  cwd: './config',
})
```

Or use a single config with environment-aware defaults:

```typescript
// app.config.ts
const isProd = process.env.NODE_ENV === 'production'

export default {
  port: isProd ? 80 : 3000,
  debug: !isProd,
  database: {
    url: isProd
      ? process.env.DATABASE_URL
      : 'postgresql://localhost:5432/dev',
  },
}
```

## Validation with Environment Variables

Ensure required environment variables are set:

```typescript
import { loadConfig } from 'bunfig'

interface AppConfig {
  api: {
    key: string
    secret: string
  }
}

const config = await loadConfig<AppConfig>({
  name: 'app',
  defaultConfig: {
    api: {
      key: '',
      secret: '',
    },
  },
})

// Validate required environment variables
const requiredEnvVars = ['APP_API_KEY', 'APP_API_SECRET']
const missing = requiredEnvVars.filter(v => !process.env[v])

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}
```

## Debugging Environment Variables

Enable verbose mode to see which environment variables are being used:

```typescript
// Set DEBUG=bunfig or check what's being loaded
const config = await loadConfig({
  name: 'app',
  // Log will show:
  // - Which env vars were found
  // - What values were merged
})

// Manual debugging
console.log('Environment variables matching APP_*:')
Object.keys(process.env)
  .filter(key => key.startsWith('APP_'))
  .forEach(key => {
    console.log(`  ${key}=${process.env[key]}`)
  })
```

## Docker and Container Environments

Environment variables are especially useful in containerized environments:

```dockerfile
# Dockerfile
FROM oven/bun:1

WORKDIR /app
COPY . .
RUN bun install

# Set runtime configuration via environment
ENV APP_PORT=3000
ENV APP_DATABASE_URL=postgresql://db:5432/app

CMD ["bun", "run", "start"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      - APP_PORT=3000
      - APP_DATABASE_URL=postgresql://db:5432/app
      - APP_REDIS_URL=redis://cache:6379
    env_file:
      - .env.production
```

## Next Steps

- Learn about [Config Loading Patterns](/guide/loading)
- Explore [Type Safety](/guide/types)
- Check out [Validation Features](/features/validation)
