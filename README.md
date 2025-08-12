<p align="center"><img src="https://github.com/stacksjs/bunfig/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# Bunfig

> Smart configuration loader for libraries, apps, and CLIs built utilizing Bun.

## Features

- 🔄 **Smart Config**: _intelligent configuration loading with multiple sources_
- 🏠 **Home Directory Support**: _global configurations via `~/.config/$name/`_
- 🌐 **Universal**: _optimized for both Bun & browser environments_
- 🪶 **Lightweight**: _zero dependencies, built on native modules_
- 💪 **Type-Safe**: _fully typed configurations with generated or dynamic type definitions_
- 🌍 **Environment Variables**: _automatic environment variable support based on config name_
- 🛠️ **CLI Tools**: _powerful & easy-to-use CLI_
- 📦 **Flexible**: _supports multiple config file formats (.ts, .js, .mjs, .cjs, .json, .mts, .cts)_
- 🔄 **Aliases**: _support for alternative configuration file names_

## Install

```bash
bun install -d bunfig
```

## Get Started

### Server Environment

If you are building any sort of Bun project, you can use the `loadConfig` function to load your configuration from files:

```ts
import type { Config } from 'bunfig'
import { loadConfig } from 'bunfig'

interface MyLibraryConfig {
  port: number
  host: string
}

const options: Config<MyLibraryConfig> = {
  name: 'my-app', // required
  cwd: './', // default: process.cwd()
  defaultConfig: { // default: {}
    port: 3000,
    host: 'localhost',
  },
}

const resolvedConfig = await loadConfig(options)

console.log(resolvedConfig) // { port: 3000, host: 'localhost' }, unless a config file is found
```

> [!TIP]
> bunfig searches for configuration in this order:
> 1. **Project directories** (precedence: `./` > `./config` > `./.config` > custom `configDir` if provided)
>    - In the project root: `$name.config.{ts,js,mjs,cjs,json}`, `.$name.config.{ts,js,mjs,cjs,json}`, `$name.{ts,js,mjs,cjs,json}`, `.$name.{ts,js,mjs,cjs,json}`
>    - In `config/` or `.config/` (and your custom `configDir`): it prefers bare names (`$name.{ts,...}`, `.$name.{ts,...}`) before the suffixed forms (`$name.config.{ts,...}`, `.$name.config.{ts,...}`) to avoid redundancy
> 2. **Home directory**: `~/.config/$name/config.{ts,js,mjs,cjs,json}` (and `~/.config/$name/$name.config.{ts,...}`)
> 3. **Package.json**: a section named after your config `name` (or its `alias`)

### Home Directory Configuration

bunfig supports global configuration files in your home directory following the XDG Base Directory specification. This is useful for:

- **Global tool settings** that apply across all your projects
- **Personal preferences** that you want to use everywhere
- **Default configurations** that can be overridden per project

```ts
// ~/.config/my-app/config.ts (global configuration)
export default {
  theme: 'dark',
  defaultPort: 8080,
  globalFeatures: ['feature1', 'feature2'],
}

// ./my-app.config.ts (project-specific override)
export default {
  defaultPort: 3000, // Override global setting for this project
  projectSpecific: true,
}
```

The final configuration will be deeply merged, with local project settings taking precedence over global home directory settings.

### Using Aliases

You can specify an alias to check for alternative config file names when the primary name doesn't exist:

```ts
const config = await loadConfig({
  name: 'tlsx',
  alias: 'tls', // Alternative name to check if tlsx.config.* doesn't exist
  defaultConfig: {
    domain: 'example.com',
    port: 443,
  },
})
```

This will check for both `tlsx.config.ts` and `tls.config.ts` _(and other variations)_ in both local and home directories, using the first one it finds. This is useful for maintaining backward compatibility when renaming configurations or providing fallbacks.

### Environment Variables

Bunfig automatically checks for environment variables based on the config name. Environment variables take precedence over default values but are overridden by config files.

You can disable this feature by setting `checkEnv: false` in your config options:

```ts
const options = {
  name: 'my-app',
  defaultConfig: { /* ... */ },
  checkEnv: false, // Disable environment variable checking
}
```

The naming convention for environment variables is:
```
[CONFIG_NAME]_[PROPERTY_NAME]
```

For nested properties, use underscores to separate the levels:
```
[CONFIG_NAME]_[NESTED_PROPERTY_PATH]
```

Example:

```ts
// With a config name of "my-app"
const options = {
  name: 'my-app',
  defaultConfig: {
    port: 3000,
    host: 'localhost',
    database: {
      url: 'postgres://localhost:5432',
      user: 'admin',
    },
  },
}

// These environment variables would be automatically used if set:
// MY_APP_PORT=8080
// MY_APP_HOST=example.com
// MY_APP_DATABASE_URL=postgres://production:5432
// MY_APP_DATABASE_USER=prod_user
```

For array values, you can use a JSON string or comma-separated values:
```
MY_APP_ALLOWED_ORIGINS=["https://example.com","https://api.example.com"]
// or
MY_APP_ALLOWED_ORIGINS=https://example.com,https://api.example.com
```

### Browser Environment

