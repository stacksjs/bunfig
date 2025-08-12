import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { CAC } from 'cac'
import { version } from '../package.json'
import { config, defaultConfigDir, defaultGeneratedDir, generateConfigTypes } from '../src/config'

const cli = new CAC('bunfig')

// Define CLI options interface to match our core types
interface CLIOptions {
  configDir?: string
  generatedDir?: string
  verbose?: boolean
}

cli
  .command('generate', 'Generate the config types')
  .option('--config-dir <path>', 'The path to the config directory')
  .option('--generated-dir <path>', 'The path to the generated directory')
  .option('--verbose', 'Enable verbose logging')
  .example('bunfig generate --config-dir ./config --generated-dir ./src/generated')
  .action(async (options?: CLIOptions) => {
    generateConfigTypes({
      configDir: options?.configDir || defaultConfigDir,
      generatedDir: options?.generatedDir || defaultGeneratedDir,
    })
  })

cli
  .command('show <name>', 'Show the loaded configuration for the specified name')
  .option('--verbose', 'Enable verbose logging')
  .example('bunfig show my-app')
  .action(async (name: string, options?: { verbose?: boolean }) => {
    try {
      const loadedConfig = await config({
        name,
        defaultConfig: {},
        verbose: options?.verbose,
      })
      console.log(JSON.stringify(loadedConfig, null, 2))
    }
    catch (error) {
      console.error('Failed to load configuration:', error)
      process.exit(1)
    }
  })

cli.command('version', 'Show the version of the Bunfig CLI').action(() => {
  console.log(version)
})

function stripJsonComments(jsonText: string): string {
  return jsonText
    // block comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // line comments
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

function findNearestTsconfig(startDir: string): string | null {
  let dir = startDir
  while (true) {
    const candidate = resolve(dir, 'tsconfig.json')
    if (existsSync(candidate))
      return candidate
    const parent = dirname(dir)
    if (parent === dir)
      return null
    dir = parent
  }
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value)
    return []
  return Array.isArray(value) ? value : [value]
}

cli
  .command('doctor', 'Check and set up tsconfig for bunfig')
  .option('--tsconfig <path>', 'Path to tsconfig.json (defaults to nearest)')
  .option('--fix', 'Automatically apply recommended changes')
  .action(async (options: { tsconfig?: string, fix?: boolean }) => {
    const cwd = process.cwd()
    const tsconfigPath = options.tsconfig
      ? resolve(cwd, options.tsconfig)
      : findNearestTsconfig(cwd)

    if (!tsconfigPath || !existsSync(tsconfigPath)) {
      console.error('No tsconfig.json found. Create one with:')
      console.error('  bunx --bun tsc --init')
      process.exit(options.fix ? 1 : 0)
      return
    }

    const raw = readFileSync(tsconfigPath, 'utf8')
    const parsed = JSON.parse(stripJsonComments(raw)) as Record<string, any>
    const before = JSON.stringify(parsed)

    parsed.compilerOptions = parsed.compilerOptions || {}

    // 1) Ensure TS Language Service plugin is configured
    const plugins = ensureArray(parsed.compilerOptions.plugins)
    const hasPlugin = plugins.some((p: any) => p && (p.name === 'bunfig/ts-plugin' || p.name === '@bunfig/ts-plugin'))
    if (!hasPlugin) {
      plugins.push({ name: 'bunfig/ts-plugin' })
      parsed.compilerOptions.plugins = plugins
      console.log('Added bunfig TS plugin to compilerOptions.plugins')
    }

    // 2) Recommend DOM lib if browser APIs are used
    const libs = ensureArray(parsed.compilerOptions.lib)
    if (!libs.includes('dom')) {
      console.warn('Note: Add "dom" to compilerOptions.lib if you use bunfig/browser:')
      console.warn('  "lib": ["esnext", "dom"]')
    }

    // 4) Optional: types entry for ambient fallback (not required)
    // We do not force-add to avoid collisions, just inform

    const after = JSON.stringify(parsed)
    if (before !== after) {
      if (options.fix) {
        writeFileSync(tsconfigPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
        console.log(`Updated ${tsconfigPath}`)
      }
      else {
        console.log('Changes needed. Re-run with --fix to apply updates.')
      }
    }
    else {
      console.log('Looks good! No changes needed.')
    }

    // Summary
    console.log('\nChecks:')
    console.log(`- tsconfig: ${tsconfigPath}`)
    console.log(`- plugin: ${hasPlugin ? 'OK' : 'added'}`)
  })

cli.version(version)
cli.help()
cli.parse()
