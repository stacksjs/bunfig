# Migration Guide

This guide helps you migrate from other configuration libraries to bunfig, providing step-by-step instructions and code examples for common migration scenarios.

## From dotenv

If you're using dotenv (`.env` files), bunfig can automatically read environment variables and merge them with your configuration.

### Before (dotenv)

```js
// .env
PORT=3000
HOST=localhost
DATABASE_URL=postgresql://localhost:5432/myapp
REDIS_URL=redis://localhost:6379

// app.js
require('dotenv').config()

const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/default'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
}
```

### After (bunfig)

```ts
// app.config.ts
export default {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp'
  },
  redis: {
    url: 'redis://localhost:6379'
  }
}

// app.ts
import { config } from 'bunfig'

const appConfig = await config({
  name: 'app',
  // Environment variables automatically override config values
  // APP_PORT, APP_HOST, APP_DATABASE_URL, APP_REDIS_URL
})
```

**Migration Benefits:**
- ✅ Automatic environment variable detection
- ✅ Type safety with TypeScript
- ✅ No manual `process.env` parsing
- ✅ Built-in validation and error handling
- ✅ Multiple configuration sources (files, env vars, package.json)

## From node-config

The `config` npm package uses directory-based configuration files.

### Before (node-config)

```js
// config/default.json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  }
}

// config/production.json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "database": {
    "host": "prod-db.example.com",
    "ssl": true
  }
}

// app.js
const config = require('config')

const server = config.get('server')
const database = config.get('database')
```

### After (bunfig)

```ts
// config/base.config.ts
export default {
  server: {
    port: 3000,
    host: 'localhost'
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'myapp',
    ssl: false
  }
}

// config/production.config.ts
import base from './base.config'

export default {
  ...base,
  server: {
    ...base.server,
    port: 8080,
    host: '0.0.0.0'
  },
  database: {
    ...base.database,
    host: 'prod-db.example.com',
    ssl: true
  }
}

// app.ts
import { config } from 'bunfig'

const environment = process.env.NODE_ENV || 'base'
const appConfig = await config({
  name: environment,
  cwd: './config'
})
```

**Migration Benefits:**
- ✅ Better TypeScript support
- ✅ More flexible file formats (TS, JS, JSON)
- ✅ Built-in environment variable integration
- ✅ Validation and error handling
- ✅ Home directory configuration support

## From rc files

RC configuration libraries use dotfiles with JSON configuration.

### Before (rc)

```js
// .myapprc
{
  "port": 3000,
  "host": "localhost",
  "database": {
    "url": "postgresql://localhost:5432/myapp"
  }
}

// app.js
const rc = require('rc')
const config = rc('myapp', {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/default'
  }
})
```

### After (bunfig)

```ts
// .myapp.config.ts
export default {
  port: 3000,
  host: 'localhost',
  database: {
    url: 'postgresql://localhost:5432/myapp'
  }
}

// app.ts
import { config } from 'bunfig'

const appConfig = await config({
  name: 'myapp',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    database: {
      url: 'postgresql://localhost:5432/default'
    }
  }
})
```

**Migration Benefits:**
- ✅ TypeScript support for better development experience
- ✅ More file format options
- ✅ Better error handling and validation
- ✅ Environment variable integration
- ✅ Package.json integration

## From Cosmiconfig

Cosmiconfig searches for configuration files in various formats.

### Before (cosmiconfig)

```js
// package.json
{
  "myapp": {
    "port": 3000,
    "host": "localhost"
  }
}

// or .myapprc.json
{
  "port": 3000,
  "host": "localhost"
}

// or myapp.config.js
module.exports = {
  port: 3000,
  host: 'localhost'
}

// app.js
const { cosmiconfigSync } = require('cosmiconfig')

const explorer = cosmiconfigSync('myapp')
const result = explorer.search()
const config = result ? result.config : {}
```

### After (bunfig)

```ts
// Any of these work automatically:
// - myapp.config.ts
// - .myapp.config.ts
// - myapp.config.js
// - package.json (with "myapp" field)

// myapp.config.ts
export default {
  port: 3000,
  host: 'localhost'
}

// app.ts
import { config } from 'bunfig'

const appConfig = await config({ name: 'myapp' })
```

**Migration Benefits:**
- ✅ Built-in support for all common file locations
- ✅ TypeScript and modern ES modules
- ✅ Environment variable integration
- ✅ Validation and error handling
- ✅ Better performance with caching

## From Environment Variables Only

If you're only using environment variables, bunfig makes it easier to organize and validate them.

### Before (environment variables)

