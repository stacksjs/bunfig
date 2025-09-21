import { afterEach, describe, expect, it } from 'bun:test'
import process from 'node:process'
import { applyEnvVarsToConfig } from '../src'

describe('applyEnvVarsToConfig unit test', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    // Clean up test environment variables
    delete process.env.TEST_APP_PORT
    delete process.env.TEST_APP_HOST

    // Restore original environment
    process.env = { ...originalEnv }
  })

  it('should apply basic environment variables', () => {
    // Set environment variables
    process.env.TEST_APP_PORT = '8080'
    process.env.TEST_APP_HOST = 'env-host'

    // eslint-disable-next-line no-console
    console.log('DEBUG ENV:', process.env)

    const defaultConfig = {
      port: 3000,
      host: 'localhost',
    }

    const result = applyEnvVarsToConfig('test-app', defaultConfig, true)

    // eslint-disable-next-line no-console
    console.log('DEBUG RESULT:', result)

    expect(result).toEqual({
      port: 8080,
      host: 'env-host',
    })
  })
})
