#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { CAC } from 'cac'
import { version } from '../package.json'
import { config as defaultConfig, GlintEngine } from '../src'

const cli = new CAC('glint')

interface BaseOptions {
  config?: string
  verbose?: boolean
  parallel?: boolean
  cache?: boolean
  maxWorkers?: number
}

interface LintOptions extends BaseOptions {
  fix?: boolean
  format?: 'json' | 'stylish' | 'compact'
  outputFile?: string
}

interface FormatOptions extends BaseOptions {
  write?: boolean
  check?: boolean
}

interface CheckOptions extends BaseOptions {
  // No additional options for check
}

// Helper function to create engine with options
async function createEngine(options: BaseOptions) {
  const config = { ...defaultConfig }

  if (options.verbose !== undefined)
    config.verbose = options.verbose
  if (options.parallel !== undefined)
    config.parallel = options.parallel
  if (options.cache !== undefined)
    config.cacheEnabled = options.cache
  if (options.maxWorkers !== undefined)
    config.maxWorkers = options.maxWorkers

  return new GlintEngine(config)
}

// Lint command
cli
  .command('lint [patterns...]', 'Lint files')
  .option('--fix', 'Automatically fix problems')
  .option('--format <format>', 'Output format (json, stylish, compact)', { default: 'stylish' })
  .option('--output-file <file>', 'Write output to file')
  .option('--config <path>', 'Path to config file')
  .option('--verbose', 'Enable verbose logging')
  .option('--parallel', 'Enable parallel processing', { default: true })
  .option('--cache', 'Enable caching', { default: true })
  .option('--max-workers <number>', 'Maximum number of worker threads')
  .example('glint lint')
  .example('glint lint src/**/*.ts')
  .example('glint lint --fix --format json')
  .action(async (patterns: string[], options: LintOptions) => {
    try {
      const engine = await createEngine(options)
      const results = await engine.lintFiles(patterns.length > 0 ? patterns : undefined)

      // Format output
      let output: string
      switch (options.format) {
        case 'json':
          output = JSON.stringify(results, null, 2)
          break
        case 'compact':
          output = formatCompact(results)
          break
        case 'stylish':
        default:
          output = formatStylish(results)
          break
      }

      // Write to file or console
      if (options.outputFile) {
        await writeFile(resolve(options.outputFile), output, 'utf8')
        if (options.verbose) {
          console.log(`Output written to ${options.outputFile}`)
        }
      }
      else {
        console.log(output)
      }

      // Exit with error code if there are errors
      const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0)
      if (errorCount > 0) {
        process.exit(1)
      }
    }
    catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

// Format command
cli
  .command('format [patterns...]', 'Format files')
  .option('--write', 'Write formatted files to disk')
  .option('--check', 'Check if files are formatted (exit with code 1 if not)')
  .option('--config <path>', 'Path to config file')
  .option('--verbose', 'Enable verbose logging')
  .option('--parallel', 'Enable parallel processing', { default: true })
  .option('--cache', 'Enable caching', { default: true })
  .option('--max-workers <number>', 'Maximum number of worker threads')
  .example('glint format')
  .example('glint format --write')
  .example('glint format src/**/*.ts --check')
  .action(async (patterns: string[], options: FormatOptions) => {
    try {
      const engine = await createEngine(options)
      const results = await engine.formatFiles(
        patterns.length > 0 ? patterns : undefined,
        options.write,
      )

      const changedFiles = results.filter(r => r.changed)

      if (options.check) {
        if (changedFiles.length > 0) {
          console.log(`${changedFiles.length} files need formatting:`)
          for (const result of changedFiles) {
            console.log(`  ${result.filePath}`)
          }
          process.exit(1)
        }
        else {
          console.log('All files are properly formatted')
        }
      }
      else if (options.write) {
        console.log(`Formatted ${changedFiles.length} files`)
      }
      else {
        // Show diff or formatted content
        for (const result of changedFiles) {
          console.log(`\n--- ${result.filePath}`)
          console.log(result.formatted)
        }
      }
    }
    catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

// Check command (lint + format check)
cli
  .command('check [patterns...]', 'Check files (lint + format)')
  .option('--config <path>', 'Path to config file')
  .option('--verbose', 'Enable verbose logging')
  .option('--parallel', 'Enable parallel processing', { default: true })
  .option('--cache', 'Enable caching', { default: true })
  .option('--max-workers <number>', 'Maximum number of worker threads')
  .example('glint check')
  .example('glint check src/**/*.ts')
  .action(async (patterns: string[], options: CheckOptions) => {
    try {
      const engine = await createEngine(options)
      const { lintResults, formatResults } = await engine.lintAndFormat(
        patterns.length > 0 ? patterns : undefined,
      )

      // Check lint results
      const errorCount = lintResults.reduce((sum, r) => sum + r.errorCount, 0)
      const warningCount = lintResults.reduce((sum, r) => sum + r.warningCount, 0)

      // Check format results
      const unformattedFiles = formatResults.filter(r => r.changed)

      let hasIssues = false

      if (errorCount > 0 || warningCount > 0) {
        console.log(formatStylish(lintResults))
        hasIssues = true
      }

      if (unformattedFiles.length > 0) {
        console.log(`\n${unformattedFiles.length} files need formatting:`)
        for (const result of unformattedFiles) {
          console.log(`  ${result.filePath}`)
        }
        hasIssues = true
      }

      if (!hasIssues) {
        console.log('✅ All checks passed!')
      }

      if (errorCount > 0 || unformattedFiles.length > 0) {
        process.exit(1)
      }
    }
    catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

// Cache commands
cli
  .command('cache:clear', 'Clear the cache')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options: BaseOptions) => {
    try {
      const engine = await createEngine(options)
      engine.clearCache()
      console.log('Cache cleared')
    }
    catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

cli
  .command('cache:info', 'Show cache information')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options: BaseOptions) => {
    try {
      const engine = await createEngine(options)
      const stats = engine.getCacheStats()
      console.log(`Cache size: ${stats.size} entries`)
    }
    catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

// Plugin commands
cli
  .command('plugins:list', 'List loaded plugins')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options: BaseOptions) => {
    try {
      const engine = await createEngine(options)
      const plugins = engine.getLoadedPlugins()

      if (plugins.length === 0) {
        console.log('No plugins loaded')
        return
      }

      console.log('Loaded plugins:')
      for (const plugin of plugins) {
        console.log(`  ${plugin.name} v${plugin.version}`)
        console.log(`    Languages: ${plugin.languages.join(', ')}`)
        if (plugin.rules) {
          console.log(`    Rules: ${Object.keys(plugin.rules).length}`)
        }
        if (plugin.formatters) {
          console.log(`    Formatters: ${Object.keys(plugin.formatters).length}`)
        }
        if (plugin.processors) {
          console.log(`    Processors: ${Object.keys(plugin.processors).length}`)
        }
      }
    }
    catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  })

// Version command
cli
  .command('version', 'Show version')
  .action(() => {
    console.log(version)
  })

// Output formatters
function formatStylish(results: any[]): string {
  let output = ''
  let totalErrors = 0
  let totalWarnings = 0

  for (const result of results) {
    if (result.messages.length > 0) {
      output += `\n${result.filePath}\n`

      for (const message of result.messages) {
        const symbol = message.severity === 2 ? '✖' : '⚠'
        output += `  ${message.line}:${message.column}  ${symbol}  ${message.message}`
        if (message.ruleId) {
          output += `  ${message.ruleId}`
        }
        output += '\n'
      }
    }

    totalErrors += result.errorCount
    totalWarnings += result.warningCount
  }

  if (totalErrors > 0 || totalWarnings > 0) {
    output += `\n${totalErrors + totalWarnings} problems (${totalErrors} errors, ${totalWarnings} warnings)\n`
  }

  return output
}

function formatCompact(results: any[]): string {
  let output = ''

  for (const result of results) {
    for (const message of result.messages) {
      const severity = message.severity === 2 ? 'Error' : 'Warning'
      output += `${result.filePath}: line ${message.line}, col ${message.column}, ${severity} - ${message.message}`
      if (message.ruleId) {
        output += ` (${message.ruleId})`
      }
      output += '\n'
    }
  }

  return output
}

// Global options
cli.option('--help', 'Show help')
cli.version(version)
cli.help()

// Parse CLI arguments
cli.parse()
