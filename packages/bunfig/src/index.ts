/// <reference path="./virtual-bunfig-types.d.ts" />

export * from './cache'
// Export configuration functions explicitly to avoid conflicts
export {
  applyEnvVarsToConfig,
  config,
  ConfigLoader,
  createLibraryConfig,
  defaultConfigDir,
  defaultGeneratedDir,
  generateConfigTypes,
  loadConfig,
  loadConfigWithResult,
  tryLoadConfig,
} from './config'
export * from './errors'
// Export specific error classes that tests need
export {
  ConfigValidationError,
  SchemaValidationError,
} from './errors'
export * from './plugin'
export * from './services/env-processor'
export * from './services/file-loader'
export * from './services/validator'

export * from './types'

export * from './utils'
