# Error handling

Choose the loading policy at the asynchronous configuration boundary. Ordinary
`loadConfig` callers keep their existing fallback behavior. Use
`errorPolicy: 'throw'` when an invalid configuration must stop startup.

## Propagate configuration errors

```ts
import { loadConfig } from 'bunfig'

const settings = await loadConfig({
  name: 'app',
  defaultConfig: { port: 3000 },
  errorPolicy: 'throw',
  validate: (value) => {
    if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535)
      return ['port must be an integer between 1 and 65535']
  },
})
```

Optional discovery still returns defaults when no configuration exists, with
environment overrides when `checkEnv` is enabled. Missing paths and non-directory
search paths are absence. Permission errors, malformed or failing modules,
invalid exported values, and validation failures reject the load.

A discovered `package.json` must parse to an object. A configuration field that
is present must contain an object; `null`, arrays, booleans, numbers and strings
are errors under throw policy. An invalid primary field cannot be hidden by a
valid alias. A missing field permits the usual default behavior.

Throw policy bypasses Bunfig's result and file caches, including results from
earlier lenient calls. Configuration entrypoints and schema files are loaded
again, and the current validator runs. Await configuration in your application's
startup or asynchronous factory before creating resources from its settings.

Bunfig owns reloads of the configuration and schema entry modules. Imports made
by those modules keep Bun's normal dependency caching. Do not concurrently
replace or delete cache entries for Bunfig-managed modules from another loader.
Ordinary imports can run alongside Bunfig loads; an entry still executing is
awaited before subsequent Bunfig reloads.

Module resolution follows the installed Bun runtime. A file can exist and be
readable while Bun cannot resolve it: Bun 1.4.2 and 1.4.3 have this limitation for
literal `?` characters in a pathname. Throw policy preserves that native failure
as `ConfigLoadError`, including its cause and path. Bunfig does not replace the
runtime's module resolver; this upstream pathname limitation remains unresolved.

## Require a specific file

```ts
import { loadConfig } from 'bunfig'

const settings = await loadConfig({
  name: 'app',
  configFile: './config/app.ts',
  defaultConfig: { port: 3000 },
  errorPolicy: 'throw',
})
```

An explicit `configFile` is required. Missing it raises `ConfigNotFoundError`;
the loader does not search for another file or replace the failure with defaults.

## Inspect structured errors

```ts
import { ConfigLoadError, ConfigValidationError, loadConfig } from 'bunfig'

try {
  await loadConfig({
    name: 'app',
    defaultConfig: { port: 3000 },
    errorPolicy: 'throw',
  })
}
catch (error) {
  if (error instanceof ConfigLoadError)
    console.error('Configuration could not be loaded', error.code)
  else if (error instanceof ConfigValidationError)
    console.error('Configuration validation failed', error.code)
  throw error
}
```

| Error | Meaning | Context |
| --- | --- | --- |
| `ConfigNotFoundError` | A required file or enhanced discovery result was not found | `configName`, `searchPaths`, `searchPathCount` |
| `ConfigLoadError` | A configuration file or package setting could not be read or loaded | `configPath`, `originalError`, `originalMessage` |
| `ConfigValidationError` | A schema or custom validator rejected the configuration | `configName`, `validationErrors`, `errorCount` |

These classes extend `BunfigError`, which provides `code`, `message`, `timestamp`
and `context`. `ConfigLoadError.cause` preserves the underlying error. The
`originalError` context field is its name, and `validationErrors` is an array of
messages. Configuration errors can include sensitive values, so log only the
metadata your application needs rather than dumping configuration or context.

## Other loading APIs

The legacy asynchronous `config({ ... })` function honors `errorPolicy: 'throw'`.
The string-only form keeps its existing behavior.

`loadConfigWithResult({ ... })` returns the configuration together with source
information. Its existing enhanced error behavior remains available. With throw
policy, optional absence uses defaults; invalid discovered configuration rejects.

`createLibraryConfig` returns synchronous defaults while loading in the
background. It cannot make an asynchronous loading failure throw at the call
site, so it rejects `errorPolicy: 'throw'` immediately. Use `await loadConfig`
when initialization must succeed before your application proceeds.

## Fallback and retries

Leave the policy unset or choose `errorPolicy: 'fallback'` when the existing
lenient behavior is appropriate. Lenient discovery can skip an inaccessible
optional directory and continue to a later candidate. An explicit file remains
required.

For shared storage, authentication and other required infrastructure, propagate
configuration errors instead of substituting a different backend. Retry only
failures your application can identify as transient; syntax errors and invalid
settings require a configuration correction.
