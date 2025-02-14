import { CAC } from 'cac'
import { version } from '../package.json'
import { defaultConfigDir, defaultGeneratedDir, generateConfigTypes } from '../src/config'

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
    if (!options?.configDir || !options.generatedDir) {
      return generateConfigTypes({
        configDir: options?.configDir || defaultConfigDir,
        generatedDir: options?.generatedDir || defaultGeneratedDir,
      })
    }
  })

cli.command('version', 'Show the version of the Bunfig CLI').action(() => {
  console.log(version)
})

cli.version(version)
cli.help()
cli.parse()
