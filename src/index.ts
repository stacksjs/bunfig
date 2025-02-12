import type { Config } from './types'
import { resolve } from 'node:path'
import { deepMerge } from './utils'

/**
 * Attempts to load a config file from a specific path
 */
async function tryLoadConfig<T>(configPath: string, defaultConfig: T): Promise<T | null> {
  try {
    const importedConfig = await import(configPath)
    const loadedConfig = importedConfig.default || importedConfig
    return deepMerge(defaultConfig, loadedConfig) as T
  }
  catch {
    return null
  }
}

/**
 * Load Config
 *
 * @param {object} options - The configuration options.
 * @param {string} options.name - The name of the configuration file.
 * @param {string} [options.cwd] - The current working directory.
 * @param {string} [options.endpoint] - The API endpoint to fetch config from in browser environments.
 * @param {string} [options.headers] - The headers to send with the request in browser environments.
 * @param {T} options.defaultConfig - The default configuration.
 * @returns {Promise<T>} The merged configuration.
 * @example ```ts
 * // Merges arrays if both configs are arrays, otherwise does object deep merge
 * await loadConfig({
 *   name: 'example',
 *   endpoint: '/api/my-custom-config/endpoint',
 *   defaultConfig: [{ foo: 'bar' }]
 * })
 * ```
 */
export async function loadConfig<T>({
  name,
  cwd,
  defaultConfig,
  endpoint,
  headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
}: Config<T>): Promise<T> {
  // If running in a server environment, load the config from the file system
  if (typeof window === 'undefined') {
    const baseDir = cwd || '../../../'

    // Try loading config in order of preference
    const configPaths = [
      `${name}.config`,
      `.${name}.config`,
      name,
      `.${name}`,
    ]

    for (const configPath of configPaths) {
      const fullPath = resolve(baseDir, configPath)
      const config = await tryLoadConfig(fullPath, defaultConfig)
      if (config !== null) {
        return config
      }
    }

    console.error('Failed to load client config from any expected location')

    return defaultConfig
  }

  // Browser environment checks
  if (!endpoint) {
    console.warn('An API endpoint is required to load the client config.')
    return defaultConfig
  }

  // If running in a browser environment, load the config from an API endpoint
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const loadedConfig = await response.json() as T
    return deepMerge(defaultConfig, loadedConfig) as T
  }
  catch (error) {
    console.error('Failed to load client config:', error)
    return defaultConfig
  }
}

export * from './types'
export * from './utils'
