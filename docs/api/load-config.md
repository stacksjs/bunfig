# loadConfig

The main configuration loading function in Bunfig.

## Signature

```ts
function loadConfig<T>(options: Config<T>): Promise<T>
```

## Parameters

### options: Config`<T>`

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | `string` | No | - | Name of the configuration file |
| `cwd` | `string` | No | `process.cwd()` | Working directory for config lookup |
| `defaultConfig` | `T` | Yes | - | Default configuration values |
| `configDir` | `string` | No | `'./config'` | Directory for configuration files |
| `generatedDir` | `string` | No | `'./src/generated'` | Directory for generated files |
| `endpoint` | `string` | No | - | API endpoint for browser environments |
| `headers` | `Record<string, string>` | No | - | Headers for API requests |

## Returns

Returns a `Promise` that resolves to the merged configuration object of type `T`.

## Examples

### Basic Usage

```typescript
import { loadConfig } from 'bunfig'

interface ServerConfig {
  port: number
  host: string
  ssl: {
    enabled: boolean
    cert?: string
  }
}

const config = await loadConfig<ServerConfig>({
  name: 'server',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    ssl: {
      enabled: false
    }
  }
})
```

### Custom Directory

```typescript
const config = await loadConfig({
  name: 'app',
  cwd: './config',
  defaultConfig: {
    port: 3000,
    host: 'localhost'
  }
})
```

### With Type Generation

```typescript
// Then use with type checking
import type { AppConfig } from './generated/config-types'
import { generateConfigTypes, loadConfig } from 'bunfig'

// Generate types first
generateConfigTypes({
  configDir: './config',
  generatedDir: './src/generated'
})

const config = await loadConfig<AppConfig>({
  name: 'app',
  defaultConfig: {
    port: 3000,
    host: 'localhost'
  }
})
```

### Environment-Specific Configuration

```typescript
interface EnvConfig {
  development: {
    debug: boolean
    port: number
  }
  production: {
    debug: boolean
    port: number
  }
}

const config = await loadConfig<EnvConfig>({
  name: 'app',
  defaultConfig: {
    development: {
      debug: true,
      port: 3000
    },
    production: {
      debug: false,
      port: 80
    }
  }
})
```

## Error Handling

The function throws errors in these cases:

1. **Invalid Configuration**

   ```typescript
   try {
     const config = await loadConfig({
       name: 'app',
       defaultConfig: {
         port: 3000
       }
     })
   }
   catch (error) {
     if (error instanceof ConfigValidationError) {
       console.error('Invalid configuration:', error.message)
     }
   }
   ```

2. **File Not Found**

   ```typescript
   try {
     const config = await loadConfig({
       name: 'missing-config',
       defaultConfig: {}
     })
   }
   catch (error) {
     if (error instanceof ConfigFileNotFoundError) {
       console.error('Config file not found:', error.message)
     }
   }
   ```

## Best Practices

1. **Always Use Type Parameters**

   ```typescript
   // Good
   const config = await loadConfig<AppConfig>({
     name: 'app',
     defaultConfig: {
       port: 3000
     }
   })

   // Avoid
   const config = await loadConfig({
     name: 'app',
     defaultConfig: {
       port: 3000
     }
   })
   ```

2. **Provide Default Values**

   ```typescript
   const config = await loadConfig<AppConfig>({
     name: 'app',
     defaultConfig: {
       // Always provide sensible defaults
       timeout: 5000,
       retries: 3
     }
   })
   ```

3. **Use with Environment Variables**

   ```typescript
   const config = await loadConfig<AppConfig>({
     name: 'app',
     defaultConfig: {
       port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000
     }
   })
   ```
