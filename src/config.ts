import type { GlintConfig } from './types'
import { cpus } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { tryLoadConfig } from 'bunfig'

export const defaultConfig: GlintConfig = {
  verbose: false,

  // Performance settings - optimized for speed
  parallel: true,
  maxWorkers: Math.max(1, cpus().length - 1), // Leave one core free
  cacheEnabled: true,
  cacheDir: join(process.cwd(), '.glint-cache'),

  // File processing
  include: ['**/*.{html,css,js,ts,jsx,tsx,vue,svelte}'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/.vitepress/cache/**',
  ],
  extensions: ['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte'],

  // Language-specific configs
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
  plugins: [],

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
}

// eslint-disable-next-line antfu/no-top-level-await
export const config: GlintConfig = await tryLoadConfig('glint', defaultConfig) ?? defaultConfig
