import type { StorybookConfig } from '@storybook/react-vite';

// The builder merges vite.config.ts, which skips crx() and keeps the aliases.
const config: StorybookConfig = {
  stories: ['templates/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
};

export default config;
