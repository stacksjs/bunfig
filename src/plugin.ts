import type { BunPlugin } from 'bun'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

/**
 * Bun plugin that provides a virtual module with dynamically generated config name types.
 *
 * It exposes the module `virtual:bunfig-types` with:
 *   export type ConfigNames = 'name1' | 'name2' | ...
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

  function readConfigNames(): string[] {
    if (!existsSync(configDir))
      return []

    const files = readdirSync(configDir)
      .filter(file => /\.(?:ts|js|mjs|cjs|mts|cts|json)$/.test(file))
      .map(file => file.replace(/\.(?:ts|js|mjs|cjs|mts|cts|json)$/i, ''))
      .sort()

    // ensure unique
    return Array.from(new Set(files))
  }

  function generateModuleSource(): string {
    const names = readConfigNames()
    const union = names.length ? `'${names.join('\' | \'')}'` : 'string'
    return `export type ConfigNames = ${union}\n`
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
