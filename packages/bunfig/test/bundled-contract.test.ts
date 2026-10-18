import { expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

for (const minify of [false, true]) {
  test(`bundled public errors preserve strict optional absence and required-file failures (minify=${minify})`, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'bunfig-bundled-contract-'))
    try {
      const output = join(directory, 'bundle')
      const built = await Bun.build({
        entrypoints: [join(import.meta.dir, '../src/index.ts')],
        outdir: output,
        target: 'bun',
        minify,
      })
      expect(built.success, built.logs.map(log => log.message).join('\n')).toBe(true)
      const api = await import(pathToFileURL(join(output, 'index.js')).href)
      const cwd = join(directory, 'configuration')
      mkdirSync(cwd)
      const options = {
        name: 'bundle-contract', cwd, defaultConfig: { value: 'default' },
        checkEnv: false, errorPolicy: 'throw' as const,
      }

      expect(await api.loadConfig(options)).toEqual({ value: 'default' })
      try {
        await api.loadConfig({ ...options, configFile: 'required.ts' })
        throw new Error('A required missing file must reject')
      }
      catch (error) {
        expect(error).toBeInstanceOf(api.ConfigNotFoundError)
        expect((error as Error).name).toBe('ConfigNotFoundError')
      }

      const file = join(cwd, 'bundle-contract.config.ts')
      writeFileSync(file, 'export default { value: }')
      await expect(api.loadConfig(options)).rejects.toBeInstanceOf(api.ConfigLoadError)
      writeFileSync(file, "export default { value: 'repaired' }")
      expect(await api.loadConfig(options)).toEqual({ value: 'repaired' })
    }
    finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 15_000)
}
