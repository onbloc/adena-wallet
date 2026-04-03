// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { StorybookConfig } from '@storybook/react-vite';
import type { InlineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storybookConfig: StorybookConfig = {
  stories: ['templates/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',

  async viteFinal(config: InlineConfig) {
    const { resolve } = await import('path');
    const { nodePolyfills } = await import('vite-plugin-node-polyfills');
    const shimsDir = resolve(__dirname, '../node_modules/vite-plugin-node-polyfills/shims');

    config.plugins?.push(nodePolyfills({ globals: { process: true, Buffer: true } }));
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // polyfill shim aliases for pnpm strict mode
      'vite-plugin-node-polyfills/shims/buffer': resolve(shimsDir, 'buffer/dist/index.js'),
      'vite-plugin-node-polyfills/shims/process': resolve(shimsDir, 'process/dist/index.js'),
      'vite-plugin-node-polyfills/shims/global': resolve(shimsDir, 'global/dist/index.js'),
      // path aliases (match vite.config.ts)
      '@types': resolve(__dirname, '../src/types'),
      '@hooks': resolve(__dirname, '../src/hooks'),
      '@ui': resolve(__dirname, '../src/ui'),
      '@pages': resolve(__dirname, '../src/pages'),
      '@router': resolve(__dirname, '../src/router'),
      '@services': resolve(__dirname, '../src/services'),
      '@styles': resolve(__dirname, '../src/styles'),
      '@components': resolve(__dirname, '../src/components'),
      '@states': resolve(__dirname, '../src/states'),
      '@common': resolve(__dirname, '../src/common'),
      '@inject': resolve(__dirname, '../src/inject'),
      '@assets': resolve(__dirname, '../src/assets'),
      '@repositories': resolve(__dirname, '../src/repositories'),
      '@resources': resolve(__dirname, '../src/resources'),
      '@migrates': resolve(__dirname, '../src/migrates'),
      '@models': resolve(__dirname, '../src/models'),
      '@public': resolve(__dirname, '../public'),
      'lottie-web': 'lottie-web/build/player/lottie_light.js',
    };
    return config;
  }
};

export default storybookConfig;
