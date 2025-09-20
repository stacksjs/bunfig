# Aliases Support

bunfig provides powerful alias support that allows you to maintain backward compatibility when renaming configurations or provide fallback configuration names.

## Overview

Aliases are alternative configuration names that bunfig will check when the primary configuration name doesn't exist. This feature is particularly useful for:

- **Backward compatibility** when renaming tools or configurations
- **Multiple naming conventions** for the same configuration
- **Gradual migration** from old configuration names to new ones
- **Fallback configurations** for different environments

## Basic Usage

To use aliases, simply provide an `alias` property in your configuration options:

```ts
import { loadConfig } from 'bunfig'

const config = await loadConfig({
  name: 'my-new-tool',
  alias: 'my-old-tool', // Fallback name
  defaultConfig: {
    port: 3000,
    host: 'localhost',
  },
})
```

## Search Order

When you specify an alias, bunfig searches for configuration files in this order:

1. **Primary name files** (`my-new-tool.*`)
2. **Primary name with alias suffix** (`my-new-tool.my-old-tool.*`)
3. **Alias name files** (`my-old-tool.*`)

This applies to all search locations:
- Project directories (`./`, `./config`, `./.config`)
- Home directory (`~/.config/`)
- Package.json sections

### Example Search Pattern

With `name: 'tlsx'` and `alias: 'tls'`, bunfig will look for:

```
Project directories:
├── tlsx.config.ts        (primary name)
├── .tlsx.config.ts
├── tlsx.ts
├── .tlsx.ts
├── tlsx.tls.config.ts    (primary.alias pattern)
├── .tlsx.tls.config.ts
├── tls.config.ts         (alias name)
├── .tls.config.ts
├── tls.ts
└── .tls.ts

Home directory:
├── ~/.config/tlsx/config.ts
├── ~/.config/tlsx/tlsx.config.ts
├── ~/.config/tlsx/tls.config.ts    (alias in primary dir)
├── ~/.config/tls/config.ts         (alias directory)
├── ~/.config/tls/tls.config.ts
└── ~/.config/tls/tlsx.config.ts    (primary in alias dir)

Package.json:
├── "tlsx": { ... }       (primary section)
└── "tls": { ... }        (alias section)
```

## Real-World Examples

### Tool Renaming

When renaming a tool from `webpack-config` to `bundler`:

```ts
const config = await loadConfig({
  name: 'bundler',
  alias: 'webpack-config',
  defaultConfig: {
    entry: './src/index.ts',
    output: './dist',
  },
})
```

This allows users to gradually migrate from `webpack-config.js` to `bundler.config.js` without breaking existing setups.

### Framework Migration

When migrating from one framework to another:

```ts
const config = await loadConfig({
  name: 'vite-config',
  alias: 'webpack-config',
  defaultConfig: {
    build: {
      target: 'es2020',
      minify: true,
    },
  },
})
```

### Environment-Specific Fallbacks

Using aliases for environment-specific configurations:

```ts
const config = await loadConfig({
  name: process.env.NODE_ENV === 'production' ? 'prod-config' : 'dev-config',
  alias: 'base-config', // Fallback to base configuration
  defaultConfig: {
    apiUrl: 'http://localhost:3000',
    debug: false,
  },
})
```

## Multiple Aliases

While bunfig currently supports a single alias, you can implement multiple fallbacks using a wrapper function:

```ts
async function loadConfigWithMultipleAliases<T>(
  name: string,
  aliases: string[],
  defaultConfig: T
) {
  for (const alias of [undefined, ...aliases]) {
    try {
      return await loadConfig({
        name,
        alias,
        defaultConfig,
      })
    } catch (error) {
      // Continue to next alias
      if (alias === aliases[aliases.length - 1]) {
        throw error // Rethrow if last alias also fails
      }
    }
  }
}

// Usage
const config = await loadConfigWithMultipleAliases(
  'new-tool',
  ['legacy-tool', 'old-tool', 'deprecated-tool'],
  { port: 3000 }
)
```

## Package.json Aliases

Aliases also work with package.json sections:

```json
{
  "name": "my-project",
  "new-tool": {
    "port": 4000,
    "host": "0.0.0.0"
  },
  "old-tool": {
    "port": 3000,
    "host": "localhost"
  }
}
```

```ts
const config = await loadConfig({
  name: 'new-tool',
  alias: 'old-tool',
  defaultConfig: { port: 8080 },
})
// Will use "new-tool" section if present, otherwise "old-tool"
```

## Home Directory Aliases

Aliases work seamlessly with home directory configurations:

```bash
# Primary configuration
~/.config/new-tool/config.ts

# Alias configuration (fallback)
~/.config/old-tool/config.ts
```

Both directories are checked, with the primary name taking precedence.

## Best Practices

### 1. Use Descriptive Aliases

Choose aliases that clearly indicate their purpose:

```ts
// Good
{
  name: 'bundler-v2',
  alias: 'bundler-v1'
}

// Better
{
  name: 'esbuild-config',
  alias: 'webpack-config'
}
```

### 2. Document Migration Paths

When using aliases for migration, document the transition:

```ts
/**
 * Configuration loader with backward compatibility.
 *
 * Migration path: 'legacy-config' → 'modern-config'
 * Support for 'legacy-config' will be removed in v3.0
 */
const config = await loadConfig({
  name: 'modern-config',
  alias: 'legacy-config',
  defaultConfig: { /* ... */ },
})
```

### 3. Version-Aware Aliases

Consider version-specific aliases:

```ts
const config = await loadConfig({
  name: `my-tool-v${MAJOR_VERSION}`,
  alias: `my-tool-v${MAJOR_VERSION - 1}`,
  defaultConfig: { /* ... */ },
})
```

### 4. Gradual Deprecation

Use aliases to gradually deprecate old configuration names:

```ts
// Phase 1: Introduce new name with alias support
const config = await loadConfig({
  name: 'new-name',
  alias: 'old-name',
  defaultConfig: { /* ... */ },
})

// Phase 2: Warn about deprecated usage
const config = await loadConfig({
  name: 'new-name',
  alias: 'old-name',
  defaultConfig: { /* ... */ },
})
// Add deprecation warning if old-name config is found

// Phase 3: Remove alias support
const config = await loadConfig({
  name: 'new-name',
  // alias removed
  defaultConfig: { /* ... */ },
})
```

## Troubleshooting

### Configuration Not Found

If neither the primary name nor alias resolves to a configuration:

1. Check that both configuration names are spelled correctly
2. Verify file permissions in all search directories
3. Ensure configuration files are properly formatted
4. Use debug logging to see which files are being checked

### Unexpected Configuration

If the wrong configuration is being loaded:

1. Remember that primary name takes precedence over alias
2. Check all search locations for conflicting configurations
3. Verify the search order matches your expectations
4. Use verbose logging to trace the resolution process

### Alias Conflicts

When multiple aliases might conflict:

1. Use unique, descriptive names
2. Avoid circular alias references
3. Consider namespace prefixes for related configurations
4. Document your alias strategy clearly

## Related Features

- [Configuration Loading](./configuration-loading.md) - Complete configuration resolution process
- [Home Directory Support](./home-directory.md) - Global configuration management
- [Multiple Formats](./multiple-formats.md) - Supported configuration file formats