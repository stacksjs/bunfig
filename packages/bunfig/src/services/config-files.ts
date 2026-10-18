import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const configurationRequire = createRequire(import.meta.url)
const pendingImports = new Map<string, Promise<void>>()
const rejectedImports = new Set<string>()

/** Only a missing path is an optional discovery miss. */
export function isMissingConfigPath(error: unknown): boolean {
  return error instanceof Error && 'code' in error
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

/** Read current module contents even across same-millisecond loads and loader instances. */
export async function importFreshConfiguration(path: string): Promise<Record<string, unknown>> {
  const canonicalPath = realpathSync(path)
  const previous = pendingImports.get(canonicalPath)
  let release!: () => void
  const current = new Promise<void>((resolve) => { release = resolve })
  pendingImports.set(canonicalPath, current)
  await previous

  try {
    // A cached transpilation must never hide revoked filesystem access.
    readFileSync(canonicalPath)
    // Bun's public require.cache also exposes evaluated ESM modules. Evict
    // only this settled configuration, never an unrelated or loading module.
    if (configurationRequire.cache[canonicalPath]?.loaded === true || rejectedImports.has(canonicalPath))
      delete configurationRequire.cache[canonicalPath]
    try {
      const imported = await import(pathToFileURL(canonicalPath).href)
      rejectedImports.delete(canonicalPath)
      return imported
    }
    catch (error) {
      // A rejected module must be evicted on retry after its source is fixed.
      rejectedImports.add(canonicalPath)
      throw error
    }
  }
  finally {
    release()
    if (pendingImports.get(canonicalPath) === current)
      pendingImports.delete(canonicalPath)
  }
}
