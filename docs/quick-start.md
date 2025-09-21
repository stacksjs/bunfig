# Quick Start

Get up and running with bunfig in under 5 minutes! This tutorial will walk you through setting up bunfig in a real project with practical examples.

## Installation

First, install bunfig in your Bun project:

```bash
bun add bunfig
```

## Step 1: Create Your First Configuration

Let's create a simple web server configuration. Create a file called `server.config.ts` in your project root:

```ts
// server.config.ts
export default {
  port: 8080,
  host: '0.0.0.0',
  cors: {
    enabled: true,
    origins: ['http://localhost:3000']
  },
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10
  }
}
```

## Step 2: Load Configuration in Your App

Now use bunfig to load this configuration in your application:

```ts
// server.ts
import { config } from 'bunfig'

// Define your configuration type for better TypeScript support
interface ServerConfig {
  port: number
  host: string
  cors: {
    enabled: boolean
    origins: string[]
  }
  database: {
    url: string
    pool: number
  }
}

// Load the configuration
const serverConfig = await config<ServerConfig>({
  name: 'server',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    cors: {
      enabled: false,
      origins: []
    },
    database: {
      url: 'postgresql://localhost:5432/defaultdb',
      pool: 5
    }
  }
})

console.log(`Starting server on ${serverConfig.host}:${serverConfig.port}`)

// Start your server with the loaded configuration
const server = Bun.serve({
  port: serverConfig.port,
  hostname: serverConfig.host,
  fetch(req) {
    return new Response('Hello from bunfig!')
  }
})

console.log(`Server running at http://${server.hostname}:${server.port}`)
```

## Step 3: Run Your Application

Run your application to see bunfig in action:

```bash
bun run server.ts
```

You should see:

```text
Starting server on 0.0.0.0:8080
Server running at http://0.0.0.0:8080
```

## Step 4: Environment-Specific Configuration

Let's make this work across different environments. bunfig automatically loads environment variables that match your configuration structure.

Set environment variables to override config values:

```bash
# Override the port and database URL
export SERVER_PORT=9000
export SERVER_DATABASE_URL=postgresql://prod-db:5432/myapp

bun run server.ts
```

bunfig will automatically use:

- `SERVER_PORT=9000` for `serverConfig.port`
- `SERVER_DATABASE_URL=postgresql://prod-db:5432/myapp` for `serverConfig.database.url`

## Step 5: Add Validation

Let's add validation to ensure your configuration is correct:

```ts
// server.ts
import { config } from 'bunfig'

const serverConfig = await config<ServerConfig>({
  name: 'server',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    cors: { enabled: false, origins: [] },
    database: { url: 'postgresql://localhost:5432/defaultdb', pool: 5 }
  },
  // Add JSON Schema validation
  schema: {
    type: 'object',
    properties: {
      port: {
        type: 'number',
        minimum: 1,
        maximum: 65535
      },
      host: {
        type: 'string',
        minLength: 1
      },
      database: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            pattern: '^postgresql://'
          },
          pool: {
            type: 'number',
            minimum: 1,
            maximum: 100
          }
        },
        required: ['url']
      }
    },
    required: ['port', 'host', 'database']
  }
})
```

Now if your configuration is invalid, bunfig will provide clear error messages:

```ts
// If port is invalid (e.g., -1)
// ValidationError: Validation failed
// ❌ port: must be >= 1
```

## Step 6: Multiple Configuration Files

As your app grows, organize configurations by feature. Create separate config files:

```ts
// database.config.ts
export default {
  url: 'postgresql://localhost:5432/myapp',
  pool: 10,
  ssl: false,
  timeout: 30000
}

// redis.config.ts
export default {
  url: 'redis://localhost:6379',
  db: 0,
  keyPrefix: 'myapp:'
}

// logging.config.ts
export default {
  level: 'info',
  file: './logs/app.log',
  enableConsole: true,
  enableFile: true
}
```

Load them in your application:

```ts
// app.ts
import { config } from 'bunfig'

// Load all configurations
const [dbConfig, redisConfig, logConfig] = await Promise.all([
  config({ name: 'database' }),
  config({ name: 'redis' }),
  config({ name: 'logging' })
])

// Use configurations to initialize services
const db = new Database(dbConfig.url, { pool: dbConfig.pool })
const redis = new Redis(redisConfig.url)
const logger = new Logger(logConfig)
```

## Step 7: Home Directory Configuration

For global settings that apply across projects, use home directory configurations:

```bash
# Create global bunfig configuration
mkdir -p ~/.config/bunfig
```

```ts
// ~/.config/bunfig/config.ts
export default {
  logging: {
    level: 'debug',
    enableConsole: true
  },
  development: {
    hotReload: true,
    verbose: true
  }
}
```

bunfig will automatically find and merge this with your project-specific configuration.

## Step 8: Package.json Integration

You can also store configuration in your `package.json`:

```json
{
  "name": "my-app",
  "bunfig": {
    "server": {
      "port": 8080,
      "host": "0.0.0.0"
    }
  }
}
```

bunfig will automatically discover and use this configuration.

## Real-World Example: Full Web Application

Here's a complete example of a web application using bunfig:

```ts
// config/app.config.ts
export default {
  server: {
    port: 3000,
    host: 'localhost',
    cors: {
      enabled: true,
      origins: ['http://localhost:3000']
    }
  },
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10,
    ssl: false
  },
  redis: {
    url: 'redis://localhost:6379',
    db: 0
  },
  auth: {
    jwtSecret: 'your-secret-key',
    tokenExpiry: '24h'
  },
  features: {
    enableMetrics: true,
    enableCaching: true,
    debugMode: false
  }
}
```

