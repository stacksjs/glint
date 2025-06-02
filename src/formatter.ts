import type { FileCache } from './cache'
import type {
  FileInfo,
  FormatResult,
  FormattingConfig,
  GlintConfig,
  PerformanceMetrics,
  SupportedLanguage,
} from './types'
import { performance } from 'node:perf_hooks'
import { createCacheKey, createContentHash } from './cache'

export class GlintFormatter {
  private config: GlintConfig
  private cache: FileCache
  private metrics: PerformanceMetrics

  constructor(config: GlintConfig, cache: FileCache) {
    this.config = config
    this.cache = cache
    this.metrics = this.initializeMetrics()
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalTime: 0,
      parseTime: 0,
      lintTime: 0,
      formatTime: 0,
      filesProcessed: 0,
      linesProcessed: 0,
      rulesExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
  }

  async formatFile(file: FileInfo): Promise<FormatResult> {
    const startTime = performance.now()

    // Check cache first
    const formatConfig = this.getLanguageFormattingConfig(file.language)
    const contentHash = createContentHash(file.content, formatConfig)
    const cacheKey = createCacheKey(file.path, contentHash, 'format')

    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey)
      if (cached) {
        this.metrics.cacheHits++
        return cached.result as FormatResult
      }
      this.metrics.cacheMisses++
    }

    // Format the file
    const formatStart = performance.now()
    const formatted = await this.formatByLanguage(file.content, file.language, formatConfig)
    this.metrics.formatTime += performance.now() - formatStart

    const result: FormatResult = {
      filePath: file.path,
      formatted,
      changed: formatted !== file.content,
    }

    // Cache the result
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, {
        hash: contentHash,
        result,
        timestamp: Date.now(),
        version: '1.0.0',
      })
    }

    this.metrics.filesProcessed++
    this.metrics.linesProcessed += file.content.split('\n').length
    this.metrics.totalTime += performance.now() - startTime

    return result
  }

  async formatFiles(files: FileInfo[]): Promise<FormatResult[]> {
    if (this.config.parallel && files.length > 1) {
      // Parallel processing for better performance
      const chunks = this.chunkArray(files, this.config.maxWorkers || 4)
      const results: FormatResult[] = []

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(file => this.formatFile(file)))
        results.push(...chunkResults)
      }

      return results
    }
    else {
      // Sequential processing
      const results: FormatResult[] = []
      for (const file of files) {
        const result = await this.formatFile(file)
        results.push(result)
      }
      return results
    }
  }

  private async formatByLanguage(
    content: string,
    language: SupportedLanguage,
    config: FormattingConfig,
  ): Promise<string> {
    switch (language) {
      case 'html':
        return this.formatHtml(content, config)
      case 'css':
        return this.formatCss(content, config)
      case 'javascript':
        return this.formatJavaScript(content, config)
      case 'typescript':
        return this.formatTypeScript(content, config)
      default:
        throw new Error(`Unsupported language: ${language}`)
    }
  }

  private formatHtml(content: string, config: FormattingConfig): string {
    // High-performance HTML formatting
    let formatted = content

    // Normalize line endings
    formatted = this.normalizeLineEndings(formatted, config.endOfLine)

    // Handle indentation
    formatted = this.formatHtmlIndentation(formatted, config)

    // Trim trailing whitespace
    if (config.trimTrailingWhitespace) {
      formatted = this.trimTrailingWhitespace(formatted)
    }

    // Ensure final newline
    if (config.insertFinalNewline && !formatted.endsWith('\n')) {
      formatted += '\n'
    }

    return formatted
  }

  private formatHtmlIndentation(content: string, config: FormattingConfig): string {
    const lines = content.split('\n')
    const indentChar = config.indentType === 'tabs' ? '\t' : ' '.repeat(config.indentSize)
    let indentLevel = 0
    const formatted: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (!line) {
        formatted.push('')
        continue
      }

      // Decrease indent for closing tags
      if (line.startsWith('</') && !line.includes('/>')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      // Add indentation
      const indentedLine = indentChar.repeat(indentLevel) + line
      formatted.push(indentedLine)

      // Increase indent for opening tags (but not self-closing)
      if (line.startsWith('<') && !line.startsWith('</') && !line.includes('/>') && !this.isSelfClosingTag(line)) {
        indentLevel++
      }
    }

    return formatted.join('\n')
  }

  private formatCss(content: string, config: FormattingConfig): string {
    // High-performance CSS formatting
    let formatted = content

    // Normalize line endings
    formatted = this.normalizeLineEndings(formatted, config.endOfLine)

    // Format CSS structure
    formatted = this.formatCssStructure(formatted, config)

    // Trim trailing whitespace
    if (config.trimTrailingWhitespace) {
      formatted = this.trimTrailingWhitespace(formatted)
    }

    // Ensure final newline
    if (config.insertFinalNewline && !formatted.endsWith('\n')) {
      formatted += '\n'
    }

    return formatted
  }

  private formatCssStructure(content: string, config: FormattingConfig): string {
    const indentChar = config.indentType === 'tabs' ? '\t' : ' '.repeat(config.indentSize)
    let formatted = content

    // Add proper spacing around braces
    formatted = formatted.replace(/\s*\{\s*/g, ' {\n')
    formatted = formatted.replace(/;\s*\}/g, ';\n}')
    formatted = formatted.replace(/\}\s*/g, '}\n\n')

    // Format properties
    formatted = formatted.replace(/;\s*/g, ';\n')
    formatted = formatted.replace(/:\s*/g, ': ')

    // Add indentation
    const lines = formatted.split('\n')
    let indentLevel = 0
    const indentedLines: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed) {
        indentedLines.push('')
        continue
      }

      if (trimmed === '}') {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const indentedLine = indentChar.repeat(indentLevel) + trimmed
      indentedLines.push(indentedLine)

      if (trimmed.endsWith('{')) {
        indentLevel++
      }
    }

    return indentedLines.join('\n')
  }

  private formatJavaScript(content: string, config: FormattingConfig): string {
    // High-performance JavaScript formatting
    let formatted = content

    // Normalize line endings
    formatted = this.normalizeLineEndings(formatted, config.endOfLine)

    // Format JavaScript structure
    formatted = this.formatJavaScriptStructure(formatted, config)

    // Trim trailing whitespace
    if (config.trimTrailingWhitespace) {
      formatted = this.trimTrailingWhitespace(formatted)
    }

    // Ensure final newline
    if (config.insertFinalNewline && !formatted.endsWith('\n')) {
      formatted += '\n'
    }

    return formatted
  }

  private formatJavaScriptStructure(content: string, config: FormattingConfig): string {
    const indentChar = config.indentType === 'tabs' ? '\t' : ' '.repeat(config.indentSize)
    let formatted = content

    // Basic JavaScript formatting
    // Add proper spacing around operators
    formatted = formatted.replace(/([^=!<>])=([^=])/g, '$1 = $2')
    formatted = formatted.replace(/([^=!<>])==([^=])/g, '$1 == $2')
    formatted = formatted.replace(/([^=!<>])===([^=])/g, '$1 === $2')

    // Add spacing around braces
    formatted = formatted.replace(/\s*\{\s*/g, ' {\n')
    formatted = formatted.replace(/\}\s*else\s*\{/g, '} else {')

    // Format function declarations
    formatted = formatted.replace(/function\s*\(/g, 'function (')
    formatted = formatted.replace(/\)\s*\{/g, ') {')

    // Add indentation
    const lines = formatted.split('\n')
    let indentLevel = 0
    const indentedLines: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed) {
        indentedLines.push('')
        continue
      }

      // Decrease indent for closing braces
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const indentedLine = indentChar.repeat(indentLevel) + trimmed
      indentedLines.push(indentedLine)

      // Increase indent for opening braces
      if (trimmed.endsWith('{')) {
        indentLevel++
      }
    }

    return indentedLines.join('\n')
  }

  private formatTypeScript(content: string, config: FormattingConfig): string {
    // TypeScript formatting (extends JavaScript formatting)
    let formatted = this.formatJavaScript(content, config)

    // TypeScript-specific formatting
    // Format type annotations
    formatted = formatted.replace(/:\s*([A-Z])/gi, ': $1')
    formatted = formatted.replace(/\s*=>\s*/g, ' => ')

    // Format interface declarations
    formatted = formatted.replace(/interface\s+([A-Za-z])/g, 'interface $1')
    formatted = formatted.replace(/type\s+([A-Za-z])/g, 'type $1')

    return formatted
  }

  private normalizeLineEndings(content: string, endOfLine: 'lf' | 'crlf' | 'cr'): string {
    // First normalize to LF
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Then convert to desired format
    switch (endOfLine) {
      case 'crlf':
        return normalized.replace(/\n/g, '\r\n')
      case 'cr':
        return normalized.replace(/\n/g, '\r')
      case 'lf':
      default:
        return normalized
    }
  }

  private trimTrailingWhitespace(content: string): string {
    return content.split('\n').map(line => line.trimEnd()).join('\n')
  }

  private isSelfClosingTag(line: string): boolean {
    const selfClosingTags = [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr',
    ]

    const tagMatch = line.match(/<(\w+)/)
    if (tagMatch) {
      const tagName = tagMatch[1].toLowerCase()
      return selfClosingTags.includes(tagName) || line.includes('/>')
    }

    return false
  }

  private getLanguageFormattingConfig(language: SupportedLanguage): FormattingConfig {
    switch (language) {
      case 'html':
        return this.config.html.formatter
      case 'css':
        return this.config.css.formatter
      case 'javascript':
        return this.config.javascript.formatter
      case 'typescript':
        return this.config.typescript.formatter
      default:
        return this.config.formatting
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
  }
}
