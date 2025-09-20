# CLI Usage

bunfig provides a powerful command-line interface for managing configurations, generating types, and performing configuration-related tasks.

## Installation

Install bunfig globally to use the CLI:

```bash
# Using Bun
bun install -g bunfig

# Using npm
npm install -g bunfig

# Using yarn
yarn global add bunfig

# Using pnpm
pnpm install -g bunfig
```

Or run directly with `bunx`:

```bash
bunx bunfig --help
```

## Available Commands

### Global Options

```bash
bunfig [command] [options]

Options:
  -h, --help         Show help
  -v, --version      Show version
  --config-dir       Configuration directory (default: ./config)
  --verbose          Enable verbose logging
  --silent           Suppress output
```

## Commands

### `generate`

Generate TypeScript type definitions for your configuration files.

```bash
bunfig generate [options]

Options:
  --config-dir <dir>     Configuration directory (default: ./config)
  --output-dir <dir>     Output directory for generated types (default: ./src/generated)
  --format <format>      Output format: typescript|json (default: typescript)
  --watch               Watch for changes and regenerate
  --clean               Clean output directory before generating

Examples:
  bunfig generate
  bunfig generate --config-dir ./settings --output-dir ./types
  bunfig generate --watch
  bunfig generate --format json
```

#### Generated Output

The generate command creates type-safe interfaces based on your configuration files:

```ts
// src/generated/config-types.ts
export type ConfigNames = 'app' | 'database' | 'auth'

export interface ConfigByName {
  'app': AppConfig
  'database': DatabaseConfig
  'auth': AuthConfig
}

export interface AppConfig {
  port: number
  host: string
  features: string[]
}

export interface DatabaseConfig {
  url: string
  pool: number
  ssl: boolean
}

export interface AuthConfig {
  secret: string
  tokenExpiry: number
  providers: string[]
}

export type ConfigOf<T extends ConfigNames> = ConfigByName[T]
```

### `validate`

Validate configuration files for syntax and type errors.

```bash
bunfig validate [config-name] [options]

Options:
  --config-dir <dir>     Configuration directory (default: ./config)
  --schema <file>        JSON schema file for validation
  --strict              Enable strict validation mode
  --format <format>     Output format: text|json (default: text)

Examples:
  bunfig validate                    # Validate all configs
  bunfig validate app                # Validate specific config
  bunfig validate --schema ./schema.json
  bunfig validate --strict --format json
```

#### Validation Output

```bash
✅ app.config.ts - Valid
✅ database.config.ts - Valid
❌ auth.config.ts - Error: Missing required field 'secret'
❌ logging.config.ts - Error: Invalid type for 'level' (expected string, got number)

Summary: 2 valid, 2 errors
```

### `info`

Display information about configuration files and resolution order.

```bash
bunfig info [config-name] [options]

Options:
  --config-dir <dir>     Configuration directory (default: ./config)
  --show-content        Show configuration file contents
  --show-types          Show type information
  --format <format>     Output format: text|json|yaml (default: text)

Examples:
  bunfig info                        # Show info for all configs
  bunfig info app                    # Show info for specific config
  bunfig info --show-content
  bunfig info --show-types --format json
```

#### Info Output

```bash
Configuration: app
├── Name: app
├── Files Found:
│   ├── ./config/app.config.ts (primary)
│   ├── ~/.config/my-app/config.ts (home)
│   └── package.json:app (package)
├── Resolution Order:
│   1. ./config/app.config.ts
│   2. ~/.config/my-app/config.ts
│   3. Environment variables (MY_APP_*)
│   4. Default configuration
├── Type: AppConfig
└── Fields: port, host, features, database
```

### `doctor`

Diagnose configuration issues and provide recommendations.

```bash
bunfig doctor [options]

Options:
  --config-dir <dir>     Configuration directory (default: ./config)
  --fix                 Attempt to fix issues automatically
  --report <file>       Generate detailed report file

Examples:
  bunfig doctor
  bunfig doctor --fix
  bunfig doctor --report ./bunfig-report.json
```

#### Doctor Output

```bash
🔍 Diagnosing bunfig configuration...

Issues Found:
❌ Duplicate configuration files
   - app.config.ts and app.ts both exist
   - Recommendation: Remove app.ts to avoid conflicts

⚠️  Missing type annotations
   - database.config.ts lacks explicit types
   - Recommendation: Add interface definitions

⚠️  Inconsistent naming
   - Found both camelCase and kebab-case config names
   - Recommendation: Use consistent naming convention

✅ All other checks passed

Run with --fix to automatically resolve fixable issues.
```

### `init`

Initialize a new bunfig configuration setup.

```bash
bunfig init [options]

Options:
  --config-dir <dir>     Configuration directory (default: ./config)
  --template <name>      Template to use: basic|advanced|monorepo
  --typescript          Generate TypeScript configuration files
  --examples             Include example configurations

Examples:
  bunfig init
  bunfig init --template advanced
  bunfig init --config-dir ./settings --typescript
  bunfig init --examples
```

#### Init Templates

**Basic Template:**
```
config/
├── app.config.ts
└── database.config.ts
```

**Advanced Template:**
```
config/
├── app.config.ts
├── database.config.ts
├── auth.config.ts
├── logging.config.ts
├── features/
│   ├── payments.config.ts
│   └── notifications.config.ts
└── environments/
    ├── development.config.ts
    ├── production.config.ts
    └── test.config.ts
```

### `list`

List all discovered configuration files.

```bash
bunfig list [options]

Options:
  --config-dir <dir>     Configuration directory (default: ./config)
  --format <format>     Output format: text|json|yaml (default: text)
  --show-path           Show full file paths
  --show-types          Show type information

Examples:
  bunfig list
  bunfig list --show-path --format json
  bunfig list --show-types
```

