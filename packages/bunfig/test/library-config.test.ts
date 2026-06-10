import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createLibraryConfig } from '../src'

/**
 * Regression coverage for createLibraryConfig() — the synchronous,
 * Proxy-backed loader libraries use to expose config without top-level await.
 * It had no tests, which hid two correctness bugs:
 *   1. It aliased the caller's defaultConfig, so the `set` trap mutated the
 *      user's original object.
 *   2. The background load did `configCache = loadedConfig`, wholesale-
 *      replacing the cache and discarding any synchronous `set` (e.g. an
 *      app's setConfig()) made before the async load resolved.
 */
describe('createLibraryConfig', () => {
  const testDir = resolve(process.cwd(), 'test-library-config')
  const prevCwd = process.cwd()

  beforeEach(() => {
    if (existsSync(testDir))
      rmSync(testDir, { recursive: true })
    mkdirSync(testDir, { recursive: true })
    process.chdir(testDir)
  })

  afterEach(() => {
    process.chdir(prevCwd)
    if (existsSync(testDir))
      rmSync(testDir, { recursive: true })
  })

  it('returns defaults synchronously', () => {
    const defaults = { dialect: 'postgres', verbose: false }
    const cfg = createLibraryConfig({ name: 'noexist-sync', defaultConfig: defaults })
    expect(cfg.dialect).toBe('postgres')
    expect(cfg.verbose).toBe(false)
  })

  it('does NOT mutate the caller-supplied defaultConfig object', () => {
    const defaults = { dialect: 'postgres', verbose: false }
    const cfg: any = createLibraryConfig({ name: 'noexist-alias', defaultConfig: defaults })
    cfg.dialect = 'sqlite'
    expect(defaults.dialect).toBe('postgres') // original untouched
    expect(cfg.dialect).toBe('sqlite')
  })

  it('preserves a runtime set across a successful background load', async () => {
    writeFileSync(resolve(testDir, 'libcfg.config.ts'), `export default { dialect: 'mysql', verbose: true }\n`)
    const defaults = { dialect: 'postgres', verbose: false }
    const cfg: any = createLibraryConfig({ name: 'libcfg', defaultConfig: defaults })
    // App overrides BEFORE the async file load completes.
    cfg.dialect = 'sqlite'
    await new Promise(r => setTimeout(r, 80))
    // File contributes `verbose: true`, but the explicit runtime override wins.
    expect(cfg.dialect).toBe('sqlite')
    expect(cfg.verbose).toBe(true)
  })

  it('loads file config when no runtime override is set', async () => {
    writeFileSync(resolve(testDir, 'libcfg2.config.ts'), `export default { dialect: 'mysql' }\n`)
    const cfg: any = createLibraryConfig({ name: 'libcfg2', defaultConfig: { dialect: 'postgres' } })
    await new Promise(r => setTimeout(r, 80))
    expect(cfg.dialect).toBe('mysql')
  })

  it('supports has / ownKeys / delete', async () => {
    const cfg: any = createLibraryConfig({ name: 'noexist-traps', defaultConfig: { a: 1, b: 2 } })
    expect('a' in cfg).toBe(true)
    expect(Object.keys(cfg).sort()).toEqual(['a', 'b'])
    delete cfg.a
    expect('a' in cfg).toBe(false)
    expect(Object.keys(cfg)).toEqual(['b'])
  })

  it('falls back to defaults (honoring overrides) when the load fails', async () => {
    const cfg: any = createLibraryConfig({ name: 'noexist-fail', defaultConfig: { dialect: 'postgres' } })
    cfg.dialect = 'sqlite'
    await new Promise(r => setTimeout(r, 50))
    expect(cfg.dialect).toBe('sqlite')
  })
})
