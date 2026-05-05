/**
 * Resolve the active package version. Used by `getVersion()` at module
 * scope when the bundler imports this with `with { type: 'macro' }` —
 * Bun evaluates the function at compile time and inlines the returned
 * string literal into the consumer. This sidesteps the dtsx bundler
 * plugin's habit of overwriting any package.json that's referenced via
 * a static JSON import, and also bakes the version into compiled
 * binaries (where `import.meta.url` no longer points at a real file).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export function getPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkgPath = resolve(here, '../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string }
    return pkg.version ?? '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}
