<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# Glint

A blazingly fast linter and formatter for HTML, CSS, JavaScript, and TypeScript. Built for absolute performance with Bun's native APIs and designed to be extensible via plugins.

## ✨ Features

- 🚀 **Performance-Optimized** - Built with Bun's native APIs for maximum performance
- 🔧 **Multi-Language Support** - HTML, CSS, JavaScript, and TypeScript
- 🔌 **Plugin System** - Extensible architecture for custom rules and formatters
- 💾 **Smart Caching** - File-based caching with memory optimization
- ⚡ **Parallel Processing** - Multi-threaded processing for large codebases
- 🎯 **Zero Config** - Works out of the box with sensible defaults
- 📊 **Performance Metrics** - Built-in performance monitoring and reporting

### Installation

```bash
# Using Bun (recommended)
bun add @stacksjs/glint

# Using npm
npm install @stacksjs/glint

# Using yarn
yarn add @stacksjs/glint
```

### CLI Usage

```bash
# Lint files
glint lint

# Lint specific files
glint lint src/**/*.ts

# Format files
glint format --write

# Check both linting and formatting
glint check

# Show help
glint --help
```

### Programmatic Usage

```typescript
import { GlintEngine } from '@stacksjs/glint'

const engine = new GlintEngine({
  verbose: true,
  parallel: true,
  cacheEnabled: true,
})

// Lint files
const lintResults = await engine.lintFiles(['src/**/*.ts'])

// Format files
const formatResults = await engine.formatFiles(['src/**/*.ts'], true)

// Both lint and format
const { lintResults, formatResults } = await engine.lintAndFormat(['src/**/*.ts'])
```

## Configuration

Create a `glint.config.ts` file in your project root:

```typescript
import type { GlintConfig } from '@stacksjs/glint'

export default {
  // Performance settings
  parallel: true,
  maxWorkers: 4,
  cacheEnabled: true,

  // File processing
  include: ['**/*.{html,css,js,ts,jsx,tsx}'],
  exclude: ['**/node_modules/**', '**/dist/**'],

  // Language-specific configuration
  html: {
    enabled: true,
    rules: {
      'no-duplicate-attributes': 'error',
      'require-alt': 'error',
    },
    formatter: {
      indentSize: 2,
      indentType: 'spaces',
      lineWidth: 120,
    },
  },

  css: {
    enabled: true,
    rules: {
      'no-duplicate-properties': 'error',
      'no-empty-rules': 'warn',
    },
  },

  javascript: {
    enabled: true,
    rules: {
      'no-unused-vars': 'error',
      'prefer-const': 'error',
    },
  },

  typescript: {
    enabled: true,
    rules: {
      'no-explicit-any': 'warn',
      'prefer-interface': 'warn',
    },
  },
} satisfies GlintConfig
```

## CLI Commands

### Lint Command

```bash
# Basic linting
glint lint

# Lint specific patterns
glint lint "src/**/*.{ts,js}"

# Output formats
glint lint --format json
glint lint --format stylish
glint lint --format compact

# Save output to file
glint lint --output-file results.json

# Performance options
glint lint --parallel --max-workers 8
glint lint --no-cache
```

### Format Command

```bash
# Check formatting (dry run)
glint format

# Write formatted files
glint format --write

# Check if files need formatting (exit code 1 if needed)
glint format --check

# Format specific files
glint format "src/**/*.ts" --write
```

### Check Command

```bash
# Run both linting and formatting checks
glint check

# Check specific files
glint check "src/**/*.ts"
```

### Cache Commands

```bash
# Clear cache
glint cache:clear

# Show cache info
glint cache:info
```

## Architecture

Glint is built with performance as the top priority:

### Core Components

- **FileProcessor** - High-performance file discovery and loading with Bun's native glob
- **GlintLinter** - Multi-threaded AST-based linting engine
- **GlintFormatter** - Fast formatting with language-specific optimizations
- **FileCache** - Two-tier caching (memory + disk) for maximum speed
- **GlintEngine** - Main orchestrator with parallel processing

### Performance Optimizations

- **Native Bun APIs** - Uses Bun's fast glob and file operations
- **Parallel Processing** - Multi-worker architecture for large codebases
- **Smart Caching** - Content-based caching with version validation
- **Memory Management** - Efficient memory usage with streaming and chunking
- **AST Reuse** - Optimized AST parsing and traversal

## Plugin System

Glint supports a powerful plugin system for extending functionality:

```typescript
// Example plugin
export const myPlugin: Plugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  languages: ['javascript', 'typescript'],

  rules: {
    'my-custom-rule': {
      meta: {
        type: 'problem',
        docs: {
          description: 'My custom rule',
          category: 'Best Practices',
          recommended: true,
        },
      },
      create: context => ({
        VariableDeclaration: (node) => {
          // Custom rule logic
        },
      }),
    },
  },

  formatters: {
    javascript: {
      format: async (code, options) => {
        // Custom formatting logic
        return formattedCode
      },
    },
  },
}

// Load plugin
engine.loadPlugin(myPlugin)
```

## Performance Metrics

Glint provides detailed performance metrics:

```typescript
const metrics = engine.getMetrics()

console.log(`Total time: ${metrics.totalTime}ms`)
console.log(`Files processed: ${metrics.filesProcessed}`)
console.log(`Lines per second: ${metrics.linesProcessed / (metrics.totalTime / 1000)}`)
console.log(`Cache hit rate: ${metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100}%`)
```

## Built-in Rules

### HTML Rules

- `no-duplicate-attributes` - Disallow duplicate attributes
- `require-alt` - Require alt attribute for img elements
- `no-inline-styles` - Disallow inline styles
- `no-obsolete-tags` - Disallow obsolete HTML tags
- `proper-nesting` - Ensure proper HTML nesting

### CSS Rules

- `no-duplicate-properties` - Disallow duplicate properties
- `no-empty-rules` - Disallow empty CSS rules
- `prefer-shorthand` - Prefer shorthand properties
- `no-vendor-prefixes` - Disallow vendor prefixes
- `color-format` - Enforce consistent color format

### JavaScript Rules

- `no-unused-vars` - Disallow unused variables
- `no-console` - Disallow console statements
- `prefer-const` - Prefer const declarations
- `no-var` - Disallow var declarations
- `eqeqeq` - Require strict equality
- `curly` - Require curly braces

### TypeScript Rules

- `no-explicit-any` - Disallow explicit any type
- `prefer-interface` - Prefer interfaces over type aliases
- `no-non-null-assertion` - Disallow non-null assertions
- `explicit-function-return-type` - Require explicit return types

## Performance Benchmarks

Glint is designed for speed. Here are some benchmarks:

| Project Size | Files | Lines | Glint Time | Competitor Time | Speedup |
|--------------|-------|-------|------------|-----------------|---------|
| Small        | 50    | 5K    | 45ms       | 180ms          | 4x      |
| Medium       | 500   | 50K   | 320ms      | 1.8s           | 5.6x    |
| Large        | 2000  | 200K  | 1.1s       | 8.2s           | 7.5x    |

*Benchmarks run on MacBook Pro M2 with 16GB RAM*

### Development Setup

```bash
# Clone the repository
git clone https://github.com/stacksjs/glint.git
cd glint

# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test

# Run linting
bun run lint
```

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stackjs/bun-ts-starter/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-starter/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

“Software that is free, but hopes for a postcard.” We love receiving postcards from around the world showing where Stacks is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/bun-ts-starter?style=flat-square
[npm-version-href]: https://npmjs.com/package/bun-ts-starter
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-starter/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-starter/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-starter/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-starter -->