#### List Output

```bash
Configuration Files:
├── app (./config/app.config.ts)
├── database (./config/database.config.ts)
├── auth (./config/auth.config.ts)
├── logging (./config/logging.config.ts)
├── payments (./config/features/payments.config.ts)
└── notifications (./config/features/notifications.config.ts)

Total: 6 configurations
```

### `merge`

Show the merged configuration for debugging purposes.

```bash
bunfig merge <config-name> [options]

Options:
  --config-dir <dir>     Configuration directory (default: ./config)
  --format <format>     Output format: json|yaml|javascript (default: json)
  --show-sources        Show which source each value came from
  --env <environment>   Environment variables to include

Examples:
  bunfig merge app
  bunfig merge app --show-sources
  bunfig merge database --format yaml
  bunfig merge app --env production
```

#### Merge Output

```json
{
  "port": 3000,
  "host": "localhost",
  "database": {
    "url": "postgresql://localhost:5432/myapp",
    "pool": 10
  },
  "features": ["auth", "logging"]
}
```

With `--show-sources`:

```json
{
  "port": {
    "value": 3000,
    "source": "./config/app.config.ts"
  },
  "host": {
    "value": "localhost",
    "source": "environment:MY_APP_HOST"
  },
  "database": {
    "url": {
      "value": "postgresql://localhost:5432/myapp",
      "source": "./config/app.config.ts"
    },
    "pool": {
      "value": 10,
      "source": "default"
    }
  }
}
```

## Configuration File

Create a `.bunfigrc.json` file in your project root to configure CLI defaults:

```json
{
  "configDir": "./config",
  "outputDir": "./src/generated",
  "format": "typescript",
  "verbose": false,
  "watch": false,
  "extensions": [".ts", ".js", ".mjs", ".cjs", ".json"],
  "exclude": ["**/*.test.*", "**/*.spec.*"]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configDir` | `string` | `"./config"` | Configuration directory |
| `outputDir` | `string` | `"./src/generated"` | Output directory for generated files |
| `format` | `string` | `"typescript"` | Default output format |
| `verbose` | `boolean` | `false` | Enable verbose logging |
| `watch` | `boolean` | `false` | Watch for changes |
| `extensions` | `string[]` | `[".ts", ".js", ...]` | File extensions to process |
| `exclude` | `string[]` | `["**/*.test.*", ...]` | Patterns to exclude |

## Environment Variables

Configure bunfig CLI behavior with environment variables:

```bash
# Configuration directory
export BUNFIG_CONFIG_DIR=./settings

# Output directory for generated files
export BUNFIG_OUTPUT_DIR=./types

# Default format
export BUNFIG_FORMAT=typescript

# Enable verbose logging
export BUNFIG_VERBOSE=true

# Enable debug mode
export BUNFIG_DEBUG=true
```

## Scripting and Automation

### Package.json Scripts

Add bunfig commands to your package.json:

```json
{
  "scripts": {
    "config:generate": "bunfig generate",
    "config:validate": "bunfig validate",
    "config:watch": "bunfig generate --watch",
    "config:doctor": "bunfig doctor",
    "config:info": "bunfig info --show-types"
  }
}
```

### CI/CD Integration

Use bunfig in continuous integration:

```yaml
# .github/workflows/config-validation.yml
name: Validate Configurations

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx bunfig validate --strict
      - run: bunx bunfig doctor
```

### Git Hooks

Validate configurations before commits:

```bash
# .git/hooks/pre-commit
#!/bin/sh
bunx bunfig validate --strict
if [ $? -ne 0 ]; then
  echo "Configuration validation failed. Please fix the errors before committing."
  exit 1
fi
```

## Advanced Usage

### Custom Templates

Create custom init templates:

```bash
# Create template directory
mkdir -p ~/.bunfig/templates/my-template

# Add template files
cat > ~/.bunfig/templates/my-template/app.config.ts << 'EOF'
export default {
  name: '{{PROJECT_NAME}}',
  version: '{{VERSION}}',
  port: 3000,
}
EOF

# Use custom template
bunfig init --template my-template
```

### Plugin Development

Extend bunfig CLI with custom commands:

```ts
// bunfig-plugin-custom.ts
import { Command } from 'bunfig/cli'

export const customCommand: Command = {
  name: 'custom',
  description: 'Custom command',
  action: async (options) => {
    console.log('Running custom command with options:', options)
  },
}
```

### Programmatic Usage

Use bunfig CLI programmatically:

```ts
import { cli } from 'bunfig/cli'

// Run CLI command programmatically
await cli.run(['generate', '--config-dir', './config'])

// Use individual commands
import { generateCommand } from 'bunfig/cli/commands'

await generateCommand.action({
  configDir: './config',
  outputDir: './types',
  format: 'typescript',
})
```

## Troubleshooting

### Common Issues

1. **Command not found**: Ensure bunfig is installed globally or use `bunx`
2. **Permission errors**: Check file permissions and directory access
3. **Type generation fails**: Verify configuration file syntax and exports
4. **Watch mode not working**: Check file system events and permissions

### Debug Mode

Enable debug mode for detailed logging:

```bash
BUNFIG_DEBUG=true bunfig generate --verbose
```

### Log Files

CLI operations are logged to:

```bash
# Default log location
~/.bunfig/logs/bunfig.log

# Custom log location
BUNFIG_LOG_FILE=./bunfig.log bunfig generate
```

## Related Features

- [Build Plugin](./build-plugin.md) - Bundler integration
- [TypeScript Plugin](./typescript-plugin.md) - Editor integration
- [Type Safety](../features/type-safety.md) - Type system overview