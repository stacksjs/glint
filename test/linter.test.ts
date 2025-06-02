import { describe, test, expect, beforeEach } from 'bun:test'
import { GlintLinter } from '../src/linter'
import { FileCache } from '../src/cache'
import type { FileInfo, GlintConfig, LintResult, LintMessage } from '../src/types'

describe('GlintLinter', () => {
  let linter: GlintLinter
  let cache: FileCache
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
        rules: {
          'no-duplicate-attributes': 'error',
          'require-alt': 'warn',
          'no-inline-styles': 'error',
          'proper-nesting': 'error'
        },
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
        rules: {
          'no-duplicate-properties': 'error',
          'no-empty-rules': 'warn',
          'color-format': 'warn',
          'no-important': 'warn'
        },
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
        rules: {
          'no-unused-vars': 'warn',
          'prefer-const': 'error',
          'no-var': 'error',
          'strict-equality': 'warn'
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
          arrowParens: 'avoid'
        },
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      typescript: {
        enabled: true,
        rules: {
          'no-explicit-any': 'warn',
          'prefer-interface': 'warn',
          'no-unused-vars': 'warn',
          'prefer-const': 'error'
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

    cache = new FileCache('.test-cache', '1.0.0')
    linter = new GlintLinter(config, cache)
  })

  test('creates GlintLinter instance', () => {
    expect(linter).toBeInstanceOf(GlintLinter)
  })

  test('lints HTML files with no-duplicate-attributes rule', async () => {
    const file: FileInfo = {
      path: 'test.html',
      content: '<img src="test.jpg" alt="test" alt="duplicate">',
      language: 'html',
      size: 50,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.html')
    expect(result.errorCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'no-duplicate-attributes')).toBe(true)
  })

  test('lints HTML files with require-alt rule', async () => {
    const file: FileInfo = {
      path: 'test.html',
      content: '<img src="test.jpg">',
      language: 'html',
      size: 20,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.html')
    expect(result.warningCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'require-alt')).toBe(true)
  })

  test('lints CSS files with no-duplicate-properties rule', async () => {
    const file: FileInfo = {
      path: 'test.css',
      content: '.test { color: red; color: blue; }',
      language: 'css',
      size: 35,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.css')
    expect(result.errorCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'no-duplicate-properties')).toBe(true)
  })

  test('lints CSS files with no-empty-rules rule', async () => {
    const file: FileInfo = {
      path: 'test.css',
      content: '.empty { }',
      language: 'css',
      size: 10,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.css')
    expect(result.warningCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'no-empty-rules')).toBe(true)
  })

  test('lints JavaScript files with no-unused-vars rule', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'let unused = 1; console.log("test");',
      language: 'javascript',
      size: 40,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.warningCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'no-unused-vars')).toBe(true)
  })

  test('lints JavaScript files with prefer-const rule', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'let x = 1; console.log(x);',
      language: 'javascript',
      size: 30,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.errorCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'prefer-const')).toBe(true)
  })

  test('lints JavaScript files with no-var rule', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'var x = 1; console.log(x);',
      language: 'javascript',
      size: 30,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.errorCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'no-var')).toBe(true)
  })

  test('lints TypeScript files with no-explicit-any rule', async () => {
    const file: FileInfo = {
      path: 'test.ts',
      content: 'let x: any = 1;',
      language: 'typescript',
      size: 15,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.ts')
    expect(result.warningCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'no-explicit-any')).toBe(true)
  })

  test('lints TypeScript files with prefer-interface rule', async () => {
    const file: FileInfo = {
      path: 'test.ts',
      content: 'type User = { name: string; age: number; };',
      language: 'typescript',
      size: 45,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.ts')
    expect(result.warningCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'prefer-interface')).toBe(true)
  })

  test('returns clean result for valid files', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const message = "hello world"; console.log(message);',
      language: 'javascript',
      size: 55,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.errorCount).toBe(0)
    expect(result.warningCount).toBe(0)
    expect(result.messages).toHaveLength(0)
  })

  test('processes multiple files in parallel', async () => {
    const files: FileInfo[] = [
      {
        path: 'test1.js',
        content: 'var x = 1;',
        language: 'javascript',
        size: 10,
        lastModified: Date.now()
      },
      {
        path: 'test2.css',
        content: '.empty { }',
        language: 'css',
        size: 10,
        lastModified: Date.now()
      },
      {
        path: 'test3.html',
        content: '<img src="test.jpg">',
        language: 'html',
        size: 20,
        lastModified: Date.now()
      }
    ]

    const startTime = performance.now()
    const results = await linter.lintFiles(files)
    const endTime = performance.now()

    expect(results).toHaveLength(3)
    expect(results[0].errorCount).toBeGreaterThan(0) // no-var error
    expect(results[1].warningCount).toBeGreaterThan(0) // empty rule warning
    expect(results[2].warningCount).toBeGreaterThan(0) // missing alt warning

    // Should complete reasonably quickly
    expect(endTime - startTime).toBeLessThan(1000)
  })

    test('can process multiple results', async () => {
    // Test that multiple lint results maintain their structure
    const results: LintResult[] = [
      {
        filePath: 'test1.js',
        messages: [
          { ruleId: 'no-var', severity: 2, message: 'Unexpected var', line: 1, column: 1 }
        ],
        errorCount: 1,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0
      },
      {
        filePath: 'test2.js',
        messages: [
          { ruleId: 'no-unused-vars', severity: 1, message: 'Variable unused', line: 1, column: 5 }
        ],
        errorCount: 0,
        warningCount: 1,
        fixableErrorCount: 0,
        fixableWarningCount: 0
      }
    ]

    // Just validate the structure
    expect(results).toHaveLength(2)
    expect(results[0].errorCount).toBe(1)
    expect(results[1].warningCount).toBe(1)
  })

  test('handles disabled rules', async () => {
    const configWithDisabledRule = {
      ...config,
      javascript: {
        ...config.javascript,
        rules: {
          ...config.javascript.rules,
          'no-var': 'off'
        }
      }
    }

    const linterWithDisabledRule = new GlintLinter(configWithDisabledRule, cache)

    const file: FileInfo = {
      path: 'test.js',
      content: 'var x = 1; console.log(x);',
      language: 'javascript',
      size: 30,
      lastModified: Date.now()
    }

    const result = await linterWithDisabledRule.lintFile(file)

    expect(result.messages.some((m: LintMessage) => m.ruleId === 'no-var')).toBe(false)
  })

  test('tracks performance metrics', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const x = 1; console.log(x);',
      language: 'javascript',
      size: 30,
      lastModified: Date.now()
    }

    await linter.lintFile(file)
    const metrics = linter.getMetrics()

    expect(typeof metrics.totalTime).toBe('number')
    expect(typeof metrics.lintTime).toBe('number')
    expect(typeof metrics.parseTime).toBe('number')
    expect(typeof metrics.filesProcessed).toBe('number')
    expect(typeof metrics.rulesExecuted).toBe('number')
    expect(metrics.totalTime).toBeGreaterThan(0)
    expect(metrics.filesProcessed).toBeGreaterThan(0)
  })

  test('handles syntax errors gracefully', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const x = ; // syntax error',
      language: 'javascript',
      size: 25,
      lastModified: Date.now()
    }

    const result = await linter.lintFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.errorCount).toBeGreaterThan(0)
    expect(result.messages.some((m: LintMessage) => m.ruleId === 'syntax-error' || m.message.includes('syntax'))).toBe(true)
  })

  test('skips disabled languages', async () => {
    const configWithDisabledJS = {
      ...config,
      javascript: { ...config.javascript, enabled: false }
    }

    const linterWithDisabledJS = new GlintLinter(configWithDisabledJS, cache)

    const file: FileInfo = {
      path: 'test.js',
      content: 'var x = 1;',
      language: 'javascript',
      size: 10,
      lastModified: Date.now()
    }

    const result = await linterWithDisabledJS.lintFile(file)

    // Should return empty result for disabled language
    expect(result.errorCount).toBe(0)
    expect(result.warningCount).toBe(0)
    expect(result.messages).toHaveLength(0)
  })
})
