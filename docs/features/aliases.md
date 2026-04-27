# Aliases Support

bunfig provides powerful alias support that allows you to maintain backward compatibility when renaming configurations or provide fallback configuration names.

## Overview

Aliases are alternative configuration names that bunfig will check when the primary configuration name doesn't exist. This feature is particularly useful for:

- **Backward compatibility** when renaming tools or configurations
- **Multiple naming conventions** for the same configuration
- **Gradual migration** from old configuration names to new ones
- **Fallback configurations** for different environments

## Basic Usage

To use aliases, simply provide an `alias` property in your configuration options. `alias` accepts either a single string or an array of strings — pass an array to probe several names in one call:

```ts
import { loadConfig } from 'bunfig'

// Single alias
const config = await loadConfig({
  name: 'my-new-tool',
  alias: 'my-old-tool', // Fallback name
  defaultConfig: {
    port: 3000,
    host: 'localhost',
  },
})

// Multiple aliases — tried in array order, first match wins
const config2 = await loadConfig({
  name: 'pickier',
  alias: ['code-style', 'lint'],
  defaultConfig: { /* ... */ },
})
```

When `alias` is an array, bunfig walks each entry in declared order and uses the first match. The primary `name` is always tried first, before any alias.

## Search Order

When you specify an alias, bunfig searches for configuration files in this order:

1. **Primary name files** (`my-new-tool.*`)
2. **Primary name with alias suffix** (`my-new-tool.my-old-tool.*`)
3. **Alias name files** (`my-old-tool.*`)

When `alias` is an array, each entry contributes the same pattern set, walked in the order you declared. With `alias: ['a', 'b']`:

1. Primary name (`my-tool.*`)
2. Combined patterns for the first alias (`my-tool.a.*`)
3. First alias on its own (`a.*`)
4. Combined patterns for the second alias (`my-tool.b.*`)
5. Second alias on its own (`b.*`)

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

Pass an array to `alias` to probe several fallback names in one call. Bunfig walks the array in order and returns the first match, with the primary `name` always taking priority over any alias:

```ts
const config = await loadConfig({
  name: 'new-tool',
  alias: ['legacy-tool', 'old-tool', 'deprecated-tool'],
  defaultConfig: { port: 3000 },
})
```

Resolution order for the example above:

1. `new-tool` (primary, all locations)
2. `legacy-tool` (first alias, all locations)
3. `old-tool` (second alias, all locations)
4. `deprecated-tool` (third alias, all locations)
5. `package.json` fields, tried in the same priority order
6. Defaults

This is the recommended way to support several fallback names — it's a single resolution pass with consistent priority semantics, rather than a loop of independent `loadConfig` calls.

### Real-world example

The [pickier](https://github.com/stacksjs/pickier) linter uses this to honor both its branded alias and a project convention:

```ts
await loadConfig({
  name: 'pickier',
  alias: ['code-style', 'lint'],
  defaultConfig,
})
```

This resolves any of `pickier.config.ts`, `code-style.config.ts`, `config/lint.ts`, etc. — whichever the project author prefers.

## Package.json Aliases

Aliases also work with package.json sections, including array form:

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
  },
  "legacy-tool": {
    "port": 2000,
    "host": "127.0.0.1"
  }
}
```

```ts
// Single alias — primary name first, then alias
const a = await loadConfig({
  name: 'new-tool',
  alias: 'old-tool',
  defaultConfig: { port: 8080 },
})

// Array — primary name, then each alias in order, first hit wins
const b = await loadConfig({
  name: 'new-tool',
  alias: ['old-tool', 'legacy-tool'],
  defaultConfig: { port: 8080 },
})
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
const config1 = {
  name: 'bundler-v2',
  alias: 'bundler-v1'
}

// Better
const config2 = {
  name: 'esbuild-config',
  alias: 'webpack-config'
}
```

### 2. Document Migration Paths

When using aliases for migration, document the transition:

```ts
/**

 _ Configuration loader with backward compatibility.

 _

 _ Migration path: 'legacy-config' → 'modern-config'
 _ Support for 'legacy-config' will be removed in v3.0

 _/
const config = await loadConfig({
  name: 'modern-config',
  alias: 'legacy-config',
  defaultConfig: { /_ ... _/ },
})
```

### 3. Version-Aware Aliases

Consider version-specific aliases. With the array form you can keep several previous majors readable in one place:

```ts
const config = await loadConfig({
  name: `my-tool-v${MAJOR_VERSION}`,
  alias: [
    `my-tool-v${MAJOR_VERSION - 1}`,
    `my-tool-v${MAJOR_VERSION - 2}`,
  ],
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
  defaultConfig: { /_ ... _/ },
})

// Phase 2: Warn about deprecated usage
const config = await loadConfig({
  name: 'new-name',
  alias: 'old-name',
  defaultConfig: { /_ ... _/ },
})
// Add deprecation warning if old-name config is found

// Phase 3: Remove alias support
const config = await loadConfig({
  name: 'new-name',
  // alias removed
  defaultConfig: { /_ ... */ },
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
