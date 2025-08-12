import { defaultConfigDir, defaultGeneratedDir, generateConfigTypes } from '../packages/bunfig/src/config'

try {
  generateConfigTypes({
    configDir: defaultConfigDir,
    generatedDir: defaultGeneratedDir,
  })
}
catch (error) {
  console.warn('Warning: Could not generate config types:', error)
}
