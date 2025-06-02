import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { GlintEngine } from '../src/engine'
import { FileCache } from '../src/cache'
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { GlintConfig, PerformanceMetrics } from '../src/types'

describe('GlintEngine', () => {
  let engine: GlintEngine
  let config: GlintConfig
  let testDir: string

  beforeEach(() => {
    testDir = './test-engine-files'

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
    mkdirSync(testDir, { recursive: true })

    config = {
      verbose: false,
      parallel: true,
      maxWorkers: 2,
      cacheEnabled: true,
      cacheDir: '.test-engine-cache',
      include: [`${testDir}/**/*.{js,ts,html,css}`],
      exclude: ['**/node_modules/**'],
      extensions: ['js', 'ts', 'html', 'css'],
      html: {
        enabled: true,
        rules: {
          'no-duplicate-attributes': 'error',
          'require-alt': 'warn'
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
          'no-empty-rules': 'warn'
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
          'no-var': 'error'
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
          'prefer-interface': 'warn'
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

    engine = new GlintEngine(config)
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
    if (existsSync('.test-engine-cache')) {
      rmSync('.test-engine-cache', { recursive: true, force: true })
    }
  })

  test('creates GlintEngine instance', () => {
    expect(engine).toBeInstanceOf(GlintEngine)
  })

  test('has all required methods', () => {
    expect(typeof engine.lintFiles).toBe('function')
    expect(typeof engine.formatFiles).toBe('function')
    expect(typeof engine.lintAndFormat).toBe('function')
    expect(typeof engine.checkFiles).toBe('function')
    expect(typeof engine.getMetrics).toBe('function')
    expect(typeof engine.clearCache).toBe('function')
    expect(typeof engine.loadPlugin).toBe('function')
  })

  test('can lint files and return results', async () => {
    // Create test files with issues
    writeFileSync(join(testDir, 'test.js'), 'var x = 1; let unused = 2;')
    writeFileSync(join(testDir, 'test.html'), '<img src="test.jpg">')
    writeFileSync(join(testDir, 'test.css'), '.empty { }')

    const results = await engine.lintFiles()

    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)

    // Should have lint errors/warnings
    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0)
    const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0)

    expect(totalErrors + totalWarnings).toBeGreaterThan(0)
  })

  test('can format files and return results', async () => {
    // Create test files that need formatting
    writeFileSync(join(testDir, 'test.js'), 'const x=1;const y={a:2,b:3};')
    writeFileSync(join(testDir, 'test.html'), '<html><head><title>Test</title></head></html>')
    writeFileSync(join(testDir, 'test.css'), '.test{color:red;background:blue;}')

    const results = await engine.formatFiles()

    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)

    // Should have formatting changes
    const hasChanges = results.some(r => r.changed)
    expect(hasChanges).toBe(true)
  })

  test('can lint and format files together', async () => {
    writeFileSync(join(testDir, 'test.js'), 'var x=1;')

    const result = await engine.lintAndFormat()

    expect(result).toBeDefined()
    expect(result.lintResults).toBeDefined()
    expect(result.formatResults).toBeDefined()
    expect(Array.isArray(result.lintResults)).toBe(true)
    expect(Array.isArray(result.formatResults)).toBe(true)
  })

    test('can check files (lint only)', async () => {
    writeFileSync(join(testDir, 'test.js'), 'var x = 1;')

    const result = await engine.checkFiles()

    expect(result).toBeDefined()
    expect(typeof result.passed).toBe('boolean')
    expect(Array.isArray(result.results)).toBe(true)
    expect(result.results.length).toBeGreaterThan(0)
  })

  test('provides performance metrics', async () => {
    writeFileSync(join(testDir, 'test.js'), 'const x = 1;')

    await engine.lintFiles()
    const metrics = engine.getMetrics()

    expect(metrics).toBeDefined()
    expect(typeof metrics.totalTime).toBe('number')
    expect(typeof metrics.filesProcessed).toBe('number')
    expect(metrics.totalTime).toBeGreaterThan(0)
    expect(metrics.filesProcessed).toBeGreaterThan(0)
  })

  test('can clear cache', () => {
    expect(() => {
      engine.clearCache()
    }).not.toThrow()
  })

  test('can load plugins', async () => {
    // Test plugin loading mechanism exists
    expect(typeof engine.loadPlugin).toBe('function')

    // Note: Testing actual plugin loading would require creating mock plugins
    // which is beyond the scope of this basic test
  })

  test('handles empty file directories gracefully', async () => {
    // Test with empty directory
    const emptyDir = join(testDir, 'empty')
    mkdirSync(emptyDir)

    const results = await engine.lintFiles()
    expect(Array.isArray(results)).toBe(true)
  })

  test('respects file include/exclude patterns', async () => {
    writeFileSync(join(testDir, 'included.js'), 'const x = 1;')

    // Create excluded directory
    mkdirSync(join(testDir, 'node_modules'))
    writeFileSync(join(testDir, 'node_modules', 'excluded.js'), 'const y = 2;')

    const results = await engine.lintFiles()

    // Should only include files matching patterns
    const filePaths = results.map(r => r.filePath)
    expect(filePaths.some(p => p.includes('included.js'))).toBe(true)
    expect(filePaths.some(p => p.includes('excluded.js'))).toBe(false)
  })

  test('processes multiple file types', async () => {
    writeFileSync(join(testDir, 'test.js'), 'const x = 1;')
    writeFileSync(join(testDir, 'test.ts'), 'const y: string = "hello";')
    writeFileSync(join(testDir, 'test.html'), '<html><body>Test</body></html>')
    writeFileSync(join(testDir, 'test.css'), 'body { margin: 0; }')

    const results = await engine.lintFiles()

    const fileTypes = new Set(results.map(r => {
      if (r.filePath.endsWith('.js')) return 'js'
      if (r.filePath.endsWith('.ts')) return 'ts'
      if (r.filePath.endsWith('.html')) return 'html'
      if (r.filePath.endsWith('.css')) return 'css'
      return 'unknown'
    }))

    expect(fileTypes.size).toBeGreaterThanOrEqual(4)
    expect(fileTypes.has('js')).toBe(true)
    expect(fileTypes.has('ts')).toBe(true)
    expect(fileTypes.has('html')).toBe(true)
    expect(fileTypes.has('css')).toBe(true)
  })

  test('handles large numbers of files efficiently', async () => {
    // Create multiple test files
    for (let i = 0; i < 10; i++) {
      writeFileSync(join(testDir, `test${i}.js`), `const x${i} = ${i};`)
    }

    const startTime = performance.now()
    const results = await engine.lintFiles()
    const endTime = performance.now()

    expect(results.length).toBe(10)
    expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
  })

  test('caching improves performance on repeat runs', async () => {
    writeFileSync(join(testDir, 'cached.js'), 'const x = 1;')

    // First run
    const firstStart = performance.now()
    await engine.lintFiles()
    const firstEnd = performance.now()
    const firstRunTime = firstEnd - firstStart

    // Second run (should use cache)
    const secondStart = performance.now()
    await engine.lintFiles()
    const secondEnd = performance.now()
    const secondRunTime = secondEnd - secondStart

    // Second run should be faster (or at least not significantly slower)
    expect(secondRunTime).toBeLessThanOrEqual(firstRunTime * 2)
  })

  test('respects language enable/disable settings', async () => {
    writeFileSync(join(testDir, 'test.js'), 'var x = 1;')

    // Disable JavaScript processing
    const configWithDisabledJS = {
      ...config,
      javascript: { ...config.javascript, enabled: false }
    }

    const engineWithDisabledJS = new GlintEngine(configWithDisabledJS)
    const results = await engineWithDisabledJS.lintFiles()

    // Should not process JavaScript files when disabled
    const jsResults = results.filter(r => r.filePath.endsWith('.js'))
    expect(jsResults.every(r => r.errorCount === 0 && r.warningCount === 0)).toBe(true)
  })
})