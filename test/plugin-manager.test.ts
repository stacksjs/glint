import { describe, test, expect, beforeEach } from 'bun:test'
import { PluginManager } from '../src/plugin-manager'
import type { Plugin, GlintConfig } from '../src/types'

describe('PluginManager', () => {
  let pluginManager: PluginManager
  let config: GlintConfig

  beforeEach(() => {
    config = {
      verbose: false,
      parallel: true,
      maxWorkers: 2,
      cacheEnabled: true,
      cacheDir: '.test-cache',
      include: ['**/*.{js,ts,html,css}'],
      exclude: ['**/node_modules/**'],
      extensions: ['js', 'ts', 'html', 'css'],
      html: {
        enabled: true,
        rules: {},
        formatter: {
          indentSize: 2,
          indentType: 'spaces',
          lineWidth: 80,
          endOfLine: 'lf',
          insertFinalNewline: true,
          trimTrailingWhitespace: true,
          wrapAttributes: 'auto',
          htmlWhitespaceSensitivity: 'css'
        }
      },
      css: {
        enabled: true,
        rules: {},
        formatter: {
          indentSize: 2,
          indentType: 'spaces',
          lineWidth: 80,
          endOfLine: 'lf',
          insertFinalNewline: true,
          trimTrailingWhitespace: true,
          singleQuote: false,
          trailingComma: false
        }
      },
      javascript: {
        enabled: true,
        rules: {},
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
          arrowParens: 'avoid'
        },
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      typescript: {
        enabled: true,
        rules: {},
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
          arrowParens: 'avoid'
        },
        strict: true,
        target: 'ES2022'
      },
      formatting: {
        indentSize: 2,
        indentType: 'spaces',
        lineWidth: 80,
        endOfLine: 'lf',
        insertFinalNewline: true,
        trimTrailingWhitespace: true
      },
      linting: {
        enabled: true,
        reportUnusedDisableDirectives: false,
        noInlineConfig: false
      },
      plugins: []
    }

    pluginManager = new PluginManager(config)
  })

  test('creates PluginManager instance', () => {
    expect(pluginManager).toBeInstanceOf(PluginManager)
  })

  test('can register a plugin', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      rules: {
        'test-rule': {
          meta: {
            type: 'problem',
            docs: {
              description: 'Test rule',
              category: 'Testing',
              recommended: true
            },
            schema: []
          },
          create: () => ({})
        }
      }
    }

    pluginManager.registerPlugin(plugin)

    const registeredPlugins = pluginManager.getLoadedPlugins()
    expect(registeredPlugins).toHaveLength(1)
    expect(registeredPlugins[0].name).toBe('test-plugin')
  })

  test('can get plugin by name', () => {
    const plugin: Plugin = {
      name: 'findable-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      rules: {}
    }

    pluginManager.registerPlugin(plugin)

    const found = pluginManager.getPlugin('findable-plugin')
    expect(found).toBeDefined()
    expect(found?.name).toBe('findable-plugin')
  })

  test('returns undefined for non-existent plugin', () => {
    const found = pluginManager.getPlugin('non-existent')
    expect(found).toBeUndefined()
  })

  test('can check if plugin exists', () => {
    const plugin: Plugin = {
      name: 'checkable-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      rules: {}
    }

    expect(pluginManager.hasPlugin('checkable-plugin')).toBe(false)
    pluginManager.registerPlugin(plugin)
    expect(pluginManager.hasPlugin('checkable-plugin')).toBe(true)
  })

  test('can unregister a plugin', () => {
    const plugin: Plugin = {
      name: 'removable-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      rules: {}
    }

    pluginManager.registerPlugin(plugin)
    expect(pluginManager.getLoadedPlugins()).toHaveLength(1)

    pluginManager.unregisterPlugin('removable-plugin')
    expect(pluginManager.getLoadedPlugins()).toHaveLength(0)
  })

  test('can get rules for a language', () => {
    const plugin: Plugin = {
      name: 'rule-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      rules: {
        'test-rule': {
          meta: {
            type: 'problem',
            docs: {
              description: 'Test rule',
              category: 'Testing',
              recommended: true
            },
            schema: []
          },
          create: () => ({})
        }
      }
    }

    pluginManager.registerPlugin(plugin)

    const jsRules = pluginManager.getRulesForLanguage('javascript')
    expect(jsRules.size).toBeGreaterThan(0)
    expect(jsRules.has('rule-plugin/test-rule')).toBe(true)
  })

  test('can get plugin statistics', () => {
    const plugin: Plugin = {
      name: 'stats-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      rules: {
        'test-rule': {
          meta: {
            type: 'problem',
            docs: {
              description: 'Test rule',
              category: 'Testing',
              recommended: true
            },
            schema: []
          },
          create: () => ({})
        }
      }
    }

    pluginManager.registerPlugin(plugin)

    const stats = pluginManager.getPluginStats()
    expect(stats.totalPlugins).toBe(1)
    expect(stats.totalRules).toBeGreaterThan(0)
    expect(stats.pluginsByLanguage.javascript).toContain('stats-plugin')
  })

    test('can get formatter for language', () => {
    const plugin = {
      name: 'formatter-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      formatters: {
        javascript: {
          format: async (code: string) => code.toUpperCase()
        }
            }
    } as unknown as Plugin

    pluginManager.registerPlugin(plugin)

    const formatter = pluginManager.getFormatter('formatter-plugin', 'javascript')
    expect(formatter).toBeDefined()
    expect(typeof formatter?.format).toBe('function')
  })

  test('can get all formatters for language', () => {
    const plugin = {
      name: 'multi-formatter-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      formatters: {
        javascript: {
          format: async (code: string) => code.trim()
                }
      }
    } as unknown as Plugin

    pluginManager.registerPlugin(plugin)

    const formatters = pluginManager.getFormattersForLanguage('javascript')
    expect(formatters.size).toBeGreaterThan(0)
    expect(formatters.has('multi-formatter-plugin')).toBe(true)
  })

  test('can get processor for extension', () => {
    const plugin: Plugin = {
      name: 'processor-plugin',
      version: '1.0.0',
      languages: ['javascript'],
      processors: {
        '.special.js': {
          preprocess: (text: string) => [{ text, filename: 'test.js' }],
          postprocess: (messages: any[][]) => messages.flat()
        }
      }
    }

    pluginManager.registerPlugin(plugin)

    const processor = pluginManager.getProcessor('.special.js')
    expect(processor).toBeDefined()
    expect(typeof processor?.preprocess).toBe('function')
  })

  test('handles empty plugin registration gracefully', () => {
    const emptyPlugin: Plugin = {
      name: 'empty-plugin',
      version: '1.0.0',
      languages: ['javascript']
    }

    expect(() => {
      pluginManager.registerPlugin(emptyPlugin)
    }).not.toThrow()

    expect(pluginManager.hasPlugin('empty-plugin')).toBe(true)
  })
})