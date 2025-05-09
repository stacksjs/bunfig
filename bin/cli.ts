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

cli.version(version)
cli.help()
cli.parse()
