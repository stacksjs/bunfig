import type * as tsModule from 'typescript/lib/tsserverlibrary'
import * as fs from 'node:fs'
import * as path from 'node:path'

let ts: typeof import('typescript/lib/tsserverlibrary')

const ALLOWED_EXTS: ReadonlySet<string> = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
])
const EXT_PRIORITY = ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json'] as const

function createVirtualDts(projectRoot: string, configDirRel?: string): string {
  const configDir = path.resolve(projectRoot, configDirRel || './config')

  if (!fs.existsSync(configDir)) {
    return (
      'declare module \'virtual:bunfig-types\' {\n'
      + '  export type ConfigNames = string\n'
      + '  export type ConfigByName = Record<string, any>\n'
      + '  export type ConfigOf<N extends ConfigNames> = N extends keyof ConfigByName ? ConfigByName[N] : unknown\n'
      + '}\n'
    )
  }

  const entries: Array<{ base: string, file: string }> = fs.readdirSync(configDir)
    .filter((file: string) => ALLOWED_EXTS.has(path.extname(file)))
    .map((file: string) => ({ base: file.replace(/\.(?:ts|js|mjs|cjs|mts|cts|json)$/i, ''), file }))

  const bestByBase = new Map<string, string>()
  for (const { base, file } of entries) {
    const ext = path.extname(file).toLowerCase()
    const current = bestByBase.get(base)
    if (!current) {
      bestByBase.set(base, file)
      continue
    }
    const currExt = path.extname(current).toLowerCase()
    if (EXT_PRIORITY.indexOf(ext as typeof EXT_PRIORITY[number]) < EXT_PRIORITY.indexOf(currExt as typeof EXT_PRIORITY[number]))
      bestByBase.set(base, file)
  }

  const selections: Array<{ base: string, file: string }> = Array.from(bestByBase.entries())
    .map(([base, file]) => ({ base, file }))
    .sort((a, b) => a.base.localeCompare(b.base))

  const names = selections.map(s => s.base)
  const union = names.length ? names.map(n => `'${n}'`).join(' | ') : 'string'

  const byName = selections.length
    ? `{
${selections
  .map((sel) => {
    const abs = path.resolve(configDir, sel.file).replace(/\\/g, '/')
    return `  '${sel.base}': typeof import('${abs}').default`
  })
  .join(',\n')}
}`
    : 'Record<string, any>'

  const source = (
    'declare module \'virtual:bunfig-types\' {\n'
    + `  export type ConfigNames = ${union}\n`
    + `  export type ConfigByName = ${byName}\n`
    + '  export type ConfigOf<N extends ConfigNames> = N extends keyof ConfigByName ? ConfigByName[N] : unknown\n'
    + '}\n'
  )

  return source
}

export function create(info: any): tsModule.LanguageService {
  ts = (info as any).typescript

  const projectRoot = info.project.getCurrentDirectory()
  const options = (info.config || {}) as { configDir?: string }

  const virtualPath = path.join(projectRoot, '__bunfig_virtual__', 'bunfig-types.d.ts')
  let virtualContent = createVirtualDts(projectRoot, options.configDir)

  try {
    const configDirAbs = path.resolve(projectRoot, options.configDir || './config')
    if (fs.existsSync(configDirAbs)) {
      const watcher = fs.watch(configDirAbs, { persistent: false }, () => {
        virtualContent = createVirtualDts(projectRoot, options.configDir)
        if (typeof (info.project as any).refreshDiagnostics === 'function') {
          try {
            ;(info.project as any).refreshDiagnostics()
          }
          catch {}
        }
      })
      ;(info.project as any).onClose?.(() => watcher.close())
    }
  }
  catch {}

  const host = info.languageServiceHost
  const origGetScriptFileNames = host.getScriptFileNames?.bind(host) || (() => [] as string[])
  const origGetScriptSnapshot = host.getScriptSnapshot?.bind(host)
  const origFileExists = host.fileExists?.bind(host)
  const origReadFile = host.readFile?.bind(host)

  host.getScriptFileNames = () => {
    const files = origGetScriptFileNames()
    if (!files.includes(virtualPath))
      return files.concat([virtualPath])
    return files
  }

  host.getScriptSnapshot = (fileName: string) => {
    if (fileName === virtualPath)
      return ts.ScriptSnapshot.fromString(virtualContent)
    return origGetScriptSnapshot ? origGetScriptSnapshot(fileName) : undefined
  }

  host.fileExists = (fileName: string) => {
    if (fileName === virtualPath)
      return true
    return origFileExists ? origFileExists(fileName) : false
  }

  host.readFile = (fileName: string) => {
    if (fileName === virtualPath)
      return virtualContent
    return origReadFile ? origReadFile(fileName) : undefined
  }

  return info.languageService
}

module.exports = { create }
