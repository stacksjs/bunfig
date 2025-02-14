import { defaultConfigDir, defaultGeneratedDir, generateConfigTypes } from '../src/config'

try {
  generateConfigTypes({
    configDir: defaultConfigDir,
    generatedDir: defaultGeneratedDir,
  })
}
catch (error) {
  console.warn('Warning: Could not generate config types:', error)
}
