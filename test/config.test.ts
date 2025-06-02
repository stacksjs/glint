import type { GlintConfig } from '../src/types'
import { describe, expect, test } from 'bun:test'
import { config as defaultConfig } from '../src/config'

describe('Config Module', () => {
  test('default config is exported', () => {
    expect(defaultConfig).toBeDefined()
    expect(typeof defaultConfig).toBe('object')
  })

  test('default config has performance settings', () => {
    expect(defaultConfig.parallel).toBe(true)
    expect(defaultConfig.cacheEnabled).toBe(true)
    expect(typeof defaultConfig.maxWorkers).toBe('number')
    expect(defaultConfig.maxWorkers).toBeGreaterThan(0)
  })

  test('default config has file processing settings', () => {
    expect(Array.isArray(defaultConfig.include)).toBe(true)
    expect(Array.isArray(defaultConfig.exclude)).toBe(true)
    expect(Array.isArray(defaultConfig.extensions)).toBe(true)

    expect(defaultConfig.include.length).toBeGreaterThan(0)
    expect(defaultConfig.exclude.length).toBeGreaterThan(0)
    expect(defaultConfig.extensions.length).toBeGreaterThan(0)
  })

  test('default config includes expected file patterns', () => {
    expect(defaultConfig.include).toContain('**/*.{html,css,js,ts,jsx,tsx,vue,svelte}')
    expect(defaultConfig.exclude).toContain('**/node_modules/**')
    expect(defaultConfig.exclude).toContain('**/dist/**')
  })

  test('default config includes expected extensions', () => {
    expect(defaultConfig.extensions).toContain('html')
    expect(defaultConfig.extensions).toContain('css')
    expect(defaultConfig.extensions).toContain('js')
    expect(defaultConfig.extensions).toContain('ts')
    expect(defaultConfig.extensions).toContain('jsx')
    expect(defaultConfig.extensions).toContain('tsx')
  })

  test('default config has language configurations', () => {
    expect(defaultConfig.html).toBeDefined()
    expect(defaultConfig.css).toBeDefined()
    expect(defaultConfig.javascript).toBeDefined()
    expect(defaultConfig.typescript).toBeDefined()

    expect(defaultConfig.html.enabled).toBe(true)
    expect(defaultConfig.css.enabled).toBe(true)
    expect(defaultConfig.javascript.enabled).toBe(true)
    expect(defaultConfig.typescript.enabled).toBe(true)
  })

  test('default config has HTML rules', () => {
    expect(typeof defaultConfig.html.rules).toBe('object')
    expect(defaultConfig.html.rules['no-duplicate-attributes']).toBeDefined()
    expect(defaultConfig.html.rules['require-alt']).toBeDefined()
  })

  test('default config has CSS rules', () => {
    expect(typeof defaultConfig.css.rules).toBe('object')
    expect(defaultConfig.css.rules['no-duplicate-properties']).toBeDefined()
    expect(defaultConfig.css.rules['no-empty-rules']).toBeDefined()
  })

  test('default config has JavaScript rules', () => {
    expect(typeof defaultConfig.javascript.rules).toBe('object')
    expect(defaultConfig.javascript.rules['no-unused-vars']).toBeDefined()
    expect(defaultConfig.javascript.rules['prefer-const']).toBeDefined()
    expect(defaultConfig.javascript.rules['no-var']).toBeDefined()
  })

  test('default config has TypeScript rules', () => {
    expect(typeof defaultConfig.typescript.rules).toBe('object')
    expect(defaultConfig.typescript.rules['no-explicit-any']).toBeDefined()
    expect(defaultConfig.typescript.rules['prefer-interface']).toBeDefined()
  })

  test('default config has formatting options', () => {
    expect(defaultConfig.formatting).toBeDefined()
    expect(typeof defaultConfig.formatting.indentSize).toBe('number')
    expect(defaultConfig.formatting.indentType).toBe('spaces')
    expect(typeof defaultConfig.formatting.lineWidth).toBe('number')
    expect(defaultConfig.formatting.endOfLine).toBeDefined()
  })

  test('default config has linting options', () => {
    expect(defaultConfig.linting).toBeDefined()
    expect(defaultConfig.linting.enabled).toBe(true)
    expect(typeof defaultConfig.linting.reportUnusedDisableDirectives).toBe('boolean')
    expect(typeof defaultConfig.linting.noInlineConfig).toBe('boolean')
  })

  test('default config has plugin system enabled', () => {
    expect(Array.isArray(defaultConfig.plugins)).toBe(true)
  })

  test('default config has cache directory', () => {
    expect(typeof defaultConfig.cacheDir).toBe('string')
    expect(defaultConfig.cacheDir).toBe('.glint-cache')
  })

  test('default config formatter settings are consistent', () => {
    const htmlFormatter = defaultConfig.html.formatter
    const cssFormatter = defaultConfig.css.formatter
    const jsFormatter = defaultConfig.javascript.formatter
    const tsFormatter = defaultConfig.typescript.formatter

    expect(htmlFormatter.indentSize).toBe(2)
    expect(cssFormatter.indentSize).toBe(2)
    expect(jsFormatter.indentSize).toBe(2)
    expect(tsFormatter.indentSize).toBe(2)

    expect(htmlFormatter.indentType).toBe('spaces')
    expect(cssFormatter.indentType).toBe('spaces')
    expect(jsFormatter.indentType).toBe('spaces')
    expect(tsFormatter.indentType).toBe('spaces')
  })

  test('config satisfies GlintConfig type', () => {
    const config: GlintConfig = defaultConfig
    expect(config).toBeDefined()
  })
})
