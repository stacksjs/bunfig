import { expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ConfigLoadError, ConfigNotFoundError, ConfigValidationError, config, createLibraryConfig, loadConfig, loadConfigWithResult } from '../src'

test('throw policy rejects a malformed discovered configuration instead of using defaults', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bunfig-error-policy-'))
  try {
    writeFileSync(join(directory, 'policy.config.ts'), 'export default { value: }')
    await expect(loadConfig({
      name: 'policy',
      cwd: directory,
      defaultConfig: { value: 'default' },
      checkEnv: false,
      errorPolicy: 'throw',
    })).rejects.toBeInstanceOf(ConfigLoadError)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

async function withPolicyFixture(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), 'bunfig-policy-matrix-'))
  try {
    await run(directory)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function policyOptions(directory: string) {
  return {
    name: 'policy',
    cwd: directory,
    defaultConfig: { value: 'default' },
    checkEnv: false,
    errorPolicy: 'throw' as const,
  }
}

test('optional absence still returns defaults under throw policy', async () => {
  await withPolicyFixture(async directory => {
    expect(await loadConfig(policyOptions(directory))).toEqual({ value: 'default' })
  })
})

test('an explicit missing file is required under throw policy', async () => {
  await withPolicyFixture(async directory => {
    await expect(loadConfig({ ...policyOptions(directory), configFile: 'missing.ts' }))
      .rejects.toBeInstanceOf(ConfigNotFoundError)
  })
})

test('default fallback remains available for malformed files', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'policy.config.ts'), 'export default { value: }')
    expect(await loadConfig({ ...policyOptions(directory), errorPolicy: 'fallback' }))
      .toEqual({ value: 'default' })
  })
})

test('a lenient result cannot mask a strict load of the same file', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'policy.config.ts'), 'export default { value: }')
    const options = policyOptions(directory)
    expect(await loadConfig({ ...options, errorPolicy: 'fallback' })).toEqual({ value: 'default' })
    await expect(loadConfig(options)).rejects.toBeInstanceOf(ConfigLoadError)
  })
})

test('strict loads recheck changed files even with unchanged timestamps', async () => {
  await withPolicyFixture(async directory => {
    const path = join(directory, 'policy.config.ts')
    writeFileSync(path, "export default { value: 'valid' }")
    const before = statSync(path)
    const options = { ...policyOptions(directory), cache: { enabled: true, ttl: 60000 } }
    expect(await loadConfig(options)).toEqual({ value: 'valid' })
    writeFileSync(path, "throw new Error('changed configuration')")
    utimesSync(path, before.atime, before.mtime)
    await expect(loadConfig(options)).rejects.toBeInstanceOf(ConfigLoadError)
  })
})

test('strict loads recheck file access after a successful cached load', async () => {
  await withPolicyFixture(async directory => {
    const path = join(directory, 'policy.config.ts')
    writeFileSync(path, "export default { value: 'valid' }")
    const options = policyOptions(directory)
    expect(await loadConfig(options)).toEqual({ value: 'valid' })
    chmodSync(path, 0)
    try {
      // Prove that this process is actually denied access before checking bunfig.
      // Running as a privileged user must fail the fixture, never silently pass.
      let accessError: NodeJS.ErrnoException | undefined
      try { readFileSync(path) }
      catch (error) { accessError = error as NodeJS.ErrnoException }
      expect(['EACCES', 'EPERM']).toContain(accessError?.code)
      await expect(loadConfig(options)).rejects.toBeInstanceOf(ConfigLoadError)
    }
    finally {
      chmodSync(path, 0o600)
    }
  })
})

for (const [extension, first, second] of [
  ['ts', "export default { value: 'first' }", "export default { value: 'second' }"],
  ['mjs', "export default { value: 'first' }", "export default { value: 'second' }"],
  ['cjs', "module.exports = { value: 'first' }", "module.exports = { value: 'second' }"],
  ['json', '{ "value": "first" }', '{ "value": "second" }'],
]) {
  test(`explicit configuration loads reload ${extension} values`, async () => {
    await withPolicyFixture(async directory => {
      const path = join(directory, `config.${extension}`)
      writeFileSync(path, first)
      expect(await loadConfig({ ...policyOptions(directory), configFile: path, defaultConfig: {} })).toEqual({ value: 'first' })
      writeFileSync(path, second)
      expect(await loadConfig({ ...policyOptions(directory), configFile: path, defaultConfig: {} })).toEqual({ value: 'second' })
    })
  })
}