```ts
// app.ts
import { config } from 'bunfig'

interface AppConfig {
  server: {
    port: number
    host: string
    cors: {
      enabled: boolean
      origins: string[]
    }
  }
  database: {
    url: string
    pool: number
    ssl: boolean
  }
  redis: {
    url: string
    db: number
  }
  auth: {
    jwtSecret: string
    tokenExpiry: string
  }
  features: {
    enableMetrics: boolean
    enableCaching: boolean
    debugMode: boolean
  }
}

const appConfig = await config<AppConfig>({
  name: 'app',
  // Provide sensible defaults
  defaultConfig: {
    server: {
      port: 3000,
      host: 'localhost',
      cors: { enabled: false, origins: [] }
    },
    database: {
      url: 'postgresql://localhost:5432/defaultdb',
      pool: 5,
      ssl: false
    },
    redis: {
      url: 'redis://localhost:6379',
      db: 0
    },
    auth: {
      jwtSecret: 'dev-secret',
      tokenExpiry: '1h'
    },
    features: {
      enableMetrics: false,
      enableCaching: false,
      debugMode: true
    }
  },
  // Add validation
  schema: {
    type: 'object',
    properties: {
      server: {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 },
          host: { type: 'string', minLength: 1 }
        },
        required: ['port', 'host']
      },
      database: {
        type: 'object',
        properties: {
          url: { type: 'string', pattern: '^postgresql://' },
          pool: { type: 'number', minimum: 1, maximum: 50 }
        },
        required: ['url']
      },
      auth: {
        type: 'object',
        properties: {
          jwtSecret: { type: 'string', minLength: 10 },
          tokenExpiry: { type: 'string', pattern: '^\\d+[hmd]$' }
        },
        required: ['jwtSecret']
      }
    },
    required: ['server', 'database', 'auth']
  }
})

// Initialize services with configuration
const server = Bun.serve({
  port: appConfig.server.port,
  hostname: appConfig.server.host,

  async fetch(req) {
    // Use configuration throughout your app
    if (appConfig.features.debugMode) {
      console.log(`Request: ${req.method} ${req.url}`)
    }

    return new Response('Hello World!')
  }
})

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`)
console.log(`📊 Metrics enabled: ${appConfig.features.enableMetrics}`)
console.log(`🗄️  Caching enabled: ${appConfig.features.enableCaching}`)
```

## Environment Variables

Set environment variables to override any configuration:

```bash
# Override server settings
export APP_SERVER_PORT=8080
export APP_SERVER_HOST=0.0.0.0

# Override database settings
export APP_DATABASE_URL=postgresql://prod-server:5432/myapp
export APP_DATABASE_POOL=20
export APP_DATABASE_SSL=true

# Override feature flags
export APP_FEATURES_ENABLEMETRICS=true
export APP_FEATURES_DEBUGMODE=false

# Override auth settings
export APP_AUTH_JWTSECRET=super-secure-production-secret
export APP_AUTH_TOKENEXPIRY=8h

bun run app.ts
```

## What You've Learned

In this quick start, you've learned how to:

✅ **Install and set up bunfig** in your project
✅ **Create and load configuration files** with TypeScript support
✅ **Use environment variables** to override configuration
✅ **Add validation** to ensure configuration correctness
✅ **Organize multiple configuration files** by feature
✅ **Use home directory configurations** for global settings
✅ **Integrate with package.json** for simple configurations
✅ **Build a real-world application** with comprehensive configuration

## Next Steps

Now that you understand the basics, explore these advanced features:

- **[Configuration Loading](./features/configuration-loading.md)** - Deep dive into all loading strategies
- **[Validation](./features/validation.md)** - Advanced validation patterns and custom rules
- **[Error Handling](./features/error-handling.md)** - Robust error handling and recovery
- **[Type Safety](./features/type-safety.md)** - Advanced TypeScript integration
- **[Recipes](./recipes/index.md)** - Real-world configuration patterns
- **[Performance](./advanced/performance.md)** - Optimization techniques

## Common Issues

### Configuration Not Found

If bunfig can't find your configuration:

1. **Check the file name** - ensure it matches the `name` parameter
2. **Check the location** - place config files in your project root
3. **Check the extension** - use `.ts`, `.js`, `.mjs`, `.cjs`, or `.json`

```bash
# For name: 'server', bunfig looks for:
server.config.ts
server.config.js
.server.config.ts
server.ts
.server.ts
```

### Environment Variables Not Working

Environment variables must follow the naming pattern: `{NAME}_{PATH}` where:

- `NAME` is your configuration name in UPPERCASE
- `PATH` is the property path with underscores

```bash
# For config name 'app' and property path 'server.port'
export APP_SERVER_PORT=8080

# For nested properties use underscores
export APP_DATABASE_POOL_SIZE=20
```

### Validation Errors

If validation fails, check:

1. **Property types** match the schema
2. **Required properties** are present
3. **Value ranges** are within specified limits
4. **String patterns** match regex requirements

The error messages will guide you to the specific issues.

## Getting Help

- **[Troubleshooting Guide](./advanced/troubleshooting.md)** - Common issues and solutions
- **[API Reference](./api.md)** - Complete API documentation
- **[GitHub Issues](https://github.com/stacksjs/bunfig/issues)** - Report bugs or request features
