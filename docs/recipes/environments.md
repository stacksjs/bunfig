# Multi-Environment Configuration

Manage configuration across development, staging, and production environments with environment-specific settings, secrets management, and deployment strategies.

## Environment Structure

```
config/
├── base.config.ts           # Shared configuration
├── development.config.ts    # Development overrides
├── staging.config.ts        # Staging overrides
├── production.config.ts     # Production overrides
└── test.config.ts          # Testing configuration
```

## Base Configuration

```ts
// config/base.config.ts
export default {
  app: {
    name: 'MyApp',
    version: '1.0.0',
    author: 'Your Team'
  },

  server: {
    port: 3000,
    host: 'localhost',
    keepAlive: true,
    timeout: 30000
  },

  database: {
    pool: 5,
    timeout: 30000,
    ssl: false,
    migrations: true,
    retries: 3
  },

  cache: {
    enabled: false,
    ttl: 3600,
    prefix: 'myapp:'
  },

  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    enableMetrics: false
  },

  security: {
    bcryptRounds: 10,
    sessionSecret: 'dev-secret-change-me',
    cookieSecure: false,
    cookieMaxAge: 24 * 60 * 60 * 1000 // 24 hours
  },

  features: {
    enableRegistration: true,
    enablePasswordReset: true,
    enableEmailVerification: false,
    enableTwoFactor: false,
    enableAuditLog: false
  },

  external: {
    email: {
      enabled: false,
      provider: 'smtp'
    },
    storage: {
      provider: 'local',
      path: './uploads'
    },
    metrics: {
      enabled: false
    }
  }
}
```

## Development Configuration

```ts
// config/development.config.ts
import base from './base.config'

export default {
  ...base,

  server: {
    ...base.server,
    port: 3000,
    host: 'localhost'
  },

  database: {
    ...base.database,
    url: 'postgresql://localhost:5432/myapp_dev',
    ssl: false,
    debug: true
  },

  cache: {
    ...base.cache,
    enabled: true,
    url: 'redis://localhost:6379/0'
  },

  logging: {
    ...base.logging,
    level: 'debug',
    enableConsole: true,
    enableFile: true,
    file: './logs/development.log'
  },

  security: {
    ...base.security,
    sessionSecret: 'dev-secret-insecure',
    cookieSecure: false
  },

  features: {
    ...base.features,
    enableEmailVerification: false,
    enableTwoFactor: false
  },

  external: {
    ...base.external,
    email: {
      enabled: true,
      provider: 'console', // Log emails to console
      debug: true
    }
  },

  // Development-specific settings
  dev: {
    hotReload: true,
    openBrowser: true,
    mockExternalApis: true,
    seedDatabase: true
  }
}
```

## Production Configuration

```ts
// config/production.config.ts
import base from './base.config'

export default {
  ...base,

  server: {
    ...base.server,
    port: Number.parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0',
    cluster: true,
    workers: Number.parseInt(process.env.WEB_CONCURRENCY || '2')
  },

  database: {
    ...base.database,
    url: process.env.DATABASE_URL!,
    pool: Number.parseInt(process.env.DB_POOL_SIZE || '20'),
    ssl: true,
    sslMode: 'require',
    debug: false
  },

  cache: {
    ...base.cache,
    enabled: true,
    url: process.env.REDIS_URL!,
    cluster: process.env.REDIS_CLUSTER === 'true'
  },

  logging: {
    ...base.logging,
    level: 'error',
    enableConsole: false,
    enableFile: true,
    file: '/var/log/app/production.log',
    enableSyslog: true,
    enableMetrics: true
  },

  security: {
    ...base.security,
    bcryptRounds: 12,
    sessionSecret: process.env.SESSION_SECRET!,
    cookieSecure: true,
    trustProxy: true,
    helmet: true
  },

  features: {
    ...base.features,
    enableEmailVerification: true,
    enableTwoFactor: true,
    enableAuditLog: true
  },

  external: {
    ...base.external,
    email: {
      enabled: true,
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!
    },
    storage: {
      provider: 's3',
      bucket: process.env.S3_BUCKET!,
      region: process.env.AWS_REGION!
    },
    metrics: {
      enabled: true,
      provider: 'datadog',
      apiKey: process.env.DATADOG_API_KEY!
    }
  },

  // Production-specific settings
  prod: {
    gracefulShutdown: true,
    healthChecks: true,
    processMonitoring: true
  }
}
```

