# Usage

If you are building any sort of Bun project, you can use the `loadConfig` function to load your configuration.

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
  defaults: { // default: {}
    port: 3000,
    host: 'localhost',
  },
}

const resolvedConfig = await loadConfig(options)

console.log(resolvedConfig) // { port: 3000, host: 'localhost' }, unless a config file is found
```

> [!TIP]
> If your process.cwd() includes a `$name.config.{ts,js,mjs,cjs}` file, it will be loaded and merged with the defaults, with file config values taking precedence.

## Options

### `name`

The name of your application. This is used to find the configuration file.

### `cwd`

The directory to search for the configuration file. Defaults to `process.cwd()`.

### `defaults`

The default configuration values. These will be merged with the configuration file values, with the file values taking precedence.

### `configFile`

The name of the configuration file to look for. Defaults to `$name.config.{ts,js,mjs,cjs}`.

## Configuration File

The configuration file should export an object that matches the type you provide to `Config`. For example:

```ts
// my-app.config.ts
export default {
  port: 4000,
  host
}
```

This file will be loaded and merged with the defaults, with the file values taking precedence.

## Browser Support

wip
