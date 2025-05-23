# Type Safety

bunfig provides comprehensive TypeScript support to ensure your configuration is type-safe at every level.

## Type Generation

bunfig can automatically generate TypeScript types for your configuration files:

```ts
import { generateConfigTypes } from 'bunfig'

generateConfigTypes({
  configDir: './config', // directory containing your config files
  generatedDir: './types', // output directory for generated types
})
```

This generates a type definition file containing all available configuration names based on the files in your config directory.

## Generic Type Support

All core functions in bunfig support generic types:

```ts
interface MyConfig {
  server: {
    port: number
    host: string
  }
  features: {
    auth: boolean
    api: boolean
  }
}

// Type-safe configuration loading
const config = await config<MyConfig>({
  name: 'my-app',
  defaultConfig: {
    server: {
      port: 3000,
      host: 'localhost',
    },
    features: {
      auth: false,
      api: true,
    },
  },
})

// TypeScript will ensure:
config.server.port // type: number
config.features.auth // type: boolean
```

## Configuration Interface

The `Config<T>` interface ensures type safety when defining configuration options:

```ts
interface Config<T> {
  name: string
  cwd?: string
  defaultConfig: T
}

// TypeScript will catch errors like:
const config: Config<MyConfig> = {
  name: 'my-app',
  defaultConfig: {
    // TypeScript error if properties don't match MyConfig
    server: {
      port: '3000', // Error: Type 'string' is not assignable to type 'number'
    },
  },
}
```

## Configuration Names Type

When using type generation, you get a union type of all available configuration names:

```ts
// Generated type based on your config files
type ConfigNames = 'app' | 'database' | 'auth'

// TypeScript will catch invalid config names
const config = await config<MyConfig>('invalid-name') // Error: Argument of type '"invalid-name"' is not assignable to parameter of type ConfigNames
```

## Best Practices

1. Always define interfaces for your configuration:

   ```ts
   interface MyConfig {
     // Define your config structure
   }
   ```

2. Use type generation for configuration names:

   ```ts
   generateConfigTypes({
     configDir: './config',
     generatedDir: './types',
   })
   ```

3. Leverage TypeScript's type checking:

   ```ts
   const config = await config<MyConfig>({
     name: 'my-app',
     defaultConfig: {
       // TypeScript will ensure this matches MyConfig
     },
   })
   ```

4. Use TypeScript configuration files:

   ```ts
   // my-app.config.ts
   import type { MyConfig } from './types'

   const config: MyConfig = {
     // TypeScript checks this matches MyConfig
   }

   export default config
   ```
