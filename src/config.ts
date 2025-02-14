import type { ConfigNames } from './generated/config-types'
import type { Config } from './types'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { deepMerge } from './utils'

export async function config<T>(
  nameOrOptions: ConfigNames | Config<T> = { defaultConfig: {} as T },
): Promise<T> {
  if (typeof nameOrOptions === 'string') {
    const { cwd } = await import('node:process')

    return await loadConfig({
      name: nameOrOptions,
      cwd: cwd(),
      generatedDir: './generated',
      configDir: './config',
      defaultConfig: {} as T,
    })
  }

  return await loadConfig(nameOrOptions)
}

/**
 * Attempts to load a config file from a specific path
 */
export async function tryLoadConfig<T>(configPath: string, defaultConfig: T): Promise<T | null> {
  if (!existsSync(configPath))
    return null

  try {
    const importedConfig = await import(configPath)
    const loadedConfig = importedConfig.default || importedConfig

    // Return null if the loaded config is not a valid object
    if (typeof loadedConfig !== 'object' || loadedConfig === null || Array.isArray(loadedConfig))
      return null

    // Validate that the loaded config can be merged with the default config
    try {
      return deepMerge(defaultConfig, loadedConfig) as T
    }
    catch {
      return null
    }
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
  name = '',
  cwd,
  defaultConfig,
  configDir,
  generatedDir,
  endpoint,
  headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
}: Config<T>): Promise<T> {
  // If running in a server environment, load the config from the file system
  if (typeof window === 'undefined') {
    const baseDir = cwd || process.cwd()
    const extensions = ['.ts', '.js', '.mjs', '.cjs', '.json']

    // Try loading config in order of preference
    const configPaths = [
      `${name}.config`,
      `.${name}.config`,
      name,
      `.${name}`,
    ]

    for (const configPath of configPaths) {
      for (const ext of extensions) {
        const fullPath = resolve(baseDir, `${configPath}${ext}`)
        const config = await tryLoadConfig(fullPath, defaultConfig)
        if (config !== null)
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

export const defaultConfigDir: string = resolve(
  process.cwd(),
  'config',
)

export const defaultGeneratedDir: string = resolve(
  process.cwd(),
  'src/generated',
)

export function generateConfigTypes(options: {
  configDir: string
  generatedDir: string
}): void {
  const configDir = resolve(process.cwd(), options.configDir)
  const generatedDir = resolve(process.cwd(), options.generatedDir)
  const outputFile = resolve(generatedDir, 'config-types.ts')

  // Create generated directory if it doesn't exist
  if (!existsSync(dirname(outputFile)))
    mkdirSync(dirname(outputFile), { recursive: true, mode: 0o777 })

  // Default to empty array if config dir doesn't exist
  const files = existsSync(configDir)
    ? readdirSync(configDir).map(file => file.replace(/\.(ts|js|mjs|cjs|json)$/, ''))
    : []

  const content = `// Generated by bunfig
export type ConfigNames = ${files.length ? `'${files.join('\' | \'')}'` : 'string'}
`

  writeFileSync(outputFile, content, { mode: 0o666 })
}
