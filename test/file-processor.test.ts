import type { GlintConfig, SupportedLanguage } from '../src/types'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { FileProcessor } from '../src/file-processor'

describe('FileProcessor', () => {
  let processor: FileProcessor
  let testDir: string
  let config: GlintConfig

  beforeEach(() => {
    testDir = './test-files'

    // Clean up any existing test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }

    mkdirSync(testDir, { recursive: true })

    config = {
      verbose: false,
      parallel: true,
      maxWorkers: 2,
      cacheEnabled: true,
      cacheDir: '.test-cache',
      include: ['**/*.{js,ts,html,css}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
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
          htmlWhitespaceSensitivity: 'css',
        },
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
          trailingComma: false,
        },
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
          arrowParens: 'avoid',
        },
        ecmaVersion: 2022,
        sourceType: 'module',
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
          arrowParens: 'avoid',
        },
        strict: true,
        target: 'ES2022',
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
        reportUnusedDisableDirectives: false,
        noInlineConfig: false,
      },
      plugins: [],
    }

    processor = new FileProcessor(config)
  })

  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  test('creates FileProcessor instance', () => {
    expect(processor).toBeInstanceOf(FileProcessor)
  })

  test('discovers files matching patterns', async () => {
    // Create test files
    writeFileSync(join(testDir, 'test.js'), 'console.log("test")')
    writeFileSync(join(testDir, 'test.ts'), 'const x: number = 1')
    writeFileSync(join(testDir, 'test.html'), '<html></html>')
    writeFileSync(join(testDir, 'test.css'), 'body { margin: 0; }')
    writeFileSync(join(testDir, 'ignored.txt'), 'ignored')

    const files = await processor.discoverFiles([`${testDir}/**/*`])

    expect(files.length).toBe(4) // Should find 4 matching files
    expect(files.some(f => f.endsWith('test.js'))).toBe(true)
    expect(files.some(f => f.endsWith('test.ts'))).toBe(true)
    expect(files.some(f => f.endsWith('test.html'))).toBe(true)
    expect(files.some(f => f.endsWith('test.css'))).toBe(true)
    expect(files.some(f => f.endsWith('ignored.txt'))).toBe(false)
  })

  test('respects exclude patterns', async () => {
    // Create test files including some in excluded directories
    mkdirSync(join(testDir, 'node_modules'), { recursive: true })
    mkdirSync(join(testDir, 'dist'), { recursive: true })

    writeFileSync(join(testDir, 'test.js'), 'console.log("test")')
    writeFileSync(join(testDir, 'node_modules', 'lib.js'), 'module.exports = {}')
    writeFileSync(join(testDir, 'dist', 'bundle.js'), 'var x = 1;')

    const files = await processor.discoverFiles([`${testDir}/**/*`])

    expect(files.some(f => f.endsWith('test.js'))).toBe(true)
    expect(files.some(f => f.includes('node_modules'))).toBe(false)
    expect(files.some(f => f.includes('dist'))).toBe(false)
  })

  test('loads file contents', async () => {
    const testFile = join(testDir, 'test.ts')
    const content = 'const message: string = "hello world"'
    writeFileSync(testFile, content)

    const files = await processor.loadFiles([testFile])

    expect(files).toHaveLength(1)
    expect(files[0].path.endsWith('test.ts')).toBe(true)
    expect(files[0].content).toBe(content)
    expect(files[0].language).toBe('typescript')
    expect(files[0].size).toBe(content.length)
    expect(typeof files[0].lastModified).toBe('number')
  })

  test('determines correct language from file extension', async () => {
    const testFiles: Array<{ name: string, expectedLang: SupportedLanguage }> = [
      { name: 'test.js', expectedLang: 'javascript' },
      { name: 'test.ts', expectedLang: 'typescript' },
      { name: 'test.jsx', expectedLang: 'javascript' },
      { name: 'test.tsx', expectedLang: 'typescript' },
      { name: 'test.html', expectedLang: 'html' },
      { name: 'test.css', expectedLang: 'css' },
    ]

    for (const { name, expectedLang } of testFiles) {
      const filePath = join(testDir, name)
      writeFileSync(filePath, 'test content')

      const files = await processor.loadFiles([filePath])
      expect(files[0].language).toBe(expectedLang)
    }
  })

  test('filters enabled files based on language configuration', async () => {
    // Create test files
    writeFileSync(join(testDir, 'test.js'), 'console.log("test")')
    writeFileSync(join(testDir, 'test.ts'), 'const x: number = 1')
    writeFileSync(join(testDir, 'test.html'), '<html></html>')
    writeFileSync(join(testDir, 'test.css'), 'body { margin: 0; }')

    const files = await processor.loadFiles([
      join(testDir, 'test.js'),
      join(testDir, 'test.ts'),
      join(testDir, 'test.html'),
      join(testDir, 'test.css'),
    ])

    const enabledFiles = processor.filterEnabledFiles(files)

    expect(enabledFiles).toHaveLength(4) // All languages enabled in config

    // Test with disabled language
    const configWithDisabledJS = {
      ...config,
      javascript: { ...config.javascript, enabled: false },
    }
    const processorWithDisabledJS = new FileProcessor(configWithDisabledJS)

    const filteredFiles = processorWithDisabledJS.filterEnabledFiles(files)
    expect(filteredFiles).toHaveLength(3) // Should exclude JS files
    expect(filteredFiles.some(f => f.language === 'javascript')).toBe(false)
  })

  test('provides file statistics', async () => {
    // Create test files with different content
    writeFileSync(join(testDir, 'small.js'), 'const x = 1')
    writeFileSync(join(testDir, 'large.ts'), 'const message: string = "hello world"\nconsole.log(message)')
    writeFileSync(join(testDir, 'test.html'), '<html><body><h1>Test</h1></body></html>')

    const files = await processor.loadFiles([
      join(testDir, 'small.js'),
      join(testDir, 'large.ts'),
      join(testDir, 'test.html'),
    ])

    const stats = processor.getFileStats(files)

    expect(stats.totalFiles).toBe(3)
    expect(stats.totalSize).toBeGreaterThan(0)
    expect(stats.averageSize).toBeGreaterThan(0)
    expect(stats.languageDistribution.javascript).toBe(1)
    expect(stats.languageDistribution.typescript).toBe(1)
    expect(stats.languageDistribution.html).toBe(1)
    expect(stats.languageDistribution.css || 0).toBe(0)
  })

  test('handles empty patterns gracefully', async () => {
    const files = await processor.discoverFiles([])
    expect(files).toHaveLength(0)
  })

  test('handles non-existent files gracefully', async () => {
    const files = await processor.loadFiles(['/non/existent/file.js'])
    expect(files).toHaveLength(0)
  })

  test('respects maxWorkers configuration', () => {
    expect(config.maxWorkers).toBeGreaterThan(0)
    // Note: maxWorkers is used internally for parallel processing
  })

  test('can load files with special characters in path', async () => {
    const specialDir = join(testDir, 'special-chars@#$')
    mkdirSync(specialDir, { recursive: true })

    const specialFile = join(specialDir, 'test file.js')
    const content = 'console.log("special")'
    writeFileSync(specialFile, content)

    const files = await processor.loadFiles([specialFile])

    expect(files).toHaveLength(1)
    expect(files[0].content).toBe(content)
    expect(files[0].language).toBe('javascript')
  })

  test('handles large files efficiently', async () => {
    const largeContent = 'console.log("line");\n'.repeat(10000)
    const largeFile = join(testDir, 'large.js')
    writeFileSync(largeFile, largeContent)

    const startTime = performance.now()
    const files = await processor.loadFiles([largeFile])
    const endTime = performance.now()

    expect(files).toHaveLength(1)
    expect(files[0].content).toBe(largeContent)
    expect(files[0].size).toBe(largeContent.length)

    // Should process large files reasonably quickly (under 1 second)
    expect(endTime - startTime).toBeLessThan(1000)
  })
})
