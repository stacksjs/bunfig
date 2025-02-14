import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { version } from '../package.json'

describe('CLI', () => {
  const testConfigDir = resolve(process.cwd(), 'test-config')
  const testGeneratedDir = resolve(process.cwd(), 'test-generated')

  // Setup and cleanup for each test
  beforeEach(() => {
    // Clean any existing directories
    if (existsSync(testConfigDir))
      rmSync(testConfigDir, { recursive: true })
    if (existsSync(testGeneratedDir))
      rmSync(testGeneratedDir, { recursive: true })

    // Create test directories
    mkdirSync(testConfigDir, { recursive: true, mode: 0o777 })
    mkdirSync(testGeneratedDir, { recursive: true, mode: 0o777 })

    // Create a test config file
    writeFileSync(resolve(testConfigDir, 'app.ts'), 'export default {}', { mode: 0o666 })
  })

  afterEach(() => {
    // Cleanup test directories
    if (existsSync(testConfigDir))
      rmSync(testConfigDir, { recursive: true })
    if (existsSync(testGeneratedDir))
      rmSync(testGeneratedDir, { recursive: true })

    // Cleanup default generated directory
    const defaultGeneratedDir = resolve(process.cwd(), 'src/generated')
    if (existsSync(defaultGeneratedDir))
      rmSync(defaultGeneratedDir, { recursive: true })
  })

  describe('generate command', () => {
    it('should generate types with custom directories', async () => {
      // Ensure directories exist with proper permissions
      if (!existsSync(testGeneratedDir))
        mkdirSync(testGeneratedDir, { recursive: true, mode: 0o777 })

      const proc = Bun.spawn(['./bunfig', 'generate', '--config-dir', testConfigDir, '--generated-dir', testGeneratedDir], {
        cwd: process.cwd(),
      })

      // Wait for process to complete
      const exitCode = await proc.exited
      expect(exitCode).toBe(0)

      // Wait for file system operations to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      const typesFile = resolve(testGeneratedDir, 'config-types.ts')
      expect(existsSync(typesFile)).toBe(true)

      const content = readFileSync(typesFile, 'utf-8')
      expect(content).toContain('export type ConfigNames = \'app\'')
    })

    it('should use default directories when not specified', async () => {
      // Ensure default directories exist with proper permissions
      const defaultGeneratedDir = resolve(process.cwd(), 'src/generated')
      if (!existsSync(dirname(defaultGeneratedDir)))
        mkdirSync(dirname(defaultGeneratedDir), { recursive: true, mode: 0o777 })
      if (!existsSync(defaultGeneratedDir))
        mkdirSync(defaultGeneratedDir, { recursive: true, mode: 0o777 })

      const proc = Bun.spawn(['./bunfig', 'generate'], {
        cwd: process.cwd(),
      })

      // Wait for process to complete
      const exitCode = await proc.exited
      expect(exitCode).toBe(0)

      // Wait for file system operations to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Should create in default locations
      const typesFile = resolve(process.cwd(), 'src/generated/config-types.ts')
      expect(existsSync(typesFile)).toBe(true)
    })

    it('should handle invalid directories gracefully', async () => {
      // Ensure output directory exists with proper permissions
      if (!existsSync(testGeneratedDir))
        mkdirSync(testGeneratedDir, { recursive: true, mode: 0o777 })

      const proc = Bun.spawn(['./bunfig', 'generate', '--config-dir', '/invalid/path', '--generated-dir', testGeneratedDir], {
        cwd: process.cwd(),
      })

      // Wait for process to complete
      const exitCode = await proc.exited
      expect(exitCode).toBe(0)

      // Wait for file system operations to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      const typesFile = resolve(testGeneratedDir, 'config-types.ts')
      expect(existsSync(typesFile)).toBe(true)

      const content = readFileSync(typesFile, 'utf-8')
      expect(content).toContain('export type ConfigNames = string')
    })
  })

  describe('version command', () => {
    it('should display correct version', async () => {
      const proc = Bun.spawn(['./bunfig', 'version'], {
        cwd: process.cwd(),
      })
      const output = await new Response(proc.stdout).text()
      await proc.exited

      expect(output.trim()).toContain(version)
    })

    it('should display version with --version flag', async () => {
      const proc = Bun.spawn(['./bunfig', '--version'], {
        cwd: process.cwd(),
      })
      const output = await new Response(proc.stdout).text()
      await proc.exited

      expect(output.trim()).toContain(version)
    })
  })

  describe('help command', () => {
    it('should display help information', async () => {
      const proc = Bun.spawn(['./bunfig', '--help'], {
        cwd: process.cwd(),
      })
      const output = await new Response(proc.stdout).text()
      await proc.exited

      expect(output).toContain('Usage:')
      expect(output).toContain('Commands:')
      expect(output).toContain('generate')
      expect(output).toContain('version')
    })
  })
})
