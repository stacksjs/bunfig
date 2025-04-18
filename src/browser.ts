import type { Config } from './types'
import { deepMerge } from './utils'

/**
 * Loads configuration in a browser environment.
 *
 * @template T - The type of the configuration object
 * @param {object} options - The configuration options
 * @param {string} options.name - The name of the configuration
 * @param {string} options.endpoint - The API endpoint to fetch config from
 * @param {T} options.defaultConfig - The default configuration values
 * @param {Record<string, string>} [options.headers] - Optional headers to include in the request
 * @returns {Promise<T>} The merged configuration
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
  name: _name,
  endpoint,
  defaultConfig,
  headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
}: Pick<Config<T>, 'name' | 'endpoint' | 'defaultConfig' | 'headers'>): Promise<T> {
  if (!endpoint) {
    console.warn('An API endpoint is required to load the client config.')
    return defaultConfig
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
      return deepMerge(defaultConfig, loadedConfig) as T
    }
    catch {
      return defaultConfig
    }
  }
  catch (error) {
    console.error('Failed to load client config:', error)
    return defaultConfig
  }
}

/**
 * Check if code is running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function'
}
