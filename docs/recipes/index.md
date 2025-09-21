# Configuration Recipes

Real-world configuration patterns and solutions for common use cases. These recipes provide copy-paste ready configurations for different scenarios.

## Available Recipes

- **[Web Server Configuration](./web-server.md)** - Complete server setup with CORS, rate limiting, and security
- **[Multi-Environment Setup](./environments.md)** - Development, staging, and production configurations

## Coming Soon

More recipes are being developed to cover common configuration patterns:

### Web Applications
- Express/Fastify server configurations
- Next.js and React application setup
- Microservices configuration patterns
- Static site generator configurations

### Databases & Storage
- PostgreSQL connection and pooling
- MongoDB and NoSQL database setup
- Redis caching strategies
- Multi-database configurations

### Authentication & Security
- JWT authentication patterns
- OAuth integration guides
- API key management
- Security header configurations

### DevOps & Deployment
- Docker containerization
- Kubernetes deployment
- CI/CD pipeline configuration
- Cloud provider integrations

### Monitoring & Observability
- Logging configuration
- Metrics collection
- Error tracking setup
- Health check patterns

## Common Patterns

### Configuration Composition

```ts
// Base configuration that other configs extend
// config/base.config.ts
export default {
  app: {
    name: 'MyApp',
    version: '1.0.0'
  },
  logging: {
    level: 'info',
    enableConsole: true
  }
}

// Environment-specific configuration
// config/production.config.ts
import base from './base.config'

export default {
  ...base,
  logging: {
    ...base.logging,
    level: 'error',
    enableFile: true,
    file: '/var/log/app.log'
  },
  database: {
    url: process.env.DATABASE_URL,
    pool: 20
  }
}
```

### Feature-Based Configuration

```ts
// config/features/auth.config.ts
export default {
  enabled: true,
  providers: ['google', 'github'],
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: '24h'
  },
  session: {
    cookieName: 'session',
    secure: true,
    httpOnly: true
  }
}

// config/features/cache.config.ts
export default {
  enabled: true,
  provider: 'redis',
  ttl: 3600,
  redis: {
    url: process.env.REDIS_URL,
    db: 0
  }
}
```

### Dynamic Configuration

```ts
// config/dynamic.config.ts
export default {
  // Configuration that changes based on environment
  database: {
    url: process.env.NODE_ENV === 'test'
      ? 'postgresql://localhost:5432/test'
      : process.env.DATABASE_URL,
    pool: process.env.NODE_ENV === 'production' ? 20 : 5
  },

  // Feature flags based on environment
  features: {
    enableMetrics: process.env.NODE_ENV === 'production',
    debugMode: process.env.NODE_ENV === 'development',
    betaFeatures: process.env.ENABLE_BETA === 'true'
  }
}
```

### Configuration Validation

```ts
// Common validation schemas
export const serverSchema = {
  type: 'object',
  properties: {
    port: { type: 'number', minimum: 1, maximum: 65535 },
    host: { type: 'string', minLength: 1 },
    cors: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        origins: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  },
  required: ['port', 'host']
}

export const databaseSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      pattern: '^(postgresql|mysql|sqlite)://'
    },
    pool: { type: 'number', minimum: 1, maximum: 100 },
    ssl: { type: 'boolean' },
    timeout: { type: 'number', minimum: 0 }
  },
  required: ['url']
}
```

## Quick Reference

### Common Configuration Names

```ts
// Use descriptive, consistent names
await config({ name: 'server' })     // server.config.ts
await config({ name: 'database' })   // database.config.ts
await config({ name: 'auth' })       // auth.config.ts
await config({ name: 'cache' })      // cache.config.ts
await config({ name: 'logging' })    // logging.config.ts
```

### Environment Variable Patterns

```bash
# Server configuration
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
SERVER_CORS_ENABLED=true

# Database configuration
DATABASE_URL=postgresql://localhost:5432/myapp
DATABASE_POOL=10
DATABASE_SSL=true

# Authentication configuration
AUTH_JWT_SECRET=your-secret-key
AUTH_JWT_EXPIRY=24h
AUTH_PROVIDERS=google,github
```

### Default Value Patterns

```ts
// Always provide sensible defaults
const config = await loadConfig({
  name: 'app',
  defaultConfig: {
    server: {
      port: 3000,
      host: 'localhost'
    },
    database: {
      pool: 5,
      timeout: 30000
    },
    features: {
      enableCache: false,
      enableMetrics: false
    }
  }
})
```

## Best Practices

1. **Use TypeScript interfaces** for type safety
2. **Provide meaningful defaults** for all configuration values
3. **Validate critical configuration** with schemas
4. **Use environment variables** for sensitive or environment-specific values
5. **Organize configuration** by feature or service
6. **Document configuration options** with comments
7. **Test configuration loading** in your test suites
8. **Use consistent naming** across environments

## Contributing Recipes

Have a useful configuration pattern? [Contribute a recipe](https://github.com/stacksjs/bunfig/blob/main/docs/recipes/README.md) to help the community!