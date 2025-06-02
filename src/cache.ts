import type { Cache, CacheEntry, FormatResult, LintResult } from './types'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export class FileCache implements Cache {
  private memoryCache = new Map<string, CacheEntry>()
  private cacheDir: string
  private maxMemoryEntries: number
  private version: string

  constructor(cacheDir: string, version: string, maxMemoryEntries = 1000) {
    this.cacheDir = cacheDir
    this.version = version
    this.maxMemoryEntries = maxMemoryEntries
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getCacheFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex')
    return join(this.cacheDir, `${hash.slice(0, 8)}.json`)
  }

  private evictOldestMemoryEntry(): void {
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const oldestKey = this.memoryCache.keys().next().value
      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
      }
    }
  }

  get(key: string): CacheEntry | undefined {
    // Check memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && memoryEntry.version === this.version) {
      return memoryEntry
    }

    // Check file cache
    const filePath = this.getCacheFilePath(key)
    if (existsSync(filePath)) {
      try {
        const fileContent = readFileSync(filePath, 'utf8')
        const entry: CacheEntry = JSON.parse(fileContent)

        // Validate version and timestamp
        if (entry.version === this.version && Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
          // Cache in memory for faster access
          this.evictOldestMemoryEntry()
          this.memoryCache.set(key, entry)
          return entry
        }
      }
      catch {
        // Ignore corrupted cache files
      }
    }

    return undefined
  }

  set(key: string, entry: CacheEntry): void {
    entry.version = this.version
    entry.timestamp = Date.now()

    // Store in memory cache
    this.evictOldestMemoryEntry()
    this.memoryCache.set(key, entry)

    // Store in file cache asynchronously for persistence
    const filePath = this.getCacheFilePath(key)
    try {
      writeFileSync(filePath, JSON.stringify(entry))
    }
    catch {
      // Ignore write errors - memory cache will still work
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  clear(): void {
    this.memoryCache.clear()
    // Note: We don't clear file cache to preserve across restarts
  }

  size(): number {
    return this.memoryCache.size
  }
}

export function createContentHash(content: string, config: any): string {
  return createHash('sha256')
    .update(content)
    .update(JSON.stringify(config))
    .digest('hex')
}

export function createCacheKey(filePath: string, contentHash: string, operation: 'lint' | 'format'): string {
  return `${operation}:${filePath}:${contentHash}`
}