## Staging Configuration

```ts
// config/staging.config.ts
import production from './production.config'

export default {
  ...production,

  server: {
    ...production.server,
    port: Number.parseInt(process.env.PORT || '3000'),
    workers: 1 // Single worker for staging
  },

  database: {
    ...production.database,
    url: process.env.STAGING_DATABASE_URL!,
    pool: 10 // Smaller pool for staging
  },

  logging: {
    ...production.logging,
    level: 'info', // More verbose than production
    enableConsole: true // Enable console in staging
  },

  features: {
    ...production.features,
    enableTwoFactor: false, // Disable 2FA for easier testing
    enableAuditLog: false
  },

  external: {
    ...production.external,
    email: {
      enabled: true,
      provider: 'console', // Log emails instead of sending
      debug: true
    },
    storage: {
      provider: 'local',
      path: './uploads' // Use local storage in staging
    },
    metrics: {
      enabled: false // Disable metrics in staging
    }
  },

  // Staging-specific settings
  staging: {
    resetDatabase: process.env.RESET_DB === 'true',
    seedTestData: true,
    enableDebugRoutes: true
  }
}
```

## Test Configuration

```ts
// config/test.config.ts
import base from './base.config'

export default {
  ...base,

  server: {
    ...base.server,
    port: 0, // Random port for tests
    host: 'localhost'
  },

  database: {
    ...base.database,
    url: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/myapp_test',
    pool: 2, // Small pool for tests
    debug: false
  },

  cache: {
    ...base.cache,
    enabled: false // Disable cache in tests
  },

  logging: {
    ...base.logging,
    level: 'error', // Minimal logging in tests
    enableConsole: false,
    enableFile: false
  },

  security: {
    ...base.security,
    bcryptRounds: 1, // Fast hashing for tests
    sessionSecret: 'test-secret'
  },

  features: {
    ...base.features,
    enableEmailVerification: false,
    enableTwoFactor: false
  },

  external: {
    ...base.external,
    email: {
      enabled: false
    }
  },

  // Test-specific settings
  test: {
    mockExternalApis: true,
    resetDatabase: true,
    seedTestData: false,
    timeout: 5000
  }
}
```

## Environment Loading

```ts
// config/index.ts
import { config } from 'bunfig'

export async function loadEnvironmentConfig() {
  const environment = process.env.NODE_ENV || 'development'

  try {
    // Try to load environment-specific config first
    return await config({
      name: environment,
      cwd: './config'
    })
  }
  catch (error) {
    // Fallback to base configuration
    console.warn(`No ${environment} config found, using base configuration`)
    return await config({
      name: 'base',
      cwd: './config'
    })
  }
}

// Usage in your app
export const appConfig = await loadEnvironmentConfig()
```

## Environment Variable Management

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=debug

# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db.example.com:5432/myapp
REDIS_URL=redis://staging-redis.example.com:6379
LOG_LEVEL=info
SESSION_SECRET=staging-secret-key

# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://prod-db.example.com:5432/myapp
REDIS_URL=redis://prod-redis.example.com:6379
SESSION_SECRET=super-secure-production-secret
SENDGRID_API_KEY=your-sendgrid-key
S3_BUCKET=your-s3-bucket
AWS_REGION=us-east-1
DATADOG_API_KEY=your-datadog-key
```

## Configuration Validation

```ts
// config/validation.ts
export const environmentSchema = {
  type: 'object',
  properties: {
    server: {
      type: 'object',
      properties: {
        port: { type: 'number', minimum: 1, maximum: 65535 },
        host: { type: 'string', minLength: 1 }
      },
      required: ['port', 'host']
    },
    database: {
      type: 'object',
      properties: {
        url: { type: 'string', pattern: '^postgresql://' },
        pool: { type: 'number', minimum: 1, maximum: 100 }
      },
      required: ['url']
    },
    security: {
      type: 'object',
      properties: {
        sessionSecret: { type: 'string', minLength: 16 },
        bcryptRounds: { type: 'number', minimum: 8, maximum: 15 }
      },
      required: ['sessionSecret']
    }
  },
  required: ['server', 'database', 'security']
}