test('explicit configuration loads preserve imports, metadata, top-level await and callbacks', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'relative.ts'), "export default 'relative'")
    const dependency = join(directory, 'node_modules/bunfig-configuration-fixture')
    mkdirSync(dependency, { recursive: true })
    writeFileSync(join(dependency, 'package.json'), JSON.stringify({ name: 'bunfig-configuration-fixture', type: 'module', exports: './index.js' }))
    writeFileSync(join(dependency, 'index.js'), "export default 'package'")
    const path = join(directory, 'config.ts')
    writeFileSync(path, [
      "import value from './relative.ts'",
      "import { basename } from 'node:path'",
      "import packageValue from 'bunfig-configuration-fixture'",
      'const ready = await Promise.resolve(value)',
      'export default {',
      '  ready, packageValue, directory: import.meta.dir, path: import.meta.path,',
      '  file: basename(import.meta.path),',
      '  callback: async () => (await import("./relative.ts")).default,',
      '}',
    ].join('\n'))
    const loaded = await loadConfig({ ...policyOptions(directory), configFile: path, defaultConfig: {} }) as {
      ready: string
      packageValue: string
      directory: string
      path: string
      file: string
      callback: () => Promise<string>
    }
    expect(loaded.ready).toBe('relative')
    expect(loaded.packageValue).toBe('package')
    expect(loaded.directory).toBe(directory)
    expect(loaded.path).toBe(path)
    expect(loaded.file).toBe('config.ts')
    expect(await loaded.callback()).toBe('relative')
  })
})

for (const name of ['space name', 'café 日本語', 'percent%name', 'hash#name']) {
  test(`explicit configuration loads preserve a ${name} path`, async () => {
    await withPolicyFixture(async directory => {
      const nested = join(directory, name)
      mkdirSync(nested)
      const path = join(nested, 'config.ts')
      writeFileSync(path, "export default { value: 'first' }")
      expect(await loadConfig({ ...policyOptions(directory), configFile: path, defaultConfig: {} })).toEqual({ value: 'first' })
      writeFileSync(path, "export default { value: 'second' }")
      expect(await loadConfig({ ...policyOptions(directory), configFile: path, defaultConfig: {} })).toEqual({ value: 'second' })
    })
  })
}

test('literal question-mark paths preserve native loading or its underlying resolution error', async () => {
  await withPolicyFixture(async directory => {
    const nested = join(directory, 'query?name')
    mkdirSync(nested)
    const path = join(nested, 'config.ts')
    const source = "export default { value: 'first' }"
    writeFileSync(path, source)
    expect(readFileSync(path, 'utf8')).toBe(source)
    const options = { ...policyOptions(directory), configFile: path, defaultConfig: {} }
    let nativeFailure: { error: unknown } | undefined
    try {
      await import(pathToFileURL(path).href)
    }
    catch (error) {
      nativeFailure = { error }
    }

    if (nativeFailure) {
      // Bun 1.4.2/1.4.3 treat a decoded pathname '?' as a query delimiter.
      // A native loader failure must remain an error, never become defaults.
      const nativeError = nativeFailure.error
      expect(nativeError).toBeInstanceOf(Error)
      if (!(nativeError instanceof Error))
        throw new Error('Native module resolution did not provide an Error')
      const target = nativeError.message.indexOf(path)
      expect(target).toBeGreaterThanOrEqual(0)
      const diagnostic = nativeError.message.slice(0, target + path.length)

      let failure: unknown
      try { await loadConfig(options) }
      catch (error) { failure = error }
      expect(failure).toBeInstanceOf(ConfigLoadError)
      if (!(failure instanceof ConfigLoadError))
        throw new Error('Native module failure was not propagated as ConfigLoadError')
      expect(failure.context.configPath).toBe(path)
      expect(failure.context.originalError).toBe(nativeError.name)
      const cause = failure.cause
      expect(cause).toBeInstanceOf(Error)
      if (!(cause instanceof Error))
        throw new Error('Native module error cause was not retained')
      expect(cause.name).toBe(nativeError.name)
      expect(cause.message).toContain(diagnostic)
      expect(failure.context.originalMessage).toBe(cause.message)
    }
    else {
      expect(await loadConfig(options)).toEqual({ value: 'first' })
      writeFileSync(path, "export default { value: 'second' }")
      expect(await loadConfig(options)).toEqual({ value: 'second' })
    }
  })
})

test('concurrent configuration loads await top-level execution through real-path and symlink aliases', async () => {
  await withPolicyFixture(async directory => {
    const path = join(directory, 'config.ts')
    const alias = join(directory, 'alias.ts')
    writeFileSync(path, "await new Promise(resolve => setTimeout(resolve, 20)); export default { value: 'ready' }")
    symlinkSync(path, alias)
    const options = { ...policyOptions(directory), defaultConfig: {} }
    const results = await Promise.all([
      loadConfig({ ...options, configFile: path }),
      loadConfig({ ...options, configFile: alias }),
      loadConfig({ ...options, configFile: path }),
    ])
    expect(results).toEqual([{ value: 'ready' }, { value: 'ready' }, { value: 'ready' }])
  })
})

