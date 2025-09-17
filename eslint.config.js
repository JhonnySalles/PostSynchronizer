// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 1. Arquivos a serem ignorados (do seu antigo .eslintignore)
  {
    ignores: [
      'node_modules/',
      'android/',
      'ios/',
      'coverage/',
      'dist/',
      'build/',
      '*.config.js',
    ],
  },

  // 2. Configurações Globais (substitui 'extends')
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Configuração específica para React e React Native
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser, // Globais de ambiente de navegador
        ...globals.es2021,  // Globais do ES2021
        '__DEV__': 'readonly', // Global comum em React Native
      },
    },
    rules: {
      // Regras que vêm do 'extends'
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // Suas regras customizadas (do antigo 'rules')
      'prettier/prettier':  ['error',{
            'endOfLine': 'auto' // ou 'crlf' se você preferir o padrão Windows
        }],
      '@typescript-eslint/no-explicit-any': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      curly: ['error', 'all'],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // 4. Configuração do Prettier (DEVE SER A ÚLTIMA)
  // Desativa regras do ESLint que conflitam com o Prettier
  prettierConfig
);