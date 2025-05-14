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
