---
title: Getting Started with bunfig
description: Learn how to set up and use bunfig for TypeScript-first configuration management
---
    darkMode: boolean
    analytics: boolean
  }
}

const config = await loadConfig<AppConfig>({
  name: 'app',
})

console.log(`Server: ${config.server.host}:${config.server.port}`)
console.log(`Database: ${config.database.url}`)

```

### 3. Override with Environment Variables

Environment variables automatically override configuration values:

```bash

# Set environment variables

export APP_SERVER_PORT=8080
export APP_DATABASE_URL=postgresql://prod:5432/myapp

```

```typescript

const config = await loadConfig({ name: 'app' })

// config.server.port is now 8080 (from APP_SERVER_PORT)
// config.database.url is now "postgresql://prod:5432/myapp"

```

## Configuration File Formats

bunfig supports multiple file formats:

```

app.config.ts      # TypeScript (recommended)
app.config.js      # JavaScript
app.config.mjs     # ES Modules
app.config.cjs     # CommonJS
app.config.json    # JSON
.app.config.ts     # Hidden (dotfile) variant

```

### TypeScript Configuration

```typescript

// app.config.ts
import type { AppConfig } from './types'

const config: AppConfig = {
  server: {
    port: 3000,
    host: 'localhost',
  },
}

export default config

```

### JSON Configuration

```json

// app.config.json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  }
}

```

### Package.json Configuration

```json

// package.json
{
  "name": "my-app",
  "app": {
    "server": {
      "port": 3000,
      "host": "localhost"
    }
  }
}

```

## File Discovery Order

bunfig searches for configuration files in this order:

1. **Project directories** (precedence: `./` > `./config` > `./.config`)
   - `$name.config.{ts,js,mjs,cjs,json}`
   - `.$name.config.{ts,js,mjs,cjs,json}`
   - `$name.{ts,js,mjs,cjs,json}`
   - `.$name.{ts,js,mjs,cjs,json}`

2. **Home directory**
   - `~/.config/$name/config.{ts,js,mjs,cjs,json}`
   - `~/.config/$name/$name.config.{ts,js,mjs,cjs,json}`

3. **Package.json**
   - A section named after your config `name`

## Default Configuration

Provide defaults that are used when no config file is found:

```typescript

import { loadConfig } from 'bunfig'

const config = await loadConfig({
  name: 'app',
  defaultConfig: {
    server: {
      port: 3000,
      host: 'localhost',
    },
    debug: false,
  },
})

```

## Type Safety

bunfig is designed with TypeScript in mind:

```typescript

interface MyConfig {
  server: {
    port: number
    host: string
    ssl?: {
      enabled: boolean
      cert?: string
      key?: string
    }
  }
  database: {
    url: string
    pool: number
  }
}

const config = await loadConfig<MyConfig>({
  name: 'app',
  defaultConfig: {
    server: {
      port: 3000,
      host: 'localhost',
    },
    database: {
      url: 'postgresql://localhost:5432/myapp',
      pool: 10,
    },
  },
})

// Full type safety and autocompletion
console.log(config.server.port) // TypeScript knows this is a number

```

## Alternative Import

You can also use the `config` function as an alias:

```typescript

import { config } from 'bunfig'

const appConfig = await config({ name: 'app' })

```

## Browser Support

For browser environments, bunfig can load configuration from an API endpoint:

```typescript

import { loadConfig } from 'bunfig/browser'

const config = await loadConfig({
  name: 'app',
  endpoint: '/api/config',
  defaultConfig: {
    theme: 'light',
    language: 'en',
  },
  headers: {
    Authorization: 'Bearer token',
  },
})

```

## CLI Usage

bunfig also provides a CLI for generating types:

```bash

# Generate TypeScript types from config files

bunx bunfig generate --config-dir ./config --generated-dir ./src/generated

```

## Next Steps

- Learn about [Config Loading Patterns](/guide/loading)
- Understand [Type Safety](/guide/types)
- Configure [Environment Variables](/guide/env)
- Explore the [API Reference](/api)
