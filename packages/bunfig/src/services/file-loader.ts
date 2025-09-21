import type { ArrayMergeStrategy, ConfigSource } from '../types'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { globalCache, globalPerformanceMonitor } from '../cache'
import { ConfigLoadError, ErrorFactory, withErrorRecovery } from '../errors'
import { deepMergeWithArrayStrategy } from '../utils'

/**
 * File loading options
 */
export interface FileLoadOptions {
  /** Array merge strategy */
  arrayStrategy?: ArrayMergeStrategy
  /** Enable caching */
  useCache?: boolean
  /** Cache TTL in milliseconds */
  cacheTtl?: number
  /** Enable performance monitoring */
  trackPerformance?: boolean
  /** Verbose logging */
  verbose?: boolean
}

/**
 * Configuration file loader service
 */
export class ConfigFileLoader {
  private readonly extensions = ['.ts', '.js', '.mjs', '.cjs', '.json', '.mts', '.cts']

  /**
   * Load configuration from a specific file path
   */
  async loadFromPath<T>(
    configPath: string,
    defaultConfig: T,
    options: FileLoadOptions = {},
  ): Promise<{ config: T, source: ConfigSource } | null> {
    const {
      arrayStrategy = 'replace',
      useCache = true,
      cacheTtl,
      trackPerformance = true,
      verbose = false,
    } = options

    // Check cache first
    if (useCache) {
      const cached = globalCache.getWithFileCheck<{ config: T, source: ConfigSource }>(
        'file',
        configPath,
      )
      if (cached) {
        if (verbose) {
          // eslint-disable-next-line no-console
          console.log(`Configuration loaded from cache: ${configPath}`)
        }
        return cached
      }
    }

    const loadOperation = async () => {
      if (!existsSync(configPath)) {
        return null
      }

      try {
        // Add cache busting for dynamic imports to ensure fresh file content
        const cacheBuster = `?t=${Date.now()}`
        const importedConfig = await import(configPath + cacheBuster)
        const loadedConfig = importedConfig.default || importedConfig

        // Check if the file is completely empty (no exports)
        const hasDefaultExport = 'default' in importedConfig
        const hasNamedExports = Object.keys(importedConfig).length > 0

        if (!hasDefaultExport && !hasNamedExports) {
          throw new ConfigLoadError(
            configPath,
            new Error('Configuration file is empty and exports nothing'),
            'unknown',
          )
        }

        // Validate that the loaded config is a valid object
        if (typeof loadedConfig !== 'object' || loadedConfig === null || Array.isArray(loadedConfig)) {
          throw new ConfigLoadError(
            configPath,
            new Error('Configuration must export a valid object'),
            'unknown',
          )
        }

        // Merge with default config
        const mergedConfig = deepMergeWithArrayStrategy(
          defaultConfig,
          loadedConfig,
          arrayStrategy,
        ) as T

        const source: ConfigSource = {
          type: 'file',
          path: configPath,
          priority: 100,
          timestamp: new Date(),
        }

        const result = { config: mergedConfig, source }

        // Cache the result
        if (useCache) {
          globalCache.setWithFileCheck('file', result, configPath, cacheTtl)
        }

        return result
      }
      catch (error) {
        const bunfigError = error instanceof Error
          ? ErrorFactory.configLoad(configPath, error)
          : ErrorFactory.configLoad(configPath, new Error(String(error)))

        throw bunfigError
      }
    }

    if (trackPerformance) {
      return globalPerformanceMonitor.track(
        'loadFromPath',
        loadOperation,
        { path: configPath },
      )
    }

    return loadOperation()
  }

  /**
   * Try to load configuration from multiple potential paths
   */
  async tryLoadFromPaths<T>(
    configPaths: string[],
    defaultConfig: T,
    options: FileLoadOptions = {},
  ): Promise<{ config: T, source: ConfigSource } | null> {
    for (const configPath of configPaths) {
      try {
        const result = await this.loadFromPath(configPath, defaultConfig, options)
        if (result) {
          return result
        }
      }
      catch (error) {
        // Re-throw ConfigLoadError since it indicates a file was found but has issues
        if (error instanceof Error && error.name === 'ConfigLoadError') {
          throw error
        }
        // Log other errors but continue trying other paths
        if (options.verbose) {
          console.warn(`Failed to load config from ${configPath}:`, error)
        }
      }
    }

    return null
  }

  /**
   * Generate all possible config file paths for a given name and directory
   */
  generateConfigPaths(
    configName: string,
    directory: string,
    alias?: string,
  ): string[] {
    const patterns = this.generateNamePatterns(configName, alias)
    const paths: string[] = []

    for (const pattern of patterns) {
      for (const ext of this.extensions) {
        paths.push(resolve(directory, `${pattern}${ext}`))
      }
    }

    return paths
  }