```js
// app.js
const config = {
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/default',
    pool: parseInt(process.env.DB_POOL) || 5,
    ssl: process.env.DB_SSL === 'true'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    db: parseInt(process.env.REDIS_DB) || 0
  },
  features: {
    enableCache: process.env.ENABLE_CACHE === 'true',
    enableMetrics: process.env.ENABLE_METRICS === 'true'
  }
}

// Manual validation
if (!config.database.url) {
  throw new Error('DATABASE_URL is required')
}
if (config.server.port < 1 || config.server.port > 65535) {
  throw new Error('PORT must be between 1 and 65535')
}
```

### After (bunfig)

```ts
// app.config.ts
export default {
  server: {
    port: 3000,
    host: 'localhost'
  },
  database: {
    url: 'postgresql://localhost:5432/default',
    pool: 5,
    ssl: false
  },
  redis: {
    url: 'redis://localhost:6379',
    db: 0
  },
  features: {
    enableCache: false,
    enableMetrics: false
  }
}

// app.ts
import { config } from 'bunfig'

const appConfig = await config({
  name: 'app',
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
          pool: { type: 'number', minimum: 1, maximum: 100 }
        },
        required: ['url']
      }
    },
    required: ['server', 'database']
  }
})

// Environment variables automatically override:
// APP_SERVER_PORT=8080
// APP_DATABASE_URL=postgresql://prod:5432/app
// APP_FEATURES_ENABLECACHE=true
```

**Migration Benefits:**
- ✅ Automatic type conversion (string → number, string → boolean)
- ✅ Built-in validation with JSON Schema
- ✅ Default values in configuration files
- ✅ Better error messages for invalid values
- ✅ No manual parsing or validation code

## Migration Checklist

### Step 1: Install bunfig

```bash
# Remove old dependencies
bun remove dotenv config rc cosmiconfig

# Install bunfig
bun add bunfig
```

### Step 2: Create Configuration Files

```bash
# Create your first config file
touch app.config.ts

# Or organize by feature
mkdir config
touch config/server.config.ts
touch config/database.config.ts
```

### Step 3: Convert Configuration

1. **Extract defaults** from your code into configuration files
2. **Remove manual environment variable parsing**
3. **Add TypeScript interfaces** for type safety
4. **Add validation schemas** for critical settings

### Step 4: Update Application Code

```ts
// Before
const config = require('config')
const port = process.env.PORT || config.get('server.port')

// After
import { config } from 'bunfig'
const { server } = await config({ name: 'app' })
const port = server.port // Already includes env var overrides
```

### Step 5: Update Environment Variables

```bash
# Before (dotenv style)
PORT=3000
DATABASE_URL=postgresql://localhost:5432/app

# After (bunfig style with prefixes)
APP_SERVER_PORT=3000
APP_DATABASE_URL=postgresql://localhost:5432/app
```

### Step 6: Add Validation (Optional)

```ts
const appConfig = await config({
  name: 'app',
  schema: {
    type: 'object',
    properties: {
      server: {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 }
        },
        required: ['port']
      }
    }
  }
})
```

### Step 7: Test Migration

```ts
// Create a test to verify migration
import { describe, it, expect } from 'bun:test'
import { config } from 'bunfig'

describe('Configuration Migration', () => {
  it('should load configuration with defaults', async () => {
    const cfg = await config({ name: 'app' })
    expect(cfg.server.port).toBe(3000)
    expect(cfg.database.url).toBeDefined()
  })

  it('should override with environment variables', async () => {
    process.env.APP_SERVER_PORT = '8080'
    const cfg = await config({ name: 'app' })
    expect(cfg.server.port).toBe(8080)
    delete process.env.APP_SERVER_PORT
  })
})
```

## Common Migration Issues

### Environment Variable Naming

**Issue:** Environment variables not being picked up.

```ts
// ❌ Wrong: dotenv style variables
process.env.PORT = '3000'
process.env.DATABASE_URL = 'postgresql://...'

// ✅ Correct: bunfig requires prefixed variables
process.env.APP_SERVER_PORT = '3000'
process.env.APP_DATABASE_URL = 'postgresql://...'
```

### Nested Configuration

**Issue:** Complex nested configurations not working.

```ts
// ❌ Wrong: flat environment variables
process.env.SERVER_DATABASE_POOL_SIZE = '10'

// ✅ Correct: use underscores for nesting
process.env.APP_DATABASE_POOL_SIZE = '10'

// Which maps to:
// {
//   database: {
//     pool: {
//       size: 10
//     }
//   }
// }
```

### Type Conversion

**Issue:** Environment variables staying as strings.

