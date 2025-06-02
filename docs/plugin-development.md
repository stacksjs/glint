# Plugin Development Guide

Glint provides a comprehensive plugin system that allows you to extend its functionality with custom linting rules, formatters, and file processors. This guide will walk you through creating your own plugins.

## Plugin Architecture

A Glint plugin consists of three main components:

1. **Rules**: Custom linting rules that analyze AST nodes
2. **Formatters**: Code formatting logic for specific languages
3. **Processors**: File preprocessing and postprocessing logic

## Basic Plugin Structure

```typescript
import type { Plugin } from '@stacksjs/glint'

export const myPlugin: Plugin = {
  name: '@my-org/my-plugin',
  version: '1.0.0',
  languages: ['javascript', 'typescript'],

  rules: {
    // Custom rules
  },

  formatters: {
    // Custom formatters for each language
  },

  processors: {
    // File processors for custom extensions
  },
}
```

## Creating Custom Rules

Rules are the core of linting functionality. Each rule analyzes AST nodes and reports issues.

### Rule Structure

```typescript
const myRule: Rule = {
  meta: {
    type: 'problem', // 'problem', 'suggestion', or 'layout'
    docs: {
      description: 'Rule description',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code', // 'code', 'whitespace', or undefined
    schema: [], // JSON schema for rule options
  },
  create: (context) => {
    return {
      // AST node visitors
      VariableDeclaration: (node) => {
        // Rule logic here
        context.report({
          node,
          message: 'Issue description',
          fix: (fixer) => {
            // Auto-fix logic
            return fixer.replaceText(node, 'fixed code')
          },
        })
      },
    }
  },
}
```

### Example: No TODO Comments Rule

```typescript
'no-todo-comments': {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow TODO comments',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => ({
    Program: () => {
      const sourceCode = context.getSourceCode()
      const comments = sourceCode.getAllComments()

      for (const comment of comments) {
        if (comment.value.includes('TODO')) {
          context.report({
            node: comment,
            message: 'TODO comments should be resolved',
            fix: (fixer) => fixer.remove(comment),
          })
        }
      }
    },
  }),
}
```

## Creating Custom Formatters

Formatters transform code to enforce consistent styling.

### Formatter Structure

```typescript
const myFormatter: Formatter = {
  format: async (code: string, options: any) => {
    // Formatting logic
    let formatted = code

    // Apply transformations
    formatted = formatted.replace(/oldPattern/g, 'newPattern')

    return formatted
  },
}
```

### Example: Semicolon Formatter

```typescript
javascript: {
  format: async (code: string, options: any) => {
    let formatted = code

    // Add semicolons if enabled
    if (options?.semicolons !== false) {
      formatted = formatted.replace(/\n(\s*)(\w)/g, ';\n$1$2')
    }

    // Fix spacing around operators
    formatted = formatted.replace(/([^=!<>])=([^=])/g, '$1 = $2')

    return formatted
  },
}
```

## Creating File Processors

Processors handle special file types that need preprocessing.

### Processor Structure

```typescript
const myProcessor: Processor = {
  preprocess: (text: string, filename: string) => {
    // Extract code from custom file format
    const match = text.match(/<script>([\s\S]*?)<\/script>/)
    return match ? [match[1]] : [text]
  },

  postprocess: (messages: LintMessage[][], filename: string) => {
    // Transform or filter messages
    return messages.flat()
  },

  supportsAutofix: true,
}
```

### Example: Vue File Processor

```typescript
'.vue': {
  preprocess: (text: string, filename: string) => {
    // Extract script and template sections
    const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    const templateMatch = text.match(/<template[^>]*>([\s\S]*?)<\/template>/)

    const parts = []
    if (scriptMatch) parts.push(scriptMatch[1])
    if (templateMatch) parts.push(templateMatch[1])

    return parts.length > 0 ? parts : [text]
  },

  postprocess: (messages: LintMessage[][], filename: string) => {
    return messages.flat()
  },

  supportsAutofix: true,
}
```

## Complete Plugin Example

Here's a complete plugin that demonstrates all features:

