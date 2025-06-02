import type { Formatter, Plugin, Rule } from '../types'

/**
 * React Plugin for Glint
 * Provides React-specific linting rules and formatting
 */
export const reactPlugin: Plugin = {
  name: '@glint/plugin-react',
  version: '1.0.0',
  languages: ['javascript', 'typescript'],

  rules: {
    'jsx-uses-react': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require React import when using JSX',
          category: 'React',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        JSXElement: (node: any) => {
          const sourceCode = context.getSourceCode()
          const hasReactImport = sourceCode.text.includes('import React')
            || sourceCode.text.includes('import * as React')

          if (!hasReactImport) {
            context.report({
              node,
              message: 'JSX used without importing React',
            })
          }
        },
      }),
    },

    'jsx-key': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require key prop for elements in array',
          category: 'React',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        JSXElement: (node: any) => {
          // Check if element is in an array context
          if (this.isInArrayContext(node)) {
            const hasKeyProp = node.openingElement?.attributes?.some(
              (attr: any) => attr.name?.name === 'key',
            )

            if (!hasKeyProp) {
              context.report({
                node,
                message: 'Missing key prop for element in array',
              })
            }
          }
        },
      }),
    },

    'no-unused-state': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow unused state variables',
          category: 'React',
          recommended: true,
        },
        schema: [],
      },
      create: context => ({
        CallExpression: (node: any) => {
          if (node.callee?.name === 'useState') {
            const sourceCode = context.getSourceCode()
            const [stateVar] = node.parent?.id?.elements || []

            if (stateVar && !this.isVariableUsed(stateVar.name, sourceCode)) {
              context.report({
                node: stateVar,
                message: `Unused state variable: ${stateVar.name}`,
              })
            }
          }
        },
      }),
    },

    'prefer-function-component': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer function components over class components',
          category: 'React',
          recommended: false,
        },
        fixable: 'code',
        schema: [],
      },
      create: context => ({
        ClassDeclaration: (node: any) => {
          const isReactComponent = node.superClass?.object?.name === 'React'
            && node.superClass?.property?.name === 'Component'

          if (isReactComponent) {
            context.report({
              node,
              message: 'Prefer function components over class components',
              fix: (fixer) => {
                // Simplified conversion - real implementation would be more complex
                const componentName = node.id.name
                const newCode = `function ${componentName}(props) {\n  return null;\n}`
                return fixer.replaceText(node, newCode)
              },
            })
          }
        },
      }),
    },
  },

  formatters: {
    html: {
      format: async (code: string, _options: any) => code, // No HTML formatting for React
    },
    css: {
      format: async (code: string, _options: any) => code, // No CSS formatting for React
    },
    javascript: {
      format: async (code: string, options: any) => {
        // React-specific JavaScript formatting
        let formatted = code

        // Format JSX props on separate lines if they exceed line width
        formatted = formatJSXProps(formatted, options?.lineWidth || 80)

        // Format React hooks consistently
        formatted = formatReactHooks(formatted)

        // Sort React imports
        formatted = sortReactImports(formatted)

        return formatted
      },
    },

    typescript: {
      format: async (code: string, options: any) => {
        // React-specific TypeScript formatting
        let formatted = code

        // Format JSX props with TypeScript types
        formatted = _formatJSXPropsWithTypes(formatted, options?.lineWidth || 80)

        // Format React component interfaces
        formatted = _formatReactInterfaces(formatted)

        return formatted
      },
    },
  },

  processors: {
    '.jsx': {
      preprocess: (text: string, _filename: string) => {
        // Preprocess JSX files
        return [text]
      },
      postprocess: (messages: any[], _filename: string) => {
        // Filter out certain messages for JSX files
        return messages.flat()
      },
      supportsAutofix: true,
    },

    '.tsx': {
      preprocess: (text: string, _filename: string) => {
        // Preprocess TSX files
        return [text]
      },
      postprocess: (messages: any[], _filename: string) => {
        // Filter out certain messages for TSX files
        return messages.flat()
      },
      supportsAutofix: true,
    },
  },
}

// Helper functions (these would be methods on the plugin in a real implementation)
function isInArrayContext(node: any): boolean {
  // Simplified check - real implementation would traverse parent nodes
  return node.parent?.type === 'ArrayExpression'
}

function isVariableUsed(name: string, sourceCode: any): boolean {
  // Simplified usage detection
  return sourceCode.text.includes(name)
}

function formatJSXProps(code: string, lineWidth: number): string {
  // Simplified JSX prop formatting
  return code.replace(
    /<([A-Z][a-zA-Z0-9]*)\s+([^>]+)>/g,
    (match, tagName, props) => {
      if (match.length > lineWidth) {
        const formattedProps = props.split(' ').join('\n  ')
        return `<${tagName}\n  ${formattedProps}\n>`
      }
      return match
    },
  )
}

function formatReactHooks(code: string): string {
  // Format React hooks consistently
  return code.replace(
    /const\s+\[([^,]+),\s*([^\]]+)\]\s*=\s*useState\(([^)]*)\)/g,
    'const [$1, $2] = useState($3)',
  )
}

function sortReactImports(code: string): string {
  // Simplified React import sorting
  const lines = code.split('\n')
  const imports: string[] = []
  const otherLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('import') && line.includes('react')) {
      imports.push(line)
    }
    else {
      otherLines.push(line)
    }
  }

  imports.sort()
  return [...imports, ...otherLines].join('\n')
}

function formatJSXPropsWithTypes(code: string, lineWidth: number): string {
  // TypeScript-specific JSX formatting
  return formatJSXProps(code, lineWidth)
}

function formatReactInterfaces(code: string): string {
  // Format React component interfaces
  return code.replace(
    /interface\s+([A-Z][a-zA-Z0-9]*)Props\s*\{([^}]*)\}/g,
    (match, componentName, props) => {
      const formattedProps = props.trim().split(';').map((prop: string) =>
        prop.trim()).filter(Boolean).join(';\n  ')
      return `interface ${componentName}Props {\n  ${formattedProps};\n}`
    },
  )
}

export default reactPlugin
