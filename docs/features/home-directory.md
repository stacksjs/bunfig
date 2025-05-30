# Home Directory Configuration

bunfig supports loading configuration files from your home directory, following the XDG Base Directory specification. This feature allows you to create global configuration settings that apply across all your projects using the same configuration name.

## Overview

Home directory configuration files are stored in `~/.config/$name/` and provide a way to:

- Set global defaults that apply to all projects using a specific configuration name
- Store personal preferences that you want to use across different environments
- Provide fallback configuration when no local project configuration exists
- Maintain consistent settings across multiple projects

## File Location

Configuration files are loaded from:

```
~/.config/$name/config.{ts,js,mjs,cjs,json}
~/.config/$name/$name.config.{ts,js,mjs,cjs,json}
```

For example, with a configuration name of "my-app", bunfig will look for:

- `~/.config/my-app/config.ts`
- `~/.config/my-app/config.js`
- `~/.config/my-app/config.json`
- `~/.config/my-app/my-app.config.ts`
- `~/.config/my-app/my-app.config.js`
- `~/.config/my-app/my-app.config.json`

## Priority Order

Home directory configuration has a specific place in bunfig's resolution priority:

1. **Local project files** (highest priority)
2. **Home directory files**
3. **Package.json sections**
4. **Environment variables**
5. **Default configuration** (lowest priority)

This means local project configurations will always override home directory settings, allowing for project-specific customization while maintaining global defaults.

## Usage Examples

### Basic Home Configuration

Create a global configuration file:

```ts
// ~/.config/my-tool/config.ts
export default {
  theme: 'dark',
  defaultPort: 8080,
  globalFeatures: ['feature1', 'feature2'],
  userPreferences: {
    notifications: true,
    autoSave: true,
  },
}
```

This configuration will be used by all projects that use the "my-tool" configuration name, unless overridden locally.

### Project-Specific Override

Create a local configuration to override global settings:

```ts
// ./my-tool.config.ts (in your project directory)
export default {
  defaultPort: 3000, // Override global setting
  userPreferences: {
    autoSave: false, // Override global preference
  },
  projectSpecific: true, // Add project-specific setting
}
```

The final merged configuration will be:

```ts
{
  theme: 'dark',           // From home config
  defaultPort: 3000,       // From local config (overridden)
  globalFeatures: ['feature1', 'feature2'], // From home config
  userPreferences: {
    notifications: true,   // From home config
    autoSave: false,      // From local config (overridden)
  },
  projectSpecific: true,  // From local config (added)
}
```

### Tool-Specific Configuration

For development tools, you can create personalized global settings:

```ts
// ~/.config/bundler/config.ts
export default {
  outputDir: 'dist',
  minify: true,
  sourceMaps: true,
  target: 'es2020',
  personalDefaults: {
    watchMode: true,
    openBrowser: false,
  },
}
```

### With Aliases

Home directory configuration also works with aliases:

```ts
const config = await loadConfig({
  name: 'new-tool',
  alias: 'old-tool',
  defaultConfig: { /* ... */ },
})
```

This will check for:

1. `~/.config/new-tool/config.*`
2. `~/.config/new-tool/new-tool.config.*`
3. `~/.config/new-tool/old-tool.config.*` (alias pattern)
4. `~/.config/old-tool/config.*` (alias directory)
5. `~/.config/old-tool/old-tool.config.*`

## Best Practices

### 1. Use for Global Preferences

Store user preferences that should apply across all projects:

```ts
// ~/.config/my-cli/config.ts
export default {
  outputFormat: 'json',
  verboseLogging: false,
  colorOutput: true,
  editor: 'vscode',
}
```

### 2. Provide Sensible Defaults

Use home configuration to provide better defaults than hardcoded ones:

```ts
// ~/.config/dev-server/config.ts
export default {
  port: 4000, // Your preferred default port
  host: '0.0.0.0', // Allow external connections
  https: false, // Your security preference
}
```

### 3. Organize by Tool Category

Structure your home configuration logically:

```
~/.config/
├── bundlers/
│   └── config.ts      # Settings for all bundler tools
├── linters/
│   └── config.ts      # Settings for all linter tools
└── my-specific-tool/
    └── config.ts      # Tool-specific settings
```

### 4. Use Environment-Specific Sections

You can organize settings by environment within the same file:

```ts
// ~/.config/my-app/config.ts
export default {
  common: {
    theme: 'dark',
    notifications: true,
  },
  development: {
    debugMode: true,
    logLevel: 'verbose',
  },
  production: {
    debugMode: false,
    logLevel: 'error',
  },
}
```

## Security Considerations

- Home directory configuration files are only accessible to your user account
- Avoid storing sensitive information like API keys in configuration files
- Use environment variables for secrets instead of configuration files
- Be cautious with executable configuration files (`.ts`, `.js`) as they can run arbitrary code

## Troubleshooting

### Configuration Not Loading

1. Check file permissions: `ls -la ~/.config/my-app/`
2. Verify file syntax: Try loading the file directly in Node.js
3. Enable verbose logging to see which files are being checked
4. Ensure the configuration name matches exactly (case-sensitive)

### Unexpected Values

1. Check priority order - local files override home files
2. Use verbose logging to see which configuration source is being used
3. Verify the configuration is properly exported (use `export default`)

### Path Issues

1. Verify the home directory path: `echo $HOME`
2. Check if `.config` directory exists: `ls -la ~/.config/`
3. Ensure proper directory structure: `~/.config/$name/config.*`

## Related Features

- [Configuration Loading](./configuration-loading.md) - Full configuration resolution process
- [Environment Variables](./environment-variables.md) - Using environment variables with configuration
- [Type Safety](./type-safety.md) - TypeScript support for configuration files
