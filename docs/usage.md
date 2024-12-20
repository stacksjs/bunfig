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
> If your process.cwd() includes a `$name.config.{ts,js,mjs,cjs}` file, it will be loaded and merged with the defaults, with file config file values taking precedence.
