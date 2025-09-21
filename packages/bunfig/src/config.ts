import type { ArrayMergeStrategy, Config, ConfigResult, ConfigSource, EnhancedConfig, PerformanceMetrics } from './types'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { Logger } from '@stacksjs/clarity'
import { version } from '../../../package.json'
import { globalCache } from './cache'
import { ErrorFactory } from './errors'
import { EnvProcessor } from './services/env-processor'
import { ConfigFileLoader } from './services/file-loader'
import { ConfigValidator } from './services/validator'
import { deepMergeWithArrayStrategy } from './utils'

const log = new Logger('bunfig', {
  showTags: true,
})

type ConfigNames = string

/**
 * Configuration loading service that orchestrates all other services
 */
export class ConfigLoader {
  private fileLoader = new ConfigFileLoader()
  private envProcessor = new EnvProcessor()
  private validator = new ConfigValidator()

  /**
   * Load configuration with enhanced features
   */
  async loadConfig<T>(options: EnhancedConfig<T>): Promise<ConfigResult<T>> {
    const startTime = Date.now()
    const {
      cache,
      performance,
      schema,
      validate: customValidator,
      ...baseOptions
    } = options

    try {
      // Check cache first if enabled
      if (cache?.enabled) {
        const cached = this.checkCache<T>(baseOptions.name || '', baseOptions)
        if (cached) {
          return cached
        }
      }

      // Load configuration through multiple strategies
      let result: ConfigResult<T>
      try {
        result = await this.loadConfigurationStrategies(baseOptions, true, cache)
      }
      catch (error) {
        // Handle ConfigLoadError gracefully by falling back to defaults
        if (error instanceof Error && error.name === 'ConfigLoadError') {
          // Check if this is a syntax error (recoverable) or permission error (not recoverable)
          const isPermissionError = error.message.includes('EACCES')
            || error.message.includes('EPERM')
            || error.message.includes('permission denied')

          const isSyntaxError = !isPermissionError && (
            error.message.includes('syntax')
            || error.message.includes('Expected')
            || error.message.includes('Unexpected')
            || error.message.includes('BuildMessage')
            || error.message.includes('errors building')
          )

          // Check if this is strict error handling mode (enhanced API)
          const isStrictMode = (baseOptions as any).__strictErrorHandling
          const isStructureError = error.message.includes('Configuration must export a valid object')
            || error.message.includes('Configuration file is empty and exports nothing')

          if (isSyntaxError && (!isStrictMode || !isStructureError)) {
            // Fall back to environment variables + defaults for syntax errors
            const envResult = await this.applyEnvironmentVariables(
              baseOptions.name || '',
              baseOptions.defaultConfig,
              baseOptions.checkEnv !== false,
              baseOptions.verbose || false,
            )
            result = {
              ...envResult,
              warnings: [`Configuration file has syntax errors, using defaults with environment variables`],
            }
          }
          else {
            // Re-throw non-syntax errors (like permission errors and structure errors)
            throw error
          }
        }
        else {
          // Re-throw other errors (like ConfigNotFoundError)
          throw error
        }
      }

      // Apply validation if schema or custom validator is provided
      if (schema || customValidator) {
        await this.validateConfiguration(result.config, schema, customValidator, baseOptions.name)
      }

      // Cache the result if caching is enabled
      if (cache?.enabled && result) {
        this.cacheResult(baseOptions.name || '', result, cache, baseOptions)
      }

      // Record performance metrics
      if (performance?.enabled) {
        const metrics: PerformanceMetrics = {
          operation: 'loadConfig',
          duration: Date.now() - startTime,
          configName: baseOptions.name,
          timestamp: new Date(),
        }

        if (performance.onMetrics) {
          performance.onMetrics(metrics)
        }

        if (performance.slowThreshold && metrics.duration > performance.slowThreshold) {
          log.warn(`Slow configuration loading detected: ${metrics.duration}ms for ${baseOptions.name}`)
        }

        result.metrics = metrics
      }

      return result
    }
    catch (error) {
      const duration = Date.now() - startTime
      log.error(`Configuration loading failed after ${duration}ms:`, error)
      throw error
    }
  }

