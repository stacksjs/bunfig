import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { loadConfig, loadConfigWithResult } from '../src/config'

/**
 * Naming the config file instead of searching for one.
 *
 * Discovery suits a project with a checked-in config. It is the wrong default
 * whenever the file is chosen at run time - a `--config` flag, a config dropped
 * on a remote machine for a single job - because the only way to know which
 * file was actually read is to name it. Getting that wrong means running with
 * settings nobody chose, which shows up as behaviour rather than as an error.
 */
describe('configFile', () => {
  const dir = resolve('./test-explicit-config')

  afterEach(async () => {
    if (existsSync(dir))
      await rm(dir, { recursive: true, force: true })
  })

  async function write(name: string, source: string): Promise<string> {
    await mkdir(dir, { recursive: true })
    const path = join(dir, name)
    await writeFile(path, source)
    return path
  }

  it('loads the named file', async () => {
    const path = await write('explicit.config.ts', `export default { port: 9999 }`)

    const config = await loadConfig({ name: 'anything', configFile: path, defaultConfig: { port: 1 } })

    expect(config.port).toBe(9999)
  })

  it('resolves a relative path against cwd', async () => {
    await write('rel.config.ts', `export default { port: 4242 }`)

    const config = await loadConfig({
      name: 'rel',
      cwd: dir,
      configFile: 'rel.config.ts',
      defaultConfig: { port: 1 },
    })

    expect(config.port).toBe(4242)
  })

  it('merges over defaults for keys the file omits', async () => {
    const path = await write('partial.config.ts', `export default { port: 8080 }`)

    const config = await loadConfig({
      name: 'partial',
      configFile: path,
      defaultConfig: { port: 1, host: 'localhost' },
    })

    expect(config).toEqual({ port: 8080, host: 'localhost' })
  })

  it('throws instead of falling back to defaults when the file is missing', async () => {
    // The whole point. loadConfig otherwise never throws, and that leniency is
    // exactly wrong for a file the caller named.
    await expect(
      loadConfig({ name: 'missing', configFile: join(dir, 'nope.config.ts'), defaultConfig: { port: 1 } }),
    ).rejects.toThrow()
  })

  it('does not silently fall through to a discoverable config', async () => {
    // A discoverable bunfig.config.ts must not stand in for the named file.
    await write('bunfig.config.ts', `export default { port: 7777 }`)

    await expect(
      loadConfig({ name: 'bunfig', cwd: dir, configFile: join(dir, 'absent.config.ts'), defaultConfig: { port: 1 } }),
    ).rejects.toThrow()
  })

  it('takes priority over a discoverable config of the same name', async () => {
    await write('bunfig.config.ts', `export default { port: 7777 }`)
    const explicit = await write('other.config.ts', `export default { port: 3333 }`)

    const config = await loadConfig({ name: 'bunfig', cwd: dir, configFile: explicit, defaultConfig: { port: 1 } })

    expect(config.port).toBe(3333)
  })

  it('keeps two explicit files apart rather than serving one from the other\'s cache', async () => {
    const a = await write('a.config.ts', `export default { port: 111 }`)
    const b = await write('b.config.ts', `export default { port: 222 }`)

    const first = await loadConfig({ name: 'same', configFile: a, defaultConfig: { port: 0 } })
    const second = await loadConfig({ name: 'same', configFile: b, defaultConfig: { port: 0 } })

    expect(first.port).toBe(111)
    expect(second.port).toBe(222)
  })

  it('still never throws when no configFile is given', async () => {
    const config = await loadConfig({ name: 'definitely-absent-config', defaultConfig: { port: 5 } })

    expect(config.port).toBe(5)
  })

  it('reports the explicit path as the search path', async () => {
    const path = await write('reported.config.ts', `export default { port: 1234 }`)

    const result = await loadConfigWithResult({ name: 'reported', configFile: path, defaultConfig: { port: 1 } })

    expect(result.config.port).toBe(1234)
  })

  it('surfaces a syntax error rather than quietly using defaults', async () => {
    const path = await write('broken.config.ts', `export default { port: `)

    await expect(
      loadConfig({ name: 'broken', configFile: path, defaultConfig: { port: 1 } }),
    ).rejects.toThrow()
  })
})
