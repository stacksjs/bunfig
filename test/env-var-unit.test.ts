import { describe, expect, it } from 'bun:test'
import process from 'node:process'
import { applyEnvVarsToConfig } from '../src'

describe('applyEnvVarsToConfig unit test', () => {
  const originalEnv = { ...process.env }

  it('should apply basic environment variables', () => {
    // Clean environment for this test
    process.env = {}

    // Set environment variables
    process.env.TEST_APP_PORT = '8080'
    process.env.TEST_APP_HOST = 'env-host'

    console.log('DEBUG ENV:', process.env)

    const defaultConfig = {
      port: 3000,
      host: 'localhost',
    }

    const result = applyEnvVarsToConfig('test-app', defaultConfig, true)

    console.log('DEBUG RESULT:', result)

    expect(result).toEqual({
      port: 8080,
      host: 'env-host',
    })

    // Restore original environment
    process.env = { ...originalEnv }
  })
})
