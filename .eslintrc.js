module.exports = {
    root: true,
    env: {
      'es2021': true,
      'react-native/react-native': true,
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react-hooks/recommended',
      // Prettier deve ser o último para sobrescrever outras configurações
      'prettier', 
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: [
      'react',
      'react-native',
      '@typescript-eslint',
      'prettier' // Roda o Prettier como uma regra do ESLint
    ],
    rules: {
      // Adiciona a regra do Prettier
      'prettier/prettier': 'error',
  
      // Regras opcionais que podem ser úteis
      'react/react-in-jsx-scope': 'off', // Não é necessário com o novo JSX Transform do React 17+
      'react/prop-types': 'off', // Desativado pois usamos TypeScript para tipagem de props
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Permite não tipar o retorno de todas as funções
    },
    settings: {
      react: {
        version: 'detect', // Detecta automaticamente a versão do React
      },
    },
  };