// Custom validation for environment-specific requirements
export function validateEnvironmentConfig(config: any, environment: string) {
  const errors: string[] = []

  if (environment === 'production') {
    // Production-specific validations
    if (config.security.sessionSecret === 'dev-secret-change-me') {
      errors.push('Production must not use default session secret')
    }

    if (!config.database.ssl) {
      errors.push('Production must use SSL for database connections')
    }

    if (config.logging.level === 'debug') {
      errors.push('Production should not use debug logging level')
    }

    if (!config.external.email.apiKey && config.external.email.provider !== 'console') {
      errors.push('Production email configuration requires API key')
    }
  }

  if (environment === 'development') {
    // Development-specific validations
    if (config.server.host !== 'localhost' && config.server.host !== '127.0.0.1') {
      console.warn('Development server accessible from outside localhost')
    }
  }

  return errors
}
```

## Configuration Loading with Validation

```ts
// app.ts
import { config } from 'bunfig'
import { environmentSchema, validateEnvironmentConfig } from './config/validation'

async function loadValidatedConfig() {
  const environment = process.env.NODE_ENV || 'development'

  const appConfig = await config({
    name: environment,
    cwd: './config',
    schema: environmentSchema,
    validate: cfg => validateEnvironmentConfig(cfg, environment)
  })

  console.log(`🌍 Loaded ${environment} configuration`)
  console.log(`🚀 Server will start on ${appConfig.server.host}:${appConfig.server.port}`)
  console.log(`🗄️  Database: ${appConfig.database.url.replace(/\/\/.*@/, '//***@')}`)
  console.log(`📊 Logging level: ${appConfig.logging.level}`)

  return appConfig
}

export const appConfig = await loadValidatedConfig()
```

## Secrets Management

```ts
// config/secrets.ts
import { config } from 'bunfig'

// Load secrets from environment or secret management service
export async function loadSecrets() {
  const environment = process.env.NODE_ENV || 'development'

  if (environment === 'production') {
    // Load from AWS Secrets Manager, Azure Key Vault, etc.
    return await loadFromSecretsManager()
  }
  else {
    // Load from environment variables
    return {
      databaseUrl: process.env.DATABASE_URL,
      sessionSecret: process.env.SESSION_SECRET,
      jwtSecret: process.env.JWT_SECRET,
      apiKeys: {
        sendgrid: process.env.SENDGRID_API_KEY,
        datadog: process.env.DATADOG_API_KEY
      }
    }
  }
}

async function loadFromSecretsManager() {
  // Implementation depends on your cloud provider
  // This is a simplified example

  if (process.env.AWS_SECRETS_MANAGER_SECRET_ID) {
    const AWS = await import('aws-sdk')
    const secretsManager = new AWS.SecretsManager()

    const secret = await secretsManager.getSecretValue({
      SecretId: process.env.AWS_SECRETS_MANAGER_SECRET_ID
    }).promise()

    return JSON.parse(secret.SecretString!)
  }

  throw new Error('No secrets manager configured')
}
```

## Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy-staging.sh

set -e

echo "🚀 Deploying to staging..."

# Set environment
export NODE_ENV=staging

# Load staging environment variables
if [ -f .env.staging ]; then
  source .env.staging
fi

# Validate configuration
echo "🔍 Validating configuration..."
bun run validate-config

# Run database migrations
echo "📊 Running database migrations..."
bun run migrate

# Build application
echo "🔨 Building application..."
bun run build

# Deploy to staging server
echo "🚚 Deploying to staging server..."
rsync -avz --exclude node_modules . staging-server:/app/

# Restart services
echo "♻️  Restarting services..."
ssh staging-server "cd /app && pm2 restart all"

echo "✅ Staging deployment complete!"
```

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Deploying to production..."

