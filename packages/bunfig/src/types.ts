/// <reference path="./virtual-bunfig-types.d.ts" />
/**
 * Config Options
 *
 * @param name - The name of the configuration file.
 * @param alias - An alternative name to check for config files.
 * @param cwd - The current working directory.
 * @param defaultConfig - The default configuration.
 * @param endpoint - The API endpoint to fetch config from in browser environments.
 * @param headers - The headers to send with the request in browser environments.
 * @param verbose - Whether to log verbose information.
 * @param checkEnv - Whether to check environment variables. Defaults to true.
 * @example ```ts
 * // Merges arrays if both configs are arrays, otherwise does object deep merge
 * await loadConfig({
 *   name: 'example',
 *   endpoint: '/api/my-custom-config/endpoint',
 *   defaultConfig: [{ foo: 'bar' }]
 * })
 * ```
 *
 * You can specify an alias to check for alternative config files:
 * ```ts
 * await loadConfig({
 *   name: 'tlsx',
 *   alias: 'tls',
 *   defaultConfig: { domain: 'example.com' }
 * })
 * ```
 * This will check for both `tlsx.config.ts` and `tls.config.ts`.
 *
 * Environment variables are automatically checked based on the config name.
 * For example, with a config name of "tlsx" and a defaultConfig with a property "domain",
 * the environment variable "TLSX_DOMAIN" will be checked and used if available.
 * Nested properties use underscores: "TLSX_NESTED_PROPERTY".
 *
 * You can disable environment variable checking by setting checkEnv to false:
 * ```ts
 * await loadConfig({
 *   name: 'example',
 *   defaultConfig: { foo: 'bar' },
 *   checkEnv: false
 * })
 * ```
 */
export interface Config<T> {
  name?: string
  alias?: string
  cwd?: string
  configDir?: string
  generatedDir?: string
  endpoint?: string
  headers?: Record<string, string>
  defaultConfig: T
  checkEnv?: boolean
  verbose?: boolean
  arrayStrategy?: ArrayMergeStrategy
}

export type SimplifyDeep<T> = T extends object
  ? { [P in keyof T]: SimplifyDeep<T[P]> }
  : T

export type DeepMerge<T, S> = {
  [P in keyof (T & S)]: P extends keyof T
    ? P extends keyof S
      ? DeepMergeable<T[P], S[P]>
      : T[P]
    : P extends keyof S
      ? S[P]
      : never
}

export type DeepMergeable<T, S> = T extends object
  ? S extends object
    ? DeepMerge<T, S>
    : S
  : S

export type ArrayMergeStrategy = 'replace' | 'merge'

/**
 * Configuration cache options
 */
export interface CacheOptions {
  /** Enable file system cache */
  enabled?: boolean
  /** Cache TTL in milliseconds */
  ttl?: number
  /** Maximum cache size */
  maxSize?: number
  /** Cache key prefix */
  keyPrefix?: string
}

/**
 * Performance monitoring options
 */
export interface PerformanceOptions {
  /** Enable performance tracking */
  enabled?: boolean
  /** Warn on slow operations (ms) */
  slowThreshold?: number
  /** Callback for performance metrics */
  onMetrics?: (metrics: PerformanceMetrics) => void
}

/**
 * Performance metrics data
 */
export interface PerformanceMetrics {
  /** Operation name */
  operation: string
  /** Duration in milliseconds */
  duration: number
  /** Cache hit/miss */
  cacheHit?: boolean
  /** File path involved */
  path?: string
  /** Config name */
  configName?: string
  /** Timestamp */
  timestamp: Date
}

/**
 * Enhanced configuration options with caching and performance monitoring
 */
export interface EnhancedConfig<T> extends Config<T> {
  /** Cache configuration */
  cache?: CacheOptions
  /** Performance monitoring */
  performance?: PerformanceOptions
  /** Schema validation */
  schema?: string | object
  /** Custom validation function */
  validate?: (config: T) => string[] | void
}

/**
 * Configuration loading result with metadata
 */
export interface ConfigResult<T> {
  /** The loaded configuration */
  config: T
  /** Source of the configuration */
  source: ConfigSource
  /** Path to the configuration file */
  path?: string
  /** Performance metrics */
  metrics?: PerformanceMetrics
  /** Any validation warnings */
  warnings?: string[]
}

/**
 * Configuration source information
 */
export interface ConfigSource {
  /** Type of source */
  type: 'file' | 'package.json' | 'environment' | 'default' | 'cache'
  /** Source path or identifier */
  path?: string
  /** Priority level (higher = more important) */
  priority: number
  /** Timestamp when loaded */
  timestamp: Date
}

// Dynamic config types via virtual module
export type ConfigNames = import('virtual:bunfig-types').ConfigNames
export type ConfigByName = import('virtual:bunfig-types').ConfigByName
export type ConfigOf<N extends ConfigNames> = import('virtual:bunfig-types').ConfigOf<N>
