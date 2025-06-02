import type {
  Formatter,
  GlintConfig,
  LintMessage,
  Plugin,
  Processor,
  Rule,
  RuleContext,
  SourceCode,
  SupportedLanguage,
} from './types'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private rules: Map<string, Rule> = new Map()
  private formatters: Map<string, Map<SupportedLanguage, Formatter>> = new Map()
  private processors: Map<string, Processor> = new Map()
  private config: GlintConfig

  constructor(config: GlintConfig) {
    this.config = config
  }

  /**
   * Load a plugin from a module path
   */
  async loadPlugin(modulePath: string): Promise<void> {
    try {
      const pluginModule = await import(resolve(modulePath))
      const plugin: Plugin = pluginModule.default || pluginModule

      if (!this.isValidPlugin(plugin)) {
        throw new Error(`Invalid plugin: ${modulePath}`)
      }

      this.registerPlugin(plugin)

      if (this.config.verbose) {
        console.warn(`✅ Loaded plugin: ${plugin.name} v${plugin.version}`)
      }
    }
    catch (error) {
      if (this.config.verbose) {
        console.warn(`❌ Failed to load plugin ${modulePath}:`, error)
      }
      throw error
    }
  }

  /**
   * Register a plugin instance
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin)

    // Register rules
    if (plugin.rules) {
      for (const [ruleId, rule] of Object.entries(plugin.rules)) {
        const fullRuleId = `${plugin.name}/${ruleId}`
        this.rules.set(fullRuleId, rule)
      }
    }

    // Register formatters
    if (plugin.formatters) {
      this.formatters.set(plugin.name, new Map())
      for (const [language, formatter] of Object.entries(plugin.formatters)) {
        this.formatters.get(plugin.name)!.set(language as SupportedLanguage, formatter)
      }
    }

    // Register processors
    if (plugin.processors) {
      for (const [extension, processor] of Object.entries(plugin.processors)) {
        this.processors.set(extension, processor)
      }
    }
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName)
    if (!plugin)
      return

    // Remove rules
    if (plugin.rules) {
      for (const ruleId of Object.keys(plugin.rules)) {
        this.rules.delete(`${pluginName}/${ruleId}`)
      }
    }

    // Remove formatters
    this.formatters.delete(pluginName)

    // Remove processors
    if (plugin.processors) {
      for (const extension of Object.keys(plugin.processors)) {
        this.processors.delete(extension)
      }
    }

    this.plugins.delete(pluginName)
  }

  /**
   * Get all registered rules for a language
   */
  getRulesForLanguage(language: SupportedLanguage): Map<string, Rule> {
    const languageRules = new Map<string, Rule>()

    for (const [ruleId, rule] of this.rules) {
      // Check if rule applies to this language
      const pluginName = ruleId.split('/')[0]
      const plugin = this.plugins.get(pluginName)

      if (plugin && plugin.languages.includes(language)) {
        languageRules.set(ruleId, rule)
      }
    }

    return languageRules
  }

  /**
   * Get custom formatter for a language from a specific plugin
   */
  getFormatter(pluginName: string, language: SupportedLanguage): Formatter | undefined {
    return this.formatters.get(pluginName)?.get(language)
  }

  /**
   * Get all formatters for a language
   */
  getFormattersForLanguage(language: SupportedLanguage): Map<string, Formatter> {
    const formatters = new Map<string, Formatter>()

    for (const [pluginName, pluginFormatters] of this.formatters) {
      const formatter = pluginFormatters.get(language)
      if (formatter) {
        formatters.set(pluginName, formatter)
      }
    }

    return formatters
  }

  /**
   * Get processor for file extension
   */
  getProcessor(extension: string): Processor | undefined {
    return this.processors.get(extension)
  }

  /**
   * Execute custom rule
   */
  async executeRule(
    ruleId: string,
    context: RuleContext,
    sourceCode: SourceCode,
  ): Promise<LintMessage[]> {
    const rule = this.rules.get(ruleId)
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`)
    }

    const messages: LintMessage[] = []
    const startTime = performance.now()

    try {
      const ruleListener = rule.create({
        ...context,
        report: (descriptor) => {
          messages.push({
            ruleId,
            severity: this.getRuleSeverity(ruleId),
            message: descriptor.message,
            line: descriptor.loc?.line || 1,
            column: descriptor.loc?.column || 1,
            fix: descriptor.fix
              ? (() => {
                  const fixResult = descriptor.fix({
                    insertTextAfter: () => ({ range: [0, 0], text: '' }),
                    insertTextBefore: () => ({ range: [0, 0], text: '' }),
                    insertTextAfterRange: () => ({ range: [0, 0], text: '' }),
                    insertTextBeforeRange: () => ({ range: [0, 0], text: '' }),
                    remove: () => ({ range: [0, 0], text: '' }),
                    removeRange: () => ({ range: [0, 0], text: '' }),
                    replaceText: () => ({ range: [0, 0], text: '' }),
                    replaceTextRange: () => ({ range: [0, 0], text: '' }),
                  })
                  return Array.isArray(fixResult) ? fixResult[0] : fixResult || undefined
                })()
              : undefined,
          })
        },
      })

      // Execute rule listener on AST nodes
      this.traverseAST(sourceCode.ast, ruleListener)
    }
    catch (error) {
      if (this.config.verbose) {
        console.warn(`Rule ${ruleId} failed:`, error)
      }
    }

    const executionTime = performance.now() - startTime
    if (this.config.verbose && executionTime > 10) {
      console.warn(`Slow rule detected: ${ruleId} took ${executionTime.toFixed(2)}ms`)
    }

    return messages
  }

  /**
   * Execute custom formatter
   */
  async executeFormatter(
    pluginName: string,
    language: SupportedLanguage,
    code: string,
    options: any,
  ): Promise<string> {
    const formatter = this.getFormatter(pluginName, language)
    if (!formatter) {
      throw new Error(`Formatter not found: ${pluginName}/${language}`)
    }

    const startTime = performance.now()
    const result = await formatter.format(code, options)
    const executionTime = performance.now() - startTime

    if (this.config.verbose && executionTime > 50) {
      console.warn(`Slow formatter detected: ${pluginName}/${language} took ${executionTime.toFixed(2)}ms`)
    }

    return result
  }

  /**
   * Load plugins from configuration
   */
  async loadConfiguredPlugins(): Promise<void> {
    for (const pluginConfig of this.config.plugins) {
      if (pluginConfig.enabled) {
        try {
          await this.loadPlugin(pluginConfig.name)
        }
        catch (error) {
          if (this.config.verbose) {
            console.warn(`Failed to load configured plugin ${pluginConfig.name}:`, error)
          }
        }
      }
    }
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  /**
   * Check if plugin is loaded
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * Get plugin statistics
   */
  getPluginStats(): {
    totalPlugins: number
    totalRules: number
    totalFormatters: number
    totalProcessors: number
    pluginsByLanguage: Record<SupportedLanguage, string[]>
  } {
    const pluginsByLanguage: Record<SupportedLanguage, string[]> = {
      html: [],
      css: [],
      javascript: [],
      typescript: [],
    }

    for (const [name, plugin] of this.plugins) {
      for (const language of plugin.languages) {
        pluginsByLanguage[language].push(name)
      }
    }

    return {
      totalPlugins: this.plugins.size,
      totalRules: this.rules.size,
      totalFormatters: Array.from(this.formatters.values()).reduce(
        (sum, formatters) => sum + formatters.size,
        0,
      ),
      totalProcessors: this.processors.size,
      pluginsByLanguage,
    }
  }

  /**
   * Validate plugin structure
   */
  private isValidPlugin(plugin: any): plugin is Plugin {
    return (
      plugin
      && typeof plugin.name === 'string'
      && typeof plugin.version === 'string'
      && Array.isArray(plugin.languages)
      && plugin.languages.every((lang: any) =>
        ['html', 'css', 'javascript', 'typescript'].includes(lang),
      )
    )
  }

  /**
   * Get rule severity from configuration
   */
  private getRuleSeverity(ruleId: string): 1 | 2 {
    // Extract language from rule ID
    const parts = ruleId.split('/')
    if (parts.length < 2)
      return 1

    const language = this.inferLanguageFromRuleId(ruleId)
    if (!language)
      return 1

    const config = this.getLanguageConfig(language)
    const ruleSeverity = config.rules[ruleId]

    if (ruleSeverity === 'error')
      return 2
    if (ruleSeverity === 'warn')
      return 1
    return 1 // Default to warning
  }

  /**
   * Infer language from rule ID
   */
  private inferLanguageFromRuleId(ruleId: string): SupportedLanguage | null {
    if (ruleId.includes('html'))
      return 'html'
    if (ruleId.includes('css'))
      return 'css'
    if (ruleId.includes('ts') || ruleId.includes('typescript'))
      return 'typescript'
    if (ruleId.includes('js') || ruleId.includes('javascript'))
      return 'javascript'
    return null
  }

  /**
   * Get language configuration
   */
  private getLanguageConfig(language: SupportedLanguage) {
    switch (language) {
      case 'html': return this.config.html
      case 'css': return this.config.css
      case 'javascript': return this.config.javascript
      case 'typescript': return this.config.typescript
      default: throw new Error(`Unsupported language: ${language}`)
    }
  }

  /**
   * Simple AST traversal
   */
  private traverseAST(node: any, listener: any): void {
    if (!node || typeof node !== 'object')
      return

    const nodeType = node.type
    if (listener[nodeType]) {
      listener[nodeType](node)
    }

    // Traverse child nodes
    for (const key in node) {
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) {
          this.traverseAST(item, listener)
        }
      }
      else if (child && typeof child === 'object') {
        this.traverseAST(child, listener)
      }
    }
  }
}
