import type { GlintConfig } from './types'
import { loadConfig } from 'bunfig'

export const defaultConfig: GlintConfig = {
  verbose: true,
}

// eslint-disable-next-line antfu/no-top-level-await
export const config: GlintConfig = await loadConfig({
  name: 'glint',
  defaultConfig,
})
