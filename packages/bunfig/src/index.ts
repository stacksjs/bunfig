/// <reference path="./virtual-bunfig-types.d.ts" />
// Export configuration functions explicitly to avoid conflicts
export {
  loadConfig,
  loadConfigWithResult,
  config,
  tryLoadConfig,
  applyEnvVarsToConfig,
  generateConfigTypes,
  ConfigLoader,
  defaultConfigDir,
  defaultGeneratedDir
} from './config'
export * from './plugin'
export * from './types'
export * from './utils'
export * from './errors'
export * from './cache'
export * from './services/file-loader'
export * from './services/env-processor'
export * from './services/validator'

// Export specific error classes that tests need
export {
  ConfigValidationError,
  SchemaValidationError,
} from './errors'

// Export validation interfaces from validator
export type { ValidationError, ValidationRule, ValidationOptions, ValidationResult } from './services/validator'
