const path = require('path');
const packageInfo = require('./package.json');

const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebPackPlugin = require('copy-webpack-plugin');
const CleanWebPackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const config = {
  devtool: 'cheap-module-source-map',
  entry: {
    popup: path.join(__dirname, './src/popup.tsx'),
    content: path.join(__dirname, './src/content.ts'),
    background: path.join(__dirname, './src/background.ts'),
    inject: path.join(__dirname, './src/inject.ts'),
    install: path.join(__dirname, './src/install/install.js'),
  },
  output: { path: path.join(__dirname, '/dist'), filename: '[name].js' },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(ts|tsx)?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: true,
            },
          },
        ],
        include: /\.module\.css$/,
      },
      {
        test: /install.html$/,
        loader: 'html-loader',
        options: {
          sources: false,
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|svg)$/,
        loader: 'file-loader',
        options: {
          name: 'assets/[name].[ext]',
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.tsx', '.ts'],
    alias: {
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@router': path.resolve(__dirname, 'src/router'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@layouts': path.resolve(__dirname, 'src/layouts'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@states': path.resolve(__dirname, 'src/states'),
      '@common': path.resolve(__dirname, 'src/common'),
      '@inject': path.resolve(__dirname, 'src/inject'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@repositories': path.resolve(__dirname, 'src/repositories'),
      '@containers': path.resolve(__dirname, 'src/containers'),
      '@migrates': path.resolve(__dirname, 'src/migrates'),
      '@models': path.resolve(__dirname, 'src/models'),
    },
  },
  plugins: [
    new CleanWebPackPlugin(),
    new CopyWebPackPlugin({
      patterns: [
        {
          from: './public/manifest.json',
          transform: (content, path) =>
            Buffer.from(
              JSON.stringify({
                name: packageInfo.name,
                version: packageInfo.version,
                description: packageInfo.description,
                icons: {
                  16: 'icons/icon16.png',
                  32: 'icons/icon32.png',
                  48: 'icons/icon48.png',
                  128: 'icons/icon128.png',
                },
                background: {
                  service_worker: 'background.js',
                },
                content_scripts: [
                  {
                    matches: ['<all_urls>'],
                    js: ['content.js'],
                  },
                ],
                action: {
                  default_popup: 'popup.html',
                },
                ...JSON.parse(content.toString()),
              }),
            ),
        },
        {
          from: './public/icon/*',
          to: './icons/[name].[ext]',
        },
        {
          from: './src/install/assets/*',
          to: './assets/[name].[ext]',
        },
        {
          from: './src/install/css/*',
          to: './css/[name].[ext]',
        },
      ],
    }),
    new HtmlWebPackPlugin({
      template: './public/popup.html',
      chunks: ['popup'],
      filename: 'popup.html',
    }),
    new HtmlWebPackPlugin({
      template: './src/install/install.html',
      chunks: ['install'],
      filename: 'install.html',
    }),
    new NodePolyfillPlugin(),
  ],
};

module.exports = config;