  /**
   * Generate name patterns for configuration files
   */
  private generateNamePatterns(configName: string, alias?: string): string[] {
    const patterns: string[] = []

    // Standard config file names (highest priority for ~/.config/$name/ directories)
    patterns.push('config', '.config')

    // Primary name patterns (.config suffix has higher priority than bare name for dotfiles)
    if (configName) {
      patterns.push(configName, `.${configName}.config`, `${configName}.config`, `.${configName}`)
    }

    // Alias patterns (.config suffix has higher priority than bare name for dotfiles)
    if (alias) {
      patterns.push(alias, `.${alias}.config`, `${alias}.config`, `.${alias}`)

      // Combined patterns (primary.alias)
      if (configName) {
        patterns.push(`${configName}.${alias}.config`, `.${configName}.${alias}.config`)
      }
    }

    return patterns.filter(Boolean)
  }

  /**
   * Check if a file exists and is readable
   */
  checkFileAccess(filePath: string): Promise<boolean> {
    return withErrorRecovery(
      async () => {
        return existsSync(filePath)
      },
      {
        maxRetries: 2,
        retryDelay: 100,
        fallback: false,
      },
    )
  }

  /**
   * Discover all configuration files in a directory
   */
  async discoverConfigFiles(
    directory: string,
    configName?: string,
    alias?: string,
  ): Promise<string[]> {
    const discoveredFiles: string[] = []

    if (!existsSync(directory)) {
      return discoveredFiles
    }

    if (configName || alias) {
      // Look for specific config files
      const patterns = this.generateNamePatterns(configName || '', alias)

      for (const pattern of patterns) {
        for (const ext of this.extensions) {
          const filePath = resolve(directory, `${pattern}${ext}`)
          if (await this.checkFileAccess(filePath)) {
            discoveredFiles.push(filePath)
          }
        }
      }
    }
    else {
      // Discover all potential config files
      try {
        const { readdirSync } = await import('node:fs')
        const files = readdirSync(directory)

        for (const file of files) {
          // Check if file looks like a config file
          if (this.looksLikeConfigFile(file)) {
            const filePath = resolve(directory, file)
            if (await this.checkFileAccess(filePath)) {
              discoveredFiles.push(filePath)
            }
          }
        }
      }
      catch {
        // Directory read failed, return empty array
        return []
      }
    }

    return discoveredFiles
  }

  /**
   * Check if a filename looks like a configuration file
   */
  private looksLikeConfigFile(filename: string): boolean {
    const configPatterns = [
      /\.config\.(ts|js|mjs|cjs|json|mts|cts)$/,
      /^\..*\.(ts|js|mjs|cjs|json|mts|cts)$/,
      /config\.(ts|js|mjs|cjs|json|mts|cts)$/,
    ]

    return configPatterns.some(pattern => pattern.test(filename))
  }

  /**
   * Validate configuration file structure
   */
  async validateConfigFile(filePath: string): Promise<string[]> {
    const errors: string[] = []

    try {
      if (!existsSync(filePath)) {
        errors.push('Configuration file does not exist')
        return errors
      }

      // Try to import the file
      const imported = await import(filePath)
      const config = imported.default || imported

      if (config === undefined) {
        errors.push('Configuration file must export a default value or named exports')
      }
      else if (typeof config !== 'object' || config === null) {
        errors.push('Configuration must be an object')
      }
      else if (Array.isArray(config)) {
        errors.push('Configuration cannot be an array at the root level')
      }

      // Additional validation for specific file types
      if (filePath.endsWith('.json')) {
        try {
          const { readFileSync } = await import('node:fs')
          const content = readFileSync(filePath, 'utf8')
          JSON.parse(content)
        }
        catch (jsonError) {
          errors.push(`Invalid JSON syntax: ${jsonError}`)
        }
      }
    }
    catch (error) {
      errors.push(`Failed to load configuration file: ${error}`)
    }

    return errors
  }

  /**
   * Get file modification time for cache invalidation
   */
  async getFileModificationTime(filePath: string): Promise<Date | null> {
    try {
      const { statSync } = await import('node:fs')
      const stats = statSync(filePath)
      return stats.mtime
    }
    catch {
      return null
    }
  }

  /**
   * Preload configurations for better performance
   */
  async preloadConfigurations(
    configPaths: string[],
    options: FileLoadOptions = {},
  ): Promise<Map<string, unknown>> {
    const preloaded = new Map<string, unknown>()

    await Promise.allSettled(
      configPaths.map(async (path) => {
        try {
          const result = await this.loadFromPath(path, {}, options)
          if (result) {
            preloaded.set(path, result.config)
          }
        }
        catch (error) {
          // Preloading failures are non-critical
          if (options.verbose) {
            console.warn(`Failed to preload ${path}:`, error)
          }
        }
      }),
    )

    return preloaded
  }
}