  /**
   * Load configuration using multiple strategies in priority order
   */
  private async loadConfigurationStrategies<T>(options: Config<T>, throwOnNotFound = false, cacheOptions?: NonNullable<EnhancedConfig<T>['cache']>): Promise<ConfigResult<T>> {
    const {
      name = '',
      alias,
      cwd,
      configDir,
      defaultConfig,
      checkEnv = true,
      arrayStrategy = 'replace',
      verbose = false,
    } = options

    const baseDir = cwd || process.cwd()
    const searchPaths: string[] = []

    // 1. Try local configuration files
    const localResult = await this.loadLocalConfiguration(
      name,
      alias,
      baseDir,
      configDir,
      defaultConfig,
      arrayStrategy,
      verbose,
      checkEnv,
      cacheOptions,
    )

    if (localResult) {
      searchPaths.push(...this.getLocalSearchPaths(name, alias, baseDir, configDir))
      return this.finalizeResult(localResult, searchPaths, checkEnv, name, verbose)
    }

    // 2. Try home directory configuration
    const homeResult = await this.loadHomeConfiguration(
      name,
      alias,
      defaultConfig,
      arrayStrategy,
      verbose,
      checkEnv,
    )

    if (homeResult) {
      searchPaths.push(...this.getHomeSearchPaths(name, alias))
      return this.finalizeResult(homeResult, searchPaths, checkEnv, name, verbose)
    }

    // 3. Try package.json configuration
    const packageResult = await this.loadPackageJsonConfiguration(
      name,
      alias,
      baseDir,
      defaultConfig,
      arrayStrategy,
      verbose,
      checkEnv,
    )

    if (packageResult) {
      searchPaths.push(resolve(baseDir, 'package.json'))
      return this.finalizeResult(packageResult, searchPaths, checkEnv, name, verbose)
    }

    // 4. Fall back to environment variables + defaults
    searchPaths.push(...this.getAllSearchPaths(name, alias, baseDir, configDir))

    if (throwOnNotFound) {
      throw ErrorFactory.configNotFound(name, searchPaths, alias)
    }

    const envResult = await this.applyEnvironmentVariables(
      name,
      defaultConfig,
      checkEnv,
      verbose,
    )

    return {
      ...envResult,
      warnings: [`No configuration file found for "${name}"${alias ? ` or alias "${alias}"` : ''}, using defaults with environment variables`],
    }
  }

  /**
   * Load configuration from local project files
   */
  private async loadLocalConfiguration<T>(
    name: string,
    alias: string | undefined,
    baseDir: string,
    configDir: string | undefined,
    defaultConfig: T,
    arrayStrategy: ArrayMergeStrategy,
    verbose: boolean,
    checkEnv: boolean,
    cacheOptions?: NonNullable<EnhancedConfig<T>['cache']>,
  ): Promise<{ config: T, source: ConfigSource } | null> {
    // Apply environment variables to default config before merging with file config
    // This ensures file config has higher priority than environment variables
    const envDefaultConfig = checkEnv
      ? applyEnvVarsToConfig(name, defaultConfig as any, verbose) as T
      : defaultConfig

    const searchDirectories = this.getLocalDirectories(baseDir, configDir)

    for (const directory of searchDirectories) {
      if (verbose) {
        log.info(`Searching for configuration in: ${directory}`)
      }

      const configPaths = this.fileLoader.generateConfigPaths(name, directory, alias)
      const result = await this.fileLoader.tryLoadFromPaths(
        configPaths,
        envDefaultConfig,
        {
          arrayStrategy,
          verbose,
          cacheTtl: cacheOptions?.ttl,
          useCache: !cacheOptions?.ttl || cacheOptions.ttl > 100, // Disable file cache for very short TTL
        },
      )

      if (result) {
        if (verbose) {
          log.success(`Configuration loaded from: ${result.source.path}`)
        }
        return result
      }
    }

    return null
  }

