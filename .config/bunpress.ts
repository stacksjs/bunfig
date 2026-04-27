import type { BunpressConfig } from 'bunpress'

const config: BunpressConfig = {
  name: 'bunfig',
  description: 'TypeScript-first configuration loader with automatic environment variable detection, validation, and zero dependencies.',
  url: 'https://bunfig.stacksjs.org',

  theme: {
    primaryColor: '#F59E0B',
  },

  nav: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'API', link: '/api' },
    { text: 'GitHub', link: 'https://github.com/stacksjs/bunfig' },
  ],

  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'What is bunfig?', link: '/index' },
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Quick Start', link: '/quick-start' },
      ],
    },
    {
      text: 'Guide',
      items: [
        { text: 'Config Loading', link: '/guide/loading' },
        { text: 'Type Safety', link: '/guide/types' },
        { text: 'Environment Variables', link: '/guide/env' },
      ],
    },
    {
      text: 'Features',
      items: [
        { text: 'File Discovery', link: '/features/file-discovery' },
        { text: 'Environment Variables', link: '/features/env-vars' },
        { text: 'Validation', link: '/features/validation' },
        { text: 'Hot Reload', link: '/features/hot-reload' },
        { text: 'Caching', link: '/features/caching' },
        { text: 'Browser Support', link: '/features/browser' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Build Plugin', link: '/advanced/build-plugin' },
        { text: 'TypeScript Plugin', link: '/advanced/ts-plugin' },
        { text: 'CLI Usage', link: '/advanced/cli' },
        { text: 'Migration Guide', link: '/migration' },
      ],
    },
    {
      text: 'Recipes',
      items: [
        { text: 'Multi-Environment', link: '/recipes/multi-env' },
        { text: 'Monorepo Setup', link: '/recipes/monorepo' },
        { text: 'Docker', link: '/recipes/docker' },
      ],
    },
    {
      text: 'API Reference',
      items: [
        { text: 'Functions', link: '/api' },
        { text: 'Types', link: '/api/types' },
        { text: 'Configuration', link: '/api/config' },
      ],
    },
  ],

  head: [
    ['meta', { name: 'author', content: 'Stacks.js' }],
    ['meta', { name: 'keywords', content: 'bunfig, config, configuration, typescript, bun, environment variables, validation' }],
  ],

  socialLinks: [
    { icon: 'github', link: 'https://github.com/stacksjs/bunfig' },
    { icon: 'discord', link: 'https://discord.gg/stacksjs' },
    { icon: 'twitter', link: 'https://twitter.com/stacksjs' },
  ],
}

export default config
