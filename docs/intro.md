<p align="center"><img src="https://github.com/stacksjs/bunfig/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

# Introduction

`bunfig` is a smart configuration loader designed specifically for Bun projects. It provides a simple, type-safe way to manage configuration files in your Bun applications with zero dependencies.

## Key Features

- **Smart Configuration Loading**: Automatically finds and loads configuration files from multiple possible locations and formats
- **Type Safety**: Full TypeScript support with automatic type generation for your config files
- **Zero Dependencies**: Built to be lightweight and fast, perfect for Bun projects
- **Flexible Format Support**: Supports `.ts`, `.js`, `.mjs`, `.cjs`, and `.json` configuration files
- **Deep Merging**: Intelligently merges default configurations with file-based configs
- **Multiple Search Patterns**: Supports various config file naming conventions
- **Type Generation**: Automatically generates TypeScript types for your config files

## Why bunfig?

When building Bun applications, you often need a way to manage configuration that is:

- Type-safe
- Easy to use
- Flexible enough to support different environments
- Fast and lightweight

bunfig solves these problems by providing a zero-dependency configuration loader that works seamlessly with Bun and TypeScript. Think of it as `unconfig`, but optimized specifically for Bun projects.

### Key Benefits

1. **Simple API**: Load your configuration with a single function call
2. **Type Safety**: Get full TypeScript support and automatic type generation
3. **Zero Dependencies**: Keep your project lean and fast
4. **Flexible**: Support multiple config file formats and locations
5. **Bun-Optimized**: Built specifically for the Bun runtime

## Quick Example

```ts
import { config } from 'bunfig'

interface AppConfig {
  port: number
  database: {
    url: string
    pool: number
  }
}

const cfg = await config<AppConfig>({
  name: 'my-app',
  defaultConfig: {
    port: 3000,
    database: {
      url: 'localhost',
      pool: 5,
    },
  },
})
```

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stacksjs/stacks/releases) page for more information on what has changed recently.

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Stargazers

[![Stargazers over time](https://starchart.cc/stacksjs/bunfig.svg?variant=adaptive)](https://starchart.cc/stacksjs/bunfig)

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Two things are true: Stacks OSS will always stay open-source, and we do love to receive postcards from wherever Stacks is used! 🌍 _We also publish them on our website. And thank you, Spatie_

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](https://github.com/stacksjs/bunfig/contributors)

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/bunfig/tree/main/LICENSE.md) for more information.

Made with 💙
