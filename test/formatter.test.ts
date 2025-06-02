import { describe, test, expect, beforeEach } from 'bun:test'
import { GlintFormatter } from '../src/formatter'
import { FileCache } from '../src/cache'
import type { FileInfo, GlintConfig, FormatResult } from '../src/types'

describe('GlintFormatter', () => {
  let formatter: GlintFormatter
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

    cache = new FileCache('.test-cache', '1.0.0')
    formatter = new GlintFormatter(config, cache)
  })

  test('creates GlintFormatter instance', () => {
    expect(formatter).toBeInstanceOf(GlintFormatter)
  })

  test('formats HTML with proper indentation', async () => {
    const file: FileInfo = {
      path: 'test.html',
      content: '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>',
      language: 'html',
      size: 75,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.html')
    expect(result.changed).toBe(true)
    expect(result.formatted).toContain('\n')
    expect(result.formatted).toMatch(/^\s*<html>/m)
    expect(result.formatted).toMatch(/\s+<head>/m)
  })

  test('formats CSS with proper indentation', async () => {
    const file: FileInfo = {
      path: 'test.css',
      content: '.test{color:red;background:blue;}',
      language: 'css',
      size: 33,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.css')
    expect(result.changed).toBe(true)
    expect(result.formatted).toContain('\n')
    expect(result.formatted).toMatch(/\.test\s*{/)
    expect(result.formatted).toMatch(/\s+color:\s*red;/)
  })

  test('formats JavaScript with proper spacing and semicolons', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const x=1;const y={a:2,b:3};function test(){return x+y.a}',
      language: 'javascript',
      size: 57,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.changed).toBe(true)
    expect(result.formatted).toContain('\n')
    expect(result.formatted).toMatch(/const\s+x\s*=\s*1;/)
    expect(result.formatted).toMatch(/{\s*a:\s*2,\s*b:\s*3\s*}/)
  })

  test('formats TypeScript with proper typing and spacing', async () => {
    const file: FileInfo = {
      path: 'test.ts',
      content: 'interface User{name:string;age:number}const user:User={name:"John",age:30}',
      language: 'typescript',
      size: 76,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.ts')
    expect(result.changed).toBe(true)
    expect(result.formatted).toContain('\n')
    expect(result.formatted).toMatch(/interface\s+User\s*{/)
    expect(result.formatted).toMatch(/name:\s*string/)
  })

  test('returns unchanged result for already formatted files', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const message = "hello world";\nconsole.log(message);\n',
      language: 'javascript',
      size: 54,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.changed).toBe(false)
    expect(result.formatted).toBe(file.content)
  })

  test('handles malformed HTML gracefully', async () => {
    const file: FileInfo = {
      path: 'test.html',
      content: '<html><head><title>Test</head><body><h1>Hello</body>',
      language: 'html',
      size: 54,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.html')
    expect(result.formatted).toBeDefined()
    // Should attempt to format even malformed HTML
  })

  test('handles CSS syntax errors gracefully', async () => {
    const file: FileInfo = {
      path: 'test.css',
      content: '.test { color: red background: blue; }',
      language: 'css',
      size: 38,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.css')
    expect(result.formatted).toBeDefined()
    // Should handle syntax errors gracefully
  })

  test('formats multiple files in parallel', async () => {
    const files: FileInfo[] = [
      {
        path: 'test1.js',
        content: 'const x=1;const y=2;',
        language: 'javascript',
        size: 20,
        lastModified: Date.now()
      },
      {
        path: 'test2.css',
        content: '.test{color:red;}',
        language: 'css',
        size: 17,
        lastModified: Date.now()
      },
      {
        path: 'test3.html',
        content: '<html><body><h1>Test</h1></body></html>',
        language: 'html',
        size: 39,
        lastModified: Date.now()
      }
    ]

    const startTime = performance.now()
    const results = await formatter.formatFiles(files)
    const endTime = performance.now()

    expect(results).toHaveLength(3)
    expect(results[0].changed).toBe(true)
    expect(results[1].changed).toBe(true)
    expect(results[2].changed).toBe(true)

    // Should complete reasonably quickly
    expect(endTime - startTime).toBeLessThan(1000)
  })

  test('respects indentation settings', async () => {
    const configWithTabs = {
      ...config,
      javascript: {
        ...config.javascript,
        formatter: {
          ...config.javascript.formatter,
          indentType: 'tabs' as const,
          indentSize: 1
        }
      }
    }

    const formatterWithTabs = new GlintFormatter(configWithTabs, cache)

    const file: FileInfo = {
      path: 'test.js',
      content: 'function test(){return 1;}',
      language: 'javascript',
      size: 25,
      lastModified: Date.now()
    }

    const result = await formatterWithTabs.formatFile(file)

    expect(result.formatted).toContain('\t')
  })

  test('respects single quote settings for JavaScript', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const message = "hello world";',
      language: 'javascript',
      size: 30,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.formatted).toContain("'hello world'")
  })

  test('respects double quote settings for CSS', async () => {
    const file: FileInfo = {
      path: 'test.css',
      content: ".test { content: 'hello'; }",
      language: 'css',
      size: 27,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.formatted).toContain('"hello"')
  })

  test('adds final newline when configured', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const x = 1;',
      language: 'javascript',
      size: 12,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.formatted.endsWith('\n')).toBe(true)
  })

  test('trims trailing whitespace when configured', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const x = 1;   \nconst y = 2;  ',
      language: 'javascript',
      size: 30,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.formatted).not.toMatch(/\s+$/m)
  })

  test('handles line width settings', async () => {
    const configWithShortLines = {
      ...config,
      javascript: {
        ...config.javascript,
        formatter: {
          ...config.javascript.formatter,
          lineWidth: 20
        }
      }
    }

    const formatterWithShortLines = new GlintFormatter(configWithShortLines, cache)

    const file: FileInfo = {
      path: 'test.js',
      content: 'const veryLongVariableName = "this is a very long string value";',
      language: 'javascript',
      size: 65,
      lastModified: Date.now()
    }

    const result = await formatterWithShortLines.formatFile(file)

    // Should break long lines
    expect(result.formatted.split('\n').length).toBeGreaterThan(1)
  })

  test('tracks performance metrics', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: 'const x = 1; const y = 2;',
      language: 'javascript',
      size: 25,
      lastModified: Date.now()
    }

    await formatter.formatFile(file)
    const metrics = formatter.getMetrics()

    expect(typeof metrics.totalTime).toBe('number')
    expect(typeof metrics.formatTime).toBe('number')
    expect(typeof metrics.filesProcessed).toBe('number')
    expect(metrics.totalTime).toBeGreaterThan(0)
    expect(metrics.filesProcessed).toBeGreaterThan(0)
  })

  test('skips disabled languages', async () => {
    const configWithDisabledJS = {
      ...config,
      javascript: { ...config.javascript, enabled: false }
    }

    const formatterWithDisabledJS = new GlintFormatter(configWithDisabledJS, cache)

    const file: FileInfo = {
      path: 'test.js',
      content: 'const x=1;',
      language: 'javascript',
      size: 10,
      lastModified: Date.now()
    }

    const result = await formatterWithDisabledJS.formatFile(file)

    // Should return unchanged for disabled language
    expect(result.changed).toBe(false)
    expect(result.formatted).toBe(file.content)
  })

  test('handles empty files', async () => {
    const file: FileInfo = {
      path: 'test.js',
      content: '',
      language: 'javascript',
      size: 0,
      lastModified: Date.now()
    }

    const result = await formatter.formatFile(file)

    expect(result.filePath).toBe('test.js')
    expect(result.formatted).toBe('')
    expect(result.changed).toBe(false)
  })
})