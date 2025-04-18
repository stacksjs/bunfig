# Configuration Merging

## Overview

Bunfig provides sophisticated configuration merging capabilities that allow you to combine multiple configuration sources while maintaining type safety.

## Deep Merging

### Basic Example

```typescript
// default config
const defaults = {
  server: {
    port: 3000,
    host: 'localhost',
    ssl: {
      enabled: false
    }
  }
}

// config file (my-app.config.ts)
export default {
  server: {
    port: 8080,
    ssl: {
      enabled: true,
      cert: 'path/to/cert'
    }
  }
}

// Result after merging
export default {
  server: {
    port: 8080, // from config file
    host: 'localhost', // from defaults
    ssl: {
      enabled: true, // from config file
      cert: 'path/to/cert' // from config file
    }
  }
}
```

## Merging Rules

### Objects

- Recursively merges nested objects
- Preserves object references when possible
- Handles circular references

### Arrays

```typescript
// Default config
const defaults = {
  plugins: ['core'],
  middleware: ['auth']
}

// Config file
export default {
  plugins: ['custom'],
  middleware: ['cors', 'auth']
}

// Result
export default {
  plugins: ['custom'], // Replaced (default behavior)
  middleware: ['cors', 'auth'] // Replaced
}
```

### Primitive Values

- Later values override earlier ones
- `undefined` values are ignored
- `null` values are preserved

## Priority Order

1. Config file values (highest priority)
2. Default configuration
3. Environment variables (planned)
4. Built-in defaults (lowest priority)

## Type Safety

### Merge Type Definition

```typescript
type DeepMerge<T, S> = {
  [P in keyof (T & S)]: P extends keyof T
    ? P extends keyof S
      ? DeepMergeable<T[P], S[P]>
      : T[P]
    : P extends keyof S
      ? S[P]
      : never
}
```

### Usage with Types

```typescript
interface DatabaseConfig {
  host: string
  port: number
  credentials?: {
    username: string
    password: string
  }
}

const config = await loadConfig<DatabaseConfig>({
  name: 'database',
  defaultConfig: {
    host: 'localhost',
    port: 5432
  }
})
```

## Advanced Features

### Conditional Merging

```typescript
const config = await loadConfig({
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

### Custom Merge Strategies (Planned)

```typescript
const config = await loadConfig({
  name: 'app',
  mergeStrategy: {
    arrays: 'concat', // concatenate arrays instead of replacing
    objects: 'deep', // deep merge objects
    primitives: 'override' // override primitives
  }
})
```

## Best Practices

1. **Keep Configurations Flat**

   ```typescript
   // Good
   const config = {
     dbHost: 'localhost',
     dbPort: 5432,
     dbUser: 'admin'
   }

   // Avoid Deep Nesting
   const config = {
     database: {
       connection: {
         credentials: {
           user: 'admin'
         }
       }
     }
   }
   ```

2. **Use Type Definitions**

   ```typescript
   interface Config {
     server: {
       port: number
       host: string
     }
     database: {
       url: string
     }
   }
   ```

3. **Default Values**

   ```typescript
   const config = await loadConfig<Config>({
     name: 'app',
     defaultConfig: {
       server: {
         port: 3000,
         host: 'localhost'
       },
       database: {
         url: 'postgres://localhost:5432'
       }
     }
   })
   ```
