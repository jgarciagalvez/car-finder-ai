module.exports = {
  extends: ['../../.eslintrc.js'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    'no-console': 'error', // No console.log in types package
  },
};
