module.exports = {
  extends: ['next/core-web-vitals'],
  env: {
    jest: true,
    browser: true
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }]
  }
};