  /**
   * Load configuration from home directory
   */
  private async loadHomeConfiguration<T>(
    name: string,
    alias: string | undefined,
    defaultConfig: T,
    arrayStrategy: ArrayMergeStrategy,
    verbose: boolean,
    checkEnv: boolean,
  ): Promise<{ config: T, source: ConfigSource } | null> {
    if (!name)
      return null

    // Apply environment variables to default config before merging with file config
    const envDefaultConfig = checkEnv
      ? applyEnvVarsToConfig(name, defaultConfig as any, verbose) as T
      : defaultConfig

    const homeDirectories = [
      resolve(homedir(), '.config', name),
      resolve(homedir(), '.config'),
      homedir(),
    ]

    for (const directory of homeDirectories) {
      if (verbose) {
        log.info(`Checking home directory: ${directory}`)
      }

      const configPaths = this.fileLoader.generateConfigPaths(name, directory, alias)
      const result = await this.fileLoader.tryLoadFromPaths(
        configPaths,
        envDefaultConfig,
        { arrayStrategy, verbose },
      )

      if (result) {
        if (verbose) {
          log.success(`Configuration loaded from home directory: ${result.source.path}`)
        }
        return result
      }
    }

    return null
  }

  /**
   * Load configuration from package.json
   */
  private async loadPackageJsonConfiguration<T>(
    name: string,
    alias: string | undefined,
    baseDir: string,
    defaultConfig: T,
    arrayStrategy: ArrayMergeStrategy,
    verbose: boolean,
    checkEnv: boolean,
  ): Promise<{ config: T, source: ConfigSource } | null> {
    // Apply environment variables to default config before merging with package.json config
    const envDefaultConfig = checkEnv
      ? applyEnvVarsToConfig(name, defaultConfig as any, verbose) as T
      : defaultConfig

    try {
      const pkgPath = resolve(baseDir, 'package.json')
      if (!existsSync(pkgPath)) {
        return null
      }

      const pkg = await import(pkgPath)

      // Try primary name first, then alias
      let pkgConfig = pkg[name]
      let usedName = name

      if (!pkgConfig && alias) {
        pkgConfig = pkg[alias]
        usedName = alias
      }

      if (pkgConfig && typeof pkgConfig === 'object' && !Array.isArray(pkgConfig)) {
        if (verbose) {
          log.success(`Configuration loaded from package.json: ${usedName}`)
        }

        const mergedConfig = deepMergeWithArrayStrategy(envDefaultConfig, pkgConfig, arrayStrategy) as T

        return {
          config: mergedConfig,
          source: {
            type: 'package.json',
            path: pkgPath,
            priority: 30,
            timestamp: new Date(),
          },
        }
      }
    }
    catch (error) {
      if (verbose) {
        log.warn(`Failed to load package.json:`, error)
      }
    }

    return null
  }

  /**
   * Apply environment variables to configuration
   */
  private async applyEnvironmentVariables<T>(
    name: string,
    config: T,
    checkEnv: boolean,
    verbose: boolean,
  ): Promise<{ config: T, source: ConfigSource }> {
    if (!checkEnv || !name || typeof config !== 'object' || config === null || Array.isArray(config)) {
      return {
        config,
        source: {
          type: 'default',
          priority: 10,
          timestamp: new Date(),
        },
      }
    }

    const processedConfig = applyEnvVarsToConfig(name, config as any, verbose) as T

    return {
      config: processedConfig,
      source: {
        type: 'environment',
        priority: 20,
        timestamp: new Date(),
      },
    }
  }

  /**
   * Finalize configuration result with environment variables
   */
  private async finalizeResult<T>(
    result: { config: T, source: ConfigSource },
    _searchPaths: string[],
    _checkEnv: boolean,
    _name: string,
    _verbose: boolean,
  ): Promise<ConfigResult<T>> {
    // Environment variables should be applied before file config merging
    // to ensure file configs have higher priority
    // The result already contains the file config merged with defaults,
    // so we don't need to apply env vars again as they would override file config
    return {
      config: result.config,
      source: result.source,
      path: result.source.path,
    }
  }

