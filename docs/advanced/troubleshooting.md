# Troubleshooting

This guide helps you diagnose and resolve common issues when using bunfig. It covers configuration loading problems, type errors, performance issues, and debugging techniques.

## Common Issues

### Configuration Not Found

**Problem**: bunfig cannot find your configuration file.

```bash
Error: Configuration 'app' not found
```

**Solutions**:

1. **Check file naming** - Ensure your configuration file follows the expected naming pattern:
   ```bash
   # Correct patterns
   config/app.config.ts
   config/app.ts
   .config/app.config.ts
   app.config.ts
   .app.config.ts
   ```

2. **Verify file location** - bunfig searches in specific directories:
   ```bash
   # Check these locations
   ./config/
   ./.config/
   ./
   ~/.config/app/
   ```

3. **Check file permissions**:
   ```bash
   ls -la config/app.config.ts
   # Should be readable by current user
   ```

4. **Use absolute paths for debugging**:
   ```ts
   import { resolve } from 'node:path'
   import { loadConfig } from 'bunfig'

   const config = await loadConfig({
     name: 'app',
     configDir: resolve('./config'), // Use absolute path
     defaultConfig: {},
   })
   ```

### File Format Errors

**Problem**: Configuration file has syntax or export errors.

```bash
SyntaxError: Unexpected token in JSON
TypeError: Cannot read property 'default' of undefined
```

**Solutions**:

1. **Check JSON syntax** (for .json files):
   ```bash
   # Validate JSON syntax
   bunx prettier --check config/app.config.json
   # or
   node -e "JSON.parse(require('fs').readFileSync('config/app.config.json', 'utf8'))"
   ```

2. **Verify export format** (for .ts/.js files):
   ```ts
   // ✅ Correct - default export
   export default {
     port: 3000,
     host: 'localhost',
   }

   // ✅ Correct - CommonJS
   module.exports = {
     port: 3000,
     host: 'localhost',
   }

   // ❌ Incorrect - named export without default
   export const config = {
     port: 3000,
     host: 'localhost',
   }
   ```

3. **Check TypeScript compilation**:
   ```bash
   # Compile TypeScript file manually
   bunx tsc --noEmit config/app.config.ts
   ```

### Type Errors

**Problem**: TypeScript compilation errors or type mismatches.

```bash
Type 'string' is not assignable to type 'number'
Property 'port' is missing in type
```

**Solutions**:

1. **Define explicit interfaces**:
   ```ts
   interface AppConfig {
     port: number
     host: string
     debug?: boolean
   }

   const config: AppConfig = {
     port: 3000,
     host: 'localhost',
   }

   export default config
   ```

2. **Check environment variable types**:
   ```ts
   // ❌ String from environment variable
   const config = {
     port: process.env.PORT, // This is a string!
   }

   // ✅ Properly convert types
   const config = {
     port: Number(process.env.PORT) || 3000,
   }
   ```

3. **Use type assertions carefully**:
   ```ts
   // ✅ Safe type assertion with validation
   const port = Number(process.env.PORT)
   if (Number.isNaN(port)) {
     throw new TypeError('PORT must be a valid number')
   }

   const config = {
     port,
     host: process.env.HOST || 'localhost',
   }
   ```

### Environment Variable Issues

**Problem**: Environment variables are not being loaded or applied correctly.

**Solutions**:

1. **Check variable naming**:
   ```bash
   # For config name 'app', variables should be:
   export MY_APP_PORT=3000
   export MY_APP_HOST=localhost
   export MY_APP_DATABASE_URL=postgresql://...
   ```

2. **Verify environment loading**:
   ```ts
   // Debug environment variables
   console.log('Environment variables:', {
     MY_APP_PORT: process.env.MY_APP_PORT,
     MY_APP_HOST: process.env.MY_APP_HOST,
   })

   const config = await loadConfig({
     name: 'my-app',
     checkEnv: true, // Ensure this is enabled
     defaultConfig: {},
   })
   ```

3. **Test environment variable parsing**:
   ```bash
   # Test in shell
   export MY_APP_PORT=4000
   echo $MY_APP_PORT

   # Test in Node.js
   node -e "console.log(process.env.MY_APP_PORT)"
   ```

### Home Directory Configuration

**Problem**: Global configuration in home directory is not loading.

