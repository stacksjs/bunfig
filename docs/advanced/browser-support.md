# Browser Support

bunfig includes built-in browser support through its dedicated browser module, allowing you to load configuration in browser environments through API endpoints.

## Browser Usage

### Basic Usage

```ts
import { loadConfig } from 'bunfig/browser'

interface MyConfig {
  theme: string
  language: string
}

const config = await loadConfig<MyConfig>({
  name: 'my-app',
  endpoint: '/api/config',
  defaultConfig: {
    theme: 'light',
    language: 'en',
  },
})
```

### Environment Variables in Browser Context

While the automatic environment variable loading feature works great in server-side environments, browsers don't have direct access to system environment variables. In browser environments:

1. Environment variables can only be accessed if they are:
   - Embedded during the build process by tools like Vite or webpack (e.g., replacing `process.env.API_URL` with the actual value)
   - Made available through the API endpoint that serves your configuration

2. The `checkEnv` option is supported for API consistency, but has little effect unless you've embedded environment variables at build time

3. Common patterns for using environment-specific configuration in browsers include:
   - Using different API endpoints for different environments
   - Having the server inject environment variables into the initial page
   - Using build-time environment variables for configuration generation

```ts
// In a browser context with build tool that supports env variables
// If you're using Vite, for example, import.meta.env would contain these values
const apiEndpoint = process.env.API_ENDPOINT || '/api/config'

const config = await loadConfig<MyConfig>({
  name: 'my-app',
  endpoint: apiEndpoint,
  defaultConfig: { /* ... */ },
})
```

For a universal (isomorphic) approach that works in both server and browser contexts, you can implement a pattern like this:

```ts
import { isBrowser } from 'bunfig/browser'

async function getConfig() {
  if (isBrowser()) {
    // Browser: load from API
    const { loadConfig } = await import('bunfig/browser')
    return loadConfig({ endpoint: '/api/config', /* ... */ })
  }
  else {
    // Server: use file-based config with env vars
    const { loadConfig } = await import('bunfig')
    return loadConfig({ name: 'my-app', /* ... */ })
  }
}
```

### Custom Headers

You can include custom headers in your configuration requests:

```ts
const config = await loadConfig<MyConfig>({
  name: 'my-app',
  endpoint: '/api/config',
  defaultConfig: {
    theme: 'light',
    language: 'en',
  },
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value',
  },
})
```

### Error Handling

The browser module includes built-in error handling:

- Network errors: Returns default configuration
- Invalid responses: Returns default configuration
- Type mismatches: Returns default configuration

```ts
// Example with error handling
try {
  const config = await loadConfig<MyConfig>({
    name: 'my-app',
    endpoint: '/api/config',
    defaultConfig: {
      // Fallback values if API request fails
      theme: 'light',
      language: 'en',
    },
  })
}
catch (error) {
  console.error('Configuration loading failed:', error)
}
```

### Environment Detection

bunfig provides a utility to detect browser environments:

```ts
import { isBrowser } from 'bunfig/browser'

if (isBrowser()) {
  // Use browser-specific configuration loading
  const config = await loadConfig<MyConfig>({
    endpoint: '/api/config',
    // ...
  })
}
else {
  // Use Node.js/Bun configuration loading
  const config = await loadConfig<MyConfig>({
    name: 'my-app',
    // ...
  })
}
```

## Examples

### Basic Setup Example

```ts
import { loadConfig } from 'bunfig/browser'

// Define your configuration type
interface AppConfig {
  theme: 'light' | 'dark'
  language: string
  features: {
    newUI: boolean
    beta: boolean
  }
}

// Load configuration from an API endpoint
const config = await loadConfig<AppConfig>({
  name: 'my-app',
  endpoint: '/api/config', // Your API endpoint
  defaultConfig: {
    // Fallback values if API request fails
    theme: 'light',
    language: 'en',
    features: {
      newUI: false,
      beta: false,
    },
  },
})

// Use the configuration
document.body.classList.add(`theme-${config.theme}`)
```

### Complete Integration Example

