import { describe, expect, it, mock, spyOn } from 'bun:test'
import { isBrowser, loadConfig } from '../src/browser'

describe('browser', () => {
  it('should detect browser environment correctly', () => {
    // Store original window and fetch
    const originalWindow = globalThis.window
    const originalFetch = globalThis.fetch

    // Test non-browser environment
    // @ts-expect-error - mocking window
    globalThis.window = undefined
    // @ts-expect-error - mocking fetch
    globalThis.fetch = undefined
    expect(isBrowser()).toBe(false)

    // Test browser environment with fetch
    // @ts-expect-error - mocking window
    globalThis.window = {}
    globalThis.fetch = () => Promise.resolve(new Response())
    expect(isBrowser()).toBe(true)

    // Restore originals
    globalThis.window = originalWindow
    globalThis.fetch = originalFetch
  })

  it('should handle browser environment', async () => {
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
    const result = await loadConfig({
      name: 'test-app',
      endpoint: '/api/config',
      defaultConfig,
    })

    expect(result).toEqual({ port: 3000, host: 'api-host' })
    expect(mockFetch).toHaveBeenCalledWith('/api/config', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

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

  it('should handle browser fetch errors', async () => {
    // Mock window to simulate browser environment
    const originalWindow = globalThis.window
    // @ts-expect-error - mocking window
    globalThis.window = {}

    const consoleSpy = spyOn(console, 'error')
    const mockFetch = mock(() => Promise.reject(new Error('Network error')))
    globalThis.fetch = mockFetch

    const defaultConfig = { port: 3000, host: 'localhost' }
    const result = await loadConfig({
      name: 'test-app',
      endpoint: '/api/config',
      defaultConfig,
    })

    expect(result).toEqual(defaultConfig)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load client config:', expect.any(Error))

    // Restore window
    globalThis.window = originalWindow
    consoleSpy.mockRestore()
  })

  it('should handle non-200 responses', async () => {
    // Mock window to simulate browser environment
    const originalWindow = globalThis.window
    // @ts-expect-error - mocking window
    globalThis.window = {}

    const consoleSpy = spyOn(console, 'error')
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 404,
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
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load client config:', expect.any(Error))

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

    const consoleSpy = spyOn(console, 'error')
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
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load client config:', expect.any(Error))

    // Restore window
    globalThis.window = originalWindow
    consoleSpy.mockRestore()
  })
})
