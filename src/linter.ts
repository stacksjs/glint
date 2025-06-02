import type { FileCache } from './cache'
import type {
  FileInfo,
  GlintConfig,
  LintMessage,
  LintResult,
  PerformanceMetrics,
  Rule,
  RuleContext,
  SourceCode,
  SupportedLanguage,
} from './types'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { createCacheKey, createContentHash } from './cache'

export class GlintLinter {
  private config: GlintConfig
  private cache: FileCache
  private rules: Map<string, Rule> = new Map()
  private metrics: PerformanceMetrics

  constructor(config: GlintConfig, cache: FileCache) {
    this.config = config
    this.cache = cache
    this.metrics = this.initializeMetrics()
    this.loadBuiltinRules()
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

  private loadBuiltinRules(): void {
    // Load built-in rules for each language
    this.loadHtmlRules()
    this.loadCssRules()
    this.loadJavaScriptRules()
    this.loadTypeScriptRules()
  }

  private loadHtmlRules(): void {
    if (!this.config.html.enabled)
      return

    // HTML-specific rules
    this.rules.set('html/no-duplicate-attributes', {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow duplicate attributes in HTML elements',
          category: 'Possible Errors',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
      },
      create: context => ({
        HTMLElement: (node: any) => {
          const attributes = new Set<string>()
          for (const attr of node.attributes || []) {
            if (attributes.has(attr.name)) {
              context.report({
                node: attr,
                message: `Duplicate attribute '${attr.name}'`,
                fix: fixer => fixer.remove(attr),
              })
            }
            attributes.add(attr.name)
          }
        },
      }),
    })

    this.rules.set('html/require-alt', {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require alt attribute for img elements',
          category: 'Accessibility',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        HTMLElement: (node: any) => {
          if (node.tagName === 'img') {
            const hasAlt = node.attributes?.some((attr: any) => attr.name === 'alt')
            if (!hasAlt) {
              context.report({
                node,
                message: 'Missing alt attribute for img element',
              })
            }
          }
        },
      }),
    })
  }

  private loadCssRules(): void {
    if (!this.config.css.enabled)
      return

    this.rules.set('css/no-duplicate-properties', {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow duplicate properties in CSS rules',
          category: 'Possible Errors',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
      },
      create: context => ({
        CSSRule: (node: any) => {
          const properties = new Set<string>()
          for (const decl of node.declarations || []) {
            if (properties.has(decl.property)) {
              context.report({
                node: decl,
                message: `Duplicate property '${decl.property}'`,
                fix: fixer => fixer.remove(decl),
              })
            }
            properties.add(decl.property)
          }
        },
      }),
    })
  }

  private loadJavaScriptRules(): void {
    if (!this.config.javascript.enabled)
      return

    this.rules.set('js/no-unused-vars', {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow unused variables',
          category: 'Variables',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        VariableDeclarator: (node: any) => {
          // Simplified unused variable detection
          if (node.id?.name && !this.isVariableUsed(node.id.name, context.getSourceCode())) {
            context.report({
              node: node.id,
              message: `'${node.id.name}' is defined but never used`,
            })
          }
        },
      }),
    })

    this.rules.set('js/prefer-const', {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Require const declarations for variables that are never reassigned',
          category: 'ECMAScript 6',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
      },
      create: context => ({
        VariableDeclaration: (node: any) => {
          if (node.kind === 'let') {
            for (const declarator of node.declarations) {
              if (declarator.id?.name && !this.isVariableReassigned(declarator.id.name, context.getSourceCode())) {
                context.report({
                  node: declarator.id,
                  message: `'${declarator.id.name}' is never reassigned. Use 'const' instead.`,
                  fix: fixer => fixer.replaceText(node, node.raw.replace('let', 'const')),
                })
              }
            }
          }
        },
      }),
    })
  }

  private loadTypeScriptRules(): void {
    if (!this.config.typescript.enabled)
      return

    this.rules.set('ts/no-explicit-any', {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow usage of the any type',
          category: 'TypeScript',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        TSAnyKeyword: (node: any) => {
          context.report({
            node,
            message: 'Unexpected any. Specify a different type.',
          })
        },
      }),
    })
  }

  async lintFile(file: FileInfo): Promise<LintResult> {
    const startTime = performance.now()

    // Check cache first
    const contentHash = createContentHash(file.content, this.getLanguageConfig(file.language))
    const cacheKey = createCacheKey(file.path, contentHash, 'lint')

    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey)
      if (cached) {
        this.metrics.cacheHits++
        return cached.result as LintResult
      }
      this.metrics.cacheMisses++
    }

    // Parse and lint
    const parseStart = performance.now()
    const sourceCode = await this.parseFile(file)
    this.metrics.parseTime += performance.now() - parseStart

    const lintStart = performance.now()
    const messages = await this.runRules(file, sourceCode)
    this.metrics.lintTime += performance.now() - lintStart

    const result: LintResult = {
      filePath: file.path,
      messages,
      errorCount: messages.filter(m => m.severity === 2).length,
      warningCount: messages.filter(m => m.severity === 1).length,
      fixableErrorCount: messages.filter(m => m.severity === 2 && m.fix).length,
      fixableWarningCount: messages.filter(m => m.severity === 1 && m.fix).length,
      source: file.content,
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

  async lintFiles(files: FileInfo[]): Promise<LintResult[]> {
    if (this.config.parallel && files.length > 1) {
      // Parallel processing for better performance
      const chunks = this.chunkArray(files, this.config.maxWorkers || 4)
      const results: LintResult[] = []

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(file => this.lintFile(file)))
        results.push(...chunkResults)
      }

      return results
    }
    else {
      // Sequential processing
      const results: LintResult[] = []
      for (const file of files) {
        const result = await this.lintFile(file)
        results.push(result)
      }
      return results
    }
  }

  private async parseFile(file: FileInfo): Promise<SourceCode> {
    // Fast parsing based on language
    switch (file.language) {
      case 'html':
        return this.parseHtml(file.content)
      case 'css':
        return this.parseCss(file.content)
      case 'javascript':
        return this.parseJavaScript(file.content)
      case 'typescript':
        return this.parseTypeScript(file.content)
      default:
        throw new Error(`Unsupported language: ${file.language}`)
    }
  }

  private parseHtml(content: string): SourceCode {
    // Simplified HTML parsing - in production, use a fast HTML parser
    const lines = content.split('\n')
    return {
      text: content,
      ast: { type: 'HTMLDocument', children: [] }, // Simplified AST
      lines,
      hasBOM: content.charCodeAt(0) === 0xFEFF,
      getText: () => content,
      getLines: () => lines,
      getAllComments: () => [],
      getComments: () => ({ leading: [], trailing: [] }),
      getTokens: () => [],
      getFirstToken: () => null,
      getLastToken: () => null,
      getTokenBefore: () => null,
      getTokenAfter: () => null,
    }
  }

  private parseCss(content: string): SourceCode {
    // Simplified CSS parsing - in production, use a fast CSS parser
    const lines = content.split('\n')
    return {
      text: content,
      ast: { type: 'CSSStyleSheet', rules: [] }, // Simplified AST
      lines,
      hasBOM: content.charCodeAt(0) === 0xFEFF,
      getText: () => content,
      getLines: () => lines,
      getAllComments: () => [],
      getComments: () => ({ leading: [], trailing: [] }),
      getTokens: () => [],
      getFirstToken: () => null,
      getLastToken: () => null,
      getTokenBefore: () => null,
      getTokenAfter: () => null,
    }
  }

  private parseJavaScript(content: string): SourceCode {
    // Use a fast JS parser like @babel/parser or acorn
    const lines = content.split('\n')
    return {
      text: content,
      ast: { type: 'Program', body: [] }, // Simplified AST
      lines,
      hasBOM: content.charCodeAt(0) === 0xFEFF,
      getText: () => content,
      getLines: () => lines,
      getAllComments: () => [],
      getComments: () => ({ leading: [], trailing: [] }),
      getTokens: () => [],
      getFirstToken: () => null,
      getLastToken: () => null,
      getTokenBefore: () => null,
      getTokenAfter: () => null,
    }
  }

  private parseTypeScript(content: string): SourceCode {
    // Use TypeScript compiler API for parsing
    const lines = content.split('\n')
    return {
      text: content,
      ast: { type: 'Program', body: [] }, // Simplified AST
      lines,
      hasBOM: content.charCodeAt(0) === 0xFEFF,
      getText: () => content,
      getLines: () => lines,
      getAllComments: () => [],
      getComments: () => ({ leading: [], trailing: [] }),
      getTokens: () => [],
      getFirstToken: () => null,
      getLastToken: () => null,
      getTokenBefore: () => null,
      getTokenAfter: () => null,
    }
  }

  private async runRules(file: FileInfo, sourceCode: SourceCode): Promise<LintMessage[]> {
    const messages: LintMessage[] = []
    const languageRules = this.getLanguageRules(file.language)

    for (const [ruleId, rule] of languageRules) {
      this.metrics.rulesExecuted++

      const context: RuleContext = {
        id: ruleId,
        options: [],
        settings: {},
        parserPath: '',
        parserOptions: {},
        report: (descriptor) => {
          messages.push({
            ruleId,
            severity: this.getRuleSeverity(ruleId, file.language),
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
        getSourceCode: () => sourceCode,
        getFilename: () => file.path,
        getCwd: () => process.cwd(),
      }

      try {
        const ruleListener = rule.create(context)
        // Execute rule listener on AST nodes
        this.traverseAST(sourceCode.ast, ruleListener)
      }
      catch (error) {
        // Log rule execution errors but continue
        if (this.config.verbose) {
          console.warn(`Rule ${ruleId} failed:`, error)
        }
      }
    }

    return messages
  }

  private getLanguageRules(language: SupportedLanguage): Map<string, Rule> {
    const languageRules = new Map<string, Rule>()

    for (const [ruleId, rule] of this.rules) {
      if (ruleId.startsWith(`${language}/`) || ruleId.startsWith('common/')) {
        languageRules.set(ruleId, rule)
      }
    }

    return languageRules
  }

  private getRuleSeverity(ruleId: string, language: SupportedLanguage): 1 | 2 {
    const config = this.getLanguageConfig(language)
    const ruleSeverity = config.rules[ruleId]

    if (ruleSeverity === 'error')
      return 2
    if (ruleSeverity === 'warn')
      return 1
    return 1 // Default to warning
  }

  private getLanguageConfig(language: SupportedLanguage) {
    switch (language) {
      case 'html': return this.config.html
      case 'css': return this.config.css
      case 'javascript': return this.config.javascript
      case 'typescript': return this.config.typescript
      default: throw new Error(`Unsupported language: ${language}`)
    }
  }

  private traverseAST(node: any, listener: any): void {
    // Simplified AST traversal - in production, use a proper AST walker
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

  private isVariableUsed(name: string, sourceCode: SourceCode): boolean {
    // Simplified variable usage detection
    return sourceCode.text.includes(name)
  }

  private isVariableReassigned(name: string, sourceCode: SourceCode): boolean {
    // Simplified reassignment detection
    const assignmentPattern = new RegExp(`${name}\\s*=`, 'g')
    const matches = sourceCode.text.match(assignmentPattern)
    return (matches?.length || 0) > 1
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
