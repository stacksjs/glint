import type {
  FileInfo,
  FormatResult,
  GlintConfig,
  LintResult,
  PerformanceMetrics,
  Plugin,
  Rule,
  SupportedLanguage,
} from '../src/types'
import { describe, expect, test } from 'bun:test'

describe('Types Module', () => {
  test('SupportedLanguage type includes expected languages', () => {
    const languages: SupportedLanguage[] = ['html', 'css', 'javascript', 'typescript']
    expect(languages).toHaveLength(4)
    expect(languages).toContain('html')
    expect(languages).toContain('css')
    expect(languages).toContain('javascript')
    expect(languages).toContain('typescript')
  })

  test('FileInfo interface has required properties', () => {
    const fileInfo: FileInfo = {
      path: '/test/file.ts',
      content: 'const x = 1',
      language: 'typescript',
      size: 100,
      lastModified: Date.now(),
    }

    expect(fileInfo.path).toBe('/test/file.ts')
    expect(fileInfo.content).toBe('const x = 1')
    expect(fileInfo.language).toBe('typescript')
    expect(fileInfo.size).toBe(100)
    expect(typeof fileInfo.lastModified).toBe('number')
  })

  test('LintResult interface structure', () => {
    const lintResult: LintResult = {
      filePath: '/test/file.ts',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }

    expect(lintResult.filePath).toBe('/test/file.ts')
    expect(Array.isArray(lintResult.messages)).toBe(true)
    expect(typeof lintResult.errorCount).toBe('number')
    expect(typeof lintResult.warningCount).toBe('number')
  })

  test('FormatResult interface structure', () => {
    const formatResult: FormatResult = {
      filePath: '/test/file.ts',
      formatted: 'const x = 1;',
      changed: true,
    }

    expect(formatResult.filePath).toBe('/test/file.ts')
    expect(formatResult.formatted).toBe('const x = 1;')
    expect(formatResult.changed).toBe(true)
  })

  test('PerformanceMetrics interface structure', () => {
    const metrics: PerformanceMetrics = {
      totalTime: 100,
      parseTime: 20,
      lintTime: 30,
      formatTime: 25,
      filesProcessed: 5,
      linesProcessed: 150,
      rulesExecuted: 50,
      cacheHits: 3,
      cacheMisses: 2,
    }

    expect(typeof metrics.totalTime).toBe('number')
    expect(typeof metrics.parseTime).toBe('number')
    expect(typeof metrics.lintTime).toBe('number')
    expect(typeof metrics.formatTime).toBe('number')
    expect(typeof metrics.filesProcessed).toBe('number')
    expect(typeof metrics.linesProcessed).toBe('number')
    expect(typeof metrics.rulesExecuted).toBe('number')
    expect(typeof metrics.cacheHits).toBe('number')
    expect(typeof metrics.cacheMisses).toBe('number')
  })

  test('Plugin interface structure', () => {
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
              recommended: true,
            },
            schema: [],
          },
          create: () => ({}),
        },
      },
    }

    expect(plugin.name).toBe('test-plugin')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.languages).toContain('javascript')
    expect(plugin.rules).toBeDefined()
    expect(plugin.rules!['test-rule']).toBeDefined()
  })

  test('GlintConfig interface has all required properties', () => {
    const config: Partial<GlintConfig> = {
      verbose: false,
      parallel: true,
      cacheEnabled: true,
      include: ['**/*.ts'],
      exclude: ['node_modules'],
      extensions: ['ts', 'js'],
    }

    expect(typeof config.verbose).toBe('boolean')
    expect(typeof config.parallel).toBe('boolean')
    expect(typeof config.cacheEnabled).toBe('boolean')
    expect(Array.isArray(config.include)).toBe(true)
    expect(Array.isArray(config.exclude)).toBe(true)
    expect(Array.isArray(config.extensions)).toBe(true)
  })
})
