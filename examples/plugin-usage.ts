import { GlintEngine, reactPlugin, vuePlugin } from '../src'
import { customPlugin } from './custom-plugin'

// Example demonstrating how to use Glint's plugin system

async function main() {
  // Create engine with configuration
  const engine = new GlintEngine({
    verbose: true,
    parallel: true,
    cacheEnabled: true,

    // File processing
    include: ['**/*.{js,ts,jsx,tsx,vue}'],
    exclude: ['**/node_modules/**'],

    // Language configurations
    javascript: {
      enabled: true,
      rules: {
        // Built-in rules
        'no-unused-vars': 'error',
        'prefer-const': 'warn',

        // Custom plugin rules
        '@my-org/custom-glint-plugin/todo-format': 'warn',
        '@my-org/custom-glint-plugin/no-forbidden-functions': 'error',

        // React plugin rules
        '@glint/plugin-react/jsx-uses-react': 'error',
        '@glint/plugin-react/jsx-key': 'warn',
      },
      formatter: {
        indentSize: 2,
        indentType: 'spaces',
        lineWidth: 80,
        endOfLine: 'lf',
        insertFinalNewline: true,
        trimTrailingWhitespace: true,
        singleQuote: true,
        trailingComma: 'es5',
        semicolons: true,
        bracketSpacing: true,
        arrowParens: 'avoid',
      },
    },

    typescript: {
      enabled: true,
      rules: {
        // Built-in rules
        'no-explicit-any': 'warn',
        'prefer-interface': 'warn',

        // Custom plugin rules
        '@my-org/custom-glint-plugin/custom-naming': 'warn',

        // React plugin rules (for TSX)
        '@glint/plugin-react/prefer-function-component': 'warn',
      },
      formatter: {
        indentSize: 2,
        indentType: 'spaces',
        lineWidth: 80,
        endOfLine: 'lf',
        insertFinalNewline: true,
        trimTrailingWhitespace: true,
        singleQuote: true,
        trailingComma: 'es5',
        semicolons: true,
        bracketSpacing: true,
        arrowParens: 'avoid',
      },
      strict: true,
      target: 'ES2022',
    },

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
        endOfLine: 'lf',
        insertFinalNewline: true,
        trimTrailingWhitespace: true,
        wrapAttributes: 'auto',
        htmlWhitespaceSensitivity: 'css',
      },
    },

    css: {
      enabled: true,
      rules: {
        'no-duplicate-properties': 'error',
        'no-empty-rules': 'warn',
      },
      formatter: {
        indentSize: 2,
        indentType: 'spaces',
        lineWidth: 80,
        endOfLine: 'lf',
        insertFinalNewline: true,
        trimTrailingWhitespace: true,
        singleQuote: false,
        trailingComma: false,
      },
    },

    formatting: {
      indentSize: 2,
      indentType: 'spaces',
      lineWidth: 80,
      endOfLine: 'lf',
      insertFinalNewline: true,
      trimTrailingWhitespace: true,
    },

    linting: {
      enabled: true,
      reportUnusedDisableDirectives: true,
      noInlineConfig: false,
    },

    // Plugin configuration
    plugins: [],

    // Performance settings
    maxWorkers: 4,
    cacheDir: '.glint-cache',
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue'],
  })

  // Load plugins programmatically
  console.log('Loading plugins...')

  // Load built-in plugins
  engine.loadPlugin(reactPlugin)
  engine.loadPlugin(vuePlugin)

  // Load custom plugin
  engine.loadPlugin(customPlugin)

  // List loaded plugins
  const plugins = engine.getLoadedPlugins()
  console.log(`\nLoaded ${plugins.length} plugins:`)
  for (const plugin of plugins) {
    console.log(`- ${plugin.name} v${plugin.version}`)
    console.log(`  Languages: ${plugin.languages.join(', ')}`)

    if (plugin.rules) {
      console.log(`  Rules: ${Object.keys(plugin.rules).length}`)
    }
    if (plugin.formatters) {
      console.log(`  Formatters: ${Object.keys(plugin.formatters).length}`)
    }
    if (plugin.processors) {
      console.log(`  Processors: ${Object.keys(plugin.processors).length}`)
    }
  }

  // Example: Lint specific files
  console.log('\nLinting files...')
  const lintResults = await engine.lintFiles(['src/**/*.ts'])

  console.log(`\nLint Results:`)
  console.log(`- Files processed: ${lintResults.length}`)
  console.log(`- Total errors: ${lintResults.reduce((sum, r) => sum + r.errorCount, 0)}`)
  console.log(`- Total warnings: ${lintResults.reduce((sum, r) => sum + r.warningCount, 0)}`)

  // Example: Format files (dry run)
  console.log('\nFormatting files (dry run)...')
  const formatResults = await engine.formatFiles(['src/**/*.ts'], false)

  const changedFiles = formatResults.filter(r => r.changed)
  console.log(`\nFormat Results:`)
  console.log(`- Files checked: ${formatResults.length}`)
  console.log(`- Files needing formatting: ${changedFiles.length}`)

  if (changedFiles.length > 0) {
    console.log('\nFiles that need formatting:')
    for (const result of changedFiles) {
      console.log(`- ${result.filePath}`)
    }
  }

  // Example: Check files (lint + format)
  console.log('\nRunning comprehensive check...')
  const checkResult = await engine.checkFiles(['src/**/*.ts'])

  console.log(`\nCheck Results:`)
  console.log(`- Passed: ${checkResult.passed}`)
  console.log(`- Issues found: ${!checkResult.passed}`)

  // Show performance metrics
  const metrics = engine.getMetrics()
  console.log('\nPerformance Summary:')
  console.log(`- Total time: ${metrics.totalTime.toFixed(2)}ms`)
  console.log(`- Files processed: ${metrics.filesProcessed}`)
  console.log(`- Lines processed: ${metrics.linesProcessed}`)
  console.log(`- Cache hit rate: ${((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1)}%`)

  if (metrics.linesProcessed > 0) {
    const linesPerSecond = Math.round(metrics.linesProcessed / (metrics.totalTime / 1000))
    console.log(`- Processing speed: ${linesPerSecond} lines/second`)
  }
}

// Run example
main().catch(console.error)
