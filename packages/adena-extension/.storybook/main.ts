import type { StorybookConfig } from '@storybook/react-webpack5';
import { merge } from 'webpack-merge';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';

const storybookConfig: StorybookConfig = {
  stories: ['templates/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: '@storybook/react-webpack5',
  core: {
    builder: '@storybook/builder-webpack5',
  },
  docs: {
    autodocs: 'tag',
  },
};

module.exports = {
  ...storybookConfig,
  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      loader: require.resolve('babel-loader'),
      options: {},
    });

    return merge(config, {
      resolve: {
        plugins: [new TsconfigPathsPlugin()],
      },
      plugins: [
        ...(config.plugins || []),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      ],
    });
  },
};
