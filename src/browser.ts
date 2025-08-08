import type { Config } from './types'
import { deepMergeWithArrayStrategy } from './utils'

/**
 * Apply environment variables to config in browser context
 * This function attempts to use environment variables that might have been
 * embedded during the build process by tools like Vite or webpack
 *
 * @param name - The config name
 * @param config - The config object to apply env vars to
 * @returns The config with environment variables applied
 */
function applyBrowserEnvVarsToConfig<T extends Record<string, any>>(
  name: string,
  config: T,
): T {
  // In browser environments, env vars can come from different sources depending on the build tool
  // For example: Vite uses import.meta.env, webpack uses process.env, etc.
  // Try to access env vars safely without assuming a specific pattern
  const env: Record<string, string> = {}

  // Check for common environment patterns in browser builds
  if (typeof window !== 'undefined') {
    // Check for Vite-style env vars (import.meta.env)
    const importMeta = (window as any).import?.meta?.env
    if (importMeta && typeof importMeta === 'object') {
      Object.assign(env, importMeta)
    }

    // Check for webpack-style injected process.env
    const processEnv = (window as any).process?.env
    if (processEnv && typeof processEnv === 'object') {
      Object.assign(env, processEnv)
    }
  }

  if (!name || Object.keys(env).length === 0)
    return config

  const envPrefix = name.toUpperCase().replace(/-/g, '_')
  const result = { ...config }

  // Recursively process the config object
  function processObject(obj: Record<string, any>, path: string[] = []): Record<string, any> {
    const result = { ...obj }

    for (const [key, value] of Object.entries(obj)) {
      const envPath = [...path, key]

      // Format the environment variable key:
      // 1. Convert camelCase to UPPER_SNAKE_CASE
      // 2. Join path segments with underscores
      const formatKey = (k: string) => k.replace(/([A-Z])/g, '_$1').toUpperCase()
      const envKey = `${envPrefix}_${envPath.map(formatKey).join('_')}`

      // Also support the old format without the extra underscores (for backward compatibility)
      const oldEnvKey = `${envPrefix}_${envPath.map(p => p.toUpperCase()).join('_')}`

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Process nested objects recursively
        result[key] = processObject(value, envPath)
      }
      else {
        // Apply environment variable if it exists (check both formats)
        const envValue = env[envKey] || env[oldEnvKey]
        if (envValue !== undefined) {
          if (typeof value === 'number') {
            result[key] = Number(envValue)
          }
          else if (typeof value === 'boolean') {
            result[key] = envValue.toLowerCase() === 'true'
          }
          else if (Array.isArray(value)) {
            try {
              // First try to parse as JSON
              const parsed = JSON.parse(envValue)
              if (Array.isArray(parsed)) {
                result[key] = parsed
              }
              else {
                // If it's not an array, try comma-separated values
                result[key] = envValue.split(',').map(item => item.trim())
              }
            }
            catch {
              // If parsing as JSON fails, use comma-separated values
              result[key] = envValue.split(',').map(item => item.trim())
            }
          }
          else {
            result[key] = envValue
          }
        }
      }
    }

    return result
  }

  return processObject(result) as T
}

/**
 * Loads configuration in a browser environment.
 *
 * @template T - The type of the configuration object
 * @param {object} options - The configuration options
 * @param {string} options.name - The name of the configuration
 * @param {string} options.endpoint - The API endpoint to fetch config from
 * @param {T} options.defaultConfig - The default configuration values
 * @param {Record<string, string>} [options.headers] - Optional headers to include in the request
 * @param {boolean} [options.checkEnv] - Whether to check for environment variables
 *                                     (in browser context, this only has an effect if environment
 *                                     variables are made available at build time)
 * @returns {Promise<T>} The merged configuration
 *
 * @remarks
 * In browser environments, environment variables aren't directly accessible like in Node.js.
 * While the `checkEnv` option is still available for consistency, environment variables
 * can only be used in the browser if they are:
 *
 * 1. Embedded during the build process (e.g., using build tools like Vite, webpack)
 * 2. Made available through the response from the config endpoint
 *
 * @example
 * ```typescript
 * const config = await loadConfig({
 *   name: 'my-app',
 *   endpoint: '/api/config',
 *   defaultConfig: {
 *     theme: 'light',
 *     language: 'en'
 *   }
 * })
 * ```
 */
export async function loadConfig<T>({
  name = '',
  endpoint,
  defaultConfig,
  headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  checkEnv = true,
  arrayStrategy = 'replace',
}: Pick<Config<T>, 'name' | 'endpoint' | 'defaultConfig' | 'headers' | 'checkEnv' | 'arrayStrategy'>): Promise<T> {
  // Apply environment variables to default config if enabled and typeof defaultConfig is an object
  const configWithEnvVars = checkEnv && name && typeof defaultConfig === 'object' && defaultConfig !== null && !Array.isArray(defaultConfig)
    ? applyBrowserEnvVarsToConfig(name, defaultConfig as Record<string, any>) as T
    : defaultConfig

  if (!endpoint) {
    console.warn('An API endpoint is required to load the client config.')
    return configWithEnvVars
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)

    const loadedConfig = await response.json() as T

    // Validate that the loaded config can be merged with the default config
    try {
      return deepMergeWithArrayStrategy(configWithEnvVars, loadedConfig, arrayStrategy) as T
    }
    catch {
      return configWithEnvVars
    }
  }
  catch (error) {
    console.error('Failed to load client config:', error)
    return configWithEnvVars
  }
}

/**
 * Check if code is running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function'
}
