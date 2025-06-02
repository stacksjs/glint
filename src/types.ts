export interface GlintConfig {
  verbose: boolean
  // Performance settings
  parallel: boolean
  maxWorkers?: number
  cacheEnabled: boolean
  cacheDir?: string

  // File processing
  include: string[]
  exclude: string[]
  extensions: string[]

  // Language-specific configs
  html: HtmlConfig
  css: CssConfig
  javascript: JavaScriptConfig
  typescript: TypeScriptConfig

  // Plugin system
  plugins: PluginConfig[]

  // Formatting options
  formatting: FormattingConfig

  // Linting options
  linting: LintingConfig
}

export interface HtmlConfig {
  enabled: boolean
  rules: Record<string, any>
  formatter: HtmlFormatterConfig
}

export interface CssConfig {
  enabled: boolean
  rules: Record<string, any>
  formatter: CssFormatterConfig
}

export interface JavaScriptConfig {
  enabled: boolean
  rules: Record<string, any>
  formatter: JavaScriptFormatterConfig
  ecmaVersion: number
  sourceType: 'module' | 'script'
}

export interface TypeScriptConfig {
  enabled: boolean
  rules: Record<string, any>
  formatter: TypeScriptFormatterConfig
  strict: boolean
  target: string
}

export interface FormattingConfig {
  indentSize: number
  indentType: 'spaces' | 'tabs'
  lineWidth: number
  endOfLine: 'lf' | 'crlf' | 'cr'
  insertFinalNewline: boolean
  trimTrailingWhitespace: boolean
}

export interface HtmlFormatterConfig extends FormattingConfig {
  wrapAttributes: 'auto' | 'force' | 'force-aligned' | 'force-expand-multiline'
  htmlWhitespaceSensitivity: 'css' | 'strict' | 'ignore'
}

export interface CssFormatterConfig extends FormattingConfig {
  singleQuote: boolean
  trailingComma: boolean
}

export interface JavaScriptFormatterConfig extends FormattingConfig {
  singleQuote: boolean
  trailingComma: 'none' | 'es5' | 'all'
  semicolons: boolean
  bracketSpacing: boolean
  arrowParens: 'avoid' | 'always'
}

export interface TypeScriptFormatterConfig extends JavaScriptFormatterConfig {
  // TypeScript-specific formatting options
}

export interface LintingConfig {
  enabled: boolean
  reportUnusedDisableDirectives: boolean
  noInlineConfig: boolean
}

export interface PluginConfig {
  name: string
  enabled: boolean
  options?: Record<string, any>
}

export type GlintOptions = Partial<GlintConfig>

// Core interfaces for the engine
export interface FileInfo {
  path: string
  content: string
  language: SupportedLanguage
  size: number
  lastModified: number
}

export interface LintResult {
  filePath: string
  messages: LintMessage[]
  errorCount: number
  warningCount: number
  fixableErrorCount: number
  fixableWarningCount: number
  source?: string
  usedDeprecatedRules?: DeprecatedRuleUse[]
}

export interface LintMessage {
  ruleId: string | null
  severity: 1 | 2 // 1 = warning, 2 = error
  message: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  fix?: Fix
  suggestions?: Suggestion[]
}

export interface Fix {
  range: [number, number]
  text: string
}

export interface Suggestion {
  desc: string
  fix: Fix
}

export interface DeprecatedRuleUse {
  ruleId: string
  replacedBy: string[]
}

export interface FormatResult {
  filePath: string
  formatted: string
  changed: boolean
}

export type SupportedLanguage = 'html' | 'css' | 'javascript' | 'typescript'

// Plugin system interfaces
export interface Plugin {
  name: string
  version: string
  languages: SupportedLanguage[]
  rules?: Record<string, Rule>
  formatters?: Record<SupportedLanguage, Formatter>
  processors?: Record<string, Processor>
}

export interface Rule {
  meta: RuleMeta
  create: (context: RuleContext) => RuleListener
}

export interface RuleMeta {
  type: 'problem' | 'suggestion' | 'layout'
  docs: {
    description: string
    category: string
    recommended: boolean
    url?: string
  }
  fixable?: 'code' | 'whitespace'
  schema: any[]
  deprecated?: boolean
  replacedBy?: string[]
}

export interface RuleContext {
  id: string
  options: any[]
  settings: Record<string, any>
  parserPath: string
  parserOptions: any
  report: (descriptor: ReportDescriptor) => void
  getSourceCode: () => SourceCode
  getFilename: () => string
  getCwd: () => string
}

export interface RuleListener {
  [key: string]: (node: any) => void
}

export interface ReportDescriptor {
  node?: any
  loc?: Location
  message: string
  data?: Record<string, any>
  fix?: (fixer: RuleFixer) => Fix | Fix[] | null
  suggest?: SuggestionDescriptor[]
}

export interface Location {
  line: number
  column: number
}

export interface RuleFixer {
  insertTextAfter: (nodeOrToken: any, text: string) => Fix
  insertTextBefore: (nodeOrToken: any, text: string) => Fix
  insertTextAfterRange: (range: [number, number], text: string) => Fix
  insertTextBeforeRange: (range: [number, number], text: string) => Fix
  remove: (nodeOrToken: any) => Fix
  removeRange: (range: [number, number]) => Fix
  replaceText: (nodeOrToken: any, text: string) => Fix
  replaceTextRange: (range: [number, number], text: string) => Fix
}

export interface SuggestionDescriptor {
  desc: string
  fix: (fixer: RuleFixer) => Fix | Fix[] | null
}

export interface SourceCode {
  text: string
  ast: any
  lines: string[]
  hasBOM: boolean
  getText: (node?: any, beforeCount?: number, afterCount?: number) => string
  getLines: () => string[]
  getAllComments: () => any[]
  getComments: (node: any) => { leading: any[], trailing: any[] }
  getTokens: (node?: any, beforeCount?: number, afterCount?: number) => any[]
  getFirstToken: (node: any, options?: any) => any
  getLastToken: (node: any, options?: any) => any
  getTokenBefore: (node: any, options?: any) => any
  getTokenAfter: (node: any, options?: any) => any
}

export interface Formatter {
  format: (code: string, options: FormattingConfig) => Promise<string>
}

export interface Processor {
  preprocess?: (text: string, filename: string) => string[] | Array<{ text: string, filename: string }>
  postprocess?: (messages: LintMessage[][], filename: string) => LintMessage[]
  supportsAutofix?: boolean
}

// Performance monitoring
export interface PerformanceMetrics {
  totalTime: number
  parseTime: number
  lintTime: number
  formatTime: number
  filesProcessed: number
  linesProcessed: number
  rulesExecuted: number
  cacheHits: number
  cacheMisses: number
}

// Cache interfaces
export interface CacheEntry {
  hash: string
  result: LintResult | FormatResult
  timestamp: number
  version: string
}

export interface Cache {
  get: (key: string) => CacheEntry | undefined
  set: (key: string, entry: CacheEntry) => void
  has: (key: string) => boolean
  clear: () => void
  size: () => number
}