# Safety check
if [ "$NODE_ENV" != "production" ]; then
  echo "❌ NODE_ENV must be set to 'production'"
  exit 1
fi

# Validate production configuration
echo "🔍 Validating production configuration..."
bun run validate-config --env production

# Run security checks
echo "🔒 Running security checks..."
bun audit

# Build and test
echo "🔨 Building and testing..."
bun run build
bun test

# Blue-green deployment
echo "🔄 Starting blue-green deployment..."
./scripts/blue-green-deploy.sh

echo "✅ Production deployment complete!"
```

## Configuration Monitoring

```ts
// config/monitor.ts
export class ConfigurationMonitor {
  private lastConfig: any
  private watchers: Array<(config: any) => void> = []

  async start() {
    // Watch for configuration changes
    setInterval(async () => {
      try {
        const currentConfig = await loadEnvironmentConfig()

        if (JSON.stringify(currentConfig) !== JSON.stringify(this.lastConfig)) {
          console.log('📊 Configuration changed, notifying watchers...')
          this.notifyWatchers(currentConfig)
          this.lastConfig = currentConfig
        }
      }
      catch (error) {
        console.error('❌ Failed to reload configuration:', error)
      }
    }, 30000) // Check every 30 seconds
  }

  onConfigChange(callback: (config: any) => void) {
    this.watchers.push(callback)
  }

  private notifyWatchers(config: any) {
    this.watchers.forEach((watcher) => {
      try {
        watcher(config)
      }
      catch (error) {
        console.error('❌ Configuration watcher failed:', error)
      }
    })
  }
}

// Usage
const monitor = new ConfigurationMonitor()
monitor.onConfigChange((config) => {
  console.log('♻️  Reloading services with new configuration...')
  // Reload services, update rate limits, etc.
})
monitor.start()
```

## Docker Multi-Environment

```dockerfile
# Dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
RUN bun install

# Copy source code
COPY . .

# Set default environment
ENV NODE_ENV=production

# Build application
RUN bun run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start application
CMD ["bun", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app-dev:
    build: .
    environment:
      - NODE_ENV=development
    env_file:
      - .env.development
    ports:
      - '3000:3000'
    volumes:
      - .:/app
      - /app/node_modules

  app-staging:
    build: .
    environment:
      - NODE_ENV=staging
    env_file:
      - .env.staging
    ports:
      - '3001:3000'

  app-prod:
    build: .
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - '3002:3000'
    restart: unless-stopped
```

## Testing Environment Configuration

```ts
// tests/config.test.ts
import { beforeEach, describe, expect, it } from 'bun:test'
import { config } from 'bunfig'

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.NODE_ENV
  })

  it('should load development config by default', async () => {
    const cfg = await config({ name: 'development', cwd: './config' })
    expect(cfg.logging.level).toBe('debug')
    expect(cfg.security.cookieSecure).toBe(false)
  })

  it('should load production config with secure settings', async () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgresql://prod:5432/app'
    process.env.SESSION_SECRET = 'super-secure-secret'

    const cfg = await config({ name: 'production', cwd: './config' })
    expect(cfg.security.cookieSecure).toBe(true)
    expect(cfg.database.ssl).toBe(true)
    expect(cfg.logging.level).toBe('error')
  })

  it('should validate required production settings', async () => {
    process.env.NODE_ENV = 'production'
    // Missing required environment variables

    await expect(
      config({ name: 'production', cwd: './config' })
    ).rejects.toThrow()
  })
})
```

## Related Features

- **[Web Server Configuration](./web-server.md)** - Server setup for different environments
- **[Error Handling](../features/error-handling.md)** - Environment-specific error handling
- **[Validation](../features/validation.md)** - Validate environment configurations
- **[Configuration Loading](../features/configuration-loading.md)** - Advanced loading strategies
