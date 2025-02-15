/**
 * Config Options
 *
 * @param name - The name of the configuration file.
 * @param cwd - The current working directory.
 * @param defaultConfig - The default configuration.
 * @param endpoint - The API endpoint to fetch config from in browser environments.
 * @param headers - The headers to send with the request in browser environments.
 * @example ```ts
 * // Merges arrays if both configs are arrays, otherwise does object deep merge
 * await loadConfig({
 *   name: 'example',
 *   endpoint: '/api/my-custom-config/endpoint',
 *   defaultConfig: [{ foo: 'bar' }]
 * })
 * ```
 */
export interface Config<T> {
  name?: string
  cwd?: string
  configDir?: string
  generatedDir?: string
  endpoint?: string
  headers?: Record<string, string>
  defaultConfig: T
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
