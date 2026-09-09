import globals from 'globals';

export default [
  {
    files: ['module/**/*.mjs', 'test/**/*.mjs', 'build-*.mjs', 'src/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Foundry VTT globals, none of which are declared by the system itself.
        foundry: 'readonly',
        game: 'readonly',
        ui: 'readonly',
        canvas: 'readonly',
        CONFIG: 'readonly',
        CONST: 'readonly',
        Hooks: 'readonly',
        Roll: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        ChatMessage: 'readonly',
        Combat: 'readonly',
        Combatant: 'readonly',
        ActiveEffect: 'readonly',
        Handlebars: 'readonly',
        Macro: 'readonly',
        Folder: 'readonly',
        getDocumentClass: 'readonly',
        fromUuid: 'readonly',
        fromUuidSync: 'readonly',
        renderTemplate: 'readonly',
        loadTemplates: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-console': 'off',
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
];
