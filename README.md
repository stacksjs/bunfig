<p align="center"><img src="https://github.com/stacksjs/bunfig/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# Bunfig

> Smart configuration loader for libraries, apps, and CLIs built utilizing Bun.

## Features

- 🔄 **Smart Config**: _intelligent configuration loading_
- 🌐 **Universal**: _optimized for both Bun & browser environments_
- 🪶 **Lightweight**: _zero dependencies, built on native modules_
- 💪 **Type-Safe**: _fully typed configurations with generated type definitions_
- 🛠️ **CLI Tools**: _powerful & easy-to-use CLI_
- 📦 **Flexible**: _supports multiple config file formats (.ts, .js, .mjs, .cjs, .json, .mts, .cts)_

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
> If your `process.cwd()` includes a `$name.config.{ts,js,mjs,cjs,json}` _(or `.$name.config.{ts,js,mjs,cjs,json}`)_ file, it will be loaded and merged with defaults, where file config file values take precedence. For minimalists, it also loads a `.$name.{ts,js,mjs,cjs,json}` and `$name.{ts,js,mjs,cjs,json}` file if present.

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