For browser environments, use the `loadConfig` function from the browser-specific entry point to load your configuration from an API endpoint:

```ts
import type { Config } from 'bunfig'
import { loadConfig } from 'bunfig/browser'

interface MyLibraryConfig {
  port: number
  host: string
}

const options: Config<MyLibraryConfig> = {
  name: 'my-app',
  endpoint: '/api/config', // required for browser environment
  defaultConfig: {
    port: 3000,
    host: 'localhost',
  },
  headers: { // optional custom headers
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value',
  },
}

const resolvedConfig = await loadConfig(options)
```

In the browser:

- The `endpoint` parameter is required to specify where to fetch the configuration
- Custom headers can be provided to authenticate or customize the request
- Default headers (`Accept` and `Content-Type`) are automatically included
- If the fetch fails, the default configuration is used as a fallback

### Alternative Usage

Alternatively, you can use the `config` function to load your configuration in server environments:

```ts
import type { Config } from 'bunfig'
import { config } from 'bunfig'

interface MyAppOrLibraryConfig {
  port: number
  host: string
}

const options: Config<MyAppOrLibraryConfig> = {
  name: 'my-app', // required to know which config file to load
  cwd: './', // default: process.cwd()
  defaultConfig: { // default: {}
    port: 3000,
    host: 'localhost',
  },
}

const resolvedConfig = await config(options)
```

The config function is a wrapper around the `loadConfig` function and is useful for loading configuration in a more flexible way. It accepts an options object with the following properties:

- `name`: The name of the config file to load.
- `cwd`: The current working directory to load the config file from.
- `defaultConfig`: The default config to use if no config file is found.

For browser usage, see the [Browser Environment](#browser-environment) section above.

### Dynamic Config Name Types (no files on disk)

You can get fully dynamic `ConfigNames` types in your app without generating files.

Use the provided build plugin to expose a virtual module based on your `config` directory contents:

```ts
// build.ts
// import { bunfigPlugin } from 'bunfig'

await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  target: 'bun',
  plugins: [
    bunfigPlugin(),
  ],
})
```

In your code, `ConfigNames` comes from a virtual module. When the plugin runs, it becomes a string-literal union of your config file basenames (e.g. `'app' | 'test'`). Without the plugin, it safely falls back to `string`.

```ts
import type { ConfigNames } from 'bunfig'

function load(name: ConfigNames) {
  // name is type-checked against your config files when the plugin is active
}
```

If you need to generate static types files on disk, you can use the CLI as well:

```bash
bunx bunfig generate --config-dir ./config --generated-dir ./src/generated
```

#### How it works

- **Virtual module**: bunfig exposes `ConfigNames` via `export type ConfigNames = import('virtual:bunfig-types').ConfigNames`. Your bundler plugin (`bunfigPlugin`) provides a virtual module at build time that turns it into a string-literal union of file basenames in your `config` directory.
- **Safe fallback**: If no plugin is active, bunfig ships an ambient fallback declaration so the type resolves to `string`. This is published and available under the subpath `bunfig/virtual-bunfig-types`.
- **No extra setup required**: Most setups work out of the box. If your TypeScript project uses strict project references or custom `types` filtering and you see a missing type error for `virtual:bunfig-types`, reference the shipped fallback explicitly using one of:

```ts
/// <reference types="bunfig" />
```

or in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["bunfig"]
  }
}
```

You do not import this file directly; it is an ambient declaration that satisfies the `import('virtual:bunfig-types')` type reference when a bundler plugin is not providing the virtual module.

##### Advanced: narrow config types by name (via virtual module)

When the plugin is active, you can map names to their config types and narrow your types:

```ts
import type { ConfigOf } from 'bunfig'
import { loadConfig } from 'bunfig'

// If you know the name, you can narrow types for defaultConfig and the return type
const cfg = await loadConfig<ConfigOf<'app'>>({
  name: 'app',
  defaultConfig: {
    // Type-checked against the default export of config/app.(ts|js|...)
  } as ConfigOf<'app'>,
})
```

- `ConfigByName` is a mapping of discovered names to their default export types.
- `ConfigOf<N>` picks the config type for a given `N`.
- Without the plugin, these fall back to broad types (e.g., `Record<string, any>`), so your code remains type-safe to compile.

### Optional: TypeScript language service plugin (no files, editor/tsc only)

If you want dynamic narrow types without the build plugin and without generating files, enable the bundled TS language service plugin in your `tsconfig.json`:

```json
{
  "compilerOptions": { "types": ["bunfig"] },
  "plugins": [
    { "name": "bunfig/ts-plugin", "configDir": "./config" }
  ]
}
```

- Provides `ConfigNames`, `ConfigByName`, and `ConfigOf<N>` virtually to the editor and tsc.
- Does not write files.
- Works without running a bundler. Build output remains unaffected.

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stacksjs/stacks/releases) page for more information on what has changed recently.

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

“Software that is free, but hopes for a postcard.” We love receiving postcards from around the world showing where `bunfig` is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/bunfig/tree/main/LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/bunfig?style=flat-square
[npm-version-href]: https://npmjs.com/package/bunfig
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/bunfig/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/bunfig/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/bunfig/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/bunfig -->
