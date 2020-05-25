module.exports = {
  extends: '../.eslintrc.js',
  globals: {
    $: true,
  },
  env: {
    jest: true,
  },
  rules: {
    'global-require': 0,
    'prefer-arrow-callback': 0,
  },
};
