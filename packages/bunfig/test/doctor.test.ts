import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

describe('doctor', () => {
  const tmpRoot = resolve(process.cwd(), 'test/tmp/doctor')
  const tsconfigPath = resolve(tmpRoot, 'tsconfig.json')

  beforeEach(() => {
    if (existsSync(tmpRoot))
      rmSync(tmpRoot, { recursive: true })
    mkdirSync(tmpRoot, { recursive: true, mode: 0o777 })
  })

  afterEach(() => {
    if (existsSync(tmpRoot))
      rmSync(tmpRoot, { recursive: true })
  })

  it('should report required changes without --fix', async () => {
    // minimal tsconfig missing plugin/paths
    writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: {} }, null, 2))

    const proc = Bun.spawn([
      './bunfig',
      'doctor',
      '--tsconfig',
      tsconfigPath,
    ], {
      cwd: process.cwd(),
    })

    const output = await new Response(proc.stdout).text()
    await proc.exited

    expect(output).toContain('Added bunfig TS plugin')
    expect(output).toContain('Changes needed')

    // file should remain unchanged without --fix
    const content = readFileSync(tsconfigPath, 'utf8')
    expect(content).not.toContain('bunfig/ts-plugin')
  })

  it('should apply fixes with --fix', async () => {
    // ensure parent exists
    if (!existsSync(dirname(tsconfigPath)))
      mkdirSync(dirname(tsconfigPath), { recursive: true, mode: 0o777 })

    writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: {} }, null, 2))

    const proc = Bun.spawn([
      './bunfig',
      'doctor',
      '--tsconfig',
      tsconfigPath,
      '--fix',
    ], {
      cwd: process.cwd(),
    })

    const output = await new Response(proc.stdout).text()
    await proc.exited

    expect(output).toContain('Updated')

    const content = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as any
    const plugins = content.compilerOptions?.plugins || []
    const hasPlugin = plugins.some((p: any) => p?.name === 'bunfig/ts-plugin')
    expect(hasPlugin).toBe(true)
  })

  it('should be a no-op when already configured', async () => {
    const preconfigured = {
      compilerOptions: {
        plugins: [{ name: 'bunfig/ts-plugin' }],
        baseUrl: '.',
        paths: {
          'bunfig': ['packages/bunfig/src'],
          'bunfig/*': ['packages/bunfig/src/*'],
        },
      },
    }
    writeFileSync(tsconfigPath, JSON.stringify(preconfigured, null, 2))

    const proc = Bun.spawn([
      './bunfig',
      'doctor',
      '--tsconfig',
      tsconfigPath,
    ], {
      cwd: process.cwd(),
    })

    const output = await new Response(proc.stdout).text()
    await proc.exited

    expect(output).toContain('Looks good! No changes needed.')
  })
})
