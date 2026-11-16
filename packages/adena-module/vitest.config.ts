import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    env: {
      SIGNER_PREFIX: 'g',
      SALT_KEY: 'TESTTESTTESTTEST',
    },
  },
});
