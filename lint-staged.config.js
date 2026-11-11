const path = require('path');

const quote = (files) => files.map((f) => `"${f}"`).join(' ');

/**
 * Configuración monorepo para lint-staged.
 * Enruta cada workspace a su propio ESLint / tsconfigRootDir para evitar
 * que ESLint busque un tsconfig.json inexistente en la raíz.
 */
module.exports = {
  'apps/admin/**/*.{ts,tsx}': (files) => [
    `pnpm --dir "${path.join(__dirname, 'apps/admin')}" exec eslint --fix ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  'apps/api/**/*.ts': (files) => [
    `pnpm --dir "${path.join(__dirname, 'apps/api')}" exec eslint --fix ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  'packages/core/**/*.ts': (files) => [
    `pnpm --dir "${path.join(__dirname, 'packages/core')}" exec eslint --fix ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  'packages/shared/**/*.ts': (files) => [
    `pnpm --dir "${path.join(__dirname, 'packages/shared')}" exec eslint --fix ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  'packages/database/**/*.ts': (files) => [
    `pnpm --dir "${path.join(__dirname, 'packages/database')}" exec eslint --fix ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  '*.{json,md}': (files) => `prettier --write ${quote(files)}`,
};
