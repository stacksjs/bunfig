# Configuration Discovery

## Overview

Bunfig provides a powerful and flexible configuration discovery system that automatically locates and loads your configuration files.

## Supported Formats

### TypeScript (`.ts`)

```typescript
// my-app.config.ts
export default {
  port: 3000,
  host: 'localhost'
}
```

### JavaScript (`.js`, `.mjs`, `.cjs`)

```javascript
// my-app.config.js
module.exports = {
  port: 3000,
  host: 'localhost'
}
```

### JSON (`.json`)

```json
{
  "port": 3000,
  "host": "localhost"
}
```

## Naming Patterns

Bunfig searches for configuration files in the following patterns:

1. `name.config.*` (e.g., `app.config.ts`)
2. `.name.config.*` (e.g., `.app.config.ts`)
3. `name.*` (e.g., `app.ts`)
4. `.name.*` (e.g., `.app.ts`)

## Search Algorithm

1. **Base Directory**: Starts in the current working directory (`cwd`)
2. **File Resolution**:
   - Checks each naming pattern
   - Tries each supported extension
   - Returns first valid config found

## Custom Configuration

### Custom Directory

```typescript
const config = await loadConfig({
  name: 'app',
  cwd: './config'
})
```

### Custom File Name

```typescript
const config = await loadConfig({
  name: 'custom-name',
  cwd: './'
})
```

## Error Handling

- Gracefully handles missing files
- Provides clear error messages for invalid configurations
- Supports fallback to default values

## Best Practices

1. **Consistent Naming**

   ```typescript
   // Recommended
   my - app.config.ts

   // Instead of
   config.ts
   ```

2. **Type Safety**

   ```typescript
   // Define your config type
   interface AppConfig {
     port: number
     host: string
   }

   // Use it in loadConfig
   const config = await loadConfig<AppConfig>({
     name: 'my-app'
   })
   ```

3. **Directory Structure**

   ```
   my-project/
   ├── src/
   ├── config/
   │   └── my-app.config.ts
   └── package.json
   ```