test('a rejected configuration can recover after correction without poisoning concurrent loads', async () => {
  await withPolicyFixture(async directory => {
    const path = join(directory, 'config.ts')
    const options = { ...policyOptions(directory), configFile: path, defaultConfig: {} }
    writeFileSync(path, "throw new Error('not ready'); export default {}")
    await expect(loadConfig(options)).rejects.toBeInstanceOf(ConfigLoadError)
    writeFileSync(path, "export default { value: 'corrected' }")
    expect(await Promise.all([loadConfig(options), loadConfig(options)]))
      .toEqual([{ value: 'corrected' }, { value: 'corrected' }])
  })
})

test('configuration loads can join an ordinary import still awaiting top-level execution', async () => {
  await withPolicyFixture(async directory => {
    const path = join(directory, 'config.ts')
    const started = join(directory, 'started')
    const proceed = join(directory, 'proceed')
    const executions = join(directory, 'executions')
    writeFileSync(path, [
      "import { appendFileSync, existsSync, writeFileSync } from 'node:fs'",
      `appendFileSync(${JSON.stringify(executions)}, 'executed\\n')`,
      `writeFileSync(${JSON.stringify(started)}, 'started')`,
      `while (!existsSync(${JSON.stringify(proceed)})) await new Promise(resolve => setTimeout(resolve, 1))`,
      "export default { value: 'ready' }",
    ].join('\n'))
    const ordinary = import(pathToFileURL(path).href)
    let loaded: Promise<unknown> | undefined
    try {
      // Synchronize against actual module execution rather than a timing guess.
      const deadline = performance.now() + 1000
      while (!await Bun.file(started).exists()) {
        if (performance.now() >= deadline)
          throw new Error('Ordinary module did not enter top-level execution')
        await new Promise(resolve => setTimeout(resolve, 1))
      }
      loaded = loadConfig({ ...policyOptions(directory), configFile: path, defaultConfig: {} })
      // Keep execution pending while the public loader reaches the import.
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(readFileSync(executions, 'utf8')).toBe('executed\n')
      writeFileSync(proceed, 'continue')
      const [module, configuration] = await Promise.all([ordinary, loaded])
      expect(module.default).toEqual({ value: 'ready' })
      expect(configuration).toEqual({ value: 'ready' })
      expect(readFileSync(executions, 'utf8')).toBe('executed\n')
    }
    finally {
      writeFileSync(proceed, 'continue')
      await Promise.allSettled([ordinary, loaded])
    }
  })
})

for (const exported of ['null', 'false', '0', "'text'", '[]', 'undefined']) {
  test(`throw policy rejects a default export of ${exported}`, async () => {
    await withPolicyFixture(async directory => {
      writeFileSync(join(directory, 'policy.config.ts'), `export default ${exported}`)
      await expect(loadConfig(policyOptions(directory))).rejects.toBeInstanceOf(ConfigLoadError)
    })
  })
}

test('throw policy rejects configuration execution failures', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'policy.config.ts'), "throw new Error('invalid configuration'); export default {}")
    await expect(loadConfig(policyOptions(directory))).rejects.toBeInstanceOf(ConfigLoadError)
  })
})

test('throw policy rejects malformed package.json rather than using defaults', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'package.json'), '{ "policy":')
    await expect(loadConfig(policyOptions(directory))).rejects.toBeInstanceOf(ConfigLoadError)
  })
})

for (const value of [null, false, 0, 'text', []]) {
  test(`throw policy rejects an invalid package.json field ${JSON.stringify(value)}`, async () => {
    await withPolicyFixture(async directory => {
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ policy: value }))
      await expect(loadConfig(policyOptions(directory))).rejects.toBeInstanceOf(ConfigLoadError)
    })
  })
}

test('an absent package.json field still permits defaults under throw policy', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'fixture' }))
    expect(await loadConfig(policyOptions(directory))).toEqual({ value: 'default' })
  })
})

test('an invalid primary package.json field cannot be masked by a valid alias', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ policy: false, alternate: { value: 'alias' } }))
    await expect(loadConfig({ ...policyOptions(directory), alias: 'alternate' }))
      .rejects.toBeInstanceOf(ConfigLoadError)
  })
})

test('legacy async config preserves explicit throw policy', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'policy.config.ts'), 'export default { value: }')
    await expect(config(policyOptions(directory))).rejects.toBeInstanceOf(ConfigLoadError)
  })
})