```typescript
import type { Plugin } from '@stacksjs/glint'

export const customPlugin: Plugin = {
  name: '@my-org/custom-plugin',
  version: '1.0.0',
  languages: ['javascript', 'typescript'],

  rules: {
    'enforce-naming-convention': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Enforce naming conventions',
          category: 'Style',
          recommended: false,
        },
        fixable: 'code',
        schema: [{
          type: 'object',
          properties: {
            functions: { type: 'string', enum: ['camelCase', 'snake_case'] },
            constants: { type: 'string', enum: ['UPPER_CASE', 'camelCase'] },
          },
        }],
      },
      create: (context) => {
        const options = context.options[0] || {}

        return {
          FunctionDeclaration: (node) => {
            const name = node.id?.name
            if (name && options.functions === 'snake_case') {
              const snakeCase = name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
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
      format: async (code: string, options: any) => code,
    },
    css: {
      format: async (code: string, options: any) => code,
    },
    javascript: {
      format: async (code: string, options: any) => {
        let formatted = code

        // Custom spacing rules
        formatted = formatted.replace(/([^=!<>])=([^=])/g, '$1 = $2')

        return formatted
      },
    },
    typescript: {
      format: async (code: string, options: any) => {
        // Use JavaScript formatter as base
        const jsFormatted = await customPlugin.formatters!.javascript.format(code, options)

        // Add TypeScript-specific formatting
        return jsFormatted.replace(/:\s*([A-Z])/gi, ': $1')
      },
    },
  },

  processors: {
    '.custom': {
      preprocess: (text: string, filename: string) => {
        const jsMatch = text.match(/<script>([\s\S]*?)<\/script>/)
        return jsMatch ? [jsMatch[1]] : [text]
      },
      postprocess: (messages: any[], filename: string) => {
        return messages.flat().map(message => ({
          ...message,
          message: `[Custom] ${message.message}`,
        }))
      },
      supportsAutofix: true,
    },
  },
}
```

## Loading and Using Plugins

### Programmatic Loading

```typescript
import { GlintEngine } from '@stacksjs/glint'
import { customPlugin } from './my-plugin'

const engine = new GlintEngine(config)
engine.loadPlugin(customPlugin)
```

### Configuration-based Loading

```typescript
// glint.config.ts
export default {
  plugins: [
    {
      name: '@my-org/custom-plugin',
      enabled: true,
      options: {
        'enforce-naming-convention': {
          functions: 'camelCase',
          constants: 'UPPER_CASE',
        },
      },
    },
  ],

  javascript: {
    rules: {
      '@my-org/custom-plugin/enforce-naming-convention': 'warn',
    },
  },
}
```

## Built-in Plugins

Glint includes several built-in plugins:

### React Plugin (@glint/plugin-react)

- **jsx-uses-react**: Require React import when using JSX
- **jsx-key**: Require key prop for elements in arrays
- **no-unused-state**: Disallow unused state variables
- **prefer-function-component**: Prefer function components over class components

### Vue Plugin (@glint/plugin-vue)

- **require-v-for-key**: Require key directive for v-for elements
- **no-unused-vars-in-template**: Disallow unused variables in templates
- **prefer-composition-api**: Prefer Composition API over Options API

## Best Practices

1. **Rule Naming**: Use descriptive names with your plugin prefix
2. **Performance**: Keep rule logic lightweight and efficient
3. **Documentation**: Provide clear descriptions and examples
4. **Testing**: Test rules with various code patterns
5. **Compatibility**: Ensure rules work across language versions
6. **Auto-fixing**: Provide safe auto-fixes when possible

## Rule Context API

The rule context provides several utilities:

```typescript
context.getSourceCode() // Get source code object
context.getFilename() // Get current filename
context.getCwd() // Get current working directory
context.report({ // Report an issue
  node,
  message,
  fix,
  suggest,
})
```

## Source Code API

The source code object provides text analysis utilities:

```typescript
sourceCode.getText(node) // Get text for node
sourceCode.getTokens(node) // Get tokens for node
sourceCode.getAllComments() // Get all comments
sourceCode.getComments(node) // Get comments for node
```

## Testing Plugins

Create test files to verify your plugin behavior:

```typescript
import { GlintEngine } from '@stacksjs/glint'
import { customPlugin } from '../src/custom-plugin'

test('custom rule works correctly', async () => {
  const engine = new GlintEngine({
    javascript: {
      rules: {
        '@my-org/custom-plugin/my-rule': 'error',
      },
    },
  })

  engine.loadPlugin(customPlugin)

  const results = await engine.lintFiles(['test-file.js'])
  expect(results[0].errorCount).toBe(1)
})
```

## Publishing Plugins

1. Create npm package with plugin code
2. Export plugin as default or named export
3. Include TypeScript declarations
4. Document usage and configuration options
5. Publish to npm registry

This plugin system allows you to extend Glint's capabilities for any codebase requirements, making it a truly flexible and extensible linting and formatting tool.
