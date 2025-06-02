import type { GlintConfig } from './src/types'

const config: GlintConfig = {
  verbose: false,

  // Performance settings - optimized for speed
  parallel: true,
  maxWorkers: 4,
  cacheEnabled: true,
  cacheDir: '.glint-cache',

  // File processing
  include: ['**/*.{html,css,js,ts,jsx,tsx,vue,svelte}'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
  ],
  extensions: ['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte'],

  // HTML configuration
  html: {
    enabled: true,
    rules: {
      'no-duplicate-attributes': 'error',
      'no-inline-styles': 'warn',
      'require-alt': 'error',
      'no-obsolete-tags': 'error',
      'proper-nesting': 'error',
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

  // CSS configuration
  css: {
    enabled: true,
    rules: {
      'no-duplicate-properties': 'error',
      'no-empty-rules': 'warn',
      'prefer-shorthand': 'warn',
      'no-vendor-prefixes': 'warn',
      'color-format': 'warn',
    },
    formatter: {
      indentSize: 2,
      indentType: 'spaces',
      lineWidth: 120,
      endOfLine: 'lf',
      insertFinalNewline: true,
      trimTrailingWhitespace: true,
      singleQuote: true,
      trailingComma: false,
    },
  },

  // JavaScript configuration
  javascript: {
    enabled: true,
    ecmaVersion: 2024,
    sourceType: 'module',
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'curly': 'error',
    },
    formatter: {
      indentSize: 2,
      indentType: 'spaces',
      lineWidth: 120,
      endOfLine: 'lf',
      insertFinalNewline: true,
      trimTrailingWhitespace: true,
      singleQuote: true,
      trailingComma: 'es5',
      semicolons: false,
      bracketSpacing: true,
      arrowParens: 'avoid',
    },
  },

  // TypeScript configuration
  typescript: {
    enabled: true,
    strict: true,
    target: 'ES2022',
    rules: {
      'no-unused-vars': 'error',
      'no-explicit-any': 'warn',
      'prefer-interface': 'warn',
      'no-non-null-assertion': 'warn',
      'explicit-function-return-type': 'off',
    },
    formatter: {
      indentSize: 2,
      indentType: 'spaces',
      lineWidth: 120,
      endOfLine: 'lf',
      insertFinalNewline: true,
      trimTrailingWhitespace: true,
      singleQuote: true,
      trailingComma: 'es5',
      semicolons: false,
      bracketSpacing: true,
      arrowParens: 'avoid',
    },
  },

  // Plugin system
  plugins: [
    // Example plugin configurations
    // { name: '@glint/plugin-vue', enabled: true, options: {} },
    // { name: '@glint/plugin-react', enabled: true, options: {} },
  ],

  // Global formatting options
  formatting: {
    indentSize: 2,
    indentType: 'spaces',
    lineWidth: 120,
    endOfLine: 'lf',
    insertFinalNewline: true,
    trimTrailingWhitespace: true,
  },

  // Linting options
  linting: {
    enabled: true,
    reportUnusedDisableDirectives: true,
    noInlineConfig: false,
  },
} satisfies GlintConfig

export default config
