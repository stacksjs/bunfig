/**
 * Config Options
 *
 * @param name - The name of the configuration file.
 * @param cwd - The current working directory.
 * @param defaultConfig - The default configuration.
 */
export interface ConfigOptions<T> {
  name: string
  cwd?: string
  defaultConfig: T
}
