import { describe, expect, test } from 'bun:test'
import { defaultConfig, GlintEngine } from '../src'

// Import all test suites
import './types.test'
import './config.test'
import './cache.test'
import './file-processor.test'
import './linter.test'
import './formatter.test'
import './plugin-manager.test'
import './engine.test'
import './plugins/react-plugin.test'
import './plugins/vue-plugin.test'

describe('Glint Main API', () => {
  test('exports all required components', () => {
    expect(GlintEngine).toBeDefined()
    expect(defaultConfig).toBeDefined()
  })

  test('can create GlintEngine instance', () => {
    const engine = new GlintEngine(defaultConfig)
    expect(engine).toBeInstanceOf(GlintEngine)
  })

  test('engine has required methods', () => {
    const engine = new GlintEngine(defaultConfig)

    expect(typeof engine.lintFiles).toBe('function')
    expect(typeof engine.formatFiles).toBe('function')
    expect(typeof engine.lintAndFormat).toBe('function')
    expect(typeof engine.checkFiles).toBe('function')
    expect(typeof engine.loadPlugin).toBe('function')
    expect(typeof engine.getMetrics).toBe('function')
    expect(typeof engine.clearCache).toBe('function')
  })
})
