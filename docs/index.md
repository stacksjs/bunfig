---
layout: home

hero:
  name: "bunfig"
  text: "Smart configuration for modern Bun applications"
  tagline: "TypeScript-first configuration loader with automatic environment variable detection, validation, and zero dependencies."
  image: /images/logo-white.png
  actions:
    - theme: brand
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/stacksjs/bunfig

features:
  - title: "🎯 Zero Configuration Setup"
    details: "Works instantly out of the box. Drop in a config file and start using it immediately with automatic TypeScript support and intelligent defaults."
  - title: "🌍 Environment Variable Magic"
    details: "Automatically detects and merges environment variables with smart naming conventions. APP_DATABASE_URL becomes config.database.url seamlessly."
  - title: "🔍 TypeScript First"
    details: "Full TypeScript support with intelligent type inference, autocompletion, and compile-time validation. Your IDE will love it."
  - title: "📁 Smart File Discovery"
    details: "Finds configuration files anywhere - project root, home directory (~/.config), or package.json. Supports .ts, .js, .json, and more."
  - title: "✅ Bulletproof Validation"
    details: "JSON Schema validation, custom rules, and detailed error reporting catch configuration issues before they hit production."
  - title: "⚡ Lightning Fast"
    details: "Zero dependencies, intelligent caching, and optimized for Bun's performance. Loads configurations in microseconds."
  - title: "🏠 XDG Standards Compliant"
    details: "Global configurations via ~/.config/$name/ following XDG Base Directory standards for system-wide settings."
  - title: "🔄 Hot Reload Ready"
    details: "Watch for configuration changes and reload automatically. Perfect for development workflows and dynamic configuration updates."
  - title: "🛡️ Production Ready"
    details: "Comprehensive error handling, fallback strategies, circuit breakers, and monitoring built-in for enterprise deployments."
---
   ```ts

   import { config } from 'bunfig'
   const { port, host } = await config({ name: 'app' })

   ```

</div>

<!-- ## What Developers Say

> "bunfig made our configuration management so much simpler. The automatic environment variable detection is a game-changer."
>
> — **Sarah Chen**, Senior Developer at TechCorp

> "Finally, a config library that understands TypeScript. The validation features caught so many issues before they hit production."
>
> — **Miguel Rodriguez**, DevOps Engineer

> "Zero dependencies and lightning fast. Perfect for our microservices architecture."
>
> — **Alex Kumar**, Platform Architect -->

<Home />