  /**
   * Validate configuration if schema or custom validator is provided
   */
  private async validateConfiguration<T>(
    config: T,
    schema: string | object | undefined,
    customValidator: ((config: T) => string[] | void) | undefined,
    configName?: string,
  ): Promise<void> {
    const errors: string[] = []

    // Custom validation first
    if (customValidator) {
      const customErrors = customValidator(config)
      if (customErrors) {
        errors.push(...customErrors)
      }
    }

    // Schema validation
    if (schema) {
      const validationResult = await this.validator.validateConfiguration(config, schema)
      if (!validationResult.isValid) {
        errors.push(...validationResult.errors.map(e =>
          e.path ? `${e.path}: ${e.message}` : e.message,
        ))
      }
    }

    if (errors.length > 0) {
      throw ErrorFactory.configValidation(
        configName || 'unknown',
        errors,
        configName,
      )
    }
  }

  /**
   * Check cache for existing configuration
   */
  private checkCache<T>(configName: string, options: Config<T>): ConfigResult<T> | null {
    const cacheKey = this.generateCacheKey(configName, options)
    const result = globalCache.get<ConfigResult<T>>(cacheKey)
    return result
  }

  /**
   * Cache configuration result
   */
  private cacheResult<T>(
    configName: string,
    result: ConfigResult<T>,
    cacheOptions: NonNullable<EnhancedConfig<T>['cache']>,
    options: Config<T>,
  ): void {
    const cacheKey = this.generateCacheKey(configName, options)
    globalCache.set(cacheKey, result, undefined, cacheOptions.ttl)
  }

  /**
   * Generate cache key for configuration
   */
  private generateCacheKey(configName: string, options: Partial<Config<unknown>>): string {
    const keyParts = [configName]

    if (options.alias)
      keyParts.push(`alias:${options.alias}`)
    if (options.cwd)
      keyParts.push(`cwd:${options.cwd}`)
    if (options.configDir)
      keyParts.push(`configDir:${options.configDir}`)

    return keyParts.join('|')
  }

  /**
   * Get local search directories
   */
  private getLocalDirectories(baseDir: string, configDir?: string): string[] {
    return Array.from(new Set([
      baseDir,
      resolve(baseDir, 'config'),
      resolve(baseDir, '.config'),
      configDir ? resolve(baseDir, configDir) : undefined,
    ].filter(Boolean) as string[]))
  }

  /**
   * Get all potential search paths for error reporting
   */
  private getAllSearchPaths(
    name: string,
    alias: string | undefined,
    baseDir: string,
    configDir?: string,
  ): string[] {
    const paths: string[] = []

    // Local paths
    paths.push(...this.getLocalSearchPaths(name, alias, baseDir, configDir))

    // Home paths
    paths.push(...this.getHomeSearchPaths(name, alias))

    // Package.json
    paths.push(resolve(baseDir, 'package.json'))

    return paths
  }

  /**
   * Get local search paths
   */
  private getLocalSearchPaths(
    name: string,
    alias: string | undefined,
    baseDir: string,
    configDir?: string,
  ): string[] {
    const directories = this.getLocalDirectories(baseDir, configDir)
    const paths: string[] = []

    for (const directory of directories) {
      paths.push(...this.fileLoader.generateConfigPaths(name, directory, alias))
    }

    return paths
  }

  /**
   * Get home directory search paths
   */
  private getHomeSearchPaths(name: string, alias: string | undefined): string[] {
    if (!name)
      return []

    const homeDirectories = [
      resolve(homedir(), '.config', name),
      resolve(homedir(), '.config'),
      homedir(),
    ]

    const paths: string[] = []

    for (const directory of homeDirectories) {
      paths.push(...this.fileLoader.generateConfigPaths(name, directory, alias))
    }

    return paths
  }

  /**
   * Load configuration with enhanced features (alias for backward compatibility)
   */
  async loadConfigWithResult<T>(options: EnhancedConfig<T>): Promise<ConfigResult<T>> {
    return this.loadConfig(options)
  }
}

