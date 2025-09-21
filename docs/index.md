---
layout: home

hero:
  name: "bunfig"
  text: "Smart configuration for modern Bun applications"
  tagline: "TypeScript-first configuration loader with automatic environment variable detection, validation, and zero dependencies."
  image: /images/logo-white.png
  actions:
    - theme: brand
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/stacksjs/bunfig

features:
  - title: "🎯 Zero Configuration Setup"
    details: "Works instantly out of the box. Drop in a config file and start using it immediately with automatic TypeScript support and intelligent defaults."
  - title: "🌍 Environment Variable Magic"
    details: "Automatically detects and merges environment variables with smart naming conventions. APP_DATABASE_URL becomes config.database.url seamlessly."
  - title: "🔍 TypeScript First"
    details: "Full TypeScript support with intelligent type inference, autocompletion, and compile-time validation. Your IDE will love it."
  - title: "📁 Smart File Discovery"
    details: "Finds configuration files anywhere - project root, home directory (~/.config), or package.json. Supports .ts, .js, .json, and more."
  - title: "✅ Bulletproof Validation"
    details: "JSON Schema validation, custom rules, and detailed error reporting catch configuration issues before they hit production."
  - title: "⚡ Lightning Fast"
    details: "Zero dependencies, intelligent caching, and optimized for Bun's performance. Loads configurations in microseconds."
  - title: "🏠 XDG Standards Compliant"
    details: "Global configurations via ~/.config/$name/ following XDG Base Directory standards for system-wide settings."
  - title: "🔄 Hot Reload Ready"
    details: "Watch for configuration changes and reload automatically. Perfect for development workflows and dynamic configuration updates."
  - title: "🛡️ Production Ready"
    details: "Comprehensive error handling, fallback strategies, circuit breakers, and monitoring built-in for enterprise deployments."
---

## Quick Example

```ts
// app.config.ts
export default {
  server: {
    port: 3000,
    host: 'localhost'
  },
  database: {
    url: 'postgresql://localhost:5432/myapp',
    pool: 10
  }
}
```

```ts
// app.ts
import { config } from 'bunfig'

const { server, database } = await config({ name: 'app' })

console.log(`Server starting on ${server.host}:${server.port}`)
// Environment variables automatically override:
// APP_SERVER_PORT=8080 → server.port becomes 8080
```

## Why Choose bunfig?

<div class="feature-comparison">

| Feature | bunfig | c12 | dotenv | node-config | cosmiconfig | rc |
|---------|--------|-----|--------|-------------|-------------|-----|
| TypeScript First | ✅ | ⚠️ | ❌ | ❌ | ⚠️ | ❌ |
| Zero Dependencies | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Auto Env Vars | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| Built-in Validation | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multiple Sources | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Home Directory (~/.config) | ✅ | ✅ | ❌ | ❌ | ⚠️ | ⚠️ |
| Hot Reload | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Error Recovery | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| Performance Caching | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| Smart Type Conversion | ✅ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ |
| Package.json Support | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Bun Optimized | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |

</div>

## What Makes bunfig Special?

### 🧠 Intelligent by Design

bunfig doesn't just load configuration - it understands it. With smart naming conventions, automatic type conversion, and intelligent file discovery, it feels like magic:

```bash
# Set an environment variable
export APP_DATABASE_POOL_SIZE=20

# bunfig automatically maps it to
config.database.pool.size = 20 // (as a number!)
```

### 🔄 Development to Production

Seamlessly transition from development to production with the same configuration API:

```ts
// Development: loads from app.config.ts
const config = await loadConfig({ name: 'app' })

// Production: automatically uses environment variables
// APP_DATABASE_URL, APP_SERVER_PORT, etc.
```

### 🛡️ Enterprise Grade

Built for production with comprehensive error handling, validation, and monitoring:

```ts
const config = await loadConfig({
  name: 'app',
  schema: productionSchema,
  fallback: safeDefaults,
  validate: customValidation
})
```

## Real-World Examples

### Web Server Configuration

```ts
// server.config.ts
export default {
  http: { port: 3000, host: 'localhost' },
  cors: { enabled: true, origins: ['http://localhost:3000'] },
  rateLimit: { enabled: true, maxRequests: 100 }
}

// Automatically uses environment variables:
// SERVER_HTTP_PORT=8080
// SERVER_CORS_ORIGINS=https://myapp.com,https://api.myapp.com
```

### Database Configuration with Validation

```ts
const dbConfig = await config({
  name: 'database',
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string', pattern: '^postgresql://' },
      pool: { type: 'number', minimum: 1, maximum: 100 }
    },
    required: ['url']
  }
})
```

### Multi-Environment Setup

```ts
// config/development.config.ts
export default {
  database: { url: 'postgresql://localhost:5432/dev' },
  logging: { level: 'debug' }
}

// config/production.config.ts
export default {
  database: { url: process.env.DATABASE_URL },
  logging: { level: 'error' }
}

// Load environment-specific config
const env = process.env.NODE_ENV || 'development'
const config = await loadConfig({ name: env, cwd: './config' })
```

## Get Started in Minutes

<div class="getting-started-steps">

1. **Install bunfig**

   ```bash
   bun add bunfig
   ```

2. **Create a config file**

   ```ts
   // app.config.ts
   export default {
     port: 3000,
     host: 'localhost'
   }
   ```

3. **Load and use**

   ```ts
   import { config } from 'bunfig'
   const { port, host } = await config({ name: 'app' })
   ```

</div>

<!-- ## What Developers Say

> "bunfig made our configuration management so much simpler. The automatic environment variable detection is a game-changer."
>
> — **Sarah Chen**, Senior Developer at TechCorp

> "Finally, a config library that understands TypeScript. The validation features caught so many issues before they hit production."
>
> — **Miguel Rodriguez**, DevOps Engineer

> "Zero dependencies and lightning fast. Perfect for our microservices architecture."
>
> — **Alex Kumar**, Platform Architect -->

<Home />
