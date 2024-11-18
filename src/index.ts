import type { Config } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { deepMerge } from './utils'

/**
 * Load Config
 *
 * @param {object} options - The configuration options.
 * @param {string} options.name - The name of the configuration file.
 * @param {string} [options.cwd] - The current working directory.
 * @param {T} options.defaultConfig - The default configuration.
 * @returns {Promise<T>} The merged configuration.
 * @example ```ts
 * // Merges arrays if both configs are arrays, otherwise does object deep merge
 * await loadConfig({
 *   name: 'example',
 *   defaultConfig: [{ foo: 'bar' }]
 * })
 * ```
 */
export async function loadConfig<T>({ name, cwd, defaultConfig }: Config<T>): Promise<T> {
  const configPath = resolve(cwd || process.cwd(), `${name}.config`)

  try {
    const importedConfig = await import(configPath)
    const loadedConfig = importedConfig.default || importedConfig
    return deepMerge(defaultConfig, loadedConfig)
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (error: any) {
    return defaultConfig
  }
}

export * from './types'
