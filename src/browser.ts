import type { Config } from './types'
import { deepMerge } from './utils'

/**
 * Load config in browser environment
 *
 * @param name - The name of the configuration
 * @param endpoint - The API endpoint to fetch config from
 * @param defaultConfig - The default configuration
 * @param headers - Optional headers to include in the request
 * @returns The merged configuration
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
