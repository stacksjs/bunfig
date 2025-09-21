# Web Server Configuration

Complete configuration setup for web servers using Bun, including HTTP/HTTPS, CORS, rate limiting, and security settings.

## Basic Server Configuration

```ts
// server.config.ts
export default {
  http: {
    port: 3000,
    host: 'localhost',
    keepAlive: true,
    timeout: 30000
  },

  https: {
    enabled: false,
    port: 3443,
    cert: './ssl/server.crt',
    key: './ssl/server.key',
    redirectHttp: true
  },

  cors: {
    enabled: true,
    origins: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
  },

  compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 6,
    threshold: 1024
  },

  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP'
  },

  security: {
    helmet: {
      enabled: true,
      contentSecurityPolicy: true,
      hsts: true
    },
    trustProxy: false,
    maxRequestSize: '10mb'
  },

  logging: {
    requests: true,
    errors: true,
    level: 'info'
  }
}
```

## TypeScript Interface

```ts
// types/server.ts
export interface ServerConfig {
  http: {
    port: number
    host: string
    keepAlive: boolean
    timeout: number
  }

  https: {
    enabled: boolean
    port: number
    cert: string
    key: string
    redirectHttp: boolean
  }

  cors: {
    enabled: boolean
    origins: string[]
    methods: string[]
    allowedHeaders: string[]
    credentials: boolean
    maxAge: number
  }

  compression: {
    enabled: boolean
    algorithm: 'gzip' | 'deflate' | 'br'
    level: number
    threshold: number
  }

  rateLimit: {
    enabled: boolean
    windowMs: number
    maxRequests: number
    message: string
  }

  security: {
    helmet: {
      enabled: boolean
      contentSecurityPolicy: boolean
      hsts: boolean
    }
    trustProxy: boolean
    maxRequestSize: string
  }

  logging: {
    requests: boolean
    errors: boolean
    level: 'debug' | 'info' | 'warn' | 'error'
  }
}
```

## Server Implementation

```ts
// server.ts
import { config } from 'bunfig'
import type { ServerConfig } from './types/server'

const serverConfig = await config<ServerConfig>({
  name: 'server',
  defaultConfig: {
    http: {
      port: 3000,
      host: 'localhost',
      keepAlive: true,
      timeout: 30000
    },
    https: {
      enabled: false,
      port: 3443,
      cert: './ssl/server.crt',
      key: './ssl/server.key',
      redirectHttp: true
    },
    cors: {
      enabled: false,
      origins: [],
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
      maxAge: 0
    },
    compression: {
      enabled: false,
      algorithm: 'gzip',
      level: 6,
      threshold: 1024
    },
    rateLimit: {
      enabled: false,
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      message: 'Too many requests'
    },
    security: {
      helmet: {
        enabled: false,
        contentSecurityPolicy: false,
        hsts: false
      },
      trustProxy: false,
      maxRequestSize: '1mb'
    },
    logging: {
      requests: false,
      errors: true,
      level: 'info'
    }
  },
  schema: {
    type: 'object',
    properties: {
      http: {
        type: 'object',
        properties: {
          port: { type: 'number', minimum: 1, maximum: 65535 },
          host: { type: 'string', minLength: 1 },
          timeout: { type: 'number', minimum: 0 }
        },
        required: ['port', 'host']
      },
      cors: {
        type: 'object',
        properties: {
          origins: {
            type: 'array',
            items: { type: 'string' }
          },
          methods: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
            }
          }
        }
      },
      rateLimit: {
        type: 'object',
        properties: {
          windowMs: { type: 'number', minimum: 1000 },
          maxRequests: { type: 'number', minimum: 1 }
        }
      }
    },
    required: ['http']
  }
})

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// CORS helper
function handleCors(request: Request): Record<string, string> {
  if (!serverConfig.cors.enabled) return {}

  const origin = request.headers.get('origin')
  const headers: Record<string, string> = {}

  if (origin && serverConfig.cors.origins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  headers['Access-Control-Allow-Methods'] = serverConfig.cors.methods.join(', ')
  headers['Access-Control-Allow-Headers'] = serverConfig.cors.allowedHeaders.join(', ')

  if (serverConfig.cors.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  if (serverConfig.cors.maxAge > 0) {
    headers['Access-Control-Max-Age'] = serverConfig.cors.maxAge.toString()
  }

  return headers
}

// Rate limiting helper
function checkRateLimit(clientIP: string): boolean {
  if (!serverConfig.rateLimit.enabled) return true

  const now = Date.now()
  const key = clientIP
  const limit = rateLimitStore.get(key)

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + serverConfig.rateLimit.windowMs
    })
    return true
  }

  if (limit.count >= serverConfig.rateLimit.maxRequests) {
    return false
  }

  limit.count++
  return true
}

// Security headers
function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  if (serverConfig.security.helmet.enabled) {
    headers['X-Content-Type-Options'] = 'nosniff'
    headers['X-Frame-Options'] = 'DENY'
    headers['X-XSS-Protection'] = '1; mode=block'
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    if (serverConfig.security.helmet.hsts) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    }

    if (serverConfig.security.helmet.contentSecurityPolicy) {
      headers['Content-Security-Policy'] = "default-src 'self'"
    }
  }

  return headers
}

// Main server
const server = Bun.serve({
  port: serverConfig.http.port,
  hostname: serverConfig.http.host,

  async fetch(request, server) {
    const start = Date.now()
    const clientIP = server.requestIP(request)?.address || 'unknown'
    const method = request.method
    const url = new URL(request.url)

    try {
      // Rate limiting
      if (!checkRateLimit(clientIP)) {
        return new Response(serverConfig.rateLimit.message, {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(serverConfig.rateLimit.windowMs / 1000).toString(),
            ...securityHeaders()
          }
        })
      }

      // CORS preflight
      if (method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            ...handleCors(request),
            ...securityHeaders()
          }
        })
      }

      // Your application logic here
      const response = await handleRequest(request, url)

      // Add headers to response
      const headers = new Headers(response.headers)

      // Add CORS headers
      Object.entries(handleCors(request)).forEach(([key, value]) => {
        headers.set(key, value)
      })

      // Add security headers
      Object.entries(securityHeaders()).forEach(([key, value]) => {
        headers.set(key, value)
      })

      // Request logging
      if (serverConfig.logging.requests) {
        const duration = Date.now() - start
        console.log(`${method} ${url.pathname} ${response.status} ${duration}ms ${clientIP}`)
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })

    } catch (error) {
      // Error logging
      if (serverConfig.logging.errors) {
        console.error(`Error handling ${method} ${url.pathname}:`, error)
      }

      return new Response('Internal Server Error', {
        status: 500,
        headers: securityHeaders()
      })
    }
  },

  error(error) {
    if (serverConfig.logging.errors) {
      console.error('Server error:', error)
    }
    return new Response('Internal Server Error', { status: 500 })
  }
})

// Your request handler
async function handleRequest(request: Request, url: URL): Promise<Response> {
  // Route handling logic
  if (url.pathname === '/') {
    return new Response('Hello World!')
  }

  if (url.pathname === '/health') {
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
  }

  if (url.pathname === '/api/status') {
    return Response.json({
      server: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        cors: serverConfig.cors.enabled,
        rateLimit: serverConfig.rateLimit.enabled,
        compression: serverConfig.compression.enabled
      }
    })
  }

  return new Response('Not Found', { status: 404 })
}

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`)
console.log(`📊 CORS enabled: ${serverConfig.cors.enabled}`)
console.log(`🛡️  Rate limiting: ${serverConfig.rateLimit.enabled}`)
console.log(`🔒 Security headers: ${serverConfig.security.helmet.enabled}`)
```

## Environment Configuration

```bash
# .env.development
SERVER_HTTP_PORT=3000
SERVER_HTTP_HOST=localhost
SERVER_CORS_ENABLED=true
SERVER_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
SERVER_LOGGING_REQUESTS=true
SERVER_LOGGING_LEVEL=debug