**Solutions**:

1. **Check home directory path**:
   ```bash
   echo $HOME
   ls -la ~/.config/
   ```

2. **Verify directory structure**:
   ```bash
   # Should exist
   ~/.config/my-app/config.ts
   # or
   ~/.config/my-app/my-app.config.ts
   ```

3. **Test home directory loading**:
   ```ts
   import { homedir } from 'node:os'
   import { join } from 'node:path'
   import { loadConfig } from 'bunfig'

   // Debug home directory
   console.log('Home directory:', homedir())
   console.log('Expected config path:', join(homedir(), '.config', 'my-app'))

   const config = await loadConfig({
     name: 'my-app',
     defaultConfig: {},
   })
   ```

### Merge Conflicts

**Problem**: Configuration values are not merging as expected.

**Solutions**:

1. **Understand merge priority**:
   ```
   1. Local config files (highest priority)
   2. Home directory config
   3. Package.json sections
   4. Environment variables
   5. Default config (lowest priority)
   ```

2. **Debug merge process**:
   ```ts
   import { loadConfig } from 'bunfig'

   const config = await loadConfig({
     name: 'app',
     verbose: true, // Enable verbose logging
     defaultConfig: {
       port: 3000,
       host: 'localhost',
     },
   })

   console.log('Final config:', config)
   ```

3. **Test individual sources**:
   ```ts
   // Test without environment variables
   const configNoEnv = await loadConfig({
     name: 'app',
     checkEnv: false,
     defaultConfig: {},
   })

   // Test without home directory
   const configNoHome = await loadConfig({
     name: 'app',
     skipHomeDir: true,
     defaultConfig: {},
   })
   ```

## Debugging Techniques

### Enable Verbose Logging

```ts
import { loadConfig } from 'bunfig'

const config = await loadConfig({
  name: 'app',
  verbose: true, // Enable detailed logging
  defaultConfig: {},
})
```

This will show:
- File search paths
- Found configuration files
- Merge order and sources
- Environment variable processing

### Use Debug Mode

```bash
# Enable debug mode
DEBUG=bunfig* node your-app.js

# or
BUNFIG_DEBUG=true node your-app.js
```

### Manual Configuration Testing

```ts
// test-config.ts
import { loadConfig } from 'bunfig'

async function testConfig() {
  try {
    console.log('Testing configuration loading...')

    const config = await loadConfig({
      name: 'app',
      verbose: true,
      defaultConfig: {
        port: 3000,
        host: 'localhost',
      },
    })

    console.log('✅ Configuration loaded successfully:', config)
  }
  catch (error) {
    console.error('❌ Configuration loading failed:', error)

    // Additional debugging
    console.log('Process CWD:', process.cwd())
    console.log('Environment variables:', Object.keys(process.env).filter(key =>
      key.startsWith('MY_APP_')
    ))
  }
}

testConfig()
```

### File System Debugging

```ts
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function debugFileSystem(configName: string) {
  const paths = [
    `./config/${configName}.config.ts`,
    `./config/${configName}.ts`,
    `./.config/${configName}.config.ts`,
    `./${configName}.config.ts`,
  ]

  console.log('Checking file paths:')
  for (const path of paths) {
    const fullPath = resolve(path)
    const exists = existsSync(fullPath)
    console.log(`  ${exists ? '✅' : '❌'} ${fullPath}`)

    if (exists) {
      try {
        const content = readFileSync(fullPath, 'utf8')
        console.log(`    Size: ${content.length} bytes`)
      }
      catch (error) {
        console.log(`    Error reading: ${error.message}`)
      }
    }
  }
}

debugFileSystem('app')
```

## Error Messages Reference

### `Configuration not found`

**Cause**: No configuration file found in searched locations.

**Solution**:
- Check file naming and location
- Use `bunfig info` command to see search paths
- Verify file permissions

### `Invalid configuration export`

**Cause**: Configuration file doesn't export a default value.

**Solution**:
- Ensure `export default` or `module.exports` is used
- Check for syntax errors in the file

### `Type validation failed`

**Cause**: Configuration doesn't match expected TypeScript types.

**Solution**:
- Define proper interfaces
- Check type conversions (especially from environment variables)
- Use type assertions where appropriate

### `Environment variable parsing error`

**Cause**: Invalid environment variable format or conversion.

