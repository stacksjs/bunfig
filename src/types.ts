/**
 * Config Options
 *
 * @param name - The name of the configuration file.
 * @param cwd - The current working directory.
 * @param defaultConfig - The default configuration.
 */
export interface Config<T> {
  name: string
  cwd?: string
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
