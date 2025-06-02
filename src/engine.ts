import type {
  FileInfo,
  FormatResult,
  GlintConfig,
  LintResult,
  PerformanceMetrics,
  Plugin,
} from './types'
import { writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { version } from '../package.json'
import { FileCache } from './cache'
import { FileProcessor } from './file-processor'
import { GlintFormatter } from './formatter'
import { GlintLinter } from './linter'
import { PluginManager } from './plugin-manager'

export class GlintEngine {
  private config: GlintConfig
  private fileProcessor: FileProcessor
  private linter: GlintLinter
  private formatter: GlintFormatter
  private cache: FileCache
  private pluginManager: PluginManager
  private metrics: PerformanceMetrics

  constructor(config: GlintConfig) {
    this.config = config
    this.cache = new FileCache(config.cacheDir!, version)
    this.fileProcessor = new FileProcessor(config)
    this.linter = new GlintLinter(config, this.cache)
    this.formatter = new GlintFormatter(config, this.cache)
    this.pluginManager = new PluginManager(config)
    this.metrics = this.initializeMetrics()
    this.loadPlugins()
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

  private async loadPlugins(): Promise<void> {
    await this.pluginManager.loadConfiguredPlugins()
  }

  async lintFiles(patterns?: string[]): Promise<LintResult[]> {
    const startTime = performance.now()

    try {
      // Discover files
      const filePaths = await this.fileProcessor.discoverFiles(patterns)

      if (this.config.verbose) {
        console.warn(`Found ${filePaths.length} files to lint`)
      }

      // Load file contents
      const files = await this.fileProcessor.loadFiles(filePaths)
      const enabledFiles = this.fileProcessor.filterEnabledFiles(files)

      if (this.config.verbose) {
        console.warn(`Processing ${enabledFiles.length} enabled files`)
        const stats = this.fileProcessor.getFileStats(enabledFiles)
        console.warn(`Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`)
        console.warn('Language distribution:', stats.languageDistribution)
      }

      // Lint files
      const results = await this.linter.lintFiles(enabledFiles)

      // Aggregate metrics
      this.aggregateMetrics()
      this.metrics.totalTime = performance.now() - startTime

      if (this.config.verbose) {
        this.printMetrics()
      }

      return results
    }
    catch (error) {
      console.error('Error during linting:', error)
      throw error
    }
  }

  async formatFiles(patterns?: string[], write = false): Promise<FormatResult[]> {
    const startTime = performance.now()

    try {
      // Discover files
      const filePaths = await this.fileProcessor.discoverFiles(patterns)

      if (this.config.verbose) {
        console.log(`Found ${filePaths.length} files to format`)
      }

      // Load file contents
      const files = await this.fileProcessor.loadFiles(filePaths)
      const enabledFiles = this.fileProcessor.filterEnabledFiles(files)

      if (this.config.verbose) {
        console.log(`Processing ${enabledFiles.length} enabled files`)
      }

      // Format files
      const results = await this.formatter.formatFiles(enabledFiles)

      // Write files if requested
      if (write) {
        await this.writeFormattedFiles(results)
      }

      // Aggregate metrics
      this.aggregateMetrics()
      this.metrics.totalTime = performance.now() - startTime

      if (this.config.verbose) {
        this.printMetrics()
        const changedFiles = results.filter(r => r.changed).length
        console.log(`Formatted ${changedFiles} files`)
      }

      return results
    }
    catch (error) {
      console.error('Error during formatting:', error)
      throw error
    }
  }

  async lintAndFormat(patterns?: string[], write = false): Promise<{
    lintResults: LintResult[]
    formatResults: FormatResult[]
  }> {
    const startTime = performance.now()

    try {
      // Discover files
      const filePaths = await this.fileProcessor.discoverFiles(patterns)

      if (this.config.verbose) {
        console.log(`Found ${filePaths.length} files to process`)
      }

      // Load file contents
      const files = await this.fileProcessor.loadFiles(filePaths)
      const enabledFiles = this.fileProcessor.filterEnabledFiles(files)

      if (this.config.verbose) {
        console.log(`Processing ${enabledFiles.length} enabled files`)
      }

      // Process files in parallel if enabled
      let lintResults: LintResult[]
      let formatResults: FormatResult[]

      if (this.config.parallel) {
        [lintResults, formatResults] = await Promise.all([
          this.linter.lintFiles(enabledFiles),
          this.formatter.formatFiles(enabledFiles),
        ])
      }
      else {
        lintResults = await this.linter.lintFiles(enabledFiles)
        formatResults = await this.formatter.formatFiles(enabledFiles)
      }

      // Write formatted files if requested
      if (write) {
        await this.writeFormattedFiles(formatResults)
      }

      // Aggregate metrics
      this.aggregateMetrics()
      this.metrics.totalTime = performance.now() - startTime

      if (this.config.verbose) {
        this.printMetrics()
        const errorCount = lintResults.reduce((sum, r) => sum + r.errorCount, 0)
        const warningCount = lintResults.reduce((sum, r) => sum + r.warningCount, 0)
        const changedFiles = formatResults.filter(r => r.changed).length
        console.log(`Found ${errorCount} errors and ${warningCount} warnings`)
        console.log(`Formatted ${changedFiles} files`)
      }

      return { lintResults, formatResults }
    }
    catch (error) {
      console.error('Error during processing:', error)
      throw error
    }
  }

  async checkFiles(patterns?: string[]): Promise<{
    passed: boolean
    results: LintResult[]
  }> {
    const results = await this.lintFiles(patterns)
    const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0)

    return {
      passed: errorCount === 0,
      results,
    }
  }

  private async writeFormattedFiles(results: FormatResult[]): Promise<void> {
    const writePromises = results
      .filter(result => result.changed)
      .map(result => writeFile(result.filePath, result.formatted, 'utf8'))

    await Promise.all(writePromises)
  }

  private aggregateMetrics(): void {
    const linterMetrics = this.linter.getMetrics()
    const formatterMetrics = this.formatter.getMetrics()

    this.metrics.parseTime += linterMetrics.parseTime
    this.metrics.lintTime += linterMetrics.lintTime
    this.metrics.formatTime += formatterMetrics.formatTime
    this.metrics.filesProcessed = Math.max(linterMetrics.filesProcessed, formatterMetrics.filesProcessed)
    this.metrics.linesProcessed = Math.max(linterMetrics.linesProcessed, formatterMetrics.linesProcessed)
    this.metrics.rulesExecuted += linterMetrics.rulesExecuted
    this.metrics.cacheHits += linterMetrics.cacheHits + formatterMetrics.cacheHits
    this.metrics.cacheMisses += linterMetrics.cacheMisses + formatterMetrics.cacheMisses
  }

  private printMetrics(): void {
    console.warn('\n📊 Performance Metrics:')
    console.warn(`Total time: ${this.metrics.totalTime.toFixed(2)}ms`)
    console.warn(`Parse time: ${this.metrics.parseTime.toFixed(2)}ms`)
    console.warn(`Lint time: ${this.metrics.lintTime.toFixed(2)}ms`)
    console.warn(`Format time: ${this.metrics.formatTime.toFixed(2)}ms`)
    console.warn(`Files processed: ${this.metrics.filesProcessed}`)
    console.warn(`Lines processed: ${this.metrics.linesProcessed}`)
    console.warn(`Rules executed: ${this.metrics.rulesExecuted}`)
    console.warn(`Cache hits: ${this.metrics.cacheHits}`)
    console.warn(`Cache misses: ${this.metrics.cacheMisses}`)

    if (this.metrics.cacheHits + this.metrics.cacheMisses > 0) {
      const hitRate = (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)
      console.warn(`Cache hit rate: ${hitRate}%`)
    }

    if (this.metrics.filesProcessed > 0) {
      const avgTimePerFile = (this.metrics.totalTime / this.metrics.filesProcessed).toFixed(2)
      console.warn(`Average time per file: ${avgTimePerFile}ms`)
    }

    if (this.metrics.linesProcessed > 0) {
      const linesPerSecond = Math.round(this.metrics.linesProcessed / (this.metrics.totalTime / 1000))
      console.warn(`Lines per second: ${linesPerSecond}`)
    }
  }

  getMetrics(): PerformanceMetrics {
    this.aggregateMetrics()
    return { ...this.metrics }
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
    this.linter.resetMetrics()
    this.formatter.resetMetrics()
  }

  clearCache(): void {
    this.cache.clear()
    if (this.config.verbose) {
      console.log('Cache cleared')
    }
  }

  getCacheStats(): { size: number } {
    return {
      size: this.cache.size(),
    }
  }

  // Plugin management
  loadPlugin(plugin: Plugin): void {
    this.pluginManager.registerPlugin(plugin)
    if (this.config.verbose) {
      console.warn(`Loaded plugin: ${plugin.name} v${plugin.version}`)
    }
  }

  unloadPlugin(name: string): void {
    this.pluginManager.unregisterPlugin(name)
    if (this.config.verbose) {
      console.warn(`Unloaded plugin: ${name}`)
    }
  }

  getLoadedPlugins(): Plugin[] {
    return this.pluginManager.getLoadedPlugins()
  }

  // Configuration management
  updateConfig(newConfig: Partial<GlintConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Recreate components with new config
    this.fileProcessor = new FileProcessor(this.config)
    this.linter = new GlintLinter(this.config, this.cache)
    this.formatter = new GlintFormatter(this.config, this.cache)

    if (this.config.verbose) {
      console.log('Configuration updated')
    }
  }

  getConfig(): GlintConfig {
    return { ...this.config }
  }
}
