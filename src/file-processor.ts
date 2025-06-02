import type { Worker } from 'node:worker_threads'
import type { FileInfo, GlintConfig, SupportedLanguage } from './types'
import { Glob } from 'bun'
import { Buffer } from 'node:buffer'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import process from 'node:process'

export class FileProcessor {
  private config: GlintConfig
  private workers: Worker[] = []

  constructor(config: GlintConfig) {
    this.config = config
  }

  async discoverFiles(patterns?: string[]): Promise<string[]> {
    const includePatterns = patterns || this.config.include
    const excludePatterns = this.config.exclude

    // Use Bun's native glob for maximum performance
    const allFiles: string[] = []

    for (const pattern of includePatterns) {
      const glob = new Glob(pattern)
      for await (const file of glob.scan({
        cwd: process.cwd(),
        absolute: true,
        onlyFiles: true,
        followSymlinks: false,
      })) {
        // Check if file should be excluded
        const shouldExclude = excludePatterns.some((excludePattern) => {
          const excludeGlob = new Glob(excludePattern)
          return excludeGlob.match(file)
        })

        if (!shouldExclude) {
          allFiles.push(file)
        }
      }
    }

    // Filter by supported extensions
    const supportedExtensions = new Set(this.config.extensions)
    return allFiles.filter((file: string) => {
      const ext = extname(file).slice(1)
      return supportedExtensions.has(ext)
    })
  }

  async loadFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const [content, stats] = await Promise.all([
        readFile(filePath, 'utf8'),
        stat(filePath),
      ])

      const language = this.detectLanguage(filePath)
      if (!language)
        return null

      return {
        path: resolve(filePath),
        content,
        language,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
      }
    }
    catch {
      return null
    }
  }

  async loadFiles(filePaths: string[]): Promise<FileInfo[]> {
    if (!this.config.parallel) {
      // Sequential processing
      const files: FileInfo[] = []
      for (const filePath of filePaths) {
        const fileInfo = await this.loadFileInfo(filePath)
        if (fileInfo)
          files.push(fileInfo)
      }
      return files
    }

    // Parallel processing with controlled concurrency
    const maxConcurrency = this.config.maxWorkers || 4
    const chunks = this.chunkArray(filePaths, maxConcurrency)
    const results: FileInfo[] = []

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(filePath => this.loadFileInfo(filePath)),
      )
      results.push(...chunkResults.filter(Boolean) as FileInfo[])
    }

    return results
  }

  detectLanguage(filePath: string): SupportedLanguage | null {
    const ext = extname(filePath).slice(1).toLowerCase()

    switch (ext) {
      case 'html':
      case 'htm':
        return 'html'
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return 'css'
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return 'javascript'
      case 'ts':
      case 'tsx':
      case 'mts':
      case 'cts':
        return 'typescript'
      default:
        return null
    }
  }

  isLanguageEnabled(language: SupportedLanguage): boolean {
    switch (language) {
      case 'html':
        return this.config.html.enabled
      case 'css':
        return this.config.css.enabled
      case 'javascript':
        return this.config.javascript.enabled
      case 'typescript':
        return this.config.typescript.enabled
      default:
        return false
    }
  }

  filterEnabledFiles(files: FileInfo[]): FileInfo[] {
    return files.filter(file => this.isLanguageEnabled(file.language))
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  // Batch processing for better performance
  async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize = 50,
  ): Promise<R[]> {
    const results: R[] = []
    const batches = this.chunkArray(items, batchSize)

    for (const batch of batches) {
      if (this.config.parallel) {
        const batchResults = await Promise.all(batch.map(processor))
        results.push(...batchResults)
      }
      else {
        for (const item of batch) {
          const result = await processor(item)
          results.push(result)
        }
      }
    }

    return results
  }

  // Memory-efficient file reading for large files
  async readFileChunked(filePath: string, chunkSize: number = 64 * 1024): Promise<string> {
    const chunks: Buffer[] = []
    const fs = await import('node:fs')
    const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize })

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: string | Buffer) => {
        const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
        chunks.push(buffer)
      })
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      stream.on('error', reject)
    })
  }

  // Get file statistics for performance monitoring
  getFileStats(files: FileInfo[]): {
    totalFiles: number
    totalSize: number
    averageSize: number
    languageDistribution: Record<SupportedLanguage, number>
  } {
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      averageSize: 0,
      languageDistribution: {
        html: 0,
        css: 0,
        javascript: 0,
        typescript: 0,
      } as Record<SupportedLanguage, number>,
    }

    stats.averageSize = stats.totalFiles > 0 ? stats.totalSize / stats.totalFiles : 0

    for (const file of files) {
      stats.languageDistribution[file.language]++
    }

    return stats
  }
}
