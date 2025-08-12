import type { ArrayMergeStrategy, Config } from './types'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { Logger } from '@stacksjs/clarity'
import { version } from '../package.json'
import { deepMergeWithArrayStrategy } from './utils'

const log = new Logger('bunfig', {
  showTags: true,
})

type ConfigNames = string

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
      checkEnv: true,
      arrayStrategy: 'replace',
    })
  }

  return await loadConfig(nameOrOptions)
}

/**
 * Attempts to load a config file from a specific path
 */
export async function tryLoadConfig<T>(configPath: string, defaultConfig: T, arrayStrategy: ArrayMergeStrategy = 'replace'): Promise<T | null> {
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
      return deepMergeWithArrayStrategy(defaultConfig, loadedConfig, arrayStrategy) as T
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
 * Apply environment variables to config based on config name
 * This is an internal utility used by loadConfig when checkEnv is true
 *
 * @param name - The config name
 * @param config - The config object to apply env vars to
 * @param verbose - Whether to log verbose information
 * @returns The config with environment variables applied
 */
export function applyEnvVarsToConfig<T extends Record<string, any>>(
  name: string,
  config: T,
  verbose = false,
): T {
  if (!name)
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

      if (verbose)
        log.info(`Checking environment variable ${envKey} for config ${name}.${envPath.join('.')}`)

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Process nested objects recursively
        result[key] = processObject(value, envPath)
      }
      else {
        // Apply environment variable if it exists (check both formats)
        const envValue = process.env[envKey] || process.env[oldEnvKey]
        if (envValue !== undefined) {
          // Convert the environment variable to the appropriate type
          if (verbose) {
            log.info(`Using environment variable ${envValue ? envKey : oldEnvKey} for config ${name}.${envPath.join('.')}`)
          }

          if (typeof value === 'number') {
            result[key] = Number(envValue)
          }
          else if (typeof value === 'boolean') {
            result[key] = envValue.toLowerCase() === 'true'
          }
          else if (Array.isArray(value)) {
            try {
              // Try to parse as JSON array first
              const parsed = JSON.parse(envValue)

              if (Array.isArray(parsed)) {
                // Successfully parsed as JSON array
                result[key] = parsed
              }
              else {
                // Parsed successfully but not as array, fall back to comma-separated
                result[key] = envValue.split(',').map(item => item.trim())
              }
            }
            catch {
              // If JSON parsing fails, treat as comma-separated values
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
 * Load Config
 *
 * @param {object} options - The configuration options.
 * @param {string} options.name - The name of the configuration file.
 * @param {ArrayMergeStrategy} [options.arrayStrategy] - The strategy to use when merging arrays.
 * @param {string} [options.alias] - An alternative name to check for config files.
 * @param {string} [options.cwd] - The current working directory.
 * @param {string} [options.configDir] - Additional directory to search for configuration files.
 * @param {T} options.defaultConfig - The default configuration.
 * @param {boolean} [options.verbose] - Whether to log verbose information.
 * @param {boolean} [options.checkEnv] - Whether to check environment variables.
 * @returns {Promise<T>} The merged configuration.
 * @example ```ts
 * await loadConfig({
 *   name: 'example',
 *   defaultConfig: { foo: 'bar' }
 * })
 * ```
 */
export async function loadConfig<T>({
  name = '',
  alias,
  cwd,
  configDir,
  defaultConfig,
  verbose = false,
  checkEnv = true,
  arrayStrategy = 'replace',
}: Config<T>): Promise<T> {
  // Apply environment variables to default config first
  const configWithEnvVars = checkEnv && typeof defaultConfig === 'object' && defaultConfig !== null && !Array.isArray(defaultConfig)
    ? applyEnvVarsToConfig(name, defaultConfig as Record<string, any>, verbose) as T
    : defaultConfig

  // Server environment: load the config from the file system
  const baseDir = cwd || process.cwd()
  const extensions = ['.ts', '.js', '.mjs', '.cjs', '.json']

  if (verbose) {
    log.info(`Loading configuration for "${name}"${alias ? ` (alias: "${alias}")` : ''} from ${baseDir}`)
  }

  // Base pattern sets for primary and alias
  const primaryBarePatterns = [name, `.${name}`].filter(Boolean)
  const primaryConfigSuffixPatterns = [`${name}.config`, `.${name}.config`].filter(Boolean)
  const aliasBarePatterns = alias ? [alias, `.${alias}`] : []
  const aliasConfigSuffixPatterns = alias ? [`${alias}.config`, `.${alias}.config`] : []

  // Determine local directories to search
  const searchDirectories = Array.from(new Set([
    baseDir,
    resolve(baseDir, 'config'),
    resolve(baseDir, '.config'),
    configDir ? resolve(baseDir, configDir) : undefined,
  ].filter(Boolean) as string[]))

  // Try loading config in order of preference for each directory (local directories first)
  for (const dir of searchDirectories) {
    if (verbose)
      log.info(`Searching for configuration in: ${dir}`)

    // Prefer bare names inside config directories to avoid redundant ".config" suffix
    const isConfigLikeDir = [resolve(baseDir, 'config'), resolve(baseDir, '.config')]
      .concat(configDir ? [resolve(baseDir, configDir)] : [])
      .includes(dir)

    const patternsForDir = isConfigLikeDir
      // Primary first, then alias: prefer bare before *.config when inside config dirs
      ? [...primaryBarePatterns, ...primaryConfigSuffixPatterns, ...aliasBarePatterns, ...aliasConfigSuffixPatterns]
      // Primary first, then alias: default order keeps *.config before bare
      : [...primaryConfigSuffixPatterns, ...primaryBarePatterns, ...aliasConfigSuffixPatterns, ...aliasBarePatterns]

    for (const configPath of patternsForDir) {
      for (const ext of extensions) {
        const fullPath = resolve(dir, `${configPath}${ext}`)
        const config = await tryLoadConfig(fullPath, configWithEnvVars, arrayStrategy)
        if (config !== null) {
          if (verbose) {
            log.success(`Configuration loaded from: ${fullPath}`)
          }
          return config
        }
      }
    }
  }

  // Try loading from user's home config directory (~/.config/$name/config.*)
  if (name) {
    const homeConfigDir = resolve(homedir(), '.config', name)
    const homeConfigPatterns = ['config', `${name}.config`]

    // Also try alias patterns in home config dir if alias is provided
    if (alias) {
      homeConfigPatterns.push(`${alias}.config`)
    }

    if (verbose) {
      log.info(`Checking user config directory: ${homeConfigDir}`)
    }

    for (const configPath of homeConfigPatterns) {
      for (const ext of extensions) {
        const fullPath = resolve(homeConfigDir, `${configPath}${ext}`)
        const config = await tryLoadConfig(fullPath, configWithEnvVars, arrayStrategy)
        if (config !== null) {
          if (verbose) {
            log.success(`Configuration loaded from user config directory: ${fullPath}`)
          }
          return config
        }
      }
    }
  }

  // Then try package.json (for both name and alias)
  try {
    const pkgPath = resolve(baseDir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = await import(pkgPath)

      // First try the primary name
      let pkgConfig = pkg[name]

      // If not found and alias is provided, try the alias
      if (!pkgConfig && alias) {
        pkgConfig = pkg[alias]
        if (pkgConfig && verbose) {
          log.success(`Using alias "${alias}" configuration from package.json`)
        }
      }

      if (pkgConfig && typeof pkgConfig === 'object' && !Array.isArray(pkgConfig)) {
        try {
          if (verbose) {
            log.success(`Configuration loaded from package.json: ${pkgConfig === pkg[name] ? name : alias}`)
          }
          return deepMergeWithArrayStrategy(configWithEnvVars, pkgConfig, arrayStrategy) as T
        }
        catch (error) {
          if (verbose) {
            log.warn(`Failed to merge package.json config:`, error)
          }
          // If merging fails, continue to default config
        }
      }
    }
  }
  catch (error) {
    if (verbose) {
      log.warn(`Failed to load package.json:`, error)
    }
    // If package.json loading fails, continue to default config
  }

  if (verbose) {
    log.info(`No configuration found for "${name}"${alias ? ` or alias "${alias}"` : ''}, using default configuration with environment variables`)
  }
  return configWithEnvVars
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
    ? readdirSync(configDir)
        .map(file => file.replace(/\.(ts|js|mjs|cjs|mts|cts|json)$/, ''))
        .sort() // Sort the file names alphabetically
    : []

  const content = `// Generated by bunfig v${version}
export type ConfigNames = ${files.length ? `'${files.join('\' | \'')}'` : 'string'}
`

  writeFileSync(outputFile, content, { mode: 0o666 })
}
