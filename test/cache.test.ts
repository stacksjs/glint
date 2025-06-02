import type { CacheEntry, LintResult } from '../src/types'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, rmSync } from 'node:fs'
import { createCacheKey, createContentHash, FileCache } from '../src/cache'

describe('FileCache', () => {
  let cache: FileCache
  const cacheDir = './test-cache'
  const version = '1.0.0'

  beforeEach(() => {
    // Clean up any existing cache
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true })
    }
    cache = new FileCache(cacheDir, version)
  })

  afterEach(() => {
    // Clean up cache after each test
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true })
    }
  })

  test('creates cache instance', () => {
    expect(cache).toBeInstanceOf(FileCache)
  })

  test('initially has no entries', () => {
    expect(cache.size()).toBe(0)
  })

  test('can store and retrieve cache entries', () => {
    const key = 'test-file.ts'
    const result: LintResult = {
      filePath: 'test-file.ts',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }

    const entry: CacheEntry = {
      hash: 'test-hash',
      result,
      timestamp: Date.now(),
      version: '1.0.0',
    }

    cache.set(key, entry)
    expect(cache.size()).toBe(1)
    expect(cache.has(key)).toBe(true)

    const retrieved = cache.get(key)
    expect(retrieved).toBeDefined()
    expect(retrieved?.result).toBeDefined()
    expect((retrieved?.result as LintResult)?.filePath).toBe('test-file.ts')
  })

  test('returns undefined for non-existent keys', () => {
    const result = cache.get('non-existent-key')
    expect(result).toBeUndefined()
  })

  test('has() returns false for non-existent keys', () => {
    expect(cache.has('non-existent-key')).toBe(false)
  })

  test('can clear memory cache entries', () => {
    const result: LintResult = {
      filePath: 'test-file.ts',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }

    const entry: CacheEntry = {
      hash: 'test-hash',
      result,
      timestamp: Date.now(),
      version: '1.0.0',
    }

    cache.set('key1', entry)
    cache.set('key2', entry)
    expect(cache.size()).toBe(2)

    cache.clear()
    expect(cache.size()).toBe(0)
    // Note: File cache entries may still exist for persistence
  })

  test('overwrites existing entries with same key', () => {
    const result1: LintResult = {
      filePath: 'test-file.ts',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }

    const result2: LintResult = {
      filePath: 'test-file.ts',
      messages: [{
        ruleId: 'test-rule',
        severity: 1,
        message: 'Test message',
        line: 1,
        column: 1,
      }],
      errorCount: 0,
      warningCount: 1,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }

    const entry1: CacheEntry = {
      hash: 'hash1',
      result: result1,
      timestamp: Date.now(),
      version: '1.0.0',
    }

    const entry2: CacheEntry = {
      hash: 'hash2',
      result: result2,
      timestamp: Date.now(),
      version: '1.0.0',
    }

    cache.set('test-key', entry1)
    expect(cache.size()).toBe(1)

    cache.set('test-key', entry2)
    expect(cache.size()).toBe(1) // Should still be 1

    const retrieved = cache.get('test-key')
    expect((retrieved?.result as LintResult)?.warningCount).toBe(1)
    expect((retrieved?.result as LintResult)?.messages).toHaveLength(1)
  })

  test('handles multiple cache entries', () => {
    const result: LintResult = {
      filePath: 'test-file.ts',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }

    const entry: CacheEntry = {
      hash: 'test-hash',
      result,
      timestamp: Date.now(),
      version: '1.0.0',
    }

    const keys = ['file1.ts', 'file2.js', 'file3.html']
    keys.forEach(key => cache.set(key, entry))

    expect(cache.size()).toBe(3)
    keys.forEach((key) => {
      expect(cache.has(key)).toBe(true)
      expect(cache.get(key)).toBeDefined()
    })
  })

  test('cache entry contains metadata', () => {
    const result: LintResult = {
      filePath: 'test-file.ts',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }

    const entry: CacheEntry = {
      hash: 'test-hash',
      result,
      timestamp: Date.now(),
      version: '1.0.0',
    }

    cache.set('test-key', entry)
    const retrieved = cache.get('test-key')

    expect(retrieved).toBeDefined()
    expect(retrieved?.hash).toBeDefined()
    expect(retrieved?.timestamp).toBeDefined()
    expect(retrieved?.version).toBe(version)
    expect(typeof retrieved?.timestamp).toBe('number')
    expect(retrieved?.timestamp).toBeGreaterThan(0)
  })
})

describe('Cache Helper Functions', () => {
  test('createContentHash generates different hashes for different content', () => {
    const hash1 = createContentHash('content1', { rule: 'test' })
    const hash2 = createContentHash('content2', { rule: 'test' })

    expect(hash1).not.toBe(hash2)
    expect(typeof hash1).toBe('string')
    expect(typeof hash2).toBe('string')
    expect(hash1.length).toBeGreaterThan(0)
    expect(hash2.length).toBeGreaterThan(0)
  })

  test('createContentHash generates same hash for same content and config', () => {
    const content = 'const x = 1;'
    const config = { rule: 'test' }
    const hash1 = createContentHash(content, config)
    const hash2 = createContentHash(content, config)

    expect(hash1).toBe(hash2)
  })

  test('createContentHash generates different hashes for different configs', () => {
    const content = 'const x = 1;'
    const hash1 = createContentHash(content, { rule: 'test1' })
    const hash2 = createContentHash(content, { rule: 'test2' })

    expect(hash1).not.toBe(hash2)
  })

  test('createCacheKey creates proper cache keys', () => {
    const filePath = '/path/to/file.ts'
    const contentHash = 'abc123'

    const lintKey = createCacheKey(filePath, contentHash, 'lint')
    const formatKey = createCacheKey(filePath, contentHash, 'format')

    expect(lintKey).toBe('lint:/path/to/file.ts:abc123')
    expect(formatKey).toBe('format:/path/to/file.ts:abc123')
    expect(lintKey).not.toBe(formatKey)
  })

  test('createCacheKey handles different file paths', () => {
    const contentHash = 'abc123'
    const key1 = createCacheKey('/file1.ts', contentHash, 'lint')
    const key2 = createCacheKey('/file2.ts', contentHash, 'lint')

    expect(key1).not.toBe(key2)
    expect(key1).toContain('/file1.ts')
    expect(key2).toContain('/file2.ts')
  })
})
