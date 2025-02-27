const path = require('path');
const packageInfo = require('./package.json');

const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebPackPlugin = require('copy-webpack-plugin');
const CleanWebPackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const { ProvidePlugin } = require('webpack');

const config = {
  devtool: 'cheap-module-source-map',
  entry: {
    web: path.join(__dirname, './src/web.tsx'),
    popup: path.join(__dirname, './src/popup.tsx'),
    content: path.join(__dirname, './src/content.ts'),
    background: path.join(__dirname, './src/background.ts'),
    inject: path.join(__dirname, './src/inject.ts'),
  },
  output: {
    publicPath: '',
    path: path.join(__dirname, '/dist'),
    filename: '[name].js',
  },
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
        test: /\.(png|jpe?g|svg|gif)$/,
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
      '@types': path.resolve(__dirname, 'src/types'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@router': path.resolve(__dirname, 'src/router'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@states': path.resolve(__dirname, 'src/states'),
      '@common': path.resolve(__dirname, 'src/common'),
      '@inject': path.resolve(__dirname, 'src/inject'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@repositories': path.resolve(__dirname, 'src/repositories'),
      '@resources': path.resolve(__dirname, 'src/resources'),
      '@migrates': path.resolve(__dirname, 'src/migrates'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@public': path.resolve(__dirname, 'public/'),
      'lottie-web': path.resolve('libs/lottie_light.min.js'),
    },
  },
  plugins: [
    new CleanWebPackPlugin(),
    new CopyWebPackPlugin({
      patterns: [
        {
          from: './public/manifest/v2.json',
          to: './manifest.json',
          transform: (content, path) =>
            Buffer.from(
              JSON.stringify({
                icons: {
                  16: 'icons/icon16.png',
                  32: 'icons/icon32.png',
                  48: 'icons/icon48.png',
                  128: 'icons/icon128.png',
                },
                ...JSON.parse(content.toString()),
              }),
            ),
        },
        {
          from: './public/icon/*',
          to: './icons/[name][ext]',
        },
        {
          from: './src/resources',
          to: './resources',
        },
      ],
    }),
    new HtmlWebPackPlugin({
      template: './public/web.html',
      chunks: ['web'],
      filename: 'register.html',
    }),
    new HtmlWebPackPlugin({
      template: './public/web.html',
      chunks: ['web'],
      filename: 'security.html',
    }),
    new HtmlWebPackPlugin({
      template: './public/popup.html',
      chunks: ['popup'],
      filename: 'popup.html',
    }),
    new NodePolyfillPlugin(),
    new ProvidePlugin({
      process: 'process/browser.js',
    }),
  ],
};

module.exports = config;
