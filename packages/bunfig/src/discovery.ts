import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

/** File extensions supported by bunfig, in discovery priority order. */
export const CONFIG_FILE_EXTENSIONS = [
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.mts',
  '.cts',
] as const

export interface ConfigNameOptions {
  /** Primary configuration name, such as `crosswind`. */
  name?: string
  /** Alternative names checked after the primary name. */
  alias?: string | string[]
}

export interface ConfigPathOptions extends ConfigNameOptions {
  /** Directory in which candidates should be generated. */
  directory: string
}

export interface LocalConfigDiscoveryOptions extends ConfigNameOptions {
  /** Project directory. Defaults to the current working directory. */
  cwd?: string
  /** Additional project-relative or absolute configuration directory. */
  configDir?: string
}

/**
 * Generate bunfig's supported filename stems in resolution priority order.
 */
export function getConfigNamePatterns(options: ConfigNameOptions = {}): string[] {
  const { name = '', alias } = options
  const patterns = ['config', '.config']

  if (name)
    patterns.push(name, `.${name}.config`, `${name}.config`, `.${name}`)

  const aliases = alias === undefined ? [] : Array.isArray(alias) ? alias : [alias]
  for (const alternative of aliases) {
    if (!alternative)
      continue

    patterns.push(
      alternative,
      `.${alternative}.config`,
      `${alternative}.config`,
      `.${alternative}`,
    )

    if (name)
      patterns.push(`${name}.${alternative}.config`, `.${name}.${alternative}.config`)
  }

  return Array.from(new Set(patterns.filter(Boolean)))
}

/**
 * Generate every supported config path for one directory.
 */
export function getConfigPaths(options: ConfigPathOptions): string[] {
  const patterns = getConfigNamePatterns(options)
  return patterns.flatMap(pattern => CONFIG_FILE_EXTENSIONS.map(extension =>
    resolve(options.directory, `${pattern}${extension}`),
  ))
}

/**
 * Return project-local directories in the same order used by bunfig's loader.
 */
export function getLocalConfigDirectories(options: Pick<LocalConfigDiscoveryOptions, 'cwd' | 'configDir'> = {}): string[] {
  const cwd = resolve(options.cwd || process.cwd())
  return Array.from(new Set([
    cwd,
    resolve(cwd, 'config'),
    resolve(cwd, '.config'),
    options.configDir ? resolve(cwd, options.configDir) : undefined,
  ].filter((directory): directory is string => Boolean(directory))))
}

/**
 * Generate every project-local candidate in bunfig's exact resolution order.
 */
export function getLocalConfigPaths(options: LocalConfigDiscoveryOptions = {}): string[] {
  return getLocalConfigDirectories(options).flatMap(directory => getConfigPaths({
    directory,
    name: options.name,
    alias: options.alias,
  }))
}

/**
 * Find the first project-local config file bunfig would attempt to load.
 *
 * This lightweight helper intentionally does not import the config loader or
 * inspect home/package.json fallbacks. Consumers can use it to avoid loading a
 * heavier optional integration when a project has no matching local config.
 */
export function findLocalConfig(options: LocalConfigDiscoveryOptions = {}): string | null {
  return getLocalConfigPaths(options).find(candidate => existsSync(candidate)) ?? null
}

/** Return whether a matching project-local config file exists. */
export function hasLocalConfig(options: LocalConfigDiscoveryOptions = {}): boolean {
  return findLocalConfig(options) !== null
}