// Global configuration loader instance
const globalConfigLoader = new ConfigLoader()

/**
 * Helper function to determine if a ConfigLoadError should be handled gracefully
 */
function shouldHandleConfigLoadErrorGracefully(error: Error): boolean {
  const isPermissionError = error.message.includes('EACCES')
    || error.message.includes('EPERM')
    || error.message.includes('permission denied')

  const isSyntaxError = !isPermissionError && (
    error.message.includes('syntax')
    || error.message.includes('Expected')
    || error.message.includes('Unexpected')
    || error.message.includes('BuildMessage')
  )

  // For legacy APIs, also handle structure errors gracefully
  const isStructureError = error.message.includes('Configuration must export a valid object')
    || error.message.includes('Configuration file is empty and exports nothing')

  return isSyntaxError || isStructureError
}

/**
 * Enhanced configuration loading function that returns full result
 */
export async function loadConfigWithResult<T>(options: EnhancedConfig<T>): Promise<ConfigResult<T>> {
  // Enhanced API should not handle structure errors gracefully
  return globalConfigLoader.loadConfig({
    ...options,
    __strictErrorHandling: true,
  } as any)
}

/**
 * Standard configuration loading function that returns just the config (backward compatible)
 */
export async function loadConfig<T>(options: Config<T> | EnhancedConfig<T>): Promise<T> {
  // Check if it's enhanced config by looking for enhanced-specific properties
  const isEnhanced = 'cache' in options || 'performance' in options || 'schema' in options || 'validate' in options

  try {
    if (isEnhanced) {
      const result = await globalConfigLoader.loadConfig(options as EnhancedConfig<T>)
      return result.config
    }
    else {
      // For backward compatibility, convert Config<T> to EnhancedConfig<T>
      const result = await globalConfigLoader.loadConfig({
        ...options,
        cache: { enabled: true },
        performance: { enabled: false },
      } as EnhancedConfig<T>)
      return result.config
    }
  }
  catch (error) {
    // For backward compatibility, handle ConfigNotFoundError and some ConfigLoadError gracefully
    if (error instanceof Error && (error.name === 'ConfigNotFoundError'
      || (error.name === 'ConfigLoadError' && shouldHandleConfigLoadErrorGracefully(error)))) {
      const configOptions = isEnhanced
        ? options
        : {
            ...options,
            cache: { enabled: true },
            performance: { enabled: false },
          } as EnhancedConfig<T>

      // Fall back to environment variables + defaults
      const envResult = await globalConfigLoader.applyEnvironmentVariables(
        configOptions.name || '',
        configOptions.defaultConfig,
        configOptions.checkEnv !== false,
        configOptions.verbose || false,
      )
      return envResult.config
    }

    // Re-throw other errors
    throw error
  }
}

/**
 * Legacy config function for backward compatibility
 */
export async function config<T>(
  nameOrOptions: ConfigNames | Config<T> = { defaultConfig: {} as T },
): Promise<T> {
  if (typeof nameOrOptions === 'string') {
    const { cwd } = await import('node:process')

    try {
      const result = await globalConfigLoader.loadConfig({
        name: nameOrOptions,
        cwd: cwd(),
        generatedDir: './generated',
        configDir: './config',
        defaultConfig: {} as T,
        checkEnv: true,
        arrayStrategy: 'replace',
      })
      return result.config
    }
    catch (error) {
      // For backward compatibility, handle ConfigNotFoundError and some ConfigLoadError gracefully
      if (error instanceof Error && (error.name === 'ConfigNotFoundError'
        || (error.name === 'ConfigLoadError' && shouldHandleConfigLoadErrorGracefully(error)))) {
        // Fall back to environment variables + defaults
        const envResult = await globalConfigLoader.applyEnvironmentVariables(
          nameOrOptions,
          {} as T,
          true,
          false,
        )
        return envResult.config
      }

      // Re-throw other errors
      throw error
    }
  }

  try {
    const result = await globalConfigLoader.loadConfig({
      ...nameOrOptions,
      cwd: nameOrOptions.cwd || process.cwd(),
      cache: { enabled: true },
      performance: { enabled: false },
    })

    return result.config
  }
  catch (error) {
    // For backward compatibility, handle ConfigNotFoundError and some ConfigLoadError gracefully
    if (error instanceof Error && (error.name === 'ConfigNotFoundError'
      || (error.name === 'ConfigLoadError' && shouldHandleConfigLoadErrorGracefully(error)))) {
      // Fall back to environment variables + defaults
      const envResult = await globalConfigLoader.applyEnvironmentVariables(
        nameOrOptions.name || '',
        nameOrOptions.defaultConfig || ({} as T),
        nameOrOptions.checkEnv !== false,
        nameOrOptions.verbose || false,
      )
      return envResult.config
    }

    // Re-throw other errors
    throw error
  }
}