**Solution**:
- Check variable naming convention
- Validate variable values
- Handle type conversions explicitly

### `Merge conflict detected`

**Cause**: Incompatible configuration values during merge.

**Solution**:
- Review merge priority order
- Check for conflicting array merge strategies
- Use explicit merge options

## Performance Issues

### Slow Configuration Loading

**Symptoms**: Configuration loading takes longer than expected.

**Debugging**:
```ts
import { performance } from 'node:perf_hooks'

const start = performance.now()
const config = await loadConfig({
  name: 'app',
  defaultConfig: {},
})
const end = performance.now()

console.log(`Configuration loading took ${end - start}ms`)

if (end - start > 100) {
  console.warn('Slow configuration loading detected')
  // Check for large files, complex merging, or file system issues
}
```

**Solutions**:
- Enable caching
- Reduce configuration file size
- Optimize file structure
- Check file system performance

### Memory Issues

**Symptoms**: High memory usage or memory leaks.

**Debugging**:
```ts
import { memoryUsage } from 'node:process'

function logMemoryUsage(label: string) {
  const usage = memoryUsage()
  console.log(`${label}:`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
  })
}

logMemoryUsage('Before config loading')
const config = await loadConfig({ name: 'app', defaultConfig: {} })
logMemoryUsage('After config loading')
```

**Solutions**:
- Use lazy loading
- Clear configuration cache periodically
- Avoid large configuration objects
- Check for circular references

## CLI Diagnostic Tools

### `bunfig doctor`

Run comprehensive diagnostics:

```bash
bunfig doctor --config-dir ./config
```

This checks for:
- File permission issues
- Syntax errors
- Type inconsistencies
- Performance problems
- Best practice violations

### `bunfig info`

Get detailed information about configuration resolution:

```bash
bunfig info app --show-content --show-types
```

Shows:
- Search paths
- Found files
- Resolution order
- Type information
- Configuration content

### `bunfig validate`

Validate configuration files:

```bash
bunfig validate --strict --format json
```

Checks for:
- Syntax errors
- Type errors
- Required fields
- Format compliance

## Browser-Specific Issues

### CORS Errors

**Problem**: Configuration API requests blocked by CORS.

**Solution**:
```ts
// Configure CORS headers on your API endpoint
app.get('/api/config/:name', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  // ... return configuration
})

// Or use browser config with proper endpoint
const config = await loadConfig({
  name: 'app',
  endpoint: '/api/config', // Same-origin request
  defaultConfig: {},
})
```

### Network Failures

**Problem**: Configuration loading fails due to network issues.

**Solution**:
```ts
import { loadConfig } from 'bunfig/browser'

const config = await loadConfig({
  name: 'app',
  endpoint: '/api/config',
  timeout: 5000, // 5 second timeout
  retries: 3, // Retry failed requests
  defaultConfig: {
    // Fallback configuration
    port: 3000,
    host: 'localhost',
  },
})
```

## Getting Help

### Community Support

1. **GitHub Issues**: Report bugs and ask questions
   - https://github.com/stacksjs/bunfig/issues

2. **Discussions**: Community help and best practices
   - https://github.com/stacksjs/stacks/discussions

3. **Discord**: Real-time chat support
   - https://discord.gg/stacksjs

### Reporting Issues

When reporting issues, include:

1. **bunfig version**:
   ```bash
   bunfig --version
   ```

2. **Environment information**:
   ```bash
   bun --version
   node --version
   cat package.json | grep bunfig
   ```

3. **Configuration files** (sanitized):
   ```ts
   // Remove sensitive information before sharing
   export default {
     port: 3000,
     host: 'localhost',
     // database: 'REDACTED'
   }
   ```

4. **Error logs** with verbose output:
   ```bash
   DEBUG=bunfig* your-command 2>&1 | tee bunfig-debug.log
   ```

5. **Minimal reproduction case**:
   ```ts
   // Simplest possible code that reproduces the issue
   import { loadConfig } from 'bunfig'

   const config = await loadConfig({
     name: 'test',
     defaultConfig: {},
   })
   ```

## Related Features

- [CLI Usage](./cli.md) - Diagnostic and debugging commands
- [Performance](./performance.md) - Performance optimization guide
- [Configuration Loading](../features/configuration-loading.md) - How configuration resolution works