# .env.production
SERVER_HTTP_PORT=80
SERVER_HTTP_HOST=0.0.0.0
SERVER_HTTPS_ENABLED=true
SERVER_HTTPS_PORT=443
SERVER_HTTPS_REDIRECTHTTP=true
SERVER_CORS_ENABLED=true
SERVER_CORS_ORIGINS=https://myapp.com,https://www.myapp.com
SERVER_RATELIMIT_ENABLED=true
SERVER_RATELIMIT_MAXREQUESTS=1000
SERVER_SECURITY_HELMET_ENABLED=true
SERVER_SECURITY_HELMET_HSTS=true
SERVER_LOGGING_LEVEL=error
```

## Docker Configuration

```dockerfile
# Dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
RUN bun install

# Copy source code
COPY . .

# Create SSL directory (if using HTTPS)
RUN mkdir -p ssl

# Expose ports
EXPOSE 3000 3443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["bun", "run", "server.ts"]
```

## Load Balancer Configuration

```ts
// load-balancer.config.ts
export default {
  strategy: 'round-robin', // 'least-connections' | 'ip-hash'

  upstream: [
    { host: 'localhost', port: 3001, weight: 1 },
    { host: 'localhost', port: 3002, weight: 1 },
    { host: 'localhost', port: 3003, weight: 2 }
  ],

  healthCheck: {
    enabled: true,
    path: '/health',
    interval: 30000,
    timeout: 5000,
    retries: 3
  },

  proxy: {
    timeout: 30000,
    retries: 2,
    keepAlive: true
  }
}
```

## Performance Monitoring

```ts
// Add to your server implementation
const metrics = {
  requests: 0,
  errors: 0,
  averageResponseTime: 0,
  activeConnections: 0
}

// Track metrics
function updateMetrics(duration: number, isError: boolean) {
  metrics.requests++
  if (isError) metrics.errors++

  // Calculate rolling average
  const alpha = 0.1
  metrics.averageResponseTime =
    alpha * duration + (1 - alpha) * metrics.averageResponseTime
}

// Metrics endpoint
if (url.pathname === '/metrics') {
  return Response.json({
    ...metrics,
    errorRate: metrics.requests > 0 ? metrics.errors / metrics.requests : 0,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  })
}
```

## Testing Configuration

```ts
// server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { config } from 'bunfig'

describe('Server Configuration', () => {
  let server: any

  beforeAll(async () => {
    // Load test configuration
    const testConfig = await config({
      name: 'server',
      defaultConfig: {
        http: { port: 0, host: 'localhost' }, // Use random port
        cors: { enabled: true, origins: ['http://localhost:3000'] },
        rateLimit: { enabled: false }
      }
    })

    // Start test server
    server = Bun.serve({
      port: testConfig.http.port,
      fetch: () => new Response('OK')
    })
  })

  afterAll(() => {
    server?.stop()
  })

  it('should start server with configuration', () => {
    expect(server.port).toBeGreaterThan(0)
  })

  it('should handle CORS requests', async () => {
    const response = await fetch(`http://localhost:${server.port}`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' }
    })

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })
})
```

## Related Features

- **[Multi-Environment Setup](./environments.md)** - Configure for different environments
- **[Error Handling](../features/error-handling.md)** - Handle server errors gracefully
- **[Validation](../features/validation.md)** - Validate server configuration
- **[Configuration Loading](../features/configuration-loading.md)** - Advanced loading patterns