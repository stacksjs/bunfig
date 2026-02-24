# bunfig

A smart and fully-typed configuration loader for Bun.

## Installation

```bash
bun add bunfig
```

```bash
npm install bunfig
```

## Usage

```typescript
import type { Config } from 'bunfig'
import { loadConfig } from 'bunfig'

interface AppConfig {
  port: number
  host: string
  debug: boolean
}

const config = await loadConfig<AppConfig>({
  name: 'my-app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    debug: false,
  },
})

console.log(config.port) // 3000
```

Create a `my-app.config.ts` file in your project root:

```typescript
export default {
  port: 8080,
  host: '0.0.0.0',
  debug: true,
}
```

## Features

- **Zero Configuration Setup** - Works out of the box with intelligent defaults
- **Environment Variable Detection** - Automatically detects and merges env vars with smart naming conventions
- **TypeScript First** - Full TypeScript support with type inference and autocompletion
- **Smart File Discovery** - Finds config files in project root, home directory, or package.json
- **JSON Schema Validation** - Validate configurations with detailed error reporting
- **Zero Dependencies** - Lightweight with intelligent caching
- **XDG Standards Compliant** - Global configs via `~/.config/$name/` following XDG standards
- **Hot Reload Ready** - Watch for config changes and reload automatically
- **Browser Support** - Works in both server and browser environments
- **CLI** - Built-in CLI for managing configurations

## License

MIT
