import type { Plugin } from '../src/types'

/**
 * Example Custom Plugin for Glint
 * This demonstrates how to create custom rules and formatters
 */
export const customPlugin: Plugin = {
  name: '@my-org/custom-glint-plugin',
  version: '1.0.0',
  languages: ['javascript', 'typescript'],

  rules: {
    // Custom rule: enforce TODO comment format
    'todo-format': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Enforce consistent TODO comment format',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
      },
      create: context => ({
        Program: () => {
          const sourceCode = context.getSourceCode()
          const comments = sourceCode.getAllComments()

          for (const comment of comments) {
            const text = comment.value.trim()
            if (text.startsWith('TODO') && !text.match(/^TODO\([^)]+\):/)) {
              context.report({
                node: comment,
                message: 'TODO comments should follow format: TODO(author): description',
                fix: (fixer) => {
                  const newText = text.replace(/^TODO\s*:?\s*/, 'TODO(author): ')
                  return fixer.replaceText(comment, `// ${newText}`)
                },
              })
            }
          }
        },
      }),
    },

    // Custom rule: disallow specific function names
    'no-forbidden-functions': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow specific function names',
          category: 'Best Practices',
          recommended: false,
        },
        schema: [{
          type: 'object',
          properties: {
            forbidden: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        }],
      },
      create: (context) => {
        const options = context.options[0] || {}
        const forbidden = options.forbidden || ['eval', 'alert']

        return {
          CallExpression: (node: any) => {
            const functionName = node.callee?.name
            if (functionName && forbidden.includes(functionName)) {
              context.report({
                node,
                message: `Function '${functionName}' is forbidden`,
              })
            }
          },
        }
      },
    },

    // Custom rule: enforce custom naming conventions
    'custom-naming': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Enforce custom naming conventions',
          category: 'Style',
          recommended: false,
        },
        fixable: 'code',
        schema: [{
          type: 'object',
          properties: {
            constants: { type: 'string', enum: ['UPPER_CASE', 'camelCase'] },
            functions: { type: 'string', enum: ['camelCase', 'snake_case'] },
          },
        }],
      },
      create: (context) => {
        const options = context.options[0] || {}

        return {
          VariableDeclarator: (node: any) => {
            if (node.id?.name && node.init?.type === 'Literal') {
              // Check constant naming
              const name = node.id.name
              if (options.constants === 'UPPER_CASE' && name !== name.toUpperCase()) {
                context.report({
                  node: node.id,
                  message: `Constant '${name}' should be in UPPER_CASE`,
                  fix: fixer => fixer.replaceText(node.id, name.toUpperCase()),
                })
              }
            }
          },

          FunctionDeclaration: (node: any) => {
            const name = node.id?.name
            if (name && options.functions === 'snake_case') {
              const snakeCase = name.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`)
              if (name !== snakeCase) {
                context.report({
                  node: node.id,
                  message: `Function '${name}' should be in snake_case`,
                  fix: fixer => fixer.replaceText(node.id, snakeCase),
                })
              }
            }
          },
        }
      },
    },
  },

  formatters: {
    html: {
      format: async (code: string, _options: any) => code, // No HTML formatting
    },
    css: {
      format: async (code: string, _options: any) => code, // No CSS formatting
    },
    javascript: {
      format: async (code: string, options: any) => {
        // Custom JavaScript formatting rules
        let formatted = code

        // Add custom spacing around operators
        formatted = formatted.replace(/([^=!<>])=([^=])/g, '$1 = $2')

        // Enforce semicolons if enabled
        if (options?.semicolons !== false) {
          formatted = formatted.replace(/\n(\s*)(\w)/g, ';\n$1$2')
        }

        // Custom indentation for object literals
        formatted = formatted.replace(/\{([^}]+)\}/g, (match, content) => {
          const props = content.split(',').map(prop => prop.trim())
          if (props.length > 1) {
            const indent = '  '
            return `{\n${props.map(prop => `${indent}${prop}`).join(',\n')}\n}`
          }
          return match
        })

        return formatted
      },
    },

    typescript: {
      format: async (code: string, options: any) => {
        // Use JavaScript formatter as base
        const jsFormatted = await customPlugin.formatters!.javascript.format(code, options)

        // Add TypeScript-specific formatting
        let formatted = jsFormatted

        // Format type annotations
        formatted = formatted.replace(/:\s*([A-Z])/gi, ': $1')

        // Format interface declarations
        formatted = formatted.replace(/interface\s+([A-Z][a-zA-Z0-9]*)\s*\{/g, 'interface $1 {')

        return formatted
      },
    },
  },

  processors: {
    '.custom': {
      preprocess: (text: string, _filename: string) => {
        // Custom file type processing
        // For example, extract JavaScript from custom template files
        const jsMatch = text.match(/<script>([\s\S]*?)<\/script>/)
        return jsMatch ? [jsMatch[1]] : [text]
      },

      postprocess: (messages: any[], _filename: string) => {
        // Filter or transform messages for custom files
        return messages.flat().map(message => ({
          ...message,
          message: `[Custom] ${message.message}`,
        }))
      },

      supportsAutofix: true,
    },
  },
}

// Usage example:
/*
import { GlintEngine } from '@stacksjs/glint'
import { customPlugin } from './custom-plugin'

const engine = new GlintEngine({
  // ... your config
})

// Load the custom plugin
engine.loadPlugin(customPlugin)

// Or configure it in glint.config.ts:
export default {
  plugins: [
    {
      name: '@my-org/custom-glint-plugin',
      enabled: true,
      options: {
        'no-forbidden-functions': {
          forbidden: ['eval', 'alert', 'document.write'],
        },
        'custom-naming': {
          constants: 'UPPER_CASE',
          functions: 'camelCase',
        },
      },
    },
  ],

  // Configure rules
  javascript: {
    rules: {
      '@my-org/custom-glint-plugin/todo-format': 'warn',
      '@my-org/custom-glint-plugin/no-forbidden-functions': 'error',
      '@my-org/custom-glint-plugin/custom-naming': 'warn',
    },
  },
}
*/

export default customPlugin
