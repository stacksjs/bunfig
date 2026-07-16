import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  CONFIG_FILE_EXTENSIONS,
  findLocalConfig,
  getConfigNamePatterns,
  getConfigPaths,
  getLocalConfigDirectories,
  getLocalConfigPaths,
  hasLocalConfig,
} from '../src/discovery'

const temporaryDirectories: string[] = []

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'bunfig-discovery-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true })
})

describe('config discovery', () => {
  it('exposes every supported extension in loader priority order', () => {
    expect(CONFIG_FILE_EXTENSIONS).toEqual([
      '.ts',
      '.js',
      '.mjs',
      '.cjs',
      '.json',
      '.mts',
      '.cts',
    ])
  })

  it('generates primary, hidden, alias, and combined filename patterns', () => {
    expect(getConfigNamePatterns({ name: 'crosswind', alias: ['cw', 'wind'] })).toEqual([
      'config',
      '.config',
      'crosswind',
      '.crosswind.config',
      'crosswind.config',
      '.crosswind',
      'cw',
      '.cw.config',
      'cw.config',
      '.cw',
      'crosswind.cw.config',
      '.crosswind.cw.config',
      'wind',
      '.wind.config',
      'wind.config',
      '.wind',
      'crosswind.wind.config',
      '.crosswind.wind.config',
    ])
  })

  it('deduplicates repeated names while preserving priority', () => {
    expect(getConfigNamePatterns({ name: 'config', alias: ['', 'config'] })).toEqual([
      'config',
      '.config',
      '.config.config',
      'config.config',
      'config.config.config',
      '.config.config.config',
    ])
  })

  it('generates absolute paths for one directory', () => {
    const cwd = temporaryDirectory()
    const paths = getConfigPaths({ name: 'app', directory: cwd })

    expect(paths).toHaveLength(6 * CONFIG_FILE_EXTENSIONS.length)
    expect(paths[0]).toBe(resolve(cwd, 'config.ts'))
    expect(paths.at(-1)).toBe(resolve(cwd, '.app.cts'))
  })

  it('uses root, config, hidden config, then a custom directory', () => {
    const cwd = temporaryDirectory()
    expect(getLocalConfigDirectories({ cwd, configDir: 'settings' })).toEqual([
      resolve(cwd),
      resolve(cwd, 'config'),
      resolve(cwd, '.config'),
      resolve(cwd, 'settings'),
    ])
  })

  it('deduplicates a custom directory already in the default search list', () => {
    const cwd = temporaryDirectory()
    expect(getLocalConfigDirectories({ cwd, configDir: 'config' })).toHaveLength(3)
  })

  it('generates all local candidates in exact directory and filename priority', () => {
    const cwd = temporaryDirectory()
    const paths = getLocalConfigPaths({ name: 'crosswind', cwd })

    expect(paths).toHaveLength(3 * 6 * CONFIG_FILE_EXTENSIONS.length)
    expect(paths[0]).toBe(resolve(cwd, 'config.ts'))
    expect(paths[6 * CONFIG_FILE_EXTENSIONS.length]).toBe(resolve(cwd, 'config/config.ts'))
    expect(paths.at(-1)).toBe(resolve(cwd, '.config/.crosswind.cts'))
  })

  it('returns null quickly when no local candidate exists', () => {
    const cwd = temporaryDirectory()
    expect(findLocalConfig({ name: 'crosswind', cwd })).toBeNull()
    expect(hasLocalConfig({ name: 'crosswind', cwd })).toBeFalse()
  })

  it.each([
    'config.ts',
    'crosswind.config.js',
    '.crosswind.mjs',
    'config/crosswind.cjs',
    '.config/.crosswind.config.json',
    'crosswind.mts',
    'crosswind.cts',
  ])('finds supported local candidate %s', (relativePath) => {
    const cwd = temporaryDirectory()
    const path = resolve(cwd, relativePath)
    mkdirSync(resolve(path, '..'), { recursive: true })
    writeFileSync(path, 'export default {}')

    expect(findLocalConfig({ name: 'crosswind', cwd })).toBe(path)
    expect(hasLocalConfig({ name: 'crosswind', cwd })).toBeTrue()
  })

  it('supports aliases and custom config directories', () => {
    const cwd = temporaryDirectory()
    const path = resolve(cwd, 'settings/cw.config.ts')
    mkdirSync(resolve(path, '..'), { recursive: true })
    writeFileSync(path, 'export default {}')

    expect(findLocalConfig({
      name: 'crosswind',
      alias: 'cw',
      cwd,
      configDir: 'settings',
    })).toBe(path)
  })

  it('returns the same first match the loader would prioritize', () => {
    const cwd = temporaryDirectory()
    const rootPath = resolve(cwd, 'crosswind.json')
    const nestedPath = resolve(cwd, 'config/crosswind.ts')
    mkdirSync(resolve(nestedPath, '..'), { recursive: true })
    writeFileSync(rootPath, '{}')
    writeFileSync(nestedPath, 'export default {}')

    expect(findLocalConfig({ name: 'crosswind', cwd })).toBe(rootPath)
  })
})
