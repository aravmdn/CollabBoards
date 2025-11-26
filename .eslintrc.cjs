module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.tsx'],
      },
    },
  },
  overrides: [
    {
      files: ['backend/**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
        'prettier',
      ],
    },
    {
      files: ['frontend/**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'react-hooks'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'plugin:import/typescript',
        'prettier',
      ],
    },
  ],
};


