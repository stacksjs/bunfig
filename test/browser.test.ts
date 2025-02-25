import { describe, expect, it, mock, spyOn } from 'bun:test'
import { loadConfig } from '../src/browser'

describe('browser', () => {
  it('should detect browser environment correctly', () => {
    // Mock window to simulate browser environment
    const originalWindow = globalThis.window
    // @ts-expect-error - mocking window
    globalThis.window = {}

    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ host: 'api-host' }),
      }),
    )
    // @ts-expect-error - mocking fetch
    globalThis.fetch = mockFetch

    const defaultConfig = { port: 3000, host: 'localhost' }
    const result = loadConfig({
      name: 'test-app',
      endpoint: '/api/config',
      defaultConfig,
    })

    expect(result).resolves.toEqual({ port: 3000, host: 'api-host' })

    // Restore window
    globalThis.window = originalWindow
  })

  it('should handle missing endpoint gracefully', async () => {
    // Mock window to simulate browser environment
    const originalWindow = globalThis.window
    // @ts-expect-error - mocking window
    globalThis.window = {}

    const consoleSpy = spyOn(console, 'warn')
    const defaultConfig = { port: 3000, host: 'localhost' }
    const result = await loadConfig({
      name: 'test-app',
      defaultConfig,
    })

    expect(result).toEqual(defaultConfig)
    expect(consoleSpy).toHaveBeenCalledWith('An API endpoint is required to load the client config.')

    // Restore window
    globalThis.window = originalWindow
    consoleSpy.mockRestore()
  })

  it('should handle custom headers correctly', async () => {
    // Mock window to simulate browser environment
    const originalWindow = globalThis.window
    // @ts-expect-error - mocking window
    globalThis.window = {}

    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ host: 'api-host' }),
      }),
    )
    // @ts-expect-error - mocking fetch
    globalThis.fetch = mockFetch

    const defaultConfig = { port: 3000, host: 'localhost' }
    const customHeaders = {
      'Authorization': 'Bearer token',
      'X-Custom-Header': 'value',
    }

    const result = await loadConfig({
      name: 'test-app',
      endpoint: '/api/config',
      headers: customHeaders,
      defaultConfig,
    })

    expect(result).toEqual({ port: 3000, host: 'api-host' })
    expect(mockFetch).toHaveBeenCalledWith('/api/config', {
      method: 'GET',
      headers: {
        ...customHeaders,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    // Restore window
    globalThis.window = originalWindow
  })

  it('should handle invalid JSON response', async () => {
    // Mock window to simulate browser environment
    const originalWindow = globalThis.window
    // @ts-expect-error - mocking window
    globalThis.window = {}

    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      }),
    )
    // @ts-expect-error - mocking fetch
    globalThis.fetch = mockFetch

    const defaultConfig = { port: 3000, host: 'localhost' }
    const result = await loadConfig({
      name: 'test-app',
      endpoint: '/api/config',
      defaultConfig,
    })

    expect(result).toEqual(defaultConfig)

    // Restore window
    globalThis.window = originalWindow
  })
})
