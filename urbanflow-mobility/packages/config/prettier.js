/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  semi: true,
  plugins: ['prettier-plugin-tailwindcss'],
};

module.exports = config;