/**
 * Attempts to load a config file from a specific path (backward compatibility)
 */
export async function tryLoadConfig<T>(
  configPath: string,
  defaultConfig: T,
  arrayStrategy: ArrayMergeStrategy = 'replace',
): Promise<T | null> {
  const fileLoader = new ConfigFileLoader()

  try {
    const result = await fileLoader.loadFromPath(configPath, defaultConfig, {
      arrayStrategy,
      useCache: false,
      trackPerformance: false,
    })

    return result ? result.config : null
  }
  catch {
    return null
  }
}

/**
 * Apply environment variables to config based on config name (backward compatibility)
 */
export function applyEnvVarsToConfig<T extends Record<string, any>>(
  name: string,
  config: T,
  verbose = false,
): T {
  // Use synchronous environment variable processing for backward compatibility
  // Note: envProcessor is not used in this function but kept for future use
  const _envProcessor = new EnvProcessor()

  // Create a copy of the config to process
  // Note: processedConfig is not directly used but the object is modified through references

  // Get environment variables for this config name
  const envPrefix = name.toUpperCase().replace(/[^A-Z0-9]/g, '_')

  // Recursively process nested configuration
  function processConfigLevel(obj: any, path: string[] = []): any {
    const result = { ...obj }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key]

      // Try multiple environment variable formats
      const envKeys = [
        `${envPrefix}_${currentPath.join('_').toUpperCase()}`, // snake_case
        `${envPrefix}_${currentPath.map(k => k.toUpperCase()).join('')}`, // UPPERCASE joined
        `${envPrefix}_${currentPath.map(k => k.replace(/([A-Z])/g, '_$1').toUpperCase()).join('')}`, // camelCase to SNAKE_CASE
      ]

      let envValue: string | undefined
      let usedKey: string | undefined

      for (const envKey of envKeys) {
        envValue = process.env[envKey]
        if (envValue !== undefined) {
          usedKey = envKey
          break
        }
      }

      if (envValue !== undefined && usedKey) {
        // Use a safer logging approach that doesn't trigger the no-console lint rule
        if (verbose) {
          // We would log this information in a production-safe way
          // For example: logger.info(`Using environment variable ${usedKey} for config ${name}.${currentPath.join('.')}`);
        }

        // Parse based on the type of the default value
        if (typeof value === 'boolean') {
          result[key] = ['true', '1', 'yes'].includes(envValue.toLowerCase())
        }
        else if (typeof value === 'number') {
          const parsed = Number(envValue)
          if (!Number.isNaN(parsed)) {
            result[key] = parsed
          }
        }
        else if (Array.isArray(value)) {
          try {
            // Try to parse as JSON first
            result[key] = JSON.parse(envValue)
          }
          catch {
            // Fall back to comma-separated values
            result[key] = envValue.split(',').map(s => s.trim())
          }
        }
        else {
          result[key] = envValue
        }
      }
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively process nested objects
        result[key] = processConfigLevel(value, currentPath)
      }
    }

    return result
  }

  return processConfigLevel(config)
}

// Export constants for backward compatibility
export const defaultConfigDir: string = resolve(process.cwd(), 'config')
export const defaultGeneratedDir: string = resolve(process.cwd(), 'src/generated')

/**
 * Generate configuration types
 */
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
