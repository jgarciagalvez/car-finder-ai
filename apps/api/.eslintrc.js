module.exports = {
  extends: ['../../.eslintrc.js'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    'no-console': 'off', // Allow console.log for server logging
  },
};
