import type { BunPlugin } from 'bun'
import { existsSync, readdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import process from 'node:process'

/**
 * Bun plugin that provides a virtual module with dynamically generated config name types.
 *
 * It exposes the module `virtual:bunfig-types` with:
 *   export type ConfigNames = 'name1' | 'name2' | ...
 *   export type ConfigByName = { 'name1': typeof import('/abs/path/config/name1.ext').default, ... }
 *   export type ConfigOf<N extends ConfigNames> = ConfigByName[N]
 *
 * Usage (in your app build script):
 *   import { bunfigPlugin } from 'bunfig'
 *   await Bun.build({
 *     entrypoints: ['src/index.ts'],
 *     outdir: 'dist',
 *     plugins: [bunfigPlugin({ configDir: './config' })],
 *   })
 */
export function bunfigPlugin(options?: { configDir?: string }): BunPlugin {
  const configDir = resolve(process.cwd(), options?.configDir || './config')

  interface Selection { base: string, file: string }

  function readConfigSelection(): Selection[] {
    if (!existsSync(configDir))
      return []

    const allowed = new Set(['.ts', '.js', '.mjs', '.cjs', '.mts', '.cts', '.json'])
    const priority = ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json']

    const entries = readdirSync(configDir)
      .filter(file => allowed.has(extname(file)))
      .map(file => ({ base: file.replace(/\.(?:ts|js|mjs|cjs|mts|cts|json)$/i, ''), file }))

    const bestByBase = new Map<string, string>()
    for (const { base, file } of entries) {
      const ext = extname(file).toLowerCase()
      const current = bestByBase.get(base)
      if (!current) {
        bestByBase.set(base, file)
        continue
      }
      // Prefer higher-priority extension
      const currExt = extname(current).toLowerCase()
      if (priority.indexOf(ext) < priority.indexOf(currExt)) {
        bestByBase.set(base, file)
      }
    }

    return Array.from(bestByBase.entries())
      .map(([base, file]) => ({ base, file }))
      .sort((a, b) => a.base.localeCompare(b.base))
  }

  function generateModuleSource(): string {
    const selections = readConfigSelection()
    const names = selections.map(s => s.base)
    const union = names.length ? names.map(n => `'${n}'`).join(' | ') : 'string'

    const byName = selections.length
      ? `{
${selections
  .map((sel) => {
    const abs = resolve(configDir, sel.file).replace(/\\/g, '/')
    return `  '${sel.base}': typeof import('${abs}').default`
  })
  .join(',\n')}
}`
      : 'Record<string, any>'

    const source = `export type ConfigNames = ${union}
export type ConfigByName = ${byName}
export type Config<N extends ConfigNames> = N extends keyof ConfigByName ? ConfigByName[N] : unknown
export type ConfigOf = Config
`

    return source
  }

  return {
    name: 'bunfig-plugin',
    setup(builder: any) {
      // Resolve our virtual module specifier
      builder.onResolve({ filter: /^virtual:bunfig-types$/ }, (args: any) => {
        return { path: args.path, namespace: 'bunfig-virtual' }
      })

      // Provide TypeScript source for the virtual module
      builder.onLoad({ filter: /^virtual:bunfig-types$/, namespace: 'bunfig-virtual' }, () => {
        const contents = generateModuleSource()
        return { contents, loader: 'ts' }
      })
    },
  }
}
