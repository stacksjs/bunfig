import { configDir, generateConfigTypes, generatedDir } from '../src/config'

try {
  generateConfigTypes({
    configDir,
    generatedDir,
  })
}
catch (error) {
  console.warn('Warning: Could not generate config types:', error)
}
