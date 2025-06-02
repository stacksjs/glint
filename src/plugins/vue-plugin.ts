import type { Plugin } from '../types'

/**
 * Vue Plugin for Glint
 * Provides Vue-specific linting rules
 */
export const vuePlugin: Plugin = {
  name: '@glint/plugin-vue',
  version: '1.0.0',
  languages: ['javascript', 'typescript'],

  rules: {
    'require-v-for-key': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require key directive for v-for elements',
          category: 'Vue',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        VForExpression: (node: any) => {
          const hasKey = node.key || node.directive?.key
          if (!hasKey) {
            context.report({
              node,
              message: 'Missing key directive in v-for',
            })
          }
        },
      }),
    },

    'no-unused-vars-in-template': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow unused variables in Vue templates',
          category: 'Vue',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        VElement: (node: any) => {
          // Simplified unused variable detection for Vue templates
          const sourceCode = context.getSourceCode()
          if (node.variables) {
            for (const variable of node.variables) {
              if (!sourceCode.text.includes(variable.name)) {
                context.report({
                  node: variable,
                  message: `Unused variable in template: ${variable.name}`,
                })
              }
            }
          }
        },
      }),
    },

    'prefer-composition-api': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer Composition API over Options API',
          category: 'Vue',
          recommended: false,
        },
        schema: [],
      },
      create: context => ({
        ObjectExpression: (node: any) => {
          // Check if this is a Vue component options object
          const hasOptionsApi = node.properties?.some((prop: any) =>
            ['data', 'methods', 'computed', 'watch'].includes(prop.key?.name),
          )

          if (hasOptionsApi) {
            context.report({
              node,
              message: 'Consider using Composition API instead of Options API',
            })
          }
        },
      }),
    },
  },

  formatters: {
    html: {
      format: async (code: string, _options: any) => {
        // Basic Vue template formatting
        return code
          .replace(/\s+>/g, '>')
          .replace(/>\s+</g, '><')
          .replace(/v-/g, '\n  v-')
      },
    },
    css: {
      format: async (code: string, _options: any) => code,
    },
    javascript: {
      format: async (code: string, _options: any) => {
        // Basic Vue script formatting
        return code.replace(/export\s+default\s+\{/, 'export default {')
      },
    },
    typescript: {
      format: async (code: string, _options: any) => {
        // Basic Vue TypeScript formatting
        return code.replace(/export\s+default\s+defineComponent\s*\(/, 'export default defineComponent(')
      },
    },
  },

  processors: {
    '.vue': {
      preprocess: (text: string, _filename: string) => {
        // Extract script and template sections from .vue files
        const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/)
        const templateMatch = text.match(/<template[^>]*>([\s\S]*?)<\/template>/)

        const parts = []
        if (scriptMatch)
          parts.push(scriptMatch[1])
        if (templateMatch)
          parts.push(templateMatch[1])

        return parts.length > 0 ? parts : [text]
      },
      postprocess: (messages: any[], _filename: string) => {
        // Combine messages from all parts
        return messages.flat()
      },
      supportsAutofix: true,
    },
  },
}

export default vuePlugin