```ts
import type { Config } from 'bunfig'
// config/browser.ts
import { isBrowser, loadConfig } from 'bunfig/browser'

// Define your configuration interface
interface AppConfig {
  api: {
    url: string
    timeout: number
  }
  ui: {
    theme: 'light' | 'dark'
    animations: boolean
  }
  features: {
    [key: string]: boolean
  }
}

// Create a typed configuration loader
async function loadAppConfig(): Promise<AppConfig> {
  // Default configuration
  const defaults: AppConfig = {
    api: {
      url: 'https://api.example.com',
      timeout: 5000,
    },
    ui: {
      theme: 'light',
      animations: true,
    },
    features: {
      newDashboard: false,
      betaFeatures: false,
    },
  }

  // Different loading strategies for browser/node
  if (isBrowser()) {
    return await loadConfig<AppConfig>({
      name: 'my-app',
      endpoint: '/api/config',
      defaultConfig: defaults,
      // Add custom headers if needed
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
  }

  // Fallback for non-browser environments
  return defaults
}

// Example usage with error handling
async function initializeApp() {
  try {
    const config = await loadAppConfig()

    // Apply configuration
    setupAPI(config.api)
    applyTheme(config.ui.theme)
    toggleFeatures(config.features)

    return config
  }
  catch (error) {
    console.error('Failed to load configuration:', error)
    // Handle error appropriately
  }
}

// Helper functions
function setupAPI({ url, timeout }: AppConfig['api']) {
  // Configure API client
  axios.defaults.baseURL = url
  axios.defaults.timeout = timeout
}

function applyTheme(theme: AppConfig['ui']['theme']) {
  document.documentElement.setAttribute('data-theme', theme)
}

function toggleFeatures(features: AppConfig['features']) {
  Object.entries(features).forEach(([feature, enabled]) => {
    if (enabled)
      enableFeature(feature)
    else
      disableFeature(feature)
  })
}
```

### Real-World Application Example

```ts
// app.ts
import { isBrowser, loadConfig } from 'bunfig/browser'

// Configuration type with environment support
interface EnvironmentConfig {
  production: boolean
  apiUrl: string
  features: string[]
}

class App {
  private config: EnvironmentConfig
  private configCache = new Map<string, any>()

  async initialize() {
    this.config = await this.loadEnvironmentConfig()
    await this.setupServices()
  }

  private async loadEnvironmentConfig(): Promise<EnvironmentConfig> {
    // Get environment from build time or environment variable
    const env = process.env.NODE_ENV || 'development'
    const cacheKey = `config:${env}`

    // Check cache first
    if (this.configCache.has(cacheKey))
      return this.configCache.get(cacheKey)

    // Load configuration based on environment
    const config = await loadConfig<EnvironmentConfig>({
      name: 'app',
      // Load from different endpoints based on environment
      endpoint: `/api/config/${env}`,
      defaultConfig: {
        production: env === 'production',
        apiUrl: 'http://localhost:3000',
        features: [],
      },
      headers: {
        // Add environment-specific headers
        'X-Environment': env,
        'X-Client-Version': APP_VERSION,
      },
    })

    // Cache the configuration
    this.configCache.set(cacheKey, config)
    return config
  }

  private async setupServices() {
    if (this.config.production) {
      // Setup production services
      await this.setupAnalytics()
      await this.setupErrorReporting()
    }

    // Setup API client
    await this.setupAPIClient(this.config.apiUrl)

    // Enable features
    this.config.features.forEach((feature) => {
      this.enableFeature(feature)
    })
  }

  // Example of runtime configuration updates
  public async refreshConfig() {
    // Clear cache
    this.configCache.clear()

    // Reload configuration
    this.config = await this.loadEnvironmentConfig()

    // Re-initialize services with new config
    await this.setupServices()

    // Emit configuration change event
    this.emit('configUpdated', this.config)
  }
}

// Initialize application
const app = new App()
app.initialize().catch((error) => {
  console.error('Failed to initialize app:', error)
})
```

These examples demonstrate:

- Type-safe configuration loading
- Environment-specific configuration
- Configuration caching
- Error handling
- Service initialization based on configuration
- Runtime configuration updates
- Integration with application services

The browser module handles all the complexities of loading configuration in browser environments while maintaining type safety and providing fallback values when needed.