test('synchronous library config rejects unsupported throw policy', () => {
  expect(() => createLibraryConfig({
    name: 'policy',
    defaultConfig: { value: 'default' },
    errorPolicy: 'throw',
  })).toThrow(/await loadConfig/)
})


test('optional absence still applies environment overrides under throw policy', async () => {
  const previous = process.env.POLICY_VALUE
  process.env.POLICY_VALUE = 'environment'
  try {
    await withPolicyFixture(async directory => {
      expect(await loadConfig({ ...policyOptions(directory), checkEnv: true }))
        .toEqual({ value: 'environment' })
    })
  }
  finally {
    if (previous === undefined)
      delete process.env.POLICY_VALUE
    else
      process.env.POLICY_VALUE = previous
  }
})

test('strict cached loads still run the current validator', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'policy.config.ts'), "export default { value: 'valid' }")
    const options = { ...policyOptions(directory), cache: { enabled: true } }
    expect(await loadConfig(options)).toEqual({ value: 'valid' })
    await expect(loadConfig({ ...options, validate: () => ['current validation failed'] })).rejects.toBeInstanceOf(ConfigValidationError)
  })
})


test('enhanced result API preserves optional absence with throw policy', async () => {
  await withPolicyFixture(async directory => {
    const result = await loadConfigWithResult(policyOptions(directory))
    expect(result.config).toEqual({ value: 'default' })
    expect(result.source.type).toBe('default')
  })
})


test('strict loads read a changed schema file rather than the cached module', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'policy.config.ts'), "export default { value: 'valid' }")
    const schema = join(directory, 'schema.ts')
    writeFileSync(schema, "export default { type: 'object', properties: { value: { type: 'string' } } }")
    const options = { ...policyOptions(directory), schema }
    expect(await loadConfig(options)).toEqual({ value: 'valid' })
    writeFileSync(schema, "export default { type: 'object', properties: { value: { type: 'number' } } }")
    await expect(loadConfig(options)).rejects.toBeInstanceOf(ConfigValidationError)
  })
})


test('strict discovery distinguishes an inaccessible directory from absence', async () => {
  await withPolicyFixture(async directory => {
    const configDirectory = join(directory, 'config')
    mkdirSync(configDirectory)
    const path = join(configDirectory, 'policy.config.ts')
    writeFileSync(path, "export default { value: 'private' }")
    chmodSync(configDirectory, 0)
    try {
      let accessError: NodeJS.ErrnoException | undefined
      try { readFileSync(path) }
      catch (error) { accessError = error as NodeJS.ErrnoException }
      expect(['EACCES', 'EPERM']).toContain(accessError?.code)
      await expect(loadConfig(policyOptions(directory))).rejects.toBeInstanceOf(ConfigLoadError)
    }
    finally {
      chmodSync(configDirectory, 0o700)
    }
  })
})

test('a non-directory optional search path still permits defaults', async () => {
  await withPolicyFixture(async directory => {
    writeFileSync(join(directory, 'config'), 'not a directory')
    expect(await loadConfig(policyOptions(directory))).toEqual({ value: 'default' })
  })
})

for (const root of [null, [], false, 0, 'text']) {
  test(`throw policy rejects an invalid package.json root ${JSON.stringify(root)}`, async () => {
    await withPolicyFixture(async directory => {
      writeFileSync(join(directory, 'package.json'), JSON.stringify(root))
      await expect(loadConfig(policyOptions(directory))).rejects.toBeInstanceOf(ConfigLoadError)
    })
  })
}

for (const errorPolicy of [undefined, 'fallback'] as const) {
  test(`lenient discovery ${errorPolicy ?? 'default'} skips denied directories for a valid later file`, async () => {
    await withPolicyFixture(async directory => {
      const denied = join(directory, 'config')
      const later = join(directory, '.config')
      mkdirSync(denied)
      mkdirSync(later)
      const deniedFile = join(denied, 'policy.config.ts')
      writeFileSync(deniedFile, "export default { value: 'private' }")
      writeFileSync(join(later, 'policy.config.ts'), "export default { value: 'later' }")
      chmodSync(denied, 0)
      try {
        let accessError: NodeJS.ErrnoException | undefined
        try { readFileSync(deniedFile) }
        catch (error) { accessError = error as NodeJS.ErrnoException }
        expect(['EACCES', 'EPERM']).toContain(accessError?.code)
        expect(await loadConfig({ ...policyOptions(directory), errorPolicy }))
          .toEqual({ value: 'later' })
      }
      finally {
        chmodSync(denied, 0o700)
      }
    })
  })
}
