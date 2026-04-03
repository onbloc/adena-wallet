import {
  crx,
} from '@crxjs/vite-plugin';
import nodePolyfills from '@rolldown/plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import {
  resolve,
} from 'path';
import {
  defineConfig,
} from 'vite';

import manifest from './public/manifest.json';

const isStorybook = process.argv[1]?.includes('storybook');

export default defineConfig({
  plugins: [
    react(),
    !isStorybook && crx({
      manifest,
    }),
    nodePolyfills(),
  ],
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
      'lottie-web': 'lottie-web/build/player/lottie_light.js',
    },
  },
  build: {
    sourcemap: true,
    target: 'chrome100',
    rolldownOptions: {
      input: {
        register: resolve(__dirname, 'register.html'),
        security: resolve(__dirname, 'security.html'),
      },
    },
  },
  optimizeDeps: {
    include: ['adena-module', 'adena-torus-signin', '@adena-wallet/sdk'],
  },
});
