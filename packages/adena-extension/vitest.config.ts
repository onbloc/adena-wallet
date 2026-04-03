import {
  resolve,
} from 'path';
import {
  defineConfig,
} from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@types': resolve(__dirname, 'src/types'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@router': resolve(__dirname, 'src/router'),
      '@services': resolve(__dirname, 'src/services'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@components': resolve(__dirname, 'src/components'),
      '@states': resolve(__dirname, 'src/states'),
      '@common': resolve(__dirname, 'src/common'),
      '@inject': resolve(__dirname, 'src/inject'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@repositories': resolve(__dirname, 'src/repositories'),
      '@resources': resolve(__dirname, 'src/resources'),
      '@migrates': resolve(__dirname, 'src/migrates'),
      '@models': resolve(__dirname, 'src/models'),
      '@public': resolve(__dirname, 'public'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    testTimeout: 30_000,
    env: {
      SALT_KEY: 'The CosmJS salt.',
    },
  },
});
