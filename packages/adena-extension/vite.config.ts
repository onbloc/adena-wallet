import {
  crx,
} from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import {
  resolve,
} from 'path';
import {
  defineConfig,
} from 'vite';
import {
  nodePolyfills,
} from 'vite-plugin-node-polyfills';

import manifest from './public/manifest.json';

// Resolve polyfill shim paths so workspace packages (adena-module, etc.) can
// import them even under pnpm strict mode.
const shimsDir = resolve(
  __dirname,
  'node_modules/vite-plugin-node-polyfills/shims',
);

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest,
    }),
    nodePolyfills({
      globals: {
        process: true,
        Buffer: true,
      },
    }),
  ],
  resolve: {
    alias: {
      'vite-plugin-node-polyfills/shims/buffer': resolve(shimsDir, 'buffer/dist/index.js'),
      'vite-plugin-node-polyfills/shims/process': resolve(shimsDir, 'process/dist/index.js'),
      'vite-plugin-node-polyfills/shims/global': resolve(shimsDir, 'global/dist/index.js'),
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
    commonjsOptions: {
      // Pre-transform CJS deps so polyfill shims resolve from the extension context
      include: [/node_modules/, /adena-module/, /adena-torus-signin/],
    },
    rollupOptions: {
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