```ts
// ❌ Manual conversion needed before
const port = parseInt(process.env.PORT) || 3000
const enabled = process.env.ENABLE_FEATURE === 'true'

// ✅ Automatic conversion with bunfig
// Set defaults with correct types in config file:
export default {
  port: 3000,        // number type
  enabled: false     // boolean type
}

// Environment variables automatically converted:
// APP_PORT=8080 → port: 8080 (number)
// APP_ENABLED=true → enabled: true (boolean)
```

### File Locations

**Issue:** Configuration files not found.

```ts
// ❌ Wrong: files in wrong location or wrong name
config/default.json
.env
.myapprc

// ✅ Correct: bunfig file patterns
app.config.ts        // Primary
.app.config.ts       // Alternative
config/app.config.ts // In subdirectory
```

## Advanced Migration Patterns

### Gradual Migration

Migrate piece by piece instead of all at once:

```ts
// Phase 1: Keep existing config, add bunfig for new features
const legacyConfig = require('config')
const newFeatures = await config({ name: 'features' })

const combinedConfig = {
  ...legacyConfig,
  features: newFeatures
}

// Phase 2: Migrate critical services
const database = await config({ name: 'database' })
const combinedConfig = {
  ...legacyConfig,
  database,
  features: newFeatures
}

// Phase 3: Complete migration
const appConfig = await config({ name: 'app' })
```

### Configuration Validation Migration

Add validation gradually:

```ts
// Phase 1: Basic loading without validation
const config = await loadConfig({ name: 'app' })

// Phase 2: Add basic validation
const config = await loadConfig({
  name: 'app',
  schema: {
    type: 'object',
    required: ['server', 'database']
  }
})

// Phase 3: Comprehensive validation
const config = await loadConfig({
  name: 'app',
  schema: detailedSchema,
  validate: customValidationFunction
})
```

### Environment Strategy Migration

Transition environment strategies:

```ts
// Before: Manual environment detection
const environment = process.env.NODE_ENV || 'development'
const configFile = `config/${environment}.json`

// During migration: Support both
const legacyConfig = require(configFile)
const bunfigConfig = await config({
  name: environment,
  cwd: './config'
})

// After migration: Pure bunfig
const appConfig = await config({
  name: process.env.NODE_ENV || 'development',
  cwd: './config'
})
```

## Migration Tools

### Automated Migration Script

```bash
#!/bin/bash
# migrate-to-bunfig.sh

echo "🔄 Migrating to bunfig..."

# Backup existing configuration
mkdir -p migration-backup
cp -r config migration-backup/ 2>/dev/null || true
cp .env* migration-backup/ 2>/dev/null || true

# Install bunfig
echo "📦 Installing bunfig..."
bun add bunfig

# Convert .env to config file
if [ -f .env ]; then
  echo "🔧 Converting .env to app.config.ts..."
  node migration-scripts/convert-env.js
fi

# Convert rc files
for file in .*rc; do
  if [ -f "$file" ]; then
    echo "🔧 Converting $file..."
    node migration-scripts/convert-rc.js "$file"
  fi
done

echo "✅ Migration complete! Check your new configuration files."
echo "🧪 Run tests to verify the migration."
```

### Environment Variable Converter

```js
// migration-scripts/convert-env.js
const fs = require('fs')

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8')
const envVars = envContent
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => {
    const [key, value] = line.split('=')
    return { key: key.trim(), value: value.trim() }
  })

// Convert to config structure
const config = {}
envVars.forEach(({ key, value }) => {
  // Convert PORT=3000 to { port: 3000 }
  const configKey = key.toLowerCase()
  const configValue = isNaN(value) ? value : parseInt(value)
  config[configKey] = configValue
})

// Generate TypeScript config file
const configContent = `export default ${JSON.stringify(config, null, 2)}`
fs.writeFileSync('app.config.ts', configContent)

console.log('✅ Converted .env to app.config.ts')
```

## Getting Help

- **[Quick Start Guide](./quick-start.md)** - Get started with bunfig
- **[Configuration Loading](./features/configuration-loading.md)** - Understand how bunfig loads configuration
- **[Environment Variables](./features/environment-variables.md)** - Learn about environment variable integration
- **[GitHub Issues](https://github.com/stacksjs/bunfig/issues)** - Report migration issues or get help

## Community Examples

Check out these real-world migration examples from the community:

- [Express.js app migration](https://github.com/stacksjs/bunfig/tree/main/examples/express-migration)
- [Next.js app migration](https://github.com/stacksjs/bunfig/tree/main/examples/nextjs-migration)
- [Microservices migration](https://github.com/stacksjs/bunfig/tree/main/examples/microservices-migration)

Have a migration story to share? [Contribute your example](https://github.com/stacksjs/bunfig/blob/main/CONTRIBUTING.md) to help others!