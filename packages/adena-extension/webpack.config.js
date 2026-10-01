const fs = require('fs');
const path = require('path');
const packageInfo = require('./package.json');

const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebPackPlugin = require('copy-webpack-plugin');
const CleanWebPackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const { DefinePlugin, ProvidePlugin } = require('webpack');

// The social-login key sets in src/common/constants/web3auth.constant.ts read
// their values from process.env, which webpack does not substitute on its own.
// Without these definitions every lookup is undefined at runtime and only the
// hardcoded legacy fallbacks survive.
const WEB3AUTH_ENV_KEYS = [
  // Google keeps two verifiers: accounts created before the production one can
  // only be reached through the legacy one.
  'WEB3_AUTH_LEGACY_CLIENT_ID',
  'GOOGLE_LEGACY_VERIFIER',
  'GOOGLE_LEGACY_CLIENT_ID',
  'WEB3_AUTH_PRODUCTION_CLIENT_ID',
  'GOOGLE_PRODUCTION_VERIFIER',
  'GOOGLE_PRODUCTION_CLIENT_ID',
  'WEB3_AUTH_EMAIL_CLIENT_ID',
  'EMAIL_VERIFIER_NAME',
  'EMAIL_CLIENT_ID',
  'EMAIL_AUTH0_DOMAIN',
  // X is reached through an Auth0 JWT verifier, hence the extra domain.
  'WEB3_AUTH_X_CLIENT_ID',
  'X_VERIFIER_NAME',
  'X_CLIENT_ID',
  'X_AUTH0_DOMAIN',
];

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const matched = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!matched) {
        return values;
      }
      const [, key, rawValue] = matched;
      values[key] = rawValue.trim().replace(/^["']|["']$/g, '');
      return values;
    }, {});
};

const envFile = parseEnvFile(path.join(__dirname, '.env'));

// Real environment variables (CI secrets) take precedence over the local
// .env file.
const web3authEnvDefinitions = WEB3AUTH_ENV_KEYS.reduce((definitions, key) => {
  const value = process.env[key] || envFile[key] || '';
  definitions[`process.env.${key}`] = JSON.stringify(value);
  return definitions;
}, {});

const config = {
  devtool: 'cheap-module-source-map',
  entry: {
    web: path.join(__dirname, './src/web.tsx'),
    popup: path.join(__dirname, './src/popup.tsx'),
    content: path.join(__dirname, './src/content.ts'),
    background: path.join(__dirname, './src/background.ts'),
    inject: path.join(__dirname, './src/inject.ts'),
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
          from: './public/manifest.json',
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
    new DefinePlugin(web3authEnvDefinitions),
    new NodePolyfillPlugin(),
    new ProvidePlugin({
      process: 'process/browser.js',
    }),
  ],
};

module.exports = config;
